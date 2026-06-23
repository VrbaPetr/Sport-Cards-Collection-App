# Sport Cards Collector App — Edge Cases

This document catalogues edge cases identified across five domains of the application spec. Each case includes an impact rating and a suggested handling strategy. Use this as a reference when building out each feature to ensure corner cases are handled before they reach production.

---

## Quick Reference

| ID | Title | Category | Impact |
|----|-------|----------|--------|
| EC-001 | CardDefinition deleted while OwnedCards reference it | Business Logic | CRITICAL |
| EC-003 | 'All' collection deleted directly in the database | Business Logic | CRITICAL |
| HF-004 | CSV bulk import references a Set by mistyped name — cards land in wrong Set or fail silently | Human Factor | CRITICAL |
| HF-010 | Year label '2023/24' contains a URL-unsafe forward slash, corrupting the slug | Human Factor | CRITICAL |
| HF-012 | Admin deletes a seeded CardType (e.g. 'Base') — many CardDefinitions reference an invalid FK | Human Factor | CRITICAL |
| HF-017 | Username chosen matches a reserved route segment ('admin', 'api', 'profile', 'login') | Human Factor | CRITICAL |
| AUTH-013 | ADMIN_EMAIL seed — re-running the seed script after the admin password has been changed in production | Auth & Accounts | CRITICAL |
| API-INFRA-015 | Wrong DATABASE_URL causes app to boot successfully but all requests return 500 | API & Infra | CRITICAL |
| DB-01 | Deleting CardDefinition with existing OwnedCards | DB Integrity | CRITICAL |
| DB-02 | Deleting a Set that still contains CardDefinitions | DB Integrity | CRITICAL |
| DB-03 | Deleting a Series that still has Sets | DB Integrity | CRITICAL |
| DB-04 | Deleting a Competition referenced by Series (required FK) | DB Integrity | CRITICAL |
| DB-05 | Deleting a Sport that anchors Competitions, Teams, Players, and Series | DB Integrity | CRITICAL |
| DB-11 | All collection sync breaks during bulk CSV import | DB Integrity | CRITICAL |
| DB-21 | Partial Prisma migration state leaves schema inconsistent | DB Integrity | CRITICAL |
| EC-002 | CardDefinition slug changed after OwnedCards exist — card page URL breaks | Business Logic | HIGH |
| EC-005 | Multi-player card slug: admin forgets to set custom slug | Business Logic | HIGH |
| EC-006 | No-player card slug produces malformed string | Business Logic | HIGH |
| EC-010 | Public collection remains accessible when user is deactivated | Business Logic | HIGH |
| EC-014 | CSV export of 10,000+ cards — synchronous response timeout risk | Business Logic | HIGH |
| HF-003 | Inconsistent card numbering within a Set (007 vs 7 vs 7A) | Human Factor | HIGH |
| HF-005 | User adds the same CardDefinition twice — duplicate OwnedCard records | Human Factor | HIGH |
| HF-006 | Admin or user manually enters a slug with uppercase letters or spaces | Human Factor | HIGH |
| HF-014 | User uploads a 50 MB image via pre-signed S3/R2 URL — no file size limit in spec | Human Factor | HIGH |
| HF-016 | User with 5,000+ cards views the 'All' collection — performance and pagination undefined | Human Factor | HIGH |
| AUTH-002 | Password reset token expiry — user clicks old link after already resetting | Auth & Accounts | HIGH |
| AUTH-003 | Password reset token reuse — two simultaneous reset requests, user uses the first link | Auth & Accounts | HIGH |
| AUTH-005 | JWT expiry during a mid-action form submission (e.g. large CSV import or multi-field form) | Auth & Accounts | HIGH |
| AUTH-006 | Admin deactivates a currently logged-in user — JWT remains valid until expiry | Auth & Accounts | HIGH |
| AUTH-010 | Admin role granted or revoked while user has an active session | Auth & Accounts | HIGH |
| AUTH-014 | JWT secret rotation — all active user sessions are simultaneously invalidated | Auth & Accounts | HIGH |
| API-INFRA-001 | Pre-signed URL expires before upload completes | API & Infra | HIGH |
| API-INFRA-002 | Storage upload succeeds but DB record save fails — orphaned file | API & Infra | HIGH |
| API-INFRA-003 | DB save succeeds but storage upload fails — broken image URL | API & Infra | HIGH |
| API-INFRA-005 | CSV import references non-existent Manufacturer, Sport, or Year | API & Infra | HIGH |
| API-INFRA-006 | CSV import with 10,000 rows causes timeout during dry-run validation | API & Infra | HIGH |
| API-INFRA-007 | Two admins import the same CSV simultaneously — duplicate records | API & Infra | HIGH |
| API-INFRA-010 | API pagination: limit=0 or limit=-1 causes unexpected DB behavior | API & Infra | HIGH |
| API-INFRA-013 | Resend API rate limit or outage causes silent registration or password-reset failure | API & Infra | HIGH |
| API-INFRA-014 | NEXT_PUBLIC_API_URL misconfigured — frontend silently hits wrong backend | API & Infra | HIGH |
| API-INFRA-016 | Missing S3_ENDPOINT env var breaks R2 but not pure AWS deployments — silent misconfiguration | API & Infra | HIGH |
| DB-06 | Deleting a Year when Series reference it | DB Integrity | HIGH |
| DB-07 | Deleting a Manufacturer when Series reference it | DB Integrity | HIGH |
| DB-08 | Deleting a Player referenced by CardDefinitionPlayer | DB Integrity | HIGH |
| DB-09 | Deleting a CardType referenced by CardDefinitions | DB Integrity | HIGH |
| DB-12 | All collection row deleted directly without deleting the OwnedCard | DB Integrity | HIGH |
| DB-13 | All collection itself deleted or renamed via direct DB manipulation or API bypass | DB Integrity | HIGH |
| DB-15 | Slug uniqueness race condition under concurrent saves | DB Integrity | HIGH |
| DB-17 | CardDefinition slug derivation failure for multi-player or no-player cards | DB Integrity | HIGH |
| DB-20 | Database connection pool exhaustion during CSV bulk import | DB Integrity | HIGH |
| DB-22 | User deactivation leaves JWT tokens valid, allowing continued DB writes | DB Integrity | HIGH |
| DB-23 | Collection slug uniqueness per user not enforced at DB level | DB Integrity | HIGH |
| DB-24 | Series slug uniqueness scope is competition+year, not series table-wide | DB Integrity | HIGH |
| DB-25 | Renaming a CardType or Player slug invalidates all derived CardDefinition slugs and URLs | DB Integrity | HIGH |
| EC-004 | User adds the same CardDefinition twice — duplicate OwnedCard allowed | Business Logic | MEDIUM |
| EC-007 | rookieFlag remains set after cardType is changed to a non-rookie type | Business Logic | MEDIUM |
| EC-008 | Pre-signed S3/R2 URL expires — image fallback chain silently breaks | Business Logic | MEDIUM |
| EC-009 | OwnedCard deleted — uploaded photo left as orphaned S3 object | Business Logic | MEDIUM |
| EC-011 | Deleting a custom collection with many cards — UX implies card loss | Business Logic | MEDIUM |
| EC-012 | Concurrent edits to the same OwnedCard from two browser tabs — last write wins silently | Business Logic | MEDIUM |
| EC-013 | Limitation field: '1/1' vs '01/01' — no normalization, filter fragmentation | Business Logic | MEDIUM |
| HF-001 | Series created with no Sets — appears in browse with empty content | Human Factor | MEDIUM |
| HF-002 | Set created with no CardDefinitions — Set page is empty | Human Factor | MEDIUM |
| HF-007 | Player's teamId set to a team from a different sport | Human Factor | MEDIUM |
| HF-008 | Two Competitions with near-identical names cause browse confusion | Human Factor | MEDIUM |
| HF-009 | Long player names with special characters break slug generation | Human Factor | MEDIUM |
| HF-013 | Public collection URL shared externally — collection later made private — unclear response behavior | Human Factor | MEDIUM |
| HF-015 | Admin incorrectly sets rookieFlag=true — no audit log to detect or revert the error | Human Factor | MEDIUM |
| AUTH-001 | Duplicate email registration — error response handling | Auth & Accounts | MEDIUM |
| AUTH-004 | Email verification — unverified user login and card-adding capabilities | Auth & Accounts | MEDIUM |
| AUTH-007 | User changes their email — JWT validity and re-verification requirement | Auth & Accounts | MEDIUM |
| AUTH-008 | Username uniqueness race condition — two users register simultaneously with same username | Auth & Accounts | MEDIUM |
| AUTH-009 | Username change breaks all existing /profile/{oldUsername} URLs | Auth & Accounts | MEDIUM |
| AUTH-012 | Deactivated user's public profile accessibility | Auth & Accounts | MEDIUM |
| API-INFRA-004 | Health check endpoint leaks environment or version info | API & Infra | MEDIUM |
| API-INFRA-008 | CSV encoding issues — Windows-1252 special characters in player names | API & Infra | MEDIUM |
| API-INFRA-011 | Concurrent slug auto-suffix race condition — two requests both receive -2 | API & Infra | MEDIUM |
| API-INFRA-012 | next-intl: cs locale file missing keys causes raw key strings in UI | API & Infra | MEDIUM |
| DB-10 | Team deletion when Players reference it via nullable teamId | DB Integrity | MEDIUM |
| DB-14 | gradeValue/gradingCompany paired-null constraint not enforced at DB level | DB Integrity | MEDIUM |
| DB-16 | Slug conflict between auto-suffix and a manually-set slug | DB Integrity | MEDIUM |
| DB-18 | Composite PK violation in CollectionCard during concurrent add-to-collection requests | DB Integrity | MEDIUM |
| DB-19 | Deleting OwnedCard cascade does not clean up S3/R2 image objects | DB Integrity | MEDIUM |
| EC-015 | Collection rename creates slug collision with existing collection | Business Logic | LOW |
| HF-011 | User sets limitation to '1/1' but CardDefinition has no server-enforced limitation — source of truth ambiguous | Human Factor | LOW |
| AUTH-011 | Public profile with all collections private — 404 vs empty state | Auth & Accounts | LOW |
| API-INFRA-009 | API pagination: requesting a page beyond total record count returns unexpected result | API & Infra | LOW |

---

## Data Integrity & Database

### DB-01 — Deleting CardDefinition with existing OwnedCards

**Impact:** Critical

**Description:** If an admin deletes a CardDefinition that has one or more OwnedCards referencing it, a naive CASCADE DELETE would silently destroy user-owned property data. The spec does not explicitly define the cascade behavior here. Users could lose OwnedCards (and their grades, notes, images) without warning, and those deletions would also cascade into CollectionCard rows, altering every collection that contained those cards.

**Suggested handling:** Block deletion at the API and DB level (RESTRICT FK) if any OwnedCard references the CardDefinition. Return a 409 Conflict with a count of affected OwnedCards. Provide an admin workflow to reassign or archive OwnedCards before deletion is permitted. Never use CASCADE here.

---

### DB-02 — Deleting a Set that still contains CardDefinitions

**Impact:** Critical

**Description:** If a Set is deleted while CardDefinitions reference it via setId, a CASCADE would destroy all those card definitions and transitively all OwnedCards referencing them. A RESTRICT would surface an opaque FK violation. Neither outcome is safe without an explicit admin acknowledgment.

**Suggested handling:** Enforce RESTRICT on the Set FK in Prisma schema. The API must check for child CardDefinitions before deletion, return a 409 with the count, and require the admin to first reassign or delete all CardDefinitions. Provide a bulk-reassign endpoint.

---

### DB-03 — Deleting a Series that still has Sets

**Impact:** Critical

**Description:** Series deletion with child Sets present triggers the same cascading risk as DB-02. Because Set slugs are unique within-series, reassigning Sets to another Series could also introduce slug collisions.

**Suggested handling:** RESTRICT FK from Set.seriesId to Series. API returns 409 if Sets exist. If a bulk-move workflow is added, slug uniqueness must be re-validated in the destination series before the move is committed.

---

### DB-04 — Deleting a Competition referenced by Series (required FK)

**Impact:** Critical

**Description:** Competition is a required FK on Series. Deleting a Competition while Series reference it would either cascade-delete the entire catalog hierarchy (Series -> Sets -> CardDefinitions -> OwnedCards) or raise a DB-level constraint error. This is catastrophic if triggered accidentally.

**Suggested handling:** Enforce RESTRICT. The API must count all dependent Series (and their downstream objects) and surface that count to the admin before allowing deletion. Consider a soft-delete/archive pattern for Competitions to avoid permanent data loss.

---

### DB-05 — Deleting a Sport that anchors Competitions, Teams, Players, and Series

