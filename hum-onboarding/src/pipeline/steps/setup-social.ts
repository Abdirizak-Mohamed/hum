import { socialAccountRepo } from 'hum-core';
import type { PipelineStep } from '../types.js';

export const setupSocialStep: PipelineStep = {
  name: 'setup_social',

  async execute(ctx) {
    const intake = ctx.session.intakeData!;
    const clientId = ctx.session.stepResults.create_client?.output?.clientId as string;
    const socialAccounts = intake.socialAccounts ?? [];

    const created = [];
    for (const account of socialAccounts) {
      await socialAccountRepo.create(ctx.db, {
        clientId,
        platform: account.platform,
        platformAccountId: account.platformAccountId,
        status: 'connected',
      });
      created.push({
        platform: account.platform,
        platformAccountId: account.platformAccountId,
      });
    }

    return {
      status: 'complete',
      output: { accounts: created },
    };
  },
};
