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
