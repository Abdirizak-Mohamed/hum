import { type InferSelectModel } from 'drizzle-orm';
import { type intakeSubmissions } from '../db/schema.js';

export type IntakeSubmissionRow = InferSelectModel<typeof intakeSubmissions>;

export type IntakeSubmissionStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export class IntakeSubmission {
  readonly id: string;
  readonly portalUserId: string;
  readonly businessName: string;
  readonly address: string | null;
  readonly phone: string | null;
  readonly openingHours: Record<string, string> | null;
  readonly menuData: string | null;
  readonly menuUploadIds: string[];
  readonly foodPhotoUploadIds: string[];
  readonly socialLinks: Record<string, string> | null;
  readonly brandPreferences: string | null;
  readonly status: IntakeSubmissionStatus;
  readonly submittedAt: Date | null;
  readonly reviewedAt: Date | null;
  readonly reviewNotes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: IntakeSubmissionRow) {
    this.id = row.id;
    this.portalUserId = row.portalUserId;
    this.businessName = row.businessName;
    this.address = row.address;
    this.phone = row.phone;
    this.openingHours = row.openingHours;
    this.menuData = row.menuData;
    this.menuUploadIds = row.menuUploadIds ?? [];
    this.foodPhotoUploadIds = row.foodPhotoUploadIds ?? [];
    this.socialLinks = row.socialLinks;
    this.brandPreferences = row.brandPreferences;
    this.status = row.status;
    this.submittedAt = row.submittedAt;
    this.reviewedAt = row.reviewedAt;
    this.reviewNotes = row.reviewNotes;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }

  isDraft(): boolean { return this.status === 'draft'; }
  isSubmitted(): boolean { return this.status === 'submitted'; }
}
