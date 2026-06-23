# Sport Cards Collector App — Task Specification

## 1. Overview

A web application for managing physical sports card collections virtually. Users build a personal collection by adding cards from a shared, admin-curated global catalogue. Each card in a user's collection carries personal metadata (grade, condition notes, photos). Users can organise their cards into custom named collections (e.g. "Box #3", "Graded Slabs", "Hockey Rookies") with full overlap — a card can live in multiple collections simultaneously. Public profiles allow others to browse a user's shared collections.

---

## 2. Tech Stack

| Layer       | Technology        | Notes                                      |
|-------------|-------------------|--------------------------------------------|
| Frontend    | Next.js (React)   | App Router, TypeScript                     |
| Backend     | NestJS            | REST API, TypeScript                       |
| Database    | PostgreSQL        | Primary data store                         |
| ORM         | Prisma            | Schema, migrations, type-safe queries      |
| CSS         | Tailwind CSS      | Utility-first styling                      |
| Language    | TypeScript        | Used across frontend and backend           |
| File Storage| AWS S3 / Cloudflare R2 | All user-uploaded images (card photos, avatars, logos, covers) |
| i18n        | next-intl              | UI string translations; scaffolded from day one with English only |
| Email       | Resend                 | Transactional email — verification, password reset               |

---

## 3. Authentication & Authorization

### Method
Email + password only. No OAuth providers in v1. JWT-based sessions with a two-token pattern:

- **Access token:** short-lived JWT (`15 min`), signed with `JWT_SECRET`, payload: `{ userId, tokenVersion, role }`.
- **Refresh token:** long-lived opaque token (`30 days`), stored as an `HttpOnly Secure SameSite=Lax` cookie, persisted in a `RefreshToken` DB table (`tokenHash`, `userId`, `expiresAt`, `createdAt`).

On access token expiry (`401 TOKEN_EXPIRED`), the frontend silently calls `POST /api/auth/refresh`. A new access token is issued if the refresh token is valid. Logout deletes the `RefreshToken` row. Password reset deletes all `RefreshToken` rows for the user.

Required auth flows:
- Register (email, password, username)
- Login (issues access token + sets refresh token cookie)
- Logout (deletes refresh token)
- Token refresh (`POST /api/auth/refresh`)
- Password reset via email link
- Email verification on registration
- Resend verification email

### Roles

| Role  | Description |
|-------|-------------|
| `ADMIN` | Manages all shared catalogue data and users. Access to `/admin` panel. |
| `USER`  | Manages their own collection. Can view public profiles of other users. |

#### Admin can:
- Full CRUD on: Players, Manufacturers, Series, Sets, Years, Sports, Competitions, CardTypes, CardDefinitions
- View and manage all users (activate, deactivate)
- Access `/admin` dashboard

#### User can:
- Add/edit/delete their own OwnedCards
- Create/edit/delete their own Collections
- Mark collections as public or private
- View their own full collection and other users' public collections
- Export their own collection to CSV

---

## 4. Entities

### 4.1 User

**Description:** A registered human user of the application.

**Managed by:** Self-registered; admins can deactivate accounts.

| Attribute       | Type              | Required | Notes                                      |
|-----------------|-------------------|----------|--------------------------------------------|
| id              | UUID              | Yes      | Primary key                                |
| email           | String            | Yes      | Unique, used for login                     |
| passwordHash    | String            | Yes      | bcrypt hash, never exposed via API         |
| username        | String            | Yes      | Unique, shown on public profile            |
| role            | Enum (ADMIN/USER) | Yes      | Default: USER                              |
| avatarUrl       | String \| null    | No       | URL to user profile picture                |
| isActive        | Boolean           | Yes      | Default: true; admins can deactivate       |
| registeredAt    | DateTime          | Yes      | Auto-set on creation                       |
| isEmailVerified | Boolean           | Yes      | Default: false; set to true after email verification link is clicked |
| tokenVersion    | Int               | Yes      | Default: 0; incremented on deactivation, role change, email change, and password reset — embedded in JWT to enable immediate session invalidation |

**Relationships:**
- Has many `Collection` (including the auto-generated "All")
- Has many `OwnedCard` (via collections)

---

### 4.2 Collection

**Description:** A named group of cards belonging to a user. Represents a physical organising unit (a box, binder, shelf). Each user always has one automatic "All" collection.

**Managed by:** User (custom collections); system (the "All" collection).

| Attribute   | Type     | Required | Notes                                      |
|-------------|----------|----------|--------------------------------------------|
| id          | UUID     | Yes      | Primary key                                |
| userId      | UUID     | Yes      | FK → User                                  |
| name        | String   | Yes      | e.g. "Box #3", "Graded Slabs"              |
| slug         | String         | Yes      | Unique per user, URL-safe, auto-generated from name |
| isSlugCustom | Boolean        | Yes      | Default: false; set to true when slug is manually edited; auto-generation then stops and conflicts show inline error instead of auto-suffix |
| coverImageUrl| String \| null | No       | URL to collection cover/thumbnail image    |
| isDefault   | Boolean  | Yes      | True only for the auto-created "All" collection |
| isPublic    | Boolean  | Yes      | Default: false. If true, visible on public profile |
| createdAt   | DateTime | Yes      | Auto-set on creation                       |

