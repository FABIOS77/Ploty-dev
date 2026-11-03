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

  beforeAll(async () => {
    // Ensure DATABASE_URL is set if running in test environment
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
    // Final cleanup
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
        .set('Authorization', `Bearer ${user2Token}`) // User 2 is MEMBER
        .send({
          usernameOrEmail: 'some_third_user',
          role: 'MEMBER',
        })
        .expect(403);
    });
  });
});
