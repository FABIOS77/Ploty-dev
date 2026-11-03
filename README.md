# 🎮 Ploty - Gamified Project & Activity Management Platform (Backend Core)

Ploty is an advanced gamified platform for managing individual and collaborative projects and activities, featuring pure functional programming principles, real-time gamification progression (XP, levels, streaks, coins, themes, medals), and containerized infrastructure.

---

## 🛠️ Tech Stack (Hito 1: Backend Core)
- **Framework:** [NestJS 11](https://nestjs.com/) (TypeScript Strict Mode)
- **ORM:** [Prisma ORM](https://www.prisma.io/)
- **Database:** PostgreSQL 16 Alpine
- **Containerization:** Docker & Docker Compose (Multi-stage Dockerfile)
- **Authentication:** JWT + Passport + Bcrypt
- **Paradigm:** Pure Functional Programming (`src/common/fp/`)
- **API Documentation:** OpenAPI / Swagger at `/api/docs`
- **Testing:** Jest (Unit & E2E Tests)

---

## 🚀 Quick Start (Docker)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/FABIOS77/Ploty-dev.git
   cd Ploty-dev
   ```

2. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Start services with Docker Compose:**
   ```bash
   docker compose up -d
   ```

4. **Access the API:**
   - **REST API:** `http://localhost:3000`
   - **Interactive Swagger Docs:** `http://localhost:3000/api/docs`

---

## 🧪 Testing

Run all unit tests:
```bash
npm run test
```

Run E2E integration tests:
```bash
npm run test:e2e
```

---

## 📐 Functional Programming Core (`src/common/fp/`)
All domain calculations, progressions, and transformations strictly follow functional programming principles:
- **`pipe`**: Strongly-typed unary pipeline composition.
- **`Result<T, E>` / Either**: Functional monadic error handling without unhandled exceptions.
- **Immutable Math**:
  - $\text{Nivel}(XP) = \lfloor 1 + \sqrt{\frac{XP}{100}} \rfloor$
  - $XP_{\text{siguiente}}(\text{nivel}) = 100 \cdot \text{nivel}^2$
  - $\text{Progreso}(\%) = \text{round}\left(\frac{\text{Actividades Completadas}}{\text{Total Actividades}} \times 100\right)$
