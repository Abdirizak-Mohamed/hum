// Database
export { createDb, type HumDb } from './db/connection.js';
export { clients, brandProfiles, socialAccounts, contentItems, onboardingSessions, portalUsers } from './db/schema.js';

// Models
export { Client, type ClientRow } from './models/client.js';
export { BrandProfile, type BrandProfileRow, type MenuItem } from './models/brand-profile.js';
export { SocialAccount, type SocialAccountRow } from './models/social-account.js';
export { ContentItem, type ContentItemRow, type Performance } from './models/content-item.js';
export { PortalUser, type PortalUserRow, type PortalUserStatus } from './models/portal-user.js';

// Repositories
export { clientRepo, brandProfileRepo, socialAccountRepo, contentItemRepo, portalUserRepo } from './repositories/index.js';

// Schemas
export {
  clientSchema, createClientSchema, updateClientSchema,
  brandProfileSchema, createBrandProfileSchema, updateBrandProfileSchema,
  socialAccountSchema, createSocialAccountSchema, updateSocialAccountSchema,
  contentItemSchema, createContentItemSchema, updateContentItemSchema,
  onboardingSessionSchema, createOnboardingSessionSchema, updateOnboardingSessionSchema,
  portalUserSchema, createPortalUserSchema, updatePortalUserSchema,
} from './schemas/index.js';

// Config
export { plans, PLAN_TIERS, PLATFORMS, type PlanTier, type Platform, type PlanConfig } from './config/plans.js';
export {
  platformSpecs, contentTypeSpecs, CONTENT_TYPES,
  type MediaSpec, type ContentType, type ContentTypeSpec,
} from './config/platforms.js';

// Utils
export { NotFoundError, ValidationError, DuplicateError } from './utils/errors.js';
export { logger } from './utils/logger.js';
