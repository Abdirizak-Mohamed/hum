import { type InferSelectModel } from 'drizzle-orm';
import { type contentItems } from '../db/schema.js';
import { type ContentType } from '../config/platforms.js';

export type ContentItemRow = InferSelectModel<typeof contentItems>;
export type Performance = { reach: number; impressions: number; engagement: number; clicks: number; };

export class ContentItem {
  readonly id: string; readonly clientId: string; readonly contentType: ContentType;
  readonly status: 'draft' | 'scheduled' | 'posted' | 'failed';
  readonly caption: string | null; readonly hashtags: string[];
  readonly cta: string | null; readonly mediaUrls: string[];
  readonly platforms: string[]; readonly scheduledAt: Date | null;
  readonly postedAt: Date | null; readonly performance: Performance | null;
  readonly createdAt: Date; readonly updatedAt: Date;

  constructor(row: ContentItemRow) {
    this.id = row.id; this.clientId = row.clientId;
    this.contentType = row.contentType as ContentType;
    this.status = row.status; this.caption = row.caption;
    this.hashtags = row.hashtags ?? []; this.cta = row.cta;
    this.mediaUrls = row.mediaUrls ?? []; this.platforms = row.platforms ?? [];
    this.scheduledAt = row.scheduledAt; this.postedAt = row.postedAt;
    this.performance = row.performance as Performance | null;
    this.createdAt = row.createdAt; this.updatedAt = row.updatedAt;
  }

  canPublish(): boolean { return this.status === 'draft' || this.status === 'scheduled'; }
  isOverdue(): boolean {
    if (!this.scheduledAt || this.status === 'posted' || this.status === 'failed') return false;
    return this.scheduledAt.getTime() < Date.now();
  }
  hasMedia(): boolean { return this.mediaUrls.length > 0; }
}
