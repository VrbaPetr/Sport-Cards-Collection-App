# Sports Cards Collector App

A web application for managing physical sports card collections virtually.

## Tech Stack

| Layer    | Technology           |
|----------|----------------------|
| Frontend | Next.js 15 (App Router, TypeScript) |
| Backend  | NestJS 11 (REST API, TypeScript)    |
| Database | PostgreSQL + Prisma  |
| CSS      | Tailwind CSS         |
| i18n     | next-intl            |
| Email    | Resend               |
| Storage  | AWS S3 / Cloudflare R2 |

## Prerequisites

- Node.js ≥ 22
- pnpm ≥ 9
- PostgreSQL (local or Docker)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example env files and fill in the values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 3. Start both apps in development mode

```bash
pnpm dev
```

This runs `apps/api` (NestJS) on **http://localhost:3001** and `apps/web` (Next.js) on **http://localhost:3000** in parallel.

### Individual apps

```bash
# Backend only
pnpm --filter @cards-coll/api dev

# Frontend only
pnpm --filter @cards-coll/web dev
```

## Other scripts

| Command           | Description                              |
|-------------------|------------------------------------------|
| `pnpm build`      | Build both apps for production           |
| `pnpm typecheck`  | Run TypeScript type-check across both    |
| `pnpm lint`       | Run ESLint across both apps              |
| `pnpm format`     | Format all files with Prettier           |

## Project structure

```
apps/
  api/   — NestJS REST API
  web/   — Next.js frontend
tsconfig.base.json  — Shared TypeScript base config
.prettierrc.json    — Shared Prettier config
```
