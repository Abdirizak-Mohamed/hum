# hum-content-engine — Design Specification

## Overview

The core revenue engine. Generates, composes, and schedules social media content weekly for every active client. Runs a DAG pipeline per client: plan a content calendar, generate media and copy in parallel, compose final posts, and schedule them via Ayrshare.

## Agreed Assumptions

1. **Infrastructure:** In-process queue (`p-queue`) for concurrency control, no Redis/BullMQ. Cloud-ready via interfaces.
2. **Integrations:** Codes against real hum-integrations interfaces (`AiClient`, `SocialClient`). Mock mode via `HUM_MOCK_INTEGRATIONS=true`.
3. **Triggering:** CLI for manual/dev use + node-cron for automated weekly runs.
4. **Media storage:** Local filesystem behind a `StorageClient` interface. Swappable to S3/R2 by implementing the same interface.
5. **Content approval:** Auto-schedule immediately. No human review workflow in MVP.
6. **Model configuration:** Optional `model` field added to `CopyPrompt` in hum-integrations. Content engine controls model per-call.
7. **MVP content types:** `food_hero`, `deal_offer`, `google_post` only. Three types that cover all plan tiers.
8. **Seasonal awareness:** Pass current date + location to the LLM. No static calendar — LLM uses its own knowledge.
9. **Package structure:** Standalone `hum-content-engine` workspace package, same pattern as hum-core and hum-integrations.
10. **Architecture:** DAG pipeline — media and copy generation run in parallel, everything else sequential.
11. **ContentItem mapping:** One ContentItem per PlannedPost x Platform combination. The `platforms` field on ContentItem holds a single-element array. This preserves per-platform captions and simplifies scheduling.
12. **TikTok in MVP:** Intentionally excluded from MVP generation. Growth/premium clients with TikTok in their plan will not receive TikTok posts until video content types are added.

## Dependencies

- `hum-core` (workspace) — Client, BrandProfile, ContentItem, repositories, plan config, platform specs
- `hum-integrations` (workspace) — AiClient, SocialClient, factory functions
- `p-queue` — In-process concurrency control for media/copy generation and client processing
- `node-cron` — Scheduled weekly pipeline runs
- `zod` — Validate LLM output (calendar plans must parse to a known shape)

## Package Structure

```
hum-content-engine/
├── src/
│   ├── pipeline/
│   │   ├── plan-calendar.ts       # Step 1: LLM plans weekly content calendar
│   │   ├── generate-media.ts      # Step 2a: Image generation via fal.ai
│   │   ├── generate-copy.ts       # Step 2b: Caption/copy generation via OpenAI
│   │   ├── compose-posts.ts       # Step 3: Assemble media + copy into ContentItems
│   │   ├── schedule-posts.ts      # Step 4: Schedule via Ayrshare
│   │   └── orchestrator.ts        # DAG runner: coordinates all steps for one client
│   ├── prompts/
│   │   ├── calendar.ts            # System/user prompts for calendar planning
│   │   ├── image.ts               # Food photography prompt builder
│   │   ├── copy.ts                # Platform-specific caption prompts
│   │   └── utils.ts               # Brand voice injection, menu formatting helpers
│   ├── storage/
│   │   ├── types.ts               # StorageClient interface
│   │   └── local.ts               # Local filesystem implementation
│   ├── config.ts                  # Engine config (models, concurrency, paths)
│   ├── scheduler.ts               # node-cron setup for weekly runs
│   ├── cli.ts                     # CLI entry point
│   └── index.ts                   # Public API
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Core Types

```typescript
// --- Engine Configuration ---

type ContentEngineConfig = {
  models: {
    planning: string;    // e.g., 'gpt-4o'
    copy: string;        // e.g., 'gpt-4o-mini'
  };
  storage: {
    basePath: string;    // e.g., './media'
  };
  concurrency: {
    mediaGeneration: number;   // max parallel fal.ai calls (default: 3)
    copyGeneration: number;    // max parallel OpenAI calls (default: 5)
    clientProcessing: number;  // max clients processed in parallel (default: 2)
  };
  cron?: {
    schedule: string;    // cron expression, e.g., '0 2 * * 0' (Sunday 2am)
  };
};

// --- Calendar Planning ---

