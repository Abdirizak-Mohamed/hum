# hum-dashboard — Design Specification

## Overview

The operator's command centre. An internal dashboard for 1-2 people managing the entire fleet of clients. It is an exception-handler, not a task manager — if the operator spends significant time in it, the automation has a problem.

## Architecture

**Pattern:** Lean BFF — Next.js App Router with API routes importing hum-core repositories directly. No service layer, no separate API server. Single process, single deploy.

```
Browser (React + TanStack Query, 30s auto-poll)
    │
    ▼
Next.js App Router
├── Pages (Server Component shells + Client Component interactivity)
├── API Routes (import hum-core repos directly)
└── hum-core (workspace dependency — DB, repositories, types)
```

**Key decisions:**

1. **BFF over separate API** — API routes import hum-core directly. Simplest path, no network hops. The client portal will need its own BFF later; that's fine.
2. **System-level issues only** — "Issues" page replaces the full Escalation Queue. Scoped to failed posts, expired tokens, and content generation errors. Engagement-based escalations (reviews, DMs) deferred until hum-engagement is built.
3. **Env-var password auth** — Simple HTTP-only cookie auth. Operator enters password from `DASHBOARD_PASSWORD` env var. No NextAuth.js, no OAuth for MVP.
4. **Media proxy route** — `/api/media/[...path]` streams generated images from local storage. Keeps file paths private, works regardless of storage location.
5. **React Query auto-polling** — `refetchInterval: 30000` on all queries. Dashboard feels alive without SSE complexity.
6. **Functional-first UX** — Standard click-based UI with shadcn/ui components. No keyboard shortcuts for MVP.

## Pages

### 1. Fleet Overview (`/`)

Landing page. Operator checks in, sees status, leaves.

**Layout:**
- **Status bar** — four large numbers: Active (green), Issues (amber), Onboarding (blue), Paused (grey). Derived from `clientRepo.list()` grouped by client status.
- **Two-column middle:**
  - Left: System Health — content pipeline status, social connection count, token health, generation failure count. Each line has a green/amber/red dot.
  - Right: Recent Issues — latest 2-3 problems with severity indicator and timestamp. Links to Issues page.
- **Upcoming content strip** — next 4 scheduled posts as thumbnail cards (client name, platform, time). Links to Content Preview.

**Data:** `clientRepo.list()`, `contentItemRepo.list()`, `socialAccountRepo.list()` — aggregated in `/api/fleet/stats`.

### 2. Clients List (`/clients`)

Searchable, filterable table of all clients.

**Layout:**
- **Search bar** — client-side filtering by name or email.
- **Status filter tabs** — All, Active, Issues, Onboarding, Paused (with counts).
- **Table columns:** Client (name + location + email), Plan tier, Connected Platforms (expired tokens struck through), Scheduled content count, Status badge.
- Clicking a row navigates to `/clients/[id]`.
- Paused clients visually dimmed.

**Data:** `clientRepo.list()` enriched with social account and content item counts. For MVP (<50 clients), fetch all and filter client-side.

### 3. Client Detail (`/clients/[id]`)

Everything about one client.

**Layout:**
- **Header bar** — client name, status badge, plan tier, contact info, "Pause Client" button.
- **Left column:**
  - Brand Profile — voice guide, key selling points, content themes (tags), hashtag strategy.
  - Connected Platforms — each social account with connection status and platform account ID.
- **Right column:**
  - Onboarding Progress — vertical step tracker (create client → process menu → generate brand profile → setup social accounts → trigger content generation). Only shown for clients in onboarding.
  - Recent Content — last 5 content items with thumbnail, caption preview, platform, status badge.

**Data:** `clientRepo.getById()`, `brandProfileRepo.getByClientId()`, `socialAccountRepo.list({ clientId })`, `contentItemRepo.list({ clientId, limit: 5 })`, `onboarding_sessions` table (by client_id).

### 4. Content Preview (`/content`)

Browse upcoming scheduled content across all clients.

