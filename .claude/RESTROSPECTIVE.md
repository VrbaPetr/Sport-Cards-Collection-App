# Project Retrospective — Issues & Learnings

---

## STEP-02 · Database Schema & Migrations

### Issue 1: Prisma 7 breaking changes not anticipated

**What happened:** Prisma 7 removed the `url` property from the `datasource` block in `schema.prisma`. The old `url = env("DATABASE_URL")` syntax throws a hard validation error. This was discovered only after installing the package.

**Impact:** Required unexpected additional work:
- Schema generator changed from `prisma-client-js` to `prisma-client`
- Mandatory `output` path added to the generator block
- New `prisma.config.ts` file created to provide the datasource URL
- `dotenv` devDependency added for `prisma.config.ts` to load `.env`
- `DATABASE_URL` made conditional in config so `prisma generate` works without a DB connection

**Fix applied:** Conditional datasource in `prisma.config.ts` — if `DATABASE_URL` is not set, the datasource block is omitted so `prisma generate` (CI, build) still works; migrations require the env var to be set.

**Next time:** Before pinning a major ORM version, check the migration guide for breaking changes that affect the project's module system (CJS/ESM) and configuration model.

---

### Issue 2: PostgreSQL not available as a prerequisite

**What happened:** The STEP-02 acceptance criteria require `prisma migrate dev` to run against a real database, but no PostgreSQL instance was running on the developer machine and none was installed.

**Impact:** Blocked the migration step mid-way; required an ad-hoc PostgreSQL installation via Homebrew (`postgresql@17`) and manual database creation. The `createdb` binary path also differed from the expected Homebrew prefix (`/opt/homebrew` vs `/usr/local`).

**Fix applied:** Installed PostgreSQL 17 via Homebrew, started the service, created the `cards_coll_db` database, and ran the migration successfully.

**Next time:** STEP-40 plans a full Docker Compose setup (Postgres, Redis, MinIO). Moving that prerequisite setup earlier — even just a minimal `docker-compose.yml` with Postgres — would eliminate this class of problem for all subsequent steps that require a live database. Alternatively, document the exact setup commands in the README before STEP-02 begins.

---

## STEP-03 · Seed Script (Admin User, Sports, CardTypes)

### Issue 1: Prisma 7 new `prisma-client` generator requires a driver adapter at runtime

**What happened:** The `prisma-client` generator (introduced in Prisma 7, replacing `prisma-client-js`) does not use built-in binary connectors. Calling `new PrismaClient()` without arguments throws `PrismaClientInitializationError` at runtime, requiring an explicit driver adapter to be passed in.

**Impact:** Every place that instantiates `PrismaClient` must now pass a driver adapter. The seed script and smoke test both needed this pattern:
```typescript
import { PrismaPg } from '@prisma/adapter-pg';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
```
Three additional packages were added: `@prisma/adapter-pg`, `pg`, `@types/pg`.

**Fix applied:** Added a `createClient()` helper in both `prisma/seed.ts` and `prisma/seed.smoke.ts` that constructs the client with the adapter. This pattern will need to be repeated in every future NestJS service or module that creates a `PrismaClient`.

**Next time:** Create a shared `PrismaModule` / `PrismaService` in NestJS (STEP-04 or earlier) that encapsulates the adapter instantiation so that no other file needs to repeat it. All services receive the client via dependency injection rather than constructing it directly.

---

### Issue 2: Prisma 7 reads the seed command from `prisma.config.ts`, not `package.json`

**What happened:** The standard Prisma convention (Prisma ≤ 6) was to set `"prisma": { "seed": "..." }` in `package.json`. In Prisma 7, the `pnpm db:seed` command (`prisma db seed`) ignores `package.json` and only reads the seed command from `migrations.seed` inside `prisma.config.ts`.

**Impact:** The initial `pnpm db:seed` run printed `⚠️ No seed command configured` even though `package.json` had the correct entry. Required adding `seed: 'tsx prisma/seed.ts'` under `migrations` in `prisma.config.ts`.

**Fix applied:** Added `migrations.seed` to `prisma.config.ts`. The `package.json` `prisma.seed` key was kept for reference but is now effectively unused by Prisma 7.

**Next time:** When using Prisma 7, configure seeding in `prisma.config.ts` from the start. Remove the `package.json` `prisma.seed` key entirely to avoid confusion.

---

### Issue 3: pnpm `onlyBuiltDependencies` moved out of `package.json`

**What happened:** `bcrypt` requires native build scripts (`node-gyp`). The old way to allow this in pnpm was `"pnpm": { "onlyBuiltDependencies": [...] }` in `package.json`. In pnpm 11+, this field is no longer read from `package.json`; the setting now lives in `pnpm-workspace.yaml` under `allowBuilds`.

**Impact:** Adding the `pnpm` key to `package.json` generated a warning and had no effect. `bcrypt` remained unbuilt until `pnpm-workspace.yaml` was updated.

**Fix applied:** Set `bcrypt: true` and `esbuild: true` (tsx dependency) in the `allowBuilds` section of `pnpm-workspace.yaml`.

**Next time:** Any native-build dependency (`bcrypt`, `canvas`, `sharp`, etc.) needs its entry in `pnpm-workspace.yaml` `allowBuilds`, not in `package.json`.

---
