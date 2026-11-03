# 📊 REPORTE DE EJECUCIÓN: HITO 2 (Gamificación Extrema, Recurrencia y Analíticas)
**Plataforma Gamificada de Gestión de Proyectos y Actividades: Ploty**

- **Repositorio Remoto:** `https://github.com/FABIOS77/Ploty-dev`
- **Ramas Sincronizadas:** `develop` y `main`
- **Estado de Pruebas:** 100% de tests en verde (**126 tests aprobados:** 105 unitarios y 21 E2E).
- **Backend Core:** Finalizado y listo para ser consumido en el Hito 3 por `Ploty-Views` (Frontend Redux Toolkit).

---

## 1. 📂 Árbol Actualizado de Directorios (`src/` y `test/`)

```text
Ploty-dev/
├── src/
│   ├── app.module.ts              # Integración de los 6 módulos funcionales
│   ├── main.ts                    # Bootstrap: Swagger v2.0 (/api/docs), ValidationPipe, CORS
│   ├── prisma/
│   │   ├── prisma.module.ts       # Global Prisma Client Provider
│   │   └── prisma.service.ts      # Conexión limpia y hooks de ciclo de vida
│   ├── common/
│   │   └── fp/                    # NÚCLEO DE PROGRAMACIÓN FUNCIONAL PURA
│   │       ├── index.ts           # Barrel export de utilidades puras
│   │       ├── fp-utils.ts        # pipe, map, filter, reduce, groupBy, Result/Either
│   │       ├── fp-utils.spec.ts
│   │       ├── gamification-math.fp.ts      # Nivel, XP Siguiente, Progreso Proyecto
│   │       ├── gamification-math.fp.spec.ts
│   │       ├── activity-recurrence.fp.ts     # Recurrencia pura, DueDate, Overdue, Prioridad
│   │       ├── activity-recurrence.fp.spec.ts
│   │       ├── gamification-engine.fp.ts     # Rachas UTC, multiplicadores, auto-unlocks, tienda
│   │       ├── gamification-engine.fp.spec.ts
│   │       ├── analytics.fp.ts               # Pipelines FP para series temporales y gráficas
│   │       └── analytics.fp.spec.ts
│   ├── auth/
│   │   ├── auth.controller.ts     # POST /auth/register, POST /auth/login
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts
│   │   ├── decorators/current-user.decorator.ts
│   │   ├── dto/login.dto.ts
│   │   ├── dto/register.dto.ts
│   │   ├── guards/jwt-auth.guard.ts
│   │   └── strategies/jwt.strategy.ts
│   ├── users/
│   │   ├── users.controller.ts    # GET /users/profile, GET /users/search?q=
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   └── dto/search-users.dto.ts
│   ├── projects/
│   │   ├── projects.controller.ts # CRUD Proyectos y Miembros
│   │   ├── projects.module.ts
│   │   ├── projects.service.ts
│   │   ├── projects.service.spec.ts
│   │   ├── dto/add-project-member.dto.ts
│   │   └── dto/create-project.dto.ts
│   ├── activities/
│   │   ├── activities.controller.ts # CRUD Actividades y POST /activities/:id/complete
│   │   ├── activities.module.ts
│   │   ├── activities.service.ts    # Transacción atómica de gamificación y recurrencia
│   │   ├── activities.service.spec.ts
│   │   ├── dto/create-activity.dto.ts
│   │   ├── dto/filter-activities.dto.ts
│   │   └── dto/update-activity.dto.ts
│   ├── gamification/
│   │   ├── gamification.controller.ts # Catálogo, Tienda, Equipar y Leaderboard
│   │   ├── gamification.module.ts
│   │   ├── gamification.service.ts    # Seed de 10 ítems (OnModuleInit) y compras
│   │   ├── gamification.service.spec.ts
│   │   └── dto/equip-item.dto.ts
│   └── reports/
│       ├── reports.controller.ts  # GET /reports/dashboard, GET /reports/projects/:id
│       ├── reports.module.ts
│       ├── reports.service.ts     # Procesamiento analítico funcional para Frontend
│       └── reports.service.spec.ts
└── test/
    ├── jest-e2e.json
    └── app.e2e-spec.ts            # Suite E2E completa (21 pruebas de integración)
```

