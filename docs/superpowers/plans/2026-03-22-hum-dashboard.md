# hum-dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the operator dashboard — a Next.js app that gives 1-2 operators at-a-glance fleet management, content preview, and system issue resolution for all hum clients.

**Architecture:** Lean BFF — Next.js App Router with API routes importing hum-core repositories directly. Client-side React Query for data fetching with 30s auto-polling. Simple env-var password auth with HTTP-only cookie.

**Tech Stack:** Next.js 15 (App Router), React 19, TanStack Query, Tailwind CSS, shadcn/ui, hum-core (workspace dependency), Vitest

**Spec:** `docs/superpowers/specs/2026-03-22-hum-dashboard-design.md`

---

## File Structure

```
hum-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx                          # Root layout — sidebar + auth redirect
│   │   ├── page.tsx                            # Fleet Overview (home)
│   │   ├── providers.tsx                       # QueryClientProvider wrapper
│   │   ├── login/
│   │   │   └── page.tsx                       # Login form
│   │   ├── clients/
│   │   │   ├── page.tsx                       # Client list
│   │   │   └── [id]/
│   │   │       └── page.tsx                   # Client detail
│   │   ├── content/
│   │   │   └── page.tsx                       # Content preview
│   │   ├── issues/
│   │   │   └── page.tsx                       # System issues
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   └── logout/route.ts
│   │       ├── clients/
│   │       │   ├── route.ts                   # GET all clients
│   │       │   └── [id]/route.ts              # GET/PATCH single client
│   │       ├── content/
│   │       │   ├── route.ts                   # GET content list
│   │       │   └── [id]/route.ts              # PATCH/DELETE single content
│   │       ├── issues/
│   │       │   ├── route.ts                   # GET aggregated issues
│   │       │   └── [id]/
│   │       │       ├── retry/route.ts         # POST retry failed item
│   │       │       └── dismiss/route.ts       # POST dismiss issue
│   │       ├── fleet/
│   │       │   └── stats/route.ts             # GET fleet overview stats
│   │       └── media/
│   │           └── [...path]/route.ts         # GET stream media files
│   ├── components/
│   │   ├── sidebar.tsx                        # Nav sidebar with issue badge
│   │   ├── status-badge.tsx                   # Reusable status pill component
│   │   ├── fleet-stats.tsx                    # Status count cards
│   │   ├── system-health.tsx                  # Health indicator rows
│   │   ├── issue-card.tsx                     # Single issue with actions
│   │   ├── content-card.tsx                   # Content item in timeline
│   │   ├── content-preview-modal.tsx          # Full preview overlay
│   │   ├── client-row.tsx                     # Table row in client list
│   │   ├── client-header.tsx                  # Client detail header bar
│   │   ├── brand-profile-panel.tsx            # Brand info display
│   │   ├── social-accounts-panel.tsx          # Platform connection list
│   │   ├── onboarding-progress.tsx            # Step tracker
│   │   └── recent-content.tsx                 # Recent content items list
│   ├── lib/
│   │   ├── db.ts                              # Shared db instance for API routes
│   │   ├── auth.ts                            # Cookie helpers + middleware
│   │   ├── api.ts                             # Typed fetch wrappers for client
│   │   └── queries.ts                         # React Query hooks
│   └── types/
│       └── index.ts                           # Dashboard-specific types
├── scripts/
│   └── seed.ts                                # Seed data script
├── public/
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json                            # shadcn/ui config
├── package.json
└── tsconfig.json
```

---

## Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `hum-dashboard/package.json`
- Create: `hum-dashboard/tsconfig.json`
- Create: `hum-dashboard/next.config.ts`
- Create: `hum-dashboard/tailwind.config.ts`
- Create: `hum-dashboard/postcss.config.mjs`
- Create: `hum-dashboard/src/app/layout.tsx`
- Create: `hum-dashboard/src/app/page.tsx`
- Create: `hum-dashboard/src/app/providers.tsx`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Add hum-dashboard to pnpm workspace**

Add `"hum-dashboard"` to `pnpm-workspace.yaml`:

```yaml
packages:
  - "hum-core"
  - "hum-integrations"
  - "hum-dashboard"
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "hum-dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --port 3100",
    "build": "next build",
    "start": "next start --port 3100",
    "lint": "next lint",
    "seed": "tsx scripts/seed.ts"
  },
  "dependencies": {
    "hum-core": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-query": "^5.60.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "tsx": "^4.19.0",
    "vitest": "^3.0.0",
    "@vitejs/plugin-react": "^4.3.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create next.config.ts**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['hum-core'],
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
```

- [ ] **Step 5: Create Tailwind and PostCSS config**

`tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

`postcss.config.mjs`:
```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
```

- [ ] **Step 6: Create root layout with global styles**

`src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'hum — Operator Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

`src/app/providers.tsx`:
```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchInterval: 30_000,
          },
        },
      }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 7: Create placeholder home page**

`src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-bold">hum dashboard</h1>
    </main>
  );
}
```

- [ ] **Step 8: Install dependencies and verify build**

```bash
cd hum-dashboard && pnpm install
```

```bash
cd hum-dashboard && pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add hum-dashboard/ pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(dashboard): scaffold Next.js project with Tailwind and React Query"
```

---

## Task 2: Database Layer & Shared Types

**Files:**
- Create: `hum-dashboard/src/lib/db.ts`
- Create: `hum-dashboard/src/types/index.ts`

- [ ] **Step 1: Create shared db instance**

`src/lib/db.ts`:
```typescript
import { createDb } from 'hum-core';

const { db } = createDb();

export { db };
```

- [ ] **Step 2: Create dashboard-specific types**

`src/types/index.ts`:
```typescript
import type { Client, BrandProfile, SocialAccount, ContentItem } from 'hum-core';

export type ClientStatus = 'active' | 'onboarding' | 'paused' | 'churned';

export type FleetStats = {
  total: number;
  active: number;
  issues: number;
  onboarding: number;
  paused: number;
  health: {
    contentPipeline: { status: 'green' | 'amber' | 'red'; detail: string };
    socialConnections: { status: 'green' | 'amber' | 'red'; detail: string };
    tokenStatus: { status: 'green' | 'amber' | 'red'; detail: string };
    contentGeneration: { status: 'green' | 'amber' | 'red'; detail: string };
  };
  upcomingContent: ContentSummary[];
  recentIssues: IssueItem[];
};

export type ContentSummary = {
  id: string;
  clientId: string;
  clientName: string;
  contentType: string;
  platform: string;
  scheduledAt: string;
  mediaUrl: string | null;
};

export type IssueItem = {
  id: string;
  type: 'token_expired' | 'failed_post' | 'gen_error';
  severity: 'red' | 'amber' | 'purple';
  clientId: string;
  clientName: string;
  description: string;
  timestamp: string;
  entityType: 'content_item' | 'social_account';
  entityId: string;
};

export type ClientDetail = {
  client: Client;
  brandProfile: BrandProfile | null;
  socialAccounts: SocialAccount[];
  recentContent: ContentItem[];
  onboarding: OnboardingStatus | null;
};

export type OnboardingStatus = {
  sessionId: string;
  status: 'in_progress' | 'complete' | 'failed';
  currentStep: string | null;
  steps: Array<{
    name: string;
    status: 'complete' | 'processing' | 'pending' | 'failed';
  }>;
};

export type ClientListItem = {
  id: string;
  businessName: string;
  email: string;
  address: string | null;
  planTier: string;
  status: string;
  platforms: Array<{ platform: string; status: string }>;
  scheduledCount: number;
};

export type ApiError = {
  error: string;
  code: string;
};
```

- [ ] **Step 3: Verify types compile**

```bash
cd hum-dashboard && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add hum-dashboard/src/lib/db.ts hum-dashboard/src/types/
git commit -m "feat(dashboard): add db connection and dashboard types"
```

---

## Task 3: Auth — Login API & Middleware

**Files:**
- Create: `hum-dashboard/src/lib/auth.ts`
- Create: `hum-dashboard/src/app/api/auth/login/route.ts`
- Create: `hum-dashboard/src/app/api/auth/logout/route.ts`
- Create: `hum-dashboard/src/app/login/page.tsx`
- Modify: `hum-dashboard/src/app/layout.tsx`

- [ ] **Step 1: Create auth helpers**

`src/lib/auth.ts`:
```typescript
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'hum-auth';
const TOKEN_VALUE = 'authenticated';

export async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value === TOKEN_VALUE;
}

export function setAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, TOKEN_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.delete(COOKIE_NAME);
  return response;
}

