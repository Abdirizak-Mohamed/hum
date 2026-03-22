import { type InferSelectModel } from 'drizzle-orm';
import { type brandProfiles } from '../db/schema.js';
import { type Platform } from '../config/plans.js';
import { platformSpecs } from '../config/platforms.js';

export type BrandProfileRow = InferSelectModel<typeof brandProfiles>;
export type MenuItem = { name: string; description: string; category: string; price: number; photoUrl?: string; };

export class BrandProfile {
  readonly id: string; readonly clientId: string; readonly brandVoiceGuide: string | null;
  readonly keySellingPoints: string[]; readonly targetAudienceProfile: string | null;
  readonly contentThemes: string[]; readonly hashtagStrategy: string[];
  readonly peakPostingTimes: Record<string, string[]>; menuItems: MenuItem[];
  readonly brandColours: string[]; readonly logoUrl: string | null;
  readonly generatedAt: Date; readonly updatedAt: Date;

  constructor(row: BrandProfileRow) {
    this.id = row.id; this.clientId = row.clientId;
    this.brandVoiceGuide = row.brandVoiceGuide;
    this.keySellingPoints = row.keySellingPoints ?? [];
    this.targetAudienceProfile = row.targetAudienceProfile;
    this.contentThemes = row.contentThemes ?? [];
    this.hashtagStrategy = row.hashtagStrategy ?? [];
    this.peakPostingTimes = row.peakPostingTimes ?? {};
    this.menuItems = (row.menuItems ?? []) as MenuItem[];
    this.brandColours = row.brandColours ?? [];
    this.logoUrl = row.logoUrl;
    this.generatedAt = row.generatedAt; this.updatedAt = row.updatedAt;
  }

  addMenuItem(item: MenuItem): void { this.menuItems.push(item); }
  getHashtagsForPlatform(platform: Platform): string[] {
    if (!platformSpecs[platform].supportsHashtags) return [];
    return this.hashtagStrategy;
  }
}
