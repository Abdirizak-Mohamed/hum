# hum-onboarding — Design Specification

## Overview

The client onboarding pipeline for Hum. Takes a new signup from "just paid" to "fully configured and producing content" with zero manual intervention. This is a backend library package (no HTTP code) that exports functions for starting, resuming, and querying onboarding sessions.

## MVP Scope

**Included:**
- Manual client entry (no Stripe webhooks)
- Text-only menu processing via LLM
- Full brand profile generation via LLM
- Manual social account token entry (no OAuth)
- Content engine interface (stubbed — real engine built in parallel)
- SQLite-backed session tracking with per-step state persistence

**Deferred:**
- Stripe webhook integration
- Photo/PDF menu OCR
- Full OAuth flows for social accounts
- Automated follow-up emails
- Onboarding quality scoring
- BullMQ/Redis job queue (in-process async with SQLite checkpoints for MVP)

---

## Architecture Decisions

### 1. Step-based Pipeline with Registry (Approach 2)

Each pipeline step is a self-contained function conforming to a `PipelineStep` interface. An orchestrator iterates through registered steps, passing context, persisting state after each.

**Rationale:** Independently testable and re-runnable steps. Adding/removing/reordering steps is trivial. Resumability is built-in. Maps cleanly to AWS Step Functions for future cloud migration (each step becomes a Lambda, orchestrator becomes a state machine definition).

### 2. SQLite-backed Session Tracking (Option C)

Onboarding progress is persisted to an `onboarding_sessions` table with a `step_results` JSON column storing per-step status, output, and error info.

**Rationale:** Provides resumability (restart from where you left off if process dies), visibility (dashboard can query progress), and debuggability (inspect what input caused a failure). No extra infrastructure — just another SQLite table consistent with the existing stack.

### 3. Pure Library, No HTTP (Option B)

hum-onboarding exports functions (`startOnboarding`, `resumeOnboarding`, `getOnboardingStatus`). No API routes or HTTP code.

**Rationale:** Follows hum-core's pattern. Whatever app needs onboarding (dashboard, client portal) imports these functions and wires them to its own routes.

### 4. Fail-fast Pipeline

Pipeline stops on the first step failure and records the error. No graceful degradation in MVP.

**Rationale:** With only 5 steps in a linear chain, failing and recording the error is simpler and safer. Skip/continue logic can be added per-step later.

### 5. Content Engine Interface First

The `ContentEngine` interface is defined and exported early so hum-content-engine (being built in parallel) can implement against it.

---

## Data Model

### New Table: `onboarding_sessions` (in hum-core schema)

| Column | Type | Drizzle Definition | Purpose |
|--------|------|-------------------|---------|
| id | TEXT | `text('id').primaryKey()` | UUIDv7 |
| client_id | TEXT | `text('client_id').notNull().references(() => clients.id).unique()` | One session per client |
| status | TEXT | `text('status', { enum: ['in_progress', 'complete', 'failed'] }).notNull().default('in_progress')` | Session lifecycle |
| current_step | TEXT | `text('current_step')` | Name of step currently executing |
| step_results | TEXT (JSON) | `text('step_results', { mode: 'json' }).$type<Record<StepName, StepResult>>().default({})` | Per-step status, output, error |
| intake_data | TEXT (JSON) | `text('intake_data', { mode: 'json' }).$type<IntakeData>()` | Raw form submission |
| blocked_reason | TEXT | `text('blocked_reason')` | Human-readable failure reason |
| started_at | INTEGER | `integer('started_at', { mode: 'timestamp_ms' }).notNull()` | Timestamp |
| completed_at | INTEGER | `integer('completed_at', { mode: 'timestamp_ms' })` | Timestamp |
| updated_at | INTEGER | `integer('updated_at', { mode: 'timestamp_ms' }).notNull()` | Timestamp |

Follows hum-core's existing patterns: `mode: 'timestamp_ms'` for timestamps, `mode: 'json'` with `$type<>()` for typed JSON columns.

**pushSchema DDL** (for `connection.ts` in-memory test databases):

```sql
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_step TEXT,
  step_results TEXT DEFAULT '{}',
  intake_data TEXT,
  blocked_reason TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL
);
```

