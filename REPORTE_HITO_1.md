# 📊 REPORTE DE EJECUCIÓN: HITO 1 (Backend Core & Infraestructura)
**Plataforma Gamificada de Gestión de Proyectos y Actividades: Ploty**

- **Repositorio Remoto:** `https://github.com/FABIOS77/Ploty-dev`
- **Ramas Configuradas y Sincronizadas:** `main` y `develop`
- **Estado de Pruebas:** 100% de tests unitarios y E2E aprobados (66 tests exitosos).

---

## 1. 📂 Árbol de Directorios Generado

```text
Ploty-dev/
├── .dockerignore
├── .env.example
├── .gitignore
├── .prettierrc
├── Dockerfile                     # Multi-stage Dockerfile (dependencies, dev, build, production)
├── README.md                      # Documentación completa y guía de inicio
├── docker-compose.yml             # Orquestación de ploty-db (PostgreSQL 16) y ploty-api
├── eslint.config.mjs
├── nest-cli.json
├── package.json                   # Scripts y dependencias estrictas
├── tsconfig.json                  # TypeScript modo estricto
├── tsconfig.build.json
├── prisma/
│   ├── schema.prisma              # Esquema de datos con 6 enums y 7 modelos
│   └── migrations/
│       └── 20261103204514_init/
│           └── migration.sql      # Migración inicial aplicada en PostgreSQL
├── src/
│   ├── app.module.ts              # Módulo raíz importando Prisma, Auth, Users y Projects
│   ├── main.ts                    # Bootstrap: Swagger (/api/docs), ValidationPipe, CORS
│   ├── common/
│   │   └── fp/                    # Núcleo de Programación Funcional Pura
│   │       ├── index.ts
│   │       ├── fp-utils.ts        # pipe, map, filter, reduce, groupBy, Result/Either
│   │       ├── fp-utils.spec.ts   # Tests exhaustivos de utilidades funcionales
│   │       ├── gamification-math.fp.ts     # Fórmulas puras de nivel, XP, progreso y roles
│   │       └── gamification-math.fp.spec.ts# Tests de cálculos matemáticos puros
│   ├── prisma/
│   │   ├── prisma.module.ts       # Módulo global para inyección de Prisma
│   │   └── prisma.service.ts      # Ciclo de vida y conexión limpia
│   ├── auth/
│   │   ├── auth.controller.ts     # Endpoints POST /auth/register y POST /auth/login
│   │   ├── auth.module.ts         # JWT, Passport y bcrypt
│   │   ├── auth.service.ts        # Registro gamificado (nivel 1, tema base) y login
│   │   ├── auth.service.spec.ts   # Tests unitarios con mocks
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts
│   ├── users/
│   │   ├── users.controller.ts    # Endpoints GET /users/profile y GET /users/search
│   │   ├── users.module.ts
│   │   ├── users.service.ts       # Proyección y sanitización funcional
│   │   └── dto/
│   │       └── search-users.dto.ts
│   └── projects/
│       ├── projects.controller.ts # CRUD y membresía de proyectos
│       ├── projects.module.ts
│       ├── projects.service.ts    # Agregación funcional de progreso y validación de roles
│       ├── projects.service.spec.ts# Tests unitarios de proyectos y miembros
│       └── dto/
│           ├── add-project-member.dto.ts
│           └── create-project.dto.ts
└── test/
    ├── jest-e2e.json
    └── app.e2e-spec.ts            # Test E2E: registro, login, proyecto y colaboradores
```

---

## 2. 🗄️ Contenido Exacto de `prisma/schema.prisma`

