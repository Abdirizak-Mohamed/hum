import type { MenuItem, Platform } from 'hum-core';
import type { ImagePrompt } from 'hum-integrations';

const IMAGE_SIZE_MAP: Record<string, ImagePrompt['imageSize']> = {
  instagram: 'square_hd',
  facebook: 'landscape_4_3',
  google_business: 'landscape_4_3',
  tiktok: 'portrait_hd',
};

export function injectBrandVoice(brandVoiceGuide: string | null): string {
  if (brandVoiceGuide) {
    return `Write in this brand voice: ${brandVoiceGuide}`;
  }
  return 'Write in a friendly, approachable tone that feels authentic and inviting.';
}

export function formatMenuItems(items: MenuItem[]): string {
  if (items.length === 0) return '';
  return items
    .map((item) => `- ${item.name} (${item.category}, £${item.price.toFixed(2)}): ${item.description}`)
    .join('\n');
}

export function selectImageSize(platform: string): ImagePrompt['imageSize'] {
  return IMAGE_SIZE_MAP[platform] ?? 'square_hd';
}