New Zod schemas (`onboardingSessionSchema`, `createOnboardingSessionSchema`, `updateOnboardingSessionSchema`) and table export added to hum-core's public API. The `pushSchema()` function in `connection.ts` must also be updated to include the new table for in-memory test databases.

### IntakeData Type

Defined as a Zod schema in hum-onboarding (`session/types.ts`) and validated on entry to `startOnboarding()`:

```typescript
type IntakeData = {
  // Step 1: Client creation
  businessName: string;
  email: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: Record<string, string>;
  deliveryPlatforms?: string[];
  planTier?: 'starter' | 'growth' | 'premium';

  // Step 2: Menu processing
  menu: string;                // plain text menu (MVP)

  // Step 3: Brand generation
  cuisineType?: string;
  brandPreferences?: string;   // free-text brand preferences from client

  // Step 4: Social accounts
  socialAccounts?: Array<{
    platform: 'instagram' | 'facebook' | 'tiktok' | 'google_business';
    platformAccountId: string;  // e.g., Instagram username
  }>;
};
```

**Note on social account tokens (I4):** In MVP, `socialAccounts` contains only `platform` and `platformAccountId` — no tokens. The `socialAccountRepo.create()` call stores the account with status `'connected'` and no credential. Actual token/credential management is deferred to post-MVP when full OAuth flows are implemented.

### OnboardingSession Model

Follows hum-core's model class pattern — wraps the database row in a readonly class with business logic methods:

```typescript
class OnboardingSession {
  readonly id: string;
  readonly clientId: string;
  readonly status: 'in_progress' | 'complete' | 'failed';
  readonly currentStep: StepName | null;
  readonly stepResults: Record<StepName, StepResult>;
  readonly intakeData: IntakeData | null;
  readonly blockedReason: string | null;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly updatedAt: Date;

  constructor(row: OnboardingSessionRow) { /* ... */ }

  isComplete(): boolean;
  isFailed(): boolean;
  getFailedStep(): StepName | undefined;
  getCompletedSteps(): StepName[];
  getNextPendingStep(allSteps: StepName[]): StepName | undefined;
}
```

### Session Repository Boundary

The `onboarding_sessions` table definition and Zod schemas live in hum-core (consistent with all other tables), but the session repository (`session/repository.ts`) lives in hum-onboarding. This is intentional: the table is a shared data structure that the dashboard will also query, but the repository contains onboarding-specific logic (step result updates, status transitions) that belongs in the onboarding domain, not in hum-core.

---

## Pipeline Framework

### Types

```typescript
type StepName = 'create_client' | 'process_menu' | 'generate_brand' | 'setup_social' | 'trigger_content';

type StepStatus = 'pending' | 'processing' | 'complete' | 'failed';

type StepResult = {
  status: StepStatus;
  output?: Record<string, unknown>;
  error?: string;
  retryCount?: number;           // incremented on each resume attempt; aids debugging
};

// The db field is the inner Drizzle instance (BetterSQLite3Database<typeof schema>),
// NOT the HumDb wrapper. This matches hum-core's repository signatures which all
// accept the inner Drizzle instance as their first parameter.
type Db = BetterSQLite3Database<typeof schema>;

type IntegrationClients = {
  ai: AiClient;                  // from hum-integrations — used by steps 2 and 3
  contentEngine: ContentEngine;  // from engine/interface.ts — used by step 5
};

type OnboardingContext = {
  session: OnboardingSession;
  db: Db;
  integrations: IntegrationClients;
};

type PipelineStep = {
  name: StepName;
  execute(ctx: OnboardingContext): Promise<StepResult>;
};
```

### Orchestrator

```typescript
// Note: ctx.session is a snapshot from pipeline start. The retryCount field
// accumulates across separate resumeOnboarding() calls, not within a single run.
// All session helper functions receive ctx.db (the inner Drizzle instance)
// as their first parameter, consistent with hum-core's repository pattern.

async function runPipeline(
  sessionId: string,
  ctx: OnboardingContext,
  steps: PipelineStep[]
): Promise<OnboardingSession> {
  for (const step of steps) {
    const existing = ctx.session.stepResults[step.name];
    if (existing?.status === 'complete') continue;

    // Single write: set currentStep and mark step as 'processing' in one update
    await updateSessionAndStepStatus(ctx.db, sessionId, step.name, 'processing');

    try {
      const result = await step.execute(ctx);
      await saveStepResult(ctx.db, sessionId, step.name, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await saveStepResult(ctx.db, sessionId, step.name, {
        status: 'failed',
        error: message,
        retryCount: (existing?.retryCount ?? 0) + 1,
      });
      await updateSession(ctx.db, sessionId, { status: 'failed', blockedReason: message });
      return getSession(ctx.db, sessionId);
    }
  }

  await updateSession(ctx.db, sessionId, { status: 'complete', completedAt: new Date() });
  return getSession(ctx.db, sessionId);
}
```

