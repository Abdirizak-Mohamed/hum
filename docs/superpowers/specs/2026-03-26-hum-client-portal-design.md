# hum-client-portal — Design Spec

## Overview

A mobile-first web portal for takeaway clients. Handles the full client lifecycle: self-service signup and intake, operator-reviewed onboarding, social account connection via Ayrshare OAuth, content preview, photo upload, and account management. Separate app from the operator dashboard — different users, different UX priorities.

## Decisions

- **Architecture:** Next.js 15 App Router, mirroring hum-dashboard patterns (Tailwind, React Query, BFF API routes, hum-core direct access)
- **Auth:** Separate `portal_users` table with email + password (bcrypt). HTTP-only cookie with portalUserId. No NextAuth for MVP — simple cookie auth like the dashboard. **Known MVP limitation:** cookie contains raw portalUserId with no HMAC signing — add signing before any real-world deployment.
- **File storage:** Local filesystem (`media/uploads/`). No S3/R2 for MVP.
- **Billing:** Mock link to Stripe portal. No real Stripe integration for MVP.
- **Metrics:** Deferred. No performance metrics aggregation for MVP.
- **Reviews:** Placeholder UI only. No reviews data in hum-core yet (post-MVP: hum-engagement).
- **Social credentials:** Ayrshare OAuth connect flow embedded in the portal post-approval. If this proves too complex, fall back to operator-managed connect links.
- **Shared database:** Both the portal (port 3200) and dashboard (port 3100) access the same SQLite file. SQLite WAL mode supports concurrent readers + single writer. Avoid long-held write transactions.

## Schema Changes (hum-core)

All timestamps use `INTEGER` with `{ mode: 'timestamp_ms' }` to match existing hum-core conventions (millisecond epoch integers, surfaced as Date objects by Drizzle).

### portal_users

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (PK) | UUID |
| clientId | TEXT (FK → clients, nullable) | Null until operator approves and client record is created |
| email | TEXT (unique) | Login identifier |
| passwordHash | TEXT | bcrypt hash |
| name | TEXT | Contact name |
| status | TEXT | `pending_intake` / `pending_approval` / `active` / `suspended` |
| createdAt | INTEGER (timestamp_ms) | |
| updatedAt | INTEGER (timestamp_ms) | |
| lastLoginAt | INTEGER (timestamp_ms, nullable) | Updated on each login |

### client_uploads

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (PK) | UUID |
| portalUserId | TEXT (FK → portal_users) | Who uploaded it |
| filename | TEXT | Original filename |
| storagePath | TEXT | Local path: `media/uploads/{portalUserId}/{id}.{ext}` |
| mimeType | TEXT | image/jpeg, image/png, etc. |
| sizeBytes | INTEGER | File size |
| category | TEXT | `food_photo` / `menu` / `logo` / `interior` / `other` |
| status | TEXT | `pending` / `used` / `archived` |
| createdAt | INTEGER (timestamp_ms) | |
| updatedAt | INTEGER (timestamp_ms) | |

Note: No `clientId` column. Uploads are always queried via `portalUserId`. After approval, the content engine can join through `portal_users.clientId` to find a client's uploaded photos.

### intake_submissions

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (PK) | UUID |
| portalUserId | TEXT (FK → portal_users, unique) | One submission per user |
| businessName | TEXT | |
| address | TEXT (nullable) | |
| phone | TEXT (nullable) | |
| openingHours | JSON | `Record<string, string>` |
| menuData | TEXT | Required at submission time. Either pasted menu text or text extracted from uploaded menu photos. |
| menuUploadIds | JSON | Array of client_upload IDs for menu photos/PDFs |
| foodPhotoUploadIds | JSON | Array of client_upload IDs |
| socialLinks | JSON | `{instagram?: string, facebook?: string, tiktok?: string, google_business?: string}` |
| brandPreferences | TEXT (nullable) | Free-text notes |
| status | TEXT | `draft` / `submitted` / `approved` / `rejected` |
| submittedAt | INTEGER (timestamp_ms, nullable) | |
| reviewedAt | INTEGER (timestamp_ms, nullable) | |
| reviewNotes | TEXT (nullable) | Operator notes on approval/rejection |
| createdAt | INTEGER (timestamp_ms) | |
| updatedAt | INTEGER (timestamp_ms) | |

Each table gets the standard hum-core treatment: Drizzle schema, Zod validation schemas (create/update), repository with CRUD methods, model class.

### Upload Constraints