**Relationships:**
- Belongs to one `User`
- Has many `OwnedCard` via `CollectionCard` join table (many-to-many)

---

### 4.3 CardDefinition

**Description:** The canonical, shared definition of a trading card. Represents the card as published — not any individual user's copy. Admins curate this catalogue.

**Managed by:** Admin only.

| Attribute       | Type     | Required | Notes                                          |
|-----------------|----------|----------|------------------------------------------------|
| id              | UUID     | Yes      | Primary key                                    |
| setId           | UUID     | Yes      | FK → Set                                       |
| cardNumber      | String   | Yes      | Card's number within the set (e.g. "247")      |
| name            | String   | Yes      | Display name of the card                       |
| cardTypeId      | UUID           | Yes      | FK → CardType                                                |
| rookieFlag      | Boolean        | Yes      | Default: false. Marks this as a rookie card.                 |
| slug            | String         | Yes      | Unique within set. Auto-generated by player count: **0 players** → `{cardNumber}-{cardTypeSlug}`; **1 player** → `{cardNumber}-{playerSlug}-{cardTypeSlug}`; **2+ players** → admin must provide a custom slug (form blocks save if absent) |
| isSlugCustom    | Boolean        | Yes      | Default: false; set to true when admin manually edits the slug. Also locked (read-only) once any OwnedCard references this CardDefinition |
| photoFrontUrl   | String \| null | No       | URL to official front image; used as fallback for OwnedCard  |
| photoBackUrl    | String \| null | No       | URL to official back image; used as fallback for OwnedCard  |
| createdAt       | DateTime       | Yes      | Auto-set on creation                                    |