```prisma
// Prisma schema for Ploty - Gamified Project & Activity Management Platform

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==========================================
// ENUMS
// ==========================================

enum ProjectRole {
  OWNER
  ADMIN
  MEMBER
}

enum ActivityType {
  SINGLE
  RECURRING
}

enum RecurrencePattern {
  NONE
  DAILY
  WEEKLY
  MONTHLY
  CUSTOM_DAYS
}

enum ActivityStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  OVERDUE
}

enum ActivityPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum RewardType {
  THEME
  MEDAL
  TITLE
  AVATAR_FRAME
}

// ==========================================
// MODELS
// ==========================================

model User {
  id              String        @id @default(uuid())
  email           String        @unique
  username        String        @unique
  passwordHash    String
  avatarUrl       String?
  xp              Int           @default(0)
  level           Int           @default(1)
  currentStreak   Int           @default(0)
  longestStreak   Int           @default(0)
  coins           Int           @default(0)
  equippedThemeId String?
  equippedMedalId String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Self & Gamification relations
  equippedTheme   GamificationItem? @relation("EquippedTheme", fields: [equippedThemeId], references: [id], onDelete: SetNull)
  equippedMedal   GamificationItem? @relation("EquippedMedal", fields: [equippedMedalId], references: [id], onDelete: SetNull)

  // Project relations
  ownedProjects   Project[]     @relation("ProjectOwner")
  memberships     ProjectMember[]

  // Activity relations
  createdActivities  Activity[] @relation("ActivityCreator")
  assignedActivities Activity[] @relation("ActivityAssignee")
  activityLogs       ActivityLog[]

  // Gamification unlock relations
  unlockedItems   UserUnlock[]

  @@map("users")
}

model Project {
  id            String          @id @default(uuid())
  name          String
  description   String?
  colorHex      String          @default("#6366F1")
  icon          String          @default("folder")
  isTeamProject Boolean         @default(false)
  ownerId       String
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  owner         User            @relation("ProjectOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members       ProjectMember[]
  activities    Activity[]

  @@map("projects")
}

model ProjectMember {
  id        String      @id @default(uuid())
  projectId String
  userId    String
  role      ProjectRole @default(MEMBER)
  joinedAt  DateTime    @default(now())

  project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@map("project_members")
}

model Activity {
  id                 String            @id @default(uuid())
  title              String
  description        String?
  type               ActivityType      @default(SINGLE)
  recurrence         RecurrencePattern @default(NONE)
  recurrenceInterval Int               @default(1)
  status             ActivityStatus    @default(PENDING)
  priority           ActivityPriority  @default(MEDIUM)
  xpReward           Int               @default(50)
  coinReward         Int               @default(10)
  dueDate            DateTime?
  projectId          String?
  creatorId          String
  assigneeId         String?
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  project            Project?          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  creator            User              @relation("ActivityCreator", fields: [creatorId], references: [id], onDelete: Cascade)
  assignee           User?             @relation("ActivityAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  logs               ActivityLog[]

  @@map("activities")
}

model ActivityLog {
  id                 String   @id @default(uuid())
  activityId         String
  userId             String
  completedAt        DateTime @default(now())
  xpEarned           Int
  coinsEarned        Int
  streakBonusApplied Boolean  @default(false)

  activity           Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("activity_logs")
}

model GamificationItem {
  id          String     @id @default(uuid())
  code        String     @unique
  name        String
  description String
  type        RewardType
  unlockLevel Int        @default(1)
  costCoins   Int        @default(0)
  metadata    Json       @default("{}")
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  unlockedBy  UserUnlock[]
  usersWithEquippedTheme User[] @relation("EquippedTheme")
  usersWithEquippedMedal User[] @relation("EquippedMedal")

  @@map("gamification_items")
}

model UserUnlock {
  id         String           @id @default(uuid())
  userId     String
  itemId     String
  unlockedAt DateTime         @default(now())

  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  item       GamificationItem @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@unique([userId, itemId])
  @@map("user_unlocks")
}
```

---

## 3. 🧩 Código de las Funciones Puras (`src/common/fp/`)

### A. Utilidades Base y Mónada Result (`src/common/fp/fp-utils.ts`)

