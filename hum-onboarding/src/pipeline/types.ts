import type { HumDb } from 'hum-core';
import type { AiClient } from 'hum-integrations';
import type { ContentEngine } from '../engine/interface.js';
import type { OnboardingSession, StepName, StepResult } from '../session/types.js';

export type Db = HumDb['db'];

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
