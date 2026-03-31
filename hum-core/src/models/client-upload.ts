import { type InferSelectModel } from 'drizzle-orm';
import { type clientUploads } from '../db/schema.js';

export type ClientUploadRow = InferSelectModel<typeof clientUploads>;

export type UploadCategory = 'food_photo' | 'menu' | 'logo' | 'interior' | 'other';

export type UploadStatus = 'pending' | 'used' | 'archived';

export class ClientUpload {
  readonly id: string;
  readonly portalUserId: string;
  readonly filename: string;
  readonly storagePath: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly category: UploadCategory;
  readonly status: UploadStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: ClientUploadRow) {
    this.id = row.id;
    this.portalUserId = row.portalUserId;
    this.filename = row.filename;
    this.storagePath = row.storagePath;
    this.mimeType = row.mimeType;
    this.sizeBytes = row.sizeBytes;
    this.category = row.category;
    this.status = row.status;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }

  isPending(): boolean { return this.status === 'pending'; }
  isUsed(): boolean { return this.status === 'used'; }
  isArchived(): boolean { return this.status === 'archived'; }
}