- Max file size: 10MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/heic`, `application/pdf` (for menus)
- Max uploads per intake: 20 food photos, 5 menu files

## Client Journey

### Phase 1 — Signup & Intake (public)

1. `/signup` — email, password, name → `portal_user` created with status `pending_intake`
2. `/intake` — multi-step form (saved as draft between steps):
   - Business details (name, address, phone, hours)
   - Menu (upload photos/PDF and/or paste text)
   - Food photos (upload 5-10)
   - Social profile URLs (informational — for operator review)
   - Brand preferences (optional free-text)
3. Submit → intake status becomes `submitted`, portal_user status becomes `pending_approval`
4. Client sees holding page: "We're setting things up for you"

### Phase 2 — Operator Review (dashboard)

5. New submission surfaces in the operator dashboard (joining `portal_users` + `intake_submissions` to show business name, email, uploaded photos, etc.)
6. Operator reviews, approves → triggers the approval flow:
   a. Map intake_submission + portal_user data into the onboarding pipeline's `IntakeData` shape:
      - `businessName` → from intake_submissions
      - `email` → from portal_users
      - `menu` → from intake_submissions.menuData
      - `socialAccounts` → empty array (connected later via Ayrshare OAuth)
      - `planTier`, `cuisineType`, `latitude`, `longitude`, `deliveryPlatforms` → operator fills in during approval or left as defaults
   b. Check if a client with this email already exists (handles reject-then-reapprove edge case). If so, reuse the existing client record instead of creating a new one.
   c. Run the existing onboarding pipeline (`startOnboarding(db, intakeData)`) — returns an `OnboardingSession`
   d. Extract `session.clientId` from the returned session
   e. Update `portal_user.clientId = session.clientId`
   f. Set `portal_user.status` → `active`
7. If operator rejects: set intake status to `rejected`, set portal_user status back to `pending_intake`, populate `reviewNotes`. Client can see feedback and resubmit.

### Phase 3 — Social Connect (portal, post-approval)

Ayrshare uses **one profile per client** (not per platform). A single profile connects to multiple social platforms.

8. Client logs in → portal shows "Connect your accounts" prompt on `/connect`
9. Client clicks platform button → portal calls `POST /api/connect/[platform]`:
   a. Check if client already has an Ayrshare profile (look for any `social_accounts` row with `ayrshareProfileKey` for this client). If not, call `ayrshare.createProfile({ title: businessName })` → returns `{ profileKey: string }`. Reuse existing profileKey if found.
   b. Calls `ayrshare.getConnectUrl(profileKey, platform, callbackUrl)` → returns `{ url: string }`
   c. Redirects client to the Ayrshare-hosted OAuth page
10. Client authorizes on Ayrshare → Ayrshare redirects back to `GET /api/connect/callback?profileKey=X&platform=Y&status=success`
11. Callback route creates a `social_accounts` row with `status: 'connected'`, the `ayrshareProfileKey`, and `platformAccountId` from the callback params. Redirects to `/connect` with success message.
12. Once connected, accounts show as "connected" on the account page

Note: `social_accounts` rows are only created on successful callback, not before — this avoids the `platformAccountId` NOT NULL constraint issue. If the Ayrshare callback does not provide `platformAccountId`, use the profileKey as a placeholder and update it later via `ayrshare.getProfiles()`.

### Phase 4 — Active Portal

13. Content preview — upcoming/recent scheduled posts
14. Photo upload — submit new food photos
15. Account — plan, connected socials (with reconnect), mock billing link

## Middleware & Auth

The portal middleware requires a DB lookup on every request to check `portal_user.status` (unlike the dashboard which just checks a cookie value). Since Next.js middleware runs on the Edge runtime by default and `better-sqlite3` requires Node.js, the status-based routing is enforced in a **server-side layout wrapper** rather than Next.js middleware. The middleware only handles cookie presence (logged in vs. not).

| portal_user.status | Accessible routes |
|--------------------|-------------------|
| Not logged in | `/signup`, `/login` |
| `pending_intake` | `/intake` |
| `pending_approval` | `/waiting` (holding page) |
| `active` | `/`, `/content`, `/upload`, `/account`, `/connect` |
| `suspended` | `/suspended` (account suspended page) |

On rejection: `portal_user.status` reverts to `pending_intake` so the client can edit and resubmit their intake form.

## Pages

| Route | Purpose | Auth |
|-------|---------|------|
| `/signup` | Registration form | Public |
| `/login` | Login form | Public |
| `/intake` | Multi-step intake form | `pending_intake` |
| `/waiting` | "We're reviewing" holding page | `pending_approval` |
| `/suspended` | Account suspended message | `suspended` |
| `/` | Dashboard home — content preview + upload CTA | `active` |
| `/content` | Full content list/carousel | `active` |
| `/upload` | Photo upload page | `active` |
| `/account` | Plan, socials, billing link | `active` |
| `/connect` | Ayrshare OAuth connect flow | `active` |

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/signup` | POST | Create portal_user |
| `/api/auth/login` | POST | Validate creds, set cookie |
| `/api/auth/logout` | POST | Clear cookie |
| `/api/intake` | GET/PUT | Read/save intake draft. GET returns full upload metadata (thumbnails, filenames, sizes) by joining client_uploads, not just ID arrays. |
| `/api/intake/submit` | POST | Submit for review |
| `/api/upload` | POST | Upload photos (multipart, max 10MB, JPEG/PNG/HEIC/PDF) |
| `/api/upload` | GET | List user's uploads, filterable by category. Offset-based pagination: `?page=1&limit=20` |
| `/api/content` | GET | Client's content items (clientId from session, status: scheduled/posted, ordered by scheduledAt). Offset-based pagination: `?page=1&limit=20` |
| `/api/account` | GET | Plan, social accounts, brand profile |
| `/api/connect/[platform]` | POST | Create Ayrshare profile + generate connect URL, redirect to OAuth |
| `/api/connect/callback` | GET | Ayrshare OAuth callback — update social_accounts status, redirect to /connect |