---

## Pipeline Steps (MVP)

### Step 1: Create Client
- **Input:** `intake_data` (business name, email, address, hours, delivery platforms)
- **Action:** Calls `clientRepo.create()` from hum-core
- **Output:** `{ clientId: string }`
- Saves `client_id` back to the session for subsequent steps

### Step 2: Process Menu
- **Input:** `intake_data.menu` (text string — MVP is text only)
- **Action:** Sends menu text to OpenAI via `ctx.integrations.ai.generateCopy()` with the menu-extraction prompt. LLM returns JSON which is validated against a `MenuItem[]` Zod schema using `.safeParse()` — if validation fails, the step fails with a descriptive error rather than silently accepting malformed data.
- **Output:** `{ menuItems: MenuItem[] }`
- Prompt encodes takeaway menu conventions (starters/mains/sides, meal deals, combo numbering)
- The `MenuItem` type is hum-core's existing type (`{ name, description, category, price, photoUrl? }`), not the old DESIGN.md shape which included `dietaryFlags` and `isPopular`. The menu-extraction prompt must produce output matching hum-core's shape.

### Step 3: Generate Brand Profile
- **Input:** Structured menu from step 2's `output.menuItems` (read from `session.stepResults.process_menu.output`) + business info from `intake_data` (location, cuisineType, brandPreferences)
- **Action:** Sends combined context to OpenAI via `ctx.integrations.ai.generateBrandProfile()`. LLM output is validated against a Zod schema.
- **Output:** Full BrandProfile data including `peakPostingTimes`
- **Note on hum-integrations:** The existing `BrandProfileResult` type in hum-integrations is missing `peakPostingTimes`. This must be added to `BrandProfileResult` and `BrandInput` as part of the implementation. The `menuItems` field is **not** part of the LLM output — it is carried forward from step 2 and composed with the LLM result when creating the BrandProfile.
- Calls `brandProfileRepo.create()` to persist, combining LLM-generated fields with `menuItems` from step 2
- Most important step — prompt encodes domain knowledge about takeaway content performance

### Step 4: Setup Social Accounts
- **Input:** `intake_data.socialAccounts` (array of `{ platform, platformAccountId }`)
- **Action:** For each account, calls `socialAccountRepo.create()` with status `'connected'`
- **Output:** `{ accounts: Array<{ platform, platformAccountId }> }`
- No tokens, no OAuth, no Ayrshare config, no test post in MVP. Accounts are created with identifiers only.

### Step 5: Trigger Content Generation
- **Input:** `clientId` from step 1, brand profile data from step 3 (including `menuItems` from step 2), connected platforms from step 4
- **Action:** Calls `ctx.integrations.contentEngine.triggerBatch()` with a `ContentEngineRequest` assembling data from prior steps. `batchSize` defaults to 30.
- **Output:** `{ contentBatchId: string, status: 'queued' }`

---

## Content Engine Interface

The contract for hum-content-engine to implement against.

```typescript
type ContentEngineRequest = {
  clientId: string;
  brandProfile: {
    brandVoiceGuide: string;
    keySellingPoints: string[];
    targetAudienceProfile: string;
    contentThemes: string[];
    hashtagStrategy: string[];
    peakPostingTimes: Record<string, string[]>;
    menuItems: MenuItem[];
  };
  platforms: string[];
  batchSize: number;            // default: 30 (days of content)
};

type ContentEngineResponse = {
  batchId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  itemCount?: number;
};

interface ContentEngine {
  triggerBatch(request: ContentEngineRequest): Promise<ContentEngineResponse>;
  getBatchStatus(batchId: string): Promise<ContentEngineResponse>;
}
```

MVP ships with a stub implementation that logs and returns `{ status: 'queued' }`.

---

## Public API