**Relationships:**
- Belongs to one `Set`
- Belongs to one `CardType`
- Has many `Player` via `CardDefinitionPlayer` join table (a card can feature 0 or more players)
- Has many `OwnedCard` (each user's personal copy references this definition)

---

### 4.4 CardDefinitionPlayer *(join table)*

**Description:** Many-to-many link between CardDefinition and Player. A card can feature zero or more players; a player can appear on many cards.

| Attribute        | Type | Required | Notes                    |
|------------------|------|----------|--------------------------|
| cardDefinitionId | UUID | Yes      | FK → CardDefinition      |
| playerId         | UUID | Yes      | FK → Player              |

Composite primary key on `(cardDefinitionId, playerId)`.

---

### 4.5 OwnedCard

**Description:** A user's personal instance of a card. Represents one physical card in their possession. Links to a `CardDefinition` and carries all personal metadata.

**Managed by:** User.

| Attribute       | Type          | Required | Notes                                              |
|-----------------|---------------|----------|----------------------------------------------------|
| id              | UUID          | Yes      | Primary key                                        |
| userId          | UUID          | Yes      | FK → User (owner)                                  |
| cardDefinitionId| UUID          | Yes      | FK → CardDefinition                                |
| limitation      | String \| null | No      | Print run info, e.g. "45/100" or "1/1"             |
| gradeValue      | Int \| null   | No       | Numeric grade (e.g. 9, 10). Null if ungraded.      |
| gradingCompany  | String \| null| No       | e.g. "PSA", "BGS", "SGC". Null if ungraded.        |
| notes           | String \| null| No       | Free-text personal notes                           |
| photoFrontUrl   | String \| null | No       | User's own front photo; overrides CardDefinition.photoFrontUrl when set |
| photoBackUrl    | String \| null | No       | User's own back photo; overrides CardDefinition.photoBackUrl when set   |
| addedAt         | DateTime      | Yes      | Auto-set on creation                               |

**Relationships:**
- Belongs to one `User`
- Belongs to one `CardDefinition`
- Has many `Collection` via `CollectionCard` join table

---

### 4.6 CollectionCard *(join table)*

**Description:** Many-to-many link between OwnedCard and Collection.

| Attribute     | Type | Required | Notes                |
|---------------|------|----------|----------------------|
| collectionId  | UUID | Yes      | FK → Collection      |
| ownedCardId   | UUID | Yes      | FK → OwnedCard       |

Composite primary key on `(collectionId, ownedCardId)`.

---

### 4.7 Player

**Description:** A real athlete who appears on one or more cards. Part of the shared admin-managed catalogue.

**Managed by:** Admin only.

| Attribute    | Type          | Required | Notes                                          |
|--------------|---------------|----------|------------------------------------------------|
| id           | UUID          | Yes      | Primary key                                    |
| fullName     | String        | Yes      | e.g. "Michael Jordan"                          |
| slug         | String        | Yes      | Globally unique, e.g. "michael-jordan"; auto-generated from fullName |
| isSlugCustom | Boolean       | Yes      | Default: false; set to true when slug is manually edited              |
| sportId      | UUID          | Yes      | FK → Sport                                     |
| nationality  | String \| null| No       | Country name or ISO code                       |
| dateOfBirth  | Date \| null  | No       | Date of birth                                  |
| teamId       | UUID \| null  | No       | FK → Team (current team, informational)        |
| photoUrl     | String \| null| No       | URL to player headshot                         |
| createdAt    | DateTime      | Yes      | Auto-set on creation                           |

**Relationships:**
- Belongs to one `Sport`
- Optionally belongs to one `Team`
- Has many `CardDefinition` via `CardDefinitionPlayer` join table

---

### 4.8 Manufacturer

**Description:** The real-world company that produces and publishes card series (e.g. Topps, Panini, Upper Deck).

**Managed by:** Admin only.

| Attribute  | Type     | Required | Notes              |
|------------|----------|----------|--------------------|
| id         | UUID           | Yes      | Primary key        |
| name       | String         | Yes      | Unique             |
| slug       | String         | Yes      | Globally unique, e.g. "upper-deck"; auto-generated from name |
| isSlugCustom | Boolean      | Yes      | Default: false; set to true when slug is manually edited      |
| logoUrl    | String \| null | No       | Brand logo image   |
| createdAt  | DateTime       | Yes      |                    |

**Relationships:**
- Has many `Series`

---

### 4.9 Series

**Description:** A named card series released by a manufacturer for a specific sport in a specific year (e.g. "Topps Chrome 2024 Basketball").

**Managed by:** Admin only.

| Attribute      | Type          | Required | Notes                          |
|----------------|---------------|----------|--------------------------------|
| id             | UUID          | Yes      | Primary key                    |
| name           | String        | Yes      | e.g. "Topps Chrome"            |
| slug           | String        | Yes      | Unique within competition+year, e.g. "series-one"; auto-generated from name |
| isSlugCustom   | Boolean       | Yes      | Default: false; set to true when slug is manually edited                    |
| manufacturerId | UUID          | Yes      | FK → Manufacturer              |
| sportId        | UUID          | Yes      | FK → Sport                     |
| yearId         | UUID          | Yes      | FK → Year                      |
| competitionId  | UUID          | Yes      | FK → Competition               |
| logoUrl        | String \| null| No       | URL to series logo/banner      |
| createdAt      | DateTime      | Yes      |                                |

**Relationships:**
- Belongs to one `Manufacturer`
- Belongs to one `Sport`
- Belongs to one `Year`
- Belongs to one `Competition`
- Has many `Set`

---

### 4.10 Set

**Description:** A specific set of cards within a series (e.g. "Base Set", "Prizm", "Insert Set").

**Managed by:** Admin only.

| Attribute  | Type     | Required | Notes                     |
|------------|----------|----------|---------------------------|
| id         | UUID     | Yes      | Primary key               |
| seriesId   | UUID           | Yes      | FK → Series                                          |
| name       | String         | Yes      | e.g. "Base Set", "Prizm"                             |
| slug       | String         | Yes      | Unique within series, e.g. "base-set"; auto-generated from name |
| isSlugCustom | Boolean      | Yes      | Default: false; set to true when slug is manually edited          |
| logoUrl    | String \| null | No       | URL to set logo                                      |
| createdAt  | DateTime       | Yes      |                           |

**Relationships:**
- Belongs to one `Series`
- Has many `CardDefinition`

---

### 4.11 Year

**Description:** The release year or season of a series. Can represent a single year ("2026") or a season span ("2003-04").

**Managed by:** Admin only.

| Attribute  | Type     | Required | Notes                                        |
|------------|----------|----------|----------------------------------------------|
| id         | UUID     | Yes      | Primary key                                  |
| label      | String   | Yes      | Display string matching pattern `YYYY` or `YYYY-YY` (e.g. "2026", "2003-04"). The forward slash `/` is forbidden — use a hyphen for split seasons. |
| slug       | String   | Yes      | Globally unique, derived directly from label with hyphens preserved, e.g. "2023-24" |
| isSlugCustom | Boolean | Yes    | Default: false; set to true when slug is manually edited |
| startYear  | Int      | Yes      | Numeric start year for sorting               |
| endYear    | Int \| null | No    | Null for single-year seasons                 |
| createdAt  | DateTime | Yes      |                                              |

**Relationships:**
- Has many `Series`

---

### 4.12 Sport

**Description:** A real-world sport category (e.g. Basketball, Ice Hockey, Football).

**Managed by:** Admin only.

| Attribute  | Type     | Required | Notes          |
|------------|----------|----------|----------------|
| id         | UUID           | Yes      | Primary key            |
| name       | String         | Yes      | Unique                 |
| slug       | String         | Yes      | Globally unique, e.g. "ice-hockey"; auto-generated from name |
| isSlugCustom | Boolean      | Yes      | Default: false; set to true when slug is manually edited      |
| logoUrl    | String \| null | No       | URL to sport icon/logo |
| createdAt  | DateTime       | Yes      |                        |

**Relationships:**
- Has many `Series`
- Has many `Competition`
- Has many `Team`
- Has many `Player`

---

### 4.13 Competition

**Description:** A specific league or competition within a sport (e.g. NBA, NHL, Premier League, Olympic Games 2026). Optional link on a Series.

**Managed by:** Admin only.

| Attribute  | Type     | Required | Notes                     |
|------------|----------|----------|---------------------------|
| id         | UUID           | Yes      | Primary key                  |
| sportId    | UUID           | Yes      | FK → Sport                   |
| name       | String         | Yes      | e.g. "NBA", "Premier League" |
| slug       | String         | Yes      | Globally unique, e.g. "nhl"; auto-generated from name |
| isSlugCustom | Boolean      | Yes      | Default: false; set to true when slug is manually edited |
| logoUrl    | String \| null | No       | URL to league/competition logo |
| createdAt  | DateTime       | Yes      |                              |

**Relationships:**
- Belongs to one `Sport`
- Has many `Series`
- Has many `Team` (optional reference)

---

### 4.14 Team

**Description:** A real-world sports team. Linked to a Sport and optionally to a Competition (league). Used as a relational reference on Player records.

**Managed by:** Admin only.

| Attribute     | Type           | Required | Notes                                          |
|---------------|----------------|----------|------------------------------------------------|
| id            | UUID           | Yes      | Primary key                                    |
| name          | String         | Yes      | Unique within sport, e.g. "Chicago Bulls"      |
| slug          | String         | Yes      | Globally unique, e.g. "chicago-bulls"; auto-generated from name |
| isSlugCustom  | Boolean        | Yes      | Default: false; set to true when slug is manually edited         |
| sportId       | UUID           | Yes      | FK → Sport                                     |
| competitionId | UUID \| null   | No       | FK → Competition (the league this team plays in) |
| logoUrl       | String \| null | No       | URL to team logo image                         |
| description   | String \| null | No       | Short free-text description                    |
| createdAt     | DateTime       | Yes      | Auto-set on creation                           |

**Relationships:**
- Belongs to one `Sport`
- Optionally belongs to one `Competition`
- Has many `Player`

---

### 4.15 CardType

**Description:** The type/variant of a card (e.g. Base, Autograph, Relic, Rookie). Admin-managed predefined list.

**Managed by:** Admin only.

| Attribute   | Type     | Required | Notes                                      |
|-------------|----------|----------|--------------------------------------------|
| id          | UUID           | Yes      | Primary key                                |
| name        | String         | Yes      | Unique, e.g. "Autograph", "Relic", "Patch" |
| slug        | String         | Yes      | Globally unique, e.g. "autograph"; auto-generated from name |
| isSlugCustom | Boolean       | Yes      | Default: false; set to true when slug is manually edited     |
| isSystem    | Boolean        | Yes      | Default: false; set to true for the 10 seeded CardTypes. System CardTypes cannot be deleted even if unused. |
| description | String \| null | No       | Short explanation of the type              |
| createdAt   | DateTime | Yes      |                                            |

**Initial seed values:** Base, Rookie, Autograph, Relic, Patch, Refractor, Parallel, Insert, Memorabilia, Short Print

**Relationships:**
- Has many `CardDefinition`

---

## 5. Key Business Rules

- Every user automatically receives exactly one "All" collection upon registration. It cannot be deleted or renamed.
- The "All" collection always contains every OwnedCard belonging to that user — it is maintained automatically by the system and cannot be manually edited.
- An OwnedCard can belong to many Collections simultaneously (many-to-many), but must always also be in the "All" collection.
- A CardDefinition can be owned by multiple users (each gets their own OwnedCard record).
- CardDefinition, Player, Manufacturer, Series, Set, Year, Sport, Competition, and CardType are admin-managed. Regular users cannot create or modify these records.
- Card image display follows a fallback chain: if `OwnedCard.photoFrontUrl` (or `photoBackUrl`) is set, it is shown; otherwise `CardDefinition.photoFrontUrl` (or `photoBackUrl`) is used; otherwise no image is shown. This resolution happens on the frontend — both URLs are returned in the API response.
- All image/logo URLs across every entity (User avatarUrl, Collection coverImageUrl, CardDefinition photoFrontUrl/photoBackUrl, OwnedCard photoFrontUrl/photoBackUrl, Player photoUrl, Manufacturer logoUrl, Sport logoUrl, Competition logoUrl, Series logoUrl, Set logoUrl, Team logoUrl) are cloud storage URLs (S3/R2). Image binary data is never stored in the database.
- A Series belongs to exactly one Manufacturer, one Sport, one Year, and one Competition.
- A card's `rookieFlag` is stored on CardDefinition (it is a property of the card itself, not the user's copy).
- A Player's `teamId` is an optional FK to Team. It reflects the player's current team and is informational — it does not affect card relationships.
- `gradeValue` and `gradingCompany` must either both be set or both be null — a grade without a company or vice versa is invalid.
- `limitation` is a free-text string (e.g. "45/100"), not two separate numeric fields, to accommodate non-standard print run notations.
- A Collection marked `isPublic = true` is visible on the owner's public profile. Private collections are never visible to other users.
- Deleting an OwnedCard removes it from all Collections (cascade delete on CollectionCard join rows).
- Deactivating a User (admin action) prevents login but does not delete their data.
- Every entity form in the admin panel (and the Collection form for users) displays a slug field below the name input. As the admin/user types the name, the slug is auto-generated live (e.g. "Upper Deck" → `upper-deck`). The slug field is editable — the user can override it at any time. Once a slug has been manually edited, auto-generation from the name stops so the custom value is not overwritten.
- **Slug conflict resolution:** if the slug was auto-generated (admin never manually edited it), a numeric suffix is appended automatically and silently — e.g. `upper-deck-2`, `upper-deck-3`. If the slug was manually set by the admin, save is blocked with an inline error: *"This slug is already taken"* — the admin must resolve it explicitly.
- Slug uniqueness scope: globally unique for Sport, Competition, Manufacturer, Year, Team, Player, CardType; unique within series for Set; unique within competition+year for Series; unique within user for Collection.
- The `username` field on User serves as its URL slug — no separate slug field needed.
- CardDefinition has its own `slug` field (unique within its Set). It is auto-generated as `{cardNumber}-{playerSlug}-{cardTypeSlug}` for single-player cards. For multi-player or no-player cards the admin must set a custom slug manually.
- Admins share the same public profile and collection features as regular users. The `ADMIN` role only grants access to `/admin` — it does not create a separate identity or profile.
- **Username is immutable** after registration. It cannot be changed via `/settings` or any admin action. The settings page must not expose a username edit field.
- **Reserved usernames** that cannot be registered: `admin`, `api`, `profile`, `login`, `logout`, `register`, `forgot-password`, `reset-password`, `dashboard`, `collection`, `cards`, `settings`, `health`, `manufacturer`, `team`, `player`, `year`, `sport`, `static`, `_next`, `favicon`. Enforced server-side at registration. New route segments added in future releases must be appended to this list before deployment.
- **Unverified users** (`isEmailVerified = false`) may log in and browse the public catalogue. All write operations (adding OwnedCards, creating/editing/deleting collections, uploading images) are blocked until email is verified — returning HTTP `403` with code `EMAIL_NOT_VERIFIED`. A "Resend verification email" action is always available from the dashboard.
- **User deactivation behaviour:** when an admin deactivates a user, all their Collections with `isPublic = true` are set to `isPublic = false` in the same DB transaction. The user's `tokenVersion` is incremented, immediately invalidating all active JWTs. `GET /profile/{username}` returns HTTP `404` while the account is deactivated. If reactivated, collections do not revert to public automatically — the admin must explicitly re-publish them.
- **Deactivated user profiles** return HTTP `404` (not `403`) to prevent confirming that the account exists. Private collections accessed by non-owners or unauthenticated users also return HTTP `404` (not `403`) to avoid leaking their existence.
- **Public user profile with no public collections** returns HTTP `200` with an empty-state page. Never return `404` for an active user who simply has no public collections.
- **Player → Team sport validation:** `Player.teamId` must reference a Team whose `sportId` matches the Player's `sportId`. Enforced at the API layer (HTTP `422` on violation). The admin Player form dynamically filters the team dropdown to only show Teams in the same sport as the Player. Changing a Player's `sportId` clears `teamId` if the previously selected team belongs to a different sport.
- **Seeded CardTypes are system-protected** (`isSystem = true` on the 10 seed values). System CardTypes cannot be deleted even if no CardDefinitions reference them. Any CardType with at least one referencing CardDefinition cannot be deleted regardless — API returns `409` with the count of affected records.
- **Duplicate OwnedCards are intentional.** A user may own multiple OwnedCards referencing the same CardDefinition. There is no unique constraint on `(userId, cardDefinitionId)`. The CardDefinition detail page displays "You own N copies" when count ≥ 1. Adding another copy shows a confirmation prompt before creating the record.
- **CardDefinition slug becomes locked** (read-only in the admin form) once at least one OwnedCard references the CardDefinition. The form shows the lock state and owned count. Unlocking requires an explicit checkbox confirmation. When a slug changes, a 301 redirect is registered from the old URL to the new URL. Player and CardType slug renames trigger a background job that recomputes all derived CardDefinition slugs and registers old→new 301 redirects.
- **rookieFlag is purely informational** — it is not automatically cleared when `cardType` changes. An admin may combine `rookieFlag = true` with any card type (e.g., a rookie autograph is valid). No automatic coupling between `rookieFlag` and `cardType` is enforced.
- **Slug sanitization is server-side.** Whether auto-generated or manually entered, all slug values are normalised before persistence: lowercased, spaces and underscores converted to hyphens, non-ASCII characters transliterated to ASCII equivalents, characters outside `[a-z0-9-]` removed, leading/trailing hyphens stripped, consecutive hyphens collapsed. The normalised result is shown as a live preview in all admin forms.
- **Limitation field normalisation:** the `limitation` value on OwnedCard is trimmed of whitespace server-side and spaces around `/` are removed (e.g. `"1 / 1"` → `"1/1"`). The recommended format is `{numerator}/{denominator}` (e.g. `"45/100"`, `"1/1"`). The field is self-reported and not validated against any authoritative print run — the UI shows a disclaimer: "Print run is self-reported and not independently verified."
- **Empty Series and Sets are hidden from public browse.** A Series is only visible in the browse hierarchy if it contains at least one Set. A Set is only visible if it contains at least one CardDefinition. Visibility is computed at query time — no published/draft status field is needed. Empty entities remain fully visible in the admin panel with a zero-count warning badge.

