export type ConditionReportType = 'HANDOVER' | 'RETURN' | 'DAMAGE_INSPECTION';

export type EquipmentCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';

export interface BookingConditionReport {
  id: string;
  bookingId: string;
  reporterId: string;
  reporterFullName?: string;
  reportType: ConditionReportType;
  condition: EquipmentCondition;
  notes: string;
  evidenceUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConditionReportInput {
  reportType: ConditionReportType;
  condition: EquipmentCondition;
  notes: string;
  evidenceUrls: string[];
}

export type DisputeStatus =
  | 'SUBMITTED'
  | 'AWAITING_BORROWER_RESPONSE'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'DISMISSED';

export interface DamageClaim {
  id: string;
  bookingId: string;
  equipmentId?: string;
  equipmentTitle?: string;
  reporterId: string;
  reporterFullName?: string;
  renterId?: string;
  renterFullName?: string;
  description: string;
  status: DisputeStatus;
  evidenceUrls: string[];
  proposedFineAmount: string | null;
  fineExplanation: string | null;
  borrowerResponse: string | null;
  borrowerDisputed: boolean;
  borrowerEvidenceUrls: string[];
  borrowerRespondedAt: Date | null;
  reopenedByAdminId: string | null;
  reopenedAt: Date | null;
  reopenedReason: string | null;
  resolvedByAdminId: string | null;
  resolvedAt: Date | null;
  adminDecisionNotes: string | null;
  finalApprovedFine: string | null;
  returnRecordedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDamageClaimInput {
  description: string;
  evidenceUrls: string[];
  proposedFineAmount?: number | null;
  fineExplanation?: string | null;
}

export interface BorrowerClaimResponseInput {
  response: string;
  disputed: boolean;
  evidenceUrls?: string[];
}

export interface AdminReopenClaimInput {
  reason: string;
}

export interface AdminResolveClaimInput {
  decision: 'RESOLVED' | 'DISMISSED';
  finalApprovedFine?: number | null;
  notes: string;
}

export interface DamageClaimStatusHistory {
  id: string;
  damageReportId: string;
  previousStatus: string | null;
  newStatus: string;
  actorUserId: string | null;
  actorFullName?: string;
  notes: string | null;
  createdAt: Date;
}

export interface Complaint {
  id: string;
  bookingId: string | null;
  complainantId: string;
  complainantFullName?: string;
  category: string;
  description: string;
  evidenceUrls: string[];
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  adminNotes: string | null;
  resolvedByAdminId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateComplaintInput {
  bookingId?: string | null;
  category: string;
  description: string;
  evidenceUrls?: string[];
}

export interface UpdateComplaintInput {
  status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  adminNotes?: string | null;
}