```typescript
// Onboarding lifecycle (db is the inner Drizzle instance, not HumDb wrapper)
// startOnboarding checks for an existing session for the client email before creating.
// If one exists, throws DuplicateError (from hum-core) rather than hitting the DB unique constraint.
startOnboarding(db: Db, intakeData: IntakeData, integrations: IntegrationClients): Promise<OnboardingSession>
resumeOnboarding(db: Db, sessionId: string, integrations: IntegrationClients): Promise<OnboardingSession>

// Status queries
getOnboardingStatus(db: Db, sessionId: string): Promise<OnboardingSession>
getOnboardingByClientId(db: Db, clientId: string): Promise<OnboardingSession | undefined>

// Content engine interface (for hum-content-engine to implement)
type ContentEngine
type ContentEngineRequest
type ContentEngineResponse

// Pipeline types
type OnboardingSession       // model class (see Data Model section)
type IntakeData              // Zod-validated input shape
type IntegrationClients      // { ai: AiClient, contentEngine: ContentEngine }
type StepName
type StepResult
type StepStatus
```

---

## Project Structure

```
hum-onboarding/
├── src/
│   ├── pipeline/
│   │   ├── orchestrator.ts        # runPipeline loop, resume logic
│   │   ├── steps/
│   │   │   ├── create-client.ts   # Step 1
│   │   │   ├── process-menu.ts    # Step 2
│   │   │   ├── generate-brand.ts  # Step 3
│   │   │   ├── setup-social.ts    # Step 4
│   │   │   └── trigger-content.ts # Step 5
│   │   └── types.ts               # PipelineStep, StepResult, OnboardingContext, StepName
│   ├── prompts/
│   │   ├── menu-extraction.ts     # LLM prompt for structuring menu text
│   │   └── brand-generation.ts    # LLM prompt for brand profile generation
│   ├── engine/
│   │   ├── interface.ts           # ContentEngine interface + types
│   │   └── stub.ts                # Stub implementation for MVP
│   ├── session/
│   │   ├── repository.ts          # CRUD for onboarding_sessions table
│   │   └── types.ts               # OnboardingSession, IntakeData types
│   └── index.ts                   # Public API exports
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── DESIGN.md
```

---

## Dependencies

### hum-onboarding package.json

```json
{
  "dependencies": {
    "hum-core": "workspace:*",
    "hum-integrations": "workspace:*",
    "zod": "^3.24.0",
    "uuidv7": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

### Dependency flow

```
hum-onboarding
  ├── hum-core          (db, models, repos, schema, onboarding_sessions table)
  └── hum-integrations  (OpenAI client for menu/brand LLM calls)
```

### Changes to hum-core

1. New `onboarding_sessions` table in `schema.ts`
2. Update `pushSchema()` in `connection.ts` to include `onboarding_sessions` for in-memory test databases
3. New migration via `drizzle-kit generate`
4. New Zod schemas (`onboardingSessionSchema`, create/update variants)
5. Export table + schemas from `index.ts`

### Changes to hum-integrations (prerequisite — must land before step 3 works)

1. Add `peakPostingTimes: Record<string, string[]>` to `BrandProfileResult` type
2. Add `brandPreferences?: string` to `BrandInput` type
3. Update the `generateBrandProfile()` system prompt in `openai.ts` to request `peakPostingTimes` in its JSON output schema
4. Update the mock provider in `openai.mock.ts` to include `peakPostingTimes` in the fixture

### Workspace setup (prerequisite)

1. Add `"hum-onboarding"` to `pnpm-workspace.yaml` packages list

---

## Testing Strategy

- **Unit tests per step** — mock db and integration clients, verify each step reads correct input and produces correct output
- **Orchestrator tests** — verify skip logic, failure handling, resume behavior using in-memory SQLite
- **Prompt tests** — snapshot tests for prompt construction (verify prompt is built correctly from inputs, not LLM output)

---

## Future Migration Path

When moving to cloud (AWS), the step-based pipeline maps to Step Functions:

| Local (MVP) | AWS Step Functions |
|---|---|
| `PipelineStep.execute()` | Lambda function |
| Orchestrator `for` loop | State machine definition |
| `step_results` JSON in SQLite | Built-in state passing |
| Session status tracking | Built-in execution history |
| Resume via skip logic | Native retry/resume |

Each step's business logic stays unchanged — only the orchestration plumbing gets replaced.