```typescript
/**
 * Pure Functional Programming Core Utilities for Ploty
 * Strictly immutable, pure functions, and Either/Result pattern.
 */

// ==========================================
// RESULT / EITHER PATTERN
// ==========================================

export type Ok<T> = {
  readonly success: true;
  readonly value: T;
};

export type Err<E> = {
  readonly success: false;
  readonly error: E;
};

export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Result<T, never> => ({
  success: true,
  value,
});

export const err = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.success;

export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.success;

export const mapResult = <T, E, R>(
  result: Result<T, E>,
  fn: (value: T) => R,
): Result<R, E> => (result.success ? ok(fn(result.value)) : result);

export const flatMapResult = <T, E, R>(
  result: Result<T, E>,
  fn: (value: T) => Result<R, E>,
): Result<R, E> => (result.success ? fn(result.value) : result);

export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
  result.success ? result.value : fallback;

export const matchResult = <T, E, R>(
  result: Result<T, E>,
  onOk: (value: T) => R,
  onErr: (error: E) => R,
): R => (result.success ? onOk(result.value) : onErr(result.error));

// ==========================================
// FUNCTIONAL PIPE COMPOSITION
// ==========================================

export function pipe<A>(a: A): A;
export function pipe<A, B>(a: A, ab: (a: A) => B): B;
export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function pipe<A, B, C, D>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
): D;
export function pipe<A, B, C, D, E>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): E;
export function pipe<A, B, C, D, E, F>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
): F;
export function pipe<A, B, C, D, E, F, G>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
): G;
export function pipe(
  initial: unknown,
  ...fns: readonly ((arg: any) => any)[]
): unknown {
  return fns.reduce((current, fn) => fn(current), initial);
}

// ==========================================
// IMMUTABLE COLLECTION UTILITIES
// ==========================================

export const map =
  <T, R>(fn: (item: T, index: number, array: readonly T[]) => R) =>
  (list: readonly T[]): readonly R[] =>
    Object.freeze(list.map((item, index) => fn(item, index, list)));

export const mapList = <T, R>(
  list: readonly T[],
  fn: (item: T, index: number, array: readonly T[]) => R,
): readonly R[] => map(fn)(list);

export const filter =
  <T>(predicate: (item: T, index: number, array: readonly T[]) => boolean) =>
  (list: readonly T[]): readonly T[] =>
    Object.freeze(list.filter((item, index) => predicate(item, index, list)));

export const filterList = <T>(
  list: readonly T[],
  predicate: (item: T, index: number, array: readonly T[]) => boolean,
): readonly T[] => filter(predicate)(list);

export const reduce =
  <T, R>(
    reducer: (acc: R, item: T, index: number, array: readonly T[]) => R,
    initialValue: R,
  ) =>
  (list: readonly T[]): R =>
    list.reduce((acc, item, index) => reducer(acc, item, index, list), initialValue);

export const reduceList = <T, R>(
  list: readonly T[],
  reducer: (acc: R, item: T, index: number, array: readonly T[]) => R,
  initialValue: R,
): R => reduce(reducer, initialValue)(list);

export const groupBy =
  <T, K extends string | number | symbol>(keyFn: (item: T) => K) =>
  (list: readonly T[]): Readonly<Record<K, readonly T[]>> => {
    const result = {} as Record<K, T[]>;
    for (const item of list) {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
    }
    const frozenGroups = {} as Record<K, readonly T[]>;
    for (const key of Object.keys(result) as K[]) {
      frozenGroups[key] = Object.freeze(result[key]);
    }
    return Object.freeze(frozenGroups);
  };
```

### B. Lógica Matemática de Gamificación y Progreso (`src/common/fp/gamification-math.fp.ts`)