export function requireAuth() {
  return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
}
```

- [ ] **Step 2: Create login API route**

`src/app/api/auth/login/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: 'DASHBOARD_PASSWORD not configured', code: 'SERVER_ERROR' },
      { status: 500 },
    );
  }

  if (password !== expected) {
    return NextResponse.json(
      { error: 'Invalid password', code: 'INVALID_CREDENTIALS' },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  return setAuthCookie(response);
}
```

- [ ] **Step 3: Create logout API route**

`src/app/api/auth/logout/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  return clearAuthCookie(response);
}
```

- [ ] **Step 4: Create login page**

`src/app/login/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || 'Login failed');
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">hum</h1>
        <p className="text-gray-400 text-center text-sm">Operator Dashboard</p>
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-gray-900 border border-gray-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 5: Add middleware for auth redirect**

Create `hum-dashboard/src/middleware.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('hum-auth');
  if (authCookie?.value !== 'authenticated') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 6: Verify login flow works**

```bash
cd hum-dashboard && DASHBOARD_PASSWORD=test pnpm dev
```

Visit `http://localhost:3100` — should redirect to `/login`. Enter "test" — should redirect to `/`. Expected: Auth flow works end-to-end.

- [ ] **Step 7: Commit**

```bash
git add hum-dashboard/src/lib/auth.ts hum-dashboard/src/app/api/auth/ hum-dashboard/src/app/login/ hum-dashboard/src/middleware.ts
git commit -m "feat(dashboard): add env-var password auth with cookie middleware"
```

---

## Task 4: Sidebar Layout

**Files:**
- Create: `hum-dashboard/src/components/sidebar.tsx`
- Create: `hum-dashboard/src/components/status-badge.tsx`
- Modify: `hum-dashboard/src/app/layout.tsx`

- [ ] **Step 1: Create status badge component**

`src/components/status-badge.tsx`:
```tsx
import { cn } from '@/lib/utils';

const variants: Record<string, string> = {
  active: 'bg-green-400/10 text-green-400',
  onboarding: 'bg-blue-400/10 text-blue-400',
  paused: 'bg-gray-400/10 text-gray-400',
  churned: 'bg-red-400/10 text-red-400',
  connected: 'bg-green-400/10 text-green-400',
  disconnected: 'bg-gray-400/10 text-gray-400',
  expired: 'bg-red-400/10 text-red-400',
  draft: 'bg-gray-400/10 text-gray-400',
  scheduled: 'bg-green-400/10 text-green-400',
  posted: 'bg-blue-400/10 text-blue-400',
  failed: 'bg-red-400/10 text-red-400',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        variants[status] ?? 'bg-gray-400/10 text-gray-400',
      )}
    >
      {status}
    </span>
  );
}
```

- [ ] **Step 2: Create cn utility**

`src/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create sidebar component**

`src/components/sidebar.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