**Impact:** Critical

**Description:** Sport is referenced by Competition (with its own cascade chain), Team, Player, and Series. A single Sport deletion could trigger a mass wipe of enormous amounts of interconnected data. The cascades compose multiplicatively.

**Suggested handling:** RESTRICT all FKs pointing to Sport. The deletion endpoint must enumerate all first-level dependents (Competition count, Team count, Player count, Series count) and require explicit admin confirmation. A soft-delete approach is strongly preferred.

---

### DB-11 — All collection sync breaks during bulk CSV import

**Impact:** Critical

**Description:** The spec states the All collection must automatically contain every OwnedCard. During a bulk CSV import that creates many OwnedCards in a single transaction or across parallel transactions, the mechanism that inserts CollectionCard rows for the All collection may fail partway through (DB error, connection drop, timeout). This leaves the All collection missing some cards — a silent data integrity violation that users discover only when they notice their card count is wrong.

**Suggested handling:** Implement All-collection sync as a DB trigger or within the same atomic transaction as OwnedCard creation. Never rely on application-level post-processing. For the CSV import flow, wrap each row's OwnedCard insert + CollectionCard insert in a single transaction. Add a periodic reconciliation job that detects and repairs All-collection gaps.

---

### DB-21 — Partial Prisma migration state leaves schema inconsistent

**Impact:** Critical

**Description:** If a Prisma migration runs and fails midway (e.g., adding a NOT NULL column with no default on a large table, a network drop, or a statement timeout), the _prisma_migrations table may record a failed migration. Subsequent deployments may refuse to run or apply migrations on a partially-migrated schema, leading to runtime errors where the application schema model does not match the actual DB schema.

**Suggested handling:** Use Prisma's migrate resolve --applied or --rolled-back to mark partial migrations explicitly. Always test migrations on a production-like data volume in staging first. For large tables, use multi-step migrations (add nullable column, backfill, add NOT NULL constraint). Maintain a runbook for manual intervention on failed migrations. Never run migrations directly against production without a backup.

---

### DB-06 — Deleting a Year when Series reference it

**Impact:** High

**Description:** Series.yearId references Year. Year deletion with active Series references would either cascade into Series (and the full chain below) or throw a constraint violation with no useful client-facing error.

**Suggested handling:** Enforce RESTRICT FK. API returns 409 with dependent Series count. Year records should rarely if ever need deletion given they represent calendar years; consider making Year undeletable once any Series references it.

---

### DB-07 — Deleting a Manufacturer when Series reference it

**Impact:** High

**Description:** Series.manufacturerId references Manufacturer. Deleting a Manufacturer while Series exist under it destroys catalog data. This is a less deeply nested cascade than Sport but still affects significant catalog records.

**Suggested handling:** RESTRICT FK. API returns 409 with Series count. Require admin to reassign Series to another Manufacturer before deletion. Provide a bulk-reassign endpoint.

---

### DB-08 — Deleting a Player referenced by CardDefinitionPlayer

**Impact:** High

**Description:** Player deletion while entries exist in the CardDefinitionPlayer join table would remove the player-card association, potentially making multi-player card definitions incomplete or making the derived CardDefinition slug (which encodes playerSlug) stale. If CASCADE is used on the join table, the player-card link disappears silently; if RESTRICT, the deletion fails with a raw DB error.

**Suggested handling:** RESTRICT on CardDefinitionPlayer.playerId FK. API returns 409 listing how many CardDefinitions reference the player. Distinguish between soft-deactivating a player (acceptable) and hard-deleting. If deletion is truly required, require the admin to manually update affected CardDefinition slugs first.

---

### DB-09 — Deleting a CardType referenced by CardDefinitions

**Impact:** High

**Description:** CardDefinition.cardTypeId references CardType. If a CardType is deleted while CardDefinitions use it, either CASCADE removes those card definitions (and all downstream OwnedCards) or RESTRICT surfaces an error. The derived slug pattern '{cardNumber}-{playerSlug}-{cardTypeSlug}' also embeds the type slug, so any slug-based routing would break even if data were preserved via a nullable FK.

**Suggested handling:** RESTRICT FK. API returns 409 with count of dependent CardDefinitions. CardType slugs are embedded in URLs; even a rename must trigger a re-derivation check and potentially a redirect registration for all affected card URLs.

---

### DB-12 — All collection row deleted directly without deleting the OwnedCard

**Impact:** High

**Description:** The CollectionCard table is a join table. If a CollectionCard row for the All collection is deleted directly (e.g., via a bug in the remove-from-collection API that fails to check collection type), the OwnedCard still exists but is absent from All. The spec says All always contains every OwnedCard, so this is an invariant violation.

**Suggested handling:** At the API layer, reject any request to remove a card from the All collection (return 403/422). At the DB layer, consider a partial index or check constraint that prevents CollectionCard deletion where the collection is the default All collection while the OwnedCard still exists. Add an integrity check endpoint for admins.

---

### DB-13 — All collection itself deleted or renamed via direct DB manipulation or API bypass

**Impact:** High

**Description:** The spec says the All collection cannot be deleted or renamed. If the guard exists only at the API layer, a direct DB operation or a future API path could bypass it, setting isDefault=false or deleting the row, breaking the invariant for that user.

**Suggested handling:** Add a DB-level CHECK constraint or trigger that prevents UPDATE of isDefault=false->true on any collection not owned by that user's single designated default, and prevent DELETE of any Collection where isDefault=true. Enforce the same at the API layer with a clear error message.

---

### DB-15 — Slug uniqueness race condition under concurrent saves

**Impact:** High

**Description:** Slug auto-generation reads existing slugs to detect conflicts and appends a suffix (e.g., upper-deck-2). Under concurrent requests, two admins creating similarly-named entities simultaneously can both read zero conflicts, both generate the same base slug, and both attempt to insert it, causing one to hit a unique constraint violation with no user-friendly error.

**Suggested handling:** Rely on the DB unique index as the final arbiter. Wrap slug generation + insert in a serializable transaction or use INSERT ... ON CONFLICT to detect the collision. On constraint violation, retry slug generation with the next available suffix and re-attempt the insert, up to a bounded retry count. Return a clear API error if retries are exhausted.

---

### DB-17 — CardDefinition slug derivation failure for multi-player or no-player cards

**Impact:** High

**Description:** The derived slug pattern '{cardNumber}-{playerSlug}-{cardTypeSlug}' only works for single-player cards. For multi-player or no-player CardDefinitions, the admin must set a custom slug. If the API does not enforce this requirement, a null or empty slug could be inserted, violating the unique constraint within the Set or producing a malformed URL.

**Suggested handling:** At the API layer, if the CardDefinitionPlayer join would result in zero or more than one player after the save, require the slug field to be explicitly provided and non-empty. Block the save with a 422 if slug is absent in these cases. Add a NOT NULL + non-empty check constraint on CardDefinition.slug at the DB level.

---

### DB-20 — Database connection pool exhaustion during CSV bulk import

**Impact:** High

**Description:** CSV bulk import processes many rows, potentially holding DB connections open for the duration of each row's validation or insert transaction. Under a large import (thousands of rows), this can exhaust the Prisma connection pool, causing all other API requests to queue or timeout, resulting in a service-wide degradation.

**Suggested handling:** Process CSV imports asynchronously via a job queue (e.g., BullMQ). Batch inserts using Prisma's createMany with batches of 100-500 rows rather than per-row transactions. Apply a connection pool cap specifically for import workers separate from the web API pool. Implement back-pressure so import jobs yield connections between batches.

---

### DB-22 — User deactivation leaves JWT tokens valid, allowing continued DB writes

**Impact:** High

**Description:** The spec says deactivating a user prevents login but does not delete data. However, if active JWTs are not invalidated on deactivation, a deactivated user's existing token can continue to make API calls, creating OwnedCards, modifying collections, and writing to the DB until the token naturally expires.

**Suggested handling:** Check isActive on every authenticated request (not just login). Store a user version/tokenVersion counter in the DB; embed it in the JWT and reject tokens whose version does not match. Alternatively, maintain a token blocklist (Redis) for immediately-deactivated users.

---

### DB-23 — Collection slug uniqueness per user not enforced at DB level

**Impact:** High

**Description:** Collection slug is unique per user, meaning the uniqueness scope is composite (userId, slug). If only a simple unique index on slug is present (or no DB index at all, relying on application logic), two concurrent inserts for the same user with the same slug will both succeed, violating the invariant and potentially causing URL routing collisions at /profile/{username}/collection/{slug}.

**Suggested handling:** Add a DB-level unique index on (userId, slug) for the Collection table. Handle the constraint violation in the API with a clear 409 or 422 response. Ensure slug auto-suffix logic queries within the user scope, not globally.

---

### DB-24 — Series slug uniqueness scope is competition+year, not series table-wide

**Impact:** High

**Description:** Series slug uniqueness is scoped to (competitionId, yearId). If the DB unique index is only on (seriesId, slug) or on slug alone, slug collisions across different competition+year combinations would be incorrectly blocked, and same competition+year collisions would not be caught. Incorrect index scope causes either false rejections or missed violations.

**Suggested handling:** Add a DB-level unique index on (competitionId, yearId, slug) for the Series table. Slug auto-generation and conflict detection must query within this composite scope. Verify the Prisma schema @@unique directive reflects this composite key.

---

### DB-25 — Renaming a CardType or Player slug invalidates all derived CardDefinition slugs and URLs

**Impact:** High

**Description:** CardDefinition slugs are derived as '{cardNumber}-{playerSlug}-{cardTypeSlug}'. If either playerSlug or the cardTypeSlug changes (e.g., an admin corrects a typo), all CardDefinition slugs that embedded the old slug become stale. Existing URLs in the wild, bookmarks, and search engine indexes will 404. The DB still stores the old derived slug unless it is recomputed.

**Suggested handling:** When a Player or CardType slug changes, identify all affected CardDefinitions and recompute their slugs in a transaction. Register 301 redirects from old slugs to new slugs. Consider storing slug history or canonical IDs in URLs to make slugs more stable. Alert the admin about the downstream impact before confirming a slug change.

---

### DB-10 — Team deletion when Players reference it via nullable teamId

**Impact:** Medium

**Description:** Player.teamId is nullable, so Team deletion should set teamId to NULL on all referencing Players (SET NULL semantics). If the FK is instead set to RESTRICT or CASCADE, either deletions are blocked unnecessarily or player records are destroyed. If SET NULL is applied without updating Player records' derived data, API responses may still cache a stale team reference.

**Suggested handling:** Declare the Prisma relation as onDelete: SetNull for Player.teamId. After Team deletion, ensure any cached or denormalized team references in API responses are invalidated. Log which Player records were affected.

---

### DB-14 — gradeValue/gradingCompany paired-null constraint not enforced at DB level

**Impact:** Medium

**Description:** The spec requires gradeValue and gradingCompany to BOTH be set or BOTH null. If this is only validated in NestJS application code, a direct DB write (migration script, admin SQL, ORM bypass) can create rows with one null and one non-null, producing inconsistent data that the frontend must handle defensively.

**Suggested handling:** Add a PostgreSQL CHECK constraint: CHECK ((gradeValue IS NULL AND gradingCompany IS NULL) OR (gradeValue IS NOT NULL AND gradingCompany IS NOT NULL)). This ensures the invariant regardless of how the row is written. Also enforce at the API DTO validation layer for clear error messages.

---

### DB-16 — Slug conflict between auto-suffix and a manually-set slug

**Impact:** Medium

**Description:** The auto-suffix strategy (upper-deck-2) can generate a slug that collides with an existing manually-set slug (e.g., an admin already created an entity named 'Upper Deck 2'). The suffix logic must query against all existing slugs in scope, including manually-set ones, otherwise the unique constraint will fire unexpectedly.

**Suggested handling:** The slug suffix loop must query the full scope (global or within-parent depending on entity type) for all existing slugs matching the base pattern before settling on a suffix number. Use a DB-level unique constraint as the safety net and handle the constraint error gracefully.

---

### DB-18 — Composite PK violation in CollectionCard during concurrent add-to-collection requests

**Impact:** Medium

**Description:** If a user or automated process (e.g., All-collection sync) sends two concurrent requests to add the same OwnedCard to the same Collection, both may pass application-level duplicate checks before either inserts, resulting in a DB unique/PK constraint violation on (collectionId, ownedCardId).

**Suggested handling:** Use INSERT ... ON CONFLICT DO NOTHING for CollectionCard inserts, making the operation idempotent. Return 200/201 either way. This is especially important for the All-collection sync path which may run concurrently with user-initiated adds.

---

### DB-19 — Deleting OwnedCard cascade does not clean up S3/R2 image objects

**Impact:** Medium