type PlannedPost = {
  date: string;                  // ISO date, e.g., '2026-03-23'
  contentType: 'food_hero' | 'deal_offer' | 'google_post';
  platforms: Platform[];
  menuItem?: MenuItem;           // which dish to feature (food_hero, deal_offer)
  theme: string;                 // e.g., 'Friday night feast'
  brief: string;                 // creative direction for generation
};

type ContentCalendar = {
  clientId: string;
  weekStarting: string;          // ISO date
  posts: PlannedPost[];
};

// --- Media Generation ---

type GeneratedMedia = {
  plannedPost: PlannedPost;
  localPath: string;             // path in local storage
  mimeType: string;              // 'image/png', 'image/jpeg'
};

// --- Copy Generation ---

type GeneratedCopy = {
  plannedPost: PlannedPost;
  platform: Platform;
  caption: string;
  hashtags: string[];
  cta: string;
};

// --- Composed Post (ready to schedule) ---

type ComposedPost = {
  plannedPost: PlannedPost;
  platform: Platform;
  caption: string;
  hashtags: string[];
  cta: string;
  mediaPath: string;
  scheduledAt: string;           // ISO datetime
};

// --- Pipeline Result ---

type PipelineResult = {
  clientId: string;
  weekStarting: string;
  planned: number;
  generated: number;
  scheduled: number;
  failed: number;
  errors: PipelineError[];
};

type PipelineError = {
  step: 'plan' | 'media' | 'copy' | 'compose' | 'schedule';
  postIndex?: number;
  message: string;
  cause?: unknown;
};

// --- Storage Interface ---

