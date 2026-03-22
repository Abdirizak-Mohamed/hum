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
