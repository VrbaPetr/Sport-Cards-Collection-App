# Sports Cards Collector App — Implementation Plan

**Stack:** Next.js · NestJS · PostgreSQL · Prisma · BullMQ · S3/R2 · Resend · next-intl  
**Rule:** One step at a time. The app must be runnable and functional after every step.

---

## Progress

- [ ] **Phase 1 — Foundation** (Steps 01–06)
- [ ] **Phase 2 — Backend Core** (Steps 07–14)
- [ ] **Phase 3 — Admin Panel** (Steps 15–24)
- [ ] **Phase 4 — User Features** (Steps 25–33)
- [ ] **Phase 5 — Public Browse** (Steps 34–35)
- [ ] **Phase 6 — Export** (Step 36)
- [ ] **Phase 7 — Polish** (Steps 37–40)

---

## Phase 1 — Foundation

### STEP-01 · Monorepo Scaffolding & Dev Tooling ✅

- [x] Monorepo root with pnpm workspaces (or Turborepo): `apps/web` (Next.js) and `apps/api` (NestJS)
- [x] TypeScript strict mode via shared `tsconfig.base.json`
- [x] ESLint + Prettier configured consistently across both packages
- [x] `.env.example` files documenting all required env vars for both apps; no secrets committed
- [x] Root `README.md` with instructions for starting each app

**Acceptance:**
- `pnpm dev` starts both apps without errors ✅
- TypeScript compiles with zero errors in both packages ✅
- Linter runs clean from the root ✅

**Tests:** No automated tests — tooling correctness verified by clean compilation and lint.

---

### STEP-02 · Database Schema & Migrations (All 15 Entities) ✅

- [x] Prisma schema defining all 15 entities with UUID PKs, all relations, all constraints
- [x] `gradeValue` + `gradingCompany` nullability rule documented as a comment (enforced in service layer later)
- [x] Indexes on all FK columns and slug columns
- [x] `DATABASE_URL` read from env only — no hardcoded connection strings
- [x] Migration generated and applied to local PostgreSQL

**Entities:** User, Collection, CardDefinition, CardDefinitionPlayer, OwnedCard, CollectionCard, Player, Manufacturer, Series, Set, Year, Sport, Competition, Team, CardType (+ RefreshToken added by decision)

**Acceptance:**
- `prisma migrate dev` runs to completion ✅
- `prisma studio` shows all 16 tables ✅
- All FK relations are navigable ✅
- Re-running the migration command is idempotent ✅

**Tests:** Schema correctness is the acceptance criterion — no application tests yet.

---

### STEP-03 · Seed Script (Admin User, Sports, CardTypes) ✅

- [x] Admin user seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars with `role=ADMIN` and `isEmailVerified=true`
- [x] 6 Sports: Basketball, Ice Hockey, Football, Baseball, Soccer, Tennis
- [x] 10 CardTypes (all `isSystem=true`): Base, Rookie, Autograph, Relic, Patch, Refractor, Parallel, Insert, Memorabilia, Short Print
- [x] All upserts use `update: {}` — never overwrites existing admin password hash
- [x] Auto-generated slugs applied to all seeded records

**Acceptance:**
- Running the seed script twice produces identical DB state (idempotent) ✅
- Admin user exists with correct role and verified status ✅
- All sports and card types exist with correct slugs ✅
- No additional rows created on a second seed run ✅

**Tests:** Smoke test — run seed twice and assert row counts do not change. ✅

---

### STEP-04 · NestJS App Bootstrap & Configuration Module ✅

- [x] NestJS entry point with global prefix `/api`
- [x] `ConfigModule` reading all env vars; startup fails fast with descriptive error if any required var is missing
- [x] Global exception filter mapping all errors to `{ error: { code, message, details } }` envelope
- [x] Global response interceptor wrapping successful responses in `{ data }` or `{ data, meta }`
- [x] `GET /api/health` returning `{ status: "ok" }`
- [x] CORS configured to allow the frontend origin from env
- [x] `PrismaModule` / `PrismaService` encapsulating driver adapter (retrospective recommendation from STEP-03)

**Acceptance:**
- `GET /api/health` returns `200 { data: { status: "ok" } }` ✅
- Thrown exceptions return the correct error envelope shape ✅
- Missing required env var → descriptive startup error ✅

**Tests:** Unit test the exception filter and response interceptor to confirm envelope shapes. ✅ (10/10 tests pass)

---

### STEP-05 · Slug Utility ✅

- [x] Shared utility (usable by NestJS service layer): lowercase, spaces/underscores → hyphens, non-ASCII characters transliterated to ASCII equivalents, result filtered to `[a-z0-9-]` only, leading/trailing hyphens stripped, consecutive hyphens collapsed
- [x] Conflict resolution logic: given a candidate slug + a lookup function, appends `-2`, `-3`, … until unique (silent suffix for auto-generated; caller surfaces conflict for manually set slugs)

