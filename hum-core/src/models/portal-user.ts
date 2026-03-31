import { type InferSelectModel } from 'drizzle-orm';
import { type portalUsers } from '../db/schema.js';

export type PortalUserRow = InferSelectModel<typeof portalUsers>;

export type PortalUserStatus = 'pending_intake' | 'pending_approval' | 'active' | 'suspended';

export class PortalUser {
  readonly id: string;
  readonly clientId: string | null;
  readonly email: string;
  readonly passwordHash: string;
  readonly name: string;
  readonly status: PortalUserStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLoginAt: Date | null;

  constructor(row: PortalUserRow) {
    this.id = row.id;
    this.clientId = row.clientId;
    this.email = row.email;
    this.passwordHash = row.passwordHash;
    this.name = row.name;
    this.status = row.status;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
    this.lastLoginAt = row.lastLoginAt;
  }

  isActive(): boolean { return this.status === 'active'; }
  isPendingIntake(): boolean { return this.status === 'pending_intake'; }
  isPendingApproval(): boolean { return this.status === 'pending_approval'; }
}