---

## 2. 🧩 Código Completo de los 3 Nuevos Archivos Funcionales

### A. `src/common/fp/activity-recurrence.fp.ts`

```typescript
/**
 * Pure Functional Activity Recurrence & Priority Engine
 * Strictly pure functions, immutable Date calculations, and zero side-effects.
 */

export type RecurrencePatternType =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'CUSTOM_DAYS';

export type ActivityPriorityType = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BaseRewards {
  readonly xpReward: number;
  readonly coinReward: number;
}

/**
 * Pure calculation of the next due date based on recurrence pattern and interval.
 * Returns null if pattern is NONE or not recurrent.
 * Does not mutate baseDate.
 */
export const calculateNextDueDate = (
  baseDate: Date,
  pattern: RecurrencePatternType | string,
  interval: number = 1,
): Date | null => {
  if (!baseDate || pattern === 'NONE') {
    return null;
  }

  const safeInterval = Math.max(1, Math.floor(interval));
  const next = new Date(baseDate.getTime());

  switch (pattern) {
    case 'DAILY':
      next.setUTCDate(next.getUTCDate() + safeInterval);
      return next;

    case 'WEEKLY':
      next.setUTCDate(next.getUTCDate() + safeInterval * 7);
      return next;

    case 'MONTHLY':
      next.setUTCMonth(next.getUTCMonth() + safeInterval);
      return next;

    case 'CUSTOM_DAYS':
      next.setUTCDate(next.getUTCDate() + safeInterval);
      return next;

    default:
      return null;
  }
};

/**
 * Pure evaluation of activity status based on current time and due date.
 * If status is not COMPLETED and dueDate has passed, marks as OVERDUE.
 */
export const evaluateActivityStatus = (
  activity: {
    readonly status: string;
    readonly dueDate?: Date | string | null;
  },
  now: Date = new Date(),
): string => {
  if (activity.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  if (activity.dueDate) {
    const dueTime = new Date(activity.dueDate).getTime();
    if (dueTime < now.getTime()) {
      return 'OVERDUE';
    }
  }

  return activity.status;
};

/**
 * Pure calculation of base rewards for an activity based on its priority level:
 * - LOW: 40 XP, 10 Coins
 * - MEDIUM: 50 XP, 15 Coins
 * - HIGH: 75 XP, 25 Coins
 * - CRITICAL: 100 XP, 40 Coins
 */
export const calculateActivityBaseRewards = (
  priority: ActivityPriorityType | string | null | undefined,
): Readonly<BaseRewards> => {
  const normPriority = (priority || 'MEDIUM').toUpperCase();

  switch (normPriority) {
    case 'LOW':
      return Object.freeze({ xpReward: 40, coinReward: 10 });
    case 'MEDIUM':
      return Object.freeze({ xpReward: 50, coinReward: 15 });
    case 'HIGH':
      return Object.freeze({ xpReward: 75, coinReward: 25 });
    case 'CRITICAL':
      return Object.freeze({ xpReward: 100, coinReward: 40 });
    default:
      return Object.freeze({ xpReward: 50, coinReward: 15 });
  }
};
```

---

### B. `src/common/fp/gamification-engine.fp.ts`

