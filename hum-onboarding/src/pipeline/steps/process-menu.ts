import { z } from 'zod';
import type { PipelineStep } from '../types.js';
import { buildMenuExtractionPrompt } from '../../prompts/menu-extraction.js';

const menuItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number(),
  photoUrl: z.string().optional(),
});

const menuItemsSchema = z.array(menuItemSchema);

export const processMenuStep: PipelineStep = {
  name: 'process_menu',

  async execute(ctx) {
    const menuText = ctx.session.intakeData!.menu;
    const prompt = buildMenuExtractionPrompt(menuText);

    const response = await ctx.integrations.ai.generateCopy(prompt);

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      return {
        status: 'failed',
        error: `Menu extraction returned invalid JSON: ${response.text.slice(0, 200)}`,
      };
    }

    const validation = menuItemsSchema.safeParse(parsed);
    if (!validation.success) {
      return {
        status: 'failed',
        error: `Menu extraction returned invalid MenuItem[]: ${validation.error.message}`,
      };
    }

    return {
      status: 'complete',
      output: { menuItems: validation.data },
    };
  },
};
