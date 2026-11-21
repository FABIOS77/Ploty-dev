# ENTREGABLE QA — BACKEND (`Ploty-dev`)

**Fecha:** 21 de Noviembre de 2026  
**Estado:** ✅ 100% Verificado — Tests Unitarios, E2E y Build en Verde

---

## 1. Archivos Modificados y Creados

### Creados
- `prisma/seed.ts` — Script idempotente de sembrado demo (13 ítems de catálogo, 3 usuarios, 2 proyectos, 9 actividades y 22 logs históricos distribuidos en los últimos 21 días).
- `src/projects/dto/update-project.dto.ts` — DTO validado para `PATCH /projects/:id`.
- `ENTREGABLE_QA_BACKEND.md` — Este entregable de verificación QA.

### Modificados
- `prisma/schema.prisma` — Soporte persistente en `User` para `equippedFrameId`, `equippedTitleId`, relaciones `equippedFrame`/`equippedTitle`, y enum `RewardType` ampliado (`THEME`, `MEDAL`, `TITLE`, `AVATAR_FRAME`, `FRAME`).
- `package.json` — Dependencias `helmet` y `@nestjs/throttler`, más configuración `prisma.seed`.
- `.env.example` — Documentación de `CORS_ORIGINS`.
- `src/main.ts` — Registro de `helmet()` y CORS seguro basado en lista blanca (`process.env.CORS_ORIGINS` con fallback `['http://localhost:5173', 'http://localhost:3000']`).
- `src/app.module.ts` — Configuración global de `ThrottlerModule` (120 req/min) y `APP_GUARD: ThrottlerGuard`.
- `src/auth/auth.module.ts` & `src/auth/strategies/jwt.strategy.ts` — Eliminación de secretos JWT hardcodeados (exige `process.env.JWT_SECRET` o lanza error fatal) e inclusión de `equippedFrame`/`equippedTitle`.
- `src/auth/auth.controller.ts` — `@Throttle({ default: { limit: 10, ttl: 60000 } })` en `POST /auth/login` y `POST /auth/register`.
- `src/auth/auth.service.ts` & `src/users/users.service.ts` — Inclusión de `equippedFrame` y `equippedTitle` en perfil de usuario.
- `src/auth/dto/register.dto.ts` — Validación estricta: `username` con `/^[a-zA-Z0-9_]{3,30}$/`, `password` >= 8 caracteres y `avatarUrl` con protocolo `https` obligatorio.
- `src/activities/activities.controller.ts` — `ParseUUIDPipe` en todos los parámetros `:id`.
- `src/activities/dto/create-activity.dto.ts` & `update-activity.dto.ts` — Límites anti-trampas (`xpReward` <= 500, `coinReward` <= 250, `recurrenceInterval` 1..365).
- `src/activities/activities.service.ts` — Helper `assertActivityAccess` anti-IDOR, bloqueo de cambio directo a `COMPLETED` en `PATCH`, clamping puro de recompensas por prioridad (`resolveSafeActivityRewards`) y cooldown diario UTC (`409 Conflict`) en actividades `RECURRING`.
- `src/gamification/dto/equip-item.dto.ts` — Soporte para los 4 slots (`themeId`, `medalId`, `frameId`, `titleId`).
- `src/gamification/gamification.controller.ts` & `gamification.service.ts` — `ParseUUIDPipe`, compra transaccional atómica contra doble gasto (`tx.user.updateMany` con `coins: { gte: item.costCoins }`), validación estricta de tipo por slot en `equipItem` y control de privacidad por membresía en `getLeaderboard(projectId)`.
- `src/projects/projects.controller.ts` & `projects.service.ts` — `ParseUUIDPipe`, endpoints `PATCH /projects/:id` (OWNER/ADMIN) y `DELETE /projects/:id` (OWNER), e inclusión de conteo de logs para progreso de actividades recurrentes.
- `src/reports/reports.controller.ts` & `reports.service.ts` — Validación estricta de `days` (entero `1..365`, defecto `30`) contra DoS, `ParseUUIDPipe` en `:projectId` y cálculo exacto de progreso recurrente.
- `src/common/fp/fp-utils.ts` — Refactorización de `groupBy` con `reduce` inmutable (sin `for` ni `.push()`).
- `src/common/fp/analytics.fp.ts` — Refactorización de `buildDailyCompletionSeries` con `Array.from` + `map`/`reduce` sin mutaciones.
- `src/common/fp/gamification-math.fp.ts` — Corrección de `calculateProjectProgress` y `computeProjectSummary` para actividades `RECURRING` con ejecuciones, `resolveSafeActivityRewards`, y exposición de `equippedFrameId`/`equippedTitleId` en `formatUserProfile`.
- Tests unitarios actualizados y ampliados: `gamification-math.fp.spec.ts`, `activities.service.spec.ts`, `gamification.service.spec.ts`, `projects.service.spec.ts`, `auth.service.spec.ts`.

---

## 2. Resultados de Verificación

| Comando | Resultado |
| :--- | :--- |
| `npx prisma db push` + `npx prisma generate` | ✅ Esquema sincronizado y Prisma Client v6.19.3 generado |
| `npx prisma db seed` (ejecutado 2 veces) | ✅ Idempotente (13 ítems, 3 usuarios, 2 proyectos, 9 actividades, 22 logs) |
| `npm test` (Jest Unit Tests) | ✅ **10 suites pasadas / 121 tests pasados (0 fallos)** |
| `npm run test:e2e` (Supertest E2E) | ✅ **1 suite pasada / 21 tests pasados (0 fallos)** |
| `npm run build` (`nest build`) | ✅ **0 errores de TypeScript** |
| Health check HTTP (`GET /api/docs` + `POST /auth/login`) | ✅ `HTTP 200 OK` + cabecera Helmet `x-content-type-options: nosniff` |

---

## 3. URLs Locales y Credenciales Demo

- **Backend API:** `http://localhost:3000`
- **Swagger Docs:** `http://localhost:3000/api/docs`
- **PostgreSQL (Docker `ploty-db`):** `localhost:5434`

### Credenciales Demo (`prisma/seed.ts`)
| Rol Demo | Email | Contraseña | Username | Nivel / Monedas |
| :--- | :--- | :--- | :--- | :--- |
| Principal | `demo@ploty.app` | `Demo1234!` | `fabio_demo` | Nivel 3 / 480 monedas / Racha 5 días |
| Colaborador 1 | `ana@ploty.app` | `Demo1234!` | `ana_dev` | Nivel 2 / 190 monedas |
| Colaborador 2 | `carlos@ploty.app` | `Demo1234!` | `carlos_ux` | Nivel 2 / 140 monedas |
