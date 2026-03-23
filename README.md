# Hum

AI-powered marketing automation for restaurants.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env with your API keys (or leave HUM_MOCK_INTEGRATIONS=true for dev)
```

## Local Development

### Start all services

```bash
pnpm dev
```

This starts:
- Library watch-builds (hum-core, hum-integrations)
- Dashboard on http://localhost:3100

### Seed the database

```bash
pnpm seed
```

### Run the full pipeline

```bash
# 1. Onboard a test client
pnpm onboard start --quick

# 2. Generate content (note the Client ID from step 1)
pnpm generate -- --client <CLIENT_ID> --mock --dry-run

# 3. Open http://localhost:3100 to see results
```

### Individual commands

```bash
pnpm generate -- --all --mock        # Generate for all clients
pnpm onboard status --session <id>   # Check onboarding status
pnpm seed                            # Seed database with test data
pnpm test                            # Run all tests
pnpm build                           # Build all packages (CI)
```
