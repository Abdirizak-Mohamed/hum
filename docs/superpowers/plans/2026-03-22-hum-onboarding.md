# hum-onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the hum-onboarding backend library package — a step-based pipeline that takes a new client from intake data to brand profile generation and content batch trigger.

**Architecture:** Step-based pipeline with SQLite-backed session tracking. Each step is a self-contained function conforming to a `PipelineStep` interface. An orchestrator iterates through registered steps, persisting state after each. Pure library — no HTTP code.

**Tech Stack:** TypeScript, Drizzle ORM, SQLite, Zod, vitest, OpenAI (via hum-integrations)

**Spec:** `docs/superpowers/specs/2026-03-22-hum-onboarding-design.md`

---

## File Map

### hum-core changes
| File | Action | Responsibility |
|------|--------|---------------|
| `hum-core/src/db/schema.ts` | Modify | Add `onboardingSessions` table |
| `hum-core/src/db/connection.ts` | Modify | Add `onboarding_sessions` to `pushSchema()` |
| `hum-core/src/schemas/index.ts` | Modify | Add Zod schemas for onboarding_sessions |
| `hum-core/src/index.ts` | Modify | Export new table + schemas |

### hum-integrations changes
| File | Action | Responsibility |
|------|--------|---------------|
| `hum-integrations/src/ai/types.ts` | Modify | Add `peakPostingTimes` to `BrandProfileResult`, `brandPreferences` to `BrandInput` |
| `hum-integrations/src/ai/openai.ts` | Modify | Update system prompt to request `peakPostingTimes` |
| `hum-integrations/src/ai/openai.mock.ts` | Modify | Add `peakPostingTimes` to mock fixture |

### hum-onboarding (new package)
| File | Action | Responsibility |
|------|--------|---------------|
| `hum-onboarding/package.json` | Create | Package config with workspace deps |
| `hum-onboarding/tsconfig.json` | Create | Extends base tsconfig |
| `hum-onboarding/vitest.config.ts` | Create | Test config with globals |
| `hum-onboarding/src/engine/interface.ts` | Create | ContentEngine interface + request/response types |
| `hum-onboarding/src/engine/stub.ts` | Create | Stub ContentEngine for MVP |
| `hum-onboarding/src/session/types.ts` | Create | OnboardingSession model, IntakeData Zod schema, StepResult types |
| `hum-onboarding/src/session/repository.ts` | Create | CRUD for onboarding_sessions table |
| `hum-onboarding/src/pipeline/types.ts` | Create | PipelineStep, OnboardingContext, IntegrationClients |
| `hum-onboarding/src/pipeline/orchestrator.ts` | Create | runPipeline loop with resume logic |
| `hum-onboarding/src/pipeline/steps/create-client.ts` | Create | Step 1: create client record |
| `hum-onboarding/src/pipeline/steps/process-menu.ts` | Create | Step 2: LLM menu extraction |
| `hum-onboarding/src/pipeline/steps/generate-brand.ts` | Create | Step 3: LLM brand profile generation |
| `hum-onboarding/src/pipeline/steps/setup-social.ts` | Create | Step 4: store social accounts |
| `hum-onboarding/src/pipeline/steps/trigger-content.ts` | Create | Step 5: call content engine |
| `hum-onboarding/src/prompts/menu-extraction.ts` | Create | Menu structuring prompt |
| `hum-onboarding/src/prompts/brand-generation.ts` | Create | Brand profile prompt |
| `hum-onboarding/src/index.ts` | Create | Public API exports |

### Workspace
| File | Action | Responsibility |
|------|--------|---------------|
| `pnpm-workspace.yaml` | Modify | Add `hum-onboarding` |

---

### Task 1: Prerequisites — hum-integrations type updates

**Files:**
- Modify: `hum-integrations/src/ai/types.ts`
- Modify: `hum-integrations/src/ai/openai.ts:36-61`
- Modify: `hum-integrations/src/ai/openai.mock.ts:11-23`

- [ ] **Step 1: Update `BrandProfileResult` and `BrandInput` types**

In `hum-integrations/src/ai/types.ts`, add `peakPostingTimes` to `BrandProfileResult` and `brandPreferences` to `BrandInput`:

```typescript
export type BrandInput = {
  businessName: string;
  menuDescription: string;
  cuisineType?: string;
  location?: string;
  brandPreferences?: string;
};

export type BrandProfileResult = {
  brandVoiceGuide: string;
  keySellingPoints: string[];
  targetAudienceProfile: string;
  contentThemes: string[];
  hashtagStrategy: string[];
  peakPostingTimes: Record<string, string[]>;
};
```

- [ ] **Step 2: Update the OpenAI system prompt**

In `hum-integrations/src/ai/openai.ts`, update `generateBrandProfile()`:

```typescript
async generateBrandProfile(input: BrandInput): Promise<BrandProfileResult> {
  const systemPrompt = `You are a brand strategist specialising in restaurant and takeaway marketing. Generate a brand profile as JSON with these exact fields: brandVoiceGuide (string), keySellingPoints (string[]), targetAudienceProfile (string), contentThemes (string[]), hashtagStrategy (string[]), peakPostingTimes (object mapping platform names like "instagram", "facebook", "tiktok", "google_business" to arrays of time strings like ["12:00", "18:00", "21:00"]). Return only valid JSON, no markdown.`;

  const userPrompt = [
    `Business: ${input.businessName}`,
    `Menu: ${input.menuDescription}`,
    input.cuisineType ? `Cuisine: ${input.cuisineType}` : '',
    input.location ? `Location: ${input.location}` : '',
    input.brandPreferences ? `Brand preferences: ${input.brandPreferences}` : '',
  ].filter(Boolean).join('\n');
```

- [ ] **Step 3: Update mock provider**

In `hum-integrations/src/ai/openai.mock.ts`, add `peakPostingTimes` to the mock return:

```typescript
async generateBrandProfile(_input: BrandInput): Promise<BrandProfileResult> {
  return {
    brandVoiceGuide: 'Warm, welcoming, and proud of our heritage. Speak like a passionate food lover sharing their favourite dishes with friends. Keep it casual but confident.',
    keySellingPoints: [
      'Authentic family recipes passed down through generations',
      'Fresh ingredients prepared daily — never frozen',
      'Fast delivery within 30 minutes',
    ],
    targetAudienceProfile: 'Local residents aged 18-45, food-delivery users, families looking for convenient dinner options, late-night diners.',
    contentThemes: ['behind-the-scenes prep', 'dish spotlights', 'customer favourites', 'seasonal specials'],
    hashtagStrategy: ['#LocalEats', '#FreshFood', '#FoodDelivery', '#TakeawayNight', '#SupportLocal'],
    peakPostingTimes: {
      instagram: ['12:00', '18:00', '21:00'],
      facebook: ['12:00', '17:00', '20:00'],
      tiktok: ['19:00', '21:00'],
      google_business: ['11:00', '17:00'],
    },
  };
}
```

- [ ] **Step 4: Run existing tests to verify no breakage**

Run: `cd hum-integrations && pnpm test`
Expected: All existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add hum-integrations/src/ai/types.ts hum-integrations/src/ai/openai.ts hum-integrations/src/ai/openai.mock.ts
git commit -m "feat(hum-integrations): add peakPostingTimes to BrandProfileResult and brandPreferences to BrandInput"
```

---

### Task 2: Prerequisites — hum-core schema + workspace setup

**Files:**
- Modify: `hum-core/src/db/schema.ts`
- Modify: `hum-core/src/db/connection.ts:31-94`
- Modify: `hum-core/src/schemas/index.ts`
- Modify: `hum-core/src/index.ts`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Add `onboardingSessions` table to schema**

Append to `hum-core/src/db/schema.ts`:

```typescript
// ── OnboardingSession ──────────────────────────────────

