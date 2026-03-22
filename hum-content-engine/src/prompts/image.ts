import type { ImagePrompt } from 'hum-integrations';
import type { MenuItem } from 'hum-core';
import { selectImageSize } from './utils.js';

type ImagePromptInput = {
  contentType: 'food_hero' | 'deal_offer' | 'google_post';
  menuItem: MenuItem | null | undefined;
  theme: string;
  brief: string;
};

type BrandInfo = {
  brandColours: string[];
  brandVoiceGuide: string | null;
};

const ANGLES = ['overhead flat-lay', '45-degree angle', 'close-up macro', 'side angle'] as const;
const LIGHTING = ['warm golden', 'soft natural', 'dramatic side-lit', 'bright and airy'] as const;
const PROPS = ['rustic wooden board', 'slate plate', 'fresh herb garnish', 'scattered spices'] as const;

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildImagePrompt(
  input: ImagePromptInput,
  brand: BrandInfo,
  platform: string,
): ImagePrompt {
  const imageSize = selectImageSize(platform);
  let prompt: string;

  switch (input.contentType) {
    case 'food_hero': {
      const dish = input.menuItem
        ? `${input.menuItem.name} — ${input.menuItem.description}`
        : input.theme;
      prompt = [
        `Professional food photography of ${dish}.`,
        `Angle: ${randomFrom(ANGLES)}.`,
        `Lighting: ${randomFrom(LIGHTING)}.`,
        `Styling: ${randomFrom(PROPS)}.`,
        'Background: clean, softly blurred restaurant setting.',
        'Style: appetizing, high-end restaurant marketing photo.',
      ].join(' ');
      break;
    }
    case 'deal_offer': {
      const colours = brand.brandColours.length > 0
        ? `Brand colours: ${brand.brandColours.join(', ')}.`
        : '';
      prompt = [
        `Bold promotional graphic for "${input.theme}".`,
        input.menuItem ? `Featuring: ${input.menuItem.name}.` : '',
        'Style: eye-catching, vibrant, modern restaurant promotion.',
        colours,
        'Include visual space for text overlay.',
        'Clean design with strong contrast.',
      ].filter(Boolean).join(' ');
      break;
    }
    case 'google_post': {
      const subject = input.menuItem
        ? `${input.menuItem.name} — ${input.menuItem.description}`
        : 'restaurant exterior or signature dish';
      prompt = [
        `Clean, professional photo of ${subject}.`,
        'Style: bright, inviting, suitable for Google Business Profile.',
        'Well-lit, sharp focus, warm and welcoming atmosphere.',
      ].join(' ');
      break;
    }
  }

  return { prompt, imageSize, numImages: 1 };
}
