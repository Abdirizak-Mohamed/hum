# hum-content-engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the content engine that generates, composes, and schedules social media content weekly for every active client.

**Architecture:** DAG pipeline per client — LLM plans a weekly content calendar, then media generation (fal.ai) and copy generation (OpenAI) run in parallel, results are composed into ContentItem rows, and scheduled via Ayrshare. In-process concurrency via p-queue, local filesystem storage behind a swappable interface.

**Tech Stack:** TypeScript (ESM), hum-core (data layer), hum-integrations (AI/Social clients), p-queue (concurrency), node-cron (scheduling), zod (LLM output validation), vitest (testing)

**Spec:** `docs/superpowers/specs/2026-03-22-hum-content-engine-design.md`

---

## File Structure

```
Files to CREATE:
  hum-content-engine/package.json
  hum-content-engine/tsconfig.json
  hum-content-engine/vitest.config.ts
  hum-content-engine/src/config.ts
  hum-content-engine/src/storage/types.ts
  hum-content-engine/src/storage/local.ts
  hum-content-engine/src/storage/__tests__/local.test.ts
  hum-content-engine/src/prompts/utils.ts
  hum-content-engine/src/prompts/__tests__/utils.test.ts
  hum-content-engine/src/prompts/calendar.ts
  hum-content-engine/src/prompts/__tests__/calendar.test.ts
  hum-content-engine/src/prompts/image.ts
  hum-content-engine/src/prompts/__tests__/image.test.ts
  hum-content-engine/src/prompts/copy.ts
  hum-content-engine/src/prompts/__tests__/copy.test.ts
  hum-content-engine/src/pipeline/plan-calendar.ts
  hum-content-engine/src/pipeline/__tests__/plan-calendar.test.ts
  hum-content-engine/src/pipeline/generate-media.ts
  hum-content-engine/src/pipeline/__tests__/generate-media.test.ts
  hum-content-engine/src/pipeline/generate-copy.ts
  hum-content-engine/src/pipeline/__tests__/generate-copy.test.ts
  hum-content-engine/src/pipeline/compose-posts.ts
  hum-content-engine/src/pipeline/__tests__/compose-posts.test.ts
  hum-content-engine/src/pipeline/schedule-posts.ts
  hum-content-engine/src/pipeline/__tests__/schedule-posts.test.ts
  hum-content-engine/src/pipeline/orchestrator.ts
  hum-content-engine/src/pipeline/__tests__/orchestrator.test.ts
  hum-content-engine/src/scheduler.ts
  hum-content-engine/src/cli.ts
  hum-content-engine/src/index.ts

Files to MODIFY:
  pnpm-workspace.yaml                        — add hum-content-engine to workspace
  hum-integrations/src/ai/types.ts           — add optional model field to CopyPrompt
  hum-integrations/src/ai/openai.ts          — use prompt.model when provided
  hum-integrations/src/ai/openai.mock.ts     — accept model field (no-op, for type compat)
```

---

### Task 0: Prerequisite — Add `model` field to CopyPrompt in hum-integrations

**Files:**
- Modify: `hum-integrations/src/ai/types.ts`
- Modify: `hum-integrations/src/ai/openai.ts:14-16`
- Test: `hum-integrations/src/ai/__tests__/openai.test.ts`

- [ ] **Step 1: Add `model` field to CopyPrompt type**

In `hum-integrations/src/ai/types.ts`, add `model?: string` to `CopyPrompt`:

```typescript
export type CopyPrompt = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  model?: string;
};
```

- [ ] **Step 2: Use `prompt.model` in OpenAiProvider**

In `hum-integrations/src/ai/openai.ts`, change line 15 from:

```typescript
        model: 'gpt-4o-mini',
```

to:

```typescript
        model: prompt.model ?? 'gpt-4o-mini',
```

- [ ] **Step 3: Run existing tests to verify no regression**

Run: `cd hum-integrations && pnpm test`
Expected: All existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add hum-integrations/src/ai/types.ts hum-integrations/src/ai/openai.ts
git commit -m "feat(integrations): add optional model field to CopyPrompt"
```

---

### Task 1: Scaffold hum-content-engine package

**Files:**
- Create: `hum-content-engine/package.json`
- Create: `hum-content-engine/tsconfig.json`
- Create: `hum-content-engine/vitest.config.ts`
- Create: `hum-content-engine/src/config.ts`
- Create: `hum-content-engine/src/index.ts`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "hum-content-engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "content-engine": "node --import tsx src/cli.ts"
  },
  "dependencies": {
    "hum-core": "workspace:*",
    "hum-integrations": "workspace:*",
    "p-queue": "^8.0.0",
    "node-cron": "^3.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "tsx": "^4.0.0",
    "@types/node-cron": "^3.0.0"
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

- [ ] **Step 4: Create src/config.ts with ContentEngineConfig type and defaults**

```typescript
export type ContentEngineConfig = {
  models: {
    planning: string;
    copy: string;
  };
  storage: {
    basePath: string;
  };
  concurrency: {
    mediaGeneration: number;
    copyGeneration: number;
    clientProcessing: number;
  };
  dryRun?: boolean;
  cron?: {
    schedule: string;
  };
};

export const defaultConfig: ContentEngineConfig = {
  models: {
    planning: 'gpt-4o',
    copy: 'gpt-4o-mini',
  },
  storage: {
    basePath: './media',
  },
  concurrency: {
    mediaGeneration: 3,
    copyGeneration: 5,
    clientProcessing: 2,
  },
  cron: {
    schedule: '0 2 * * 0',
  },
};
```

- [ ] **Step 5: Create empty src/index.ts**

```typescript
// Public API — populated as modules are built
export { type ContentEngineConfig, defaultConfig } from './config.js';
```

- [ ] **Step 6: Add hum-content-engine to pnpm-workspace.yaml**

```yaml
packages:
  - "hum-core"
  - "hum-integrations"
  - "hum-content-engine"
```

- [ ] **Step 7: Install dependencies**

Run: `cd /Users/abdi/workplace/hum-3/hum && pnpm install`
Expected: Lockfile updated, all deps installed.

- [ ] **Step 8: Verify build**

Run: `cd hum-content-engine && pnpm build`
Expected: Compiles without errors.

- [ ] **Step 9: Commit**

```bash
git add hum-content-engine/package.json hum-content-engine/tsconfig.json hum-content-engine/vitest.config.ts hum-content-engine/src/config.ts hum-content-engine/src/index.ts pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(content-engine): scaffold package with config and workspace registration"
```

---

### Task 2: StorageClient interface + local filesystem implementation

**Files:**
- Create: `hum-content-engine/src/storage/types.ts`
- Create: `hum-content-engine/src/storage/local.ts`
- Create: `hum-content-engine/src/storage/__tests__/local.test.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-content-engine/src/storage/__tests__/local.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalStorageClient } from '../local.js';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

