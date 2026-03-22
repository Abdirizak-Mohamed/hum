import { brandProfileRepo, type MenuItem } from 'hum-core';
import type { PipelineStep } from '../types.js';
import { buildBrandInput } from '../../prompts/brand-generation.js';

export const generateBrandStep: PipelineStep = {
  name: 'generate_brand',

  async execute(ctx) {
    const intake = ctx.session.intakeData!;
    const menuResult = ctx.session.stepResults.process_menu;
    const clientResult = ctx.session.stepResults.create_client;

    const menuItems = (menuResult?.output?.menuItems ?? []) as MenuItem[];
    const clientId = clientResult?.output?.clientId as string;

    const brandInput = buildBrandInput(intake, menuItems);
    const llmResult = await ctx.integrations.ai.generateBrandProfile(brandInput);

    // Compose BrandProfile: LLM-generated fields + menuItems from step 2
    const profile = await brandProfileRepo.create(ctx.db, {
      clientId,
      brandVoiceGuide: llmResult.brandVoiceGuide,
      keySellingPoints: llmResult.keySellingPoints,
      targetAudienceProfile: llmResult.targetAudienceProfile,
      contentThemes: llmResult.contentThemes,
      hashtagStrategy: llmResult.hashtagStrategy,
      peakPostingTimes: llmResult.peakPostingTimes,
      menuItems,
    });

    return {
      status: 'complete',
      output: {
        brandProfileId: profile.id,
        brandVoiceGuide: profile.brandVoiceGuide,
        keySellingPoints: profile.keySellingPoints,
        targetAudienceProfile: profile.targetAudienceProfile,
        contentThemes: profile.contentThemes,
        hashtagStrategy: profile.hashtagStrategy,
        peakPostingTimes: profile.peakPostingTimes,
        menuItems,
      },
    };
  },
};
