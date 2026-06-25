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

## STEP-06 · Next.js App Bootstrap, Tailwind CSS & next-intl

### Issue 1: `nest start --watch` fails with "Cannot find module dist/main" on first run

**What happened:** Running `pnpm dev` (which starts both `apps/api` and `apps/web` concurrently) caused the API to crash immediately with `Error: Cannot find module '.../dist/main'`. TypeScript reported `Found 0 errors` but produced no output files.

**Root cause:** Two settings interacted badly:
1. `nest-cli.json` has `"deleteOutDir": true` — wipes `dist/` before every build.
2. `tsconfig.json` has `"incremental": true` — tsc stores a `.tsbuildinfo` cache file (`tsconfig.build.tsbuildinfo`) alongside the source.

When nest deletes `dist/` and re-runs the compiler, tsc's incremental mode consults `.tsbuildinfo`, sees that no source files changed, and **skips emitting entirely**. `dist/main.js` is never written, so `node dist/main` throws immediately.

**Fix applied:** Added `"incremental": false` to `tsconfig.build.json` (which overrides the base `tsconfig.json`). The build config now always does a full emit. The root `tsconfig.json` still has `"incremental": true` so the `typecheck` (`tsc --noEmit`) command remains fast.

**Next time:** `deleteOutDir: true` and `incremental: true` are mutually incompatible — the cache always wins over the missing output dir. Whenever `deleteOutDir` is enabled in `nest-cli.json`, the build tsconfig must set `"incremental": false`.

---

## STEP-08 · Auth — Token Refresh & Password Reset

### Issue 1: `prisma migrate dev` requires an interactive TTY

**What happened:** Running `prisma migrate dev` to apply the new `passwordResetToken` columns failed with `Prisma Migrate has detected that the environment is non-interactive, exiting` because the Claude Code environment has no TTY attached.

**Impact:** Could not use the standard development workflow for applying schema changes.

**Fix applied:** Wrote the migration SQL manually under `prisma/migrations/20260625000000_add_password_reset_token/migration.sql` and applied it with `prisma migrate deploy`, which is non-interactive and designed for CI/production use.

**Next time:** When running inside a non-interactive shell (CI, Claude Code, Docker without `-it`), always use `prisma migrate deploy` for applying existing migrations. For new migrations, write the SQL file manually and let `migrate deploy` pick it up — or generate the file on a local dev machine with a TTY first and commit it.

---

### Issue 2: TypeScript strict mode requires `!` on DTO properties

**What happened:** New DTO classes (`ForgotPasswordDto`, `ResetPasswordDto`) used plain property declarations (`email: string`) which caused `TS2564: Property has no initializer and is not definitely assigned in the constructor`.

**Fix applied:** Added the definite assignment assertion (`email!: string`) to all DTO properties — consistent with the pattern already used in all prior DTOs in the project.

**Next time:** All DTO properties decorated with `class-validator` decorators must use `!` (definite assignment assertion). TypeScript strict mode flags the missing initializer because NestJS/class-validator assigns them at runtime via the validation pipe, which the compiler cannot see.

---

## STEP-09 · User Profile API & Settings

### Issue 1: User model uses `registeredAt`, not `createdAt`

**What happened:** The `User` model in `schema.prisma` uses `registeredAt DateTime @default(now())` instead of the conventional `createdAt`. Writing `select: { createdAt: true }` in `UsersService` caused `TS2353: Object literal may only specify known properties, and 'createdAt' does not exist in type 'UserSelect'`.

**Impact:** Caught on first test run; required a quick find-and-replace across the service and spec files.

**Next time:** Any future step that selects or exposes the user's registration timestamp must use `registeredAt`. This affects STEP-23 (user management), STEP-28 (dashboard stats), and any public profile endpoint that shows a "member since" date.