```typescript
/**
 * Pure Mathematical & Business Logic for Gamification & Progress
 * All functions are pure, side-effect free and strictly typed.
 */

import { filter, pipe, reduce } from './fp-utils';

export interface ActivityProgressItem {
  readonly status: string;
}

export interface GamificationProfileStats {
  readonly xp: number;
  readonly level: number;
  readonly nextLevelXp: number;
  readonly currentLevelBaseXp: number;
  readonly progressToNextLevelPercent: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly coins: number;
}

/**
 * Pure calculation of user Level from XP:
 * Level(XP) = floor(1 + sqrt(XP / 100))
 */
export const calculateLevel = (xp: number): number => {
  const safeXp = Math.max(0, xp);
  return Math.floor(1 + Math.sqrt(safeXp / 100));
};

/**
 * Pure calculation of required XP for a given level:
 * XP_siguiente(nivel) = 100 * nivel^2
 */
export const calculateNextLevelXp = (level: number): number => {
  const safeLevel = Math.max(1, Math.floor(level));
  return 100 * Math.pow(safeLevel, 2);
};

/**
 * Pure calculation of base XP at which the current level was reached:
 */
export const calculateCurrentLevelBaseXp = (level: number): number => {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel <= 1) return 0;
  return 100 * Math.pow(safeLevel - 1, 2);
};

/**
 * Pure calculation of the progress percentage towards the next level [0 - 100].
 */
export const calculateLevelProgressPercent = (xp: number): number => {
  const safeXp = Math.max(0, xp);
  const currentLevel = calculateLevel(safeXp);
  const baseXp = calculateCurrentLevelBaseXp(currentLevel);
  const nextXp = calculateNextLevelXp(currentLevel);
  const range = nextXp - baseXp;

  if (range <= 0) return 0;
  const progressRatio = (safeXp - baseXp) / range;
  const clampedRatio = Math.min(Math.max(progressRatio, 0), 1);
  return Math.round(clampedRatio * 100);
};

/**
 * Pure computation of complete gamification stats for a user.
 */
export const computeGamificationStats = (
  rawXp: number,
  currentStreak: number = 0,
  longestStreak: number = 0,
  coins: number = 0,
): Readonly<GamificationProfileStats> => {
  const xp = Math.max(0, rawXp);
  const level = calculateLevel(xp);
  const nextLevelXp = calculateNextLevelXp(level);
  const currentLevelBaseXp = calculateCurrentLevelBaseXp(level);
  const progressToNextLevelPercent = calculateLevelProgressPercent(xp);

  return Object.freeze({
    xp,
    level,
    nextLevelXp,
    currentLevelBaseXp,
    progressToNextLevelPercent,
    currentStreak: Math.max(0, currentStreak),
    longestStreak: Math.max(0, longestStreak),
    coins: Math.max(0, coins),
  });
};

/**
 * Pure calculation of project progress percentage based on an immutable list of activities:
 * Progress(%) = round((Completed Activities / Total Activities) * 100)
 */
export const calculateProjectProgress = (
  activities: readonly ActivityProgressItem[],
): number => {
  if (!activities || activities.length === 0) {
    return 0;
  }

  const completedCount = pipe(
    activities,
    filter((activity) => activity.status === 'COMPLETED'),
    (completed) => completed.length,
  );

  return Math.round((completedCount / activities.length) * 100);
};

export interface ProjectActivitySummary {
  readonly total: number;
  readonly completed: number;
  readonly pending: number;
  readonly inProgress: number;
  readonly overdue: number;
  readonly progressPercent: number;
}

export const computeProjectSummary = (
  activities: readonly ActivityProgressItem[],
): Readonly<ProjectActivitySummary> => {
  const total = activities.length;
  if (total === 0) {
    return Object.freeze({
      total: 0,
      completed: 0,
      pending: 0,
      inProgress: 0,
      overdue: 0,
      progressPercent: 0,
    });
  }

  const counts = reduce(
    (acc: Record<string, number>, curr: ActivityProgressItem) => {
      const status = curr.status;
      return {
        ...acc,
        [status]: (acc[status] || 0) + 1,
      };
    },
    {} as Record<string, number>,
  )(activities);

  const completed = counts['COMPLETED'] || 0;
  const inProgress = counts['IN_PROGRESS'] || 0;
  const overdue = counts['OVERDUE'] || 0;
  const pending = counts['PENDING'] || 0;
  const progressPercent = Math.round((completed / total) * 100);

  return Object.freeze({
    total,
    completed,
    pending,
    inProgress,
    overdue,
    progressPercent,
  });
};

/**
 * Pure role authorization checks
 */
export type ValidProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export const canManageProjectMembers = (
  role: string | null | undefined,
): boolean => role === 'OWNER' || role === 'ADMIN';

export const isProjectOwner = (role: string | null | undefined): boolean =>
  role === 'OWNER';

/**
 * Pure text sanitization for search inputs (username/email)
 */
export const sanitizeSearchTerm = (rawTerm: string | null | undefined): string => {
  if (!rawTerm) return '';
  return rawTerm
    .trim()
    .toLowerCase()
    .replace(/[^\w@.-]/gi, '');
};

export interface UserEntityInput {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly avatarUrl?: string | null;
  readonly xp: number;
  readonly level?: number;
  readonly currentStreak?: number;
  readonly longestStreak?: number;
  readonly coins?: number;
  readonly equippedThemeId?: string | null;
  readonly equippedMedalId?: string | null;
  readonly equippedTheme?: any;
  readonly equippedMedal?: any;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const formatUserProfile = (user: UserEntityInput) => {
  const stats = computeGamificationStats(
    user.xp,
    user.currentStreak ?? 0,
    user.longestStreak ?? 0,
    user.coins ?? 0,
  );

  return Object.freeze({
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl ?? null,
    stats,
    equippedTheme: user.equippedTheme ?? null,
    equippedMedal: user.equippedMedal ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
};
```

