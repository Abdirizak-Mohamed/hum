import { describe, it, expect } from 'vitest';
import { platformSpecs, contentTypeSpecs, CONTENT_TYPES } from '../platforms.js';
import { PLATFORMS } from '../plans.js';

describe('platformSpecs', () => {
  it('defines specs for all platforms', () => {
    for (const platform of PLATFORMS) { expect(platformSpecs[platform]).toBeDefined(); }
  });
  it('google_business does not support hashtags', () => {
    expect(platformSpecs.google_business.supportsHashtags).toBe(false);
  });
  it('instagram supports hashtags', () => {
    expect(platformSpecs.instagram.supportsHashtags).toBe(true);
  });
  it('each platform has all required media spec fields', () => {
    const requiredFields = ['imageAspect', 'videoAspect', 'maxCaptionLength', 'supportsHashtags', 'supportsStories'];
    for (const spec of Object.values(platformSpecs)) {
      for (const field of requiredFields) { expect(spec).toHaveProperty(field); }
    }
  });
});

describe('contentTypeSpecs', () => {
  it('defines specs for all content types', () => {
    for (const type of CONTENT_TYPES) { expect(contentTypeSpecs[type]).toBeDefined(); }
  });
  it('each content type has description, defaultPlatforms, suggestedFrequency', () => {
    for (const spec of Object.values(contentTypeSpecs)) {
      expect(spec.description).toBeTruthy();
      expect(Array.isArray(spec.defaultPlatforms)).toBe(true);
      expect(spec.suggestedFrequency).toBeTruthy();
    }
  });
});
