export const PLAN_TIERS = ['starter', 'growth', 'premium'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'google_business'] as const;
export type Platform = (typeof PLATFORMS)[number];

export type PlanConfig = {
  postsPerWeek: number;
  platforms: Platform[];
  reviewResponses: boolean;
  dmAutomation: boolean;
  adManagement: boolean;
};

export const plans: Record<PlanTier, PlanConfig> = {
  starter: {
    postsPerWeek: 3,
    platforms: ['instagram', 'facebook'],
    reviewResponses: true,
    dmAutomation: false,
    adManagement: false,
  },
  growth: {
    postsPerWeek: 5,
    platforms: ['instagram', 'facebook', 'tiktok'],
    reviewResponses: true,
    dmAutomation: true,
    adManagement: false,
  },
  premium: {
    postsPerWeek: 7,
    platforms: ['instagram', 'facebook', 'tiktok', 'google_business'],
    reviewResponses: true,
    dmAutomation: true,
    adManagement: true,
  },
};
