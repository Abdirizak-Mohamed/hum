import type { Platform } from './plans.js';

export type MediaSpec = {
  imageAspect: string;
  videoAspect: string;
  maxCaptionLength: number;
  supportsHashtags: boolean;
  supportsStories: boolean;
};

export const platformSpecs: Record<Platform, MediaSpec> = {
  instagram: { imageAspect: '1:1', videoAspect: '9:16', maxCaptionLength: 2200, supportsHashtags: true, supportsStories: true },
  facebook: { imageAspect: '16:9', videoAspect: '16:9', maxCaptionLength: 63206, supportsHashtags: true, supportsStories: true },
  tiktok: { imageAspect: '9:16', videoAspect: '9:16', maxCaptionLength: 2200, supportsHashtags: true, supportsStories: false },
  google_business: { imageAspect: '4:3', videoAspect: '16:9', maxCaptionLength: 1500, supportsHashtags: false, supportsStories: false },
};

export const CONTENT_TYPES = ['food_hero', 'short_video', 'deal_offer', 'behind_scenes', 'google_post', 'review_highlight', 'trending'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export type ContentTypeSpec = {
  description: string;
  defaultPlatforms: Platform[];
  suggestedFrequency: string;
};

export const contentTypeSpecs: Record<ContentType, ContentTypeSpec> = {
  food_hero: { description: 'High-quality food photography', defaultPlatforms: ['instagram', 'facebook'], suggestedFrequency: '3-4/week' },
  short_video: { description: 'Short-form video — food reveals, making-of', defaultPlatforms: ['tiktok', 'instagram'], suggestedFrequency: '2-3/week' },
  deal_offer: { description: 'Promotional deal or special offer post', defaultPlatforms: ['instagram', 'facebook', 'google_business'], suggestedFrequency: '1-2/week' },
  behind_scenes: { description: 'Behind-the-scenes kitchen/prep content', defaultPlatforms: ['instagram'], suggestedFrequency: '2-3/week' },
  google_post: { description: 'Google Business Profile update post', defaultPlatforms: ['google_business'], suggestedFrequency: '1-2/week' },
  review_highlight: { description: 'Post showcasing a positive customer review', defaultPlatforms: ['instagram', 'facebook'], suggestedFrequency: '1/week' },
  trending: { description: 'Content riding a trending format or audio', defaultPlatforms: ['tiktok', 'instagram'], suggestedFrequency: '1/week' },
};