interface StorageClient {
  save(clientId: string, contentId: string, data: Buffer, ext: string): Promise<string>;
  getUrl(path: string): string;
  delete(path: string): Promise<void>;
}
```

## Pipeline Flow

The orchestrator runs the DAG for a single client:

```typescript
async function runPipeline(
  client: Client,
  brandProfile: BrandProfile,
  deps: {
    ai: AiClient;
    social: SocialClient;
    storage: StorageClient;
    db: HumDb;
    config: ContentEngineConfig;
  }
): Promise<PipelineResult>
```

### Step 1: Plan Calendar

`planCalendar(client, brandProfile, config) → ContentCalendar`

- Builds a prompt with business name, location, menu items, brand voice, content themes, plan tier limits, current date
- Calls `ai.generateCopy()` with the planning model (e.g., `gpt-4o`)
- Parses LLM JSON output through a Zod schema matching `PlannedPost[]`
- On invalid JSON: retries once with error correction prompt ("Your previous response was invalid: {zodError}. Please fix and return valid JSON.")
- On second failure: aborts pipeline for this client
- Filters posts to only MVP-supported platforms (instagram, facebook, google_business) intersected with the client's plan tier platforms. This means TikTok is excluded even for growth/premium tiers until video content types are added.

### Step 2a: Generate Media (parallel with 2b)

`generateMedia(calendar, brandProfile, storage, ai) → GeneratedMedia[]`

- For each `PlannedPost`, builds an image prompt encoding food photography domain knowledge:
  - `food_hero`: professional food photography, varied angles/lighting/styling
  - `deal_offer`: bold promotional graphic with brand colours, space for text overlay
  - `google_post`: clean, professional, bright, Google Business appropriate
- Calls `ai.generateImage()` per post
- Saves image buffer to `StorageClient`
- Concurrency controlled by `p-queue` (default: 3 parallel)
- On individual failure: skip that post, continue with remaining

### Step 2b: Generate Copy (parallel with 2a)

`generateCopy(calendar, brandProfile, ai, config) → GeneratedCopy[]`

- For each `PlannedPost` x `platform` combination, builds a platform-specific caption prompt:
  - Instagram: aspirational tone, 3-5 hashtags, storytelling, max 2200 chars
  - Facebook: community-oriented, clear CTA, 1-2 hashtags, max 63206 chars
  - Google Business: concise, keyword-rich, offer-focused, no hashtags, max 1500 chars
- Calls `ai.generateCopy()` with the copy model (e.g., `gpt-4o-mini`)
- All copy generated in the brand's voice (brandVoiceGuide injected into system prompt)
- Concurrency controlled by `p-queue` (default: 5 parallel)
- On individual failure: skip that post/platform combo, continue

### Step 3: Compose Posts

`composePosts(calendar, media[], copy[], brandProfile, db) → ComposedPost[]`

- Matches each `PlannedPost` to its generated media and per-platform copy
- Determines `scheduledAt` from `brandProfile.peakPostingTimes` for each platform. `peakPostingTimes` is `Record<Platform, string[]>` where keys are platform names and values are time strings (e.g., `{ instagram: ["12:00", "18:00"], facebook: ["11:00"] }`). Picks the best available slot for the post's date, spreading posts across available times to avoid clustering.
- Enforces quality safeguards:
  - Caption within platform character limits (truncate if needed)
  - Hashtag deduplication within each post
  - No duplicate menu items in the same week
- Creates `ContentItem` rows in DB with status `draft`
- Returns `ComposedPost[]`
- Posts missing media or copy (due to earlier failures) are skipped

### Step 4: Schedule Posts

`schedulePosts(composedPosts, profileKey, social, storage, db) → void`

- For each `ComposedPost`:
  - Resolves media URL via `storage.getUrl(composedPost.mediaPath)` (local path → absolute path; on S3 this returns a presigned URL)
  - Calls `social.schedulePost()` with the resolved media URL + caption + scheduled time
  - Updates ContentItem status: `draft` → `scheduled`
  - On failure: updates status to `failed`, logs error, continues with remaining posts
- Sequential per post (Ayrshare rate limits)

### Error Handling

- **Calendar planning fails** → abort pipeline for this client, log error
- **Individual media/copy generation fails** → skip that post, continue with remaining. Log which posts were dropped.
- **Composition fails for a post** → skip it, continue
- **Scheduling fails for a post** → mark ContentItem as `failed`, continue. Post stays in DB for retry.
- All errors collected in `PipelineResult.errors`

## Prompt Engineering

### Calendar Planning Prompt

System prompt:
- "You are a social media strategist for restaurants"
- "Plan content calendars for the next 7 days"
- "Return valid JSON matching the PlannedPost[] schema"
- "Content types available: food_hero, deal_offer, google_post"
- "Respect the postsPerWeek limit"
- "Vary menu items, themes, and content types across the week"

User prompt includes:
- Business name, location, cuisine type
- Full menu items list (name, description, category, price)
- Brand voice guide and content themes
- Target platforms for this plan tier
- Current date and day of week
- Recently posted menu items (to avoid repetition)

### Image Prompt Builder

Encodes food photography domain knowledge per content type:

- **food_hero:** "Professional food photography of {dish}. Style: {brand aesthetic}. Angle: {overhead|45-degree|close-up}. Lighting: warm, appetizing. Props: {contextual}. Aspect ratio: {platformSpecs}."
- **deal_offer:** "Bold promotional graphic for {theme}. Feature: {deal details}. Style: eye-catching, {brand colours}. Include space for text overlay. Aspect ratio: {platformSpecs}."
- **google_post:** "Clean, professional photo of {dish/storefront}. Style: bright, inviting. Aspect ratio: 4:3."

Angle, lighting, and styling vary randomly from curated sets to avoid visual repetition across the week.

### Copy Prompt Builder

System prompt:
- "You write social media captions for restaurants"
- "Write in this brand voice: {brandVoiceGuide}"
- "Return JSON: { caption, hashtags: string[], cta }"

Platform-specific instructions baked into the prompt per platform.

User prompt includes content type, theme, menu item details, key selling points, brand hashtag strategy.

## Storage

### StorageClient Interface

```typescript
interface StorageClient {
  save(clientId: string, contentId: string, data: Buffer, ext: string): Promise<string>;
  getUrl(path: string): string;
  delete(path: string): Promise<void>;
}
```

### Local Implementation

- Writes to `{basePath}/{clientId}/{contentId}.{ext}`
- Creates directories as needed
- `getUrl()` returns absolute filesystem path
- To migrate to cloud: implement `S3StorageClient` with same interface, `getUrl()` returns presigned URL

## Scheduler

```typescript
function startScheduler(
  config: ContentEngineConfig,
  deps: { ai: AiClient; social: SocialClient; storage: StorageClient; db: HumDb }
): void
```

- Registers cron job at `config.cron.schedule` (default: `0 2 * * 0` — Sunday 2am)
- On trigger: fetches all active clients, fetches brand profiles, runs pipeline per client
- Client processing concurrency controlled by `p-queue` at `config.concurrency.clientProcessing`
- Logs per-client `PipelineResult` and overall summary

## CLI

```
pnpm content-engine <command> [options]

