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
  businessName: z.string().min(1),
  email: z.string().email(),
  address: z.string().optional(),
  phone: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  openingHours: z.record(z.string(), z.string()).optional(),
  deliveryPlatforms: z.array(z.string()).optional(),
  planTier: z.enum(['starter', 'growth', 'premium']).optional(),
  menu: z.string().min(1),
  cuisineType: z.string().optional(),
  brandPreferences: z.string().optional(),
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
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly updatedAt: number;

  constructor(row: OnboardingSessionRow) {
    this.id = row.id;
    this.clientId = row.clientId;
    this.status = row.status as 'in_progress' | 'complete' | 'failed';
    this.currentStep = row.currentStep;
    this.stepResults = (row.stepResults ?? {}) as Record<string, StepResult>;
    this.intakeData = row.intakeData as IntakeData | null;
    this.blockedReason = row.blockedReason;
    this.startedAt = row.startedAt;
    this.completedAt = row.completedAt ?? null;
    this.updatedAt = row.updatedAt;
  }

  isComplete(): boolean {
    return this.status === 'complete';
  }

  isFailed(): boolean {
    return this.status === 'failed';
  }

  getFailedStep(): StepName | undefined {
    return STEP_NAMES.find((name) => this.stepResults[name]?.status === 'failed');
  }

  getCompletedSteps(): StepName[] {
    return STEP_NAMES.filter((name) => this.stepResults[name]?.status === 'complete');
  }

  getNextPendingStep(allSteps: StepName[]): StepName | undefined {
    return allSteps.find((name) => this.stepResults[name]?.status !== 'complete');
  }
}