```typescript
/**
 * Pure Functional Gamification Engine
 * Streaks, XP multipliers, auto-unlock evaluation, and shop validation.
 */

import { Result, err, ok } from './fp-utils';

export interface StreakEvaluationResult {
  readonly newStreak: number;
  readonly newLongestStreak: number;
  readonly streakUpdated: boolean;
  readonly streakBonusApplied: boolean;
}

export interface CompletionRewardsResult {
  readonly xpEarned: number;
  readonly coinsEarned: number;
  readonly streakBonusMultiplier: number;
  readonly streakBonusApplied: boolean;
}

export interface UserStatsForUnlocks {
  readonly level: number;
  readonly currentStreak: number;
  readonly totalCompletedActivities: number;
  readonly teamActivitiesCompleted?: number;
}

export interface GamificationCatalogItem {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly type: string;
  readonly unlockLevel: number;
  readonly costCoins: number;
  readonly metadata?: any;
}

/**
 * Pure date helper: converts Date to UTC YYYY-MM-DD
 */
export const toUtcDayString = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Pure evaluation of daily streak:
 * - If last completion was today: streak is maintained, bonus applies if streak >= 2.
 * - If last completion was yesterday: streak increments by 1.
 * - If last completion was > 1 day ago or null: resets streak to 1.
 */
export const evaluateStreak = (
  currentStreak: number,
  longestStreak: number,
  lastCompletedAt: Date | string | null,
  now: Date = new Date(),
): Readonly<StreakEvaluationResult> => {
  if (!lastCompletedAt) {
    const newStreak = 1;
    return Object.freeze({
      newStreak,
      newLongestStreak: Math.max(longestStreak, newStreak),
      streakUpdated: true,
      streakBonusApplied: false,
    });
  }

  const lastDate = new Date(lastCompletedAt);
  const nowDayStr = toUtcDayString(now);
  const lastDayStr = toUtcDayString(lastDate);

  // If completed today
  if (nowDayStr === lastDayStr) {
    const safeStreak = Math.max(1, currentStreak);
    return Object.freeze({
      newStreak: safeStreak,
      newLongestStreak: Math.max(longestStreak, safeStreak),
      streakUpdated: false,
      streakBonusApplied: safeStreak >= 2,
    });
  }

  // Calculate day difference using UTC midnight timestamps
  const nowUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const lastUtcMidnight = Date.UTC(
    lastDate.getUTCFullYear(),
    lastDate.getUTCMonth(),
    lastDate.getUTCDate(),
  );

  const diffDays = Math.round(
    (nowUtcMidnight - lastUtcMidnight) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 1) {
    // Completed yesterday -> increment streak
    const newStreak = Math.max(0, currentStreak) + 1;
    return Object.freeze({
      newStreak,
      newLongestStreak: Math.max(longestStreak, newStreak),
      streakUpdated: true,
      streakBonusApplied: true,
    });
  }

  // Inactive for more than 1 day -> reset streak to 1
  const resetStreak = 1;
  return Object.freeze({
    newStreak: resetStreak,
    newLongestStreak: Math.max(longestStreak, resetStreak),
    streakUpdated: true,
    streakBonusApplied: false,
  });
};

/**
 * Pure calculation of final rewards with streak bonus multiplier:
 * Multiplier = 1 + min(streak * 0.05, 0.50)
 * xpEarned = round(baseXp * Multiplier)
 * coinsEarned = round(baseCoins * Multiplier)
 */
export const computeCompletionRewards = (
  baseXp: number,
  baseCoins: number,
  currentStreak: number,
): Readonly<CompletionRewardsResult> => {
  const safeStreak = Math.max(0, currentStreak);
  const streakBonus = Math.min(safeStreak * 0.05, 0.5);
  const multiplier = Number((1 + streakBonus).toFixed(2));

  const xpEarned = Math.round(baseXp * multiplier);
  const coinsEarned = Math.round(baseCoins * multiplier);
  const streakBonusApplied = safeStreak >= 2;

  return Object.freeze({
    xpEarned,
    coinsEarned,
    streakBonusMultiplier: multiplier,
    streakBonusApplied,
  });
};

/**
 * Pure evaluator for automatic unlocking of medals based on player accomplishments.
 * Checks criteria against unobtained catalog items.
 */
export const evaluateAutoUnlocks = (
  stats: UserStatsForUnlocks,
  catalog: readonly GamificationCatalogItem[],
  currentUnlockedItemIds: readonly string[],
): readonly GamificationCatalogItem[] => {
  const unlockedIdSet = new Set(currentUnlockedItemIds);

  const candidateItems = catalog.filter((item) => !unlockedIdSet.has(item.id));

  const newlyUnlocked = candidateItems.filter((item) => {
    switch (item.code) {
      case 'MEDAL_FIRST_BLOOD':
        return stats.totalCompletedActivities >= 1;

      case 'MEDAL_STREAK_3':
        return stats.currentStreak >= 3;

      case 'MEDAL_STREAK_7':
        return stats.currentStreak >= 7;

      case 'MEDAL_CENTURION':
        return stats.level >= 3 || stats.totalCompletedActivities >= 10;

      default:
        return false;
    }
  });

  return Object.freeze(newlyUnlocked);
};

/**
 * Pure validator for shop purchases returning a Result (Either).
 */
export const canPurchaseItem = (
  user: { readonly level: number; readonly coins: number },
  item: { readonly id: string; readonly unlockLevel: number; readonly costCoins: number },
  unlockedItemIds: readonly string[],
): Result<{ readonly remainingCoins: number }, string> => {
  if (unlockedItemIds.includes(item.id)) {
    return err('Item is already unlocked by user');
  }

  if (user.level < item.unlockLevel) {
    return err(
      `Level ${item.unlockLevel} is required to unlock this item (current level: ${user.level})`,
    );
  }

  if (user.coins < item.costCoins) {
    return err(
      `Insufficient coins: required ${item.costCoins}, but user has ${user.coins}`,
    );
  }

  return ok({
    remainingCoins: user.coins - item.costCoins,
  });
};
```