**Acceptance:**
- `"Michael Jordan"` → `michael-jordan`
- `"Tomáš Novák"` → `tomas-novak`
- Underscores, mixed case, and special chars handled correctly
- Conflict suffix appended silently for auto slugs; caller can detect conflict for manual slugs

**Tests:** Unit tests are essential — ASCII, non-ASCII, edge cases (empty string, all-special-chars), and conflict resolution with a mock lookup function.

---

### STEP-06 · Next.js App Bootstrap, Tailwind CSS & next-intl ✅

- [x] Next.js App Router project with TypeScript strict mode
- [x] Tailwind CSS configured with a base design token set
- [x] next-intl configured with `en.json` and `cs.json`; cs may mirror en for v1 but both files must always have identical keys
- [x] Root layout rendering the locale provider
- [x] Minimal home page (`/`) rendering a translated heading to confirm i18n is wired
- [x] `NEXT_PUBLIC_API_URL` consumed by a centralised API client module

**Acceptance:**
- App starts and renders the home page with a translated string
- Changing the locale renders the cs string
- Both locale files have exactly the same keys (verified by a sync check)
- Tailwind classes apply correctly

**Tests:** CI script that diffs the key sets of `en.json` and `cs.json` and fails on mismatch.

---

## Phase 2 — Backend Core

### STEP-07 · Auth — Register, Email Verification, Login, Logout ✅

- [x] `POST /api/auth/register` — creates user, hashes password with bcrypt, sends verification email via Resend, creates default "All" collection (`isDefault=true`, non-deletable, non-renameable)
- [x] `POST /api/auth/verify-email` — marks `isEmailVerified=true`, invalidates the verification token
- [x] `POST /api/auth/resend-verification` — rate-limited; resends verification email
- [x] `POST /api/auth/login` — validates credentials, returns access token (15-min JWT: `{ userId, tokenVersion, role }`) in response body, sets refresh token (30-day opaque, stored in `RefreshToken` DB table) as HttpOnly Secure SameSite=Lax cookie
- [x] `POST /api/auth/logout` — deletes the RefreshToken row and clears the cookie
- [x] Guard on all write endpoints returning `403 EMAIL_NOT_VERIFIED` for unverified users

**Acceptance:**
- Registering creates a user with `isEmailVerified=false` and a default "All" collection
- Verification link marks the user verified
- Login returns a valid JWT and sets the cookie
- Logout clears the cookie and removes the DB refresh token row
- Wrong credentials → 401
- Write op as unverified user → `403 EMAIL_NOT_VERIFIED`

**Tests:** 25 tests pass (14 service unit tests, 9 controller integration tests, 2 EmailVerifiedGuard unit tests) ✅

---

### STEP-08 · Auth — Token Refresh & Password Reset ✅

- [x] `POST /api/auth/refresh` — reads HttpOnly cookie, validates opaque token against DB, checks `tokenVersion` matches JWT, issues a new access token
- [x] `POST /api/auth/forgot-password` — sends time-limited password reset link via Resend; always returns 200 regardless of whether email exists (prevents enumeration)
- [x] `POST /api/auth/reset-password` — validates reset token, updates `passwordHash`, increments `tokenVersion` (invalidates all existing sessions), deletes all RefreshToken rows for the user

**Acceptance:**
- Valid cookie issues a new access token
- Expired or deleted cookie → 401
- Password reset email sent; link resets password and invalidates previous tokens
- Using the same reset link twice → 400/422

**Tests:** 42 tests pass (19 service unit tests, 13 controller integration tests, 2 EmailVerifiedGuard unit tests) ✅

---

### STEP-09 · User Profile API & Settings ✅

- [x] `GET /api/users/:username` — public profile; returns 404 if user is deactivated or does not exist
- [x] `GET /api/users/me` — full profile for the authenticated user
- [x] `PATCH /api/users/me` — updates `avatarUrl` only; username is immutable after registration
- [x] `POST /api/upload/presign` — returns pre-signed S3/R2 URL for avatar upload (max 5MB, MIME types: jpeg/png/webp); enforces constraints via S3/R2 policy conditions
- [x] Reserved usernames enforced server-side at registration: `admin`, `api`, `profile`, `login`, `logout`, `register`, `forgot-password`, `reset-password`, `dashboard`, `collection`, `cards`, `settings`, `health`, `manufacturer`, `team`, `player`, `year`, `sport`, `static`, `_next`, `favicon`