**Layout:**
- **Filter bar** — dropdowns for client, platform, time range (24h / 7d / 30d). Total count displayed.
- **Timeline view** — posts grouped by date. Each post card shows:
  - Thumbnail (actual generated image via `/api/media/`)
  - Client name, platform badge, content type badge, scheduled time
  - Caption preview (truncated)
  - Actions: Preview (full modal), Pause (reverts to draft), Delete

**Preview modal:** Full-size image + complete caption + hashtags + CTA. Shown when "Preview" is clicked.

**Data:** `contentItemRepo.list({ status: 'scheduled', dateRange })` via `/api/content`.

### 5. Issues (`/issues`)

System-level problems requiring operator attention. Primary work surface for MVP.

**Layout:**
- **Filter tabs** — All, Failed Posts, Expired Tokens, Gen Errors (with counts).
- **Issue cards** — each card shows:
  - Severity-colored left border (red: expired token, amber: failed post / expiring token, purple: gen error)
  - Category badge, client name, description, timestamp
  - Contextual action buttons

**Issue types and actions:**

| Type | Border | Actions |
|------|--------|---------|
| Token Expired | Red | Reconnect, Pause Client, Dismiss |
| Token Expiring Soon | Amber | Refresh Token, Snooze 24h |
| Failed Post | Amber | Retry, View Posts, Dismiss |
| Content Gen Error | Purple | Retry, Skip Post, Dismiss |

**Data:** Aggregated from `contentItemRepo.list({ status: 'failed' })` and `socialAccountRepo.list({ status: ['expired', 'disconnected'] })` via `/api/issues`. No new tables — issues are derived from existing data. "Dismiss" sets a `dismissedAt` timestamp on the record.

## Shared Layout

Sidebar navigation with 4 items + auth controls:

- **hum** (logo/brand)
- Fleet Overview (`/`)
- Clients (`/clients`)
- Content (`/content`)
- Issues (`/issues`) — with badge showing active issue count, auto-polled every 30s
- Logout button at bottom

Sidebar is a server component. Issue badge is a client component with its own polling query.

## API Routes

| Route | Method | Purpose | Data Source |
|-------|--------|---------|-------------|
| `POST /api/auth/login` | POST | Validate password, set HTTP-only cookie | env var |
| `POST /api/auth/logout` | POST | Clear cookie | — |
| `GET /api/clients` | GET | List all clients with status | `clientRepo.list()` |
| `GET /api/clients/[id]` | GET | Single client + brand profile + socials + onboarding | Multiple repos |
| `PATCH /api/clients/[id]` | PATCH | Update client (pause/unpause) | `clientRepo.update()` |
| `GET /api/content` | GET | List content items (filterable) | `contentItemRepo.list()` |
| `PATCH /api/content/[id]` | PATCH | Update content item (pause → draft) | `contentItemRepo.update()` |
| `DELETE /api/content/[id]` | DELETE | Remove content item | `contentItemRepo.remove()` |
| `GET /api/issues` | GET | Aggregate failed content + expired tokens | `contentItemRepo` + `socialAccountRepo` |
| `POST /api/issues/[id]/retry` | POST | Retry failed content or refresh token | Pipeline-specific |
| `POST /api/issues/[id]/dismiss` | POST | Mark issue acknowledged | `contentItemRepo.update()` |
| `GET /api/media/[...path]` | GET | Stream media file from local storage | `fs.createReadStream()` |
| `GET /api/fleet/stats` | GET | Aggregated counts for fleet overview | Multiple repos |

**Auth middleware** wraps all `/api/*` routes except `/api/auth/login`. Validates HTTP-only cookie. Returns 401 on failure.

## Data Flow

Every page follows the same pattern:

```
Page loads → React Query hook → GET /api/... → API route imports repo
→ repo queries SQLite → returns JSON → React Query caches → UI renders
                                         ↕
                             refetchInterval: 30000 (auto-poll)
```

**Mutations** use `useMutation` with strategy per action:
- **Pause content** — optimistic (flip status in cache, revert on error)
- **Delete content** — pessimistic (wait for confirmation)
- **Retry failed post** — pessimistic (show spinner, update on result)
- **Dismiss issue** — optimistic (remove from list immediately)