**Description:** OwnedCard has its own photoFrontUrl and photoBackUrl stored in S3/R2. When an OwnedCard is deleted (and CollectionCard rows cascade), the DB records are removed but the S3 objects remain, creating orphaned storage objects that incur cost and potentially expose private images indefinitely.

**Suggested handling:** Before or after DB deletion, enqueue an async job to delete the associated S3/R2 objects. Use a deletion log table to track pending storage deletes so they can be retried if the async job fails. Never rely solely on synchronous S3 deletion in the request path.

---

## Business Logic & Card/Collection Lifecycle

### EC-001 — CardDefinition deleted while OwnedCards reference it

**Impact:** Critical

**Description:** If an admin deletes a CardDefinition that has one or more OwnedCard rows pointing to it, the spec does not define a cascade or block policy. Without an explicit ON DELETE RESTRICT, the FK deletion will either orphan OwnedCard rows (if no FK constraint) or raise a DB error (if FK is enforced without cascade). Either outcome is unhandled in the spec.

**Suggested handling:** Block deletion of any CardDefinition that has at least one associated OwnedCard. Surface an actionable admin error listing the count of affected OwnedCards. If force-delete is ever needed, require an explicit confirmation step and cascade-delete all OwnedCards (and their CollectionCard rows) with a clear warning.

---

### EC-003 — 'All' collection deleted directly in the database

**Impact:** Critical

**Description:** The spec states the 'All' collection cannot be deleted or renamed via the app, but a DB admin bypassing the application layer can delete it. The spec provides no recovery mechanism or integrity check. Every subsequent attempt to view, add, or sync OwnedCards for that user will fail or produce silent data loss since the automatic sync target no longer exists.

**Suggested handling:** Add a DB-level trigger or CHECK constraint that prevents deletion of any Collection row where isDefault=true. Expose an admin repair endpoint that recreates the 'All' collection for a user and backfills CollectionCard rows from their existing OwnedCards. Include this invariant in the health check.

---

### EC-002 — CardDefinition slug changed after OwnedCards exist — card page URL breaks

**Impact:** High

**Description:** The canonical card URL is /{sportSlug}/{competitionSlug}/{yearSlug}/{seriesSlug}/{setSlug}/{cardSlug}. If an admin edits the CardDefinition slug (or any ancestor slug in the hierarchy), all existing bookmarks, shared links, and search-engine-indexed URLs for that card become 404s. OwnedCards reference the card by cardDefinitionId (PK), so the DB is consistent, but the public-facing URL is not.

**Suggested handling:** Lock the slug permanently once any OwnedCard references the CardDefinition, or implement a slug redirect table that maps old slugs to the current one. At minimum, warn the admin during edit that existing users own cards linked to this definition and that changing the slug will break URLs.

---

### EC-005 — Multi-player card slug: admin forgets to set custom slug

**Impact:** High

**Description:** The auto-generated slug formula is {cardNumber}-{playerSlug}-{cardTypeSlug}, which is only well-defined for single-player cards. For multi-player cards the spec says 'admin must set custom slug', but there is no enforcement. If the admin saves without setting one, the system will either attempt to join multiple playerSlugs (undefined behavior), produce a blank/malformed slug, or throw an unhandled error.

**Suggested handling:** Make the custom slug field required (non-nullable, validated non-empty) whenever a CardDefinition has more than one player in CardDefinitionPlayer or zero players. Block form submission and show an inline validation error: 'A custom slug is required for multi-player or no-player cards.' Auto-generate a placeholder such as {cardNumber}-{cardTypeSlug} to reduce admin friction.

---

### EC-006 — No-player card slug produces malformed string

**Impact:** High

**Description:** Applying {cardNumber}-{playerSlug}-{cardTypeSlug} when playerSlug is absent yields a string like '42--base' (double hyphen) or '42-' (trailing hyphen). Neither is a valid, clean URL slug, and a double hyphen could collide with a legitimately named single-player card slug.

**Suggested handling:** Strip empty slug segments before joining with hyphens, producing {cardNumber}-{cardTypeSlug} for no-player cards. Flag this as a distinct branch in slug generation logic with an explicit unit test. Apply the same custom-slug requirement as EC-005.

---

### EC-010 — Public collection remains accessible when user is deactivated

**Impact:** High

**Description:** The spec states deactivating a user prevents login but does not delete data. A Collection with isPublic=true at the time of deactivation will continue to be served at /profile/{username}/collection/{collectionSlug}. This may violate privacy expectations, expose data of a banned/suspended user, or conflict with content moderation needs.

**Suggested handling:** When a user is deactivated, automatically set all their public Collections to isPublic=false (or block public access at the routing/middleware layer by checking user.isActive before serving profile/collection routes). Provide an admin toggle to restore public visibility if the account is reactivated. Document this behavior explicitly in the user deactivation flow.

---

### EC-014 — CSV export of 10,000+ cards — synchronous response timeout risk

**Impact:** High

**Description:** The spec mentions CSV import with dry-run validation but does not specify the export implementation. A synchronous HTTP response generating a CSV for a user with 10,000+ OwnedCards (with joined CardDefinition, Player, Series, Set data) can exceed typical gateway/load-balancer timeouts (30–60 s), leaving the user with a failed download and no feedback.

**Suggested handling:** Implement CSV export as an async job: accept the request, return HTTP 202 with a job ID, generate the file in the background, upload to S3/R2, and notify the user (in-app or via email with Resend) when the download link is ready. For small collections (under a configurable threshold, e.g., 500 cards), a synchronous streaming response is acceptable. Use Node.js streaming (pipe) rather than buffering the full dataset in memory.

---

### EC-004 — User adds the same CardDefinition twice — duplicate OwnedCard allowed

**Impact:** Medium

**Description:** OwnedCard has (userId, cardDefinitionId) but no unique constraint on that pair is mentioned in the spec. A user legitimately may own two physical copies of the same card (e.g., one raw, one graded), so duplicates are plausibly intentional. However, the spec does not explicitly state this is allowed, leaving room for accidental duplicates and no UI affordance to distinguish copies.

**Suggested handling:** Explicitly document that duplicate OwnedCards per CardDefinition are intentional (collectors own multiple copies). Add a UI disambiguation mechanism (e.g., display index 'Copy 1 / Copy 2', or show grade/limitation as subtitle) so users can tell copies apart. Optionally warn the user on add: 'You already own 1 copy of this card — add another?'

---

### EC-007 — rookieFlag remains set after cardType is changed to a non-rookie type

**Impact:** Medium

**Description:** rookieFlag is a boolean on CardDefinition, independent of cardType. An admin can set rookieFlag=true and later change the cardType to something semantically incompatible (e.g., 'Autograph', 'Patch'). The flag persists silently, potentially surfacing the card in 'Rookie' filters incorrectly. There is no validation tying rookieFlag to an allowed set of cardTypes.

**Suggested handling:** Either (a) warn the admin when saving a CardDefinition with rookieFlag=true and a cardType that is not in a configured 'rookie-compatible' list, or (b) treat rookieFlag as purely informational and document that it is admin-responsibility to maintain. At minimum, display rookieFlag and cardType together in the admin edit form so the combination is visually obvious.

---

### EC-008 — Pre-signed S3/R2 URL expires — image fallback chain silently breaks

**Impact:** Medium

**Description:** The spec returns both OwnedCard.photoFrontUrl and CardDefinition.photoFrontUrl to the frontend and resolves the fallback chain there. Pre-signed URLs have a finite TTL. A cached or bookmarked page, or a slow network load, can hit an expired URL. The frontend will silently fall through to 'no image' even if a valid image exists in storage, giving the user the false impression that no image is set.

**Suggested handling:** Serve images via a backend proxy endpoint that generates a fresh pre-signed URL on each request, or use public-read bucket URLs with CDN caching for CardDefinition images (which are not user-private). For OwnedCard images (user-private), generate short-lived pre-signed URLs at page load time and include a TTL hint in the API response so the frontend can re-fetch before expiry. Document the chosen TTL as a configuration constant.

---

### EC-009 — OwnedCard deleted — uploaded photo left as orphaned S3 object

**Impact:** Medium

**Description:** When a user uploads a photo for an OwnedCard and then deletes that OwnedCard, the spec states CollectionCard rows are cascade-deleted but says nothing about the S3/R2 object referenced by OwnedCard.photoFrontUrl or photoBackUrl. The object remains in storage indefinitely, incurring storage cost with no path back to deletion.

**Suggested handling:** On OwnedCard deletion, extract the S3 key(s) from the stored URL(s) and enqueue an async job to delete the corresponding S3/R2 objects. Handle the case where the delete job fails (object already gone, wrong key) without surfacing an error to the user. Similarly handle CardDefinition photo deletion. Add a periodic orphan-cleanup job that reconciles DB URLs against bucket contents.

---

### EC-011 — Deleting a custom collection with many cards — UX implies card loss

**Impact:** Medium

**Description:** Deleting a Collection only removes CollectionCard join rows; the underlying OwnedCards remain intact. However, most users expect that if they 'delete a collection of cards', the cards are gone. The spec does not require any warning copy differentiating 'remove collection' from 'delete the cards'. This leads to user panic ('my cards disappeared') or the reverse misunderstanding ('I can delete this collection safely').

**Suggested handling:** The confirmation dialog for collection deletion must explicitly state: 'This removes the collection but your X cards remain in your All collection and any other collections they belong to.' Never use the word 'delete' without clarifying what is actually deleted. Consider a separate destructive action 'Delete collection AND all its cards' for power users, gated behind a second confirmation.

---

### EC-012 — Concurrent edits to the same OwnedCard from two browser tabs — last write wins silently

**Impact:** Medium

**Description:** A user editing the same OwnedCard in two browser tabs simultaneously will have the second save overwrite the first with no conflict detection. There is no optimistic locking, ETag, or updatedAt version field mentioned in the spec. The user may lose notes, grade information, or photo assignments without any indication.

**Suggested handling:** Include an updatedAt timestamp (or integer version counter) in the OwnedCard API response and require the client to echo it back on PUT/PATCH. If the server-side updatedAt differs from the submitted value, return HTTP 409 Conflict so the frontend can prompt the user to reload and re-apply their changes. This pattern also guards against stale updates from slow network requests.

---

### EC-013 — Limitation field: '1/1' vs '01/01' — no normalization, filter fragmentation

**Impact:** Medium

**Description:** The limitation field is a free-text string with no validation or normalization. A user typing '1/1', '01/01', '1 / 1', or '1/1 ' will produce four distinct values. Any filter or aggregate query on limitation (e.g., 'show all 1/1 cards') will miss non-normalized variants. This is especially problematic for high-value cards like 1/1 where completeness matters.

**Suggested handling:** Either (a) add a structured limitation field with numeric numerator/denominator columns and keep the free-text field as a display override, or (b) normalize on save with a regex that strips spaces and leading zeros (e.g., '45/100' canonical form). At minimum, trim whitespace server-side and document the expected format with a placeholder in the UI input.

---

### EC-015 — Collection rename creates slug collision with existing collection

**Impact:** Low

**Description:** Collection slugs are unique per user. If a user renames Collection A to a name whose auto-generated slug matches Collection B's existing slug, the spec says to show an inline error for manually set slugs but applies auto-suffix for auto-generated ones. During a rename, the slug is auto-generated from the new name, so the system would silently suffix it (e.g., 'favourites-2') rather than informing the user that the name they chose conflicts. The user may not notice the URL diverges from the display name.

**Suggested handling:** When a rename produces a slug that collides with an existing collection slug for the same user, surface a visible (non-blocking) notice: 'This name is similar to your collection Favourites — your URL will be /favourites-2.' Allow the user to either proceed or choose a different name. Do not silently diverge the URL from the user-visible name without acknowledgment.

---

## Authentication, Authorization & User Accounts

### AUTH-013 — ADMIN_EMAIL seed — re-running the seed script after the admin password has been changed in production

**Impact:** Critical

**Description:** The seed script creates an admin user from ADMIN_EMAIL and ADMIN_PASSWORD environment variables. If the deployed admin has changed their password via the app, and the seed script runs again (e.g. on a new deployment or database reset), it will attempt to upsert/recreate the admin with the old environment variable password. This either silently resets the admin password back to the original (a security regression) or fails with a conflict error (breaking deployment).

**Suggested handling:** Make the admin seed script idempotent using upsert-but-skip logic: insert the admin user only if no user with that email exists. Never update the passwordHash if the user already exists. Use Prisma's createIfNotExists pattern (e.g. findUnique + create only if null). Log a warning if the admin user already exists and skip the password update. Document this behavior clearly in deployment runbooks. Never include password-reset logic in seed scripts.

---

### AUTH-002 — Password reset token expiry — user clicks old link after already resetting

**Impact:** High