**Acceptance:**
- Active user profile returns correct data
- Deactivated user profile → 404
- Username cannot be changed via PATCH
- Pre-signed URL returned and restricted to allowed MIME types and size

**Tests:** 85 tests pass (7 UsersService unit, 8 UsersController integration, 2 UploadService unit, 3 UploadController integration + all prior 65) ✅

---

### STEP-10 · Collections API

- [ ] `GET /api/collections` — lists the authenticated user's collections
- [ ] `POST /api/collections` — creates a custom collection; slug auto-generated from name; auto-generated conflict gets silent suffix; manually set conflict → inline error
- [ ] `PATCH /api/collections/:id` — edits name, `coverImageUrl`, `isPublic`; the "All" collection (`isDefault=true`) rejects rename
- [ ] `DELETE /api/collections/:id` — deletes collection and all CollectionCard join rows; the "All" collection → 403
- [ ] `GET /api/users/:username/collections` — returns public collections of a given active user
- [ ] `GET /api/users/:username/collections/:slug` — returns a specific public collection with its cards; private collection or deactivated user → 404

**Acceptance:**
- Default "All" collection cannot be renamed or deleted
- Slugs are unique per user
- Private collections absent from the public endpoint (404, not 403)
- Deleting a collection does not delete the OwnedCards themselves

**Tests:** Integration tests for "All" collection protection rules and public/private visibility split.

---

### STEP-11 · OwnedCard API (Add, Edit, Delete, List)

- [ ] `POST /api/owned-cards` — creates OwnedCard; auto-adds to user's "All" collection; `gradeValue` and `gradingCompany` must both be set or both be null (422 if violated); `limitation` trimmed of whitespace and spaces around `/` removed server-side
- [ ] `GET /api/owned-cards` — paginated list (`page` + `limit`, default 20, max 100; `limit=0` → 400; out-of-range page → 200 with empty data)
- [ ] `PATCH /api/owned-cards/:id` — edits grading, limitation, notes, photo URLs; same grade nullability rule enforced
- [ ] `DELETE /api/owned-cards/:id` — deletes OwnedCard; cascades to all CollectionCard join rows; queues async S3/R2 cleanup via BullMQ if custom photos exist
- [ ] `POST /api/owned-cards/:id/collections` — adds the card to an additional collection
- [ ] `DELETE /api/owned-cards/:id/collections/:collectionId` — removes the card from a specific collection (cannot remove from "All")

**Acceptance:**
- New card automatically appears in the "All" collection
- `gradeValue`/`gradingCompany` nullability violated → 422
- Deleting an OwnedCard removes all CollectionCard rows but not the collections themselves
- `limit=0` → 400; out-of-range page → 200 with empty data
- S3 cleanup job enqueued (not awaited) on delete

**Tests:** Unit tests for grade nullability rule and limitation trimming; integration tests for cascade delete and "All" collection auto-assignment.

---

### STEP-12 · Card Photo Upload — Pre-signed URLs & BullMQ Worker

- [ ] Pre-sign endpoint supports entity types: `owned-card-front`, `owned-card-back`, `card-definition-front`, `card-definition-back`
- [ ] Pre-signed URL capped at 5MB, restricted to jpeg/png/webp via S3/R2 `ContentLengthRange` + `ContentType` policy conditions
- [ ] Client uploads directly to S3/R2, then calls the PATCH endpoint with the resulting URL to persist it in DB
- [ ] BullMQ worker that processes S3/R2 deletion jobs: reads the URL from the job payload, calls the delete API; retries up to 5× with exponential backoff; after all retries exhausted, moves orphaned key to `orphan-review/` prefix
- [ ] Daily cron job reconciling DB image URL references against S3 object listings and flagging orphans

**Acceptance:**
- Pre-signed URL returned for all four entity-type variants
- Disallowed MIME type rejected at the pre-sign stage
- Uploading and saving the URL makes it visible on GET
- BullMQ worker processes delete jobs without blocking DB operations

**Tests:** Integration test confirming the pre-sign endpoint rejects disallowed MIME types; unit test for the S3 delete worker logic.

---

### STEP-13 · Reference Data APIs (Read-only, Public)

- [ ] Public GET endpoints with pagination for: Sports, Competitions, Manufacturers, Years, Series, Sets, Players, Teams, CardTypes
- [ ] Filters: competitions by `sportId`; series by `sportId`, `competitionId`, `yearId`, `manufacturerId`; players by `sportId`, `teamId`, `nationality`; teams by `sportId`, `competitionId`
- [ ] Empty Series hidden from public browse (must contain ≥1 Set); empty Sets hidden from public browse (must contain ≥1 CardDefinition); computed at query time
- [ ] Standard `{ data, meta }` envelope with pagination throughout

