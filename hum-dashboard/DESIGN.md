# hum-dashboard — Design Document

## Overview

The operator's command centre. This is the internal dashboard used by 1-2 people to manage the entire fleet of clients. It is an exception-handler, not a task manager — if the operator is spending significant time in it, the automation has a problem.

---

## Responsibilities

- Provide a fleet-level overview of all clients and their status
- Surface escalations (negative reviews, complex DMs, content issues) for human action
- Allow content preview and approval before posting
- Display performance metrics across all clients
- Manage client onboarding progress
- Provide campaign management controls for ads
- Alert on system issues (API failures, posting errors, token expirations)

---

## Page Structure

### 1. Fleet Overview (Home)

The landing page. At a glance, the operator sees:

```
┌─────────────────────────────────────────────────────────┐
│  FLEET OVERVIEW                           500 clients    │
│                                                          │
│  ● 487 Autonomous    ▲ 8 Needs Attention    ■ 5 Onboarding │
│                                                          │
│  System Health:                                          │
│  - Content pipeline: ● Running (2,847 posts this week)   │
│  - Engagement: ● Running (312 responses today)           │
│  - Ads: ● Running (£24K managed this week)               │
│  - API status: ● All green                               │
│                                                          │
│  [Escalation queue (8)] [Content preview] [Alerts (2)]   │
└─────────────────────────────────────────────────────────┘
```

Status categories:
- **Autonomous (green)** — Everything running normally, no action needed
- **Needs Attention (amber)** — Escalation or issue requires operator input
- **Onboarding (blue)** — Client in onboarding pipeline
- **Paused (grey)** — Client paused their account
- **Error (red)** — System error (token expired, API failure, posting error)

### 2. Escalation Queue

The primary work surface. Shows items that need human judgement:

```
┌─────────────────────────────────────────────────────────┐
│  ESCALATION QUEUE                          8 items       │
│                                                          │
│  [Filter: All | Reviews | Comments | DMs | Content]      │
│                                                          │
│  1. ⚠️ Ali's Kebabs — 1-star Google review               │
│     "Cold food, waited 45 minutes"                       │
│     Draft response: "We're sorry to hear about your..."  │
│     [Approve] [Edit & Send] [Dismiss]                    │
│                                                          │
│  2. ❓ Dragon Palace — Instagram DM                       │
│     "Can you cater for a party of 50?"                   │
│     Draft response: "Thanks for reaching out! We'd..."   │
│     [Approve] [Edit & Send] [Forward to client]          │
│                                                          │
│  3. 🔴 Pizza Express UK — Token expired                   │
│     Instagram access token expired 2 hours ago.           │
│     [Reconnect] [Pause client] [Snooze 24h]              │
│                                                          │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### 3. Content Preview

Shows upcoming scheduled content across all clients:

```
┌─────────────────────────────────────────────────────────┐
│  CONTENT PREVIEW — Next 24 hours           142 posts     │
│                                                          │
│  [Filter by client] [Filter by platform] [Calendar view] │
│                                                          │
│  Timeline:                                               │
│  08:00  Ali's Kebabs — IG food hero (butter chicken)     │
│  08:30  Dragon Palace — FB deal post (lunch special)     │
│  09:00  Tony's Pizza — TikTok video (pizza stretch)      │
│  ...                                                     │
│                                                          │
│  [Click any post to preview media + caption]             │
│  [Pause] [Reschedule] [Edit caption] [Delete]            │
└─────────────────────────────────────────────────────────┘
```

### 4. Client Detail

Drill-down view for a single client:

- Brand profile summary
- Connected platforms and token status
- Content calendar and history
- Engagement metrics (comments, reviews, DMs handled)
- Ad campaign performance
- Billing status
- Activity log

### 5. Performance Dashboard

Aggregate metrics across all clients or filtered by cohort:

- Total posts published (daily/weekly/monthly)
- Aggregate engagement rate
- Total reach and impressions
- Reviews responded to
- Ad spend managed and aggregate ROAS
- Client health scores (engagement trending up/down)
- Revenue and cost tracking

### 6. Alerts & System Health

Operational alerts:

- API token expirations (upcoming and expired)
- Posting failures (with retry status)
- Content generation failures
- Rate limit warnings
- Billing issues (failed payments)

---

## Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | Next.js (App Router) | SSR for fast initial load, RSC for data-heavy pages |
| Styling | Tailwind CSS + shadcn/ui | Fast to build, consistent design, accessible components |
| State management | React Query (TanStack Query) | Server state management with caching and optimistic updates |
| Charts | Recharts or Tremor | Simple, React-native charting for performance dashboards |
| Auth | NextAuth.js | Operator authentication (email + password or OAuth) |
| Real-time updates | Server-Sent Events (SSE) | Push escalations and alerts without polling |

---

## MVP Scope

1. **Fleet overview** — Client list with status indicators (autonomous/attention/onboarding/error)
2. **Client detail page** — View brand profile, connected platforms, recent content
3. **Escalation queue** — View escalated reviews, approve/edit/dismiss draft responses
4. **Content preview** — View upcoming scheduled posts, ability to pause or delete
5. **Basic alerts** — Token expiration warnings, posting failures

### Deferred

- Performance dashboard with charts (use direct DB queries initially)
- Real-time SSE updates (use polling / manual refresh)
- Ad campaign management controls
- Client health scoring
- Bulk actions (pause all content for a client, reconnect all tokens)
- Activity audit log
- Notification system (email/Slack alerts for critical issues)

---

## Project Structure

```
hum-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Fleet overview (home)
│   │   ├── clients/
│   │   │   ├── page.tsx                # Client list
│   │   │   └── [id]/
│   │   │       └── page.tsx            # Client detail
│   │   ├── escalations/
│   │   │   └── page.tsx                # Escalation queue
│   │   ├── content/
│   │   │   └── page.tsx                # Content preview
│   │   ├── performance/
│   │   │   └── page.tsx                # Performance dashboard
│   │   ├── alerts/
│   │   │   └── page.tsx                # Alerts & system health
│   │   └── api/
│   │       ├── clients/route.ts        # Client API routes
│   │       ├── escalations/route.ts    # Escalation API routes
│   │       ├── content/route.ts        # Content API routes
│   │       └── auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── fleet-overview.tsx
│   │   ├── escalation-card.tsx
│   │   ├── content-preview-card.tsx
│   │   ├── client-status-badge.tsx
│   │   ├── performance-chart.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── api.ts                      # API client for data fetching
│   │   └── auth.ts                     # NextAuth configuration
│   └── types/
│       └── index.ts
├── public/
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── tsconfig.json
└── DESIGN.md
```

---

## Key Design Decisions

1. **Exception-based, not task-based** — The dashboard surfaces problems, not routine operations. If everything is green, the operator should be able to check in and leave in under a minute.

2. **Escalation queue is the primary workflow** — This is where the operator spends their time. It must be fast, keyboard-navigable, and allow quick approve/edit/dismiss actions.

3. **No client-facing features** — This is strictly the operator's tool. Clients have their own portal (hum-client-portal). Keeping these separate means the dashboard can be ugly-but-functional and optimised for speed over aesthetics.

4. **Next.js API routes as BFF** — The dashboard's API routes act as a Backend-for-Frontend, aggregating data from hum-core's database. No separate API server needed for the dashboard.

---

## Development

**Important: `hum-core` is externalized from webpack in `next.config.ts`. If you make changes to `hum-core` source code, you must run `pnpm build` in `hum-core` before the dashboard will pick up the changes. The dashboard loads `hum-core` from its compiled `dist/` directory, not the TypeScript source.**

```bash
# After changing hum-core:
cd hum-core && pnpm build

# Then restart the dashboard dev server
cd hum-dashboard && DASHBOARD_PASSWORD=test pnpm dev
```

## Dependencies

- `hum-core` — Database access for all models (clients, content, engagement, campaigns)

## Depended On By

- None (this is a leaf node — it consumes data, doesn't produce it)