const navItems = [
  { href: '/', label: 'Fleet', icon: '⊞' },
  { href: '/clients', label: 'Clients', icon: '⊡' },
  { href: '/content', label: 'Content', icon: '⊟' },
  { href: '/issues', label: 'Issues', icon: '⊠' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { data: issueCount } = useQuery<number>({
    queryKey: ['issue-count'],
    queryFn: async () => {
      const res = await fetch('/api/issues?countOnly=true');
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count;
    },
    refetchInterval: 30_000,
  });

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-52 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <Link href="/" className="text-lg font-bold tracking-tight">
          hum
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ href, label, icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200',
              )}
            >
              <span className="text-base">{icon}</span>
              <span>{label}</span>
              {label === 'Issues' && issueCount != null && issueCount > 0 && (
                <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs font-medium px-1.5 py-0.5 rounded">
                  {issueCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-300 rounded-md hover:bg-gray-800/50 transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Update root layout to include sidebar**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Sidebar } from '@/components/sidebar';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'hum — Operator Dashboard',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isAuthed = cookieStore.get('hum-auth')?.value === 'authenticated';

  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased">
        <Providers>
          {isAuthed ? (
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 ml-52 p-6">{children}</main>
            </div>
          ) : (
            children
          )}
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify sidebar renders**

```bash
cd hum-dashboard && DASHBOARD_PASSWORD=test pnpm dev
```

Login and verify sidebar appears with 4 nav items. Expected: Sidebar visible, nav highlights active page.

- [ ] **Step 6: Commit**

```bash
git add hum-dashboard/src/components/sidebar.tsx hum-dashboard/src/components/status-badge.tsx hum-dashboard/src/lib/utils.ts hum-dashboard/src/app/layout.tsx
git commit -m "feat(dashboard): add sidebar navigation with issue badge"
```

---

## Task 5: Fleet Stats API Route

**Files:**
- Create: `hum-dashboard/src/app/api/fleet/stats/route.ts`

- [ ] **Step 1: Create fleet stats route**

`src/app/api/fleet/stats/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientRepo, contentItemRepo, socialAccountRepo } from 'hum-core';
import type { FleetStats, IssueItem, ContentSummary } from '@/types';

export async function GET() {
  try {
    const clients = await clientRepo.list(db);
    const allContent = await contentItemRepo.list(db);

    // Status counts
    const active = clients.filter((c) => c.status === 'active').length;
    const onboarding = clients.filter((c) => c.status === 'onboarding').length;
    const paused = clients.filter((c) => c.status === 'paused').length;

    // Aggregate social accounts across clients
    const allSocials = (
      await Promise.all(clients.map((c) => socialAccountRepo.listByClientId(db, c.id)))
    ).flat();

    const expiredTokens = allSocials.filter((s) => s.status === 'expired' || s.status === 'disconnected');
    const connectedCount = allSocials.filter((s) => s.status === 'connected').length;

    // Failed content
    const failedContent = allContent.filter((c) => c.status === 'failed');
    const genErrors = failedContent.filter((c) => c.mediaUrls.length === 0);
    const postErrors = failedContent.filter((c) => c.mediaUrls.length > 0);

    // Upcoming scheduled content (next 4)
    const now = new Date();
    const scheduled = allContent
      .filter((c) => c.status === 'scheduled' && c.scheduledAt && c.scheduledAt > now)
      .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime())
      .slice(0, 4);

    const clientMap = new Map(clients.map((c) => [c.id, c]));

    const upcomingContent: ContentSummary[] = scheduled.map((c) => ({
      id: c.id,
      clientId: c.clientId,
      clientName: clientMap.get(c.clientId)?.businessName ?? 'Unknown',
      contentType: c.contentType,
      platform: c.platforms[0] ?? '',
      scheduledAt: c.scheduledAt!.toISOString(),
      mediaUrl: c.mediaUrls[0] ?? null,
    }));

    // Issues count for determining "issues" clients
    const clientsWithIssues = new Set([
      ...failedContent.map((c) => c.clientId),
      ...expiredTokens.map((s) => s.clientId),
    ]);
    const issueCount = clientsWithIssues.size;

    // Recent issues (last 3)
    const recentIssues: IssueItem[] = [
      ...expiredTokens.map((s) => ({
        id: `social-${s.id}`,
        type: 'token_expired' as const,
        severity: 'red' as const,
        clientId: s.clientId,
        clientName: clientMap.get(s.clientId)?.businessName ?? 'Unknown',
        description: `${s.platform} token ${s.status}`,
        timestamp: s.updatedAt.toISOString(),
        entityType: 'social_account' as const,
        entityId: s.id,
      })),
      ...postErrors.map((c) => ({
        id: `content-${c.id}`,
        type: 'failed_post' as const,
        severity: 'amber' as const,
        clientId: c.clientId,
        clientName: clientMap.get(c.clientId)?.businessName ?? 'Unknown',
        description: `${c.contentType} failed to schedule on ${c.platforms.join(', ')}`,
        timestamp: c.updatedAt.toISOString(),
        entityType: 'content_item' as const,
        entityId: c.id,
      })),
      ...genErrors.map((c) => ({
        id: `content-${c.id}`,
        type: 'gen_error' as const,
        severity: 'purple' as const,
        clientId: c.clientId,
        clientName: clientMap.get(c.clientId)?.businessName ?? 'Unknown',
        description: `${c.contentType} generation failed`,
        timestamp: c.updatedAt.toISOString(),
        entityType: 'content_item' as const,
        entityId: c.id,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3);

    // System health
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const postsThisWeek = allContent.filter(
      (c) => c.status === 'posted' && c.postedAt && c.postedAt > weekAgo,
    ).length;

    const stats: FleetStats = {
      total: clients.length,
      active,
      issues: issueCount,
      onboarding,
      paused,
      health: {
        contentPipeline: {
          status: failedContent.length > 5 ? 'red' : failedContent.length > 0 ? 'amber' : 'green',
          detail: `${postsThisWeek} posts this week`,
        },
        socialConnections: {
          status: expiredTokens.length > 0 ? 'amber' : 'green',
          detail: `${connectedCount}/${allSocials.length} connected`,
        },
        tokenStatus: {
          status: expiredTokens.length > 2 ? 'red' : expiredTokens.length > 0 ? 'amber' : 'green',
          detail: expiredTokens.length > 0 ? `${expiredTokens.length} expired/disconnected` : 'All valid',
        },
        contentGeneration: {
          status: genErrors.length > 3 ? 'red' : genErrors.length > 0 ? 'amber' : 'green',
          detail: genErrors.length > 0 ? `${genErrors.length} failures` : '0 failures',
        },
      },
      upcomingContent,
      recentIssues,
    };

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch fleet stats', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Verify route returns data**

```bash
cd hum-dashboard && DASHBOARD_PASSWORD=test pnpm dev
```

```bash
curl -b 'hum-auth=authenticated' http://localhost:3100/api/fleet/stats
```

Expected: JSON response with fleet stats (empty data is fine — no seed data yet).

- [ ] **Step 3: Commit**

```bash
git add hum-dashboard/src/app/api/fleet/
git commit -m "feat(dashboard): add fleet stats API route"
```

---

## Task 6: Clients API Routes

**Files:**
- Create: `hum-dashboard/src/app/api/clients/route.ts`
- Create: `hum-dashboard/src/app/api/clients/[id]/route.ts`

- [ ] **Step 1: Create clients list route**

`src/app/api/clients/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientRepo, socialAccountRepo, contentItemRepo } from 'hum-core';
import type { ClientListItem } from '@/types';

export async function GET() {
  try {
    const clients = await clientRepo.list(db);
    const items: ClientListItem[] = await Promise.all(
      clients.map(async (client) => {
        const socials = await socialAccountRepo.listByClientId(db, client.id);
        const content = await contentItemRepo.list(db, {
          clientId: client.id,
          status: 'scheduled',
        });
        return {
          id: client.id,
          businessName: client.businessName,
          email: client.email,
          address: client.address,
          planTier: client.planTier,
          status: client.status,
          platforms: socials.map((s) => ({ platform: s.platform, status: s.status })),
          scheduledCount: content.length,
        };
      }),
    );
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch clients', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Create client detail/update route**

`src/app/api/clients/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientRepo, brandProfileRepo, socialAccountRepo, contentItemRepo } from 'hum-core';
import type { ClientDetail } from '@/types';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await clientRepo.getById(db, id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const [brandProfile, socialAccounts, recentContent] = await Promise.all([
      brandProfileRepo.getByClientId(db, id),
      socialAccountRepo.listByClientId(db, id),
      contentItemRepo.list(db, { clientId: id }),
    ]);

    // Sort content by scheduledAt descending and take first 5
    const sorted = recentContent
      .sort((a, b) => (b.scheduledAt?.getTime() ?? 0) - (a.scheduledAt?.getTime() ?? 0))
      .slice(0, 5);

    const detail: ClientDetail = {
      client,
      brandProfile: brandProfile ?? null,
      socialAccounts,
      recentContent: sorted,
      onboarding: null, // Stubbed until onboarding schema lands
    };

    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch client', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Only allow status updates for MVP
    if (body.status && ['active', 'paused'].includes(body.status)) {
      const updated = await clientRepo.update(db, id, { status: body.status });
      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: 'Invalid update', code: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update client', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add hum-dashboard/src/app/api/clients/
git commit -m "feat(dashboard): add clients list and detail API routes"
```

---

## Task 7: Content & Issues API Routes

**Files:**
- Create: `hum-dashboard/src/app/api/content/route.ts`
- Create: `hum-dashboard/src/app/api/content/[id]/route.ts`
- Create: `hum-dashboard/src/app/api/issues/route.ts`
- Create: `hum-dashboard/src/app/api/issues/[id]/retry/route.ts`
- Create: `hum-dashboard/src/app/api/issues/[id]/dismiss/route.ts`
- Create: `hum-dashboard/src/app/api/media/[...path]/route.ts`

- [ ] **Step 1: Create content list route**

`src/app/api/content/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contentItemRepo, clientRepo } from 'hum-core';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get('clientId') ?? undefined;
    const status = searchParams.get('status') ?? 'scheduled';
    const platform = searchParams.get('platform');
    const range = searchParams.get('range') ?? '7d';

    let items = await contentItemRepo.list(db, { clientId, status });

    // Filter by platform client-side (repo doesn't support platform filter)
    if (platform) {
      items = items.filter((item) => item.platforms.includes(platform));
    }

    // Filter by date range
    const now = new Date();
    const rangeMs =
      range === '24h' ? 24 * 60 * 60 * 1000
      : range === '30d' ? 30 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() + rangeMs);

    items = items.filter(
      (item) => item.scheduledAt && item.scheduledAt >= now && item.scheduledAt <= cutoff,
    );

    // Sort by scheduled time
    items.sort((a, b) => (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0));

    // Enrich with client names
    const clientMap = new Map(
      (await clientRepo.list(db)).map((c) => [c.id, c.businessName]),
    );

    const enriched = items.map((item) => ({
      ...item,
      clientName: clientMap.get(item.clientId) ?? 'Unknown',
      scheduledAt: item.scheduledAt?.toISOString() ?? null,
      postedAt: item.postedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch content', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Create content update/delete route**

`src/app/api/content/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contentItemRepo } from 'hum-core';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.status === 'draft') {
      const updated = await contentItemRepo.update(db, id, { status: 'draft' });
      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: 'Invalid update', code: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update content', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await contentItemRepo.remove(db, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete content', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Create issues route**

`src/app/api/issues/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientRepo, contentItemRepo, socialAccountRepo } from 'hum-core';
import type { IssueItem } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const countOnly = request.nextUrl.searchParams.get('countOnly') === 'true';
    const filterType = request.nextUrl.searchParams.get('type');

    const clients = await clientRepo.list(db);
    const clientMap = new Map(clients.map((c) => [c.id, c.businessName]));

    // Failed content items
    const failedContent = await contentItemRepo.list(db, { status: 'failed' });

    // Expired/disconnected social accounts
    const allSocials = (
      await Promise.all(clients.map((c) => socialAccountRepo.listByClientId(db, c.id)))
    ).flat();
    const brokenSocials = allSocials.filter(
      (s) => s.status === 'expired' || s.status === 'disconnected',
    );

    if (countOnly) {
      return NextResponse.json({ count: failedContent.length + brokenSocials.length });
    }

    const issues: IssueItem[] = [];

    // Token issues
    if (!filterType || filterType === 'token_expired') {
      for (const s of brokenSocials) {
        issues.push({
          id: `social-${s.id}`,
          type: 'token_expired',
          severity: 'red',
          clientId: s.clientId,
          clientName: clientMap.get(s.clientId) ?? 'Unknown',
          description: `${s.platform} access token ${s.status}`,
          timestamp: s.updatedAt.toISOString(),
          entityType: 'social_account',
          entityId: s.id,
        });
      }
    }

    for (const c of failedContent) {
      const isGenError = c.mediaUrls.length === 0;
      const type = isGenError ? 'gen_error' : 'failed_post';

      if (filterType && filterType !== type) continue;

      issues.push({
        id: `content-${c.id}`,
        type,
        severity: isGenError ? 'purple' : 'amber',
        clientId: c.clientId,
        clientName: clientMap.get(c.clientId) ?? 'Unknown',
        description: isGenError
          ? `${c.contentType} generation failed`
          : `${c.contentType} failed to schedule on ${c.platforms.join(', ')}`,
        timestamp: c.updatedAt.toISOString(),
        entityType: 'content_item',
        entityId: c.id,
      });
    }

    issues.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(issues);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch issues', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Create retry route**

`src/app/api/issues/[id]/retry/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contentItemRepo } from 'hum-core';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // id format is "content-{uuid}" — extract the entity id
    const entityId = id.replace(/^content-/, '');
    const updated = await contentItemRepo.update(db, entityId, { status: 'draft' });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retry', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 5: Create dismiss route**

For MVP, dismiss is in-memory (we'll track dismissed IDs in a Set until the dismissed_issues table is added to hum-core). This is a pragmatic shortcut.

`src/app/api/issues/[id]/dismiss/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';

// MVP: in-memory dismissed set. Resets on server restart.
// TODO: Replace with dismissed_issues table in hum-core.
const dismissed = new Set<string>();

export function isDismissed(id: string): boolean {
  return dismissed.has(id);
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  dismissed.add(id);
  return NextResponse.json({ ok: true });
}
```

Note: Update the issues route to filter dismissed items. Add this import and filter to `src/app/api/issues/route.ts` after the issues array is built:
```typescript
// At top of issues/route.ts:
import { isDismissed } from './[id]/dismiss/route';

// Before the sort, add:
const filtered = issues.filter((i) => !isDismissed(i.id));
// Then sort and return `filtered` instead of `issues`
```

- [ ] **Step 6: Create media proxy route**

`src/app/api/media/[...path]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const MEDIA_BASE = process.env.MEDIA_STORAGE_PATH || './media';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: segments } = await params;
    const filePath = join(MEDIA_BASE, ...segments);

    // Prevent directory traversal
    const resolved = join(process.cwd(), filePath);
    const base = join(process.cwd(), MEDIA_BASE);
    if (!resolved.startsWith(base)) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
    }

    const buffer = await readFile(resolved);
    const ext = '.' + segments[segments.length - 1].split('.').pop()?.toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found', code: 'NOT_FOUND' }, { status: 404 });
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add hum-dashboard/src/app/api/content/ hum-dashboard/src/app/api/issues/ hum-dashboard/src/app/api/media/
git commit -m "feat(dashboard): add content, issues, and media API routes"
```

---

## Task 8: React Query Hooks & API Client

**Files:**
- Create: `hum-dashboard/src/lib/api.ts`
- Create: `hum-dashboard/src/lib/queries.ts`

- [ ] **Step 1: Create typed API client**

`src/lib/api.ts`:
```typescript
import type {
  FleetStats,
  ClientListItem,
  ClientDetail,
  IssueItem,
  ApiError,
} from '@/types';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ error: 'Request failed', code: 'UNKNOWN' }));
    throw new Error(err.error);
  }
  return res.json();
}

export const api = {
  fleet: {
    stats: () => fetchJson<FleetStats>('/api/fleet/stats'),
  },
  clients: {
    list: () => fetchJson<ClientListItem[]>('/api/clients'),
    get: (id: string) => fetchJson<ClientDetail>(`/api/clients/${id}`),
    update: (id: string, data: { status: string }) =>
      fetchJson<unknown>(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },
  content: {
    list: (params?: { clientId?: string; platform?: string; range?: string; status?: string }) => {
      const sp = new URLSearchParams();
      if (params?.clientId) sp.set('clientId', params.clientId);
      if (params?.platform) sp.set('platform', params.platform);
      if (params?.range) sp.set('range', params.range);
      if (params?.status) sp.set('status', params.status);
      return fetchJson<Array<Record<string, unknown>>>(`/api/content?${sp.toString()}`);
    },
    pause: (id: string) =>
      fetchJson<unknown>(`/api/content/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      }),
    remove: (id: string) =>
      fetchJson<unknown>(`/api/content/${id}`, { method: 'DELETE' }),
  },
  issues: {
    list: (type?: string) => {
      const sp = type ? `?type=${type}` : '';
      return fetchJson<IssueItem[]>(`/api/issues${sp}`);
    },
    count: () => fetchJson<{ count: number }>('/api/issues?countOnly=true'),
    retry: (id: string) =>
      fetchJson<unknown>(`/api/issues/${id}/retry`, { method: 'POST' }),
    dismiss: (id: string) =>
      fetchJson<unknown>(`/api/issues/${id}/dismiss`, { method: 'POST' }),
  },
};
```

- [ ] **Step 2: Create React Query hooks**

`src/lib/queries.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export function useFleetStats() {
  return useQuery({
    queryKey: ['fleet-stats'],
    queryFn: api.fleet.stats,
  });
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: api.clients.list,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => api.clients.get(id),
    enabled: !!id,
  });
}