let storage: LocalStorageClient;
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), 'hum-storage-'));
  storage = new LocalStorageClient(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('LocalStorageClient', () => {
  it('saves a file and returns a path', async () => {
    const data = Buffer.from('fake image data');
    const savedPath = await storage.save('client-1', 'content-1', data, 'png');

    expect(savedPath).toContain('client-1');
    expect(savedPath).toContain('content-1.png');

    const contents = await readFile(storage.getUrl(savedPath));
    expect(contents.toString()).toBe('fake image data');
  });

  it('creates nested directories automatically', async () => {
    const data = Buffer.from('data');
    const savedPath = await storage.save('new-client', 'img-1', data, 'jpg');
    const contents = await readFile(storage.getUrl(savedPath));
    expect(contents.toString()).toBe('data');
  });

  it('getUrl returns absolute path', () => {
    const url = storage.getUrl('client-1/content-1.png');
    expect(path.isAbsolute(url)).toBe(true);
  });

  it('deletes a file', async () => {
    const data = Buffer.from('to delete');
    const savedPath = await storage.save('client-1', 'del-1', data, 'png');
    await storage.delete(savedPath);

    await expect(readFile(storage.getUrl(savedPath))).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-content-engine && pnpm test -- src/storage/__tests__/local.test.ts`
Expected: FAIL — cannot resolve `../local.js`

- [ ] **Step 3: Create the StorageClient interface**

Create `hum-content-engine/src/storage/types.ts`:

```typescript
export interface StorageClient {
  save(clientId: string, contentId: string, data: Buffer, ext: string): Promise<string>;
  getUrl(path: string): string;
  delete(path: string): Promise<void>;
}
```

- [ ] **Step 4: Implement LocalStorageClient**

Create `hum-content-engine/src/storage/local.ts`:

```typescript
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { StorageClient } from './types.js';

export class LocalStorageClient implements StorageClient {
  constructor(private basePath: string) {}

  async save(clientId: string, contentId: string, data: Buffer, ext: string): Promise<string> {
    const dir = path.join(this.basePath, clientId);
    await mkdir(dir, { recursive: true });
    const relativePath = path.join(clientId, `${contentId}.${ext}`);
    await writeFile(path.join(this.basePath, relativePath), data);
    return relativePath;
  }

  getUrl(filePath: string): string {
    return path.resolve(this.basePath, filePath);
  }

  async delete(filePath: string): Promise<void> {
    await unlink(path.join(this.basePath, filePath));
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd hum-content-engine && pnpm test -- src/storage/__tests__/local.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add hum-content-engine/src/storage/
git commit -m "feat(content-engine): add StorageClient interface and local filesystem implementation"
```

---

### Task 3: Prompt utilities

**Files:**
- Create: `hum-content-engine/src/prompts/utils.ts`
- Create: `hum-content-engine/src/prompts/__tests__/utils.test.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-content-engine/src/prompts/__tests__/utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { injectBrandVoice, formatMenuItems, selectImageSize } from '../utils.js';
import type { MenuItem } from 'hum-core';

describe('injectBrandVoice', () => {
  it('returns brand voice when provided', () => {
    const result = injectBrandVoice('Warm and welcoming');
    expect(result).toContain('Warm and welcoming');
  });

  it('returns default when null', () => {
    const result = injectBrandVoice(null);
    expect(result).toContain('friendly');
  });
});

describe('formatMenuItems', () => {
  it('formats menu items as a readable list', () => {
    const items: MenuItem[] = [
      { name: 'Butter Chicken', description: 'Creamy tomato curry', category: 'Mains', price: 12.99 },
      { name: 'Naan', description: 'Freshly baked bread', category: 'Sides', price: 3.50 },
    ];
    const result = formatMenuItems(items);
    expect(result).toContain('Butter Chicken');
    expect(result).toContain('12.99');
    expect(result).toContain('Mains');
  });

  it('returns empty string for empty array', () => {
    expect(formatMenuItems([])).toBe('');
  });
});

describe('selectImageSize', () => {
  it('maps instagram to square_hd', () => {
    expect(selectImageSize('instagram')).toBe('square_hd');
  });

  it('maps facebook to landscape_4_3', () => {
    expect(selectImageSize('facebook')).toBe('landscape_4_3');
  });

  it('maps google_business to landscape_4_3', () => {
    expect(selectImageSize('google_business')).toBe('landscape_4_3');
  });

  it('defaults to square_hd for unknown', () => {
    expect(selectImageSize('tiktok')).toBe('portrait_hd');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-content-engine && pnpm test -- src/prompts/__tests__/utils.test.ts`
Expected: FAIL — cannot resolve `../utils.js`

- [ ] **Step 3: Implement prompt utilities**

Create `hum-content-engine/src/prompts/utils.ts`:

```typescript
import type { MenuItem, Platform } from 'hum-core';
import type { ImagePrompt } from 'hum-integrations';

const IMAGE_SIZE_MAP: Record<string, ImagePrompt['imageSize']> = {
  instagram: 'square_hd',
  facebook: 'landscape_4_3',
  google_business: 'landscape_4_3',
  tiktok: 'portrait_hd',
};

export function injectBrandVoice(brandVoiceGuide: string | null): string {
  if (brandVoiceGuide) {
    return `Write in this brand voice: ${brandVoiceGuide}`;
  }
  return 'Write in a friendly, approachable tone that feels authentic and inviting.';
}

export function formatMenuItems(items: MenuItem[]): string {
  if (items.length === 0) return '';
  return items
    .map((item) => `- ${item.name} (${item.category}, £${item.price.toFixed(2)}): ${item.description}`)
    .join('\n');
}

export function selectImageSize(platform: string): ImagePrompt['imageSize'] {
  return IMAGE_SIZE_MAP[platform] ?? 'square_hd';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hum-content-engine && pnpm test -- src/prompts/__tests__/utils.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add hum-content-engine/src/prompts/utils.ts hum-content-engine/src/prompts/__tests__/utils.test.ts
git commit -m "feat(content-engine): add prompt utilities — brand voice, menu formatting, image size mapping"
```

---

### Task 4: Calendar planning prompt builder

**Files:**
- Create: `hum-content-engine/src/prompts/calendar.ts`
- Create: `hum-content-engine/src/prompts/__tests__/calendar.test.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-content-engine/src/prompts/__tests__/calendar.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildCalendarPrompt } from '../calendar.js';
import type { Platform } from 'hum-core';

const mockBrandProfile = {
  brandVoiceGuide: 'Warm and friendly',
  menuItems: [
    { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
    { name: 'Lamb Kebab', description: 'Grilled lamb', category: 'Mains', price: 10.99 },
  ],
  contentThemes: ['dish spotlights', 'seasonal specials'],
  keySellingPoints: ['Fresh ingredients', 'Family recipes'],
  hashtagStrategy: ['#LocalEats', '#FreshFood'],
};

const mockClient = {
  businessName: "Ali's Kitchen",
  address: 'London, UK',
};

describe('buildCalendarPrompt', () => {
  it('includes business name in user prompt', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 3,
      platforms: ['instagram', 'facebook'] as Platform[],
      recentMenuItemNames: [],
    });
    expect(prompt.userPrompt).toContain("Ali's Kitchen");
  });

  it('includes menu items in user prompt', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 3,
      platforms: ['instagram', 'facebook'] as Platform[],
      recentMenuItemNames: [],
    });
    expect(prompt.userPrompt).toContain('Butter Chicken');
    expect(prompt.userPrompt).toContain('Lamb Kebab');
  });

  it('includes postsPerWeek limit in system prompt', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 5,
      platforms: ['instagram', 'facebook', 'google_business'] as Platform[],
      recentMenuItemNames: [],
    });
    expect(prompt.systemPrompt).toContain('5');
  });

  it('includes available platforms', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 3,
      platforms: ['instagram', 'facebook'] as Platform[],
      recentMenuItemNames: [],
    });
    expect(prompt.userPrompt).toContain('instagram');
    expect(prompt.userPrompt).toContain('facebook');
  });

  it('includes recently posted items to avoid repetition', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 3,
      platforms: ['instagram'] as Platform[],
      recentMenuItemNames: ['Butter Chicken'],
    });
    expect(prompt.userPrompt).toContain('Butter Chicken');
    expect(prompt.userPrompt).toMatch(/avoid|recently|repeat/i);
  });

  it('includes current date', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 3,
      platforms: ['instagram'] as Platform[],
      recentMenuItemNames: [],
    });
    const today = new Date().toISOString().split('T')[0];
    expect(prompt.userPrompt).toContain(today);
  });

  it('sets system prompt to return JSON', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 3,
      platforms: ['instagram'] as Platform[],
      recentMenuItemNames: [],
    });
    expect(prompt.systemPrompt).toMatch(/JSON/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-content-engine && pnpm test -- src/prompts/__tests__/calendar.test.ts`
Expected: FAIL — cannot resolve `../calendar.js`

- [ ] **Step 3: Implement calendar prompt builder**

Create `hum-content-engine/src/prompts/calendar.ts`:

```typescript
import type { Platform, MenuItem } from 'hum-core';
import type { CopyPrompt } from 'hum-integrations';
import { formatMenuItems } from './utils.js';

type CalendarPromptInput = {
  postsPerWeek: number;
  platforms: Platform[];
  recentMenuItemNames: string[];
};

type ClientInfo = {
  businessName: string;
  address: string | null;
};

type BrandInfo = {
  brandVoiceGuide: string | null;
  menuItems: MenuItem[];
  contentThemes: string[];
  keySellingPoints: string[];
  hashtagStrategy: string[];
};

export function buildCalendarPrompt(
  client: ClientInfo,
  brand: BrandInfo,
  input: CalendarPromptInput,
): CopyPrompt {
  const systemPrompt = [
    'You are a social media strategist for restaurants and takeaways.',
    'Plan a content calendar for the next 7 days.',
    `Create exactly ${input.postsPerWeek} posts for the week.`,
    'Content types available: food_hero, deal_offer, google_post.',
    'Vary content types, menu items, and themes across the week.',
    'Return ONLY valid JSON: an array of objects with fields: date (ISO string YYYY-MM-DD), contentType, platforms (array), menuItem (object with name/description/category/price or null), theme, brief.',
  ].join('\n');

  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

  const parts: string[] = [
    `Business: ${client.businessName}`,
    client.address ? `Location: ${client.address}` : '',
    `Today: ${today} (${dayOfWeek})`,
    '',
    `Available platforms: ${input.platforms.join(', ')}`,
    '',
    'Menu items:',
    formatMenuItems(brand.menuItems) || '(No menu items provided)',
    '',
    `Brand voice: ${brand.brandVoiceGuide ?? 'Friendly and approachable'}`,
    `Content themes: ${brand.contentThemes.join(', ') || 'General food content'}`,
    `Key selling points: ${brand.keySellingPoints.join(', ') || 'Quality food'}`,
  ];

  if (input.recentMenuItemNames.length > 0) {
    parts.push('');
    parts.push(`Recently posted — avoid repeating these menu items: ${input.recentMenuItemNames.join(', ')}`);
  }

  return {
    systemPrompt,
    userPrompt: parts.filter((line) => line !== undefined).join('\n'),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hum-content-engine && pnpm test -- src/prompts/__tests__/calendar.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add hum-content-engine/src/prompts/calendar.ts hum-content-engine/src/prompts/__tests__/calendar.test.ts
git commit -m "feat(content-engine): add calendar planning prompt builder"
```

---

### Task 5: Image prompt builder

**Files:**
- Create: `hum-content-engine/src/prompts/image.ts`
- Create: `hum-content-engine/src/prompts/__tests__/image.test.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-content-engine/src/prompts/__tests__/image.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildImagePrompt } from '../image.js';
import type { Platform } from 'hum-core';

const mockBrandProfile = {
  brandColours: ['#FF5733', '#C70039'],
  brandVoiceGuide: 'Bold and vibrant',
};

describe('buildImagePrompt', () => {
  it('builds a food_hero prompt with dish details', () => {
    const result = buildImagePrompt(
      {
        contentType: 'food_hero',
        menuItem: { name: 'Butter Chicken', description: 'Creamy tomato curry', category: 'Mains', price: 12.99 },
        theme: 'Friday feast',
        brief: 'Hero shot of butter chicken',
      },
      mockBrandProfile,
      'instagram',
    );
    expect(result.prompt).toContain('Butter Chicken');
    expect(result.prompt).toMatch(/food photography/i);
    expect(result.imageSize).toBe('square_hd');
  });

  it('builds a deal_offer prompt with brand colours', () => {
    const result = buildImagePrompt(
      {
        contentType: 'deal_offer',
        menuItem: null,
        theme: '2-for-1 Monday',
        brief: 'Monday deal promotion',
      },
      mockBrandProfile,
      'facebook',
    );
    expect(result.prompt).toContain('2-for-1 Monday');
    expect(result.prompt).toMatch(/promotional/i);
    expect(result.imageSize).toBe('landscape_4_3');
  });

  it('builds a google_post prompt', () => {
    const result = buildImagePrompt(
      {
        contentType: 'google_post',
        menuItem: { name: 'Fish & Chips', description: 'Classic British', category: 'Mains', price: 9.99 },
        theme: 'Weekend special',
        brief: 'Google update',
      },
      mockBrandProfile,
      'google_business',
    );
    expect(result.prompt).toMatch(/clean|professional|bright/i);
    expect(result.imageSize).toBe('landscape_4_3');
  });

  it('sets correct image size per platform', () => {
    const igResult = buildImagePrompt(
      { contentType: 'food_hero', menuItem: null, theme: 'test', brief: 'test' },
      mockBrandProfile,
      'instagram',
    );
    expect(igResult.imageSize).toBe('square_hd');

    const fbResult = buildImagePrompt(
      { contentType: 'food_hero', menuItem: null, theme: 'test', brief: 'test' },
      mockBrandProfile,
      'facebook',
    );
    expect(fbResult.imageSize).toBe('landscape_4_3');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-content-engine && pnpm test -- src/prompts/__tests__/image.test.ts`
Expected: FAIL — cannot resolve `../image.js`

- [ ] **Step 3: Implement image prompt builder**

Create `hum-content-engine/src/prompts/image.ts`:

```typescript
import type { ImagePrompt } from 'hum-integrations';
import type { MenuItem } from 'hum-core';
import { selectImageSize } from './utils.js';

type ImagePromptInput = {
  contentType: 'food_hero' | 'deal_offer' | 'google_post';
  menuItem: MenuItem | null | undefined;
  theme: string;
  brief: string;
};

type BrandInfo = {
  brandColours: string[];
  brandVoiceGuide: string | null;
};

const ANGLES = ['overhead flat-lay', '45-degree angle', 'close-up macro', 'side angle'] as const;
const LIGHTING = ['warm golden', 'soft natural', 'dramatic side-lit', 'bright and airy'] as const;
const PROPS = ['rustic wooden board', 'slate plate', 'fresh herb garnish', 'scattered spices'] as const;

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildImagePrompt(
  input: ImagePromptInput,
  brand: BrandInfo,
  platform: string,
): ImagePrompt {
  const imageSize = selectImageSize(platform);
  let prompt: string;

  switch (input.contentType) {
    case 'food_hero': {
      const dish = input.menuItem
        ? `${input.menuItem.name} — ${input.menuItem.description}`
        : input.theme;
      prompt = [
        `Professional food photography of ${dish}.`,
        `Angle: ${randomFrom(ANGLES)}.`,
        `Lighting: ${randomFrom(LIGHTING)}.`,
        `Styling: ${randomFrom(PROPS)}.`,
        'Background: clean, softly blurred restaurant setting.',
        'Style: appetizing, high-end restaurant marketing photo.',
      ].join(' ');
      break;
    }
    case 'deal_offer': {
      const colours = brand.brandColours.length > 0
        ? `Brand colours: ${brand.brandColours.join(', ')}.`
        : '';
      prompt = [
        `Bold promotional graphic for "${input.theme}".`,
        input.menuItem ? `Featuring: ${input.menuItem.name}.` : '',
        'Style: eye-catching, vibrant, modern restaurant promotion.',
        colours,
        'Include visual space for text overlay.',
        'Clean design with strong contrast.',
      ].filter(Boolean).join(' ');
      break;
    }
    case 'google_post': {
      const subject = input.menuItem
        ? `${input.menuItem.name} — ${input.menuItem.description}`
        : 'restaurant exterior or signature dish';
      prompt = [
        `Clean, professional photo of ${subject}.`,
        'Style: bright, inviting, suitable for Google Business Profile.',
        'Well-lit, sharp focus, warm and welcoming atmosphere.',
      ].join(' ');
      break;
    }
  }

  return { prompt, imageSize, numImages: 1 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hum-content-engine && pnpm test -- src/prompts/__tests__/image.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add hum-content-engine/src/prompts/image.ts hum-content-engine/src/prompts/__tests__/image.test.ts
git commit -m "feat(content-engine): add image prompt builder with food photography domain knowledge"
```

---

### Task 6: Copy prompt builder

**Files:**
- Create: `hum-content-engine/src/prompts/copy.ts`
- Create: `hum-content-engine/src/prompts/__tests__/copy.test.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-content-engine/src/prompts/__tests__/copy.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildCopyPrompt } from '../copy.js';

const mockBrandProfile = {
  brandVoiceGuide: 'Warm and casual',
  keySellingPoints: ['Fresh ingredients', 'Fast delivery'],
  hashtagStrategy: ['#LocalEats', '#FreshFood', '#FoodDelivery'],
};

const mockPost = {
  contentType: 'food_hero' as const,
  menuItem: { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
  theme: 'Friday feast',
  brief: 'Hero shot of butter chicken',
};

describe('buildCopyPrompt', () => {
  it('includes brand voice in system prompt', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'instagram');
    expect(result.systemPrompt).toContain('Warm and casual');
  });

  it('includes menu item in user prompt', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'instagram');
    expect(result.userPrompt).toContain('Butter Chicken');
  });

  it('includes Instagram-specific instructions', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'instagram');
    expect(result.systemPrompt).toMatch(/hashtag/i);
    expect(result.systemPrompt).toContain('2200');
  });

  it('includes Facebook-specific instructions', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'facebook');
    expect(result.systemPrompt).toMatch(/community|CTA/i);
  });

  it('includes Google Business-specific instructions', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'google_business');
    expect(result.systemPrompt).toMatch(/concise|keyword/i);
    expect(result.systemPrompt).toContain('1500');
  });

  it('instructs LLM to return JSON', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'instagram');
    expect(result.systemPrompt).toMatch(/JSON/i);
    expect(result.systemPrompt).toMatch(/caption/i);
    expect(result.systemPrompt).toMatch(/hashtags/i);
    expect(result.systemPrompt).toMatch(/cta/i);
  });

  it('includes hashtag strategy', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'instagram');
    expect(result.userPrompt).toContain('#LocalEats');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-content-engine && pnpm test -- src/prompts/__tests__/copy.test.ts`
Expected: FAIL — cannot resolve `../copy.js`

- [ ] **Step 3: Implement copy prompt builder**

Create `hum-content-engine/src/prompts/copy.ts`:

```typescript
import type { CopyPrompt } from 'hum-integrations';
import type { MenuItem } from 'hum-core';
import { injectBrandVoice } from './utils.js';