**Description:** After a successful password reset, the used token must be marked as consumed/invalidated immediately. If the user clicks the same reset link again (e.g. from their email client history), the system must reject it even if the token has not yet expired by time. The spec does not define a PasswordResetToken entity or its lifecycle, leaving this undefined.

**Suggested handling:** Store password reset tokens in a dedicated table with columns: tokenHash, userId, expiresAt, usedAt (nullable). On reset: set usedAt = now(). On link click: reject if usedAt IS NOT NULL with error 'This reset link has already been used. Please request a new one.' Expire tokens after 1 hour (configurable). Return HTTP 410 Gone for used tokens vs 400 for expired to aid debugging.

---

### AUTH-003 — Password reset token reuse — two simultaneous reset requests, user uses the first link

**Impact:** High

**Description:** If a user requests a password reset twice in quick succession, two tokens are issued and two emails are sent. The user receives both emails and uses the first (older) link. The second (newer) token is still valid. After the first reset, the second token remains valid — meaning the account can still be reset by anyone who intercepted that second email. Alternatively, invalidating all previous tokens when a new one is issued means the user's first email link breaks confusingly.

**Suggested handling:** On each new password reset request, invalidate (set usedAt = now()) all existing unused, unexpired tokens for that userId before issuing the new one. This ensures only the most recently issued token is ever valid. The first link becomes invalid as soon as the second request is made. Surface a clear error: 'This reset link is no longer valid. A newer reset was requested — please check your latest email or request a new link.'

---

### AUTH-005 — JWT expiry during a mid-action form submission (e.g. large CSV import or multi-field form)

**Impact:** High

**Description:** If a user's JWT expires while they are filling in a long form or mid-way through a large CSV import dry-run + commit flow, the subsequent API call returns 401. The frontend must handle this gracefully rather than silently discarding the user's work or showing a generic error. The spec does not mention refresh tokens — only a single JWT with JWT_EXPIRES_IN. Without a refresh flow, the user must log in again and loses their in-progress work.

**Suggested handling:** Implement a refresh token flow (short-lived access token + long-lived refresh token stored as an HttpOnly cookie). The API surface already lists a 'refresh' operation under /api/auth. On 401 responses, the frontend should attempt a silent token refresh before propagating the error. For the CSV import flow specifically, persist the dry-run result in the session or as a server-side temporary record so a token refresh does not lose the validation output.

---

### AUTH-006 — Admin deactivates a currently logged-in user — JWT remains valid until expiry

**Impact:** High

**Description:** When an admin deactivates a user (sets isActive = false), the user's existing JWT is still cryptographically valid. The user can continue to make authenticated API requests until the token naturally expires (up to JWT_EXPIRES_IN, e.g. 7 days). The spec states 'deactivating prevents login but does not delete data' but does not address in-flight sessions. This is a significant authorization gap for moderation actions.

**Suggested handling:** On every authenticated request, after JWT signature validation, check the database (or a fast cache like Redis) to verify isActive = true for the resolved userId. Return HTTP 403 with error code ACCOUNT_DEACTIVATED if false. This adds a DB/cache round-trip per request — mitigate with a short TTL token-revocation cache keyed by userId. Alternatively, keep a per-user token version counter; incrementing it on deactivation invalidates all older JWTs.

---

### AUTH-010 — Admin role granted or revoked while user has an active session

**Impact:** High

**Description:** If a user's role is changed from USER to ADMIN (or vice versa) by another admin, the change only takes effect for new logins. The current JWT still encodes the old role claim. A newly promoted admin cannot access /admin endpoints until they log out and back in. More critically, a demoted admin can continue accessing /admin endpoints for the duration of the remaining JWT lifetime.

**Suggested handling:** Do not encode the role in the JWT payload. Instead, on each request to a role-gated endpoint, look up the current role from the database (or a short-TTL cache). This ensures role changes take effect immediately without requiring logout. If role is encoded in the JWT for performance, implement a token version counter that is incremented on role change, forcing re-authentication. Admin endpoint authorization checks must always be the database-authoritative role.

---

### AUTH-014 — JWT secret rotation — all active user sessions are simultaneously invalidated

**Impact:** High

**Description:** The JWT_SECRET is a single environment variable. If it needs to be rotated (security incident, key exposure, infrastructure change), changing JWT_SECRET immediately invalidates every active session for every user across the application — including admin sessions. There is no graceful rotation window. Users are silently logged out with no explanation, and the next request returns 401 with a signature verification failure.

**Suggested handling:** Support a dual-secret rotation strategy: introduce a JWT_SECRET_PREVIOUS environment variable. During a rotation window, the auth middleware validates tokens against both JWT_SECRET (new) and JWT_SECRET_PREVIOUS (old). New tokens are always issued with JWT_SECRET. After JWT_EXPIRES_IN has elapsed, all old tokens have either expired or been refreshed, and JWT_SECRET_PREVIOUS can be removed. This allows zero-downtime key rotation. If a refresh token flow is implemented, refresh tokens can be used to silently re-issue access tokens, masking the rotation from end users entirely.

---

### AUTH-001 — Duplicate email registration — error response handling

**Impact:** Medium

**Description:** When a user attempts to register with an email address that already exists in the database, the API must return a clear error without leaking whether the email is registered (potential user enumeration). The spec defines a { error: { code, message, details } } envelope but does not specify whether the error code should be CONFLICT (409) with a vague message or a validation error that reveals the email is taken. A timing side-channel can also reveal account existence even if the message is generic.

**Suggested handling:** Return HTTP 409 with error code DUPLICATE_EMAIL. Message should be 'An account with this email already exists' — this is acceptable UX for a collector app without high security requirements. Do NOT silently succeed. Log the attempt. Consider rate-limiting registration attempts per IP to limit enumeration attacks.

---

### AUTH-004 — Email verification — unverified user login and card-adding capabilities

**Impact:** Medium

**Description:** The spec mandates email verification on registration but does not define what an unverified user can and cannot do. Can they log in? Can they browse the catalogue? Can they add OwnedCards? This gap means the implementation could block login entirely (friction) or allow full access (defeats the purpose of verification). The spec lists email verification as a required auth flow but provides no access-control rules conditioned on isEmailVerified.

**Suggested handling:** Add isEmailVerified: Boolean (default false) to User. Allow login for unverified users but gate all write operations (add card, create collection, upload images) behind email verification. Return HTTP 403 with error code EMAIL_NOT_VERIFIED and message 'Please verify your email address before performing this action. Check your inbox or request a new verification email.' Allow catalogue browsing and public profile viewing without verification. Provide a resend-verification endpoint.

---

### AUTH-007 — User changes their email — JWT validity and re-verification requirement

**Impact:** Medium

**Description:** The spec does not include an email-change flow, but the User entity has an email field and a settings page is listed. If email change is implemented, the existing JWT encodes the old email (or just userId). A JWT containing the userId remains valid after an email change, but the user's new email is unverified. If the JWT encodes the email claim, a stale token could allow login with the old email claim. Additionally, the new email must be verified before it becomes active.

**Suggested handling:** Encode only userId (not email) in the JWT payload. On email change: (1) store the new email in a pendingEmail field, (2) send verification to the new address, (3) only swap email to pendingEmail once verified, (4) invalidate all existing tokens (increment token version). Until the new email is verified, the old email remains active for login. If email change is out of scope for v1, explicitly mark the email field as immutable after registration.

---

### AUTH-008 — Username uniqueness race condition — two users register simultaneously with same username

**Impact:** Medium

**Description:** If two users submit the registration form at nearly the same moment with the same username, both requests may pass the application-level uniqueness check before either record is written to the database. The result is a duplicate username violating the unique constraint. Without a proper unique index and error handling at the database layer, one request may fail with an unhandled 500 instead of a clean 409.

**Suggested handling:** Enforce a UNIQUE index on users.username at the PostgreSQL level (not just application-level). Wrap the INSERT in a try/catch for Prisma's P2002 (unique constraint violation) error and return HTTP 409 with error code USERNAME_TAKEN and message 'This username is already taken. Please choose a different one.' The same pattern applies to email uniqueness. Do not rely solely on a SELECT-then-INSERT check.

---

### AUTH-009 — Username change breaks all existing /profile/{oldUsername} URLs

**Impact:** Medium

**Description:** The spec uses username directly as the URL slug for public profiles (/profile/{username}) and collection URLs (/profile/{username}/collection/{collectionSlug}). If users can change their username (via /settings), all previously shared or bookmarked links become 404s. There is no redirect mechanism described. The spec lists a settings page but does not explicitly allow or disallow username changes.

**Suggested handling:** Either (a) make username immutable after registration, surfacing a clear message in the settings UI; or (b) if changes are allowed, store username change history (UsernameHistory table: userId, oldUsername, changedAt) and implement a server-side permanent redirect (308) from /profile/{oldUsername} to /profile/{currentUsername} for the most recent previous username. Warn users explicitly that changing their username will break any links they have previously shared.

---

### AUTH-012 — Deactivated user's public profile accessibility

**Impact:** Medium

**Description:** The spec states deactivating a user prevents login but does not delete data. It is undefined whether a deactivated user's public profile (/profile/{username}) should remain accessible to visitors. If it remains accessible, visitors can browse collections of a banned user. If it returns 404, links shared by that user break, and the username becomes effectively unreachable, which could cause confusion if the account is later reactivated.

**Suggested handling:** Return HTTP 404 (or optionally 410 Gone if permanent) for deactivated user profiles. This prevents public access to a moderated account's content while preserving the data in the database for potential reactivation. When the admin reactivates the user, the profile URL becomes accessible again. Include a comment in the API code noting this behavior so future developers do not accidentally expose deactivated profiles.

---

### AUTH-011 — Public profile with all collections private — 404 vs empty state

**Impact:** Low

**Description:** If a user exists but has set all their collections to isPublic = false (or has no collections at all), visiting /profile/{username} returns a valid user but no visible content. The spec does not define whether this should render an empty-state page (profile exists, nothing to show) or a 404. Returning 404 leaks whether the username exists, which may conflict with privacy expectations. Returning an empty state exposes the username as registered.

**Suggested handling:** Render an empty-state page with the user's username, registration date, and a message like 'This user has no public collections yet.' Do NOT return 404 — the profile exists and is public by design (username is a public URL slug). A 404 would create confusing UX if the user later makes a collection public. Only return 404 if the username does not exist at all or the account is deactivated (see AUTH-012).

---

## API, Integration & Infrastructure

### API-INFRA-015 — Wrong DATABASE_URL causes app to boot successfully but all requests return 500

**Impact:** Critical

**Description:** NestJS with Prisma establishes the DB connection lazily on first query rather than at startup. A typo in DATABASE_URL (wrong host, wrong password, wrong DB name) will pass the startup health check and return HTTP 200, but every actual request will fail with a Prisma connection error, surfacing as a 500. Monitoring that only checks boot-time liveness will miss this.

**Suggested handling:** Perform an eager DB connectivity check at NestJS application startup (e.g. prisma.$queryRaw`SELECT 1`) and exit the process with a non-zero code if it fails. This ensures container orchestrators (Docker, Kubernetes) detect the misconfiguration immediately and do not route traffic to the instance. Include DB reachability as a named check in /admin/health with ok/error status.

---

### API-INFRA-001 — Pre-signed URL expires before upload completes

**Impact:** High

**Description:** The frontend requests a pre-signed S3/R2 URL for direct upload. If the user is slow (large file, slow connection, tab left open), the URL may expire before the PUT request completes. S3/R2 will return a 403 SignatureDoesNotMatch error that the frontend receives but may not handle gracefully, leaving the user with a silent upload failure.

**Suggested handling:** Set pre-signed URL TTL to a generous but bounded value (e.g. 15 minutes). Return the expiry timestamp alongside the URL so the frontend can warn the user or automatically re-request a fresh URL before attempting the upload. On 403 from the storage provider, the frontend should detect expiry specifically and retry the pre-sign flow rather than showing a generic error.

---

### API-INFRA-002 — Storage upload succeeds but DB record save fails — orphaned file

**Impact:** High

**Description:** The client uploads a file directly to S3/R2 via pre-signed URL (succeeds), then calls the API to persist the URL in the DB (fails due to validation error, constraint violation, or transient DB outage). The object now lives in storage forever with no reference, wasting space and potentially leaking private card images.

**Suggested handling:** Use a two-phase approach: (1) issue pre-signed URL with a path that includes a pending/ prefix; (2) after DB save succeeds, issue a server-side S3 CopyObject to the final path (or rename via metadata). If the DB save fails, the pending/ object can be swept by a lifecycle rule that deletes objects older than 24h under that prefix. Alternatively, run a periodic reconciliation job comparing DB-known keys against storage keys and deleting orphans.