export function usePauseClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.clients.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['fleet-stats'] });
    },
  });
}

export function useContent(params?: {
  clientId?: string;
  platform?: string;
  range?: string;
}) {
  return useQuery({
    queryKey: ['content', params],
    queryFn: () => api.content.list(params),
  });
}

export function usePauseContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.content.pause(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content'] });
      qc.invalidateQueries({ queryKey: ['fleet-stats'] });
    },
  });
}

export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.content.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content'] });
      qc.invalidateQueries({ queryKey: ['fleet-stats'] });
    },
  });
}

export function useIssues(type?: string) {
  return useQuery({
    queryKey: ['issues', type],
    queryFn: () => api.issues.list(type),
  });
}

export function useRetryIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.issues.retry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issues'] });
      qc.invalidateQueries({ queryKey: ['fleet-stats'] });
      qc.invalidateQueries({ queryKey: ['issue-count'] });
    },
  });
}

export function useDismissIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.issues.dismiss(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['issues'] });
      qc.invalidateQueries({ queryKey: ['fleet-stats'] });
      qc.invalidateQueries({ queryKey: ['issue-count'] });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add hum-dashboard/src/lib/api.ts hum-dashboard/src/lib/queries.ts
git commit -m "feat(dashboard): add typed API client and React Query hooks"
```

---

## Task 9: Fleet Overview Page

**Files:**
- Create: `hum-dashboard/src/components/fleet-stats.tsx`
- Create: `hum-dashboard/src/components/system-health.tsx`
- Modify: `hum-dashboard/src/app/page.tsx`

- [ ] **Step 1: Create fleet stats component**

`src/components/fleet-stats.tsx`:
```tsx
'use client';

import type { FleetStats } from '@/types';

const statConfig = [
  { key: 'active', label: 'Active', color: 'text-green-400' },
  { key: 'issues', label: 'Issues', color: 'text-amber-400' },
  { key: 'onboarding', label: 'Onboarding', color: 'text-blue-400' },
  { key: 'paused', label: 'Paused', color: 'text-gray-400' },
] as const;