**Acceptance:**
- All endpoints return seeded data plus any admin-created records
- Empty series and sets absent from public responses
- Pagination consistent across all list endpoints

**Tests:** Integration tests for the empty-series/empty-set filtering rule.

---

### STEP-14 · Card Catalogue API (Browse, Search, Faceted Filter, Sort)

- [ ] `GET /api/catalogue` — paginated list of CardDefinitions; full-text search on name/cardNumber
- [ ] Faceted filters: `sportId`, `competitionId`, `yearId`, `seriesId`, `setId`, `cardTypeId`, `playerId`, `rookieFlag`
- [ ] Sort options: name asc/desc, cardNumber asc/desc, createdAt desc
- [ ] `GET /api/catalogue/:slug` — single CardDefinition detail with related Set, Series, Players, CardType
- [ ] Response includes both `OwnedCard.photoFrontUrl` and `CardDefinition.photoFrontUrl` (and back equivalents) when called in an authenticated context so the frontend can apply the fallback chain

**Acceptance:**
- Partial name search returns correct results
- Combining two filters narrows results correctly
- Sorting changes result order
- Empty result → `200 { data: [], meta: { total: 0, ... } }`

**Tests:** Integration tests for at least three filter combinations and both sort directions.

---

## Phase 3 — Admin Panel

### STEP-15 · Admin Auth Guard & Admin Layout (Frontend)

- [ ] NestJS `RolesGuard` applied to all `/api/admin/…` routes; non-admins → 403
- [ ] Next.js `/admin` route group with layout checking `role=ADMIN`; non-admins redirected to `/`
- [ ] Admin sidebar navigation linking to all future admin sections
- [ ] Admin dashboard page (`/admin`) with placeholder stat cards (wired to real data in STEP-24)

**Acceptance:**
- Non-admin visiting `/admin` → redirect to `/`
- Admin sees layout and sidebar
- USER token on an admin API endpoint → 403

**Tests:** Integration test for the RolesGuard on at least one admin endpoint.

---

### STEP-16 · Admin CRUD — Sports, Competitions, Years, Manufacturers

- [ ] Full CRUD REST under `/api/admin/sports`, `/api/admin/competitions`, `/api/admin/years`, `/api/admin/manufacturers`
- [ ] Slug auto-generated on create; auto-generated conflict → silent suffix; manually set conflict → inline error; slugs updatable on these entities
- [ ] Logo/image URL fields accepted as plain strings (pre-signed upload flow from STEP-12 used by the frontend)
- [ ] Admin frontend pages at `/admin/sports`, `/admin/competitions`, `/admin/years`, `/admin/manufacturers` each with: data table, create form, edit form, delete confirmation

**Acceptance:**
- Duplicate name auto-generates a unique slug silently
- Manual conflicting slug → field-level error blocks save
- Delete removes record from the list
- All four entities fully manageable from the admin UI

**Tests:** Integration tests for slug conflict handling (auto vs. manual) on at least one of these entities.

---

### STEP-17 · Admin CRUD — CardTypes

- [ ] Full CRUD for CardTypes under `/api/admin/card-types`
- [ ] Delete blocked with 409 (and count of affected records) if any CardDefinition references the CardType
- [ ] Delete blocked for `isSystem=true` types even if unused → 403 or 422
- [ ] Admin frontend page at `/admin/card-types`

**Acceptance:**
- System CardTypes cannot be deleted
- CardTypes with linked CardDefinitions → 409 on delete
- Custom unused CardTypes can be deleted

**Tests:** Integration tests for both delete-blocked conditions.

---

### STEP-18 · Admin CRUD — Teams & Players

- [ ] Full CRUD for Teams under `/api/admin/teams`, filterable by `sportId` and `competitionId`
- [ ] Full CRUD for Players under `/api/admin/players`
- [ ] `Player.teamId` must reference a Team whose `sportId` matches `Player.sportId`; violation → 422; admin Player form dynamically filters team dropdown to same sport
- [ ] Changing a Player's `sportId` clears `teamId` if the previously selected team belongs to a different sport
- [ ] Admin frontend pages at `/admin/teams` and `/admin/players` with filter dropdowns

**Acceptance:**
- Player with mismatched sport/team → 422
- Correctly matched sport/team → success
- Team filter on players list narrows results correctly

**Tests:** Integration tests for sport/team mismatch validation.

---

### STEP-19 · Admin CRUD — Series & Sets

- [ ] Full CRUD for Series under `/api/admin/series`; linked to Manufacturer, Sport, Year, Competition
- [ ] Full CRUD for Sets under `/api/admin/sets`; linked to Series
- [ ] Empty Series and Sets visible in admin list with a zero-count warning badge, but hidden from public browse (rule already enforced in STEP-13)
- [ ] Admin frontend pages at `/admin/series` and `/admin/sets`

