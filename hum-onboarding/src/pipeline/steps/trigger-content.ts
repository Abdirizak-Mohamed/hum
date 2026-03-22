import type { MenuItem } from 'hum-core';
import type { PipelineStep } from '../types.js';

export const triggerContentStep: PipelineStep = {
  name: 'trigger_content',

  async execute(ctx) {
    const clientId = ctx.session.stepResults.create_client?.output?.clientId as string;
    const brandOutput = ctx.session.stepResults.generate_brand?.output ?? {};
    const socialOutput = ctx.session.stepResults.setup_social?.output ?? {};

    const accounts = (socialOutput.accounts ?? []) as Array<{ platform: string }>;
    const platforms = accounts.map((a) => a.platform);

    const response = await ctx.integrations.contentEngine.triggerBatch({
      clientId,
      brandProfile: {
        brandVoiceGuide: brandOutput.brandVoiceGuide as string,
        keySellingPoints: brandOutput.keySellingPoints as string[],
        targetAudienceProfile: brandOutput.targetAudienceProfile as string,
        contentThemes: brandOutput.contentThemes as string[],
        hashtagStrategy: brandOutput.hashtagStrategy as string[],
        peakPostingTimes: brandOutput.peakPostingTimes as Record<string, string[]>,
        menuItems: brandOutput.menuItems as MenuItem[],
      },
      platforms,
      batchSize: 30,
    });

    return {
      status: 'complete',
      output: {
        contentBatchId: response.batchId,
        status: response.status,
      },
    };
  },
};