---

## 6. Feature List

### Cards

| Feature | Description | Version |
|---------|-------------|---------|
| Browse card catalogue | Browse/search the global CardDefinition catalogue with faceted filters | v1 |
| Add card to collection | User selects a CardDefinition and creates an OwnedCard with personal metadata | v1 |
| Edit owned card | Update grade, notes, photos, limitation, rookie flag on an OwnedCard | v1 |
| Delete owned card | Remove an OwnedCard and cascade-remove from all collections | v1 |
| Upload card photos | Upload optional front/back photos; stored in cloud storage | v1 |
| Filter & search cards | Filter by sport, player, series, year, card type, rookie flag, grade; text search by player/card name | v1 |
| Sort cards | Sort by date added, card number, player name | v1 |

### Collections

| Feature | Description | Version |
|---------|-------------|---------|
| Auto "All" collection | Created on registration, always in sync | v1 |
| Create custom collection | User creates a named collection | v1 |
| Edit/delete collection | Rename or delete a custom collection | v1 |
| Add card to collection | Assign an OwnedCard to one or more collections | v1 |
| Remove card from collection | Remove from a specific collection without deleting the OwnedCard | v1 |
| Make collection public/private | Toggle visibility for the public profile | v1 |

### Users & Profile

| Feature | Description | Version |
|---------|-------------|---------|
| Register | Email + password registration with email verification | v1 |
| Login / Logout | JWT-based session | v1 |
| Password reset | Email-link password reset flow | v1 |
| Public profile | Username, registration date, public collections | v1 |
| View other user's public collections | Browse public collections of any user | v1 |