**Acceptance:**
- Creating a Series with all required FKs succeeds
- Empty Series visible in admin list; absent from public `/api/series` response
- Nested Set management works from the Series detail page

**Tests:** Integration test confirming empty-series hide rule still applies after admin creates an empty series.

---

### STEP-20 · Admin CRUD — CardDefinitions

- [ ] Full CRUD for CardDefinitions under `/api/admin/card-definitions`
- [ ] Slug auto-generated: 0 players → `{cardNumber}-{cardTypeSlug}`; 1 player → `{cardNumber}-{playerSlug}-{cardTypeSlug}`; 2+ players → admin must provide a custom slug (form blocks save if absent)
- [ ] Slug locked (read-only in admin form) once any OwnedCard references this CardDefinition; attempting to change a locked slug → 422; unlocking requires explicit checkbox confirmation
- [ ] When slug changes, a 301 redirect registered from old URL to new URL
- [ ] Photo front/back URLs managed via pre-signed upload flow from STEP-12
- [ ] CardDefinitionPlayer join manageable: add/remove players on a card
- [ ] Admin frontend at `/admin/card-definitions` with filters for set, card type, player, rookieFlag

**Acceptance:**
- Slug editable on a definition with zero OwnedCard references
- Slug edit rejected with 422 once at least one OwnedCard exists (without explicit unlock)
- Players can be added to and removed from a CardDefinition
- Photo URLs saved and displayed

**Tests:** Integration test for the slug-lock rule (before and after an OwnedCard is created).

---

### STEP-21 · Admin CSV Import — Players

- [ ] `POST /api/admin/import/players` — accepts CSV upload; validates each row (required fields, sport/team cross-reference); returns row-level validation report before committing; on confirm: upserts valid rows; invalid rows reported but do not abort the import
- [ ] Admin frontend page at `/admin/import/players` with: file upload → validation preview table → confirm-import button

**Acceptance:**
- Mixed valid/invalid CSV shows a preview with per-row errors
- Confirming the import inserts only valid rows
- Rows with invalid sport/team cross-refs reported as errors
- Re-importing same CSV does not create duplicates (upsert logic)

**Tests:** Unit tests for the row validator covering all validation rules.

---

### STEP-22 · Admin CSV Import — Series/Sets & CardDefinitions

- [ ] `POST /api/admin/import/series-sets` — validates FK refs (manufacturer, sport, year, competition); row-level error report; same preview-then-confirm flow
- [ ] `POST /api/admin/import/card-definitions` — validates set, card type references; row-level error report; same flow
- [ ] Admin frontend pages at `/admin/import/series-sets` and `/admin/import/card-definitions`

**Acceptance:**
- Invalid FK references reported per row
- Re-importing same file is idempotent
- Valid rows inserted only after confirm

**Tests:** Unit tests for both row validators.

---

### STEP-23 · Admin — User Management

- [ ] `GET /api/admin/users` — paginated; search by email/username; filter by role, `isActive`, `isEmailVerified`
- [ ] `GET /api/admin/users/:id` — full user detail
- [ ] `PATCH /api/admin/users/:id/deactivate` — sets `isActive=false`, sets all user's `isPublic=true` collections to `isPublic=false` in the same DB transaction, increments `tokenVersion` (invalidates all active JWTs); does not delete data
- [ ] `PATCH /api/admin/users/:id/activate` — re-enables the user; collections do not revert to public automatically
- [ ] Admin frontend page at `/admin/users`

**Acceptance:**
- Deactivation immediately invalidates JWT via tokenVersion bump
- Deactivated user's public collections become private (same transaction)
- User data preserved after deactivation
- Reactivated user must log in again to get a new token

**Tests:** Integration test for the tokenVersion increment and the public-to-private collection flip on deactivation.

---

### STEP-24 · Admin — Dashboard Stats & Health Check

- [ ] `GET /api/admin/stats` — counts: total users, total OwnedCards, total CardDefinitions, total Collections, new registrations (last 7 days)
- [ ] `GET /api/admin/health` — status of: DB connection, S3/R2 connectivity, BullMQ connectivity, Resend connectivity; overall status
- [ ] Admin dashboard at `/admin` wired to real stats (replacing placeholders from STEP-15)
- [ ] Admin health check page at `/admin/health` with pass/fail indicator per service; auto-refreshes every 60s; manual re-run button

**Acceptance:**
- Dashboard displays correct counts from DB
- Health check shows green for all services when everything is running
- Health check shows degraded/red for a service when it is intentionally taken offline (manual test)

**Tests:** Unit test the health check aggregation logic; integration test the stats endpoint for correct counting.

---

## Phase 4 — User Features