type CopyPromptInput = {
  contentType: 'food_hero' | 'deal_offer' | 'google_post';
  menuItem: MenuItem | null | undefined;
  theme: string;
  brief: string;
};

type BrandInfo = {
  brandVoiceGuide: string | null;
  keySellingPoints: string[];
  hashtagStrategy: string[];
};

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  instagram: [
    'Platform: Instagram.',
    'Tone: aspirational, storytelling, appetizing.',
    'Include 3-5 relevant hashtags from the brand strategy.',
    'Maximum caption length: 2200 characters.',
  ].join(' '),
  facebook: [
    'Platform: Facebook.',
    'Tone: community-oriented, informative.',
    'Include a clear CTA (call to action).',
    'Include 1-2 hashtags maximum.',
    'Maximum caption length: 63206 characters.',
  ].join(' '),
  google_business: [
    'Platform: Google Business Profile.',
    'Tone: concise, keyword-rich, offer-focused.',
    'No hashtags.',
    'Maximum caption length: 1500 characters.',
  ].join(' '),
};

export function buildCopyPrompt(
  post: CopyPromptInput,
  brand: BrandInfo,
  platform: string,
): CopyPrompt {
  const platformInstructions = PLATFORM_INSTRUCTIONS[platform] ?? PLATFORM_INSTRUCTIONS.instagram;

  const systemPrompt = [
    'You write social media captions for restaurants and takeaways.',
    injectBrandVoice(brand.brandVoiceGuide),
    platformInstructions,
    'Return ONLY valid JSON with fields: caption (string), hashtags (string[]), cta (string).',
  ].join('\n');

  const parts: string[] = [
    `Content type: ${post.contentType}`,
    `Theme: ${post.theme}`,
    `Brief: ${post.brief}`,
  ];

  if (post.menuItem) {
    parts.push(`Dish: ${post.menuItem.name} — ${post.menuItem.description} (£${post.menuItem.price.toFixed(2)})`);
  }

  if (brand.keySellingPoints.length > 0) {
    parts.push(`Key selling points: ${brand.keySellingPoints.join(', ')}`);
  }

  if (brand.hashtagStrategy.length > 0) {
    parts.push(`Brand hashtag pool: ${brand.hashtagStrategy.join(', ')}`);
  }

  return {
    systemPrompt,
    userPrompt: parts.join('\n'),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hum-content-engine && pnpm test -- src/prompts/__tests__/copy.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add hum-content-engine/src/prompts/copy.ts hum-content-engine/src/prompts/__tests__/copy.test.ts
git commit -m "feat(content-engine): add copy prompt builder with platform-specific instructions"
```

---

### Task 7: Pipeline Step 1 — planCalendar

**Files:**
- Create: `hum-content-engine/src/pipeline/plan-calendar.ts`
- Create: `hum-content-engine/src/pipeline/__tests__/plan-calendar.test.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-content-engine/src/pipeline/__tests__/plan-calendar.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { planCalendar } from '../plan-calendar.js';
import type { AiClient } from 'hum-integrations';
import type { ContentEngineConfig } from '../../config.js';

const mockConfig: ContentEngineConfig = {
  models: { planning: 'gpt-4o', copy: 'gpt-4o-mini' },
  storage: { basePath: './media' },
  concurrency: { mediaGeneration: 3, copyGeneration: 5, clientProcessing: 2 },
};

const mockClient = {
  id: 'client-1',
  businessName: "Ali's Kitchen",
  address: 'London, UK',
  planTier: 'starter' as const,
};

const mockBrandProfile = {
  brandVoiceGuide: 'Warm and friendly',
  menuItems: [
    { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
    { name: 'Naan', description: 'Freshly baked', category: 'Sides', price: 3.50 },
  ],
  contentThemes: ['dish spotlights'],
  keySellingPoints: ['Fresh ingredients'],
  hashtagStrategy: ['#LocalEats'],
};

const validCalendarJson = JSON.stringify([
  {
    date: '2026-03-23',
    contentType: 'food_hero',
    platforms: ['instagram', 'facebook'],
    menuItem: { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
    theme: 'Monday special',
    brief: 'Hero shot of butter chicken',
  },
  {
    date: '2026-03-25',
    contentType: 'deal_offer',
    platforms: ['instagram'],
    menuItem: null,
    theme: '2-for-1 Wednesday',
    brief: 'Midweek deal promo',
  },
  {
    date: '2026-03-27',
    contentType: 'google_post',
    platforms: ['google_business'],
    menuItem: null,
    theme: 'Weekend update',
    brief: 'Google post for the weekend',
  },
]);

function createMockAi(response: string): AiClient {
  return {
    generateCopy: vi.fn().mockResolvedValue({ text: response, usage: { promptTokens: 100, completionTokens: 50 } }),
    generateBrandProfile: vi.fn(),
    generateImage: vi.fn(),
  };
}

describe('planCalendar', () => {
  it('returns a valid ContentCalendar from LLM response', async () => {
    const ai = createMockAi(validCalendarJson);
    const result = await planCalendar(mockClient, mockBrandProfile, {
      ai,
      config: mockConfig,
      platforms: ['instagram', 'facebook'],
      postsPerWeek: 3,
      recentMenuItemNames: [],
    });

    expect(result.clientId).toBe('client-1');
    expect(result.posts).toHaveLength(3);
    expect(result.posts[0].contentType).toBe('food_hero');
  });

  it('passes planning model to ai.generateCopy', async () => {
    const ai = createMockAi(validCalendarJson);
    await planCalendar(mockClient, mockBrandProfile, {
      ai,
      config: mockConfig,
      platforms: ['instagram', 'facebook'],
      postsPerWeek: 3,
      recentMenuItemNames: [],
    });

    expect(ai.generateCopy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
    );
  });

  it('filters out platforms not in the allowed list', async () => {
    const jsonWithTiktok = JSON.stringify([
      {
        date: '2026-03-23',
        contentType: 'food_hero',
        platforms: ['instagram', 'tiktok'],
        menuItem: null,
        theme: 'test',
        brief: 'test',
      },
    ]);
    const ai = createMockAi(jsonWithTiktok);
    const result = await planCalendar(mockClient, mockBrandProfile, {
      ai,
      config: mockConfig,
      platforms: ['instagram', 'facebook'],
      postsPerWeek: 3,
      recentMenuItemNames: [],
    });

    expect(result.posts[0].platforms).toEqual(['instagram']);
  });

  it('retries once on invalid JSON, then succeeds', async () => {
    const ai: AiClient = {
      generateCopy: vi.fn()
        .mockResolvedValueOnce({ text: 'not valid json!', usage: { promptTokens: 100, completionTokens: 50 } })
        .mockResolvedValueOnce({ text: validCalendarJson, usage: { promptTokens: 100, completionTokens: 50 } }),
      generateBrandProfile: vi.fn(),
      generateImage: vi.fn(),
    };

    const result = await planCalendar(mockClient, mockBrandProfile, {
      ai,
      config: mockConfig,
      platforms: ['instagram', 'facebook'],
      postsPerWeek: 3,
      recentMenuItemNames: [],
    });

    expect(ai.generateCopy).toHaveBeenCalledTimes(2);
    expect(result.posts).toHaveLength(3);
  });

  it('throws after two consecutive failures', async () => {
    const ai: AiClient = {
      generateCopy: vi.fn().mockResolvedValue({ text: 'bad json', usage: { promptTokens: 100, completionTokens: 50 } }),
      generateBrandProfile: vi.fn(),
      generateImage: vi.fn(),
    };

    await expect(
      planCalendar(mockClient, mockBrandProfile, {
        ai,
        config: mockConfig,
        platforms: ['instagram', 'facebook'],
        postsPerWeek: 3,
        recentMenuItemNames: [],
      }),
    ).rejects.toThrow();
  });

  it('drops posts with empty platforms after filtering', async () => {
    const jsonOnlyTiktok = JSON.stringify([
      {
        date: '2026-03-23',
        contentType: 'food_hero',
        platforms: ['tiktok'],
        menuItem: null,
        theme: 'test',
        brief: 'test',
      },
    ]);
    const ai = createMockAi(jsonOnlyTiktok);
    const result = await planCalendar(mockClient, mockBrandProfile, {
      ai,
      config: mockConfig,
      platforms: ['instagram', 'facebook'],
      postsPerWeek: 3,
      recentMenuItemNames: [],
    });

    expect(result.posts).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-content-engine && pnpm test -- src/pipeline/__tests__/plan-calendar.test.ts`
Expected: FAIL — cannot resolve `../plan-calendar.js`

- [ ] **Step 3: Implement planCalendar**

Create `hum-content-engine/src/pipeline/plan-calendar.ts`:

```typescript
import { z } from 'zod';
import type { AiClient, CopyPrompt } from 'hum-integrations';
import type { Platform, MenuItem } from 'hum-core';
import { buildCalendarPrompt } from '../prompts/calendar.js';
import type { ContentEngineConfig } from '../config.js';

export type PlannedPost = {
  date: string;
  contentType: 'food_hero' | 'deal_offer' | 'google_post';
  platforms: Platform[];
  menuItem?: MenuItem | null;
  theme: string;
  brief: string;
};

export type ContentCalendar = {
  clientId: string;
  weekStarting: string;
  posts: PlannedPost[];
};

const plannedPostSchema = z.object({
  date: z.string(),
  contentType: z.enum(['food_hero', 'deal_offer', 'google_post']),
  platforms: z.array(z.string()),
  menuItem: z.object({
    name: z.string(),
    description: z.string(),
    category: z.string(),
    price: z.number(),
  }).nullable().optional(),
  theme: z.string(),
  brief: z.string(),
});

const calendarSchema = z.array(plannedPostSchema);

type ClientInfo = {
  id: string;
  businessName: string;
  address: string | null;
};

type BrandInfo = {
  brandVoiceGuide: string | null;
  menuItems: MenuItem[];
  contentThemes: string[];
  keySellingPoints: string[];
  hashtagStrategy: string[];
};

type PlanCalendarDeps = {
  ai: AiClient;
  config: ContentEngineConfig;
  platforms: Platform[];
  postsPerWeek: number;
  recentMenuItemNames: string[];
};

export async function planCalendar(
  client: ClientInfo,
  brand: BrandInfo,
  deps: PlanCalendarDeps,
): Promise<ContentCalendar> {
  const { ai, config, platforms, postsPerWeek, recentMenuItemNames } = deps;

  const prompt = buildCalendarPrompt(client, brand, {
    postsPerWeek,
    platforms,
    recentMenuItemNames,
  });

  let posts: PlannedPost[];
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    const callPrompt: CopyPrompt = attempt === 0
      ? { ...prompt, model: config.models.planning }
      : {
          systemPrompt: prompt.systemPrompt,
          userPrompt: `Your previous response was invalid JSON: ${String(lastError)}. Please fix and return ONLY a valid JSON array.`,
          model: config.models.planning,
        };

    const result = await ai.generateCopy(callPrompt);

    try {
      const parsed = calendarSchema.parse(JSON.parse(result.text));
      posts = parsed.map((post) => ({
        ...post,
        platforms: post.platforms.filter((p) => platforms.includes(p as Platform)) as Platform[],
      })).filter((post) => post.platforms.length > 0);

      const today = new Date().toISOString().split('T')[0];
      return { clientId: client.id, weekStarting: today, posts };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(`Calendar planning failed after 2 attempts: ${String(lastError)}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hum-content-engine && pnpm test -- src/pipeline/__tests__/plan-calendar.test.ts`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add hum-content-engine/src/pipeline/plan-calendar.ts hum-content-engine/src/pipeline/__tests__/plan-calendar.test.ts
git commit -m "feat(content-engine): add planCalendar pipeline step with Zod validation and retry"
```

---

### Task 8: Pipeline Step 2a — generateMedia

**Files:**
- Create: `hum-content-engine/src/pipeline/generate-media.ts`
- Create: `hum-content-engine/src/pipeline/__tests__/generate-media.test.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-content-engine/src/pipeline/__tests__/generate-media.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateMedia } from '../generate-media.js';
import type { AiClient } from 'hum-integrations';
import type { PlannedPost } from '../plan-calendar.js';
import type { StorageClient } from '../../storage/types.js';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const mockPosts: PlannedPost[] = [
  {
    date: '2026-03-23',
    contentType: 'food_hero',
    platforms: ['instagram'],
    menuItem: { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
    theme: 'Monday special',
    brief: 'Hero shot',
  },
  {
    date: '2026-03-25',
    contentType: 'deal_offer',
    platforms: ['facebook'],
    menuItem: null,
    theme: 'Midweek deal',
    brief: 'Deal promo',
  },
];

const mockBrandProfile = {
  brandColours: ['#FF5733'],
  brandVoiceGuide: 'Bold',
};

function createMockAi(): AiClient {
  return {
    generateCopy: vi.fn(),
    generateBrandProfile: vi.fn(),
    generateImage: vi.fn().mockResolvedValue({ imageUrls: ['https://fal.ai/img.png'] }),
  };
}

function createMockStorage(): StorageClient {
  return {
    save: vi.fn().mockResolvedValue('client-1/content-1.png'),
    getUrl: vi.fn((p: string) => `/abs/${p}`),
    delete: vi.fn(),
  };
}

describe('generateMedia', () => {
  it('generates media for each planned post', async () => {
    const ai = createMockAi();
    const storage = createMockStorage();

    const results = await generateMedia(mockPosts, mockBrandProfile, 'client-1', {
      ai,
      storage,
      concurrency: 3,
    });

    expect(results).toHaveLength(2);
    expect(ai.generateImage).toHaveBeenCalledTimes(2);
    expect(storage.save).toHaveBeenCalledTimes(2);
  });

  it('returns GeneratedMedia with localPath', async () => {
    const ai = createMockAi();
    const storage = createMockStorage();

    const results = await generateMedia(mockPosts, mockBrandProfile, 'client-1', {
      ai,
      storage,
      concurrency: 3,
    });

    expect(results[0]).toHaveProperty('localPath');
    expect(results[0]).toHaveProperty('plannedPost');
    expect(results[0]).toHaveProperty('mimeType');
  });

  it('skips posts where image generation fails', async () => {
    const ai: AiClient = {
      generateCopy: vi.fn(),
      generateBrandProfile: vi.fn(),
      generateImage: vi.fn()
        .mockResolvedValueOnce({ imageUrls: ['https://fal.ai/img1.png'] })
        .mockRejectedValueOnce(new Error('fal.ai error')),
    };
    const storage = createMockStorage();

    const results = await generateMedia(mockPosts, mockBrandProfile, 'client-1', {
      ai,
      storage,
      concurrency: 3,
    });

    expect(results).toHaveLength(1);
    expect(results[0].plannedPost.contentType).toBe('food_hero');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-content-engine && pnpm test -- src/pipeline/__tests__/generate-media.test.ts`
Expected: FAIL — cannot resolve `../generate-media.js`

- [ ] **Step 3: Implement generateMedia**

Create `hum-content-engine/src/pipeline/generate-media.ts`:

```typescript
import PQueue from 'p-queue';
import type { AiClient } from 'hum-integrations';
import { logger } from 'hum-core';
import type { StorageClient } from '../storage/types.js';
import type { PlannedPost } from './plan-calendar.js';
import { buildImagePrompt } from '../prompts/image.js';

export type GeneratedMedia = {
  plannedPost: PlannedPost;
  localPath: string;
  mimeType: string;
};

type BrandInfo = {
  brandColours: string[];
  brandVoiceGuide: string | null;
};

type GenerateMediaDeps = {
  ai: AiClient;
  storage: StorageClient;
  concurrency: number;
};

export async function generateMedia(
  posts: PlannedPost[],
  brand: BrandInfo,
  clientId: string,
  deps: GenerateMediaDeps,
): Promise<GeneratedMedia[]> {
  const { ai, storage, concurrency } = deps;
  const queue = new PQueue({ concurrency });
  const results: GeneratedMedia[] = [];

  const tasks = posts.map((post, index) =>
    queue.add(async () => {
      try {
        const primaryPlatform = post.platforms[0];
        const imagePrompt = buildImagePrompt(post, brand, primaryPlatform);
        const imageResult = await ai.generateImage(imagePrompt);

        if (imageResult.imageUrls.length === 0) {
          logger.warn(`No images returned for post ${index}`);
          return;
        }

        const imageUrl = imageResult.imageUrls[0];
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const ext = 'png';
        const contentId = `${post.date}-${post.contentType}-${index}`;
        const localPath = await storage.save(clientId, contentId, buffer, ext);

        results.push({ plannedPost: post, localPath, mimeType: 'image/png' });
      } catch (err) {
        logger.warn(`Media generation failed for post ${index}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );

  await Promise.all(tasks);
  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hum-content-engine && pnpm test -- src/pipeline/__tests__/generate-media.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add hum-content-engine/src/pipeline/generate-media.ts hum-content-engine/src/pipeline/__tests__/generate-media.test.ts
git commit -m "feat(content-engine): add generateMedia pipeline step with p-queue concurrency"
```

---

### Task 9: Pipeline Step 2b — generateCopy

**Files:**
- Create: `hum-content-engine/src/pipeline/generate-copy.ts`
- Create: `hum-content-engine/src/pipeline/__tests__/generate-copy.test.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-content-engine/src/pipeline/__tests__/generate-copy.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { generateCopy } from '../generate-copy.js';
import type { AiClient } from 'hum-integrations';
import type { PlannedPost } from '../plan-calendar.js';
import type { ContentEngineConfig } from '../../config.js';

const mockConfig: ContentEngineConfig = {
  models: { planning: 'gpt-4o', copy: 'gpt-4o-mini' },
  storage: { basePath: './media' },
  concurrency: { mediaGeneration: 3, copyGeneration: 5, clientProcessing: 2 },
};

const mockPosts: PlannedPost[] = [
  {
    date: '2026-03-23',
    contentType: 'food_hero',
    platforms: ['instagram', 'facebook'],
    menuItem: { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
    theme: 'Monday special',
    brief: 'Hero shot',
  },
];

const mockBrandProfile = {
  brandVoiceGuide: 'Warm and friendly',
  keySellingPoints: ['Fresh ingredients'],
  hashtagStrategy: ['#LocalEats'],
};

const validCopyJson = JSON.stringify({
  caption: 'Delicious butter chicken!',
  hashtags: ['#ButterChicken', '#LocalEats'],
  cta: 'Order now!',
});

function createMockAi(): AiClient {
  return {
    generateCopy: vi.fn().mockResolvedValue({
      text: validCopyJson,
      usage: { promptTokens: 100, completionTokens: 50 },
    }),
    generateBrandProfile: vi.fn(),
    generateImage: vi.fn(),
  };
}

describe('generateCopy', () => {
  it('generates copy for each post x platform combination', async () => {
    const ai = createMockAi();
    const results = await generateCopy(mockPosts, mockBrandProfile, {
      ai,
      config: mockConfig,
      concurrency: 5,
    });

    // 1 post x 2 platforms = 2 copies
    expect(results).toHaveLength(2);
    expect(ai.generateCopy).toHaveBeenCalledTimes(2);
  });

  it('uses copy model from config', async () => {
    const ai = createMockAi();
    await generateCopy(mockPosts, mockBrandProfile, {
      ai,
      config: mockConfig,
      concurrency: 5,
    });

    expect(ai.generateCopy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini' }),
    );
  });

  it('returns GeneratedCopy with correct fields', async () => {
    const ai = createMockAi();
    const results = await generateCopy(mockPosts, mockBrandProfile, {
      ai,
      config: mockConfig,
      concurrency: 5,
    });

    expect(results[0]).toMatchObject({
      platform: 'instagram',
      caption: 'Delicious butter chicken!',
      hashtags: ['#ButterChicken', '#LocalEats'],
      cta: 'Order now!',
    });
    expect(results[1].platform).toBe('facebook');
  });

  it('skips on failure and continues', async () => {
    const ai: AiClient = {
      generateCopy: vi.fn()
        .mockResolvedValueOnce({ text: validCopyJson, usage: { promptTokens: 100, completionTokens: 50 } })
        .mockRejectedValueOnce(new Error('API error')),
      generateBrandProfile: vi.fn(),
      generateImage: vi.fn(),
    };

    const results = await generateCopy(mockPosts, mockBrandProfile, {
      ai,
      config: mockConfig,
      concurrency: 5,
    });

    expect(results).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-content-engine && pnpm test -- src/pipeline/__tests__/generate-copy.test.ts`
Expected: FAIL — cannot resolve `../generate-copy.js`

- [ ] **Step 3: Implement generateCopy**

Create `hum-content-engine/src/pipeline/generate-copy.ts`:

```typescript
import { z } from 'zod';
import PQueue from 'p-queue';
import type { AiClient } from 'hum-integrations';
import type { Platform } from 'hum-core';
import { logger } from 'hum-core';
import type { PlannedPost } from './plan-calendar.js';
import type { ContentEngineConfig } from '../config.js';
import { buildCopyPrompt } from '../prompts/copy.js';

export type GeneratedCopy = {
  plannedPost: PlannedPost;
  platform: Platform;
  caption: string;
  hashtags: string[];
  cta: string;
};

type BrandInfo = {
  brandVoiceGuide: string | null;
  keySellingPoints: string[];
  hashtagStrategy: string[];
};

type GenerateCopyDeps = {
  ai: AiClient;
  config: ContentEngineConfig;
  concurrency: number;
};

const copyResultSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()).default([]),
  cta: z.string().default(''),
});

export async function generateCopy(
  posts: PlannedPost[],
  brand: BrandInfo,
  deps: GenerateCopyDeps,
): Promise<GeneratedCopy[]> {
  const { ai, config, concurrency } = deps;
  const queue = new PQueue({ concurrency });
  const results: GeneratedCopy[] = [];

  // Flatten: one task per post x platform
  const tasks: Array<{ post: PlannedPost; platform: Platform }> = [];
  for (const post of posts) {
    for (const platform of post.platforms) {
      tasks.push({ post, platform });
    }
  }

  const promises = tasks.map(({ post, platform }, index) =>
    queue.add(async () => {
      try {
        const prompt = buildCopyPrompt(post, brand, platform);
        const result = await ai.generateCopy({ ...prompt, model: config.models.copy });
        const parsed = copyResultSchema.parse(JSON.parse(result.text));

        results.push({
          plannedPost: post,
          platform,
          caption: parsed.caption,
          hashtags: parsed.hashtags,
          cta: parsed.cta,
        });
      } catch (err) {
        logger.warn(`Copy generation failed for post ${index} (${platform}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );

  await Promise.all(promises);
  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hum-content-engine && pnpm test -- src/pipeline/__tests__/generate-copy.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add hum-content-engine/src/pipeline/generate-copy.ts hum-content-engine/src/pipeline/__tests__/generate-copy.test.ts
git commit -m "feat(content-engine): add generateCopy pipeline step with per-platform copy"
```

---

### Task 10: Pipeline Step 3 — composePosts

**Files:**
- Create: `hum-content-engine/src/pipeline/compose-posts.ts`
- Create: `hum-content-engine/src/pipeline/__tests__/compose-posts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-content-engine/src/pipeline/__tests__/compose-posts.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { composePosts } from '../compose-posts.js';
import type { PlannedPost } from '../plan-calendar.js';
import type { GeneratedMedia } from '../generate-media.js';
import type { GeneratedCopy } from '../generate-copy.js';
import { createDb, type HumDb, clientRepo, contentItemRepo } from 'hum-core';

let humDb: HumDb;
let clientId: string;

beforeEach(async () => {
  humDb = createDb(':memory:');
  const client = await clientRepo.create(humDb.db, {
    businessName: "Ali's Kitchen",
    email: 'ali@test.com',
  });
  clientId = client.id;
});

afterEach(() => {
  humDb?.close();
});

const post1: PlannedPost = {
  date: '2026-03-23',
  contentType: 'food_hero',
  platforms: ['instagram', 'facebook'],
  menuItem: { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
  theme: 'Monday special',
  brief: 'Hero shot',
};

describe('composePosts', () => {
  it('creates ComposedPosts from matching media and copy', async () => {
    const media: GeneratedMedia[] = [
      { plannedPost: post1, localPath: 'client-1/img.png', mimeType: 'image/png' },
    ];
    const copy: GeneratedCopy[] = [
      { plannedPost: post1, platform: 'instagram', caption: 'Yum!', hashtags: ['#food'], cta: 'Order now' },
      { plannedPost: post1, platform: 'facebook', caption: 'Tasty!', hashtags: ['#food'], cta: 'Try it' },
    ];
    const peakPostingTimes = { instagram: ['12:00', '18:00'], facebook: ['11:00'] };

    const results = await composePosts(
      [post1], media, copy, clientId, peakPostingTimes, humDb.db,
    );

    expect(results).toHaveLength(2);
    expect(results[0].platform).toBe('instagram');
    expect(results[1].platform).toBe('facebook');
  });

  it('creates ContentItem rows in database', async () => {
    const media: GeneratedMedia[] = [
      { plannedPost: post1, localPath: 'client-1/img.png', mimeType: 'image/png' },
    ];
    const copy: GeneratedCopy[] = [
      { plannedPost: post1, platform: 'instagram', caption: 'Yum!', hashtags: ['#food'], cta: 'Order now' },
    ];

    await composePosts([post1], media, copy, clientId, {}, humDb.db);

    const items = await contentItemRepo.list(humDb.db, { clientId });
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe('draft');
    expect(items[0].caption).toBe('Yum!');
  });

  it('deduplicates hashtags', async () => {
    const media: GeneratedMedia[] = [
      { plannedPost: post1, localPath: 'client-1/img.png', mimeType: 'image/png' },
    ];
    const copy: GeneratedCopy[] = [
      { plannedPost: post1, platform: 'instagram', caption: 'Yum!', hashtags: ['#food', '#food', '#yum'], cta: 'Order' },
    ];

    const results = await composePosts([post1], media, copy, clientId, {}, humDb.db);
    expect(results[0].hashtags).toEqual(['#food', '#yum']);
  });

  it('skips posts with missing media', async () => {
    const media: GeneratedMedia[] = []; // no media
    const copy: GeneratedCopy[] = [
      { plannedPost: post1, platform: 'instagram', caption: 'Yum!', hashtags: [], cta: 'Order' },
    ];

    const results = await composePosts([post1], media, copy, clientId, {}, humDb.db);
    expect(results).toHaveLength(0);
  });

  it('skips posts with missing copy for that platform', async () => {
    const media: GeneratedMedia[] = [
      { plannedPost: post1, localPath: 'client-1/img.png', mimeType: 'image/png' },
    ];
    const copy: GeneratedCopy[] = []; // no copy

    const results = await composePosts([post1], media, copy, clientId, {}, humDb.db);
    expect(results).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-content-engine && pnpm test -- src/pipeline/__tests__/compose-posts.test.ts`
Expected: FAIL — cannot resolve `../compose-posts.js`

- [ ] **Step 3: Implement composePosts**

Create `hum-content-engine/src/pipeline/compose-posts.ts`:

```typescript
import { contentItemRepo, platformSpecs, type Platform } from 'hum-core';
import type { PlannedPost } from './plan-calendar.js';
import type { GeneratedMedia } from './generate-media.js';
import type { GeneratedCopy } from './generate-copy.js';

export type ComposedPost = {
  plannedPost: PlannedPost;
  platform: Platform;
  caption: string;
  hashtags: string[];
  cta: string;
  mediaPath: string;
  scheduledAt: string;
  contentItemId: string;
};

function findMedia(post: PlannedPost, mediaList: GeneratedMedia[]): GeneratedMedia | undefined {
  return mediaList.find((m) => m.plannedPost === post);
}

function findCopy(post: PlannedPost, platform: Platform, copyList: GeneratedCopy[]): GeneratedCopy | undefined {
  return copyList.find((c) => c.plannedPost === post && c.platform === platform);
}

function deduplicateHashtags(hashtags: string[]): string[] {
  return [...new Set(hashtags)];
}

function truncateCaption(caption: string, platform: Platform): string {
  const maxLen = platformSpecs[platform]?.maxCaptionLength ?? 2200;
  return caption.length > maxLen ? caption.slice(0, maxLen) : caption;
}

function pickScheduledTime(
  date: string,
  platform: Platform,
  peakPostingTimes: Record<string, string[]>,
  usedSlots: Set<string>,
): string {
  const times = peakPostingTimes[platform] ?? ['12:00'];
  for (const time of times) {
    const slot = `${date}T${time}`;
    if (!usedSlots.has(slot)) {
      usedSlots.add(slot);
      return `${date}T${time}:00.000Z`;
    }
  }
  // All slots used, pick the first
  return `${date}T${times[0]}:00.000Z`;
}

export async function composePosts(
  posts: PlannedPost[],
  media: GeneratedMedia[],
  copy: GeneratedCopy[],
  clientId: string,
  peakPostingTimes: Record<string, string[]>,
  db: any,
): Promise<ComposedPost[]> {
  const results: ComposedPost[] = [];
  const usedSlots = new Set<string>();

  for (const post of posts) {
    const postMedia = findMedia(post, media);
    if (!postMedia) continue;

    for (const platform of post.platforms) {
      const postCopy = findCopy(post, platform, copy);
      if (!postCopy) continue;

      const caption = truncateCaption(postCopy.caption, platform);
      const hashtags = deduplicateHashtags(postCopy.hashtags);
      const scheduledAt = pickScheduledTime(post.date, platform, peakPostingTimes, usedSlots);

      const contentItem = await contentItemRepo.create(db, {
        clientId,
        contentType: post.contentType,
        status: 'draft',
        caption,
        hashtags,
        cta: postCopy.cta,
        mediaUrls: [postMedia.localPath],
        platforms: [platform],
        scheduledAt: new Date(scheduledAt),
      });

      results.push({
        plannedPost: post,
        platform,
        caption,
        hashtags,
        cta: postCopy.cta,
        mediaPath: postMedia.localPath,
        scheduledAt,
        contentItemId: contentItem.id,
      });
    }
  }

  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hum-content-engine && pnpm test -- src/pipeline/__tests__/compose-posts.test.ts`
Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add hum-content-engine/src/pipeline/compose-posts.ts hum-content-engine/src/pipeline/__tests__/compose-posts.test.ts
git commit -m "feat(content-engine): add composePosts step — assemble media + copy into ContentItems"
```

---

### Task 11: Pipeline Step 4 — schedulePosts

**Files:**
- Create: `hum-content-engine/src/pipeline/schedule-posts.ts`
- Create: `hum-content-engine/src/pipeline/__tests__/schedule-posts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-content-engine/src/pipeline/__tests__/schedule-posts.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { schedulePosts } from '../schedule-posts.js';
import type { SocialClient } from 'hum-integrations';
import type { ComposedPost } from '../compose-posts.js';
import type { StorageClient } from '../../storage/types.js';
import { createDb, type HumDb, clientRepo, contentItemRepo } from 'hum-core';

let humDb: HumDb;
let clientId: string;

beforeEach(async () => {
  humDb = createDb(':memory:');
  const client = await clientRepo.create(humDb.db, {
    businessName: "Ali's Kitchen",
    email: 'ali@test.com',
  });
  clientId = client.id;
});

afterEach(() => {
  humDb?.close();
});

function createMockSocial(): SocialClient {
  return {
    schedulePost: vi.fn().mockResolvedValue({
      id: 'mock-post-1',
      status: 'scheduled',
      postIds: {},
    }),
    getProfiles: vi.fn(),
    deletePost: vi.fn(),
  };
}

function createMockStorage(): StorageClient {
  return {
    save: vi.fn(),
    getUrl: vi.fn((p: string) => `/absolute/${p}`),
    delete: vi.fn(),
  };
}

describe('schedulePosts', () => {
  it('schedules posts and updates ContentItem status to scheduled', async () => {
    const item = await contentItemRepo.create(humDb.db, {
      clientId,
      contentType: 'food_hero',
      caption: 'Test',
      platforms: ['instagram'],
    });

    const composedPost: ComposedPost = {
      plannedPost: {
        date: '2026-03-23',
        contentType: 'food_hero',
        platforms: ['instagram'],
        theme: 'test',
        brief: 'test',
      },
      platform: 'instagram',
      caption: 'Test',
      hashtags: ['#food'],
      cta: 'Order now',
      mediaPath: 'client-1/img.png',
      scheduledAt: '2026-03-23T12:00:00.000Z',
      contentItemId: item.id,
    };

    const social = createMockSocial();
    const storage = createMockStorage();

    const result = await schedulePosts([composedPost], 'profile-key-1', social, storage, humDb.db);

    expect(social.schedulePost).toHaveBeenCalledTimes(1);
    expect(social.schedulePost).toHaveBeenCalledWith(
      expect.objectContaining({
        profileKey: 'profile-key-1',
        platforms: ['instagram'],
        mediaUrls: ['/absolute/client-1/img.png'],
      }),
    );

    const updated = await contentItemRepo.getById(humDb.db, item.id);
    expect(updated?.status).toBe('scheduled');
    expect(result.scheduled).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('marks posts as failed on scheduling error and continues', async () => {
    const item1 = await contentItemRepo.create(humDb.db, { clientId, contentType: 'food_hero', platforms: ['instagram'] });
    const item2 = await contentItemRepo.create(humDb.db, { clientId, contentType: 'deal_offer', platforms: ['facebook'] });

    const posts: ComposedPost[] = [
      {
        plannedPost: { date: '2026-03-23', contentType: 'food_hero', platforms: ['instagram'], theme: 't', brief: 'b' },
        platform: 'instagram', caption: 'A', hashtags: [], cta: '', mediaPath: 'a.png',
        scheduledAt: '2026-03-23T12:00:00.000Z', contentItemId: item1.id,
      },
      {
        plannedPost: { date: '2026-03-24', contentType: 'deal_offer', platforms: ['facebook'], theme: 't', brief: 'b' },
        platform: 'facebook', caption: 'B', hashtags: [], cta: '', mediaPath: 'b.png',
        scheduledAt: '2026-03-24T12:00:00.000Z', contentItemId: item2.id,
      },
    ];

    const social: SocialClient = {
      schedulePost: vi.fn()
        .mockRejectedValueOnce(new Error('API down'))
        .mockResolvedValueOnce({ id: 'mock', status: 'scheduled', postIds: {} }),
      getProfiles: vi.fn(),
      deletePost: vi.fn(),
    };
    const storage = createMockStorage();

    const result = await schedulePosts(posts, 'profile-key-1', social, storage, humDb.db);

    expect(result.scheduled).toBe(1);
    expect(result.failed).toBe(1);

    const failed = await contentItemRepo.getById(humDb.db, item1.id);
    expect(failed?.status).toBe('failed');

    const scheduled = await contentItemRepo.getById(humDb.db, item2.id);
    expect(scheduled?.status).toBe('scheduled');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-content-engine && pnpm test -- src/pipeline/__tests__/schedule-posts.test.ts`
Expected: FAIL — cannot resolve `../schedule-posts.js`

- [ ] **Step 3: Implement schedulePosts**

Create `hum-content-engine/src/pipeline/schedule-posts.ts`:

```typescript
import type { SocialClient } from 'hum-integrations';
import { contentItemRepo, logger } from 'hum-core';
import type { StorageClient } from '../storage/types.js';
import type { ComposedPost } from './compose-posts.js';

type ScheduleResult = {
  scheduled: number;
  failed: number;
  errors: Array<{ postIndex: number; message: string; cause?: unknown }>;
};

export async function schedulePosts(
  posts: ComposedPost[],
  profileKey: string,
  social: SocialClient,
  storage: StorageClient,
  db: any,
): Promise<ScheduleResult> {
  let scheduled = 0;
  let failed = 0;
  const errors: ScheduleResult['errors'] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    try {
      const mediaUrl = storage.getUrl(post.mediaPath);

      await social.schedulePost({
        profileKey,
        post: post.caption,
        platforms: [post.platform],
        mediaUrls: [mediaUrl],
        scheduledDate: post.scheduledAt,
        hashtags: post.hashtags,
      });

      await contentItemRepo.update(db, post.contentItemId, { status: 'scheduled' });
      scheduled++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Scheduling failed for post ${i}: ${message}`);
      errors.push({ postIndex: i, message, cause: err });

      try {
        await contentItemRepo.update(db, post.contentItemId, { status: 'failed' });
      } catch {
        // best-effort status update
      }
      failed++;
    }
  }

  return { scheduled, failed, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hum-content-engine && pnpm test -- src/pipeline/__tests__/schedule-posts.test.ts`
Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add hum-content-engine/src/pipeline/schedule-posts.ts hum-content-engine/src/pipeline/__tests__/schedule-posts.test.ts
git commit -m "feat(content-engine): add schedulePosts step with failure handling"
```

---

### Task 12: Orchestrator — DAG pipeline runner

**Files:**
- Create: `hum-content-engine/src/pipeline/orchestrator.ts`
- Create: `hum-content-engine/src/pipeline/__tests__/orchestrator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-content-engine/src/pipeline/__tests__/orchestrator.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runPipeline } from '../orchestrator.js';
import type { AiClient, SocialClient } from 'hum-integrations';
import {
  createDb, type HumDb, clientRepo, brandProfileRepo, socialAccountRepo, contentItemRepo,
} from 'hum-core';
import { LocalStorageClient } from '../../storage/local.js';
import type { ContentEngineConfig } from '../../config.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

let humDb: HumDb;
let tmpDir: string;
let storage: LocalStorageClient;

const mockConfig: ContentEngineConfig = {
  models: { planning: 'gpt-4o', copy: 'gpt-4o-mini' },
  storage: { basePath: '' }, // set in beforeEach
  concurrency: { mediaGeneration: 2, copyGeneration: 2, clientProcessing: 1 },
};

const validCalendarJson = JSON.stringify([
  {
    date: '2026-03-23',
    contentType: 'food_hero',
    platforms: ['instagram'],
    menuItem: { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
    theme: 'Monday special',
    brief: 'Hero shot',
  },
]);

const validCopyJson = JSON.stringify({
  caption: 'Delicious!',
  hashtags: ['#food'],
  cta: 'Order now',
});

function createMockAi(): AiClient {
  return {
    generateCopy: vi.fn()
      .mockResolvedValueOnce({ text: validCalendarJson, usage: { promptTokens: 100, completionTokens: 50 } })
      .mockResolvedValue({ text: validCopyJson, usage: { promptTokens: 50, completionTokens: 30 } }),
    generateBrandProfile: vi.fn(),
    generateImage: vi.fn().mockResolvedValue({ imageUrls: ['https://mock.fal.ai/img.png'] }),
  };
}

function createMockSocial(): SocialClient {
  return {
    schedulePost: vi.fn().mockResolvedValue({ id: 'mock', status: 'scheduled', postIds: {} }),
    getProfiles: vi.fn(),
    deletePost: vi.fn(),
  };
}

beforeEach(async () => {
  humDb = createDb(':memory:');
  tmpDir = await mkdtemp(path.join(tmpdir(), 'hum-orchestrator-'));
  mockConfig.storage.basePath = tmpDir;
  storage = new LocalStorageClient(tmpDir);

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  }));
});

afterEach(async () => {
  humDb?.close();
  await rm(tmpDir, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe('runPipeline', () => {
  it('runs the full pipeline and creates scheduled ContentItems', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: "Ali's Kitchen",
      email: 'ali@test.com',
      status: 'active',
      planTier: 'starter',
    });

    const brand = await brandProfileRepo.create(humDb.db, {
      clientId: client.id,
      brandVoiceGuide: 'Warm and friendly',
      menuItems: [{ name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 }],
      keySellingPoints: ['Fresh ingredients'],
      contentThemes: ['dish spotlights'],
      hashtagStrategy: ['#LocalEats'],
      peakPostingTimes: { instagram: ['12:00'] },
    });

    await socialAccountRepo.create(humDb.db, {
      clientId: client.id,
      platform: 'instagram',
      platformAccountId: 'ig-123',
      ayrshareProfileKey: 'profile-key-1',
      status: 'connected',
    });

    const ai = createMockAi();
    const social = createMockSocial();

    const result = await runPipeline(client, brand, {
      ai,
      social,
      storage,
      db: humDb.db,
      config: mockConfig,
    });

    expect(result.clientId).toBe(client.id);
    expect(result.planned).toBeGreaterThan(0);
    expect(result.scheduled).toBeGreaterThan(0);
    expect(result.failed).toBe(0);

    const items = await contentItemRepo.list(humDb.db, { clientId: client.id });
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].status).toBe('scheduled');
  });

  it('returns failed result when calendar planning fails', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: "Ali's Kitchen",
      email: 'ali@test.com',
      status: 'active',
      planTier: 'starter',
    });

    const brand = await brandProfileRepo.create(humDb.db, {
      clientId: client.id,
      menuItems: [],
    });

    const ai: AiClient = {
      generateCopy: vi.fn().mockResolvedValue({ text: 'not json', usage: { promptTokens: 0, completionTokens: 0 } }),
      generateBrandProfile: vi.fn(),
      generateImage: vi.fn(),
    };

    const result = await runPipeline(client, brand, {
      ai,
      social: createMockSocial(),
      storage,
      db: humDb.db,
      config: mockConfig,
    });

    expect(result.planned).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].step).toBe('plan');
  });

  it('skips scheduling when no social account has profileKey', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: "Ali's Kitchen",
      email: 'ali@test.com',
      status: 'active',
      planTier: 'starter',
    });

    const brand = await brandProfileRepo.create(humDb.db, {
      clientId: client.id,
      brandVoiceGuide: 'Warm',
      menuItems: [{ name: 'Naan', description: 'Bread', category: 'Sides', price: 3.50 }],
      peakPostingTimes: { instagram: ['12:00'] },
    });

    // No social account created

    const ai = createMockAi();
    const social = createMockSocial();

    const result = await runPipeline(client, brand, {
      ai,
      social,
      storage,
      db: humDb.db,
      config: mockConfig,
    });

    expect(result.scheduled).toBe(0);
    expect(social.schedulePost).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-content-engine && pnpm test -- src/pipeline/__tests__/orchestrator.test.ts`
Expected: FAIL — cannot resolve `../orchestrator.js`

- [ ] **Step 3: Implement orchestrator**

Create `hum-content-engine/src/pipeline/orchestrator.ts`:

```typescript
import type { AiClient, SocialClient } from 'hum-integrations';
import {
  type Client, type BrandProfile, plans, type Platform,
  socialAccountRepo, logger,
} from 'hum-core';
import type { StorageClient } from '../storage/types.js';
import type { ContentEngineConfig } from '../config.js';
import { planCalendar } from './plan-calendar.js';
import { generateMedia } from './generate-media.js';
import { generateCopy } from './generate-copy.js';
import { composePosts } from './compose-posts.js';
import { schedulePosts } from './schedule-posts.js';

export type PipelineError = {
  step: 'plan' | 'media' | 'copy' | 'compose' | 'schedule';
  postIndex?: number;
  message: string;
  cause?: unknown;
};

export type PipelineResult = {
  clientId: string;
  weekStarting: string;
  planned: number;
  generated: number;
  scheduled: number;
  failed: number;
  errors: PipelineError[];
};

type PipelineDeps = {
  ai: AiClient;
  social: SocialClient;
  storage: StorageClient;
  db: any;
  config: ContentEngineConfig;
};

const MVP_PLATFORMS: Platform[] = ['instagram', 'facebook', 'google_business'];

export async function runPipeline(
  client: Client | { id: string; businessName: string; address: string | null; planTier: string },
  brandProfile: BrandProfile | {
    brandVoiceGuide: string | null;
    menuItems: Array<{ name: string; description: string; category: string; price: number; photoUrl?: string }>;
    contentThemes: string[];
    keySellingPoints: string[];
    hashtagStrategy: string[];
    brandColours: string[];
    peakPostingTimes: Record<string, string[]>;
  },
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const { ai, social, storage, db, config } = deps;
  const errors: PipelineError[] = [];

  const planTier = (client as any).planTier ?? 'starter';
  const planConfig = plans[planTier as keyof typeof plans] ?? plans.starter;
  const allowedPlatforms = planConfig.platforms.filter((p) => MVP_PLATFORMS.includes(p));

  // Step 1: Plan calendar
  let calendar;
  try {
    calendar = await planCalendar(
      { id: client.id, businessName: client.businessName, address: client.address },
      {
        brandVoiceGuide: brandProfile.brandVoiceGuide,
        menuItems: brandProfile.menuItems,
        contentThemes: brandProfile.contentThemes ?? [],
        keySellingPoints: brandProfile.keySellingPoints ?? [],
        hashtagStrategy: brandProfile.hashtagStrategy ?? [],
      },
      { ai, config, platforms: allowedPlatforms, postsPerWeek: planConfig.postsPerWeek, recentMenuItemNames: [] },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Calendar planning failed for ${client.id}: ${message}`);
    return {
      clientId: client.id,
      weekStarting: new Date().toISOString().split('T')[0],
      planned: 0, generated: 0, scheduled: 0, failed: 0,
      errors: [{ step: 'plan', message, cause: err }],
    };
  }

  logger.info(`Planned ${calendar.posts.length} posts for ${client.businessName}`);

  // Steps 2a + 2b: Generate media and copy in parallel
  const [media, copy] = await Promise.all([
    generateMedia(calendar.posts, {
      brandColours: (brandProfile as any).brandColours ?? [],
      brandVoiceGuide: brandProfile.brandVoiceGuide,
    }, client.id, {
      ai,
      storage,
      concurrency: config.concurrency.mediaGeneration,
    }),
    generateCopy(calendar.posts, {
      brandVoiceGuide: brandProfile.brandVoiceGuide,
      keySellingPoints: brandProfile.keySellingPoints ?? [],
      hashtagStrategy: brandProfile.hashtagStrategy ?? [],
    }, {
      ai,
      config,
      concurrency: config.concurrency.copyGeneration,
    }),
  ]);

  logger.info(`Generated ${media.length} media, ${copy.length} copy items`);

  // Step 3: Compose posts
  const composed = await composePosts(
    calendar.posts, media, copy, client.id,
    brandProfile.peakPostingTimes ?? {},
    db,
  );

  logger.info(`Composed ${composed.length} posts`);

  // Step 4: Schedule posts (skip if dry run or no social account)
  let scheduleResult = { scheduled: 0, failed: 0, errors: [] as Array<{ postIndex: number; message: string; cause?: unknown }> };

  if (config.dryRun) {
    logger.info(`Dry run — skipping scheduling, ${composed.length} posts remain as drafts`);
  } else {
    const socialAccounts = await socialAccountRepo.listByClientId(db, client.id);
    const connectedAccount = socialAccounts.find(
      (a) => a.status === 'connected' && a.ayrshareProfileKey,
    );

  if (connectedAccount?.ayrshareProfileKey) {
    scheduleResult = await schedulePosts(
      composed, connectedAccount.ayrshareProfileKey, social, storage, db,
    );
    for (const err of scheduleResult.errors) {
      errors.push({ step: 'schedule', postIndex: err.postIndex, message: err.message, cause: err.cause });
    }
  } else {
    logger.info(`No connected social account for ${client.id} — posts remain as drafts`);
  }
  } // end if (!config.dryRun)

  return {
    clientId: client.id,
    weekStarting: calendar.weekStarting,
    planned: calendar.posts.length,
    generated: composed.length,
    scheduled: scheduleResult.scheduled,
    failed: scheduleResult.failed,
    errors,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hum-content-engine && pnpm test -- src/pipeline/__tests__/orchestrator.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add hum-content-engine/src/pipeline/orchestrator.ts hum-content-engine/src/pipeline/__tests__/orchestrator.test.ts
git commit -m "feat(content-engine): add orchestrator — DAG pipeline runner for single client"
```

---

### Task 13: Scheduler + CLI + public API

**Files:**
- Create: `hum-content-engine/src/scheduler.ts`
- Create: `hum-content-engine/src/cli.ts`
- Modify: `hum-content-engine/src/index.ts`

- [ ] **Step 1: Create scheduler**

Create `hum-content-engine/src/scheduler.ts`:

```typescript
import cron from 'node-cron';
import PQueue from 'p-queue';
import type { AiClient, SocialClient } from 'hum-integrations';
import { clientRepo, brandProfileRepo, logger, type HumDb } from 'hum-core';
import type { StorageClient } from './storage/types.js';
import type { ContentEngineConfig } from './config.js';
import { runPipeline } from './pipeline/orchestrator.js';

type SchedulerDeps = {
  ai: AiClient;
  social: SocialClient;
  storage: StorageClient;
  db: any;
};

export function startScheduler(config: ContentEngineConfig, deps: SchedulerDeps): cron.ScheduledTask {
  const schedule = config.cron?.schedule ?? '0 2 * * 0';

  logger.info(`Starting content engine scheduler: ${schedule}`);

  return cron.schedule(schedule, async () => {
    logger.info('Weekly content generation started');
    const queue = new PQueue({ concurrency: config.concurrency.clientProcessing });

    const clients = await clientRepo.list(deps.db, { status: 'active' });
    logger.info(`Processing ${clients.length} active clients`);

    let totalScheduled = 0;
    let totalFailed = 0;

    const tasks = clients.map((client) =>
      queue.add(async () => {
        const brand = await brandProfileRepo.getByClientId(deps.db, client.id);
        if (!brand) {
          logger.warn(`No brand profile for client ${client.id}, skipping`);
          return;
        }

        const result = await runPipeline(client, brand, {
          ai: deps.ai,
          social: deps.social,
          storage: deps.storage,
          db: deps.db,
          config,
        });

        totalScheduled += result.scheduled;
        totalFailed += result.failed;
        logger.info(`Client ${client.businessName}: ${result.scheduled} scheduled, ${result.failed} failed`);
      }),
    );

    await Promise.all(tasks);
    logger.info(`Weekly batch complete: ${totalScheduled} scheduled, ${totalFailed} failed across ${clients.length} clients`);
  });
}
```

- [ ] **Step 2: Create CLI**

Create `hum-content-engine/src/cli.ts`:

```typescript
import { createDb, clientRepo, brandProfileRepo, logger } from 'hum-core';
import { createAiClient, createSocialClient } from 'hum-integrations';
import { LocalStorageClient } from './storage/local.js';
import { defaultConfig } from './config.js';
import { runPipeline } from './pipeline/orchestrator.js';
import { startScheduler } from './scheduler.js';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : undefined;
}

function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

const useMock = hasFlag('--mock');
const dryRun = hasFlag('--dry-run');

async function main() {
  const humDb = createDb(process.env.DATABASE_URL);
  const ai = createAiClient({ mock: useMock });
  const social = createSocialClient({ mock: useMock });
  const storage = new LocalStorageClient(defaultConfig.storage.basePath);
  const config = { ...defaultConfig, dryRun };

  if (dryRun) {
    logger.info('Dry run mode — posts will be created as drafts, not scheduled');
  }

  switch (command) {
    case 'generate': {
      const clientId = getFlag('--client');
      const all = hasFlag('--all');

      if (clientId) {
        const client = await clientRepo.getById(humDb.db, clientId);
        if (!client) {
          logger.error(`Client not found: ${clientId}`);
          process.exit(1);
        }
        const brand = await brandProfileRepo.getByClientId(humDb.db, clientId);
        if (!brand) {
          logger.error(`No brand profile for client: ${clientId}`);
          process.exit(1);
        }

        const result = await runPipeline(client, brand, {
          ai, social, storage, db: humDb.db, config,
        });
        logger.info(`Pipeline complete: ${result.scheduled} scheduled, ${result.failed} failed`);

      } else if (all) {
        const clients = await clientRepo.list(humDb.db, { status: 'active' });
        for (const client of clients) {
          const brand = await brandProfileRepo.getByClientId(humDb.db, client.id);
          if (!brand) continue;

          const result = await runPipeline(client, brand, {
            ai, social, storage, db: humDb.db, config,
          });
          logger.info(`${client.businessName}: ${result.scheduled} scheduled, ${result.failed} failed`);
        }
      } else {
        logger.error('Usage: generate --client <id> | generate --all');
        process.exit(1);
      }

      humDb.close();
      break;
    }

    case 'start': {
      startScheduler(config, { ai, social, storage, db: humDb.db });
      logger.info('Scheduler running. Press Ctrl+C to stop.');
      break;
    }

    default:
      console.log(`hum-content-engine CLI

Commands:
  generate --client <id>   Run pipeline for one client
  generate --all           Run pipeline for all active clients
  start                    Start the cron scheduler

Options:
  --dry-run                Generate content but don't schedule
  --mock                   Force mock integrations`);
      process.exit(0);
  }
}

main().catch((err) => {
  logger.error(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

- [ ] **Step 3: Update index.ts with full public API**

Update `hum-content-engine/src/index.ts`:

```typescript
// Core pipeline
export { runPipeline, type PipelineResult, type PipelineError } from './pipeline/orchestrator.js';

// Pipeline steps (for advanced usage)
export { planCalendar, type PlannedPost, type ContentCalendar } from './pipeline/plan-calendar.js';
export { generateMedia, type GeneratedMedia } from './pipeline/generate-media.js';
export { generateCopy, type GeneratedCopy } from './pipeline/generate-copy.js';
export { composePosts, type ComposedPost } from './pipeline/compose-posts.js';
export { schedulePosts } from './pipeline/schedule-posts.js';

// Storage
export { type StorageClient } from './storage/types.js';
export { LocalStorageClient } from './storage/local.js';

// Config
export { type ContentEngineConfig, defaultConfig } from './config.js';

// Scheduler
export { startScheduler } from './scheduler.js';
```

- [ ] **Step 4: Verify build**

Run: `cd hum-content-engine && pnpm build`
Expected: Compiles without errors.

- [ ] **Step 5: Run all tests**

Run: `cd hum-content-engine && pnpm test`
Expected: All tests across all modules PASS.

- [ ] **Step 6: Commit**

```bash
git add hum-content-engine/src/scheduler.ts hum-content-engine/src/cli.ts hum-content-engine/src/index.ts
git commit -m "feat(content-engine): add scheduler, CLI, and public API"
```

---

### Task 14: Full suite verification

- [ ] **Step 1: Run all tests from repo root**

Run: `cd /Users/abdi/workplace/hum-3/hum && pnpm test`
Expected: All tests across hum-core, hum-integrations, and hum-content-engine PASS.

- [ ] **Step 2: Build all packages**

Run: `pnpm build`
Expected: All packages compile without errors.

- [ ] **Step 3: Verify CLI help**

Run: `cd hum-content-engine && pnpm content-engine`
Expected: Shows usage help text.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore(content-engine): fix any issues found in full suite verification"
```

(Skip this commit if nothing needed fixing.)