### Admin

| Feature | Description | Version |
|---------|-------------|---------|
| Admin panel at /admin | Protected section for ADMIN role users | v1 |
| Manage Teams | CRUD for team records | v1 |
| Manage Players | CRUD for player records | v1 |
| Manage Manufacturers | CRUD for manufacturer records | v1 |
| Manage Sports | CRUD for sport records | v1 |
| Manage Competitions | CRUD for competition records | v1 |
| Manage Years | CRUD for year records | v1 |
| Manage Series | CRUD for series records | v1 |
| Manage Sets | CRUD for set records | v1 |
| Manage CardTypes | CRUD for card type records | v1 |
| Manage CardDefinitions | CRUD for the global card catalogue | v1 |
| Import Players via CSV | Bulk-import player records from a CSV file; row-level validation with error report | v1 |
| Import Series & Sets via CSV | Bulk-import series and set records; references Manufacturer, Sport, Year by name | v1 |
| Import CardDefinitions via CSV | Bulk-import card definitions; references Set, CardType, Players by name/number | v1 |
| Manage Users | View users, activate/deactivate accounts | v1 |
| Health check dashboard | `/admin/health` — live status of all services with auto-refresh | v1 |

### Export

| Feature | Description | Version |
|---------|-------------|---------|
| CSV export | Export user's full collection to CSV. Collections ≤ 500 cards: synchronous streaming response. Collections > 500 cards: async job — POST returns `202` with `{ jobId }`; user polls for completion; download link (pre-signed S3 URL) expires after 24 hours. | v1 |