export const onboardingSessions = sqliteTable('onboarding_sessions', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id).unique(),
  status: text('status', { enum: ['in_progress', 'complete', 'failed'] }).notNull().default('in_progress'),
  currentStep: text('current_step'),
  stepResults: text('step_results', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  intakeData: text('intake_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  blockedReason: text('blocked_reason'),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
```

Note: `$type<>()` uses `Record<string, unknown>` here because the specific types (`StepResult`, `IntakeData`) are defined in hum-onboarding, not hum-core. The typed access happens through the session repository in hum-onboarding.

- [ ] **Step 2: Add `onboarding_sessions` to `pushSchema()` in connection.ts**

In `hum-core/src/db/connection.ts`, add to the `pushSchema()` SQL string, after the `content_items` CREATE TABLE:

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

- [ ] **Step 3: Add Zod schemas for onboarding_sessions**

Append to `hum-core/src/schemas/index.ts`:

```typescript
import { onboardingSessions } from '../db/schema.js';

// ── OnboardingSession schemas ──────────────────────────

export const onboardingSessionSchema = createSelectSchema(onboardingSessions);
export const createOnboardingSessionSchema = createInsertSchema(onboardingSessions).omit({
  id: true,
  completedAt: true,
  updatedAt: true,
});
export const updateOnboardingSessionSchema = createSelectSchema(onboardingSessions).omit({
  id: true,
  clientId: true,
  startedAt: true,
  updatedAt: true,
}).partial();
```

Note: The import of `onboardingSessions` should be added to the existing import from `'../db/schema.js'`.

- [ ] **Step 4: Export new table and schemas from index.ts**

In `hum-core/src/index.ts`, update the schema export:

```typescript
export { clients, brandProfiles, socialAccounts, contentItems, onboardingSessions } from './db/schema.js';
```

And add the onboarding session schemas to the schemas export:

```typescript
export {
  clientSchema, createClientSchema, updateClientSchema,
  brandProfileSchema, createBrandProfileSchema, updateBrandProfileSchema,
  socialAccountSchema, createSocialAccountSchema, updateSocialAccountSchema,
  contentItemSchema, createContentItemSchema, updateContentItemSchema,
  onboardingSessionSchema, createOnboardingSessionSchema, updateOnboardingSessionSchema,
} from './schemas/index.js';
```

- [ ] **Step 5: Add `hum-onboarding` to workspace**

In `pnpm-workspace.yaml`:

```yaml
packages:
  - "hum-core"
  - "hum-integrations"
  - "hum-onboarding"
```

- [ ] **Step 6: Generate migration**

Run: `cd hum-core && pnpm db:generate`
Expected: New migration file created in `src/db/migrations/`.

- [ ] **Step 7: Run existing tests to verify no breakage**

Run: `cd hum-core && pnpm test`
Expected: All existing tests pass.

- [ ] **Step 8: Commit**

```bash
git add hum-core/src/db/schema.ts hum-core/src/db/connection.ts hum-core/src/schemas/index.ts hum-core/src/index.ts hum-core/src/db/migrations/ pnpm-workspace.yaml
git commit -m "feat(hum-core): add onboarding_sessions table, schemas, and workspace entry for hum-onboarding"
```

---

### Task 3: Scaffold hum-onboarding package + Content Engine interface

This is an early deliverable so hum-content-engine can build against it.

**Files:**
- Create: `hum-onboarding/package.json`
- Create: `hum-onboarding/tsconfig.json`
- Create: `hum-onboarding/vitest.config.ts`
- Create: `hum-onboarding/src/engine/interface.ts`
- Create: `hum-onboarding/src/engine/stub.ts`
- Test: `hum-onboarding/src/engine/__tests__/stub.test.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "hum-onboarding",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
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

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 4: Create ContentEngine interface**

Create `hum-onboarding/src/engine/interface.ts`:

```typescript
import type { MenuItem } from 'hum-core';

export type ContentEngineRequest = {
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
  batchSize: number;
};

export type ContentEngineResponse = {
  batchId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  itemCount?: number;
};

export interface ContentEngine {
  triggerBatch(request: ContentEngineRequest): Promise<ContentEngineResponse>;
  getBatchStatus(batchId: string): Promise<ContentEngineResponse>;
}
```

- [ ] **Step 5: Write failing test for stub**

Create `hum-onboarding/src/engine/__tests__/stub.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createStubContentEngine } from '../stub.js';

describe('StubContentEngine', () => {
  const engine = createStubContentEngine();

  it('triggerBatch returns queued status with a batchId', async () => {
    const response = await engine.triggerBatch({
      clientId: 'client-1',
      brandProfile: {
        brandVoiceGuide: 'test',
        keySellingPoints: [],
        targetAudienceProfile: 'test',
        contentThemes: [],
        hashtagStrategy: [],
        peakPostingTimes: {},
        menuItems: [],
      },
      platforms: ['instagram'],
      batchSize: 30,
    });

    expect(response.status).toBe('queued');
    expect(response.batchId).toBeDefined();
    expect(typeof response.batchId).toBe('string');
  });

  it('getBatchStatus returns queued status for any batchId', async () => {
    const response = await engine.getBatchStatus('any-id');
    expect(response.status).toBe('queued');
    expect(response.batchId).toBe('any-id');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm install && cd hum-onboarding && pnpm test`
Expected: FAIL — `createStubContentEngine` not found.

- [ ] **Step 7: Implement stub**

Create `hum-onboarding/src/engine/stub.ts`:

```typescript
import { uuidv7 } from 'uuidv7';
import { logger } from 'hum-core';
import type { ContentEngine, ContentEngineRequest, ContentEngineResponse } from './interface.js';

export function createStubContentEngine(): ContentEngine {
  return {
    async triggerBatch(request: ContentEngineRequest): Promise<ContentEngineResponse> {
      logger.info(`[stub] Content batch requested for client ${request.clientId} — engine not yet connected`);
      return { batchId: uuidv7(), status: 'queued' };
    },

    async getBatchStatus(batchId: string): Promise<ContentEngineResponse> {
      return { batchId, status: 'queued' };
    },
  };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd hum-onboarding && pnpm test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add hum-onboarding/package.json hum-onboarding/tsconfig.json hum-onboarding/vitest.config.ts hum-onboarding/src/engine/
git commit -m "feat(hum-onboarding): scaffold package and add ContentEngine interface with stub"
```

---

### Task 4: Session types + OnboardingSession model

**Files:**
- Create: `hum-onboarding/src/session/types.ts`
- Test: `hum-onboarding/src/session/__tests__/types.test.ts`

- [ ] **Step 1: Write failing tests for IntakeData schema and OnboardingSession model**

Create `hum-onboarding/src/session/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { intakeDataSchema, OnboardingSession } from '../types.js';
import type { OnboardingSessionRow } from '../types.js';

describe('intakeDataSchema', () => {
  it('accepts valid intake data with required fields only', () => {
    const result = intakeDataSchema.safeParse({
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
      menu: 'Chicken Kebab £7.99, Lamb Doner £8.99',
    });
    expect(result.success).toBe(true);
  });

  it('accepts full intake data with all optional fields', () => {
    const result = intakeDataSchema.safeParse({
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
      address: '123 High Street',
      phone: '07700 900000',
      latitude: 51.5,
      longitude: -0.1,
      openingHours: { monday: '11:00-23:00' },
      deliveryPlatforms: ['deliveroo', 'uber_eats'],
      planTier: 'growth',
      menu: 'Chicken Kebab £7.99',
      cuisineType: 'Turkish',
      brandPreferences: 'Modern and vibrant',
      socialAccounts: [
        { platform: 'instagram', platformAccountId: '@aliskebabs' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects intake data missing required fields', () => {
    const result = intakeDataSchema.safeParse({
      businessName: "Ali's Kebabs",
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid platform in socialAccounts', () => {
    const result = intakeDataSchema.safeParse({
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
      menu: 'test',
      socialAccounts: [{ platform: 'twitter', platformAccountId: '@test' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('OnboardingSession', () => {
  const baseRow: OnboardingSessionRow = {
    id: 'session-1',
    clientId: 'client-1',
    status: 'in_progress',
    currentStep: 'create_client',
    stepResults: {},
    intakeData: null,
    blockedReason: null,
    startedAt: new Date('2026-01-01'),
    completedAt: null,
    updatedAt: new Date('2026-01-01'),
  };

  it('wraps a row with readonly properties', () => {
    const session = new OnboardingSession(baseRow);
    expect(session.id).toBe('session-1');
    expect(session.status).toBe('in_progress');
  });

  it('isComplete returns true when status is complete', () => {
    const session = new OnboardingSession({ ...baseRow, status: 'complete' });
    expect(session.isComplete()).toBe(true);
  });

  it('isFailed returns true when status is failed', () => {
    const session = new OnboardingSession({ ...baseRow, status: 'failed' });
    expect(session.isFailed()).toBe(true);
  });

  it('getFailedStep returns the name of the failed step', () => {
    const session = new OnboardingSession({
      ...baseRow,
      stepResults: {
        create_client: { status: 'complete' },
        process_menu: { status: 'failed', error: 'LLM error' },
      },
    });
    expect(session.getFailedStep()).toBe('process_menu');
  });

  it('getCompletedSteps returns names of completed steps', () => {
    const session = new OnboardingSession({
      ...baseRow,
      stepResults: {
        create_client: { status: 'complete' },
        process_menu: { status: 'complete' },
        generate_brand: { status: 'processing' },
      },
    });
    expect(session.getCompletedSteps()).toEqual(['create_client', 'process_menu']);
  });

  it('getNextPendingStep returns the first non-complete step', () => {
    const allSteps = ['create_client', 'process_menu', 'generate_brand', 'setup_social', 'trigger_content'] as const;
    const session = new OnboardingSession({
      ...baseRow,
      stepResults: {
        create_client: { status: 'complete' },
        process_menu: { status: 'complete' },
      },
    });
    expect(session.getNextPendingStep([...allSteps])).toBe('generate_brand');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-onboarding && pnpm test`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement session types**

Create `hum-onboarding/src/session/types.ts`:

```typescript
import { z } from 'zod';
import { type InferSelectModel } from 'drizzle-orm';
import { type onboardingSessions } from 'hum-core';

// ── Step types ─────────────────────────────────────────

export const STEP_NAMES = ['create_client', 'process_menu', 'generate_brand', 'setup_social', 'trigger_content'] as const;
export type StepName = typeof STEP_NAMES[number];

export type StepStatus = 'pending' | 'processing' | 'complete' | 'failed';

export type StepResult = {
  status: StepStatus;
  output?: Record<string, unknown>;
  error?: string;
  retryCount?: number;
};

// ── IntakeData ─────────────────────────────────────────

export const intakeDataSchema = z.object({
  // Step 1: Client creation
  businessName: z.string().min(1),
  email: z.string().email(),
  address: z.string().optional(),
  phone: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  openingHours: z.record(z.string(), z.string()).optional(),
  deliveryPlatforms: z.array(z.string()).optional(),
  planTier: z.enum(['starter', 'growth', 'premium']).optional(),

  // Step 2: Menu processing
  menu: z.string().min(1),

  // Step 3: Brand generation
  cuisineType: z.string().optional(),
  brandPreferences: z.string().optional(),

  // Step 4: Social accounts
  socialAccounts: z.array(z.object({
    platform: z.enum(['instagram', 'facebook', 'tiktok', 'google_business']),
    platformAccountId: z.string().min(1),
  })).optional(),
});

export type IntakeData = z.infer<typeof intakeDataSchema>;

// ── OnboardingSession model ────────────────────────────

export type OnboardingSessionRow = InferSelectModel<typeof onboardingSessions>;

export class OnboardingSession {
  readonly id: string;
  readonly clientId: string;
  readonly status: 'in_progress' | 'complete' | 'failed';
  readonly currentStep: string | null;
  readonly stepResults: Record<string, StepResult>;
  readonly intakeData: IntakeData | null;
  readonly blockedReason: string | null;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly updatedAt: Date;

  constructor(row: OnboardingSessionRow) {
    this.id = row.id;
    this.clientId = row.clientId;
    this.status = row.status as 'in_progress' | 'complete' | 'failed';
    this.currentStep = row.currentStep;
    this.stepResults = (row.stepResults ?? {}) as Record<string, StepResult>;
    this.intakeData = row.intakeData as IntakeData | null;
    this.blockedReason = row.blockedReason;
    this.startedAt = row.startedAt;
    this.completedAt = row.completedAt;
    this.updatedAt = row.updatedAt;
  }

  isComplete(): boolean {
    return this.status === 'complete';
  }

  isFailed(): boolean {
    return this.status === 'failed';
  }

  getFailedStep(): StepName | undefined {
    for (const [name, result] of Object.entries(this.stepResults)) {
      if (result.status === 'failed') return name as StepName;
    }
    return undefined;
  }

  getCompletedSteps(): StepName[] {
    return Object.entries(this.stepResults)
      .filter(([, result]) => result.status === 'complete')
      .map(([name]) => name as StepName);
  }

  getNextPendingStep(allSteps: StepName[]): StepName | undefined {
    return allSteps.find((name) => this.stepResults[name]?.status !== 'complete');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd hum-onboarding && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hum-onboarding/src/session/
git commit -m "feat(hum-onboarding): add IntakeData schema and OnboardingSession model"
```

---

### Task 5: Session repository

**Files:**
- Create: `hum-onboarding/src/session/repository.ts`
- Test: `hum-onboarding/src/session/__tests__/repository.test.ts`

- [ ] **Step 1: Write failing tests for session repository**

Create `hum-onboarding/src/session/__tests__/repository.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo } from 'hum-core';
import * as sessionRepo from '../repository.js';
import { OnboardingSession } from '../types.js';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

async function createTestClient() {
  return clientRepo.create(humDb.db, {
    businessName: "Ali's Kebabs",
    email: 'ali@kebabs.com',
  });
}

describe('sessionRepo', () => {
  describe('create', () => {
    it('creates a session and returns an OnboardingSession instance', async () => {
      const client = await createTestClient();
      const session = await sessionRepo.create(humDb.db, {
        clientId: client.id,
        intakeData: {
          businessName: "Ali's Kebabs",
          email: 'ali@kebabs.com',
          menu: 'Chicken Kebab £7.99',
        },
      });
      expect(session).toBeInstanceOf(OnboardingSession);
      expect(session.clientId).toBe(client.id);
      expect(session.status).toBe('in_progress');
      expect(session.intakeData).toBeDefined();
    });
  });

  describe('getById', () => {
    it('returns the session when found', async () => {
      const client = await createTestClient();
      const created = await sessionRepo.create(humDb.db, {
        clientId: client.id,
        intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
      });
      const found = await sessionRepo.getById(humDb.db, created.id);
      expect(found).toBeInstanceOf(OnboardingSession);
      expect(found?.id).toBe(created.id);
    });

    it('returns undefined when not found', async () => {
      const found = await sessionRepo.getById(humDb.db, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('getByClientId', () => {
    it('returns the session for the given client', async () => {
      const client = await createTestClient();
      await sessionRepo.create(humDb.db, {
        clientId: client.id,
        intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
      });
      const found = await sessionRepo.getByClientId(humDb.db, client.id);
      expect(found?.clientId).toBe(client.id);
    });
  });

  describe('update', () => {
    it('updates session fields', async () => {
      const client = await createTestClient();
      const created = await sessionRepo.create(humDb.db, {
        clientId: client.id,
        intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
      });
      const updated = await sessionRepo.update(humDb.db, created.id, {
        status: 'failed',
        blockedReason: 'LLM error',
      });
      expect(updated.status).toBe('failed');
      expect(updated.blockedReason).toBe('LLM error');
    });
  });

  describe('updateStepResult', () => {
    it('saves a step result into the step_results JSON', async () => {
      const client = await createTestClient();
      const session = await sessionRepo.create(humDb.db, {
        clientId: client.id,
        intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
      });
      const updated = await sessionRepo.updateSessionAndStepStatus(
        humDb.db, session.id, 'create_client', 'processing',
      );
      expect(updated.currentStep).toBe('create_client');
      expect(updated.stepResults.create_client?.status).toBe('processing');
    });
  });

  describe('saveStepResult', () => {
    it('saves full step result with output', async () => {
      const client = await createTestClient();
      const session = await sessionRepo.create(humDb.db, {
        clientId: client.id,
        intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
      });
      const updated = await sessionRepo.saveStepResult(
        humDb.db, session.id, 'create_client',
        { status: 'complete', output: { clientId: 'c-123' } },
      );
      expect(updated.stepResults.create_client).toEqual({
        status: 'complete',
        output: { clientId: 'c-123' },
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-onboarding && pnpm test`
Expected: FAIL — `repository` module not found.

- [ ] **Step 3: Implement session repository**

Create `hum-onboarding/src/session/repository.ts`:

```typescript
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { onboardingSessions, NotFoundError } from 'hum-core';
import type * as schema from 'hum-core/dist/db/schema.js';
import { OnboardingSession } from './types.js';
import type { StepName, StepResult, IntakeData } from './types.js';

type Db = BetterSQLite3Database<typeof schema>;

export async function create(
  db: Db,
  data: {
    clientId: string;
    intakeData: IntakeData;
  },
): Promise<OnboardingSession> {
  const now = new Date();
  const id = uuidv7();

  await db.insert(onboardingSessions)
    .values({
      id,
      clientId: data.clientId,
      intakeData: data.intakeData as Record<string, unknown>,
      stepResults: {},
      startedAt: now,
      updatedAt: now,
    })
    .run();

  const row = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, id)).get();
  return new OnboardingSession(row!);
}

export async function getById(db: Db, id: string): Promise<OnboardingSession | undefined> {
  const row = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, id)).get();
  return row ? new OnboardingSession(row) : undefined;
}

export async function getByClientId(db: Db, clientId: string): Promise<OnboardingSession | undefined> {
  const row = await db.select().from(onboardingSessions).where(eq(onboardingSessions.clientId, clientId)).get();
  return row ? new OnboardingSession(row) : undefined;
}

export async function update(
  db: Db,
  id: string,
  data: Partial<{
    status: 'in_progress' | 'complete' | 'failed';
    currentStep: string | null;
    blockedReason: string | null;
    completedAt: Date;
  }>,
): Promise<OnboardingSession> {
  await db.update(onboardingSessions)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(onboardingSessions.id, id))
    .run();

  const row = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, id)).get();
  if (!row) throw new NotFoundError('OnboardingSession', id);
  return new OnboardingSession(row);
}

export async function updateSessionAndStepStatus(
  db: Db,
  sessionId: string,
  stepName: StepName,
  stepStatus: 'processing' | 'pending',
): Promise<OnboardingSession> {
  // Read current step_results, merge in new status, write back
  const row = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId)).get();
  if (!row) throw new NotFoundError('OnboardingSession', sessionId);

  const stepResults = (row.stepResults ?? {}) as Record<string, StepResult>;
  stepResults[stepName] = { ...stepResults[stepName], status: stepStatus };

  await db.update(onboardingSessions)
    .set({
      currentStep: stepName,
      stepResults: stepResults as Record<string, unknown>,
      updatedAt: new Date(),
    } as any)
    .where(eq(onboardingSessions.id, sessionId))
    .run();

  const updated = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId)).get();
  return new OnboardingSession(updated!);
}

export async function saveStepResult(
  db: Db,
  sessionId: string,
  stepName: StepName,
  result: StepResult,
): Promise<OnboardingSession> {
  const row = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId)).get();
  if (!row) throw new NotFoundError('OnboardingSession', sessionId);

  const stepResults = (row.stepResults ?? {}) as Record<string, StepResult>;
  stepResults[stepName] = result;

  await db.update(onboardingSessions)
    .set({
      stepResults: stepResults as Record<string, unknown>,
      updatedAt: new Date(),
    } as any)
    .where(eq(onboardingSessions.id, sessionId))
    .run();

  const updated = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId)).get();
  return new OnboardingSession(updated!);
}
```

Note: The `Db` type import may need adjustment depending on how hum-core exports its schema types. If `import type * as schema from 'hum-core/dist/db/schema.js'` doesn't resolve, use the pattern from hum-integrations which imports from hum-core's public API. The implementer should verify this works and adjust the import path accordingly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd hum-onboarding && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hum-onboarding/src/session/
git commit -m "feat(hum-onboarding): add session repository with step result tracking"
```

---

### Task 6: Pipeline types + orchestrator

**Files:**
- Create: `hum-onboarding/src/pipeline/types.ts`
- Create: `hum-onboarding/src/pipeline/orchestrator.ts`
- Test: `hum-onboarding/src/pipeline/__tests__/orchestrator.test.ts`

- [ ] **Step 1: Create pipeline types**

Create `hum-onboarding/src/pipeline/types.ts`:

```typescript
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from 'hum-core/dist/db/schema.js';
import type { AiClient } from 'hum-integrations';
import type { ContentEngine } from '../engine/interface.js';
import type { OnboardingSession, StepName, StepResult } from '../session/types.js';

export type Db = BetterSQLite3Database<typeof schema>;

export type IntegrationClients = {
  ai: AiClient;
  contentEngine: ContentEngine;
};

export type OnboardingContext = {
  session: OnboardingSession;
  db: Db;
  integrations: IntegrationClients;
};

export type PipelineStep = {
  name: StepName;
  execute(ctx: OnboardingContext): Promise<StepResult>;
};
```

- [ ] **Step 2: Write failing tests for orchestrator**

Create `hum-onboarding/src/pipeline/__tests__/orchestrator.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo } from 'hum-core';
import { runPipeline } from '../orchestrator.js';
import * as sessionRepo from '../../session/repository.js';
import type { PipelineStep, OnboardingContext } from '../types.js';
import type { StepResult } from '../../session/types.js';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

const mockIntegrations = {
  ai: {} as any,
  contentEngine: {} as any,
};

function makeStep(name: string, result: StepResult): PipelineStep {
  return {
    name: name as any,
    execute: async (_ctx: OnboardingContext) => result,
  };
}

function makeFailingStep(name: string, error: string): PipelineStep {
  return {
    name: name as any,
    execute: async () => { throw new Error(error); },
  };
}

describe('runPipeline', () => {
  it('executes all steps in order and marks session complete', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
    });

    const steps = [
      makeStep('create_client', { status: 'complete', output: { clientId: 'c1' } }),
      makeStep('process_menu', { status: 'complete', output: { menuItems: [] } }),
    ];

    const result = await runPipeline(session.id, {
      session,
      db: humDb.db,
      integrations: mockIntegrations,
    }, steps);

    expect(result.status).toBe('complete');
    expect(result.stepResults.create_client?.status).toBe('complete');
    expect(result.stepResults.process_menu?.status).toBe('complete');
  });

  it('skips already completed steps on resume', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
    });

    // Complete step 1 first
    await sessionRepo.saveStepResult(humDb.db, session.id, 'create_client', {
      status: 'complete', output: { clientId: 'c1' },
    });

    const executedSteps: string[] = [];
    const steps: PipelineStep[] = [
      {
        name: 'create_client',
        execute: async () => { executedSteps.push('create_client'); return { status: 'complete' }; },
      },
      {
        name: 'process_menu',
        execute: async () => { executedSteps.push('process_menu'); return { status: 'complete' }; },
      },
    ];

    // Reload session to get updated stepResults
    const updatedSession = await sessionRepo.getById(humDb.db, session.id);

    await runPipeline(session.id, {
      session: updatedSession!,
      db: humDb.db,
      integrations: mockIntegrations,
    }, steps);

    expect(executedSteps).toEqual(['process_menu']);
  });

  it('stops on failure and records error', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
    });

    const steps = [
      makeStep('create_client', { status: 'complete', output: { clientId: 'c1' } }),
      makeFailingStep('process_menu', 'LLM call failed'),
    ];

    const result = await runPipeline(session.id, {
      session,
      db: humDb.db,
      integrations: mockIntegrations,
    }, steps);

    expect(result.status).toBe('failed');
    expect(result.blockedReason).toBe('LLM call failed');
    expect(result.stepResults.process_menu?.status).toBe('failed');
    expect(result.stepResults.process_menu?.error).toBe('LLM call failed');
    // step after failure should not exist
    expect(result.stepResults.generate_brand).toBeUndefined();
  });

  it('increments retryCount on repeated failures', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
    });

    // First failure
    const steps = [makeFailingStep('create_client', 'error 1')];
    const result1 = await runPipeline(session.id, {
      session,
      db: humDb.db,
      integrations: mockIntegrations,
    }, steps);
    expect(result1.stepResults.create_client?.retryCount).toBe(1);

    // Second failure (resume)
    const result2 = await runPipeline(session.id, {
      session: result1,
      db: humDb.db,
      integrations: mockIntegrations,
    }, steps);
    expect(result2.stepResults.create_client?.retryCount).toBe(2);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd hum-onboarding && pnpm test`
Expected: FAIL — `orchestrator` module not found.

- [ ] **Step 4: Implement orchestrator**

Create `hum-onboarding/src/pipeline/orchestrator.ts`:

```typescript
import * as sessionRepo from '../session/repository.js';
import type { OnboardingSession, StepName } from '../session/types.js';
import type { OnboardingContext, PipelineStep } from './types.js';

