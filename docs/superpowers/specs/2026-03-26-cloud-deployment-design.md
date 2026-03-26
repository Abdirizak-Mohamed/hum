# Cloud Deployment Design — SST on AWS

**Date:** 2026-03-26
**Status:** Draft
**Approach:** Single SST monolith stack, RDS Postgres, Lambda compute, dev + prod stages

## Overview

Deploy the Hum monorepo to AWS using SST Ion. Three Lambda-based services go live (dashboard, content engine, onboarding). The client portal is planned for later and shares the same infra.

## Architecture

```
                    ┌──────────────────────────────────────────────────┐
                    │                   AWS (per stage)                │
                    │                                                  │
  Users ──────────► │  CloudFront ──► Lambda (Next.js Dashboard)       │
                    │                        │                         │
                    │                        │ reads/writes            │
                    │                        ▼                         │
                    │                 RDS PostgreSQL                   │
                    │                (db.t4g.micro)                    │
                    │                   ▲        ▲                     │
                    │                   │        │                     │
                    │   EventBridge ────┘        └──── API Gateway     │
                    │   (weekly cron)                  (async invoke)  │
                    │        │                              │          │
                    │        ▼                              ▼          │
                    │   Lambda: Content Engine    Lambda: Onboarding   │
                    │                                                  │
                    │   S3 Bucket ──► Media Storage                    │
                    │                                                  │
                    │   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐        │
                    │     Future: Client Portal (Next.js)              │
                    │   │   → same RDS, same S3, same VPC    │        │
                    │   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘        │
                    └──────────────────────────────────────────────────┘
```

## Components

### 1. VPC & Networking

- SST-managed VPC with public + private subnets across 2 AZs
- RDS in private subnets
- EC2 NAT instance (`nat: "ec2"`) instead of managed NAT gateway (~$3/mo vs ~$32/mo)
- Security groups:
  - RDS: inbound 5432 from Lambda SGs only
  - Lambda: outbound all (RDS, S3, external APIs)

### 2. RDS PostgreSQL

- Engine: PostgreSQL 15
- Instance: `db.t4g.micro` (2 vCPU, 1 GB RAM, free tier eligible year 1)
- Single AZ for both dev and prod (add Multi-AZ later when revenue justifies it)
- Direct connection from VPC Lambdas
- Separate database per stage: `hum_dev`, `hum_prod`
- Credentials managed by SST (Secrets Manager)

**Migration from SQLite:**
- Schema rewritten from `sqliteTable` to `pgTable` (Drizzle schemas are dialect-specific)
- `hum-core` connection module switches to Postgres entirely
- Local dev uses PGlite (embedded Postgres via WASM, zero setup, no Docker)
- Migrations: Drizzle Kit generates fresh Postgres migrations from the new schema

### 3. Next.js Dashboard (sst.aws.Nextjs)

- SST's `Nextjs` component handles: Lambda functions, CloudFront distribution, S3 static assets, cache behaviors
- Environment variables injected via SST `link`:
  - `DATABASE_URL` (Postgres connection string)
  - `MEDIA_BUCKET` (S3 bucket name)
  - API keys (from SST secrets)
- Custom domain: configurable per stage (e.g., `dashboard.humapp.com`, `dev-dashboard.humapp.com`)
- Auth: existing cookie-based login (no changes needed)

### 4. Content Engine (Lambda + EventBridge Cron)

- SST `Cron` component: EventBridge schedule triggers Lambda weekly
- Lambda runs the content pipeline for all active clients
- If single-client runs approach 15 min, fan out: one Lambda invocation per client (not needed at current scale)
- No Dockerfile, no always-on container — SST bundles from source
- CloudWatch Logs for output

```ts
const contentEngine = new sst.aws.Cron("ContentEngine", {
  schedule: "cron(0 2 ? * SUN *)", // weekly Sunday 2am UTC
  function: {
    handler: "hum-content-engine/src/handler.run",
    timeout: "15 minutes",
    memory: "1024 MB",
    vpc,
    link: [db, media, ...Object.values(secrets)],
  },
});
```

