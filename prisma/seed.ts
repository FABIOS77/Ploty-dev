import * as dotenv from 'dotenv';
dotenv.config();

import {
  ActivityPriority,
  ActivityStatus,
  ActivityType,
  PrismaClient,
  ProjectRole,
  RecurrencePattern,
  RewardType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting idempotent Ploty Demo Seed...');

  // 1. Seed full Gamification Catalog (5 Themes, 4 Medals, 2 Frames, 2 Titles)
  const catalogItems = [
    {
      code: 'THEME_DEFAULT',
      name: 'Ploty Tactile Bento (Nivel 0)',
      description:
        'Tema base oficial Tactile Bento con canvas Sage #C5D4CA, tarjetas blancas y bordes táctiles',
      type: RewardType.THEME,
      unlockLevel: 1,
      costCoins: 0,
      metadata: {
        primaryColor: '#7477FF',
        backgroundColor: '#C5D4CA',
        accentColor: '#F66554',
        glowEffect: false,
      },
    },
    {
      code: 'THEME_DEFAULT_PLOTY',
      name: 'Ploty Indigo Core',
      description:
        'Tema oscuro Obsidian Deep con acentos Indigo y azul eléctrico de alto contraste',
      type: RewardType.THEME,
      unlockLevel: 1,
      costCoins: 0,
      metadata: {
        primaryColor: '#6366F1',
        backgroundColor: '#0F172A',
        accentColor: '#818CF8',
        glowEffect: false,
      },
    },
    {
      code: 'THEME_CYBERPUNK_NEON',
      name: 'Cyberpunk Neon Overdrive',
      description:
        'High-contrast neon cyan and magenta palette with radioactive glow',
      type: RewardType.THEME,
      unlockLevel: 2,
      costCoins: 100,
      metadata: {
        primaryColor: '#00F0FF',
        backgroundColor: '#090A10',
        accentColor: '#FF007F',
        glowEffect: true,
      },
    },
    {
      code: 'THEME_SOLAR_GOLD',
      name: 'Solar Flare Executive',
      description:
        'Opulent gold and warm amber gradients over deep obsidian',
      type: RewardType.THEME,
      unlockLevel: 3,
      costCoins: 250,
      metadata: {
        primaryColor: '#F59E0B',
        backgroundColor: '#181512',
        accentColor: '#EF4444',
        glowEffect: true,
      },
    },
    {
      code: 'THEME_EMERALD_MATRIX',
      name: 'Emerald Matrix Hacker',
      description:
        'Terminal green digital rain style with phosphorescent styling',
      type: RewardType.THEME,
      unlockLevel: 4,
      costCoins: 400,
      metadata: {
        primaryColor: '#10B981',
        backgroundColor: '#06140E',
        accentColor: '#34D399',
        glowEffect: true,
      },
    },
    // Medals
    {
      code: 'MEDAL_FIRST_BLOOD',
      name: 'Primer Paso',
      description: 'Completar tu primera actividad en Ploty',
      type: RewardType.MEDAL,
      unlockLevel: 1,
      costCoins: 0,
      metadata: { icon: 'sparkles', tier: 'BRONZE', color: '#CD7F32' },
    },
    {
      code: 'MEDAL_STREAK_3',
      name: 'Llama Constante',
      description: 'Alcanzar una racha activa de 3 días consecutivos',
      type: RewardType.MEDAL,
      unlockLevel: 1,
      costCoins: 50,
      metadata: { icon: 'flame', tier: 'SILVER', color: '#C0C0C0' },
    },
    {
      code: 'MEDAL_STREAK_7',
      name: 'Maestro del Hábito',
      description: 'Mantener una racha legendaria de 7 días consecutivos',
      type: RewardType.MEDAL,
      unlockLevel: 2,
      costCoins: 150,
      metadata: { icon: 'trophy', tier: 'GOLD', color: '#FFD700' },
    },
    {
      code: 'MEDAL_CENTURION',
      name: 'Centurión Productivo',
      description: 'Alcanzar nivel 3 o completar 10 actividades en total',
      type: RewardType.MEDAL,
      unlockLevel: 3,
      costCoins: 200,
      metadata: { icon: 'shield', tier: 'PLATINUM', color: '#E5E4E2' },
    },
    // Frames
    {
      code: 'FRAME_PLASMA_RING',
      name: 'Anillo de Plasma',
      description: 'Marco holográfico pulsante para el avatar del jugador',
      type: RewardType.AVATAR_FRAME,
      unlockLevel: 2,
      costCoins: 120,
      metadata: { borderColor: '#A855F7', animation: 'pulse' },
    },
    {
      code: 'FRAME_SOLAR_CROWN',
      name: 'Halo Dorado Bento',
      description: 'Borde áureo táctil reservado para líderes de constancia',
      type: RewardType.AVATAR_FRAME,
      unlockLevel: 3,
      costCoins: 180,
      metadata: { borderColor: '#F59E0B', animation: 'glow' },
    },
    // Titles
    {
      code: 'TITLE_ARCHITECT',
      name: 'Arquitecto del Tiempo',
      description: 'Título honorable otorgado a estrategas de proyectos',
      type: RewardType.TITLE,
      unlockLevel: 3,
      costCoins: 180,
      metadata: { badgeText: 'Arquitecto', fontStyle: 'uppercase' },
    },
    {
      code: 'TITLE_FP_MASTER',
      name: 'Maestro Funcional',
      description: 'Insignia titular para puristas de la programación funcional',
      type: RewardType.TITLE,
      unlockLevel: 2,
      costCoins: 90,
      metadata: { badgeText: 'Maestro FP', fontStyle: 'uppercase' },
    },
  ];

  const itemsByCode: Record<string, { id: string; code: string }> = {};
  for (const item of catalogItems) {
    const upserted = await prisma.gamificationItem.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        description: item.description,
        type: item.type,
        unlockLevel: item.unlockLevel,
        costCoins: item.costCoins,
        metadata: item.metadata,
      },
      create: item,
    });
    itemsByCode[upserted.code] = upserted;
  }

  console.log(`✅ Catalog seeded (${catalogItems.length} items)`);

  // 2. Seed 3 Demo Users
  const passwordHash = await bcrypt.hash('Demo1234!', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@ploty.app' },
    update: {
      username: 'fabio_demo',
      passwordHash,
      xp: 650, // Level 3 (1 + floor(sqrt(6.5)) = 3)
      level: 3,
      coins: 480,
      currentStreak: 5,
      longestStreak: 9,
      equippedThemeId: itemsByCode['THEME_DEFAULT'].id,
      equippedMedalId: itemsByCode['MEDAL_STREAK_3'].id,
      equippedFrameId: itemsByCode['FRAME_PLASMA_RING'].id,
      equippedTitleId: itemsByCode['TITLE_FP_MASTER'].id,
    },
    create: {
      email: 'demo@ploty.app',
      username: 'fabio_demo',
      passwordHash,
      xp: 650,
      level: 3,
      coins: 480,
      currentStreak: 5,
      longestStreak: 9,
      equippedThemeId: itemsByCode['THEME_DEFAULT'].id,
      equippedMedalId: itemsByCode['MEDAL_STREAK_3'].id,
      equippedFrameId: itemsByCode['FRAME_PLASMA_RING'].id,
      equippedTitleId: itemsByCode['TITLE_FP_MASTER'].id,
    },
  });

  const anaUser = await prisma.user.upsert({
    where: { email: 'ana@ploty.app' },
    update: {
      username: 'ana_dev',
      passwordHash,
      xp: 340,
      level: 2,
      coins: 190,
      currentStreak: 4,
      longestStreak: 6,
      equippedThemeId: itemsByCode['THEME_DEFAULT_PLOTY'].id,
      equippedMedalId: itemsByCode['MEDAL_FIRST_BLOOD'].id,
    },
    create: {
      email: 'ana@ploty.app',
      username: 'ana_dev',
      passwordHash,
      xp: 340,
      level: 2,
      coins: 190,
      currentStreak: 4,
      longestStreak: 6,
      equippedThemeId: itemsByCode['THEME_DEFAULT_PLOTY'].id,
      equippedMedalId: itemsByCode['MEDAL_FIRST_BLOOD'].id,
    },
  });

  const carlosUser = await prisma.user.upsert({
    where: { email: 'carlos@ploty.app' },
    update: {
      username: 'carlos_ux',
      passwordHash,
      xp: 220,
      level: 2,
      coins: 140,
      currentStreak: 3,
      longestStreak: 4,
      equippedThemeId: itemsByCode['THEME_DEFAULT'].id,
      equippedMedalId: itemsByCode['MEDAL_FIRST_BLOOD'].id,
    },
    create: {
      email: 'carlos@ploty.app',
      username: 'carlos_ux',
      passwordHash,
      xp: 220,
      level: 2,
      coins: 140,
      currentStreak: 3,
      longestStreak: 4,
      equippedThemeId: itemsByCode['THEME_DEFAULT'].id,
      equippedMedalId: itemsByCode['MEDAL_FIRST_BLOOD'].id,
    },
  });

  // Unlock base + starter items for demo users
  const demoUnlocks = [
    'THEME_DEFAULT',
    'THEME_DEFAULT_PLOTY',
    'MEDAL_FIRST_BLOOD',
    'MEDAL_STREAK_3',
    'FRAME_PLASMA_RING',
    'TITLE_FP_MASTER',
  ];
  for (const code of demoUnlocks) {
    await prisma.userUnlock.upsert({
      where: {
        userId_itemId: { userId: demoUser.id, itemId: itemsByCode[code].id },
      },
      update: {},
      create: { userId: demoUser.id, itemId: itemsByCode[code].id },
    });
  }

  for (const u of [anaUser, carlosUser]) {
    for (const code of ['THEME_DEFAULT', 'THEME_DEFAULT_PLOTY', 'MEDAL_FIRST_BLOOD']) {
      await prisma.userUnlock.upsert({
        where: {
          userId_itemId: { userId: u.id, itemId: itemsByCode[code].id },
        },
        update: {},
        create: { userId: u.id, itemId: itemsByCode[code].id },
      });
    }
  }

  console.log('✅ 3 Demo users & starter unlocks seeded');

  // 3. Seed 2 Projects (1 individual, 1 collaborative)
  let personalProject = await prisma.project.findFirst({
    where: { name: 'Meta Personal FP', ownerId: demoUser.id },
  });
  if (!personalProject) {
    personalProject = await prisma.project.create({
      data: {
        name: 'Meta Personal FP',
        description:
          'Dominio diario de programación funcional pura, hábitos de enfoque y arquitectura limpia.',
        colorHex: '#7477FF',
        icon: '🎯',
        isTeamProject: false,
        ownerId: demoUser.id,
        members: {
          create: [{ userId: demoUser.id, role: ProjectRole.OWNER }],
        },
      },
    });
  }

  let teamProject = await prisma.project.findFirst({
    where: { name: 'Plataforma Ploty — Equipo', ownerId: demoUser.id },
  });
  if (!teamProject) {
    teamProject = await prisma.project.create({
      data: {
        name: 'Plataforma Ploty — Equipo',
        description:
          'Entrega colaborativa de sprint con analítica visual, tienda gamificada y seguridad hardening.',
        colorHex: '#F66554',
        icon: '🚀',
        isTeamProject: true,
        ownerId: demoUser.id,
        members: {
          create: [
            { userId: demoUser.id, role: ProjectRole.OWNER },
            { userId: anaUser.id, role: ProjectRole.ADMIN },
            { userId: carlosUser.id, role: ProjectRole.MEMBER },
          ],
        },
      },
    });
  } else {
    // Ensure all 3 members are linked idempotently
    for (const m of [
      { userId: demoUser.id, role: ProjectRole.OWNER },
      { userId: anaUser.id, role: ProjectRole.ADMIN },
      { userId: carlosUser.id, role: ProjectRole.MEMBER },
    ]) {
      await prisma.projectMember.upsert({
        where: {
          projectId_userId: { projectId: teamProject.id, userId: m.userId },
        },
        update: { role: m.role },
        create: { projectId: teamProject.id, userId: m.userId, role: m.role },
      });
    }
  }

  console.log('✅ 2 Projects seeded (Meta Personal FP + Plataforma Ploty — Equipo)');

  // 4. Seed Activities (idempotently checked by title + creatorId)
  const now = new Date();
  const daysFromNow = (offsetDays: number) => {
    const d = new Date(now.getTime());
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d;
  };

  const activitySpecs = [
    // Personal project activities
    {
      title: 'Katas diarias de Programación Funcional',
      description: 'Resolver 2 ejercicios usando pipe, map, filter y Result sin mutaciones.',
      type: ActivityType.RECURRING,
      recurrence: RecurrencePattern.DAILY,
      recurrenceInterval: 1,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.HIGH,
      xpReward: 75,
      coinReward: 25,
      dueDate: daysFromNow(0),
      projectId: personalProject.id,
      creatorId: demoUser.id,
      assigneeId: demoUser.id,
    },
    {
      title: 'Lectura técnica: Sistemas de Tipos Avanzados',
      description: 'Leer 20 páginas de arquitectura funcional y tomar notas.',
      type: ActivityType.RECURRING,
      recurrence: RecurrencePattern.WEEKLY,
      recurrenceInterval: 1,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.MEDIUM,
      xpReward: 50,
      coinReward: 15,
      dueDate: daysFromNow(2),
      projectId: personalProject.id,
      creatorId: demoUser.id,
      assigneeId: demoUser.id,
    },
    {
      title: 'Refactorizar validadores puros en Frontend',
      description: 'Consolidar Result<T, E> en formularios de login, registro y proyectos.',
      type: ActivityType.SINGLE,
      recurrence: RecurrencePattern.NONE,
      recurrenceInterval: 1,
      status: ActivityStatus.IN_PROGRESS,
      priority: ActivityPriority.HIGH,
      xpReward: 90,
      coinReward: 30,
      dueDate: daysFromNow(3),
      projectId: personalProject.id,
      creatorId: demoUser.id,
      assigneeId: demoUser.id,
    },
    {
      title: 'Configurar entorno Docker PostgreSQL local',
      description: 'Levantar contenedor ploty-db con volumen persistente y healthcheck.',
      type: ActivityType.SINGLE,
      recurrence: RecurrencePattern.NONE,
      recurrenceInterval: 1,
      status: ActivityStatus.COMPLETED,
      priority: ActivityPriority.MEDIUM,
      xpReward: 50,
      coinReward: 15,
      dueDate: daysFromNow(-10),
      projectId: personalProject.id,
      creatorId: demoUser.id,
      assigneeId: demoUser.id,
    },
    // Team project activities
    {
      title: 'Auditoría de seguridad Helmet, CORS y Throttler',
      description: 'Blindar endpoints críticos contra fuerza bruta, IDOR y race conditions.',
      type: ActivityType.SINGLE,
      recurrence: RecurrencePattern.NONE,
      recurrenceInterval: 1,
      status: ActivityStatus.COMPLETED,
      priority: ActivityPriority.CRITICAL,
      xpReward: 150,
      coinReward: 50,
      dueDate: daysFromNow(-4),
      projectId: teamProject.id,
      creatorId: demoUser.id,
      assigneeId: demoUser.id,
    },
    {
      title: 'Daily Standup y Revisión de PRs del Equipo',
      description: 'Sincronización diaria de bloqueos y revisión de pruebas unitarias.',
      type: ActivityType.RECURRING,
      recurrence: RecurrencePattern.DAILY,
      recurrenceInterval: 1,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.MEDIUM,
      xpReward: 60,
      coinReward: 20,
      dueDate: daysFromNow(0),
      projectId: teamProject.id,
      creatorId: demoUser.id,
      assigneeId: anaUser.id,
    },
    {
      title: 'Diseñar Heatmap de Constancia y Radar del Jugador',
      description: 'Integrar gráficas Recharts con tokens dinámicos de los 5 temas.',
      type: ActivityType.SINGLE,
      recurrence: RecurrencePattern.NONE,
      recurrenceInterval: 1,
      status: ActivityStatus.IN_PROGRESS,
      priority: ActivityPriority.CRITICAL,
      xpReward: 140,
      coinReward: 45,
      dueDate: daysFromNow(4),
      projectId: teamProject.id,
      creatorId: demoUser.id,
      assigneeId: carlosUser.id,
    },
    {
      title: 'Optimizar contratos API de reportes y progreso',
      description: 'Alinear progressSummary y contributionPercentage entre back y front.',
      type: ActivityType.SINGLE,
      recurrence: RecurrencePattern.NONE,
      recurrenceInterval: 1,
      status: ActivityStatus.COMPLETED,
      priority: ActivityPriority.HIGH,
      xpReward: 100,
      coinReward: 35,
      dueDate: daysFromNow(-2),
      projectId: teamProject.id,
      creatorId: anaUser.id,
      assigneeId: anaUser.id,
    },
    {
      title: 'Preparar presentación y exportación CSV/PDF',
      description: 'Verificar estilos de impresión @media print y descarga CSV.',
      type: ActivityType.SINGLE,
      recurrence: RecurrencePattern.NONE,
      recurrenceInterval: 1,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.LOW,
      xpReward: 40,
      coinReward: 15,
      dueDate: daysFromNow(5),
      projectId: teamProject.id,
      creatorId: carlosUser.id,
      assigneeId: demoUser.id,
    },
  ];

  const activitiesByTitle: Record<string, { id: string; title: string }> = {};
  for (const spec of activitySpecs) {
    let act = await prisma.activity.findFirst({
      where: { title: spec.title, projectId: spec.projectId },
    });
    if (!act) {
      act = await prisma.activity.create({ data: spec });
    }
    activitiesByTitle[act.title] = act;
  }

  console.log(`✅ Activities seeded (${activitySpecs.length} activities)`);

  // 5. Seed Historical ActivityLogs across the last 21 days (idempotent: only if demoUser has < 10 logs)
  const existingLogsCount = await prisma.activityLog.count({
    where: { userId: demoUser.id },
  });

  if (existingLogsCount < 10) {
    const katasId = activitiesByTitle['Katas diarias de Programación Funcional'].id;
    const lecturaId = activitiesByTitle['Lectura técnica: Sistemas de Tipos Avanzados'].id;
    const standupId = activitiesByTitle['Daily Standup y Revisión de PRs del Equipo'].id;
    const auditId = activitiesByTitle['Auditoría de seguridad Helmet, CORS y Throttler'].id;
    const dockerId = activitiesByTitle['Configurar entorno Docker PostgreSQL local'].id;
    const apiOptId = activitiesByTitle['Optimizar contratos API de reportes y progreso'].id;

    // Distribute logs across the past 21 days (ending at -1 so today's habit is still completable live!)
    const historicalLogs = [
      // Fabio Demo logs (rich 21-day cadence with consecutive last 5 days: -1, -2, -3, -4, -5)
      { activityId: katasId, userId: demoUser.id, daysAgo: 20, xpEarned: 75, coinsEarned: 25, streakBonusApplied: false },
      { activityId: lecturaId, userId: demoUser.id, daysAgo: 19, xpEarned: 53, coinsEarned: 16, streakBonusApplied: false },
      { activityId: katasId, userId: demoUser.id, daysAgo: 17, xpEarned: 75, coinsEarned: 25, streakBonusApplied: false },
      { activityId: standupId, userId: demoUser.id, daysAgo: 15, xpEarned: 60, coinsEarned: 20, streakBonusApplied: false },
      { activityId: katasId, userId: demoUser.id, daysAgo: 14, xpEarned: 79, coinsEarned: 26, streakBonusApplied: false },
      { activityId: lecturaId, userId: demoUser.id, daysAgo: 12, xpEarned: 55, coinsEarned: 17, streakBonusApplied: false },
      { activityId: dockerId, userId: demoUser.id, daysAgo: 10, xpEarned: 55, coinsEarned: 17, streakBonusApplied: false },
      { activityId: katasId, userId: demoUser.id, daysAgo: 9, xpEarned: 83, coinsEarned: 28, streakBonusApplied: true },
      { activityId: standupId, userId: demoUser.id, daysAgo: 8, xpEarned: 69, coinsEarned: 23, streakBonusApplied: true },
      { activityId: katasId, userId: demoUser.id, daysAgo: 5, xpEarned: 79, coinsEarned: 26, streakBonusApplied: false },
      { activityId: auditId, userId: demoUser.id, daysAgo: 4, xpEarned: 165, coinsEarned: 55, streakBonusApplied: true },
      { activityId: katasId, userId: demoUser.id, daysAgo: 3, xpEarned: 86, coinsEarned: 29, streakBonusApplied: true },
      { activityId: lecturaId, userId: demoUser.id, daysAgo: 2, xpEarned: 60, coinsEarned: 18, streakBonusApplied: true },
      { activityId: standupId, userId: demoUser.id, daysAgo: 1, xpEarned: 75, coinsEarned: 25, streakBonusApplied: true },
      { activityId: katasId, userId: demoUser.id, daysAgo: 1, xpEarned: 94, coinsEarned: 31, streakBonusApplied: true },

      // Ana Dev team contributions
      { activityId: standupId, userId: anaUser.id, daysAgo: 11, xpEarned: 60, coinsEarned: 20, streakBonusApplied: false },
      { activityId: standupId, userId: anaUser.id, daysAgo: 6, xpEarned: 63, coinsEarned: 21, streakBonusApplied: false },
      { activityId: apiOptId, userId: anaUser.id, daysAgo: 2, xpEarned: 110, coinsEarned: 38, streakBonusApplied: true },
      { activityId: standupId, userId: anaUser.id, daysAgo: 1, xpEarned: 69, coinsEarned: 23, streakBonusApplied: true },

      // Carlos UX team contributions
      { activityId: standupId, userId: carlosUser.id, daysAgo: 7, xpEarned: 60, coinsEarned: 20, streakBonusApplied: false },
      { activityId: standupId, userId: carlosUser.id, daysAgo: 3, xpEarned: 63, coinsEarned: 21, streakBonusApplied: false },
      { activityId: standupId, userId: carlosUser.id, daysAgo: 1, xpEarned: 66, coinsEarned: 22, streakBonusApplied: false },
    ];

    for (const log of historicalLogs) {
      await prisma.activityLog.create({
        data: {
          activityId: log.activityId,
          userId: log.userId,
          completedAt: daysFromNow(-log.daysAgo),
          xpEarned: log.xpEarned,
          coinsEarned: log.coinsEarned,
          streakBonusApplied: log.streakBonusApplied,
        },
      });
    }

    console.log(`✅ ${historicalLogs.length} historical activity logs seeded across last 21 days`);
  } else {
    console.log('ℹ️ Historical activity logs already present, skipping duplicate log creation');
  }

  console.log('🎉 Ploty Demo Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
