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
