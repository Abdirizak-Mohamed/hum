import type { MenuItem } from 'hum-core';

export type ContentEngineRequest = {
  clientId: string;
  brandProfile: {
    brandVoiceGuide: string;
    keySellingPoints: string[];
    targetAudienceProfile: string;
    contentThemes: string[];
    hashtagStrategy: string[];
    peakPostingTimes: Record<string, string[]>;
    menuItems: MenuItem[];
  };
  platforms: string[];
  batchSize: number;
};

export type ContentEngineResponse = {
  batchId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  itemCount?: number;
};

export interface ContentEngine {
  triggerBatch(request: ContentEngineRequest): Promise<ContentEngineResponse>;
  getBatchStatus(batchId: string): Promise<ContentEngineResponse>;
}
