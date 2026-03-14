# RAHO Backend API

> RESTful API untuk sistem manajemen klinik RAHO — mengelola autentikasi, cabang, staff, dan pasien.

***

## Tech Stack

| Layer | Teknologi |
|---|---|
| Runtime | Node.js v24+ |
| Framework | Express.js 4.21 |
| Language | TypeScript 5.6 |
| ORM | Prisma 5.22 |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (Access + Refresh Token) |
| Validation | Zod |
| Security | Helmet, CORS, Rate Limiting |
| Logging | Winston + Morgan |

***

## Fitur per Sprint

| Sprint | Fitur | Endpoint |
|---|---|---|
| Sprint 1 | Authentication (Login, Refresh, Logout, Change Password) | `#1–4` |
| Sprint 2 | Branch & Staff Management | `#5–17` |
| Sprint 3 | Member/Patient Management + Branch Access | `#18–30` |

***

## Prasyarat

Pastikan sudah terinstall:

- [Node.js](https://nodejs.org/) v24+
- [npm](https://www.npmjs.com/) v10+
- Akun [Supabase](https://supabase.com/) (PostgreSQL)

***

## Setup & Installation

### 1. Clone Repository

```bash
git clone https://github.com/Etherlyvan/raho-backend.gitraho-backend.git
cd raho-backend
```

### 2. Install Dependencies

```bash
npm ci
```

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` sesuai konfigurasi:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:6543/<db>?pgbouncer=true"
DIRECT_URL="postgresql://<user>:<password>@<host>:5432/<db>"
NODE_ENV=development
PORT=3000
API_PREFIX=/api
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=http://localhost:3001
```

> `DATABASE_URL` → via PgBouncer (port `6543`) untuk runtime
> `DIRECT_URL` → koneksi langsung (port `5432`) untuk `prisma migrate`

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Jalankan Migration

```bash
# Development
npm run db:push

# Production (track history)
npm run db:migrate
```

### 6. Seed Data Default

```bash
npm run db:seed
```

Seed akan membuat:
| Role | Email | Password |
|---|---|---|
| `SUPER_ADMIN` | `superadmin@raho.com` | `Admin@1234` |
| `ADMIN` | `admin@raho.com` | `Admin@1234` |

> ⚠️ Ganti password setelah login pertama via `PATCH /api/auth/change-password`

### 7. Jalankan Server

```bash
# Development (hot reload)
npm run dev

# Production
npm run build && npm start
```

Server berjalan di `http://localhost:3000`

***

## Available Scripts

```bash
npm run dev          # Jalankan server development (tsx watch)
npm run build        # Compile TypeScript → dist/
npm start            # Jalankan compiled build
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema ke database (dev)
npm run db:migrate   # Jalankan migration (production)
npm run db:seed      # Seed data default
npm run db:studio    # Buka Prisma Studio (GUI database)
```

***

## API Overview

### Base URL
```
http://localhost:3000/api
```

### Health Check
```
GET http://localhost:3000/health
```

### Authentication
Semua endpoint (kecuali `/auth/login` dan `/health`) membutuhkan header:
```
Authorization: Bearer <accessToken>
```

### Endpoint Summary

```
── Auth ──────────────────────────────────────
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/logout
PATCH  /api/auth/change-password

── Branch ────────────────────────────────────
POST   /api/branches
GET    /api/branches
GET    /api/branches/:branchId
PATCH  /api/branches/:branchId
PATCH  /api/branches/:branchId/toggle-active

── User / Staff ──────────────────────────────
POST   /api/users
GET    /api/users
GET    /api/users/:userId
PATCH  /api/users/:userId
PATCH  /api/users/:userId/toggle-active
PATCH  /api/users/:userId/reset-password
GET    /api/users/:userId/profile
PATCH  /api/users/:userId/profile

── Member / Pasien ───────────────────────────
POST   /api/members
GET    /api/members
GET    /api/members/lookup?memberNo=RHC-00001
GET    /api/members/:memberId
PATCH  /api/members/:memberId
PATCH  /api/members/:memberId/toggle-active
PATCH  /api/members/:memberId/consent-photo
POST   /api/members/:memberId/documents
GET    /api/members/:memberId/documents
DELETE /api/members/:memberId/documents/:docId

── Branch Access ─────────────────────────────
POST   /api/branch-access
GET    /api/branch-access/:memberId
PATCH  /api/branch-access/:accessId/revoke
```

***

## Human-Readable Code System

Sistem menggunakan PostgreSQL Sequence untuk generate kode unik yang collision-safe:

```
Branch  → RHC-BR-001
Staff   → RHC-DOC-BR001-0001
Pasien  → RHC-2603-00001
```

***

## Project Structure

```
raho-backend/
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── seed.ts              # Data seed default
│   └── migrations/          # Migration history
├── src/
│   ├── app.ts               # Entry point
│   ├── config/env.ts        # Environment config
│   ├── lib/
│   │   ├── prisma.ts        # Prisma singleton
│   │   └── sequences.ts     # Code generator (branch, staff, member)
│   ├── middleware/
│   │   ├── auth.ts          # JWT authenticate & authorize
│   │   ├── errorHandler.ts  # Global error handler
│   │   └── validate.ts      # Zod request validator
│   ├── modules/
│   │   ├── auth/
│   │   ├── branch/
│   │   ├── user/
│   │   ├── member/
│   │   └── branch-access/
│   ├── types/express.d.ts   # Express type augmentation
│   └── utils/
│       ├── logger.ts        # Winston logger
│       └── response.ts      # Standar response helper
├── .env.example
├── package.json
└── tsconfig.json
```

***

## Environment Variables Reference

| Variable | Required | Default | Deskripsi |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection (PgBouncer) |
| `DIRECT_URL` | ✅ | — | PostgreSQL direct (untuk migrate) |
| `NODE_ENV` | ✅ | `development` | Environment mode |
| `PORT` | ✅ | `3000` | Port server |
| `API_PREFIX` | ✅ | `/api` | Base path semua route |
| `JWT_SECRET` | ✅ | — | Secret key access token (min 32 char) |
| `JWT_EXPIRES_IN` | ✅ | `7d` | Masa berlaku access token |
| `JWT_REFRESH_SECRET` | ✅ | — | Secret key refresh token |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | `30d` | Masa berlaku refresh token |
| `BCRYPT_SALT_ROUNDS` | ✅ | `12` | Cost factor bcrypt |
| `CORS_ORIGIN` | ✅ | — | URL frontend yang diizinkan |

***

## License

Private — RAHO Internal System © 2026