---

## 7. Admin Panel

The `/admin` section is a protected area of the Next.js app. Access requires `role = ADMIN`.

### Screens Required

| Screen | Path | Functionality |
|--------|------|---------------|
| Dashboard | `/admin` | Overview stats (total users, total cards, catalogue size) |
| Teams | `/admin/teams` | List, create, edit, delete teams (filterable by sport/competition) |
| Players | `/admin/players` | List, create, edit, delete players |
| Manufacturers | `/admin/manufacturers` | List, create, edit, delete manufacturers |
| Sports | `/admin/sports` | List, create, edit, delete sports |
| Competitions | `/admin/competitions` | List, create, edit, delete competitions |
| Years | `/admin/years` | List, create, edit, delete years |
| Series | `/admin/series` | List, create, edit, delete series (with sport/manufacturer/year filters) |
| Sets | `/admin/sets` | List, create, edit, delete sets (grouped by series) |
| Card Types | `/admin/card-types` | List, create, edit, delete card types |
| Card Catalogue | `/admin/cards` | List, create, edit, delete CardDefinitions |
| CSV Import | `/admin/import` | Upload CSV for Players, Series/Sets, or CardDefinitions; shows per-row validation errors before confirming insert |
| Users | `/admin/users` | List all users, view details, activate/deactivate |
| Health Check | `/admin/health` | Live status of PostgreSQL, S3/R2, Resend (email), API version and environment; auto-refreshes every 60 s; manual re-run button |

All list screens should support pagination, basic text search, and sorting.

All create/edit forms must include a **slug field** below the primary name input. The slug auto-generates from the name as the user types; once manually edited it locks and no longer follows the name. Inline validation shows conflicts before save.

---

## 8. API Surface (High-Level)

All routes are prefixed with `/api`. Auth routes are public; all others require a valid JWT. Admin routes additionally require `role = ADMIN`.