### STEP-25 · Auth UI — Register & Email Verification

- [ ] `/register` page with form: email, username, password, confirmation; client-side and server-side validation feedback
- [ ] On success → redirect to a "check your email" confirmation page
- [ ] `/verify-email?token=…` route calling the backend; success or error state
- [ ] Resend verification email link on the confirmation page
- [ ] All user-facing strings present in both `en.json` and `cs.json`

**Acceptance:**
- Submitting the form creates a user and sends the verification email
- Valid verification link marks the user verified and shows success UI
- Expired/invalid token shows an error
- All strings present in both locale files

**Tests:** End-to-end test for the full register-then-verify flow using a test email transport.

---

### STEP-26 · Auth UI — Login & Logout

- [ ] `/login` page with email + password form and error handling
- [ ] On success: access token stored in memory (not localStorage); redirect to `/dashboard`
- [ ] Silent token refresh via HttpOnly cookie on 401 (interceptor in the API client)
- [ ] Logout button in the navigation header; calls logout endpoint, clears state, redirects to `/`
- [ ] Route protection: `/dashboard`, `/collection`, `/cards`, `/settings` redirect to `/login` if unauthenticated

**Acceptance:**
- Login redirects to `/dashboard`
- Token refreshed transparently after 15 min (no re-login prompt)
- Logout clears state and redirects to `/`
- Unauthenticated visit to protected route → redirect to `/login`

**Tests:** Integration test for the silent token refresh interceptor.

---

### STEP-27 · Auth UI — Password Reset

- [ ] `/forgot-password` — email input; always shows "if this email exists, you'll receive a link" after submission (no enumeration)
- [ ] `/reset-password?token=…` — new password + confirmation fields
- [ ] Success state redirects to `/login` with a success message

**Acceptance:**
- Existing email → reset email sent
- Non-existent email → same success message
- Valid reset link allows setting a new password
- Consumed reset link → error state

**Tests:** Backend covered in STEP-08; UI smoke test is sufficient here.

---

### STEP-28 · User Dashboard & My Cards Page

- [ ] `/dashboard` — summary stats (total owned cards, total collections), recently added cards (last 5), quick-add card entry point
- [ ] `/cards` — full owned-card list, pagination, sort controls (name, added date), search bar
- [ ] Card list item: card name, set name, grade (if set), thumbnail with photo fallback, action buttons (edit, delete, add to collection)

**Acceptance:**
- Dashboard shows correct counts and recently added cards
- `/cards` lists all owned cards for the authenticated user with correct pagination
- Search narrows results; sort changes order
- Photo fallback logic applied (OwnedCard photo → CardDefinition photo → none)

**Tests:** UI integration test for pagination and search against the real API.

---

### STEP-29 · Add Card to Collection (OwnedCard Create Flow)

- [ ] Step 1: search and select a CardDefinition from the catalogue
- [ ] Step 2: fill optional fields — limitation, gradeValue, gradingCompany, notes
- [ ] Step 3: optionally upload front/back photos using the pre-signed URL flow
- [ ] On submit: creates OwnedCard and adds it to the "All" collection
- [ ] Optional: select additional collections to add to immediately
- [ ] Duplicate OwnedCard: if user already owns a copy of this CardDefinition, show a confirmation prompt before creating the record ("You already own N copies — add another?")

**Acceptance:**
- Searching returns catalogue results
- Both gradeValue and gradingCompany set (or both empty) → success
- Only one grade field set → validation error
- New card appears in "All" and any additionally selected collections
- Photo upload end-to-end works

**Tests:** End-to-end test for the full add-card flow including grade validation.

---

### STEP-30 · Edit & Delete Owned Card

- [ ] Edit form accessible from card list and card detail: limitation, gradeValue, gradingCompany, notes, photoFrontUrl, photoBackUrl
- [ ] Photo replacement: new upload → old photo URL queued for S3/R2 deletion via BullMQ
- [ ] Delete confirmation modal; optimistic UI update on confirm (card disappears immediately)
- [ ] Grade nullability rule enforced in the edit form

**Acceptance:**
- Editing any field persists correctly
- Replacing a photo enqueues the old photo for deletion (verify via BullMQ job)
- Deleting a card removes it from all collections in the UI
- Grade nullability rule enforced in edit form

**Tests:** Integration test: deleting an OwnedCard removes all CollectionCard rows and the BullMQ delete job is enqueued.

---

### STEP-31 · Collections UI (Create, Edit, Delete, Manage Cards)

- [ ] `/collection` — all collections with card counts and cover images
- [ ] `/collection/:slug` — cards in that collection with sort/search controls (same as `/cards`)
- [ ] Create collection modal: name, optional cover image upload
- [ ] Edit collection page: name, cover image, public/private toggle
- [ ] Delete collection confirmation (shows how many cards will be removed from the collection, not deleted)
- [ ] Add/remove card from collection via card context menu