export function FleetStatsBar({ stats }: { stats: FleetStats }) {
  return (
    <div className="grid grid-cols-4 gap-px bg-gray-800 rounded-lg overflow-hidden">
      {statConfig.map(({ key, label, color }) => (
        <div key={key} className="bg-gray-900 p-5 text-center">
          <div className={`text-3xl font-bold ${color}`}>{stats[key]}</div>
          <div className="text-xs text-gray-500 uppercase mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create system health component**

`src/components/system-health.tsx`:
```tsx
'use client';

import type { FleetStats } from '@/types';

const dotColor = {
  green: 'bg-green-400',
  amber: 'bg-amber-400',
  red: 'bg-red-400',
};

const labels: Record<string, string> = {
  contentPipeline: 'Content Pipeline',
  socialConnections: 'Social Connections',
  tokenStatus: 'Token Status',
  contentGeneration: 'Content Generation',
};

export function SystemHealth({ health }: { health: FleetStats['health'] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        System Health
      </h3>
      {Object.entries(health).map(([key, { status, detail }]) => (
        <div key={key} className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${dotColor[status]}`} />
          <span className="text-sm text-gray-300">{labels[key]}</span>
          <span className="text-xs text-gray-500 ml-auto">{detail}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Build the Fleet Overview page**

Replace `src/app/page.tsx`:
```tsx
'use client';

import { useFleetStats } from '@/lib/queries';
import { FleetStatsBar } from '@/components/fleet-stats';
import { SystemHealth } from '@/components/system-health';
import Link from 'next/link';

const severityBorder = {
  red: 'border-l-red-500',
  amber: 'border-l-amber-500',
  purple: 'border-l-purple-500',
};

export default function FleetOverview() {
  const { data: stats, isLoading, isError } = useFleetStats();

  if (isLoading) {
    return <div className="text-gray-500 p-8">Loading fleet data...</div>;
  }
  if (isError || !stats) {
    return <div className="text-red-400 p-8">Failed to load fleet stats</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-xl font-bold">Fleet Overview</h1>

      <FleetStatsBar stats={stats} />

      <div className="grid grid-cols-2 gap-4">
        {/* System Health */}
        <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
          <SystemHealth health={stats.health} />
        </div>

        {/* Recent Issues */}
        <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Recent Issues
            </h3>
            <Link href="/issues" className="text-xs text-blue-400 hover:underline">
              View all →
            </Link>
          </div>
          {stats.recentIssues.length === 0 ? (
            <p className="text-sm text-gray-500">No issues</p>
          ) : (
            <div className="space-y-2">
              {stats.recentIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`bg-gray-800/50 rounded-md p-3 border-l-[3px] ${severityBorder[issue.severity]}`}
                >
                  <div className="text-sm text-gray-300">
                    {issue.clientName} — {issue.description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(issue.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Content */}
      <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Upcoming Content (next 24h)
          </h3>
          <Link href="/content" className="text-xs text-blue-400 hover:underline">
            View all →
          </Link>
        </div>
        {stats.upcomingContent.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming content</p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {stats.upcomingContent.map((content) => (
              <div key={content.id} className="bg-gray-800/50 rounded-md p-3">
                <div className="bg-gray-700 h-14 rounded mb-2 flex items-center justify-center text-gray-500 text-xs">
                  {content.contentType}
                </div>
                <div className="text-xs text-gray-300">{content.clientName}</div>
                <div className="text-xs text-gray-500">
                  {content.platform} · {new Date(content.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify page renders**

```bash
cd hum-dashboard && DASHBOARD_PASSWORD=test pnpm dev
```

Expected: Fleet Overview renders with empty data (zeros everywhere). No errors.

- [ ] **Step 5: Commit**

```bash
git add hum-dashboard/src/components/fleet-stats.tsx hum-dashboard/src/components/system-health.tsx hum-dashboard/src/app/page.tsx
git commit -m "feat(dashboard): build Fleet Overview page with stats and health"
```

---

## Task 10: Clients List Page

**Files:**
- Create: `hum-dashboard/src/components/client-row.tsx`
- Create: `hum-dashboard/src/app/clients/page.tsx`

- [ ] **Step 1: Create client row component**

`src/components/client-row.tsx`:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { StatusBadge } from './status-badge';
import type { ClientListItem } from '@/types';
import { cn } from '@/lib/utils';

const platformColors: Record<string, string> = {
  instagram: 'text-pink-400',
  facebook: 'text-blue-400',
  tiktok: 'text-gray-300',
  google_business: 'text-blue-300',
};

const platformLabels: Record<string, string> = {
  instagram: 'IG',
  facebook: 'FB',
  tiktok: 'TT',
  google_business: 'GB',
};

export function ClientRow({ client }: { client: ClientListItem }) {
  const router = useRouter();
  const isPaused = client.status === 'paused';

  return (
    <div
      onClick={() => router.push(`/clients/${client.id}`)}
      className={cn(
        'grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center px-5 py-3.5 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/50 transition-colors',
        isPaused && 'opacity-50',
      )}
    >
      <div>
        <div className="text-sm font-medium text-gray-200">{client.businessName}</div>
        <div className="text-xs text-gray-500">
          {client.address ? `${client.address} · ` : ''}
          {client.email}
        </div>
      </div>
      <div className="text-sm text-gray-400 capitalize">{client.planTier}</div>
      <div className="flex gap-1.5">
        {client.platforms.map((p) => (
          <span
            key={p.platform}
            className={cn(
              'text-xs',
              p.status === 'connected'
                ? platformColors[p.platform]
                : 'text-red-400 line-through',
            )}
          >
            {platformLabels[p.platform] ?? p.platform}
          </span>
        ))}
        {client.platforms.length === 0 && (
          <span className="text-xs text-gray-600">—</span>
        )}
      </div>
      <div className="text-sm text-gray-400">
        {client.scheduledCount > 0 ? `${client.scheduledCount} scheduled` : '—'}
      </div>
      <StatusBadge status={client.status} />
    </div>
  );
}
```

- [ ] **Step 2: Create clients list page**

`src/app/clients/page.tsx`:
```tsx
'use client';

import { useState, useMemo } from 'react';
import { useClients } from '@/lib/queries';
import { ClientRow } from '@/components/client-row';
import { cn } from '@/lib/utils';

const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active', color: 'text-green-400' },
  { key: 'issues', label: 'Issues', color: 'text-amber-400' },
  { key: 'onboarding', label: 'Onboarding', color: 'text-blue-400' },
  { key: 'paused', label: 'Paused', color: 'text-gray-400' },
];

export default function ClientsPage() {
  const { data: clients, isLoading, isError } = useClients();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    if (!clients) return [];
    let result = clients;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.businessName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }
    return result;
  }, [clients, search, statusFilter]);

  const counts = useMemo(() => {
    if (!clients) return {};
    return {
      all: clients.length,
      active: clients.filter((c) => c.status === 'active').length,
      onboarding: clients.filter((c) => c.status === 'onboarding').length,
      paused: clients.filter((c) => c.status === 'paused').length,
    };
  }, [clients]);

  if (isLoading) return <div className="text-gray-500 p-8">Loading clients...</div>;
  if (isError) return <div className="text-red-400 p-8">Failed to load clients</div>;

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-bold mb-6">Clients</h1>

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        {/* Search + filters */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-800">
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-1">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  statusFilter === f.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600',
                )}
              >
                {f.label} {counts[f.key as keyof typeof counts] != null && `(${counts[f.key as keyof typeof counts]})`}
              </button>
            ))}
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-2.5 border-b border-gray-800">
          {['Client', 'Plan', 'Platforms', 'Content', 'Status'].map((h) => (
            <span key={h} className="text-xs text-gray-500 uppercase tracking-wide">
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No clients found</div>
        ) : (
          filtered.map((client) => <ClientRow key={client.id} client={client} />)
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add hum-dashboard/src/components/client-row.tsx hum-dashboard/src/app/clients/page.tsx
git commit -m "feat(dashboard): build Clients list page with search and filters"
```

---

## Task 11: Client Detail Page

**Files:**
- Create: `hum-dashboard/src/components/client-header.tsx`
- Create: `hum-dashboard/src/components/brand-profile-panel.tsx`
- Create: `hum-dashboard/src/components/social-accounts-panel.tsx`
- Create: `hum-dashboard/src/components/onboarding-progress.tsx`
- Create: `hum-dashboard/src/components/recent-content.tsx`
- Create: `hum-dashboard/src/app/clients/[id]/page.tsx`

- [ ] **Step 1: Create client header**

`src/components/client-header.tsx`:
```tsx
'use client';

import { StatusBadge } from './status-badge';
import { usePauseClient } from '@/lib/queries';
import type { Client } from 'hum-core';

export function ClientHeader({ client }: { client: Client }) {
  const pauseMutation = usePauseClient();
  const isPaused = client.status === 'paused';

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{client.businessName}</h1>
          <StatusBadge status={client.status} />
          <span className="bg-blue-400/10 text-blue-400 text-xs px-2.5 py-0.5 rounded-full capitalize">
            {client.planTier} Plan
          </span>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {client.email}
          {client.address ? ` · ${client.address}` : ''}
          {client.phone ? ` · ${client.phone}` : ''}
        </div>
      </div>
      <button
        onClick={() =>
          pauseMutation.mutate({
            id: client.id,
            status: isPaused ? 'active' : 'paused',
          })
        }
        disabled={pauseMutation.isPending}
        className="bg-gray-800 border border-gray-700 text-amber-400 hover:border-gray-600 px-4 py-1.5 rounded text-sm disabled:opacity-50"
      >
        {isPaused ? 'Resume Client' : 'Pause Client'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create brand profile panel**

`src/components/brand-profile-panel.tsx`:
```tsx
import type { BrandProfile } from 'hum-core';

export function BrandProfilePanel({ profile }: { profile: BrandProfile | null }) {
  if (!profile) {
    return <p className="text-sm text-gray-500">No brand profile generated yet</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Brand Profile
      </h3>
      {profile.brandVoiceGuide && (
        <Field label="Voice" value={profile.brandVoiceGuide} />
      )}
      {profile.keySellingPoints.length > 0 && (
        <Field label="Key Selling Points" value={profile.keySellingPoints.join(', ')} />
      )}
      {profile.contentThemes.length > 0 && (
        <div>
          <Label>Content Themes</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {profile.contentThemes.map((theme) => (
              <span
                key={theme}
                className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}
      {profile.hashtagStrategy.length > 0 && (
        <div>
          <Label>Hashtags</Label>
          <div className="text-sm text-blue-400 mt-1">
            {profile.hashtagStrategy.map((h) => `#${h}`).join(' ')}
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-gray-500 uppercase">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="text-sm text-gray-300 mt-1">{value}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create social accounts panel**

`src/components/social-accounts-panel.tsx`:
```tsx
import type { SocialAccount } from 'hum-core';

const platformColors: Record<string, string> = {
  instagram: 'text-pink-400',
  facebook: 'text-blue-400',
  tiktok: 'text-gray-300',
  google_business: 'text-blue-300',
};

const statusDot: Record<string, string> = {
  connected: 'bg-green-400',
  disconnected: 'bg-gray-400',
  expired: 'bg-red-400',
};

export function SocialAccountsPanel({ accounts }: { accounts: SocialAccount[] }) {
  if (accounts.length === 0) {
    return <p className="text-sm text-gray-500">No platforms connected</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Connected Platforms
      </h3>
      {accounts.map((account) => (
        <div
          key={account.id}
          className="flex items-center gap-3 bg-gray-800/50 rounded-md p-3"
        >
          <div className={`w-2 h-2 rounded-full ${statusDot[account.status]}`} />
          <span className={`text-sm font-medium capitalize ${platformColors[account.platform]}`}>
            {account.platform.replace('_', ' ')}
          </span>
          <span className="text-sm text-gray-500">{account.platformAccountId}</span>
          <span className="text-xs text-gray-600 ml-auto capitalize">{account.status}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create onboarding progress component**

`src/components/onboarding-progress.tsx`:
```tsx
import type { OnboardingStatus } from '@/types';

const stepStatusStyle = {
  complete: { dot: 'bg-green-400 text-black', line: 'bg-green-400', text: 'text-gray-300' },
  processing: { dot: 'bg-blue-400 text-white', line: 'bg-blue-400', text: 'text-blue-400 font-medium' },
  pending: { dot: 'bg-gray-600 text-gray-400', line: 'bg-gray-700', text: 'text-gray-500' },
  failed: { dot: 'bg-red-400 text-white', line: 'bg-red-400', text: 'text-red-400' },
};

const stepIcon = {
  complete: '✓',
  processing: '⟳',
  pending: '·',
  failed: '✗',
};

export function OnboardingProgress({ onboarding }: { onboarding: OnboardingStatus | null }) {
  if (!onboarding) {
    return (
      <div className="text-sm text-gray-500">Onboarding data unavailable</div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Onboarding Progress
      </h3>
      <div className="space-y-1">
        {onboarding.steps.map((step, i) => {
          const style = stepStatusStyle[step.status];
          return (
            <div key={step.name}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${style.dot}`}
                >
                  {stepIcon[step.status]}
                </div>
                <span className={`text-sm ${style.text}`}>{step.name}</span>
              </div>
              {i < onboarding.steps.length - 1 && (
                <div className={`w-px h-2 ml-2.5 ${style.line}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create recent content component**

`src/components/recent-content.tsx`:
```tsx
import type { ContentItem } from 'hum-core';
import { StatusBadge } from './status-badge';
import Link from 'next/link';

export function RecentContent({ items }: { items: ContentItem[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Recent Content
        </h3>
        <Link href="/content" className="text-xs text-blue-400 hover:underline">
          View all →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No content yet</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-gray-800/50 rounded-md p-2.5"
            >
              <div className="w-10 h-10 bg-gray-700 rounded flex-shrink-0 flex items-center justify-center text-xs text-gray-500">
                {item.contentType.slice(0, 4)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-300 truncate">
                  {item.caption ?? item.contentType}
                </div>
                <div className="text-xs text-gray-500">
                  {item.platforms[0]} · {item.scheduledAt ? new Date(item.scheduledAt).toLocaleDateString() : '—'}
                </div>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create client detail page**

`src/app/clients/[id]/page.tsx`:
```tsx
'use client';

import { use } from 'react';
import { useClient } from '@/lib/queries';
import { ClientHeader } from '@/components/client-header';
import { BrandProfilePanel } from '@/components/brand-profile-panel';
import { SocialAccountsPanel } from '@/components/social-accounts-panel';
import { OnboardingProgress } from '@/components/onboarding-progress';
import { RecentContent } from '@/components/recent-content';

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError } = useClient(id);

  if (isLoading) return <div className="text-gray-500 p-8">Loading client...</div>;
  if (isError || !data) return <div className="text-red-400 p-8">Failed to load client</div>;

  return (
    <div className="max-w-5xl space-y-6">
      <ClientHeader client={data.client} />

      <div className="grid grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-5">
            <BrandProfilePanel profile={data.brandProfile} />
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-5">
            <SocialAccountsPanel accounts={data.socialAccounts} />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {data.client.status === 'onboarding' && (
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-5">
              <OnboardingProgress onboarding={data.onboarding} />
            </div>
          )}
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-5">
            <RecentContent items={data.recentContent} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add hum-dashboard/src/components/client-header.tsx hum-dashboard/src/components/brand-profile-panel.tsx hum-dashboard/src/components/social-accounts-panel.tsx hum-dashboard/src/components/onboarding-progress.tsx hum-dashboard/src/components/recent-content.tsx hum-dashboard/src/app/clients/\[id\]/
git commit -m "feat(dashboard): build Client Detail page with brand, socials, and content"
```

---

## Task 12: Content Preview Page

**Files:**
- Create: `hum-dashboard/src/components/content-card.tsx`
- Create: `hum-dashboard/src/components/content-preview-modal.tsx`
- Create: `hum-dashboard/src/app/content/page.tsx`

- [ ] **Step 1: Create content card component**

`src/components/content-card.tsx`:
```tsx
'use client';

import { usePauseContent, useDeleteContent } from '@/lib/queries';

const platformColor: Record<string, string> = {
  instagram: 'bg-pink-500/10 text-pink-400',
  facebook: 'bg-blue-500/10 text-blue-400',
  tiktok: 'bg-gray-500/10 text-gray-300',
  google_business: 'bg-blue-400/10 text-blue-300',
};

type ContentCardProps = {
  item: Record<string, unknown>;
  onPreview: () => void;
};

export function ContentCard({ item, onPreview }: ContentCardProps) {
  const pauseMutation = usePauseContent();
  const deleteMutation = useDeleteContent();
  const id = item.id as string;

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 flex gap-4">
      <div
        className="w-20 h-20 bg-gray-700 rounded-md flex-shrink-0 flex items-center justify-center text-2xl cursor-pointer"
        onClick={onPreview}
      >
        {(item.mediaUrls as string[])?.length > 0 ? (
          <img
            src={`/api/media/${(item.mediaUrls as string[])[0]}`}
            alt=""
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <span className="text-gray-500 text-sm">{item.contentType as string}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-200">
            {item.clientName as string}
          </span>
          <span className="text-gray-600 text-xs">·</span>
          {((item.platforms as string[]) ?? []).map((p) => (
            <span
              key={p}
              className={`text-[10px] px-1.5 py-0.5 rounded ${platformColor[p] ?? 'bg-gray-500/10 text-gray-400'}`}
            >
              {p}
            </span>
          ))}
          <span className="bg-green-400/10 text-green-400 text-[10px] px-1.5 py-0.5 rounded">
            {item.contentType as string}
          </span>
          <span className="text-xs text-gray-500 ml-auto">
            {item.scheduledAt
              ? new Date(item.scheduledAt as string).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </span>
        </div>
        <div className="text-sm text-gray-400 truncate">{item.caption as string}</div>
        <div className="flex gap-1.5 mt-2.5">
          <button
            onClick={onPreview}
            className="bg-gray-800 border border-gray-700 text-gray-400 px-3 py-1 rounded text-xs hover:border-gray-600"
          >
            Preview
          </button>
          <button
            onClick={() => pauseMutation.mutate(id)}
            disabled={pauseMutation.isPending}
            className="bg-gray-800 border border-gray-700 text-amber-400 px-3 py-1 rounded text-xs hover:border-gray-600 disabled:opacity-50"
          >
            Pause
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this post?')) deleteMutation.mutate(id);
            }}
            disabled={deleteMutation.isPending}
            className="bg-gray-800 border border-gray-700 text-red-400 px-3 py-1 rounded text-xs hover:border-gray-600 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create content preview modal**

`src/components/content-preview-modal.tsx`:
```tsx
'use client';

type Props = {
  item: Record<string, unknown>;
  onClose: () => void;
};

export function ContentPreviewModal({ item, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-lg border border-gray-700 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media */}
        <div className="bg-gray-800 h-64 flex items-center justify-center">
          {(item.mediaUrls as string[])?.length > 0 ? (
            <img
              src={`/api/media/${(item.mediaUrls as string[])[0]}`}
              alt=""
              className="max-h-full object-contain"
            />
          ) : (
            <span className="text-gray-500">No media</span>
          )}
        </div>

        {/* Details */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-200">
              {item.clientName as string}
            </span>
            <span className="text-xs text-gray-500">
              {item.scheduledAt
                ? new Date(item.scheduledAt as string).toLocaleString()
                : '—'}
            </span>
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">
            {item.caption as string}
          </p>
          {(item.hashtags as string[])?.length > 0 && (
            <div className="text-sm text-blue-400">
              {(item.hashtags as string[]).map((h) => `#${h}`).join(' ')}
            </div>
          )}
          {item.cta && (
            <div className="text-sm text-amber-400">CTA: {item.cta as string}</div>
          )}
          <button
            onClick={onClose}
            className="w-full bg-gray-800 border border-gray-700 text-gray-400 px-4 py-2 rounded text-sm hover:border-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create content preview page**

`src/app/content/page.tsx`:
```tsx
'use client';

import { useState, useMemo } from 'react';
import { useContent, useClients } from '@/lib/queries';
import { ContentCard } from '@/components/content-card';
import { ContentPreviewModal } from '@/components/content-preview-modal';

export default function ContentPage() {
  const [clientId, setClientId] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');
  const [range, setRange] = useState('7d');
  const [previewItem, setPreviewItem] = useState<Record<string, unknown> | null>(null);

  const { data: clients } = useClients();
  const { data: content, isLoading, isError } = useContent({
    clientId: clientId || undefined,
    platform: platform || undefined,
    range,
  });

  // Group content by date
  const grouped = useMemo(() => {
    if (!content) return {};
    const groups: Record<string, typeof content> = {};
    for (const item of content) {
      const date = item.scheduledAt
        ? new Date(item.scheduledAt as string).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
        : 'Unscheduled';
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    }
    return groups;
  }, [content]);

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-bold mb-6">Content Preview</h1>

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        {/* Filters */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-800 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase">Client:</span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-sm text-gray-300 rounded px-2 py-1"
            >
              <option value="">All Clients</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase">Platform:</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-sm text-gray-300 rounded px-2 py-1"
            >
              <option value="">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="google_business">Google Business</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase">Range:</span>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-sm text-gray-300 rounded px-2 py-1"
            >
              <option value="24h">Next 24 hours</option>
              <option value="7d">Next 7 days</option>
              <option value="30d">Next 30 days</option>
            </select>
          </div>
          <span className="ml-auto text-sm text-gray-300 font-medium">
            {content?.length ?? 0} posts
          </span>
        </div>

        {/* Timeline */}
        <div className="p-4">
          {isLoading && <div className="text-gray-500 text-sm">Loading content...</div>}
          {isError && <div className="text-red-400 text-sm">Failed to load content</div>}
          {content && Object.keys(grouped).length === 0 && (
            <div className="text-gray-500 text-sm text-center py-8">No scheduled content</div>
          )}
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb-6">
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-3">
                {date}
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <ContentCard
                    key={item.id as string}
                    item={item}
                    onPreview={() => setPreviewItem(item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {previewItem && (
        <ContentPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add hum-dashboard/src/components/content-card.tsx hum-dashboard/src/components/content-preview-modal.tsx hum-dashboard/src/app/content/
git commit -m "feat(dashboard): build Content Preview page with filters, cards, and modal"
```

---

## Task 13: Issues Page

**Files:**
- Create: `hum-dashboard/src/components/issue-card.tsx`
- Create: `hum-dashboard/src/app/issues/page.tsx`

- [ ] **Step 1: Create issue card component**

`src/components/issue-card.tsx`:
```tsx
'use client';

import { useRetryIssue, useDismissIssue } from '@/lib/queries';
import type { IssueItem } from '@/types';
import Link from 'next/link';

const severityBorder = {
  red: 'border-l-red-500',
  amber: 'border-l-amber-500',
  purple: 'border-l-purple-500',
};

const typeBadge = {
  token_expired: { bg: 'bg-red-500', text: 'Token Expired' },
  failed_post: { bg: 'bg-amber-500', text: 'Failed Post' },
  gen_error: { bg: 'bg-purple-500', text: 'Gen Error' },
};

export function IssueCard({ issue }: { issue: IssueItem }) {
  const retryMutation = useRetryIssue();
  const dismissMutation = useDismissIssue();
  const badge = typeBadge[issue.type];

  return (
    <div className={`bg-gray-800/50 rounded-lg p-4 border-l-4 ${severityBorder[issue.severity]}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`${badge.bg} text-white text-[10px] px-2 py-0.5 rounded font-semibold uppercase`}
            >
              {badge.text}
            </span>
            <Link
              href={`/clients/${issue.clientId}`}
              className="text-sm font-medium text-gray-200 hover:underline"
            >
              {issue.clientName}
            </Link>
          </div>
          <div className="text-sm text-gray-400">{issue.description}</div>
          <div className="text-xs text-gray-600 mt-1.5">
            {new Date(issue.timestamp).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0 ml-4">
          {issue.entityType === 'content_item' && (
            <button
              onClick={() => retryMutation.mutate(issue.id)}
              disabled={retryMutation.isPending}
              className="bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
            >
              Retry
            </button>
          )}
          {issue.type === 'token_expired' && (
            <button className="bg-gray-800 border border-gray-600 text-gray-300 px-3 py-1.5 rounded text-xs">
              Reconnect
            </button>
          )}
          {issue.type === 'gen_error' && (
            <button
              onClick={() => dismissMutation.mutate(issue.id)}
              disabled={dismissMutation.isPending}
              className="bg-gray-800 border border-gray-600 text-gray-400 px-3 py-1.5 rounded text-xs disabled:opacity-50"
            >
              Skip Post
            </button>
          )}
          <Link
            href={`/clients/${issue.clientId}`}
            className="bg-gray-800 border border-gray-600 text-gray-400 px-3 py-1.5 rounded text-xs hover:border-gray-500"
          >
            View Client
          </Link>
          <button
            onClick={() => dismissMutation.mutate(issue.id)}
            disabled={dismissMutation.isPending}
            className="bg-gray-800 border border-gray-700 text-gray-500 px-3 py-1.5 rounded text-xs disabled:opacity-50 hover:text-gray-400"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create issues page**

`src/app/issues/page.tsx`:
```tsx
'use client';

import { useState, useMemo } from 'react';
import { useIssues } from '@/lib/queries';
import { IssueCard } from '@/components/issue-card';
import { cn } from '@/lib/utils';

const filterTabs = [
  { key: undefined, label: 'All' },
  { key: 'failed_post', label: 'Failed Posts' },
  { key: 'token_expired', label: 'Expired Tokens' },
  { key: 'gen_error', label: 'Gen Errors' },
] as const;

export default function IssuesPage() {
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const { data: issues, isLoading, isError } = useIssues(filterType);

  // Get counts per type from unfiltered data
  const { data: allIssues } = useIssues();
  const counts = useMemo(() => {
    if (!allIssues) return {};
    return {
      failed_post: allIssues.filter((i) => i.type === 'failed_post').length,
      token_expired: allIssues.filter((i) => i.type === 'token_expired').length,
      gen_error: allIssues.filter((i) => i.type === 'gen_error').length,
    };
  }, [allIssues]);

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-bold mb-6">Issues</h1>

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        {/* Filter tabs */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-800">
          <div className="flex gap-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setFilterType(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  filterType === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600',
                )}
              >
                {tab.label}
                {tab.key && counts[tab.key as keyof typeof counts] != null
                  ? ` (${counts[tab.key as keyof typeof counts]})`
                  : allIssues
                    ? ` (${allIssues.length})`
                    : ''}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-600">Auto-refreshes every 30s</span>
        </div>

        {/* Issue list */}
        <div className="p-4 space-y-2.5">
          {isLoading && <div className="text-gray-500 text-sm">Loading issues...</div>}
          {isError && <div className="text-red-400 text-sm">Failed to load issues</div>}
          {issues && issues.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-8">
              No issues — everything is running smoothly
            </div>
          )}
          {issues?.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add hum-dashboard/src/components/issue-card.tsx hum-dashboard/src/app/issues/
git commit -m "feat(dashboard): build Issues page with filter tabs and action cards"
```

---

## Task 14: Seed Data Script

**Files:**
- Create: `hum-dashboard/scripts/seed.ts`

- [ ] **Step 1: Create seed script**

`scripts/seed.ts`:
```typescript
import { createDb, clientRepo, brandProfileRepo, socialAccountRepo, contentItemRepo } from 'hum-core';

const { db, migrate } = createDb();
migrate();

async function seed() {
  console.log('Seeding dashboard data...');

  // Clients
  const clients = await Promise.all([
    clientRepo.create(db, {
      businessName: "Ali's Kebabs",
      email: 'ali@aliskebabs.co.uk',
      address: '42 High Street, Bradford BD1',
      phone: '07700 900123',
      planTier: 'growth',
      status: 'active',
    }),
    clientRepo.create(db, {
      businessName: 'Dragon Palace',
      email: 'info@dragonpalace.com',
      address: '15 Leeds Road, Leeds LS1',
      planTier: 'premium',
      status: 'active',
    }),
    clientRepo.create(db, {
      businessName: "Tony's Pizza",
      email: 'tony@tonyspizza.uk',
      address: '8 Market Street, Manchester M1',
      planTier: 'starter',
      status: 'active',
    }),
    clientRepo.create(db, {
      businessName: 'Spice House',
      email: 'hello@spicehouse.co.uk',
      address: '23 Broad Street, Birmingham B1',
      planTier: 'growth',
      status: 'onboarding',
    }),
    clientRepo.create(db, {
      businessName: 'Noodle Bar 88',
      email: 'nb88@gmail.com',
      address: '77 Division Street, Sheffield S1',
      planTier: 'starter',
      status: 'paused',
    }),
  ]);

  // Brand profiles
  await Promise.all([
    brandProfileRepo.create(db, {
      clientId: clients[0].id,
      brandVoiceGuide: 'Warm, family-friendly, proud of fresh ingredients. Uses casual tone with food emojis.',
      keySellingPoints: ['Hand-ground spices', 'Family recipes', 'Fresh daily prep', 'Generous portions'],
      contentThemes: ['Fresh prep', 'Family legacy', 'Community love', 'Lunch deals'],
      hashtagStrategy: ['AliKebabs', 'BradfordFood', 'FreshKebabs', 'HalalFood', 'BradfordEats'],
      peakPostingTimes: { instagram: ['08:00', '12:00', '18:00'], facebook: ['08:30', '17:00'] },
      menuItems: [
        { name: 'Butter Chicken', description: 'Creamy tomato-based curry', category: 'Mains', price: 8.99 },
        { name: 'Lamb Wrap', description: 'Grilled lamb in fresh naan', category: 'Wraps', price: 6.99 },
      ],
    }),
    brandProfileRepo.create(db, {
      clientId: clients[1].id,
      brandVoiceGuide: 'Elegant, authentic Chinese. Formal but approachable.',
      keySellingPoints: ['Authentic Cantonese', 'Fresh seafood', 'Dim sum specialists'],
      contentThemes: ['Dim sum Sundays', 'Seafood specials', 'Chinese festivals'],
      hashtagStrategy: ['DragonPalace', 'LeedsFood', 'ChineseFood', 'DimSum'],
      peakPostingTimes: { instagram: ['11:00', '17:00'], facebook: ['10:00', '16:00'] },
      menuItems: [
        { name: 'Crispy Duck', description: 'Half aromatic crispy duck with pancakes', category: 'Signature', price: 14.99 },
      ],
    }),
    brandProfileRepo.create(db, {
      clientId: clients[2].id,
      brandVoiceGuide: 'Fun, young, pizza-obsessed. Heavy on slang and emojis.',
      keySellingPoints: ['Hand-tossed', 'Stone-baked', 'Loaded toppings'],
      contentThemes: ['Pizza pulls', 'Late night eats', 'Student deals'],
      hashtagStrategy: ['TonysPizza', 'ManchesterFood', 'PizzaLovers'],
      peakPostingTimes: { instagram: ['09:00', '20:00'] },
      menuItems: [
        { name: 'Margherita', description: 'Classic tomato and mozzarella', category: 'Classics', price: 7.99 },
      ],
    }),
  ]);

  // Social accounts
  await Promise.all([
    socialAccountRepo.create(db, { clientId: clients[0].id, platform: 'instagram', platformAccountId: '@aliskebabs_bradford', status: 'connected' }),
    socialAccountRepo.create(db, { clientId: clients[0].id, platform: 'facebook', platformAccountId: 'Ali\'s Kebabs Bradford', status: 'connected' }),
    socialAccountRepo.create(db, { clientId: clients[0].id, platform: 'google_business', platformAccountId: 'alis-kebabs', status: 'connected' }),
    socialAccountRepo.create(db, { clientId: clients[1].id, platform: 'instagram', platformAccountId: '@dragonpalace_leeds', status: 'expired' }),
    socialAccountRepo.create(db, { clientId: clients[1].id, platform: 'facebook', platformAccountId: 'Dragon Palace Leeds', status: 'connected' }),
    socialAccountRepo.create(db, { clientId: clients[2].id, platform: 'instagram', platformAccountId: '@tonyspizza_mcr', status: 'connected' }),
    socialAccountRepo.create(db, { clientId: clients[2].id, platform: 'facebook', platformAccountId: 'Tony\'s Pizza Manchester', status: 'connected' }),
    socialAccountRepo.create(db, { clientId: clients[4].id, platform: 'instagram', platformAccountId: '@noodlebar88', status: 'disconnected' }),
  ]);

  // Content items
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  await Promise.all([
    // Scheduled (upcoming)
    contentItemRepo.create(db, {
      clientId: clients[0].id, contentType: 'food_hero', status: 'scheduled',
      caption: '🔥 Our butter chicken is made fresh every morning with hand-ground spices and love. Order now for lunch! #ButterChicken #FreshFood #AliKebabs',
      hashtags: ['ButterChicken', 'FreshFood', 'AliKebabs'], mediaUrls: [], platforms: ['instagram'],
      scheduledAt: new Date(now + 2 * hour),
    }),
    contentItemRepo.create(db, {
      clientId: clients[1].id, contentType: 'deal_offer', status: 'scheduled',
      caption: '🐉 Lunch Special! Get any 2 mains + rice + prawn crackers for £12.99. Available 11:30-2pm.',
      hashtags: ['DragonPalace', 'LunchDeal'], mediaUrls: [], platforms: ['facebook'],
      scheduledAt: new Date(now + 3 * hour),
    }),
    contentItemRepo.create(db, {
      clientId: clients[2].id, contentType: 'food_hero', status: 'scheduled',
      caption: 'That stretch 🤤 Hand-tossed, stone-baked, loaded with mozzarella. Our Margherita is the one.',
      hashtags: ['TonysPizza', 'PizzaLovers'], mediaUrls: [], platforms: ['instagram'],
      scheduledAt: new Date(now + 5 * hour),
    }),
    contentItemRepo.create(db, {
      clientId: clients[0].id, contentType: 'google_post', status: 'scheduled',
      caption: 'Weekend special: Family biryani feast for just £22.99. Pre-order now for Saturday collection.',
      hashtags: [], mediaUrls: [], platforms: ['google_business'],
      scheduledAt: new Date(now + 24 * hour),
    }),

    // Posted (past) — create as draft, then update to posted with postedAt
    contentItemRepo.create(db, {
      clientId: clients[0].id, contentType: 'deal_offer', status: 'draft',
      caption: 'Friday deal — lamb wrap combo for £5.99!', hashtags: ['FridayDeal'],
      mediaUrls: [], platforms: ['facebook'],
      scheduledAt: new Date(now - 24 * hour),
    }).then((item) =>
      contentItemRepo.update(db, item.id, { status: 'posted', postedAt: new Date(now - 24 * hour) })
    ),

    // Failed (scheduling error — has media)
    contentItemRepo.create(db, {
      clientId: clients[2].id, contentType: 'food_hero', status: 'failed',
      caption: 'Pepperoni perfection 🍕', hashtags: ['TonysPizza'],
      mediaUrls: ['tonys/pepperoni.jpg'], platforms: ['instagram'],
      scheduledAt: new Date(now - 5 * hour),
    }),
    contentItemRepo.create(db, {
      clientId: clients[2].id, contentType: 'deal_offer', status: 'failed',
      caption: 'Student deal: any pizza + drink for £8.99', hashtags: ['StudentDeal'],
      mediaUrls: ['tonys/student-deal.jpg'], platforms: ['facebook'],
      scheduledAt: new Date(now - 5 * hour),
    }),

    // Failed (gen error — no media)
    contentItemRepo.create(db, {
      clientId: clients[0].id, contentType: 'food_hero', status: 'failed',
      caption: 'Butter chicken hero shot', hashtags: [],
      mediaUrls: [], platforms: ['instagram'],
      scheduledAt: new Date(now - 12 * hour),
    }),
  ]);

  console.log('Seed complete:');
  console.log(`  ${clients.length} clients`);
  console.log('  3 brand profiles');
  console.log('  8 social accounts (1 expired, 1 disconnected)');
  console.log('  8 content items (4 scheduled, 1 posted, 2 failed posts, 1 gen error)');
}

seed().catch(console.error);
```

- [ ] **Step 2: Run seed script**

```bash
cd hum-dashboard && pnpm seed
```

Expected: Output shows counts of seeded data. No errors.

- [ ] **Step 3: Verify dashboard with seeded data**

```bash
cd hum-dashboard && DASHBOARD_PASSWORD=test pnpm dev
```

Visit `http://localhost:3100`, login, verify:
- Fleet Overview shows correct status counts (3 active, 1 onboarding, 1 paused, 2 issues)
- Clients page lists all 5 clients
- Content page shows 4 scheduled posts
- Issues page shows 3 issues (1 expired token, 2 failed posts, 1 gen error)

Expected: All pages render with realistic data.

- [ ] **Step 4: Commit**

```bash
git add hum-dashboard/scripts/
git commit -m "feat(dashboard): add seed script with realistic test data"
```

---

## Task 15: Final Integration & Build Verification

**Files:**
- Modify: `hum-dashboard/src/app/api/issues/route.ts` (add dismiss filtering)

- [ ] **Step 1: Wire dismiss filtering into issues route**

Update `src/app/api/issues/route.ts` to import and use `isDismissed`:

Add at top of file:
```typescript
import { isDismissed } from './[id]/dismiss/route';
```

Before the `issues.sort(...)` line, add:
```typescript
const filtered = issues.filter((i) => !isDismissed(i.id));
```

Then sort and return `filtered` instead of `issues`.

- [ ] **Step 2: Full build check**

```bash
cd hum-dashboard && pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Run the production build**

```bash
cd hum-dashboard && DASHBOARD_PASSWORD=test pnpm start
```

Visit `http://localhost:3100` and verify all pages work.

- [ ] **Step 4: Final commit**

```bash
git add -A hum-dashboard/
git commit -m "feat(dashboard): wire dismiss filtering and verify full build"
```