| Resource Group | Path | Operations | Auth |
|----------------|------|------------|------|
| Health | `/api/health` | GET — returns status + response time for all services (DB, storage, email); used by uptime monitors | Public |
| Auth | `/api/auth` | register, login, logout, refresh, password-reset | Public |
| Users | `/api/users` | get profile, update own profile | USER |
| Public Profiles | `/api/profiles/:username` | get public profile + public collections | Public |
| Owned Cards | `/api/owned-cards` | list (mine), create, get, update, delete | USER |
| Collections | `/api/collections` | list (mine), create, get, update, delete | USER |
| Collection Cards | `/api/collections/:id/cards` | list, add card, remove card | USER |
| Export | `/api/exports` | `POST` — initiate async CSV export; returns `202 { jobId, statusUrl }`. `GET /api/exports/{jobId}` — poll status (`pending` / `processing` / `complete` / `failed`). `GET /api/exports/{jobId}/download` — returns pre-signed S3 URL when complete (expires 24 h). | USER |
| Card Catalogue | `/api/catalogue` | list, get | Public |
| Sports | `/api/sports` | list, get | Public |
| Competitions | `/api/competitions` | list, get | Public |
| Manufacturers | `/api/manufacturers` | list, get | Public |
| Years | `/api/years` | list, get | Public |
| Teams | `/api/teams` | list, get | Public |
| Players | `/api/players` | list, get | Public |
| Series | `/api/series` | list, get | Public |
| Sets | `/api/sets` | list, get | Public |
| Admin Teams | `/api/admin/teams` | list, create, get, update, delete | ADMIN |
| Players | `/api/admin/players` | list, create, get, update, delete | ADMIN |
| Manufacturers | `/api/admin/manufacturers` | list, create, get, update, delete | ADMIN |
| Sports | `/api/admin/sports` | list, create, get, update, delete | ADMIN |
| Competitions | `/api/admin/competitions` | list, create, get, update, delete | ADMIN |
| Years | `/api/admin/years` | list, create, get, update, delete | ADMIN |
| Series | `/api/admin/series` | list, create, get, update, delete | ADMIN |
| Sets | `/api/admin/sets` | list, create, get, update, delete | ADMIN |
| Card Types | `/api/admin/card-types` | list, create, get, update, delete | ADMIN |
| Card Definitions | `/api/admin/catalogue` | list, create, get, update, delete | ADMIN |
| CSV Import | `/api/admin/import/:entity` | POST CSV → validate (dry-run) or commit; returns row-level error report | ADMIN |
| Admin Users | `/api/admin/users` | list, get, activate, deactivate | ADMIN |
| File Upload | `/api/upload` | POST — get pre-signed S3/R2 URL for direct upload (card photos, avatars, logos, covers) | USER/ADMIN |

---

## 9. API Conventions

### Response envelope

All API responses use a consistent JSON shape:

```jsonc
// Single resource
{ "data": { ... } }

// List resource
{ "data": [...], "meta": { "total": 120, "page": 1, "limit": 20, "totalPages": 6 } }

// Error
{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable message", "details": [...] } }
```

### Pagination

All list endpoints accept query params `?page=1&limit=20`. Default limit: `20`. Maximum limit: `100`.

**Boundary rules:**
- `limit` must be an integer between `1` and `100` inclusive. Values outside this range return `400 INVALID_PAGINATION`.
- `page` must be an integer ≥ `1`. Values below `1` return `400 INVALID_PAGINATION`.
- `limit=0` is explicitly rejected — Prisma interprets 0 as no limit and triggers full-table scans.
- A page number beyond the total record count returns HTTP `200` with `{ "data": [], "meta": { "page": N, "limit": N, "total": N, "totalPages": N } }`. Never return `404` for an empty page.

### File Upload Limits

All image uploads (card photos, avatars, logos, covers) are subject to:

| Constraint | Value |
|------------|-------|
| Maximum file size | 5 MB per file |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp` |

Limits are enforced via S3/R2 pre-signed URL policy conditions (`ContentLengthRange`, `ContentType`). The client validates size and type before requesting a pre-signed URL. The API rejects pre-sign requests that would exceed these constraints before generating the URL.

---

### Seed data on first deploy

| Entity | Values |
|--------|--------|
| Admin user | Credentials sourced from environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) |
| Sports | Basketball, Ice Hockey, Football, Baseball, Soccer, Tennis |
| CardTypes | Base, Rookie, Autograph, Relic, Patch, Refractor, Parallel, Insert, Memorabilia, Short Print |

### Environment variables required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (access tokens) |
| `JWT_EXPIRES_IN` | Access token expiry, e.g. `15m` |
| `JWT_REFRESH_SECRET` | Separate signing secret for refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry, e.g. `30d` |
| `JWT_SECRET_PREVIOUS` | Previous JWT secret — present during rotation window only; remove after one full access token lifetime |
| `RESEND_API_KEY` | Resend email service key |
| `EMAIL_FROM` | Sender address, e.g. `noreply@domain.com` |
| `STORAGE_PROVIDER` | Storage backend: `s3` (AWS S3) or `r2` (Cloudflare R2) — determines which S3_* variables are required at startup |
| `S3_BUCKET` | Storage bucket name |
| `S3_REGION` | Storage region (required for AWS S3) |
| `S3_ACCESS_KEY_ID` | Storage access key |
| `S3_SECRET_ACCESS_KEY` | Storage secret |
| `S3_ENDPOINT` | Custom endpoint URL — required only when `STORAGE_PROVIDER=r2` |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend — validated at `next build` time |
| `ADMIN_EMAIL` | Seed admin email |
| `ADMIN_PASSWORD` | Seed admin password |

---

## 10. Frontend URL Structure

### Public — no auth required

```
# Auth
/login
/register
/forgot-password
/reset-password

