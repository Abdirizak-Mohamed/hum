# Hum

Automated social media marketing for restaurants. Hum takes a restaurant from signup to fully-automated content generation and posting with near-zero marginal cost per client.

## Architecture

Hum is a **pnpm monorepo** with TypeScript packages that build on each other:

```
hum-dashboard (Next.js)          hum-client-portal (future)
       │                                │
       ▼                                ▼
hum-onboarding ──────► hum-content-engine
       │                    │           │
       ▼                    ▼           ▼
  hum-integrations     hum-integrations │
       │                    │           │
       └────────────────────┴───────────┘
                            │
                        hum-core
```

## Packages

### hum-core — Foundation layer

Shared data models, database access, configuration, and validation schemas used by every other package.

| Concern | Implementation |
|---------|---------------|
| Database | SQLite via better-sqlite3, Drizzle ORM |
| Models | Client, BrandProfile, SocialAccount, ContentItem |
| Repositories | Typed CRUD + query functions per entity |
| Validation | Zod schemas derived from Drizzle tables |
| Config | Plan tiers (starter/growth/premium), platform specs |

**Status:** Complete

### hum-integrations — Third-party API clients

Typed wrappers for all external services with factory-based mock/real switching.

| Domain | Provider | Interface |
|--------|----------|-----------|
| AI — Copy | OpenAI (GPT-4o / GPT-4o-mini) | `AiClient.generateCopy()` |
| AI — Images | fal.ai (FLUX 2 Pro) | `AiClient.generateImage()` |
| AI — Branding | OpenAI | `AiClient.generateBrandProfile()` |
| Social | Ayrshare | `SocialClient.schedulePost()` |
| Payments | Stripe | `PaymentsClient.createSubscription()` |

Set `HUM_MOCK_INTEGRATIONS=true` to switch all providers to mock implementations for development.

**Status:** Complete

### hum-content-engine — Content generation pipeline

The core revenue engine. Generates, composes, and schedules social media content weekly for every active client.

**Pipeline (DAG):**

```
planCalendar (LLM)
       │
       ├── generateMedia (fal.ai, parallel via p-queue)
       ├── generateCopy  (OpenAI, parallel via p-queue)
       │
composePosts (assemble into ContentItems)
       │
schedulePosts (Ayrshare)
```

**MVP content types:** `food_hero`, `deal_offer`, `google_post`

**CLI:**
```
pnpm content-engine generate --client <id>   # one client
pnpm content-engine generate --all           # all active clients
pnpm content-engine start                    # cron scheduler

Options:
  --dry-run    generate content without scheduling
  --mock       force mock integrations
```

**Status:** Complete

### hum-onboarding — Client intake pipeline

Takes a new signup from payment to fully-configured, content-producing client with zero manual intervention.

**Steps:**
1. `create_client` — Store intake data
2. `process_menu` — Parse menu text via LLM
3. `generate_brand` — Generate brand profile (voice, selling points, themes, hashtags)
4. `setup_social` — Collect social account connections
5. `trigger_content` — Kick off content engine for first 30-day batch

Uses SQLite-backed session tracking for resumability and per-step state persistence.

**Status:** Design and plan complete. Implementation pending.
**Branch:** `feat/hum-onboarding`

### hum-dashboard — Operator command centre

Internal dashboard for 1-2 people managing the entire fleet of clients.

**Pages:**
- `/` — Fleet overview (active/paused/issue counts, system health)
- `/clients` — Client list with search, filter, quick actions
- `/clients/[id]` — Client detail (brand, social accounts, content performance)
- `/content` — Content preview calendar for upcoming posts
- `/issues` — Exception handler (failed posts, expired tokens, generation errors)

Architecture: Next.js App Router as a lean BFF — API routes import hum-core repositories directly, no separate API service.

**Status:** Design and plan complete. Implementation pending.
**Branch:** `feat/hum-dashboard`

## Plan Tiers

| Tier | Posts/week | Platforms | Features |
|------|-----------|-----------|----------|
| Starter | 3 | Instagram, Facebook | Review responses |
| Growth | 5 | + TikTok | + DM automation |
| Premium | 7 | + Google Business | + Ad management |

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Setup

```bash
pnpm install
cp .env.example .env     # fill in API keys, or set HUM_MOCK_INTEGRATIONS=true
```

### Build & Test

```bash
pnpm build              # build all packages
pnpm test               # test all packages
```

### Environment Variables

```
DATABASE_URL             # SQLite path (default: ./hum.db) or Postgres URL
OPENAI_API_KEY           # OpenAI API key
FAL_API_KEY              # fal.ai API key (FLUX image generation)
AYRSHARE_API_KEY         # Ayrshare API key (social media posting)
STRIPE_SECRET_KEY        # Stripe secret key
STRIPE_WEBHOOK_SECRET    # Stripe webhook verification
HUM_MOCK_INTEGRATIONS    # "true" to use mock providers (no API keys needed)
```

## Project Structure

```
hum/
├── hum-core/                 # Data models, DB, config
├── hum-integrations/         # OpenAI, fal.ai, Ayrshare, Stripe clients
├── hum-content-engine/       # Content generation pipeline
├── hum-onboarding/           # Client intake pipeline (design only)
├── hum-dashboard/            # Operator dashboard (design only)
├── docs/
│   └── superpowers/
│       ├── specs/            # Design specifications
│       └── plans/            # Implementation plans
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── .env.example
```