Commands:
  generate --client <id>    Run pipeline for one client
  generate --all            Run pipeline for all active clients
  start                     Start the cron scheduler (long-running)

Options:
  --dry-run    Generate content but don't schedule (posts stay as drafts)
  --mock       Force mock integrations regardless of env var
```

Lightweight argument parsing with `process.argv`. No CLI framework needed for 3 commands.

## Public API

```typescript
export {
  // Core pipeline
  runPipeline,
  type PipelineResult,
  type PipelineError,

  // Types
  type ContentEngineConfig,
  type ContentCalendar,
  type PlannedPost,
  type ComposedPost,
  type GeneratedMedia,
  type GeneratedCopy,

  // Storage
  type StorageClient,
  LocalStorageClient,

  // Scheduler
  startScheduler,
}
```

## Testing Strategy

All tests use mock integrations and in-memory SQLite. No external services needed.

### Unit Tests

**prompts/**
- `calendar.test.ts` — Verify prompt includes menu items, brand voice, plan tier limits, current date
- `image.test.ts` — Verify correct aspect ratio per platform, photography style varies by content type
- `copy.test.ts` — Verify platform-specific instructions, character limits, hashtag strategy included

**pipeline/**
- `plan-calendar.test.ts` — Mock AiClient returns canned JSON. Zod validation catches bad output. Retry on invalid JSON. Posts filtered to plan tier platforms.
- `generate-media.test.ts` — Mock AiClient returns image URLs. Images saved to storage. Concurrency limit respected. Partial failure handled.
- `generate-copy.test.ts` — Mock AiClient returns canned captions. Per-platform copy generated. Correct model passed per config.
- `compose-posts.test.ts` — ContentItems created in DB. Character limit enforcement. Hashtag deduplication.
- `schedule-posts.test.ts` — Mock SocialClient. Status transitions draft → scheduled. Failed posts marked. Continues on single failure.

**storage/**
- `local.test.ts` — Write, read path, delete. Directory creation. Uses tmp dir.

### Integration Tests

- `orchestrator.test.ts` — Full pipeline with mock integrations + in-memory DB + tmp storage. Verifies ContentItems in DB, media on disk, PipelineResult counts, partial failure handling.
- `cli.test.ts` — Spawn CLI subprocess, verify exit codes for generate --client, --dry-run, --mock.

### What We Don't Test

- Real API calls — that's hum-integrations' responsibility
- Prompt quality — subjective, tuned manually
- Cron timing — trust node-cron

## Required Changes to hum-integrations

### 1. Add optional `model` field to `CopyPrompt`

```typescript
// hum-integrations/src/ai/types.ts
type CopyPrompt = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  model?: string;        // NEW — e.g., 'gpt-4o', 'gpt-4o-mini'
};
```

OpenAI provider uses `prompt.model` when provided, falls back to its default.

### 2. Platform aspect ratio to ImagePrompt.imageSize mapping

The existing `ImagePrompt.imageSize` supports: `'square_hd' | 'landscape_4_3' | 'portrait_hd'`. The content engine maps platform aspect ratios as follows:

```typescript
// In prompts/utils.ts
const ASPECT_RATIO_MAP: Record<string, ImagePrompt['imageSize']> = {
  '1:1':  'square_hd',       // Instagram
  '4:3':  'landscape_4_3',   // Google Business
  '16:9': 'landscape_4_3',   // Facebook (closest available)
  '9:16': 'portrait_hd',     // TikTok (future)
};
```

No change to hum-integrations needed — the mapping lives in the content engine's prompt utils. Facebook's 16:9 maps to `landscape_4_3` as the closest available option.

## ProfileKey Resolution for Scheduling

Step 4 (`schedulePosts`) requires the client's Ayrshare `profileKey` from the `social_accounts` table. The orchestrator fetches the client's connected social accounts before running Step 4 and passes the `profileKey` to `schedulePosts`:

```typescript
// In orchestrator.ts, before Step 4:
const socialAccounts = await socialAccountRepo.listByClientId(db, client.id);
const connectedAccount = socialAccounts.find(a => a.status === 'connected' && a.ayrshareProfileKey);

// schedulePosts receives the profileKey
async function schedulePosts(
  composedPosts: ComposedPost[],
  profileKey: string,
  social: SocialClient,
  db: HumDb
): Promise<void>
```

If no connected social account with a `profileKey` is found, Step 4 is skipped and all posts remain as drafts.
