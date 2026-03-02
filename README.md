# Mini Job Processing Platform

Background job processing platformasi - scheduling, prioritization, rate limiting, retries, authentication va role-based authorization bilan.

## Texnologiyalar

| Texnologiya | Versiya | Vazifasi |
|-------------|---------|----------|
| NestJS | 11.x | Backend framework |
| TypeScript | 5.x | Dasturlash tili |
| PostgreSQL | 16.x | Ma'lumotlar bazasi |
| TypeORM | 0.3.x | ORM |
| Redis | 7.x | Queue va caching |
| BullMQ | 5.x | Background job processing |
| JWT | - | Authentication |
| Swagger | - | API dokumentatsiya |

---

## Tezkor boshlash

### 1. Repositoryni klonlash

```bash
git clone <repo-url>
cd mini-job-processing-task
```

### 2. Docker bilan ishga tushirish (tavsiya qilinadi)

```bash
# Barcha servislarni ishga tushirish
docker-compose up --build

# Yoki background mode
docker-compose up -d --build
```

Bu quyidagilarni ishga tushiradi:
- **API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 3. Manual ishga tushirish

```bash
# Dependencies o'rnatish
npm install

# .env faylini yaratish
cp env.example .env

# PostgreSQL va Redis ni lokalda ishga tushiring

# Migratsiyalarni ishga tushirish
npm run migration:run

# Ilovani ishga tushirish
npm run start:dev
```

---

## API Dokumentatsiya (Swagger)

Ilova ishga tushgach, brauzerda oching:

```
http://localhost:3001/docs
```

Bu yerda:
- Barcha endpointlar ro'yxati
- Request/Response sxemalari
- "Try it out" - endpointlarni sinab ko'rish imkoniyati
- Authorization - JWT token bilan autentifikatsiya

---

## API Endpointlari

### Authentication

| Method | Endpoint | Tavsif | Auth |
|--------|----------|--------|------|
| POST | `/auth/register` | Yangi foydalanuvchi yaratish | - |
| POST | `/auth/login` | Tizimga kirish | - |

### Tasks (User)

| Method | Endpoint | Tavsif | Auth |
|--------|----------|--------|------|
| POST | `/tasks` | Yangi task yaratish | USER/ADMIN |
| GET | `/tasks` | O'z tasklarini ko'rish | USER/ADMIN |
| POST | `/tasks/:id/cancel` | O'z taskini bekor qilish | USER/ADMIN |

### Tasks (Admin)

| Method | Endpoint | Tavsif | Auth |
|--------|----------|--------|------|
| GET | `/admin/tasks` | Barcha tasklarni ko'rish | ADMIN |
| POST | `/admin/tasks/:id/retry` | FAILED taskni qayta ishga tushirish | ADMIN |
| POST | `/admin/tasks/:id/cancel` | Istalgan PENDING taskni bekor qilish | ADMIN |

### Metrics

| Method | Endpoint | Tavsif | Auth |
|--------|----------|--------|------|
| GET | `/metrics` | Task statistikalarini ko'rish | ADMIN |

---

## Qanday ishlatish (Step by Step)

### 1. Ro'yxatdan o'tish

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secret123"
  }'
```

**Javob:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Token bilan task yaratish

```bash
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "type": "email",
    "priority": "high",
    "payload": {
      "to": "test@example.com",
      "subject": "Hello!"
    }
  }'
```

### 3. Tasklarni ko'rish

```bash
curl http://localhost:3001/tasks \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### 4. Task statuslarini filter qilish

```bash
# Status bo'yicha
curl "http://localhost:3001/tasks?status=COMPLETED" \
  -H "Authorization: Bearer <YOUR_TOKEN>"

# Sana oralig'i bo'yicha
curl "http://localhost:3001/tasks?from=2026-01-01&to=2026-12-31" \
  -H "Authorization: Bearer <YOUR_TOKEN>"

# Pagination
curl "http://localhost:3001/tasks?page=1&limit=10" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

---

## Task Priority va Status

### Priority
| Qiymat | Tavsif |
|--------|--------|
| `high` | Yuqori ustuvorlik |
| `normal` | Oddiy (default) |
| `low` | Past ustuvorlik |

### Status
| Qiymat | Tavsif |
|--------|--------|
| `PENDING` | Kutmoqda |
| `PROCESSING` | Ishlanmoqda |
| `COMPLETED` | Bajarildi |
| `FAILED` | Xatolik |
| `CANCELLED` | Bekor qilindi |

---

## Rate Limiting

Task turiga qarab cheklovlar:

| Task turi | Limit |
|-----------|-------|
| `email` | 5 ta/daqiqa |
| `report` | 2 ta/daqiqa |

---

## Arxitektura

```
src/
├── auth/                 # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   └── dto/
├── users/                # Users module
│   ├── users.entity.ts
│   ├── users.service.ts
│   └── users.module.ts
├── tasks/                # Tasks module
│   ├── task.entity.ts
│   ├── tasks.service.ts
│   ├── tasks.controller.ts
│   ├── admin-tasks.controller.ts
│   ├── tasks.worker.ts   # BullMQ worker
│   └── dto/
├── metrics/              # Metrics module
│   ├── metrics.controller.ts
│   └── metrics.dto.ts
├── mock/                 # Mock service
│   └── mock.service.ts   # 2-5s delay, 25% failure simulation
├── common/               # Shared utilities
│   ├── filters/          # Global exception filter
│   └── dto/
├── migrations/           # TypeORM migrations
├── app.module.ts
├── main.ts
└── data-source.ts
```

---

## Environment Variables

```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
POSTGRES_DB=mini_job_db

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=60m    # 15m, 30m, 60m, yoki sekundlarda

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# App
PORT=3001
```

---

## NPM Scriptlar

```bash
# Development
npm run start:dev       # Watch mode bilan ishga tushirish

# Production
npm run build           # TypeScript compile
npm run start:prod      # Production mode

# Database
npm run migration:run   # Migratsiyalarni ishga tushirish
npm run migration:revert # Oxirgi migratsiyani bekor qilish

# Testing
npm run test            # Unit testlar
npm run test:e2e        # E2E testlar
npm run test:cov        # Test coverage

# Code quality
npm run lint            # ESLint
npm run format          # Prettier
```

---

## Xavfsizlik

- JWT token bilan autentifikatsiya
- Password bcrypt bilan hash qilinadi
- Role-based access control (ADMIN/USER)
- Global exception handler (app crash bo'lmaydi)
- Input validation (class-validator)
- SQL injection himoyasi (TypeORM parametrized queries)

---

## Muallif

- Bu loyiha mini-job-processing uchun yaratilgan.
- Creator:Dilshodbek
---

## Litsenziya

UNLICENSED