**Acceptance:**
- "All" collection appears in the list but has no edit or delete controls
- Creating a new collection generates the correct slug
- Making a collection public enables it to appear on the public profile
- Removing a card from a non-"All" collection does not delete the OwnedCard

**Tests:** Integration test for the public/private visibility rule on the public collections API.

---

### STEP-32 · User Settings Page

- [ ] `/settings` with sections: avatar upload (pre-signed URL flow), read-only username display (with note it cannot be changed), change password form (requires current password, new password, confirmation)
- [ ] `PATCH /api/users/me/password` — validates current password, updates `passwordHash`, increments `tokenVersion`

**Acceptance:**
- Avatar upload updates the avatar URL in the profile
- Username field is read-only; no username edit field exposed
- Wrong current password → 400
- Successful password change invalidates existing sessions (tokenVersion bump)

**Tests:** Integration test for the password change tokenVersion invalidation.

---

### STEP-33 · Public Profile & Public Collections Pages

- [ ] `/profile/:username` — avatar, username, list of public collections with card counts
- [ ] `/profile/:username/collection/:slug` — read-only card browse with photo fallback (no add/edit/delete controls)
- [ ] Deactivated user → 404 (not 403, to avoid confirming account existence)
- [ ] Private collection accessed by non-owner or unauthenticated user → 404 (not 403)
- [ ] Active user with no public collections → 200 with empty-state page

**Acceptance:**
- Active user with public collections shows correct data
- Deactivated user profile → 404
- Private collection URL → 404
- Photo fallback applied (OwnedCard → CardDefinition → none)

**Tests:** Integration tests for the deactivation and private collection 404 rules.

---

## Phase 5 — Public Browse

### STEP-34 · Public Card Catalogue Browse Page

- [ ] `/cards` public browse page (no auth required; distinct view from the authenticated owner page)
- [ ] Faceted filter sidebar: Sport, Competition, Year, Series, Set, CardType, Rookie flag
- [ ] Search bar (card name and card number)
- [ ] Sort controls: name, card number; pagination
- [ ] Filter state reflected in URL query string (shareable links)
- [ ] Empty sets and series absent from filter dropdowns

**Acceptance:**
- Browsing `/cards` without logging in shows the full public catalogue
- Applying filters narrows the result set
- Sharing a URL with filter params restores the filter state on load
- Empty sets/series absent from filter dropdowns

**Tests:** UI integration test for URL-driven filter state.

---

### STEP-35 · Public Card Detail Page

- [ ] `/{sportSlug}/{competitionSlug}/{yearSlug}/{seriesSlug}/{setSlug}/{cardSlug}` — full card definition detail: name, card number, card type, players (linked to player pages), rookieFlag, front/back photos, set and series info
- [ ] Breadcrumb navigation reflecting the full URL hierarchy
- [ ] "Add to my collection" CTA for authenticated users (links to add-card flow pre-filled with this CardDefinition)
- [ ] Login prompt for unauthenticated users instead of the CTA

**Acceptance:**
- Full slug URL renders the correct card
- All breadcrumb segments correct and navigable
- Authenticated user sees Add CTA; unauthenticated user sees login prompt
- CardDefinition photos displayed (user-specific OwnedCard photos not shown on public pages)

**Tests:** Manual URL routing verification; no new automated tests needed.

---

## Phase 6 — Export

### STEP-36 · CSV Export (Sync & Async)

- [ ] `POST /api/exports` — authenticated; ≤500 owned cards: streams CSV directly; >500: creates BullMQ job, returns `202 { jobId, statusUrl }`
- [ ] `GET /api/exports/:jobId` — polling endpoint returning status (`pending` / `processing` / `complete` / `failed`) and, when complete, a pre-signed S3/R2 download URL (expires after 24 hours)
- [ ] CSV fields: card name, set, series, sport, grade, limitation, notes, added date
- [ ] Frontend: export button on `/cards` and `/collection/:slug`; async flow shows progress indicator and polls for completion

**Acceptance:**
- ≤500 cards → immediate CSV download
- >500 cards → `202` with jobId; polling eventually returns a download URL
- Download URL expires (manual verification)
- CSV importable by Excel / Google Sheets

**Tests:** Integration tests for the sync threshold boundary (exactly 500 vs. 501 cards) and the job status lifecycle.

---

## Phase 7 — Polish

### STEP-37 · Global Error Handling, Loading States & Empty States