---

### API-INFRA-003 — DB save succeeds but storage upload fails — broken image URL

**Impact:** High

**Description:** If the API saves photoFrontUrl or photoBackUrl to the DB before confirming the file is in storage, a subsequent read will return a URL that resolves to a 403 or 404 from S3/R2. This is the inverse of API-INFRA-002 and is arguably worse because the broken URL is actively served to clients.

**Suggested handling:** Never persist a storage URL in the DB until the upload has been confirmed. One pattern: the API generates a key and stores it as null initially; the client uploads and then calls a confirm endpoint; only the confirm endpoint writes the key/URL. Alternatively, perform a HEAD request against the key server-side before committing the URL. Add a nullable uploadConfirmedAt timestamp to distinguish pending from confirmed uploads.

---

### API-INFRA-005 — CSV import references non-existent Manufacturer, Sport, or Year

**Impact:** High

**Description:** A CSV row may reference a Manufacturer, Sport, or Year by name or slug that does not exist in the DB. During dry-run validation, if the lookup returns null and the code does not handle it, the row either silently inserts with a null FK (violating a NOT NULL constraint at commit time) or crashes the import process entirely.

**Suggested handling:** During dry-run, resolve all foreign-key references (Manufacturer, Sport, Year, Competition, CardType, Set, Series) and collect missing-reference errors per row. Return a structured error report listing each row number and the unresolvable reference value. Do not proceed to commit if any reference errors exist. Document in the admin UI that referenced entities must be created before import.

---

### API-INFRA-006 — CSV import with 10,000 rows causes timeout during dry-run validation

**Impact:** High

**Description:** Dry-run validation iterates every row, performs FK lookups, and may do slug uniqueness checks. At 10,000 rows with individual DB queries per row, the total round-trip time will far exceed typical HTTP gateway timeouts (30–60 s), resulting in a 504 or a dropped connection. The admin receives no feedback and may retry, queuing multiple long-running jobs.

**Suggested handling:** Process CSV imports as background jobs. Accept the file via a multipart POST, enqueue a job, and return a 202 Accepted with a job ID. Poll or use SSE/WebSocket to stream progress back to the admin UI. Batch DB lookups (e.g. fetch all slugs for a given set in one query, then validate in memory). Enforce a reasonable row-count cap (e.g. 5,000 rows per file) or paginate imports.

---

### API-INFRA-007 — Two admins import the same CSV simultaneously — duplicate records

**Impact:** High

**Description:** If two admins upload identical (or overlapping) CSV files at the same time, both dry-runs pass (no records exist yet), both proceed to commit, and both inserts race to the DB. Without a unique constraint or advisory lock, duplicate CardDefinitions, Sets, or Series rows are created. Unique constraints will cause one import to fail mid-batch, leaving a partially imported state.

**Suggested handling:** Rely on DB-level unique constraints as the definitive guard. When a constraint violation occurs during commit, the import job should report affected rows with a duplicate error rather than aborting silently. Consider a distributed advisory lock keyed on the CSV content hash to serialize identical file imports. The admin UI should display active import jobs to discourage redundant submissions.

---

### API-INFRA-010 — API pagination: limit=0 or limit=-1 causes unexpected DB behavior

**Impact:** High

**Description:** Passing limit=0 to Prisma's take parameter returns all rows (Prisma interprets 0 as no limit). Passing limit=-1 may throw a Prisma validation error or be misinterpreted. Either case bypasses the stated max limit of 100 and can cause full-table scans that degrade DB performance.

**Suggested handling:** Validate pagination params in a global pipe or guard: reject limit less than 1 with a 400 Bad Request, clamp limit to the range [1, 100]. Similarly reject page less than 1. Return a descriptive error body indicating valid ranges. Apply this validation uniformly to all paginated endpoints.

---

### API-INFRA-013 — Resend API rate limit or outage causes silent registration or password-reset failure

**Impact:** High

**Description:** If Resend is rate-limited (429) or experiencing downtime during user registration or password reset, the API may return a success response to the client (user created, reset initiated) but the email is never sent. The user cannot verify their email or reset their password and has no way to know the email failed.

**Suggested handling:** Treat email delivery as an async, retryable operation: enqueue email jobs with exponential backoff rather than fire-and-forget inline. Return a success response to the client only for the primary operation (account created, reset token stored). Separately, surface email delivery failures to the admin dashboard. Allow users to request a resend of the verification or reset email. Store a resend-cooldown timestamp to prevent abuse.

---

### API-INFRA-014 — NEXT_PUBLIC_API_URL misconfigured — frontend silently hits wrong backend

**Impact:** High

**Description:** NEXT_PUBLIC_API_URL is baked into the Next.js client bundle at build time. If it is set to a staging URL in a production build (or vice versa), all API calls will hit the wrong environment. Because this is a client-side env var, the mismatch will not surface as an obvious server error — it will manifest as authentication failures, missing data, or cross-environment data corruption.