export async function runPipeline(
  sessionId: string,
  ctx: OnboardingContext,
  steps: PipelineStep[],
): Promise<OnboardingSession> {
  for (const step of steps) {
    const existing = ctx.session.stepResults[step.name];
    if (existing?.status === 'complete') continue;

    await sessionRepo.updateSessionAndStepStatus(ctx.db, sessionId, step.name, 'processing');

    try {
      const result = await step.execute(ctx);
      await sessionRepo.saveStepResult(ctx.db, sessionId, step.name, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await sessionRepo.saveStepResult(ctx.db, sessionId, step.name, {
        status: 'failed',
        error: message,
        retryCount: (existing?.retryCount ?? 0) + 1,
      });
      await sessionRepo.update(ctx.db, sessionId, {
        status: 'failed',
        blockedReason: message,
      });
      const failed = await sessionRepo.getById(ctx.db, sessionId);
      return failed!;
    }
  }

  await sessionRepo.update(ctx.db, sessionId, {
    status: 'complete',
    completedAt: new Date(),
  });
  const completed = await sessionRepo.getById(ctx.db, sessionId);
  return completed!;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd hum-onboarding && pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add hum-onboarding/src/pipeline/
git commit -m "feat(hum-onboarding): add pipeline types and orchestrator with resume support"
```

---

### Task 7: Pipeline step 1 — Create Client

**Files:**
- Create: `hum-onboarding/src/pipeline/steps/create-client.ts`
- Test: `hum-onboarding/src/pipeline/steps/__tests__/create-client.test.ts`

- [ ] **Step 1: Write failing test**

Create `hum-onboarding/src/pipeline/steps/__tests__/create-client.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo } from 'hum-core';
import { createClientStep } from '../create-client.js';
import * as sessionRepo from '../../../session/repository.js';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

describe('createClientStep', () => {
  it('has the correct step name', () => {
    expect(createClientStep.name).toBe('create_client');
  });

  it('updates the existing client with full intake data and returns clientId', async () => {
    // startOnboarding creates a minimal client for the FK — this step enriches it
    const client = await clientRepo.create(humDb.db, {
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: {
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
        address: '123 High Street',
        phone: '07700 900000',
        menu: 'Chicken Kebab £7.99',
        deliveryPlatforms: ['deliveroo'],
        openingHours: { monday: '11:00-23:00' },
      },
    });

    const result = await createClientStep.execute({
      session,
      db: humDb.db,
      integrations: { ai: {} as any, contentEngine: {} as any },
    });

    expect(result.status).toBe('complete');
    expect(result.output?.clientId).toBe(client.id);

    // Verify client was updated (not duplicated)
    const updated = await clientRepo.getById(humDb.db, client.id);
    expect(updated?.address).toBe('123 High Street');
    expect(updated?.phone).toBe('07700 900000');
    expect(updated?.deliveryPlatforms).toEqual(['deliveroo']);
    expect(updated?.openingHours).toEqual({ monday: '11:00-23:00' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-onboarding && pnpm test -- create-client`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement create-client step**

Create `hum-onboarding/src/pipeline/steps/create-client.ts`:

The client already exists (created by `startOnboarding()` for the session FK). This step enriches it with the full intake data and returns its ID for downstream steps.

```typescript
import { clientRepo } from 'hum-core';
import type { PipelineStep } from '../types.js';

export const createClientStep: PipelineStep = {
  name: 'create_client',

  async execute(ctx) {
    const intake = ctx.session.intakeData!;
    const clientId = ctx.session.clientId;

    // Update the existing client with full intake data
    await clientRepo.update(ctx.db, clientId, {
      address: intake.address,
      phone: intake.phone,
      latitude: intake.latitude,
      longitude: intake.longitude,
      openingHours: intake.openingHours,
      deliveryPlatforms: intake.deliveryPlatforms,
      planTier: intake.planTier,
    });

    return {
      status: 'complete',
      output: { clientId },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hum-onboarding && pnpm test -- create-client`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hum-onboarding/src/pipeline/steps/create-client.ts hum-onboarding/src/pipeline/steps/__tests__/create-client.test.ts
git commit -m "feat(hum-onboarding): add create-client pipeline step"
```

---

### Task 8: Pipeline step 2 — Process Menu + prompt

**Files:**
- Create: `hum-onboarding/src/prompts/menu-extraction.ts`
- Create: `hum-onboarding/src/pipeline/steps/process-menu.ts`
- Test: `hum-onboarding/src/prompts/__tests__/menu-extraction.test.ts`
- Test: `hum-onboarding/src/pipeline/steps/__tests__/process-menu.test.ts`

- [ ] **Step 1: Write prompt snapshot test**

Create `hum-onboarding/src/prompts/__tests__/menu-extraction.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildMenuExtractionPrompt } from '../menu-extraction.js';

describe('buildMenuExtractionPrompt', () => {
  it('builds a prompt with the menu text', () => {
    const prompt = buildMenuExtractionPrompt('Chicken Kebab £7.99\nLamb Doner £8.99');
    expect(prompt.systemPrompt).toContain('menu');
    expect(prompt.systemPrompt).toContain('JSON');
    expect(prompt.userPrompt).toContain('Chicken Kebab');
    expect(prompt.userPrompt).toContain('Lamb Doner');
  });

  it('instructs the LLM to return MenuItem[] shape', () => {
    const prompt = buildMenuExtractionPrompt('test');
    expect(prompt.systemPrompt).toContain('name');
    expect(prompt.systemPrompt).toContain('description');
    expect(prompt.systemPrompt).toContain('category');
    expect(prompt.systemPrompt).toContain('price');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-onboarding && pnpm test -- menu-extraction`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement menu extraction prompt**

Create `hum-onboarding/src/prompts/menu-extraction.ts`:

```typescript
import type { CopyPrompt } from 'hum-integrations';

export function buildMenuExtractionPrompt(menuText: string): CopyPrompt {
  const systemPrompt = `You are a menu data extraction specialist for takeaway restaurants. Given a menu in plain text, extract each item and return a JSON array of objects.

Each object must have these exact fields:
- name (string): the dish name
- description (string): a short description — if not provided in the menu, write a brief one based on the dish name and category
- category (string): e.g., "Starters", "Mains", "Sides", "Desserts", "Drinks", "Meal Deals"
- price (number): the price as a number (no currency symbol). If a range, use the lowest price. If no price, use 0.

Understand common takeaway menu conventions:
- Numbered items (e.g., "1. Chicken Tikka") are individual dishes
- Meal deals / combos should be their own category
- "Extras" or "Add-ons" are a separate category
- Sizes (Regular/Large) should be listed as the base item with the lowest price

Return ONLY a valid JSON array. No markdown, no explanation.`;

  return {
    systemPrompt,
    userPrompt: menuText,
    maxTokens: 4000,
  };
}
```

- [ ] **Step 4: Run prompt test to verify it passes**

Run: `cd hum-onboarding && pnpm test -- menu-extraction`
Expected: PASS

- [ ] **Step 5: Write failing test for process-menu step**

Create `hum-onboarding/src/pipeline/steps/__tests__/process-menu.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo } from 'hum-core';
import { processMenuStep } from '../process-menu.js';
import * as sessionRepo from '../../../session/repository.js';
import type { AiClient } from 'hum-integrations';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

const mockAi: AiClient = {
  generateCopy: async () => ({
    text: JSON.stringify([
      { name: 'Chicken Kebab', description: 'Grilled chicken', category: 'Mains', price: 7.99 },
      { name: 'Chips', description: 'Crispy fries', category: 'Sides', price: 2.99 },
    ]),
    usage: { promptTokens: 100, completionTokens: 50 },
  }),
  generateBrandProfile: async () => ({} as any),
  generateImage: async () => ({ imageUrls: [] }),
};

describe('processMenuStep', () => {
  it('has the correct step name', () => {
    expect(processMenuStep.name).toBe('process_menu');
  });

  it('extracts menu items from text via LLM and returns MenuItem[]', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: {
        businessName: 'Test',
        email: 'a@b.com',
        menu: 'Chicken Kebab £7.99\nChips £2.99',
      },
    });

    const result = await processMenuStep.execute({
      session,
      db: humDb.db,
      integrations: { ai: mockAi, contentEngine: {} as any },
    });

    expect(result.status).toBe('complete');
    const items = result.output?.menuItems as any[];
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('Chicken Kebab');
    expect(items[0].price).toBe(7.99);
  });

  it('fails with descriptive error when LLM returns invalid JSON', async () => {
    const badAi: AiClient = {
      ...mockAi,
      generateCopy: async () => ({
        text: 'not valid json',
        usage: { promptTokens: 100, completionTokens: 50 },
      }),
    };

    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'test' },
    });

    const result = await processMenuStep.execute({
      session,
      db: humDb.db,
      integrations: { ai: badAi, contentEngine: {} as any },
    });

    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd hum-onboarding && pnpm test -- process-menu`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement process-menu step**

Create `hum-onboarding/src/pipeline/steps/process-menu.ts`:

```typescript
import { z } from 'zod';
import type { PipelineStep } from '../types.js';
import { buildMenuExtractionPrompt } from '../../prompts/menu-extraction.js';

const menuItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number(),
  photoUrl: z.string().optional(),
});

const menuItemsSchema = z.array(menuItemSchema);

export const processMenuStep: PipelineStep = {
  name: 'process_menu',

  async execute(ctx) {
    const menuText = ctx.session.intakeData!.menu;
    const prompt = buildMenuExtractionPrompt(menuText);

    const response = await ctx.integrations.ai.generateCopy(prompt);

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      return {
        status: 'failed',
        error: `Menu extraction returned invalid JSON: ${response.text.slice(0, 200)}`,
      };
    }

    const validation = menuItemsSchema.safeParse(parsed);
    if (!validation.success) {
      return {
        status: 'failed',
        error: `Menu extraction returned invalid MenuItem[]: ${validation.error.message}`,
      };
    }

    return {
      status: 'complete',
      output: { menuItems: validation.data },
    };
  },
};
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd hum-onboarding && pnpm test -- process-menu`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add hum-onboarding/src/prompts/menu-extraction.ts hum-onboarding/src/prompts/__tests__/ hum-onboarding/src/pipeline/steps/process-menu.ts hum-onboarding/src/pipeline/steps/__tests__/process-menu.test.ts
git commit -m "feat(hum-onboarding): add menu processing step with LLM extraction and Zod validation"
```

---

### Task 9: Pipeline step 3 — Generate Brand Profile + prompt

**Files:**
- Create: `hum-onboarding/src/prompts/brand-generation.ts`
- Create: `hum-onboarding/src/pipeline/steps/generate-brand.ts`
- Test: `hum-onboarding/src/prompts/__tests__/brand-generation.test.ts`
- Test: `hum-onboarding/src/pipeline/steps/__tests__/generate-brand.test.ts`

- [ ] **Step 1: Write prompt snapshot test**

Create `hum-onboarding/src/prompts/__tests__/brand-generation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildBrandInput } from '../brand-generation.js';

describe('buildBrandInput', () => {
  it('builds BrandInput from intake data and menu items', () => {
    const input = buildBrandInput(
      {
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
        menu: 'raw menu text',
        address: 'London',
        cuisineType: 'Turkish',
        brandPreferences: 'Modern and vibrant',
      },
      [
        { name: 'Chicken Kebab', description: 'Grilled chicken', category: 'Mains', price: 7.99 },
      ],
    );

    expect(input.businessName).toBe("Ali's Kebabs");
    expect(input.menuDescription).toContain('Chicken Kebab');
    expect(input.cuisineType).toBe('Turkish');
    expect(input.location).toBe('London');
    expect(input.brandPreferences).toBe('Modern and vibrant');
  });

  it('formats menu items into a readable description', () => {
    const input = buildBrandInput(
      { businessName: 'Test', email: 'a@b.com', menu: 'x' },
      [
        { name: 'Burger', description: 'Beef patty', category: 'Mains', price: 9.99 },
        { name: 'Fries', description: 'Crispy', category: 'Sides', price: 2.99 },
      ],
    );

    expect(input.menuDescription).toContain('Mains');
    expect(input.menuDescription).toContain('Burger');
    expect(input.menuDescription).toContain('Sides');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-onboarding && pnpm test -- brand-generation`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement brand generation prompt builder**

Create `hum-onboarding/src/prompts/brand-generation.ts`:

```typescript
import type { BrandInput } from 'hum-integrations';
import type { MenuItem } from 'hum-core';
import type { IntakeData } from '../session/types.js';

export function buildBrandInput(intake: IntakeData, menuItems: MenuItem[]): BrandInput {
  // Group menu items by category for a readable description
  const byCategory = new Map<string, MenuItem[]>();
  for (const item of menuItems) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  const menuDescription = Array.from(byCategory.entries())
    .map(([category, items]) => {
      const itemList = items.map((i) => `${i.name} (£${i.price})`).join(', ');
      return `${category}: ${itemList}`;
    })
    .join('\n');

  return {
    businessName: intake.businessName,
    menuDescription,
    cuisineType: intake.cuisineType,
    location: intake.address,
    brandPreferences: intake.brandPreferences,
  };
}
```

- [ ] **Step 4: Run prompt test to verify it passes**

Run: `cd hum-onboarding && pnpm test -- brand-generation`
Expected: PASS

- [ ] **Step 5: Write failing test for generate-brand step**

Create `hum-onboarding/src/pipeline/steps/__tests__/generate-brand.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo, brandProfileRepo } from 'hum-core';
import { generateBrandStep } from '../generate-brand.js';
import * as sessionRepo from '../../../session/repository.js';
import type { AiClient } from 'hum-integrations';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

const mockAi: AiClient = {
  generateCopy: async () => ({ text: '', usage: { promptTokens: 0, completionTokens: 0 } }),
  generateBrandProfile: async () => ({
    brandVoiceGuide: 'Warm and welcoming',
    keySellingPoints: ['Fresh ingredients'],
    targetAudienceProfile: 'Local families',
    contentThemes: ['dish spotlights'],
    hashtagStrategy: ['#LocalEats'],
    peakPostingTimes: { instagram: ['12:00', '18:00'] },
  }),
  generateImage: async () => ({ imageUrls: [] }),
};

describe('generateBrandStep', () => {
  it('has the correct step name', () => {
    expect(generateBrandStep.name).toBe('generate_brand');
  });

  it('generates a brand profile and persists it', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: "Ali's Kebabs", email: 'ali@kebabs.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: {
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
        menu: 'Chicken Kebab £7.99',
        cuisineType: 'Turkish',
      },
    });

    // Simulate step 1 and step 2 being complete
    await sessionRepo.saveStepResult(humDb.db, session.id, 'create_client', {
      status: 'complete', output: { clientId: client.id },
    });
    await sessionRepo.saveStepResult(humDb.db, session.id, 'process_menu', {
      status: 'complete',
      output: {
        menuItems: [
          { name: 'Chicken Kebab', description: 'Grilled chicken', category: 'Mains', price: 7.99 },
        ],
      },
    });

    const updatedSession = await sessionRepo.getById(humDb.db, session.id);

    const result = await generateBrandStep.execute({
      session: updatedSession!,
      db: humDb.db,
      integrations: { ai: mockAi, contentEngine: {} as any },
    });

    expect(result.status).toBe('complete');

    // Verify brand profile was persisted
    const profile = await brandProfileRepo.getByClientId(humDb.db, client.id);
    expect(profile).toBeDefined();
    expect(profile?.brandVoiceGuide).toBe('Warm and welcoming');
    expect(profile?.menuItems).toHaveLength(1);
    expect(profile?.peakPostingTimes).toEqual({ instagram: ['12:00', '18:00'] });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd hum-onboarding && pnpm test -- generate-brand`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement generate-brand step**

Create `hum-onboarding/src/pipeline/steps/generate-brand.ts`:

```typescript
import { brandProfileRepo, type MenuItem } from 'hum-core';
import type { PipelineStep } from '../types.js';
import { buildBrandInput } from '../../prompts/brand-generation.js';

export const generateBrandStep: PipelineStep = {
  name: 'generate_brand',

  async execute(ctx) {
    const intake = ctx.session.intakeData!;
    const menuResult = ctx.session.stepResults.process_menu;
    const clientResult = ctx.session.stepResults.create_client;

    const menuItems = (menuResult?.output?.menuItems ?? []) as MenuItem[];
    const clientId = clientResult?.output?.clientId as string;

    const brandInput = buildBrandInput(intake, menuItems);
    const llmResult = await ctx.integrations.ai.generateBrandProfile(brandInput);

    // Compose BrandProfile: LLM-generated fields + menuItems from step 2
    const profile = await brandProfileRepo.create(ctx.db, {
      clientId,
      brandVoiceGuide: llmResult.brandVoiceGuide,
      keySellingPoints: llmResult.keySellingPoints,
      targetAudienceProfile: llmResult.targetAudienceProfile,
      contentThemes: llmResult.contentThemes,
      hashtagStrategy: llmResult.hashtagStrategy,
      peakPostingTimes: llmResult.peakPostingTimes,
      menuItems,
    });

    return {
      status: 'complete',
      output: {
        brandProfileId: profile.id,
        brandVoiceGuide: profile.brandVoiceGuide,
        keySellingPoints: profile.keySellingPoints,
        targetAudienceProfile: profile.targetAudienceProfile,
        contentThemes: profile.contentThemes,
        hashtagStrategy: profile.hashtagStrategy,
        peakPostingTimes: profile.peakPostingTimes,
        menuItems,
      },
    };
  },
};
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd hum-onboarding && pnpm test -- generate-brand`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add hum-onboarding/src/prompts/brand-generation.ts hum-onboarding/src/prompts/__tests__/brand-generation.test.ts hum-onboarding/src/pipeline/steps/generate-brand.ts hum-onboarding/src/pipeline/steps/__tests__/generate-brand.test.ts
git commit -m "feat(hum-onboarding): add brand profile generation step with LLM integration"
```

---

### Task 10: Pipeline steps 4 & 5 — Setup Social + Trigger Content

**Files:**
- Create: `hum-onboarding/src/pipeline/steps/setup-social.ts`
- Create: `hum-onboarding/src/pipeline/steps/trigger-content.ts`
- Test: `hum-onboarding/src/pipeline/steps/__tests__/setup-social.test.ts`
- Test: `hum-onboarding/src/pipeline/steps/__tests__/trigger-content.test.ts`

- [ ] **Step 1: Write failing test for setup-social**

Create `hum-onboarding/src/pipeline/steps/__tests__/setup-social.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo, socialAccountRepo } from 'hum-core';
import { setupSocialStep } from '../setup-social.js';
import * as sessionRepo from '../../../session/repository.js';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

describe('setupSocialStep', () => {
  it('has the correct step name', () => {
    expect(setupSocialStep.name).toBe('setup_social');
  });

  it('creates social accounts for each entry in intake data', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: {
        businessName: 'Test',
        email: 'a@b.com',
        menu: 'x',
        socialAccounts: [
          { platform: 'instagram', platformAccountId: '@aliskebabs' },
          { platform: 'facebook', platformAccountId: 'aliskebabs' },
        ],
      },
    });

    await sessionRepo.saveStepResult(humDb.db, session.id, 'create_client', {
      status: 'complete', output: { clientId: client.id },
    });
    const updatedSession = await sessionRepo.getById(humDb.db, session.id);

    const result = await setupSocialStep.execute({
      session: updatedSession!,
      db: humDb.db,
      integrations: { ai: {} as any, contentEngine: {} as any },
    });

    expect(result.status).toBe('complete');
    const accounts = result.output?.accounts as any[];
    expect(accounts).toHaveLength(2);

    // Verify persisted
    const dbAccounts = await socialAccountRepo.listByClientId(humDb.db, client.id);
    expect(dbAccounts).toHaveLength(2);
    expect(dbAccounts[0].status).toBe('connected');
  });

  it('completes with empty accounts when none provided', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
    });
    await sessionRepo.saveStepResult(humDb.db, session.id, 'create_client', {
      status: 'complete', output: { clientId: client.id },
    });
    const updatedSession = await sessionRepo.getById(humDb.db, session.id);

    const result = await setupSocialStep.execute({
      session: updatedSession!,
      db: humDb.db,
      integrations: { ai: {} as any, contentEngine: {} as any },
    });

    expect(result.status).toBe('complete');
    expect(result.output?.accounts).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-onboarding && pnpm test -- setup-social`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement setup-social step**

Create `hum-onboarding/src/pipeline/steps/setup-social.ts`:

```typescript
import { socialAccountRepo } from 'hum-core';
import type { PipelineStep } from '../types.js';

export const setupSocialStep: PipelineStep = {
  name: 'setup_social',

  async execute(ctx) {
    const intake = ctx.session.intakeData!;
    const clientId = ctx.session.stepResults.create_client?.output?.clientId as string;
    const socialAccounts = intake.socialAccounts ?? [];

    const created = [];
    for (const account of socialAccounts) {
      await socialAccountRepo.create(ctx.db, {
        clientId,
        platform: account.platform,
        platformAccountId: account.platformAccountId,
        status: 'connected',
      });
      created.push({
        platform: account.platform,
        platformAccountId: account.platformAccountId,
      });
    }

    return {
      status: 'complete',
      output: { accounts: created },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hum-onboarding && pnpm test -- setup-social`
Expected: PASS

- [ ] **Step 5: Write failing test for trigger-content**

Create `hum-onboarding/src/pipeline/steps/__tests__/trigger-content.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo } from 'hum-core';
import { triggerContentStep } from '../trigger-content.js';
import * as sessionRepo from '../../../session/repository.js';
import { createStubContentEngine } from '../../../engine/stub.js';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

describe('triggerContentStep', () => {
  it('has the correct step name', () => {
    expect(triggerContentStep.name).toBe('trigger_content');
  });

  it('calls contentEngine.triggerBatch with data from prior steps', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
    });

    // Simulate prior steps
    await sessionRepo.saveStepResult(humDb.db, session.id, 'create_client', {
      status: 'complete', output: { clientId: client.id },
    });
    await sessionRepo.saveStepResult(humDb.db, session.id, 'process_menu', {
      status: 'complete',
      output: { menuItems: [{ name: 'Kebab', description: 'Tasty', category: 'Mains', price: 8 }] },
    });
    await sessionRepo.saveStepResult(humDb.db, session.id, 'generate_brand', {
      status: 'complete',
      output: {
        brandProfileId: 'bp-1',
        brandVoiceGuide: 'Warm',
        keySellingPoints: ['Fresh'],
        targetAudienceProfile: 'Locals',
        contentThemes: ['food'],
        hashtagStrategy: ['#eats'],
        peakPostingTimes: { instagram: ['12:00'] },
        menuItems: [{ name: 'Kebab', description: 'Tasty', category: 'Mains', price: 8 }],
      },
    });
    await sessionRepo.saveStepResult(humDb.db, session.id, 'setup_social', {
      status: 'complete',
      output: { accounts: [{ platform: 'instagram', platformAccountId: '@test' }] },
    });

    const updatedSession = await sessionRepo.getById(humDb.db, session.id);

    const result = await triggerContentStep.execute({
      session: updatedSession!,
      db: humDb.db,
      integrations: { ai: {} as any, contentEngine: createStubContentEngine() },
    });

    expect(result.status).toBe('complete');
    expect(result.output?.contentBatchId).toBeDefined();
    expect(result.output?.status).toBe('queued');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd hum-onboarding && pnpm test -- trigger-content`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement trigger-content step**

Create `hum-onboarding/src/pipeline/steps/trigger-content.ts`:

```typescript
import type { MenuItem } from 'hum-core';
import type { PipelineStep } from '../types.js';

export const triggerContentStep: PipelineStep = {
  name: 'trigger_content',

  async execute(ctx) {
    const clientId = ctx.session.stepResults.create_client?.output?.clientId as string;
    const brandOutput = ctx.session.stepResults.generate_brand?.output ?? {};
    const socialOutput = ctx.session.stepResults.setup_social?.output ?? {};

    const accounts = (socialOutput.accounts ?? []) as Array<{ platform: string }>;
    const platforms = accounts.map((a) => a.platform);

    const response = await ctx.integrations.contentEngine.triggerBatch({
      clientId,
      brandProfile: {
        brandVoiceGuide: brandOutput.brandVoiceGuide as string,
        keySellingPoints: brandOutput.keySellingPoints as string[],
        targetAudienceProfile: brandOutput.targetAudienceProfile as string,
        contentThemes: brandOutput.contentThemes as string[],
        hashtagStrategy: brandOutput.hashtagStrategy as string[],
        peakPostingTimes: brandOutput.peakPostingTimes as Record<string, string[]>,
        menuItems: brandOutput.menuItems as MenuItem[],
      },
      platforms,
      batchSize: 30,
    });

    return {
      status: 'complete',
      output: {
        contentBatchId: response.batchId,
        status: response.status,
      },
    };
  },
};
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd hum-onboarding && pnpm test -- trigger-content`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add hum-onboarding/src/pipeline/steps/setup-social.ts hum-onboarding/src/pipeline/steps/trigger-content.ts hum-onboarding/src/pipeline/steps/__tests__/
git commit -m "feat(hum-onboarding): add setup-social and trigger-content pipeline steps"
```

---

### Task 11: Public API — index.ts + integration test

**Files:**
- Create: `hum-onboarding/src/index.ts`
- Test: `hum-onboarding/src/__tests__/index.test.ts`

- [ ] **Step 1: Write failing integration test for startOnboarding**

Create `hum-onboarding/src/__tests__/index.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo, brandProfileRepo, socialAccountRepo } from 'hum-core';
import { startOnboarding, resumeOnboarding, getOnboardingStatus, getOnboardingByClientId } from '../index.js';
import { createStubContentEngine } from '../engine/stub.js';
import type { AiClient } from 'hum-integrations';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

// Custom mock that returns valid JSON from generateCopy (for menu extraction)
// and valid BrandProfileResult from generateBrandProfile.
// Cannot use createAiClient({ mock: true }) because its generateCopy returns
// prose text, not JSON — which would fail the menu extraction Zod validation.
const mockAi: AiClient = {
  generateCopy: async () => ({
    text: JSON.stringify([
      { name: 'Chicken Kebab', description: 'Grilled chicken in pitta', category: 'Mains', price: 7.99 },
      { name: 'Lamb Doner', description: 'Shaved lamb with salad', category: 'Mains', price: 8.99 },
      { name: 'Chips', description: 'Crispy fries', category: 'Sides', price: 2.99 },
    ]),
    usage: { promptTokens: 100, completionTokens: 80 },
  }),
  generateBrandProfile: async () => ({
    brandVoiceGuide: 'Warm, welcoming, and proud of our heritage.',
    keySellingPoints: ['Fresh ingredients daily', 'Fast delivery'],
    targetAudienceProfile: 'Local residents aged 18-45',
    contentThemes: ['dish spotlights', 'behind-the-scenes'],
    hashtagStrategy: ['#LocalEats', '#FreshFood'],
    peakPostingTimes: { instagram: ['12:00', '18:00'], facebook: ['17:00'] },
  }),
  generateImage: async () => ({ imageUrls: [] }),
};

const integrations = {
  ai: mockAi,
  contentEngine: createStubContentEngine(),
};

describe('startOnboarding', () => {
  it('runs the full pipeline and returns a completed session', async () => {
    const session = await startOnboarding(humDb.db, {
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
      address: '123 High Street, London',
      menu: 'Chicken Kebab £7.99\nLamb Doner £8.99\nChips £2.99',
      cuisineType: 'Turkish',
      socialAccounts: [
        { platform: 'instagram', platformAccountId: '@aliskebabs' },
      ],
    }, integrations);

    expect(session.isComplete()).toBe(true);
    expect(session.getCompletedSteps()).toHaveLength(5);

    // Verify side effects: client updated, brand profile + social account created
    const clientId = session.stepResults.create_client?.output?.clientId as string;
    const client = await clientRepo.getById(humDb.db, clientId);
    expect(client?.businessName).toBe("Ali's Kebabs");
    expect(client?.address).toBe('123 High Street, London');

    const profile = await brandProfileRepo.getByClientId(humDb.db, clientId);
    expect(profile).toBeDefined();
    expect(profile?.menuItems.length).toBeGreaterThan(0);

    const accounts = await socialAccountRepo.listByClientId(humDb.db, clientId);
    expect(accounts).toHaveLength(1);
    expect(accounts[0].platform).toBe('instagram');
  });

  it('throws DuplicateError when session already exists for client email', async () => {
    await startOnboarding(humDb.db, {
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
      menu: 'Chicken Kebab £7.99',
    }, integrations);

    await expect(startOnboarding(humDb.db, {
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
      menu: 'Chicken Kebab £7.99',
    }, integrations)).rejects.toThrow('already exists');
  });
});

describe('resumeOnboarding', () => {
  it('resumes a failed session from where it left off', async () => {
    // Use a mock that fails on first brand generation call, then succeeds
    let brandCallCount = 0;
    const failOnceAi: AiClient = {
      ...mockAi,
      generateBrandProfile: async () => {
        brandCallCount++;
        if (brandCallCount === 1) throw new Error('Temporary LLM failure');
        return mockAi.generateBrandProfile({} as any);
      },
    };

    // Start onboarding — will fail at step 3
    const failedSession = await startOnboarding(humDb.db, {
      businessName: 'Test Resume',
      email: 'resume@test.com',
      menu: 'Burger £5.99',
    }, { ai: failOnceAi, contentEngine: createStubContentEngine() });

    expect(failedSession.isFailed()).toBe(true);
    expect(failedSession.getFailedStep()).toBe('generate_brand');
    expect(failedSession.getCompletedSteps()).toEqual(['create_client', 'process_menu']);

    // Resume — brand generation will succeed this time
    const resumed = await resumeOnboarding(
      humDb.db,
      failedSession.id,
      { ai: failOnceAi, contentEngine: createStubContentEngine() },
    );

    expect(resumed.isComplete()).toBe(true);
    expect(resumed.getCompletedSteps()).toHaveLength(5);
  });
});

describe('getOnboardingStatus', () => {
  it('returns the session by id', async () => {
    const session = await startOnboarding(humDb.db, {
      businessName: 'Test', email: 'test@test.com', menu: 'x',
    }, integrations);

    const status = await getOnboardingStatus(humDb.db, session.id);
    expect(status.id).toBe(session.id);
    expect(status.isComplete()).toBe(true);
  });
});

describe('getOnboardingByClientId', () => {
  it('returns the session for the given client', async () => {
    const session = await startOnboarding(humDb.db, {
      businessName: 'Test', email: 'test@test.com', menu: 'x',
    }, integrations);

    const clientId = session.stepResults.create_client?.output?.clientId as string;
    const found = await getOnboardingByClientId(humDb.db, clientId);
    expect(found?.id).toBe(session.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-onboarding && pnpm test -- index`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement public API**

Create `hum-onboarding/src/index.ts`:

```typescript
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from 'hum-core/dist/db/schema.js';
import { clientRepo, DuplicateError, NotFoundError } from 'hum-core';
import { runPipeline } from './pipeline/orchestrator.js';
import * as sessionRepo from './session/repository.js';
import { intakeDataSchema } from './session/types.js';
import { createClientStep } from './pipeline/steps/create-client.js';
import { processMenuStep } from './pipeline/steps/process-menu.js';
import { generateBrandStep } from './pipeline/steps/generate-brand.js';
import { setupSocialStep } from './pipeline/steps/setup-social.js';
import { triggerContentStep } from './pipeline/steps/trigger-content.js';
import type { IntegrationClients } from './pipeline/types.js';
import type { IntakeData, OnboardingSession } from './session/types.js';

type Db = BetterSQLite3Database<typeof schema>;

const ALL_STEPS = [
  createClientStep,
  processMenuStep,
  generateBrandStep,
  setupSocialStep,
  triggerContentStep,
];

export async function startOnboarding(
  db: Db,
  intakeData: IntakeData,
  integrations: IntegrationClients,
): Promise<OnboardingSession> {
  // Validate intake data
  const parsed = intakeDataSchema.parse(intakeData);

  // Check for existing client with same email
  const existingClient = await clientRepo.getByEmail(db, parsed.email);
  if (existingClient) {
    const existingSession = await sessionRepo.getByClientId(db, existingClient.id);
    if (existingSession) {
      throw new DuplicateError('OnboardingSession', 'email', parsed.email);
    }
  }

  // Create the client record with minimal data for the session FK.
  // Step 1 (createClientStep) enriches it with the full intake data.
  const client = await clientRepo.create(db, {
    businessName: parsed.businessName,
    email: parsed.email,
  });

  const session = await sessionRepo.create(db, {
    clientId: client.id,
    intakeData: parsed,
  });

  return runPipeline(session.id, {
    session,
    db,
    integrations,
  }, ALL_STEPS);
}

export async function resumeOnboarding(
  db: Db,
  sessionId: string,
  integrations: IntegrationClients,
): Promise<OnboardingSession> {
  const session = await sessionRepo.getById(db, sessionId);
  if (!session) throw new NotFoundError('OnboardingSession', sessionId);

  return runPipeline(sessionId, {
    session,
    db,
    integrations,
  }, ALL_STEPS);
}

export async function getOnboardingStatus(
  db: Db,
  sessionId: string,
): Promise<OnboardingSession> {
  const session = await sessionRepo.getById(db, sessionId);
  if (!session) throw new NotFoundError('OnboardingSession', sessionId);
  return session;
}

export async function getOnboardingByClientId(
  db: Db,
  clientId: string,
): Promise<OnboardingSession | undefined> {
  return sessionRepo.getByClientId(db, clientId);
}

// Re-export types for consumers
export type { ContentEngine, ContentEngineRequest, ContentEngineResponse } from './engine/interface.js';
export type { OnboardingSession, IntakeData, StepName, StepResult, StepStatus } from './session/types.js';
export type { IntegrationClients } from './pipeline/types.js';
export { createStubContentEngine } from './engine/stub.js';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd hum-onboarding && pnpm test`
Expected: PASS (all tests)

- [ ] **Step 5: Run full monorepo test suite**

Run: `pnpm test` (from root)
Expected: All packages pass.

- [ ] **Step 6: Verify TypeScript compilation**

Run: `cd hum-onboarding && pnpm build`
Expected: Clean compile, no errors.

- [ ] **Step 7: Commit**

```bash
git add hum-onboarding/src/index.ts hum-onboarding/src/__tests__/
git commit -m "feat(hum-onboarding): add public API with startOnboarding, resumeOnboarding, and status queries"
```

---

### Task 12: Final verification + cleanup

- [ ] **Step 1: Run all tests across the monorepo**

Run: `pnpm test`
Expected: All packages pass.

- [ ] **Step 2: Run TypeScript build for all packages**

Run: `pnpm build`
Expected: Clean compile across hum-core, hum-integrations, hum-onboarding.

- [ ] **Step 3: Verify exports by reviewing index.ts**

Read `hum-onboarding/src/index.ts` and verify all public types and functions listed in the spec's Public API section are exported.

- [ ] **Step 4: Commit any final adjustments**

Only if needed from steps 1-3.

---

## Implementation Notes

### Client Creation + Session FK

`startOnboarding()` creates a minimal client record first (for the session FK constraint), then `createClientStep` enriches it with the full intake data. This avoids creating duplicate clients — the session's `clientId` is the same entity throughout the pipeline.

### Import Path for Db Type

The `Db` type requires importing the Drizzle schema types. The pattern `import type * as schema from 'hum-core/dist/db/schema.js'` depends on hum-core being built first. If this causes issues, an alternative is to re-export the `Db` type from hum-core's public API. The implementer should test this and adjust.
