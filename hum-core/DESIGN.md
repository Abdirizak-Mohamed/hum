# hum-core — Design Document

## Overview

The shared foundation layer for the entire Hum platform. Provides data models, database access, configuration management, and common types used by all other services.

---

## Responsibilities

- Define and manage all database schemas (client profiles, brand configs, content assets, schedules, performance data, credentials)
- Provide a typed client library for database access
- Define shared types and interfaces used across services
- Manage client configuration and tier/plan definitions
- Provide common utilities (logging, error handling, validation)
- Handle credential storage and retrieval (encrypted at rest)

---

## Data Models

### Client

```
Client
├── id
├── business_name
├── address / location (lat/lng)
├── phone
├── email
├── opening_hours
├── delivery_platforms[]
├── plan_tier (starter | growth | premium)
├── stripe_customer_id
├── status (onboarding | active | paused | churned)
├── created_at
└── updated_at
```

### BrandProfile

```
BrandProfile
├── client_id (FK → Client)
├── brand_voice_guide (text)
├── key_selling_points[]
├── target_audience_profile (text)
├── content_themes[]
├── hashtag_strategy[]
├── peak_posting_times (per platform)
├── menu_items[] → MenuItem { name, description, category, price, photo_url? }
├── brand_colours[]
├── logo_url?
└── generated_at
```

### SocialAccount

```
SocialAccount
├── client_id (FK → Client)
├── platform (instagram | facebook | tiktok | google_business)
├── platform_account_id
├── access_token (encrypted)
├── refresh_token (encrypted)
├── token_expires_at
├── ayrshare_profile_key?
├── status (connected | disconnected | expired)
└── connected_at
```

### ContentItem

```
ContentItem
├── id
├── client_id (FK → Client)
├── content_type (food_hero | short_video | deal_offer | behind_scenes | google_post | review_highlight | trending)
├── status (draft | scheduled | posted | failed)
├── caption
├── hashtags[]
├── cta
├── media_urls[] (images/videos in storage)
├── platforms[] (where to post)
├── scheduled_at (per platform)
├── posted_at (per platform)
├── performance → { reach, impressions, engagement, clicks }
└── created_at
```

### EngagementEvent

```
EngagementEvent
├── id
├── client_id (FK → Client)
├── type (comment | review | dm)
├── platform
├── source_id (platform-specific ID)
├── author_name
├── content (the comment/review/dm text)
├── sentiment (positive | neutral | negative)
├── rating? (for reviews, 1-5)
├── response_text
├── response_status (auto_responded | escalated | pending | manual_response)
├── escalation_reason?
├── responded_at
└── received_at
```

### AdCampaign

```
AdCampaign
├── id
├── client_id (FK → Client)
├── platform (meta | google)
├── platform_campaign_id
├── status (draft | active | paused | ended)
├── budget_monthly
├── geo_target (radius_miles, centre_lat, centre_lng)
├── audience_targeting {}
├── creatives[] → AdCreative { image_url, headline, body, cta }
├── performance → { spend, impressions, clicks, conversions, roas }
├── created_at
└── updated_at
```

---

## Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Language | TypeScript | Shared across frontend (Next.js) and backend services |
| Database | PostgreSQL | Relational data with strong consistency needs; JSONB for flexible fields |
| ORM | Drizzle ORM | Type-safe, lightweight, good migration story |
| Validation | Zod | Runtime validation that pairs with TypeScript types |
| Credential encryption | AES-256-GCM via Node crypto | Encrypt OAuth tokens and API keys at rest |
| Package format | npm workspace package | Consumed by all other hum-* projects |

---

## MVP Scope

For the MVP, focus on:

1. **Database schema & migrations** — Define tables for Client, BrandProfile, SocialAccount, ContentItem
2. **Typed data access layer** — CRUD operations for each model via Drizzle
3. **Zod schemas** — Validation schemas for all models, reusable across services
4. **Configuration** — Plan/tier definitions, platform constants, content type definitions
5. **Basic utilities** — Logger, error types, date/time helpers for scheduling

### Deferred

- EngagementEvent and AdCampaign models (built when those pipelines are tackled)
- Credential encryption (use env vars / secrets manager in MVP)
- Multi-tenant connection pooling optimizations

---

## Project Structure

```
hum-core/
├── src/
│   ├── db/
│   │   ├── schema.ts          # Drizzle schema definitions
│   │   ├── migrations/        # Generated migrations
│   │   └── client.ts          # Database connection setup
│   ├── models/
│   │   ├── client.ts          # Client CRUD
│   │   ├── brand-profile.ts   # BrandProfile CRUD
│   │   ├── social-account.ts  # SocialAccount CRUD
│   │   ├── content-item.ts    # ContentItem CRUD
│   │   └── index.ts
│   ├── schemas/               # Zod validation schemas
│   │   ├── client.ts
│   │   ├── brand-profile.ts
│   │   ├── content-item.ts
│   │   └── index.ts
│   ├── config/
│   │   ├── plans.ts           # Tier definitions (starter/growth/premium)
│   │   ├── platforms.ts       # Platform constants and content specs
│   │   └── content-types.ts   # Content type definitions and frequencies
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── scheduling.ts      # Time/timezone helpers for post scheduling
│   └── index.ts               # Public API exports
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── DESIGN.md
```

---

## Key Design Decisions

1. **Single database** — All services share one Postgres database. At this scale (even 500 clients), a single well-indexed database handles the load. No need for microservice databases in MVP.

2. **TypeScript throughout** — Shared types between backend services and frontend dashboards eliminate serialization bugs and provide IDE support.

3. **Drizzle over Prisma** — Drizzle is lighter, faster, and gives more control over queries. Better for a system that will need custom queries for content scheduling and fleet-level aggregations.

4. **Zod for validation** — Used at service boundaries (API inputs, form submissions, webhook payloads). Drizzle schemas define the DB shape; Zod schemas define the input/output contracts.

---

## Dependencies

- None (this is the foundational layer)

## Depended On By

- All other hum-* projects
