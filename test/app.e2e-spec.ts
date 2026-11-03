import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Ploty Core Integration & Gamification (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser1 = {
    email: 'e2e_user1@ploty.app',
    username: 'e2e_user1_owner',
    password: 'Password123!',
  };

  const testUser2 = {
    email: 'e2e_user2@ploty.app',
    username: 'e2e_user2_member',
    password: 'Password123!',
  };

  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let createdProjectId: string;
  let singleActivityId: string;
  let recurringActivityId: string;
  let defaultThemeId: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL =
        'postgresql://ploty_user:ploty_secret@localhost:5434/ploty_db?schema=public';
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Clean up test data
    await prisma.activityLog.deleteMany({
      where: { user: { email: { in: [testUser1.email, testUser2.email] } } },
    });
    await prisma.activity.deleteMany({
      where: { creator: { email: { in: [testUser1.email, testUser2.email] } } },
    });
    await prisma.projectMember.deleteMany({
      where: { user: { email: { in: [testUser1.email, testUser2.email] } } },
    });
    await prisma.project.deleteMany({
      where: { owner: { email: { in: [testUser1.email, testUser2.email] } } },
    });
    await prisma.userUnlock.deleteMany({
      where: { user: { email: { in: [testUser1.email, testUser2.email] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testUser1.email, testUser2.email] } },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.activityLog.deleteMany({
        where: { user: { email: { in: [testUser1.email, testUser2.email] } } },
      });
      await prisma.activity.deleteMany({
        where: { creator: { email: { in: [testUser1.email, testUser2.email] } } },
      });
      await prisma.projectMember.deleteMany({
        where: { user: { email: { in: [testUser1.email, testUser2.email] } } },
      });
      await prisma.project.deleteMany({
        where: { owner: { email: { in: [testUser1.email, testUser2.email] } } },
      });
      await prisma.userUnlock.deleteMany({
        where: { user: { email: { in: [testUser1.email, testUser2.email] } } },
      });
      await prisma.user.deleteMany({
        where: { email: { in: [testUser1.email, testUser2.email] } },
      });
    }
    await app.close();
  });

  describe('1. Authentication Flow', () => {
    it('POST /auth/register -> should register User 1 with Level 1 and default theme', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser1)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.username).toBe(testUser1.username);
      expect(response.body.user.stats.level).toBe(1);
      expect(response.body.user.stats.xp).toBe(0);
      expect(response.body.user.equippedTheme).toBeDefined();

      user1Token = response.body.access_token;
      user1Id = response.body.user.id;
      defaultThemeId = response.body.user.equippedTheme.id;
    });

    it('POST /auth/register -> should register User 2 (collaborator)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser2)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      user2Token = response.body.access_token;
      user2Id = response.body.user.id;
    });

    it('POST /auth/login -> should authenticate User 1 with credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser1.email,
          password: testUser1.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toBe(testUser1.email);
    });

    it('GET /users/profile -> should return user profile with gamified stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.id).toBe(user1Id);
      expect(response.body.stats.level).toBe(1);
      expect(response.body.stats.progressToNextLevelPercent).toBe(0);
      expect(response.body.equippedTheme).toBeDefined();
    });

    it('GET /users/search?q= -> should find User 2 when searched by User 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/search?q=e2e_user2')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].username).toBe(testUser2.username);
    });
  });

  describe('2. Collaborative Projects Flow', () => {
    it('POST /projects -> should create a new collaborative project', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'E2E Mission Gamified',
          description: 'A project testing full backend architecture',
          colorHex: '#8B5CF6',
          icon: 'target',
          isTeamProject: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('E2E Mission Gamified');
      expect(response.body.ownerId).toBe(user1Id);
      expect(response.body.memberCount).toBe(1);
      expect(response.body.progressSummary.progressPercent).toBe(0);

      createdProjectId = response.body.id;
    });

    it('GET /projects -> should list user projects with functional summaries', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      const found = response.body.find((p: any) => p.id === createdProjectId);
      expect(found).toBeDefined();
      expect(found.memberCount).toBe(1);
      expect(found.progressSummary).toBeDefined();
    });

    it('POST /projects/:id/members -> should allow OWNER to add User 2 as MEMBER', async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userId: user2Id,
          role: 'MEMBER',
        })
        .expect(201);

      expect(response.body.message).toBe('Member successfully added to project');
      expect(response.body.member.userId).toBe(user2Id);
      expect(response.body.member.role).toBe('MEMBER');
    });

    it('GET /projects/:id -> should now show 2 members in the project detail', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.id).toBe(createdProjectId);
      expect(response.body.memberCount).toBe(2);
      expect(response.body.members).toHaveLength(2);

      const memberRoles = response.body.members.map((m: any) => m.role);
      expect(memberRoles).toContain('OWNER');
      expect(memberRoles).toContain('MEMBER');
    });

    it('GET /projects -> User 2 should now see the project in their list', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const found = response.body.find((p: any) => p.id === createdProjectId);
      expect(found).toBeDefined();
    });

    it('POST /projects/:id/members -> should reject adding member if requester is not OWNER/ADMIN', async () => {
      await request(app.getHttpServer())
        .post(`/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          usernameOrEmail: 'some_third_user',
          role: 'MEMBER',
        })
        .expect(403);
    });
  });

  describe('3. Activities & Gamified Completion Flow', () => {
    it('POST /activities -> should create a SINGLE task inside the collaborative project', async () => {
      const response = await request(app.getHttpServer())
        .post('/activities')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Implement Core Security Layer',
          description: 'Harden JWT and role-based policies',
          type: 'SINGLE',
          priority: 'HIGH',
          projectId: createdProjectId,
          assigneeId: user1Id,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('SINGLE');
      expect(response.body.priority).toBe('HIGH');
      expect(response.body.xpReward).toBe(75);
      expect(response.body.coinReward).toBe(25);
      expect(response.body.status).toBe('PENDING');

      singleActivityId = response.body.id;
    });

    it('POST /activities -> should create a RECURRING task inside the collaborative project', async () => {
      const response = await request(app.getHttpServer())
        .post('/activities')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Daily Standup & Code Review',
          description: 'Sync with team every morning',
          type: 'RECURRING',
          recurrence: 'DAILY',
          recurrenceInterval: 1,
          priority: 'MEDIUM',
          projectId: createdProjectId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('RECURRING');
      expect(response.body.recurrence).toBe('DAILY');
      expect(response.body.xpReward).toBe(50);
      expect(response.body.coinReward).toBe(15);

      recurringActivityId = response.body.id;
    });

    it('POST /activities/:id/complete -> should complete SINGLE task, award XP/Coins and auto-unlock MEDAL_FIRST_BLOOD', async () => {
      const response = await request(app.getHttpServer())
        .post(`/activities/${singleActivityId}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.activity.status).toBe('COMPLETED');
      expect(response.body.rewards.xpEarned).toBeGreaterThan(0);
      expect(response.body.rewards.coinsEarned).toBeGreaterThan(0);
      expect(response.body.updatedStats.currentStreak).toBe(1);
      expect(response.body.updatedUser.xp).toBeGreaterThan(0);
      expect(response.body.userStats.progressToNextLevelPercent).toBeDefined();

      // Verify auto-unlock
      const unlockedCodes = response.body.newlyUnlockedItems.map(
        (item: any) => item.code,
      );
      expect(unlockedCodes).toContain('MEDAL_FIRST_BLOOD');
    });

    it('POST /activities/:id/complete -> should reject completing already completed SINGLE activity', async () => {
      await request(app.getHttpServer())
        .post(`/activities/${singleActivityId}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(400);
    });

    it('POST /activities/:id/complete -> should complete RECURRING task, advance dueDate and maintain PENDING', async () => {
      const response = await request(app.getHttpServer())
        .post(`/activities/${recurringActivityId}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.activity.status).toBe('PENDING');
      expect(response.body.activity.dueDate).toBeDefined();
      expect(response.body.rewards.xpEarned).toBeGreaterThan(0);
      expect(response.body.rewards.coinsEarned).toBeGreaterThan(0);
    });
  });

  describe('4. Gamification Shop, Catalog & Equip Flow', () => {
    it('GET /gamification/catalog -> should return all 10+ items with unlocked status and affordability', async () => {
      const response = await request(app.getHttpServer())
        .get('/gamification/catalog')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(10);

      const firstBlood = response.body.find(
        (item: any) => item.code === 'MEDAL_FIRST_BLOOD',
      );
      expect(firstBlood).toBeDefined();
      expect(firstBlood.isUnlocked).toBe(true); // Auto-unlocked in step 3
    });

    it('PATCH /gamification/equip -> should equip unlocked medal and default theme', async () => {
      // Find the first blood medal id
      const catalogRes = await request(app.getHttpServer())
        .get('/gamification/catalog')
        .set('Authorization', `Bearer ${user1Token}`);

      const firstBlood = catalogRes.body.find(
        (item: any) => item.code === 'MEDAL_FIRST_BLOOD',
      );

      const equipRes = await request(app.getHttpServer())
        .patch('/gamification/equip')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          themeId: defaultThemeId,
          medalId: firstBlood.id,
        })
        .expect(200);

      expect(equipRes.body.message).toBe('Equipped items updated successfully');
      expect(equipRes.body.user.equippedTheme.id).toBe(defaultThemeId);
      expect(equipRes.body.user.equippedMedal.id).toBe(firstBlood.id);
    });

    it('GET /gamification/leaderboard -> should return players ranked by XP', async () => {
      const response = await request(app.getHttpServer())
        .get('/gamification/leaderboard')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].rank).toBe(1);
      const usernames = response.body.map((u: any) => u.username);
      expect(usernames).toContain(testUser1.username);
    });
  });

  describe('5. Reports & Analytics Visual Series Flow', () => {
    it('GET /reports/dashboard -> should return consolidated charts data and progress', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/dashboard?days=7')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('overview');
      expect(response.body.overview.totalActivities).toBeGreaterThanOrEqual(2);
      expect(response.body.overview.completedActivities).toBeGreaterThanOrEqual(1);

      expect(response.body).toHaveProperty('statusDistribution');
      expect(response.body.statusDistribution).toHaveLength(4);

      expect(response.body).toHaveProperty('priorityBreakdown');
      expect(response.body.priorityBreakdown).toHaveLength(4);

      expect(response.body).toHaveProperty('dailyTrend');
      expect(response.body.dailyTrend).toHaveLength(7);

      expect(response.body).toHaveProperty('recurrenceVsSingle');
      expect(response.body.recurrenceVsSingle.single.totalExecutions).toBe(1);
      expect(response.body.recurrenceVsSingle.recurring.totalExecutions).toBe(1);

      expect(response.body).toHaveProperty('projectsProgress');
      expect(response.body.projectsProgress.length).toBeGreaterThanOrEqual(1);

      expect(response.body).toHaveProperty('actionProgressList');
      expect(response.body.actionProgressList.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /reports/projects/:projectId -> should return project specific analytics and team member contributions', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reports/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.project.id).toBe(createdProjectId);
      expect(response.body).toHaveProperty('statusDistribution');
      expect(response.body).toHaveProperty('actionProgress');
      expect(response.body).toHaveProperty('teamContributions');

      const user1Contrib = response.body.teamContributions.find(
        (c: any) => c.userId === user1Id,
      );
      expect(user1Contrib).toBeDefined();
      expect(user1Contrib.completedCount).toBeGreaterThanOrEqual(1);
      expect(user1Contrib.xpContributed).toBeGreaterThan(0);
    });
  });
});