---

## 4. 🧪 Resultado en Consola de `npm run test`

```text
> ploty-dev@0.0.1 test
> jest

PASS src/common/fp/gamification-math.fp.spec.ts
PASS src/common/fp/fp-utils.spec.ts
PASS src/projects/projects.service.spec.ts
PASS src/auth/auth.service.spec.ts

Test Suites: 4 passed, 4 total
Tests:       55 passed, 55 total
Snapshots:   0 total
Time:        4.646 s
Ran all test suites.
```

### Ejecución de Pruebas de Integración E2E (`npm run test:e2e`):

```text
> ploty-dev@0.0.1 test:e2e
> jest --config ./test/jest-e2e.json

PASS test/app.e2e-spec.ts (9.728 s)
  Ploty Core Integration & Gamification (E2E)
    1. Authentication Flow
      √ POST /auth/register -> should register User 1 with Level 1 and default theme (380 ms)
      √ POST /auth/register -> should register User 2 (collaborator) (111 ms)
      √ POST /auth/login -> should authenticate User 1 with credentials (107 ms)
      √ GET /users/profile -> should return user profile with gamified stats (40 ms)
      √ GET /users/search?q= -> should find User 2 when searched by User 1 (38 ms)
    2. Collaborative Projects Flow
      √ POST /projects -> should create a new collaborative project (45 ms)
      √ GET /projects -> should list user projects with functional summaries (31 ms)
      √ POST /projects/:id/members -> should allow OWNER to add User 2 as MEMBER (36 ms)
      √ GET /projects/:id -> should now show 2 members in the project detail (29 ms)
      √ GET /projects -> User 2 should now see the project in their list (27 ms)
      √ POST /projects/:id/members -> should reject adding member if requester is not OWNER/ADMIN (20 ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        10.495 s
Ran all test suites.
```

---

## 5. 📡 Lista de Endpoints Documentados y Probados

| Módulo | Método | Ruta | Descripción | Seguridad / Validación |
|---|---|---|---|---|
| **Auth** | `POST` | `/auth/register` | Registro de usuario con hash `bcrypt`, nivel 1 y tema base | Validación DTO estricta (`RegisterDto`) |
| **Auth** | `POST` | `/auth/login` | Validación de credenciales y retorno de JWT + perfil | `LoginDto` (`email`, `password`) |
| **Users** | `GET` | `/users/profile` | Perfil gamificado completo, nivel puro y medallas | `JwtAuthGuard` (Bearer Token) |
| **Users** | `GET` | `/users/search?q=` | Búsqueda sanitizada de usuarios por username o email | `JwtAuthGuard` + Sanitización funcional |
| **Projects** | `POST` | `/projects` | Crear proyecto individual o en equipo (asigna `OWNER`) | `JwtAuthGuard` + `CreateProjectDto` |
| **Projects** | `GET` | `/projects` | Listar proyectos del usuario con resumen de avance | `JwtAuthGuard` + Agregación pura |
| **Projects** | `GET` | `/projects/:id` | Detalle del proyecto, miembros e indicadores base | `JwtAuthGuard` + Verificación de membresía |
| **Projects** | `POST` | `/projects/:id/members` | Vincular usuario al proyecto | `JwtAuthGuard` + Autorización pura (`OWNER`/`ADMIN`) |
| **Projects** | `DELETE` | `/projects/:id/members/:userId` | Desvincular miembro (protege al `OWNER`) | `JwtAuthGuard` + Autorización de roles |
| **Swagger** | `GET` | `/api/docs` | Documentación interactiva OpenAPI/Swagger | Pública |

---

## 6. 🚀 Confirmación de Sincronización Remota (GitHub)

- **Repositorio:** `https://github.com/FABIOS77/Ploty-dev`
- **Rama `main`:** Commit `8f6bfb4` (`feat(core): Hito 1 - Backend Core & Infraestructura (NestJS, Docker, Prisma, FP, Auth, Projects, Tests)`).
- **Rama `develop`:** Rama de desarrollo activa sincronizada con `origin/develop`.
- **Entorno Docker:** `ploty-db` saludable y verificado (PostgreSQL 16 Alpine en puerto local 5434 / red interna 5432).
