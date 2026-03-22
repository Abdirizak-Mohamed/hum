import { type InferSelectModel } from 'drizzle-orm';
import { type clients } from '../db/schema.js';
import { plans, type PlanTier, type PlanConfig, PLAN_TIERS } from '../config/plans.js';

export type ClientRow = InferSelectModel<typeof clients>;

export class Client {
  readonly id: string;
  readonly businessName: string;
  readonly address: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly phone: string | null;
  readonly email: string;
  readonly openingHours: Record<string, string> | null;
  readonly deliveryPlatforms: string[];
  readonly planTier: PlanTier;
  readonly stripeCustomerId: string | null;
  readonly status: 'onboarding' | 'active' | 'paused' | 'churned';
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: ClientRow) {
    this.id = row.id;
    this.businessName = row.businessName;
    this.address = row.address;
    this.latitude = row.latitude;
    this.longitude = row.longitude;
    this.phone = row.phone;
    this.email = row.email;
    this.openingHours = row.openingHours;
    this.deliveryPlatforms = row.deliveryPlatforms ?? [];
    this.planTier = row.planTier as PlanTier;
    this.stripeCustomerId = row.stripeCustomerId;
    this.status = row.status;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }

  isActive(): boolean { return this.status === 'active'; }
  canUpgradeTo(tier: PlanTier): boolean {
    return PLAN_TIERS.indexOf(tier) > PLAN_TIERS.indexOf(this.planTier);
  }
  getPlanConfig(): PlanConfig { return plans[this.planTier]; }
}