### 5. Onboarding Pipeline (Lambda, on-demand)

- Lambda invoked async from dashboard API route (or future client portal)
- Dashboard POST `/api/onboard` → async-invokes Lambda → returns immediately
- Dashboard polls onboarding session status (already built into hum-onboarding's session tracking)
- Same Lambda can be invoked manually via `sst invoke` for testing

```ts
const onboarding = new sst.aws.Function("Onboarding", {
  handler: "hum-onboarding/src/handler.run",
  timeout: "15 minutes",
  memory: "1024 MB",
  vpc,
  link: [db, media, ...Object.values(secrets)],
});
```

### 6. S3 Media Storage

- Bucket per stage: `hum-media-{stage}`
- Replaces local `./media` directory
- Content engine writes generated images here
- Dashboard reads from here (via presigned URLs or CloudFront)
- Lifecycle rule: transition to IA after 90 days

**Code change:** Replace `LocalStorageClient` with an `S3StorageClient` implementing the same `StorageClient` interface.

### 7. Secrets Management

SST secrets (backed by SSM Parameter Store):
```
OPENAI_API_KEY
FAL_API_KEY
AYRSHARE_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

Set per stage: `sst secret set OPENAI_API_KEY sk-... --stage prod`

## Database Migration Strategy (SQLite → Postgres)

### hum-core changes

1. Replace `better-sqlite3` with `pg` (node-postgres) for production
2. Add `@electric-sql/pglite` as a dev dependency for local dev
3. Rewrite `schema.ts` from `sqliteTable` to `pgTable` (column types stay equivalent)
4. Rewrite `connection.ts`:
   - `DATABASE_URL` starts with `postgres://` → use `drizzle-orm/node-postgres`
   - `DATABASE_URL` is a file path or `:memory:` → use PGlite (local dev/tests)
5. Generate fresh Postgres migrations via `drizzle-kit generate`
6. Remove SQLite migrations and `better-sqlite3` dependency

### Data types

Key mappings (handled by Drizzle's `pgTable` equivalents):
- `integer` timestamps → Postgres `integer` (keep as unix timestamps for minimal changes)
- `text` JSON columns → Postgres `text` (can upgrade to `jsonb` later)
- `real` → Postgres `real`

### Migration path

No production data exists yet (pre-launch), so this is a clean schema deploy, not a data migration.

## SST Config Structure

```
infra/
├── sst.config.ts          # Main SST config (all resources defined here)
```

Single file to start. Extract into modules only when it gets unwieldy.

### sst.config.ts (conceptual)

```ts
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "hum",
      removal: input?.stage === "prod" ? "retain" : "remove",
      home: "aws",
      providers: { aws: { region: "us-east-1" } },
    };
  },
  async run() {
    const isProd = $app.stage === "prod";

    const vpc = new sst.aws.Vpc("Vpc", { nat: "ec2" });

    // RDS Postgres
    const rds = new sst.aws.Postgres("Db", {
      vpc,
      instance: "db.t4g.micro",
    });

    const media = new sst.aws.Bucket("Media");

    // Secrets
    const secrets = {
      openaiKey: new sst.Secret("OpenaiApiKey"),
      falKey: new sst.Secret("FalApiKey"),
      ayrshareKey: new sst.Secret("AyrshareApiKey"),
      stripeKey: new sst.Secret("StripeSecretKey"),
      stripeWebhook: new sst.Secret("StripeWebhookSecret"),
    };

    const allLinks = [rds, media, ...Object.values(secrets)];

    // Dashboard
    const dashboard = new sst.aws.Nextjs("Dashboard", {
      path: "hum-dashboard",
      vpc,
      link: allLinks,
    });

    // Content engine — weekly cron
    new sst.aws.Cron("ContentEngine", {
      schedule: "cron(0 2 ? * SUN *)",
      function: {
        handler: "hum-content-engine/src/handler.run",
        timeout: "15 minutes",
        memory: "1024 MB",
        vpc,
        link: allLinks,
      },
    });

    // Onboarding — on-demand async invocation
    const onboarding = new sst.aws.Function("Onboarding", {
      handler: "hum-onboarding/src/handler.run",
      timeout: "15 minutes",
      memory: "1024 MB",
      vpc,
      link: allLinks,
    });

    return {
      dashboardUrl: dashboard.url,
      onboardingFn: onboarding.name,
    };
  },
});
```

## Stages

| Concern | `dev` | `prod` |
|---------|-------|--------|
| RDS instance | db.t4g.micro | db.t4g.micro (upgrade later) |
| RDS Multi-AZ | No | No (add when revenue justifies) |
| NAT | EC2 instance | EC2 instance |
| Lambda memory | 1024 MB | 1024 MB |
| `removal` policy | `remove` (clean teardown) | `retain` (protect data) |
| Secrets | Test API keys | Production API keys |
| Domain | `dev-dashboard.humapp.com` | `dashboard.humapp.com` |

## CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]        # → deploy to dev
    tags: ['v*']             # → deploy to prod

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test
      - name: Deploy
        run: npx sst deploy --stage ${{ github.ref_name == 'main' && 'dev' || 'prod' }}
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Future: Client Portal Integration

When the client portal (Next.js) is ready:

1. Add another `sst.aws.Nextjs` in `sst.config.ts`:
   ```ts
   const portal = new sst.aws.Nextjs("ClientPortal", {
     path: "hum-client-portal",
     vpc,
     link: allLinks,
   });
   ```
2. It shares the same RDS database, S3 bucket, and VPC
3. Gets its own CloudFront distribution and domain (`app.humapp.com`)
4. Same CI/CD pipeline deploys it alongside everything else
5. No infra changes needed — just add the component and deploy

## Code Changes Required

### hum-core
- Replace `better-sqlite3` with `pg` + `@electric-sql/pglite` (dev)
- Rewrite schema from `sqliteTable` → `pgTable`
- Rewrite `connection.ts` (Postgres for cloud, PGlite for local dev/tests)
- Generate fresh Postgres migrations

### hum-content-engine
- Add `S3StorageClient` implementing `StorageClient` interface
- Add `handler.ts` — Lambda entry point wrapping existing pipeline logic
- Remove `node-cron` dependency (scheduling handled by EventBridge)
- Keep CLI for local manual runs

### hum-onboarding
- Add `handler.ts` — Lambda entry point wrapping existing pipeline logic
- Keep CLI for local manual runs

### hum-dashboard
- Update API routes to read SST-linked env vars
- Add `/api/onboard` route that async-invokes the Onboarding Lambda
- Media serving: switch from local file reads to S3 presigned URLs
- No UI changes

### New files
- `sst.config.ts` (root)
- `hum-content-engine/src/handler.ts`
- `hum-onboarding/src/handler.ts`
- `hum-content-engine/src/storage/s3.ts`
- `.github/workflows/deploy.yml`

### Removed
- `hum-content-engine/Dockerfile` (not needed)
- `better-sqlite3` and `@types/better-sqlite3` dependencies
- SQLite migration files

## Cost Estimate (Monthly)

| Resource | Dev | Prod |
|----------|-----|------|
| RDS db.t4g.micro | ~$12 | ~$12 |
| NAT (EC2 t4g.nano) | ~$3 | ~$3 |
| Lambda (content engine + onboarding) | <$1 | <$1 |
| S3 | <$1 | <$1 |
| CloudFront | <$1 | ~$5 |
| Lambda (Next.js) | <$1 | ~$5 |
| **Total** | **~$17** | **~$27** |