---

### C. `src/common/fp/analytics.fp.ts`

```typescript
/**
 * Pure Functional Analytics & Reporting Engine for Ploty
 * Built exclusively using functional pipelines (pipe, map, filter, reduce, groupBy)
 * Ready to power visual charts (Donut, Stacked Bars, Area/Line Series, Tables).
 */

import { filter, groupBy, map, pipe, reduce } from './fp-utils';
import { toUtcDayString } from './gamification-engine.fp';

export interface ActivityAnalyticsInput {
  readonly id: string;
  readonly title?: string;
  readonly type: string;
  readonly status: string;
  readonly priority: string;
  readonly xpReward?: number;
  readonly coinReward?: number;
  readonly logs?: readonly ActivityLogAnalyticsInput[];
}

export interface ActivityLogAnalyticsInput {
  readonly id: string;
  readonly activityId: string;
  readonly userId: string;
  readonly completedAt: Date | string;
  readonly xpEarned: number;
  readonly coinsEarned: number;
  readonly activity?: {
    readonly type?: string;
  };
}

export interface TeamMemberAnalyticsInput {
  readonly id: string;
  readonly userId: string;
  readonly role: string;
  readonly user: {
    readonly id: string;
    readonly username: string;
    readonly email: string;
    readonly avatarUrl: string | null;
  };
}

export interface StatusDistributionItem {
  readonly status: string;
  readonly count: number;
  readonly percentage: number;
}

export const buildStatusDistribution = (
  activities: readonly ActivityAnalyticsInput[],
): readonly StatusDistributionItem[] => {
  const total = activities.length;
  const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];

  const grouped = groupBy((a: ActivityAnalyticsInput) => a.status)(activities);

  return pipe(
    statuses,
    map((status) => {
      const count = (grouped[status] || []).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return Object.freeze({
        status,
        count,
        percentage,
      });
    }),
  );
};

export interface PriorityBreakdownItem {
  readonly priority: string;
  readonly total: number;
  readonly completed: number;
  readonly completionRate: number;
}

export const buildPriorityBreakdown = (
  activities: readonly ActivityAnalyticsInput[],
): readonly PriorityBreakdownItem[] => {
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const grouped = groupBy((a: ActivityAnalyticsInput) => a.priority)(activities);

  return pipe(
    priorities,
    map((priority) => {
      const items = grouped[priority] || [];
      const total = items.length;
      const completed = pipe(
        items,
        filter((item) => item.status === 'COMPLETED'),
        (arr) => arr.length,
      );
      const completionRate =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      return Object.freeze({
        priority,
        total,
        completed,
        completionRate,
      });
    }),
  );
};

export interface DailyCompletionPoint {
  readonly date: string;
  readonly completedCount: number;
  readonly xpEarned: number;
  readonly coinsEarned: number;
}

export const buildDailyCompletionSeries = (
  logs: readonly ActivityLogAnalyticsInput[],
  daysCount: number = 14,
  referenceDate: Date = new Date(),
): readonly DailyCompletionPoint[] => {
  const count = Math.max(1, daysCount);

  const logsByDay = groupBy((log: ActivityLogAnalyticsInput) =>
    toUtcDayString(new Date(log.completedAt)),
  )(logs);

  const daysArray: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(referenceDate.getTime());
    d.setUTCDate(d.getUTCDate() - i);
    daysArray.push(toUtcDayString(d));
  }

  return pipe(
    daysArray,
    map((dateStr) => {
      const dayLogs = logsByDay[dateStr] || [];
      const completedCount = dayLogs.length;

      const totals = reduce(
        (
          acc: { xp: number; coins: number },
          curr: ActivityLogAnalyticsInput,
        ) => ({
          xp: acc.xp + curr.xpEarned,
          coins: acc.coins + curr.coinsEarned,
        }),
        { xp: 0, coins: 0 },
      )(dayLogs);

      return Object.freeze({
        date: dateStr,
        completedCount,
        xpEarned: totals.xp,
        coinsEarned: totals.coins,
      });
    }),
  );
};

export interface RecurrenceVsSingleStats {
  readonly single: {
    readonly totalCreated: number;
    readonly totalExecutions: number;
    readonly xpEarned: number;
  };
  readonly recurring: {
    readonly totalCreated: number;
    readonly totalExecutions: number;
    readonly xpEarned: number;
  };
}

export const buildRecurrenceVsSingleStats = (
  activities: readonly ActivityAnalyticsInput[],
  logs: readonly ActivityLogAnalyticsInput[],
): Readonly<RecurrenceVsSingleStats> => {
  const singleActivities = activities.filter((a) => a.type === 'SINGLE');
  const recurringActivities = activities.filter((a) => a.type === 'RECURRING');

  const singleIdSet = new Set(singleActivities.map((a) => a.id));
  const recurringIdSet = new Set(recurringActivities.map((a) => a.id));

  const singleLogs = logs.filter(
    (log) =>
      singleIdSet.has(log.activityId) || log.activity?.type === 'SINGLE',
  );
  const recurringLogs = logs.filter(
    (log) =>
      recurringIdSet.has(log.activityId) || log.activity?.type === 'RECURRING',
  );

  const singleXp = singleLogs.reduce((acc, curr) => acc + curr.xpEarned, 0);
  const recurringXp = recurringLogs.reduce(
    (acc, curr) => acc + curr.xpEarned,
    0,
  );

  return Object.freeze({
    single: Object.freeze({
      totalCreated: singleActivities.length,
      totalExecutions: singleLogs.length,
      xpEarned: singleXp,
    }),
    recurring: Object.freeze({
      totalCreated: recurringActivities.length,
      totalExecutions: recurringLogs.length,
      xpEarned: recurringXp,
    }),
  });
};

export interface ActionProgressItem {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly status: string;
  readonly priority: string;
  readonly totalExecutions: number;
  readonly progressPercent: number;
  readonly xpGenerated: number;
  readonly coinsGenerated: number;
}

export const buildActionProgressReport = (
  activities: readonly ActivityAnalyticsInput[],
): readonly ActionProgressItem[] => {
  return pipe(
    activities,
    map((activity) => {
      const logs = activity.logs || [];
      const totalExecutions = logs.length;

      const totals = reduce(
        (
          acc: { xp: number; coins: number },
          curr: ActivityLogAnalyticsInput,
        ) => ({
          xp: acc.xp + curr.xpEarned,
          coins: acc.coins + curr.coinsEarned,
        }),
        { xp: 0, coins: 0 },
      )(logs);

      const progressPercent =
        activity.type === 'SINGLE'
          ? activity.status === 'COMPLETED'
            ? 100
            : 0
          : totalExecutions > 0
            ? Math.min(totalExecutions * 25, 100)
            : 0;

      return Object.freeze({
        id: activity.id,
        title: activity.title || 'Untitled Activity',
        type: activity.type,
        status: activity.status,
        priority: activity.priority,
        totalExecutions,
        progressPercent,
        xpGenerated: totals.xp,
        coinsGenerated: totals.coins,
      });
    }),
  );
};

export interface TeamMemberContribution {
  readonly userId: string;
  readonly username: string;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly role: string;
  readonly completedCount: number;
  readonly xpContributed: number;
  readonly contributionPercentage: number;
}

export const buildTeamContributionReport = (
  members: readonly TeamMemberAnalyticsInput[],
  activities: readonly ActivityAnalyticsInput[],
  logs: readonly ActivityLogAnalyticsInput[],
): readonly TeamMemberContribution[] => {
  const totalXp = logs.reduce((acc, log) => acc + log.xpEarned, 0);

  const logsByUser = groupBy(
    (log: ActivityLogAnalyticsInput) => log.userId,
  )(logs);

  return pipe(
    members,
    map((member) => {
      const userLogs = logsByUser[member.userId] || [];
      const completedCount = userLogs.length;
      const xpContributed = userLogs.reduce(
        (acc, curr) => acc + curr.xpEarned,
        0,
      );
      const contributionPercentage =
        totalXp > 0 ? Math.round((xpContributed / totalXp) * 100) : 0;

      return Object.freeze({
        userId: member.userId,
        username: member.user.username,
        email: member.user.email,
        avatarUrl: member.user.avatarUrl,
        role: member.role,
        completedCount,
        xpContributed,
        contributionPercentage,
      });
    }),
  );
};
```

