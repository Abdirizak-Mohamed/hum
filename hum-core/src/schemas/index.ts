import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { clients, brandProfiles, socialAccounts, contentItems, onboardingSessions } from '../db/schema.js';

// Update schemas use createSelectSchema (not createInsertSchema) to avoid
// insert defaults (e.g., planTier defaulting to 'starter') leaking into
// partial update objects.

// ── Client schemas ──────────────────────────────────────

export const clientSchema = createSelectSchema(clients);
export const createClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateClientSchema = createSelectSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// ── BrandProfile schemas ────────────────────────────────

export const brandProfileSchema = createSelectSchema(brandProfiles);
export const createBrandProfileSchema = createInsertSchema(brandProfiles).omit({
  id: true,
  generatedAt: true,
  updatedAt: true,
});
export const updateBrandProfileSchema = createSelectSchema(brandProfiles).omit({
  id: true,
  clientId: true,
  generatedAt: true,
  updatedAt: true,
}).partial();

// ── SocialAccount schemas ───────────────────────────────

export const socialAccountSchema = createSelectSchema(socialAccounts);
export const createSocialAccountSchema = createInsertSchema(socialAccounts).omit({
  id: true,
  createdAt: true,
  connectedAt: true,
  updatedAt: true,
});
export const updateSocialAccountSchema = createSelectSchema(socialAccounts).omit({
  id: true,
  clientId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// ── ContentItem schemas ─────────────────────────────────

export const contentItemSchema = createSelectSchema(contentItems);
export const createContentItemSchema = createInsertSchema(contentItems).omit({
  id: true,
  postedAt: true,
  performance: true,
  createdAt: true,
  updatedAt: true,
});
export const updateContentItemSchema = createSelectSchema(contentItems).omit({
  id: true,
  clientId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// ── OnboardingSession schemas ──────────────────────────

export const onboardingSessionSchema = createSelectSchema(onboardingSessions);
export const createOnboardingSessionSchema = createInsertSchema(onboardingSessions).omit({
  id: true,
  completedAt: true,
  updatedAt: true,
});
export const updateOnboardingSessionSchema = createSelectSchema(onboardingSessions).omit({
  id: true,
  clientId: true,
  startedAt: true,
  updatedAt: true,
}).partial();