**Suggested handling:** Validate NEXT_PUBLIC_API_URL at build time in next.config.js: throw if it is absent or does not match an expected pattern (e.g. must be https://*). Add a runtime check on app boot that performs a HEAD request to the configured URL and logs a visible warning if unreachable. Include the resolved API base URL in the /admin/health diagnostic panel so misconfigurations are immediately visible to operators.

---

### API-INFRA-016 — Missing S3_ENDPOINT env var breaks R2 but not pure AWS deployments — silent misconfiguration

**Impact:** High

**Description:** Cloudflare R2 requires a custom endpoint URL (account-specific https://<account>.r2.cloudflarestorage.com). AWS S3 does not require S3_ENDPOINT if the SDK resolves it from the region. If the code always passes S3_ENDPOINT to the AWS SDK client and it is undefined (pure AWS deployment), the SDK may silently use undefined as the endpoint, fail with a confusing network error, or attempt to reach a non-existent host. Conversely, if S3_ENDPOINT is absent for R2, all storage operations will fail against the wrong host.

**Suggested handling:** Introduce a STORAGE_PROVIDER env var (aws | r2). At startup, validate that required vars are present for the chosen provider: r2 requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY; aws requires S3_BUCKET, S3_REGION, and credentials. Throw a descriptive startup error listing exactly which variables are missing. Document both configuration sets in the deployment runbook.

---

### API-INFRA-004 — Health check endpoint leaks environment or version info

**Impact:** Medium

**Description:** /api/health is public and unauthenticated. If it returns runtime details such as Node.js version, NestJS version, database host/DSN fragments, internal hostname, memory stats, or connected service names, an attacker can use that fingerprint to target known CVEs or map internal infrastructure.

**Suggested handling:** The public /api/health response should return only a status field (ok/degraded) and optionally a UTC timestamp. All rich diagnostics (DB connectivity, queue depth, version strings, memory, internal service URLs) must be restricted to /admin/health which is protected by admin JWT. Ensure error responses from the health probe never include stack traces or connection strings.

---

### API-INFRA-008 — CSV encoding issues — Windows-1252 special characters in player names

**Impact:** Medium

**Description:** Player names containing accented or special characters (e.g. Novák, Müller, Łukasz) saved in Windows-1252 or Latin-1 encoding will be misread as garbage characters if the importer assumes UTF-8. The corrupted name will be stored in the DB and generate an incorrect slug, breaking search and URLs.

**Suggested handling:** Detect encoding using a library (e.g. chardet/jschardet) and transcode to UTF-8 before parsing. If detection confidence is low, reject the file with an error instructing the admin to re-save as UTF-8. Document the expected encoding in the CSV template download. Validate that resulting slugs contain only safe URL characters after transliteration.

---

### API-INFRA-011 — Concurrent slug auto-suffix race condition — two requests both receive -2

**Impact:** Medium

**Description:** Two simultaneous POST requests for a CardDefinition (or any entity) with the same base name both read the current highest suffix as none, both compute the new slug as upper-deck-2, and both attempt to insert. The second insert hits the unique constraint and fails with an unhandled 500 or an opaque DB error instead of a clean conflict response.

**Suggested handling:** Handle unique constraint violations (Prisma P2002) explicitly: catch the error, increment the suffix, and retry (with a cap on retries, e.g. 5). Alternatively, use a DB-level sequence or SELECT ... FOR UPDATE on the slug namespace to serialize suffix allocation. Ensure the retry loop is bounded to prevent infinite loops on pathological inputs.

---

### API-INFRA-012 — next-intl: cs locale file missing keys causes raw key strings in UI

**Impact:** Medium

**Description:** The cs locale file is not populated in v1. If next-intl falls back to the key string instead of the en value for missing keys, users browsing in Czech will see raw keys like common.save or card.rookieFlag in the UI instead of English text. This is a silent failure — no console error, no build error.

**Suggested handling:** Configure next-intl with a fallback locale of en so that missing cs keys resolve to their English equivalents rather than raw strings. Add a CI lint step (or custom script) that diffs en and cs key sets and fails the build if cs is missing any key present in en. This prevents regressions as new keys are added to en without corresponding cs entries.

---

### API-INFRA-009 — API pagination: requesting a page beyond total record count returns unexpected result

**Impact:** Low

**Description:** When a client requests page=999&limit=100 and only 50 records exist, the expected result is an empty data array with accurate meta (totalCount, totalPages). If the backend blindly passes the offset to Prisma without checking bounds, Prisma will return an empty array which is correct, but if any middleware or cache layer interprets an empty result as an error the client may receive a 404 or 500.

**Suggested handling:** Always return HTTP 200 with { data: [], meta: { page: 999, limit: 100, totalCount: 50, totalPages: 1 } } for out-of-range pages. Never return 404 for an empty page. Document this contract in the API spec so clients know to check meta.totalPages rather than treating an empty array as an error.

---

## Human Factor & UX

### HF-004 — CSV bulk import references a Set by mistyped name — cards land in wrong Set or fail silently

**Impact:** Critical

**Description:** During CSV import the admin references a Set by name. A typo (e.g. 'Prizm 2023' vs 'Prizm 2023 ') means the lookup fails or, if matching is fuzzy, maps to the wrong Set. The dry-run validation produces a row-level error report, but the spec does not define how Set lookup is performed (exact match, case-insensitive, trimmed), leaving room for silent misrouting.

**Suggested handling:** Require Set to be identified by its stable slug (not display name) in CSV, or provide a dropdown Set selector in the import UI. During dry-run, explicitly list the resolved Set name and ID in the validation report so the admin can confirm the match before committing. Reject rows where Set lookup is ambiguous.

---

### HF-010 — Year label '2023/24' contains a URL-unsafe forward slash, corrupting the slug

**Impact:** Critical

**Description:** The Year entity has a `label` field and a globally unique `slug`. An admin entering '2023/24' as the label will trigger slug auto-generation that either includes a literal '/' (breaking the URL path) or silently drops/replaces it in an undocumented way. The URL structure uses yearSlug as a path segment, so a slash in the slug would split the URL into additional path segments.

**Suggested handling:** Add server-side validation rejecting slug generation from labels containing '/'. Translate '/' to '-' during slug generation and display the resulting slug ('2023-24') to the admin before saving. Document the convention (YYYY-YY for split seasons) in the admin UI with an example placeholder.

---

### HF-012 — Admin deletes a seeded CardType (e.g. 'Base') — many CardDefinitions reference an invalid FK

**Impact:** Critical

**Description:** CardDefinition references cardTypeId. If the 'Base' CardType is deleted, all CardDefinitions using it either have a dangling FK (if no DB cascade) or are silently deleted (if cascade delete is configured). The spec does not mention protected/seeded CardTypes or deletion guards.

**Suggested handling:** Block deletion of any CardType that has one or more CardDefinitions referencing it, returning a 409 Conflict with the count of affected records. Mark seeded CardTypes as system-protected in the admin UI with a lock icon. If deletion must be supported, require re-assignment of CardDefinitions to another CardType first.

---

### HF-017 — Username chosen matches a reserved route segment ('admin', 'api', 'profile', 'login')

**Impact:** Critical

**Description:** The spec uses username as the User URL slug at /profile/{username}. If a user registers with username 'admin', their profile URL becomes /profile/admin, which may conflict with the /admin/* route. If the app ever adds a top-level /{username} route, usernames like 'api', 'profile', 'login', 'health', 'register', or 'logout' would shadow application routes entirely. There is no mention of a reserved-username blocklist in the spec.

**Suggested handling:** Maintain a server-side blocklist of reserved usernames that matches all current and anticipated top-level route segments (admin, api, profile, login, logout, register, health, manufacturer, team, player, year, sport, static, etc.). Validate against this blocklist at registration and username-change time, returning a clear error. Store the blocklist in config so it can be extended without a code deploy.

---

### HF-003 — Inconsistent card numbering within a Set (007 vs 7 vs 7A)

**Impact:** High

**Description:** The cardNumber field on CardDefinition is free-text. An admin entering '007', '7', and '7A' in the same Set creates three records that may refer to the same physical card. Sorting by cardNumber will be lexicographic ('007' < '7' < '7A') rather than numeric, producing unexpected browse order. The CardDefinition slug is derived from cardNumber, so duplicates or near-duplicates will also produce confusing slugs.

**Suggested handling:** Document a numbering convention in the admin UI (e.g. no leading zeros, suffix letters allowed). Add a within-Set uniqueness check on cardNumber. Display cardNumber-sort using a natural sort algorithm. Warn admin when a new cardNumber is a numeric duplicate of an existing one after stripping leading zeros.

---

### HF-005 — User adds the same CardDefinition twice — duplicate OwnedCard records

**Impact:** High

**Description:** The spec defines OwnedCard with a userId + cardDefinitionId combination but does not state a unique constraint on this pair. A user who forgets they already own a card can add it again, producing two OwnedCard records for the same CardDefinition. Both records auto-appear in the 'All' collection, inflating counts and confusing the user.

**Suggested handling:** Allow duplicate OwnedCards (collectors legitimately own multiple copies) but surface a clear 'You already own N copies of this card' warning before the user confirms adding another. Provide a 'my copies' count on the CardDefinition detail page so the user can see existing records before adding.

---

### HF-006 — Admin or user manually enters a slug with uppercase letters or spaces

**Impact:** High

**Description:** The spec states slugs are auto-generated from name and 'lock when manually edited.' It does not specify server-side sanitization of manually entered slugs. An admin entering 'Upper Deck 2023' or 'UPPER-DECK' as a slug would create a URL segment that breaks lowercase URL conventions and may cause case-sensitivity mismatches across environments.

**Suggested handling:** Enforce slug sanitization server-side (not just client-side): lowercase, replace spaces with hyphens, strip or transliterate non-ASCII, remove characters outside [a-z0-9-]. Return a 422 with a corrected suggestion if the submitted slug fails validation. Display the sanitization rules in the admin UI input hint.

---

### HF-014 — User uploads a 50 MB image via pre-signed S3/R2 URL — no file size limit in spec

**Impact:** High

**Description:** The spec describes pre-signed URLs for direct upload to S3/R2. Pre-signed URLs are generated server-side, but the spec does not define a maximum file size, allowed MIME types, or dimension limits. A user can upload a 50 MB RAW photo, consuming storage quota, degrading page load, and potentially causing OOM issues when the frontend tries to display it.

**Suggested handling:** Enforce a maximum file size (e.g. 5 MB) and allowed MIME types (image/jpeg, image/png, image/webp) when generating pre-signed URLs using S3/R2 policy conditions. Validate file type and size client-side before requesting the pre-signed URL. Reject or auto-compress on upload. Define these limits explicitly in the spec.

---

### HF-016 — User with 5,000+ cards views the 'All' collection — performance and pagination undefined

**Impact:** High

**Description:** The 'All' collection auto-contains every OwnedCard for a user and cannot be deleted. The API spec defines pagination (?page=1&limit=20, max 100) but does not explicitly state that the 'All' collection endpoint respects these limits or that the frontend implements pagination for it. A power user with 5,000 cards loading the 'All' collection without pagination could produce a response with thousands of records, causing slow API response, high DB load, and frontend rendering lag.

**Suggested handling:** Confirm the CollectionCard list endpoint enforces the same pagination rules for the 'All' collection as for regular collections. Add a virtual card-count badge on the 'All' collection so users see the total before loading. Implement virtual scrolling or cursor-based pagination on the frontend card grid to avoid rendering 5,000 DOM nodes simultaneously.

---

### HF-001 — Series created with no Sets — appears in browse with empty content

**Impact:** Medium

**Description:** An admin creates a Series (which requires a Competition FK) but never creates any Sets under it. The Series node appears in the browse hierarchy at /{sportSlug}/{competitionSlug}/{yearSlug}/{seriesSlug} but clicking it yields a blank page with no cards or Sets listed. There is no spec-defined minimum content guard or draft/publish state for Series.

**Suggested handling:** Add a UI warning badge on the admin Series list when Set count = 0. Optionally suppress zero-Set Series from public browse, or show a placeholder 'No sets yet' message so end users are not confused by dead-end navigation.

---

### HF-002 — Set created with no CardDefinitions — Set page is empty

**Impact:** Medium

**Description:** An admin creates a Set inside a Series but never adds CardDefinitions. The URL /{...}/{setSlug} resolves but returns an empty card grid. Users browsing the hierarchy reach this dead end with no feedback about whether content is coming or missing.

**Suggested handling:** Display an explicit 'No cards have been added to this set yet' message on the public Set page. In the admin Set list, flag Sets with 0 CardDefinitions. Consider a published/draft toggle so incomplete Sets are hidden until ready.

---

### HF-007 — Player's teamId set to a team from a different sport

**Impact:** Medium

**Description:** Both Player and Team carry a sportId FK, but the spec does not define a DB-level or application-level constraint preventing a basketball player from being assigned to an NHL team. An admin selecting from a long team dropdown may pick a same-named team from the wrong sport without noticing.

**Suggested handling:** Filter the team dropdown in the Player form to only show teams where team.sportId = player.sportId. Add a backend validation rule rejecting Player records where teamId references a Team whose sportId differs from the Player's sportId. Surface a clear error message if this constraint is violated.

---

### HF-008 — Two Competitions with near-identical names cause browse confusion

**Impact:** Medium

**Description:** An admin creates both 'NHL' and 'NHL Regular Season' as separate Competition entries. Because Competition slugs are globally unique, both can coexist. Users browsing by sport see both options and cannot tell which one contains the cards they want. Series may get split between the two incorrectly.

**Suggested handling:** Show a 'similar name already exists' warning in the admin Competition form when a new name has high string similarity to an existing one (e.g. Levenshtein distance below a threshold). Consider a canonical/alias relationship between Competitions, or add a description field shown to users in browse to disambiguate.

---

### HF-009 — Long player names with special characters break slug generation

**Impact:** Medium

**Description:** A name like 'José Ángel Míngez Martínez' must be transliterated to a URL-safe slug. The spec mentions auto-generation from name but does not specify the transliteration library or rules. Without consistent normalization, accented characters may be dropped, doubled, or transliterated differently across locales, producing slugs like 'jose-angel-mingez-martinez' or 'jos-ngel-mngez-martnez' depending on implementation.

**Suggested handling:** Standardize on a single Unicode-to-ASCII transliteration library (e.g. `slugify` with the `remove` option for unhandled characters). Define the normalization rules in the spec. Store the generated slug and display it to the admin for confirmation before saving, especially for non-ASCII names.

---

### HF-013 — Public collection URL shared externally — collection later made private — unclear response behavior

**Impact:** Medium

**Description:** A user shares /profile/{username}/collection/{collectionSlug} publicly. Another user bookmarks or shares the link. The owner then sets isPublic=false. The spec does not define whether the server returns 403 (Forbidden), 404 (not found), or redirects unauthenticated visitors. Inconsistent behavior can expose the existence of a collection to an unauthenticated user (403 leaks existence; 404 does not).

**Suggested handling:** Return 404 (not 403) for private collections accessed by non-owners and unauthenticated users, to avoid leaking collection existence. Document this in the spec. Authenticated owners always see their own private collections. Optionally show a 'This collection is private' page for logged-in users who had prior access, for a better UX than a silent 404.

---

### HF-015 — Admin incorrectly sets rookieFlag=true — no audit log to detect or revert the error

**Impact:** Medium

**Description:** rookieFlag is on CardDefinition and is presumably admin-set. The spec does not mention an audit log, change history, or approval workflow. An admin who mistakenly flags the wrong card as a rookie card has no in-app mechanism to see when the flag was set, who set it, or to revert it without a direct DB change. This is particularly impactful because rookie card status significantly affects collector value perception.

**Suggested handling:** Implement a basic field-level change log for CardDefinition (at minimum: changedBy, changedAt, previousValue, newValue for rookieFlag). Surface a change history panel in the admin CardDefinition detail page. Consider requiring a second admin confirmation when toggling rookieFlag.

---

### HF-011 — User sets limitation to '1/1' but CardDefinition has no server-enforced limitation — source of truth ambiguous

**Impact:** Low

**Description:** limitation on OwnedCard is a free-text string with no validation against the CardDefinition. A user can self-report owning card '1/1' even if the CardDefinition's actual print run is 100. There is no CardDefinition.limitation field in the spec, so there is nowhere to record the authoritative print run for validation.

**Suggested handling:** Either add an optional printRun integer to CardDefinition (admin-set) and validate that OwnedCard.limitation denominator does not exceed it, or clearly document that limitation is user-supplied and unverified. Show a UI disclaimer on the OwnedCard form: 'Limitation is self-reported and not verified.' Consider format validation (must match pattern \d+/\d+) if structured data is desired.

---

## Summary

**Total edge cases identified:** 87

| Impact | Count |
|--------|-------|
| Critical | 15 |
| High | 39 |
| Medium | 29 |
| Low | 4 |

| Category | Count |
|----------|-------|
| Data Integrity & Database | 25 |
| Business Logic & Card/Collection Lifecycle | 15 |
| Authentication, Authorization & User Accounts | 14 |
| API, Integration & Infrastructure | 16 |
| Human Factor & UX | 17 |

---

# Resolution Strategies

Concrete prevention and handling patterns, organized by architectural layer. Each section maps back to the edge case IDs it addresses. Implement these patterns during feature development — not after — to avoid retrofitting.

---

## Database & Prisma Schema Resolutions

### FK Cascade Policies

| Entity (child → parent) | FK Field | Policy | Prisma Directive |
|---|---|---|---|
| OwnedCard → CardDefinition | cardDefinitionId | RESTRICT | `onDelete: Restrict` |
| CardDefinition → Set | setId | RESTRICT | `onDelete: Restrict` |
| Set → Series | seriesId | RESTRICT | `onDelete: Restrict` |
| Series → Competition | competitionId | RESTRICT | `onDelete: Restrict` |
| Competition → Sport | sportId | RESTRICT | `onDelete: Restrict` |
| Team → Sport | sportId | RESTRICT | `onDelete: Restrict` |
| Player → Sport | sportId | RESTRICT | `onDelete: Restrict` |
| Series → Year | yearId | RESTRICT | `onDelete: Restrict` |
| Series → Manufacturer | manufacturerId | RESTRICT | `onDelete: Restrict` |
| CardDefinitionPlayer → Player | playerId | RESTRICT | `onDelete: Restrict` |
| CardDefinition → CardType | cardTypeId | RESTRICT | `onDelete: Restrict` |
| Player → Team | teamId | SET NULL | `onDelete: SetNull` |

Prisma model reference:

```prisma
model OwnedCard {
  cardDefinitionId String
  cardDefinition   CardDefinition @relation(fields: [cardDefinitionId], references: [id], onDelete: Restrict)
}

model CardDefinition {
  setId      String
  set        Set      @relation(fields: [setId], references: [id], onDelete: Restrict)
  cardTypeId String
  cardType   CardType @relation(fields: [cardTypeId], references: [id], onDelete: Restrict)
  slug       String   // non-optional = NOT NULL enforced by Prisma
}

model Set {
  seriesId String
  series   Series @relation(fields: [seriesId], references: [id], onDelete: Restrict)
}

model Series {
  competitionId  String
  competition    Competition  @relation(fields: [competitionId], references: [id], onDelete: Restrict)
  yearId         String
  year           Year         @relation(fields: [yearId], references: [id], onDelete: Restrict)
  manufacturerId String
  manufacturer   Manufacturer @relation(fields: [manufacturerId], references: [id], onDelete: Restrict)
}

model Player {
  sportId String
  sport   Sport  @relation(fields: [sportId], references: [id], onDelete: Restrict)
  teamId  String?
  team    Team?  @relation(fields: [teamId], references: [id], onDelete: SetNull)
}

model CardDefinitionPlayer {
  cardDefinitionId String
  playerId         String
  player           Player         @relation(fields: [playerId], references: [id], onDelete: Restrict)
  cardDefinition   CardDefinition @relation(fields: [cardDefinitionId], references: [id], onDelete: Restrict)
  @@id([cardDefinitionId, playerId])
}
```

API layer must count dependants before any delete and return `409 Conflict` with the count — never surface a raw Prisma `P2003` constraint error to the client.

---

### Composite Unique Indexes

**DB-23 — Collection slug unique per user:**

```prisma
model Collection {
  userId String
  slug   String
  @@unique([userId, slug])
}
```

**DB-24 — Series slug unique per competition + year:**

```prisma
model Series {
  competitionId String
  yearId        String
  slug          String
  @@unique([competitionId, yearId, slug])
}
```

**DB-15 / DB-16 — Global slug uniqueness with retry:**

```prisma
model Manufacturer {
  slug String @unique
}
// Same pattern for Sport, Competition, Year, Team, Player, CardType
```

Slug generation + insert must be wrapped in a retry loop (max 5 attempts). On `P2002`, increment the suffix counter and retry. The DB index is the authoritative guard; the retry loop is the UX recovery path.

---

### CHECK Constraints

**DB-14 — gradeValue and gradingCompany must both be set or both null:**

```sql
-- prisma/migrations/<timestamp>_add_grading_check/migration.sql
ALTER TABLE "OwnedCard"
  ADD CONSTRAINT chk_grading_paired
  CHECK (
    ("gradeValue" IS NULL AND "gradingCompany" IS NULL)
    OR
    ("gradeValue" IS NOT NULL AND "gradingCompany" IS NOT NULL)
  );
```

Add via `prisma migrate dev --create-only`, then paste the SQL into the generated migration file.

**DB-13 — Prevent deletion of the system "All" collection:**

```sql
CREATE OR REPLACE FUNCTION prevent_system_collection_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."isDefault" = TRUE THEN
    RAISE EXCEPTION 'Cannot delete system collection (id: %)', OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_system_collection_delete
  BEFORE DELETE ON "Collection"
  FOR EACH ROW EXECUTE FUNCTION prevent_system_collection_delete();
```

---

### Idempotent Operations

**DB-18 — CollectionCard composite PK: INSERT ON CONFLICT DO NOTHING**

```typescript
await prisma.collectionCard.createMany({
  data: [{ collectionId, ownedCardId }],
  skipDuplicates: true, // translates to INSERT … ON CONFLICT DO NOTHING
});
```

This applies to both user-initiated adds and the automatic "All" collection sync path (DB-11), making both operations safe to retry.

---

### Application-enforced Invariants

| Case | Layer | What to enforce |
|---|---|---|
| DB-11 | Service | Wrap every CSV row's OwnedCard insert + CollectionCard insert in a single Prisma transaction; run as a BullMQ background job |
| DB-12 | API handler | Before any `DELETE /collection-cards/:id`, check `collection.isDefault === true` → reject with `403 Forbidden` |
| DB-13 | API handler | Before `DELETE /collections/:id`, check `collection.isDefault === true` → reject with `403`; DB trigger is the last-resort backstop |
| DB-17 | DTO validation | If `CardDefinitionPlayer` count ≠ 1, require an explicit non-empty `slug` field; return `422` otherwise |
| DB-22 | JWT middleware | After signature validation, check `user.isActive` from DB/cache (TTL ≤ 60 s); return `401 ACCOUNT_DEACTIVATED` if false |
| DB-25 | Service | On Player/CardType slug change: bulk-recompute all affected CardDefinition slugs in the same transaction; enqueue `redirect.register` job for old → new slug mapping |

---

## API & Authentication Layer Resolutions

### Auth Flows & Token Lifecycle

| Case ID | Pattern | Key Implementation Note |
|---|---|---|
| AUTH-001 | Catch Prisma `P2002` on `users.email` | `if (e.code === 'P2002') throw new ConflictException('DUPLICATE_EMAIL')` — never pre-check with `findUnique` (TOCTOU race) |
| AUTH-002 | Reject reused reset token | `WHERE tokenHash = $h AND usedAt IS NULL AND expiresAt > NOW()` — set `usedAt = NOW()` atomically with the password write |
| AUTH-003 | Invalidate prior tokens on new request | `UPDATE password_reset_tokens SET usedAt = NOW() WHERE userId = $id AND usedAt IS NULL` before issuing new token |
| AUTH-005 | JWT expiry mid-form | Short-lived access token (15 min) + long-lived refresh token (30 d) in `HttpOnly` cookie; client intercepts `401 TOKEN_EXPIRED` and retries once via `POST /auth/refresh` |
| AUTH-007 | Email change | Set `isEmailVerified = false`, increment `tokenVersion`, send verification to new address; swap email only after verification |
| AUTH-013 | Seed script idempotency | `prisma.user.upsert({ create: { ...adminData }, update: {} })` — existing admin password is never overwritten |
| AUTH-014 | JWT secret rotation | Support `JWT_SECRET_PREVIOUS` env var; verify against new secret first, fall back to previous; remove after one full token lifetime |

---

### Authorization Guards

| Case ID | Guard | What to check |
|---|---|---|
| AUTH-004 | `EmailVerifiedGuard` | `user.isEmailVerified === true`; throw `403 EMAIL_NOT_VERIFIED`; gate all mutation routes |
| AUTH-006 | Inside `JwtStrategy.validate` | Load `user.isActive` from DB (or Redis cache TTL 60 s); throw `401 ACCOUNT_DEACTIVATED` |
| AUTH-010 | `RolesGuard` | Never read role from JWT payload — call `usersService.findById(req.user.id)` for authoritative role; cache per-request on `req` object |
| AUTH-011 | Collection list route | All-private user: return `200 { data: [], meta: { total: 0 } }` — never `404` |
| AUTH-012 | Public profile route | `user.isActive === false` → return `404` (not `403`) |

---

### API Validation & Error Handling

| Case ID | HTTP Status | Error Code | Note |
|---|---|---|---|
| AUTH-001 | 409 | `DUPLICATE_EMAIL` | Thrown from service after catching `P2002` on `users.email` |
| AUTH-008 | 409 | `DUPLICATE_USERNAME` | Same `P2002` catch on `users.username` unique index |
| AUTH-009 | — | — | Prefer immutable username (simplest). If mutable: store history in `username_history` table; issue `308 Permanent Redirect` from old to current username |
| API-INFRA-009 | 200 | — | Out-of-range page: always return `{ data: [], meta: { page, limit, total, totalPages } }` — never `404` |
| API-INFRA-010 | 400 | `INVALID_PAGINATION` | Global `ValidationPipe` with `@IsInt() @Min(1) @Max(100)` on all `limit` query params; `transform: true` to cast strings |
| API-INFRA-011 | — | — | Slug suffix race: catch `P2002`, increment suffix, retry up to 5×; after 5 failures throw `500 SLUG_GENERATION_FAILED` |
| API-INFRA-004 | — | — | `GET /api/health` returns `{ status, uptime, timestamp }` only — no versions, no hostnames; diagnostics are exclusively at `GET /admin/health` |

---

### CSV Import Pipeline

Covers API-INFRA-005, API-INFRA-006, API-INFRA-007, API-INFRA-008.

1. **Receive & deduplicate** — Compute SHA-256 of raw file bytes. Check `import_jobs` for an existing row with the same `contentHash`; if found and not `FAILED`, return `409 DUPLICATE_IMPORT` with the existing job ID.
2. **Charset normalisation** — Detect encoding via `chardet`/`iconv-lite`; transcode to UTF-8. If detection confidence < 0.7, reject with `400 ENCODING_UNDETECTABLE`.
3. **Dry-run FK resolution** — Parse CSV; batch-resolve all FK references (Manufacturer, Sport, Year, etc.) via `findMany` calls. Collect per-row errors as `{ row, field, error }[]`. If `?dryRun=true`, return `200` with the error list and stop.
4. **Enqueue async job** — Insert `import_jobs` row with `status = PENDING`, push BullMQ job, return `202 Accepted` with `{ jobId, statusUrl }`.
5. **Process in worker** — Parse → upsert in batches of 500 inside Prisma transactions → update `import_jobs.status` to `COMPLETED` or `FAILED`.
6. **Poll / SSE** — `GET /admin/imports/:jobId` returns status, progress percentage, and error summary. Optional `GET /admin/imports/:jobId/stream` via Server-Sent Events.
7. **Timeout guard** — BullMQ job timeout: 10 min. On `STALLED` event, set status to `FAILED` and enqueue an admin notification email.

---

### File Upload Safety

Covers API-INFRA-001, API-INFRA-002, API-INFRA-003.

```
Client                    API                         S3/R2
  |                         |                            |
  |- POST /uploads/initiate->|                            |
  |                         |- INSERT uploads(status=PENDING, key=pending/{uuid}/file)
  |                         |- GeneratePresignedPutURL (TTL=15 min)
  |<-- { uploadId, presignedUrl, expiresAt } ------------|
  |                         |                            |
  |- PUT presignedUrl ---------------------------------------->|
  |<-- 200 ----------------------------------------------------|
  |                         |                            |
  |- POST /uploads/:id/confirm->|                         |
  |                         |- HeadObject(key) — verify ETag
  |                         |- CopyObject pending/… → assets/…
  |                         |- UPDATE uploads SET status=CONFIRMED
  |<-- { assetUrl } --------|                            |
```

- **API-INFRA-001** — `expiresAt` always included in initiate response. Client checks before PUT; if within 30 s of expiry, re-fetches a fresh URL. Server rejects a confirm for an expired-but-unconfirmed upload with `410 UPLOAD_URL_EXPIRED`.
- **API-INFRA-002** — All uploads land under `pending/` prefix. S3/R2 lifecycle rule expires `pending/` objects after 24 h. Background job marks stale `uploads` rows as `EXPIRED`.
- **API-INFRA-003** — If `HeadObject` inside `/confirm` fails, return `424 UPLOAD_NOT_FOUND` — client must re-initiate. Never write a final DB asset record until `HeadObject` succeeds.

---

### Startup & Config Validation

Covers API-INFRA-014, API-INFRA-015, API-INFRA-016. Runs in `AppModule.onApplicationBootstrap()`. Any failure calls `process.exit(1)`.

- [ ] `DATABASE_URL` — parse as URL at module load; fail fast on malformed value
- [ ] `DATABASE_URL` — live ping via `` prisma.$queryRaw`SELECT 1` `` with 5 s timeout
- [ ] `JWT_SECRET` — present and ≥ 32 bytes
- [ ] `JWT_SECRET_PREVIOUS` — if present, ≥ 32 bytes; warn if absent during a rotation window
- [ ] `STORAGE_PROVIDER` — must be `s3` or `r2`
- [ ] `S3_ENDPOINT` — required when `STORAGE_PROVIDER=r2`
- [ ] S3/R2 bucket — `HeadBucket` connectivity check; fail on 403/network error
- [ ] `RESEND_API_KEY` — non-empty string check
- [ ] Redis — `redis.ping()` on BullMQ client; fail if unreachable
- [ ] `NEXT_PUBLIC_API_URL` — validated in `next.config.js` at build time; `next build` throws if absent or not a valid URL

---

## Frontend & UX Resolutions

### Admin Form Safeguards

| Edge Case IDs | Form | Safeguard | Implementation Note |
|---|---|---|---|
| EC-002 | CardDefinition edit | Slug-change warning + lock | On slug blur, call `GET /api/card-definitions/{id}/owned-count`; if count > 0 show: _"X OwnedCards reference this slug — changing it will break existing URLs."_ Require checkbox to unlock field. |
| HF-006 | Any slug field | Client-side sanitize + live preview | `onChange`: `value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-\|-$)/g, '')`. Show hint: _"URL will be: /…/[slug]"_ |
| HF-009 | Player name / slug | Transliteration preview | Apply `deburr` (lodash) before slug regex; show result: _"Slug: novak-djokovic"_ — reactive on every keystroke |
| EC-015 | Collection rename | Non-blocking slug-collision notice | On 409 from API: show inline notice, not a blocking modal — _"URL /collections/name is taken — will use /collections/name-2"_ |
| HF-010 | Year label | Format validation | `onBlur`: reject patterns matching `/^\d{4}\/\d{2}$/`; suggest `2023-24`. HTML `pattern="^\d{4}(-\d{2})?$"` |
| HF-007 | Player — teamId | Sport-filtered dropdown | `useEffect([sportId])`: re-fetch `/api/teams?sportId={sportId}`; clear selected teamId if no longer valid; use `AbortController` for cleanup |
| HF-008 | Competition name | Fuzzy-match warning | `onBlur`: `GET /api/competitions?q={name}&fuzzy=true`; if similarity > 0.8 show: _"Similar competition exists: '…' — is this the same?"_ |
| EC-007 | CardDefinition | rookieFlag + cardType coupling | Render both in the same `<fieldset>`; when cardType changes away from `Rookie` and `rookieFlag === true`, show amber inline alert |
| HF-015 | CardDefinition rookieFlag | Last-modified metadata | Render beneath the checkbox: _"Last modified: {updatedAt} by {updatedBy}"_ |
| HF-011 | Limitation field | Disclaimer | Persistent helper text: _"Self-reported print run — not independently verified."_ |

---

### Destructive Action Confirmations

| Action | Required dialog copy | Edge Cases |
|---|---|---|
| Delete OwnedCard | _"Delete this card from your collection? Your card image will also be removed. This cannot be undone."_ Button: **"Yes, delete card"** | EC-009 |
| Delete Collection | _"Delete collection '{name}'? **Your cards are NOT deleted** — they remain in your All collection and any other collections they belong to."_ Button: **"Delete collection only"** | EC-011 |
| Change CardDefinition slug (when owned count > 0) | _"This definition is referenced by {N} owned cards. Changing the slug may break bookmarked URLs. Are you sure?"_ Button: **"Change slug"** — shown only after admin unchecks the slug lock toggle | EC-002 |
| CSV import commit | Not a modal — present dry-run summary table; require explicit **"Import {N} valid rows"** button; show resolved entity name in each row | HF-004 |

---

### Input Validation & Normalization

| Field | Validation Rule | Client-side | Server-side |
|---|---|---|---|
| Slug (all entities) | `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, max 100 chars | `onChange` sanitize; live preview | Regex check + unique index; `422` on format error |
| Limitation | Trim whitespace; free-text max 50 chars | `onBlur` trim; show hint: _"e.g. 45/100"_ | Trim in service layer before persist |
| Image upload | Type: `jpeg/png/webp`; size ≤ 5 MB | Check `file.type` + `file.size` before requesting pre-signed URL | S3 policy `ContentLengthRange` + `ContentType` condition |
| Pre-signed URL TTL | Re-fetch if within 30 s of `expiresAt` | Store `{ url, expiresAt }` in state; check before PUT | EC-008 — S3 rejects expired; client re-fetch is the recovery path |
| Year label | `/^\d{4}(-\d{2})?$/` | `onBlur` validator; suggest format if `/` detected | `422` + suggestion message |
| Username | Not in reserved list | Check against exported `RESERVED_USERNAMES` constant; show _"This username is reserved"_ immediately | `409` server-side is authoritative |
| Limitation normalization | Trim + canonical hint | Controlled input: `value.trimStart()` on change; `onBlur` trims end | Normalize in DTO transformer |

---

### Conflict & Error Handling UX

| Scenario | HTTP Status | UX Response | Edge Cases |
|---|---|---|---|
| Concurrent OwnedCard edit | 409 | Store `updatedAt` at form-open time; send `If-Match: {updatedAt}` header on save; on 409 show modal: _"Updated in another tab — reload or keep editing"_ | EC-012 |
| Duplicate OwnedCard add | — | Call `GET /api/owned-cards?cardDefinitionId={id}&count=true` before adding; if count ≥ 1 show: _"You already own {N} cop(y/ies). Add another?"_ | EC-004, HF-005 |
| Private collection URL | 404 | Custom not-found page: _"This collection is no longer available or is set to private."_ Never `403` | HF-013 |
| All collections private (owner view) | 200 | Empty state inside collection list, not a 404 page: _"All collections are private."_ CTA to privacy settings | AUTH-011 |
| CSV export timeout | 202 | Async flow with polling (see Performance below) | EC-014 |
| S3 image `onError` | — | Replace `src` with placeholder SVG via `useState`; optionally show refresh button | EC-008 |

---

### Performance & Pagination

- **HF-016 — "All" collection pagination**: Enforce server-side pagination on every collection list view; hard max 50 per page. Render total count badge. Use `useInfiniteQuery` (React Query) or numbered page controls. Never load all records into a single response.
- **EC-014 — CSV export async flow**: `POST /api/exports` → `202 Accepted` with `{ jobId }`. Poll `GET /api/exports/{jobId}` every 2 s via `setInterval` inside `useEffect` (clear in cleanup). On `status: "complete"` surface a download link. On `status: "failed"` show error + retry button.
- **HF-001/HF-002 — Empty Series/Set**: Render an explicit `<EmptyState>` component with contextual copy and an admin CTA — never an empty `<ul>`. Share one component across all empty-hierarchy cases.
- **HF-003 — Card number natural sort**: Sort using `localeCompare` with `{ numeric: true }` client-side; do not rely on lexicographic DB ordering for display.

---

## Infrastructure & Operational Resolutions

### Async Job Queue (BullMQ)

All async jobs run on a shared BullMQ instance backed by Redis. Workers use a dedicated Prisma client with a capped connection pool (`connection_limit=2`) separate from the API pool (DB-20). All queues use `removeOnComplete: { count: 100 }` and `removeOnFail: false` for DLQ inspection via Bull Board.

| Job Name | Queue | Trigger | Retries (backoff) | DLQ Action | Edge Cases |
|---|---|---|---|---|---|
| `email.send` | `email` | Auth events, password reset, export-ready | 5 × exponential (1 s base) | Alert + mark failed in `email_jobs` | API-INFRA-013 |
| `csv.import` | `csv-import` | Admin `POST /admin/csv/import` | 2 (no retry on validation fail) | Store partial results + notify admin | API-INFRA-006, DB-11, DB-20 |
| `csv.export` | `csv-export` | User `POST /api/collections/:id/export` | 2 × linear (5 s) | Notify user of failure | EC-014 |
| `s3.delete` | `s3-cleanup` | OwnedCard `afterDelete` hook | 5 × exponential (2 s base) | Move key to `orphan-review/` + log | DB-19, EC-009 |
| `s3.reconcile` | `s3-cleanup` | Cron: daily at 02:00 UTC | 1 | Alert on-call | DB-19, EC-009, API-INFRA-002 |
| `slug.recompute` | `slug-recompute` | Admin renames Player or CardType slug | 3 × linear (10 s) | Alert + lock entity from further rename | DB-25 |
| `redirect.register` | `slug-recompute` | Triggered by `slug.recompute` completion | 2 | Log failed redirect — manual recovery | DB-25 |

Use a **PostgreSQL advisory lock** (`pg_try_advisory_xact_lock(hashtext('csv-import'))`) inside the `csv.import` worker to prevent duplicate concurrent imports (API-INFRA-007).

---

### Startup Validation Checklist

Executed in `AppModule.onApplicationBootstrap()`. Any failure throws and prevents container from reaching healthy state.

1. **`DATABASE_URL` format** — `new URL(process.env.DATABASE_URL)` at module load; fail on malformed
2. **`DATABASE_URL` live ping** — `` prisma.$queryRaw`SELECT 1` `` with 5 s timeout → addresses API-INFRA-015
3. **`JWT_SECRET`** — present and ≥ 32 bytes
4. **`JWT_SECRET_PREVIOUS`** — if present, ≥ 32 bytes; warn if absent during rotation window
5. **`STORAGE_PROVIDER`** — must be `s3` or `r2` → addresses API-INFRA-016
6. **`S3_ENDPOINT`** — required when `STORAGE_PROVIDER=r2` → addresses API-INFRA-016
7. **S3/R2 connectivity** — `HeadBucket` command; fail on 403 or network error
8. **`RESEND_API_KEY`** — non-empty string check
9. **Redis connectivity** — `redis.ping()` on BullMQ client; fail if unreachable
10. **`NEXT_PUBLIC_API_URL`** — validated in `next.config.js` at `next build` time → addresses API-INFRA-014
11. **CI locale lint** — script diffs `cs.json` keys against `en.json`; fails build on any missing key → addresses API-INFRA-012

---

### Health Check Design

| Dimension | `/api/health` (public) | `/admin/health` (admin JWT) |
|---|---|---|
| **Auth** | None | Valid admin JWT |
| **`status`** | `"ok"` \| `"degraded"` | `"ok"` \| `"degraded"` \| `"error"` |
| **DB** | Not included | `{ status, latencyMs }` |
| **Redis** | Not included | `{ status, latencyMs }` |
| **S3/R2** | Not included | `{ status, bucketAccessible }` |
| **Resend** | Not included | `{ status }` (last known attempt) |
| **BullMQ queues** | Not included | Per-queue: `{ waiting, active, failed }` |
| **`version`** | Not included | `GIT_COMMIT_SHA` env var |
| **`uptime`** | `process.uptime()` seconds | `process.uptime()` seconds |
| **`timestamp`** | ISO 8601 UTC | ISO 8601 UTC |
| **Cache** | — | Sub-checks cached in Redis (TTL 30 s) to prevent thundering herd |

API-INFRA-004: the public endpoint must never include internal hostnames, version strings, env var names, or DSN fragments.

---

### S3/R2 Orphan Cleanup

**Part A — Async delete on OwnedCard removal (DB-19, EC-009)**

NestJS Prisma middleware enqueues an `s3.delete` job after a successful `ownedCard.delete`. Worker calls `DeleteObjectCommand`. After all retries exhausted, moves key to `orphan-review/` and alerts.

**Part B — S3 lifecycle rule on `pending/` prefix (API-INFRA-002)**

```json
{
  "ID": "expire-pending-uploads",
  "Filter": { "Prefix": "pending/" },
  "Status": "Enabled",
  "Expiration": { "Days": 1 }
}
```

On successful DB save, backend copies object from `pending/{uuid}/file` to `assets/{entityId}/file`, then deletes the `pending/` original.

**Part C — Daily reconciliation job (`s3.reconcile`)**

1. Acquire Redis distributed lock (`SET orphan-reconcile NX EX 7200`); skip run if lock not acquired.
2. List all S3 keys via paginated `ListObjectsV2` (excluding `pending/` and `orphan-review/`).
3. Stream all `imageUrl` values from DB via Postgres cursor.
4. Compute set difference: keys in S3 not referenced by any DB row.
5. Copy each orphan to `orphan-review/{timestamp}/{key}`, then delete original.
6. Log orphan count at `INFO`; alert if count exceeds `ORPHAN_ALERT_THRESHOLD` (default: 50).
7. Delete `orphan-review/` objects older than `ORPHAN_RETENTION_DAYS` (default: 7) on subsequent runs.

---

### Prisma Migration Runbook

**Pre-deployment classification**

```sh
prisma migrate diff --from-schema-datasource --to-schema-datamodel prisma/schema.prisma
```

| Class | Definition | Action |
|---|---|---|
| Safe | Additive only (new table, new nullable column, new index) | Standard deploy |
| Risky | DROP, NOT NULL without default, large-table index | Decompose: add nullable → backfill in batches → add NOT NULL |
| Breaking | FK constraint change, column rename | Maintenance mode required |

**Staging-first flow**

1. `pg_dump $STAGING_DATABASE_URL > backup_staging_$(date +%Y%m%d_%H%M%S).dump`
2. `DATABASE_URL=$STAGING_DATABASE_URL prisma migrate deploy`
3. Run smoke tests; verify row counts unchanged.
4. Repeat against production only after staging passes.

**Partial migration recovery (DB-21)**

1. Inspect: `SELECT migration_name, finished_at, logs FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;`
2. If cleanly rolled back: `prisma migrate resolve --rolled-back <migration_name>`
3. If partially applied: manually apply remaining SQL, then `prisma migrate resolve --applied <migration_name>`
4. Validate: `prisma migrate diff` must output empty.
5. Never delete rows from `_prisma_migrations` — use `migrate resolve` exclusively.
6. Document in `migrations/INCIDENTS.md`: timestamp, root cause, resolution.

---

### JWT Invalidation Patterns

Access tokens: 15 min lifetime, in-memory. Refresh tokens: 30-day lifetime, `HttpOnly Secure SameSite=Lax` cookie + `RefreshToken` DB table.

Immediate invalidation uses a `tokenVersion` counter (`INTEGER NOT NULL DEFAULT 0`) on `User`. Every JWT embeds `tokenVersion` as a claim. Middleware validates `jwt.tokenVersion === user.tokenVersion` (DB read cacheable in Redis with TTL = access token lifetime).

| Trigger | Mechanism | Scope | Edge Cases |
|---|---|---|---|
| User deactivation | `tokenVersion++` in same transaction as deactivation write | All devices, single user | AUTH-006, DB-22, EC-010 |
| Admin role grant / revoke | `tokenVersion++`; client silently re-issues via `POST /auth/refresh` | All devices, single user | AUTH-010 |
| Email change | `tokenVersion++`; require re-login after re-verification | All devices, single user | AUTH-007 |
| Password reset / change | `tokenVersion++` + delete all `RefreshToken` rows for that user | All devices, single user | AUTH-002, AUTH-003 |
| JWT secret rotation | Deploy `JWT_SECRET` (new) + `JWT_SECRET_PREVIOUS` (old) simultaneously; remove `JWT_SECRET_PREVIOUS` after 30 days | All users, all devices | AUTH-014 |
| Session logout | Delete specific `RefreshToken` row; access token expires within ≤ 15 min | Single device | — |
| Mid-action expiry | Frontend detects `401`, silently calls `POST /auth/refresh`, replays original request once | Single request, transparent to user | AUTH-005 |