# Sport hierarchy
/{sportSlug}                                                          Sport overview
/{sportSlug}/{competitionSlug}                                        Competition overview
/{sportSlug}/{competitionSlug}/{yearSlug}                             Year within competition
/{sportSlug}/{competitionSlug}/{yearSlug}/{seriesSlug}                Series overview
/{sportSlug}/{competitionSlug}/{yearSlug}/{seriesSlug}/{setSlug}      Set + card list
/{sportSlug}/{competitionSlug}/{yearSlug}/{seriesSlug}/{setSlug}/{cardNumber}-{playerSlug}-{cardTypeSlug}   Card detail

# Standalone entity pages
/manufacturer/{manufacturerSlug}
/team/{teamSlug}
/player/{playerSlug}
/year/{yearSlug}

# Public user profiles
/profile/{username}
/profile/{username}/collection/{collectionSlug}
```

### Authenticated

```
/dashboard
/collection                     "All" collection
/collection/{collectionSlug}    Custom collection
/cards                          Browse global catalogue
/settings
```

### Admin — requires ADMIN role

```
/admin
/admin/sports                   + /new, /{slug}/edit
/admin/competitions             + /new, /{slug}/edit
/admin/manufacturers            + /new, /{slug}/edit
/admin/years                    + /new, /{slug}/edit
/admin/teams                    + /new, /{slug}/edit
/admin/players                  + /new, /{slug}/edit
/admin/series                   + /new, /{slug}/edit
/admin/sets                     + /new, /{slug}/edit
/admin/card-types               + /new, /{slug}/edit
/admin/cards                    + /new, /{slug}/edit
/admin/users                    + /{username}
/admin/import
/admin/health
```

### Slug composition rules

| Entity | URL segment pattern | Example |
|---|---|---|
| Sport | `{name}` | `hockey` |
| Competition | `{name}` | `nhl` |
| Year | `{label}` | `2023-24` |
| Series | `{name}` | `series-one` |
| Set | `{name}` | `base-set` |
| Card | `{cardNumber}-{playerSlug}-{cardTypeSlug}` | `DZ32-ondrej-palat-dazzlers-green` |
| Manufacturer | `{name}` | `upper-deck` |
| Team | `{name}` | `tampa-bay-lightning` |
| Player | `{fullName}` | `martin-st-louis` |
| Year (standalone) | `{label}` | `2023-24` |
| Collection | `{name}` | `hc-ocelari-trinec` |

---

## 11. Development Rules

### Process

- **One feature at a time** — never start a new feature before the current one is complete and tested.
- **Check code after every change** — run linter, type check, and relevant tests before marking anything done.
- **Ask when unclear** — if any requirement is ambiguous or missing, ask before implementing.
- **Keep PRs small and focused** — one feature or fix per pull request; never bundle unrelated changes.
- **API contract first** — define DTOs and response shapes before implementing the frontend side.

### Testing

- **Write tests for every new feature** — unit tests for business logic, integration tests for all API endpoints.
- The health check endpoint and admin health page must be covered by automated tests.

### Code Quality

- **TypeScript strict mode** — no `any` types; all functions must have explicit return types.
- **No secrets in code** — all credentials and config via environment variables; `.env` files are never committed.
- **Prisma migrations only** — never edit the database directly; all schema changes go through `prisma migrate dev`.
- **Seed script idempotency** — the seed script must use create-if-not-exists logic for all seeded data. It must never update an existing admin user's `passwordHash`. Implementation: `prisma.user.upsert({ where: { email }, create: { ...fields }, update: {} })` — the empty `update: {}` ensures no overwrite. A warning is logged if the user already exists. The same pattern applies to all seeded reference data (Sports, CardTypes).
- **S3/R2 cleanup on entity deletion** — when any entity with associated image URLs is deleted, queue S3/R2 object deletions via the `s3-cleanup` BullMQ queue. Never block the DB delete transaction on S3 operations. The job retries up to 5× with exponential backoff. After all retries are exhausted, the orphaned key is moved to an `orphan-review/` S3 prefix for manual inspection. A daily cron job reconciles DB image URL references against S3 object listings and flags orphans.

### Conventions

- **Naming:** `camelCase` for variables/functions, `PascalCase` for types/interfaces/components, `kebab-case` for files and URLs.
- **Localisation:** maintain both `en` and `cs` locale files in next-intl from day one; `cs` may mirror `en` initially but both files must always be in sync.

---

## 12. Out of Scope (v1)

The following were explicitly decided against for the initial release:

- **OAuth / Social login** — Google, Apple, GitHub etc. Email + password only.
- **Social features** — following users, likes, comments, activity feeds.
- **Card trading or selling** — no offer/trade system between users.
- **Market value / price tracking** — no purchase price fields, no external pricing API integration.
- **Multilingual UI** — English only in v1. next-intl is wired up but only the `en` locale is populated. Database entity names remain single-language strings until a second locale is needed.
- **PDF export** — CSV only.
- **Mobile native app** — responsive web only.
- **Full-text search** — faceted filters and name search only. No Elasticsearch.
- **Nested collections** — flat list of collections per user, no folders or hierarchy.
- **Card condition field** (Mint, Near Mint etc.) — grade value + grading company cover graded cards; ungraded cards use notes for condition.
- **Automated market data integrations** (eBay, PSA Population Report, etc.)
- **Notifications** — no email or in-app notifications beyond auth flows.
