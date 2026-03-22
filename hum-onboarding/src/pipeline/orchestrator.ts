import { NotFoundError } from 'hum-core';
import * as sessionRepo from '../session/repository.js';
import type { OnboardingSession } from '../session/types.js';
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
      const updated = await sessionRepo.saveStepResult(ctx.db, sessionId, step.name, result);
      ctx = { ...ctx, session: updated };
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
      if (!failed) throw new NotFoundError('OnboardingSession', sessionId);
      return failed;
    }
  }

  await sessionRepo.update(ctx.db, sessionId, {
    status: 'complete',
    completedAt: new Date(),
  });
  const completed = await sessionRepo.getById(ctx.db, sessionId);
  if (!completed) throw new NotFoundError('OnboardingSession', sessionId);
  return completed;
}
