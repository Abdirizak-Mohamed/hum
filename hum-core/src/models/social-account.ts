import { type InferSelectModel } from 'drizzle-orm';
import { type socialAccounts } from '../db/schema.js';
import { type Platform } from '../config/plans.js';

export type SocialAccountRow = InferSelectModel<typeof socialAccounts>;

export class SocialAccount {
  readonly id: string; readonly clientId: string; readonly platform: Platform;
  readonly platformAccountId: string; readonly ayrshareProfileKey: string | null;
  readonly status: 'connected' | 'disconnected' | 'expired';
  readonly createdAt: Date; readonly connectedAt: Date | null; readonly updatedAt: Date;

  constructor(row: SocialAccountRow) {
    this.id = row.id; this.clientId = row.clientId;
    this.platform = row.platform as Platform;
    this.platformAccountId = row.platformAccountId;
    this.ayrshareProfileKey = row.ayrshareProfileKey;
    this.status = row.status;
    this.createdAt = row.createdAt; this.connectedAt = row.connectedAt; this.updatedAt = row.updatedAt;
  }

  isConnected(): boolean { return this.status === 'connected'; }
  needsReconnection(): boolean { return this.status === 'expired' || this.status === 'disconnected'; }
}