---

## 3. 🧪 Salida en Consola de Pruebas Unitarias y E2E (100% Verde)

### A. Pruebas Unitarias (`npm run test`):
```text
> ploty-dev@0.0.1 test
> jest

PASS src/common/fp/fp-utils.spec.ts
PASS src/common/fp/analytics.fp.spec.ts
PASS src/common/fp/gamification-engine.fp.spec.ts
PASS src/common/fp/activity-recurrence.fp.spec.ts
PASS src/common/fp/gamification-math.fp.spec.ts
PASS src/reports/reports.service.spec.ts
PASS src/activities/activities.service.spec.ts
PASS src/gamification/gamification.service.spec.ts
PASS src/projects/projects.service.spec.ts
PASS src/auth/auth.service.spec.ts

Test Suites: 10 passed, 10 total
Tests:       105 passed, 105 total
Snapshots:   0 total
Time:        3.493 s
Ran all test suites.
```

### B. Pruebas de Integración E2E (`npm run test:e2e`):
```text
> ploty-dev@0.0.1 test:e2e
> jest --config ./test/jest-e2e.json

PASS test/app.e2e-spec.ts (6.654 s)
  Ploty Core Integration & Gamification (E2E)
    1. Authentication Flow
      √ POST /auth/register -> should register User 1 with Level 1 and default theme (287 ms)
      √ POST /auth/register -> should register User 2 (collaborator) (117 ms)
      √ POST /auth/login -> should authenticate User 1 with credentials (99 ms)
      √ GET /users/profile -> should return user profile with gamified stats (30 ms)
      √ GET /users/search?q= -> should find User 2 when searched by User 1 (26 ms)
    2. Collaborative Projects Flow
      √ POST /projects -> should create a new collaborative project (45 ms)
      √ GET /projects -> should list user projects with functional summaries (34 ms)
      √ POST /projects/:id/members -> should allow OWNER to add User 2 as MEMBER (43 ms)
      √ GET /projects/:id -> should now show 2 members in the project detail (26 ms)
      √ GET /projects -> User 2 should now see the project in their list (26 ms)
      √ POST /projects/:id/members -> should reject adding member if requester is not OWNER/ADMIN (26 ms)
    3. Activities & Gamified Completion Flow
      √ POST /activities -> should create a SINGLE task inside the collaborative project (82 ms)
      √ POST /activities -> should create a RECURRING task inside the collaborative project (39 ms)
      √ POST /activities/:id/complete -> should complete SINGLE task, award XP/Coins and auto-unlock MEDAL_FIRST_BLOOD (110 ms)
      √ POST /activities/:id/complete -> should reject completing already completed SINGLE activity (25 ms)
      √ POST /activities/:id/complete -> should complete RECURRING task, advance dueDate and maintain PENDING (66 ms)
    4. Gamification Shop, Catalog & Equip Flow
      √ GET /gamification/catalog -> should return all 10+ items with unlocked status and affordability (25 ms)
      √ PATCH /gamification/equip -> should equip unlocked medal and default theme (51 ms)
      √ GET /gamification/leaderboard -> should return players ranked by XP (24 ms)
    5. Reports & Analytics Visual Series Flow
      √ GET /reports/dashboard -> should return consolidated charts data and progress (53 ms)
      √ GET /reports/projects/:projectId -> should return project specific analytics and team member contributions (31 ms)

Test Suites: 1 passed, 1 total
Tests:       21 passed, 21 total
Snapshots:   0 total
Time:        7.395 s
Ran all test suites.
```