## Ayrshare Integration Changes

New methods added on a **new `SocialConnectClient` interface** (not on the existing `SocialClient`) to avoid breaking existing consumers (hum-onboarding, hum-content-engine). `AyrshareProvider` implements both interfaces. A new `MockAyrshareConnectProvider` provides the mock:

```typescript
// Create a new Ayrshare profile for a client
createProfile(input: { title: string }): Promise<{ profileKey: string }>
// Ayrshare API: POST /profiles

// Get the hosted OAuth connect URL for a specific platform
getConnectUrl(profileKey: string, platform: Platform, callbackUrl: string): Promise<{ url: string }>
// Ayrshare API: GET /profiles/{profileKey}/connect?platform={platform}&callbackUrl={callbackUrl}

// (existing) getProfiles, schedulePost, deletePost unchanged
```

Mock implementations return fake profileKeys and localhost callback URLs.

The exact Ayrshare API shape may differ from the above — the implementer should consult Ayrshare's docs and adjust. The key contract is: create a profile, get a connect URL, handle the callback.

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 15 (App Router) |
| React | 19 |
| Styling | Tailwind CSS |
| State | React Query (TanStack) |
| Icons | Lucide React |
| DB access | BFF API routes → hum-core repos directly |
| Auth | Email + bcrypt password → HTTP-only cookie with portalUserId |
| File upload | Multipart form → API route writes to local `media/uploads/` |
| Password hashing | bcrypt |
| Port | 3200 |

## Mobile-First UI

80%+ of clients will access on their phones. Design principles:

- **No sidebar.** Top nav with business name + hamburger menu. All content stacks vertically.
- **Intake form:** One field/section per step. Big tap targets. Progress bar. Camera opens directly on mobile for photo uploads.
- **Home page (`/`):** Single scrollable page — upcoming posts (horizontal scroll cards) + prominent "Upload Photos" CTA + quick link to Account.
- **Content page:** Grid of post cards. Filter tabs: Upcoming / Posted. Thumbnail, caption snippet, platform icons, date. View only — no editing. Paginated (20 per page).
- **Upload page:** Big drop zone / camera button. Previously uploaded photos as grid with status badges.
- **Account page:** Stacked sections — plan info, connected socials with status dots + reconnect buttons, mock billing link.
- **Connect page:** Platform list with connect/connected states.

## Changes to Other Packages

### hum-core
- New Drizzle schemas: `portalUsers`, `clientUploads`, `intakeSubmissions`
- New repositories: `portalUserRepo`, `clientUploadRepo`, `intakeSubmissionRepo`
- New Zod validation schemas (create/update for each)
- New migration file
- Export all new types and repos from index.ts

### hum-integrations (Ayrshare)
- Add `createProfile(input: { title: string })` to `SocialClient` interface + `AyrshareProvider`
- Add `getConnectUrl(profileKey: string, platform: Platform, callbackUrl: string)` — returns `{ url: string }`
- Add mock implementations for both new methods

### hum-dashboard
- Add intake review surface — pending submissions for operator to approve/reject
- Review surface joins portal_users + intake_submissions to display business name, email, uploaded photos, menu data
- On approval: operator can set planTier and other optional fields, then triggers onboarding pipeline
- On rejection: operator enters reviewNotes, portal_user reverts to pending_intake
- Could be a new tab on Clients page or a new Intake page

### pnpm-workspace.yaml
- Add `hum-client-portal` to workspace list

## Dependencies

- `hum-core` (workspace) — all repos including new portal_users, client_uploads, intake_submissions
- `bcrypt` / `bcryptjs` — password hashing
- Same Tailwind/React Query/Lucide stack as dashboard

## Depended On By

- None (leaf node)
