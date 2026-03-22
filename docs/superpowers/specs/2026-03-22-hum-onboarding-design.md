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

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | TEXT | PK | UUIDv7 |
| client_id | TEXT | NOT NULL, UNIQUE, FK→clients(id) | One session per client |
| status | TEXT | NOT NULL, DEFAULT 'in_progress' | 'in_progress' \| 'complete' \| 'failed' |
| current_step | TEXT | NULL | Name of step currently executing |
| step_results | JSON | DEFAULT '{}' | Record<StepName, { status, output?, error? }> |
| intake_data | JSON | NULL | Raw form submission blob |
| blocked_reason | TEXT | NULL | Human-readable failure reason |
| started_at | INTEGER | NOT NULL | Timestamp (ms) |
| completed_at | INTEGER | NULL | Timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Timestamp (ms) |

New Zod schemas and table export added to hum-core's public API.

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
};

type OnboardingContext = {
  session: OnboardingSession;
  db: HumDb;
  integrations: IntegrationClients;
};

type PipelineStep = {
  name: StepName;
  execute(ctx: OnboardingContext): Promise<StepResult>;
};
```

### Orchestrator

```typescript
async function runPipeline(
  sessionId: string,
  ctx: OnboardingContext,
  steps: PipelineStep[]
): Promise<OnboardingSession> {
  for (const step of steps) {
    const existing = ctx.session.stepResults[step.name];
    if (existing?.status === 'complete') continue;

    await updateSession(sessionId, { currentStep: step.name });
    await updateStepStatus(sessionId, step.name, 'processing');

    try {
      const result = await step.execute(ctx);
      await saveStepResult(sessionId, step.name, result);
    } catch (err) {
      await saveStepResult(sessionId, step.name, {
        status: 'failed',
        error: err.message,
      });
      await updateSession(sessionId, { status: 'failed', blockedReason: err.message });
      return getSession(sessionId);
    }
  }

  await updateSession(sessionId, { status: 'complete', completedAt: new Date() });
  return getSession(sessionId);
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
- **Action:** Sends menu text to OpenAI via hum-integrations. LLM structures into `MenuItem[]`
- **Output:** `{ menuItems: MenuItem[] }`
- Prompt encodes takeaway menu conventions (starters/mains/sides, meal deals, combo numbering)

### Step 3: Generate Brand Profile
- **Input:** Structured menu from step 2 + business info from `intake_data`
- **Action:** Sends combined context to OpenAI via hum-integrations. Generates brand voice, selling points, target audience, content themes, hashtag strategy, peak posting times
- **Output:** Full BrandProfile data
- Calls `brandProfileRepo.create()` to persist
- Most important step — prompt encodes domain knowledge about takeaway content performance

### Step 4: Setup Social Accounts
- **Input:** `intake_data.socialAccounts` (array of `{ platform, accountId, token }`)
- **Action:** For each account, calls `socialAccountRepo.create()` with status `'connected'`
- **Output:** `{ accounts: Array<{ platform, accountId }> }`
- No OAuth, no Ayrshare config, no test post in MVP

### Step 5: Trigger Content Generation
- **Input:** `clientId`, brand profile from step 3
- **Action:** Calls the `ContentEngine` interface (stubbed for MVP)
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
// Onboarding lifecycle
startOnboarding(db, intakeData, integrations): Promise<OnboardingSession>
resumeOnboarding(db, sessionId, integrations): Promise<OnboardingSession>

// Status queries
getOnboardingStatus(db, sessionId): Promise<OnboardingSession>
getOnboardingByClientId(db, clientId): Promise<OnboardingSession | undefined>

// Content engine interface (for hum-content-engine to implement)
type ContentEngine
type ContentEngineRequest
type ContentEngineResponse

// Types
type OnboardingSession
type StepName
type StepResult
type IntakeData
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
2. New migration via `drizzle-kit generate`
3. New Zod schemas (onboardingSessionSchema, create/update variants)
4. Export table + schemas from `index.ts`

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