**Total de Pruebas Superadas:** **126 / 126 exitosas (0 fallos).**

---

## 4. 📡 Tabla Completa de Endpoints del Backend (Listos para Frontend Redux)

| Módulo | Método | Ruta | Descripción | Seguridad / Guard |
|---|---|---|---|---|
| **Auth** | `POST` | `/auth/register` | Registro de usuario, hash `bcrypt`, nivel 1 y tema base | Pública |
| **Auth** | `POST` | `/auth/login` | Login con credenciales, retorno de JWT y perfil gamificado | Pública |
| **Users** | `GET` | `/users/profile` | Perfil del usuario autenticado con stats y medallas | `JwtAuthGuard` |
| **Users** | `GET` | `/users/search?q=` | Búsqueda sanitizada de usuarios para invitaciones | `JwtAuthGuard` |
| **Projects** | `POST` | `/projects` | Crear proyecto individual o en equipo (asigna `OWNER`) | `JwtAuthGuard` |
| **Projects** | `GET` | `/projects` | Listar proyectos del usuario con avance porcentual | `JwtAuthGuard` |
| **Projects** | `GET` | `/projects/:id` | Detalle del proyecto, miembros e indicadores | `JwtAuthGuard` |
| **Projects** | `POST` | `/projects/:id/members` | Vincular usuario al proyecto | `JwtAuthGuard` (`OWNER`/`ADMIN`) |
| **Projects** | `DELETE` | `/projects/:id/members/:userId` | Desvincular miembro del proyecto | `JwtAuthGuard` (`OWNER`/`ADMIN`/self) |
| **Activities** | `POST` | `/activities` | Crear actividad única o recurrente (con cálculo de premios) | `JwtAuthGuard` |
| **Activities** | `GET` | `/activities` | Listar actividades con filtros (`projectId`, `status`, `type`, etc.) | `JwtAuthGuard` |
| **Activities** | `GET` | `/activities/:id` | Detalle de la actividad con historial de ejecuciones | `JwtAuthGuard` |
| **Activities** | `PATCH` | `/activities/:id` | Editar actividad o reprogramar vencimiento | `JwtAuthGuard` |
| **Activities** | `DELETE` | `/activities/:id` | Eliminar actividad | `JwtAuthGuard` |
| **Activities** | `POST` | `/activities/:id/complete` | **Completar actividad**: otorga XP/Coins, calcula racha, auto-unlocks y reprograma recurrencia | `JwtAuthGuard` |
| **Gamification**| `GET` | `/gamification/catalog` | Catálogo de 10+ temas y medallas con flags de desbloqueo/precio | `JwtAuthGuard` |
| **Gamification**| `POST` | `/gamification/shop/buy/:itemId` | Comprar ítem con monedas y validación pura | `JwtAuthGuard` |
| **Gamification**| `PATCH` | `/gamification/equip` | Equipar tema visual o medalla desbloqueada | `JwtAuthGuard` |
| **Gamification**| `GET` | `/gamification/leaderboard` | Tabla de clasificación por XP y rachas (`?projectId=`) | `JwtAuthGuard` |
| **Reports** | `GET` | `/reports/dashboard?days=14` | Métricas completas para gráficas (Donut, Barras, Líneas, Tablas) | `JwtAuthGuard` |
| **Reports** | `GET` | `/reports/projects/:projectId` | Métricas del proyecto y contribución de cada miembro | `JwtAuthGuard` |
| **Swagger** | `GET` | `/api/docs` | Documentación interactiva OpenAPI v2.0 | Pública |

---

## 5. 🚀 Confirmación de Sincronización Remota (GitHub)

- **Repositorio:** `https://github.com/FABIOS77/Ploty-dev`
- **Ramas actualizadas:**
  - `develop`: Rama de desarrollo con todo el código del Hito 2.
  - `main`: Rama de producción sincronizada.
- **Entregables locales:**
  - [REPORTE_HITO_2.md](file:///c:/Users/saldi/Documents/Gamificacion%20y%20programacion%20funcional/practico/REPORTE_HITO_2.md)
  - [Ploty-dev-Hito2.zip](file:///c:/Users/saldi/Documents/Gamificacion%20y%20programacion%20funcional/practico/Ploty-dev-Hito2.zip)