- [ ] Next.js global error boundary catching unexpected errors → user-friendly error page (no white screens)
- [ ] Loading skeletons for all list and detail pages (not just spinners)
- [ ] Empty state messages for: empty collection, no search results, no owned cards yet
- [ ] 404 page for unresolved routes
- [ ] All new strings added to both `en.json` and `cs.json`

**Acceptance:**
- Unresolved route → 404 page
- Simulated API error → error boundary page
- All three empty states render correctly
- Locale key sync check passes

**Tests:** Visual regression check; no new automated tests required.

---

### STEP-38 · Accessibility & Responsive Layout Audit

- [ ] Semantic HTML audit across all pages (heading hierarchy, landmark regions, form label associations)
- [ ] Keyboard navigation verified for all interactive elements (forms, modals, dropdowns, pagination)
- [ ] Focus management in modals: focus trap active while modal is open, focus returns to trigger on close
- [ ] Color contrast verified against WCAG AA on all primary text and interactive elements
- [ ] Responsive breakpoints verified: 375px (mobile), 768px (tablet), 1280px (desktop) — no horizontal overflow at any breakpoint

**Acceptance:**
- All interactive elements reachable and operable by keyboard alone
- No WCAG AA contrast failures on primary text and interactive elements
- No horizontal overflow on the three target breakpoints
- All forms have correct label associations

**Tests:** axe-core automated accessibility scan integrated into CI to catch regressions.

---

### STEP-39 · Performance — Image Optimisation & API Response Caching

- [ ] `next/image` used for all card and avatar images with correct `sizes` attributes
- [ ] Public read-only API endpoints given `Cache-Control: public, max-age=60`
- [ ] Authenticated endpoints set `Cache-Control: no-store`
- [ ] LCP verified below 2.5s on the public card detail page with a cold cache (Lighthouse or WebPageTest)

**Acceptance:**
- All images use `next/image` or have explicit width/height (no layout shift)
- Network tab shows correct cache headers on public and authenticated endpoints
- LCP below 2.5s on card detail page

**Tests:** Lighthouse CI check added to the pipeline with LCP and CLS budget thresholds.

---

### STEP-40 · Environment Parity, CI Pipeline & Production Readiness

- [ ] CI pipeline (GitHub Actions or equivalent) running on every PR: lint, type-check, unit tests, integration tests, locale key sync check, Lighthouse budget check
- [ ] Multi-stage Dockerfiles for both `apps/api` and `apps/web`
- [ ] Docker Compose for local development: Postgres, Redis (BullMQ), MinIO (S3 substitute)
- [ ] Production startup uses `prisma migrate deploy` (not `prisma migrate dev`)
- [ ] All required env vars documented in `.env.example`; app fails fast with a descriptive error if any required var is missing

**Acceptance:**
- CI passes on a clean checkout with no pre-installed dependencies
- `docker compose up` starts the full local stack and both apps are functional
- Production Docker images build successfully
- Starting without a required env var prints a clear error and exits non-zero

**Tests:** The CI pipeline itself is the test artifact; ensure no step is skipped on PRs.

---

## Summary

| Phase | Steps | Scope |
|---|---|---|
| 1 — Foundation | 01–06 | Monorepo, schema, seed, NestJS bootstrap, slug utility, Next.js + i18n |
| 2 — Backend Core | 07–14 | Auth, users, collections, owned cards, uploads, reference data, catalogue API |
| 3 — Admin Panel | 15–24 | Auth guard, entity CRUD (10 types), CSV import (3 flows), user management, stats/health |
| 4 — User Features | 25–33 | Auth UI, dashboard, add/edit/delete card, collections UI, settings, public profile |
| 5 — Public Browse | 34–35 | Catalogue browse with URL-driven filters, card detail with full slug routing |
| 6 — Export | 36 | Sync CSV (≤500 cards) and async CSV with BullMQ + pre-signed download URL |
| 7 — Polish | 37–40 | Error/loading/empty states, accessibility, performance, CI + Docker production readiness |

## Critical Files

These are the highest-leverage files — their contracts shape everything else:

| File | Why it matters |
|---|---|
| `apps/api/prisma/schema.prisma` | Defines all 15 entities, relations, and indexes — every migration and service layer depends on it |
| `apps/api/src/auth/auth.module.ts` | JWT strategy, refresh token table, guards, and the `EMAIL_NOT_VERIFIED` 403 guard cutting across every write endpoint |
| `apps/api/src/common/interceptors/response.interceptor.ts` | Global response envelope — all frontend API clients are written against the contract it establishes |
| `apps/web/messages/en.json` | Canonical locale file; cs.json sync check is gated on its key set |
| `apps/api/src/owned-cards/owned-cards.service.ts` | Most rule-dense service: grade nullability, limitation trimming, "All" collection auto-assignment, cascade delete, BullMQ enqueue |