## Error Handling

- API routes return `{ error: string, code: string }` on failure
- React Query `isError` shows inline error banners per-section (no full-page errors)
- Auth failures (401) redirect to `/login`
- Media proxy returns 404 for missing files; UI shows placeholder image
- No global error boundary for MVP

## Project Structure

```
hum-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout — sidebar nav + auth check
│   │   ├── page.tsx                   # Fleet Overview
│   │   ├── login/
│   │   │   └── page.tsx              # Login form
│   │   ├── clients/
│   │   │   ├── page.tsx              # Client list
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Client detail
│   │   ├── content/
│   │   │   └── page.tsx              # Content preview
│   │   ├── issues/
│   │   │   └── page.tsx              # System issues
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   └── logout/route.ts
│   │       ├── clients/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── content/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── issues/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── retry/route.ts
│   │       │       └── dismiss/route.ts
│   │       ├── fleet/
│   │       │   └── stats/route.ts
│   │       └── media/
│   │           └── [...path]/route.ts
│   ├── components/
│   │   ├── sidebar.tsx
│   │   ├── issue-badge.tsx
│   │   ├── fleet-stats.tsx
│   │   ├── system-health.tsx
│   │   ├── issue-card.tsx
│   │   ├── content-card.tsx
│   │   ├── content-preview-modal.tsx
│   │   ├── client-row.tsx
│   │   ├── client-header.tsx
│   │   ├── brand-profile-panel.tsx
│   │   ├── social-accounts-panel.tsx
│   │   ├── onboarding-progress.tsx
│   │   ├── recent-content.tsx
│   │   └── status-badge.tsx
│   ├── lib/
│   │   ├── api.ts                    # Typed fetch wrappers
│   │   ├── auth.ts                   # Cookie validation helpers
│   │   └── queries.ts                # React Query hooks
│   └── types/
│       └── index.ts                  # Dashboard-specific types
├── public/
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── package.json
├── tsconfig.json
└── DESIGN.md
```

## Dependencies

**Runtime:**
- `next` — framework
- `react`, `react-dom` — UI
- `@tanstack/react-query` — server state management
- `tailwindcss`, `postcss`, `autoprefixer` — styling
- shadcn/ui components (installed via CLI, not a package)
- `hum-core` (`workspace:*`) — database, repositories, types

**Dev:**
- `typescript`
- `@types/react`, `@types/node`
- `vitest` — testing

## Seed Data

A seed script populates hum-core with test data for development:
- 5-10 clients across all statuses (active, onboarding, paused)
- Brand profiles with realistic takeaway data
- Social accounts (some connected, some expired)
- Content items across all statuses (draft, scheduled, posted, failed)
- Onboarding sessions at various stages

This lets the dashboard be developed and demoed independently of the real pipelines.

## MVP Scope

**In scope:**
- Fleet Overview with status counts and system health
- Client list with search and status filters
- Client detail with brand profile, social accounts, onboarding progress, recent content
- Content preview with filters, media thumbnails, pause/delete actions
- Issues page with failed posts, expired tokens, gen errors, and contextual actions
- Env-var password auth with HTTP-only cookie
- Media proxy for generated images
- React Query auto-polling (30s)
- Seed data script

**Out of scope (deferred):**
- Engagement-based escalations (reviews, DMs, comments)
- Performance dashboard with charts
- Real-time SSE updates
- Ad campaign management
- Client health scoring
- Bulk actions
- Activity audit log
- Notification system (email/Slack)
- Keyboard shortcuts
- NextAuth.js / OAuth

## Dependencies on Other Packages

- **hum-core** — all database models and repositories (Client, BrandProfile, ContentItem, SocialAccount, onboarding_sessions)
- **hum-onboarding** — onboarding_sessions schema must be merged into hum-core before dashboard can show onboarding progress
- **hum-content-engine** — content items and local media storage must follow the expected schema for the dashboard to display them

## Depended On By

None. The dashboard is a leaf node — it consumes data, does not produce it.
