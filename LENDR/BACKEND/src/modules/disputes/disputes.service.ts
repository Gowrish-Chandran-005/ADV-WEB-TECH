import { HttpError } from '../../middleware/http-error';
import { env } from '../../config/env';
import { postgresNotificationsRepository } from '../notifications/notifications.repository';
import type { NotificationsRepository } from '../notifications/notifications.types';
import {
  PostgresDisputesRepository,
  disputesRepository,
} from './disputes.repository';
import type {
  BookingConditionReport,
  CreateConditionReportInput,
  DamageClaim,
  CreateDamageClaimInput,
  BorrowerClaimResponseInput,
  AdminResolveClaimInput,
  DamageClaimStatusHistory,
  Complaint,
  CreateComplaintInput,
  UpdateComplaintInput,
} from './disputes.types';

export class DisputesService {
  constructor(
    private readonly repository: PostgresDisputesRepository = disputesRepository,
    private readonly notifications: NotificationsRepository = postgresNotificationsRepository,
    private readonly claimWindowHours: number = env.DAMAGE_CLAIM_WINDOW_HOURS ?? 24,
  ) {}

  // ── 1. Condition Reports ──────────────────────────────────────────────────────

  async createConditionReport(
    bookingId: string,
    userId: string,
    userRole: string,
    input: CreateConditionReportInput,
  ): Promise<BookingConditionReport> {
    const booking = await this.repository.getBookingContext(bookingId);
    if (!booking) {
      throw new HttpError(404, 'BOOKING_NOT_FOUND', 'The booking was not found.');
    }

    const isParty = booking.renterId === userId || booking.ownerUserId === userId;
    if (!isParty && userRole !== 'ADMIN') {
      throw new HttpError(403, 'FORBIDDEN', 'You are not authorized to submit condition evidence for this booking.');
    }

    return this.repository.createConditionReport(bookingId, userId, input);
  }

  async listConditionReports(
    bookingId: string,
    userId: string,
    userRole: string,
  ): Promise<BookingConditionReport[]> {
    const booking = await this.repository.getBookingContext(bookingId);
    if (!booking) {
      throw new HttpError(404, 'BOOKING_NOT_FOUND', 'The booking was not found.');
    }

    const isParty = booking.renterId === userId || booking.ownerUserId === userId;
    if (!isParty && userRole !== 'ADMIN') {
      throw new HttpError(403, 'FORBIDDEN', 'You are not authorized to view condition reports for this booking.');
    }

    return this.repository.listConditionReportsByBooking(bookingId);
  }

  // ── 2. Damage Claims ──────────────────────────────────────────────────────────

  async createDamageClaim(
    bookingId: string,
    userId: string,
    input: CreateDamageClaimInput,
  ): Promise<DamageClaim> {
    const booking = await this.repository.getBookingContext(bookingId);
    if (!booking) {
      throw new HttpError(404, 'BOOKING_NOT_FOUND', 'The booking was not found.');
    }

    // Only the lender (owner) can submit a damage claim against the borrower
    if (booking.ownerUserId !== userId) {
      if (booking.renterId === userId) {
        throw new HttpError(403, 'FORBIDDEN', 'Borrowers cannot file a damage claim against themselves. Use complaints instead.');
      }
      throw new HttpError(403, 'FORBIDDEN', 'Only the equipment lender may file a damage claim for this booking.');
    }

    // Must be in return phase
    const isReturned =
      ['RETURN_REQUESTED', 'COMPLETED'].includes(booking.status) ||
      booking.returnRecordedAt !== null;

    if (!isReturned) {
      throw new HttpError(
        409,
        'INVALID_BOOKING_STATUS',
        'Damage claims can only be filed once the equipment has been marked as returned or return requested.',
      );
    }

    // Enforce default 24h deadline from returnRecordedAt
    const returnTimestamp = booking.returnRecordedAt;
    if (returnTimestamp) {
      const windowMs = this.claimWindowHours * 60 * 60 * 1000;
      const elapsedMs = Date.now() - returnTimestamp.getTime();
      if (elapsedMs > windowMs) {
        throw new HttpError(
          422,
          'CLAIM_WINDOW_EXPIRED',
          `The ${this.claimWindowHours}-hour return inspection window has expired. Contact an administrator to request case reopening.`,
        );
      }
    }

    // Prevent duplicate active claims
    const existing = await this.repository.getActiveDamageClaimByBooking(bookingId);
    if (existing) {
      throw new HttpError(
        409,
        'DUPLICATE_CLAIM_NOT_ALLOWED',
        'An active damage claim is already open for this booking.',
      );
    }

    const initialStatus =
      input.proposedFineAmount && input.proposedFineAmount > 0
        ? 'AWAITING_BORROWER_RESPONSE'
        : 'SUBMITTED';

    const claim = await this.repository.createDamageClaim(
      bookingId,
      userId,
      input,
      initialStatus,
    );

    // Notify borrower
    await this.notifications.create({
      userId: booking.renterId,
      type: 'DAMAGE_CLAIM_SUBMITTED',
      title: 'Damage Claim Filed',
      body: `A condition claim was filed for your rental of "${booking.equipmentTitle}".${
        input.proposedFineAmount ? ` Proposed fine: ₹${input.proposedFineAmount}.` : ''
      }`,
      metadata: {
        claimId: claim.id,
        bookingId: booking.id,
        proposedFineAmount: input.proposedFineAmount ?? 0,
      },
    }).catch(() => {});

    return claim;
  }

  async getDamageClaim(
    claimId: string,
    userId: string,
    userRole: string,
  ): Promise<{ claim: DamageClaim; history: DamageClaimStatusHistory[] }> {
    const claim = await this.repository.getDamageClaimById(claimId);
    if (!claim) {
      throw new HttpError(404, 'CLAIM_NOT_FOUND', 'The damage claim was not found.');
    }

    const isParty = claim.reporterId === userId || claim.renterId === userId;
    if (!isParty && userRole !== 'ADMIN') {
      throw new HttpError(403, 'FORBIDDEN', 'You are not authorized to view this damage claim.');
    }

    const history = await this.repository.getStatusHistory(claimId);
    return { claim, history };
  }

  async listDamageClaims(
    userId: string,
    userRole: string,
    options: { bookingId?: string; status?: string; page: number; pageSize: number },
  ): Promise<{ items: DamageClaim[]; total: number }> {
    // Admins can list all; students list only claims where they are lender or borrower
    const filterUserId = userRole === 'ADMIN' ? undefined : userId;
    return this.repository.listDamageClaims({
      ...options,
      userId: filterUserId,
    });
  }

  async respondToClaim(
    claimId: string,
    userId: string,
    input: BorrowerClaimResponseInput,
  ): Promise<DamageClaim> {
    const claim = await this.repository.getDamageClaimById(claimId);
    if (!claim) {
      throw new HttpError(404, 'CLAIM_NOT_FOUND', 'The damage claim was not found.');
    }

    // Only borrower can respond
    if (claim.renterId !== userId) {
      throw new HttpError(403, 'FORBIDDEN', 'Only the borrower can respond to this damage claim.');
    }

    // Must be in response state
    if (!['SUBMITTED', 'AWAITING_BORROWER_RESPONSE'].includes(claim.status)) {
      throw new HttpError(
        409,
        'INVALID_CLAIM_STATE',
        `Cannot respond to claim in state "${claim.status}".`,
      );
    }

    const updated = await this.repository.updateBorrowerResponse(
      claimId,
      userId,
      claim.status,
      input,
    );

    // Notify lender
    await this.notifications.create({
      userId: claim.reporterId,
      type: 'DAMAGE_CLAIM_RESPONSE',
      title: 'Borrower Responded to Claim',
      body: `The borrower has ${input.disputed ? 'disputed' : 'responded to'} the claim for "${claim.equipmentTitle ?? 'gear'}".`,
      metadata: {
        claimId: claim.id,
        bookingId: claim.bookingId,
        disputed: input.disputed,
      },
    }).catch(() => {});

    return updated;
  }

  async adminReopenClaim(
    claimId: string,
    adminId: string,
    reason: string,
  ): Promise<DamageClaim> {
    const claim = await this.repository.getDamageClaimById(claimId);
    if (!claim) {
      throw new HttpError(404, 'CLAIM_NOT_FOUND', 'The damage claim was not found.');
    }

    const updated = await this.repository.adminReopenClaim(
      claimId,
      adminId,
      claim.status,
      reason,
    );

    // Notify both parties
    const notifyBody = `An administrator reopened the damage dispute for "${claim.equipmentTitle ?? 'gear'}". Reason: ${reason}`;
    await Promise.all([
      this.notifications.create({
        userId: claim.reporterId,
        type: 'DISPUTE_REOPENED',
        title: 'Dispute Reopened by Admin',
        body: notifyBody,
        metadata: { claimId: claim.id, reason },
      }).catch(() => {}),
      claim.renterId
        ? this.notifications.create({
            userId: claim.renterId,
            type: 'DISPUTE_REOPENED',
            title: 'Dispute Reopened by Admin',
            body: notifyBody,
            metadata: { claimId: claim.id, reason },
          }).catch(() => {})
        : Promise.resolve(),
    ]);

    return updated;
  }

  async adminResolveClaim(
    claimId: string,
    adminId: string,
    input: AdminResolveClaimInput,
  ): Promise<DamageClaim> {
    const claim = await this.repository.getDamageClaimById(claimId);
    if (!claim) {
      throw new HttpError(404, 'CLAIM_NOT_FOUND', 'The damage claim was not found.');
    }

    if (['RESOLVED', 'DISMISSED'].includes(claim.status)) {
      throw new HttpError(
        409,
        'CLAIM_ALREADY_FINALIZED',
        `Claim is already in finalized state "${claim.status}".`,
      );
    }

    // Financial safety guard: validation ensures fine is explicit and non-negative
    const finalFine =
      input.decision === 'RESOLVED' ? (input.finalApprovedFine ?? 0) : null;

    const updated = await this.repository.adminResolveClaim(
      claimId,
      adminId,
      claim.status,
      input.decision,
      finalFine,
      input.notes,
    );

    // Notify lender and borrower
    const isResolved = input.decision === 'RESOLVED';
    const title = isResolved ? 'Dispute Resolved by Admin' : 'Damage Claim Dismissed';
    const body = isResolved
      ? `The damage dispute for "${claim.equipmentTitle ?? 'gear'}" was resolved. Approved fine: ₹${finalFine ?? 0}. Notes: ${input.notes}`
      : `The damage claim for "${claim.equipmentTitle ?? 'gear'}" was dismissed by an administrator. Notes: ${input.notes}`;

    await Promise.all([
      this.notifications.create({
        userId: claim.reporterId,
        type: isResolved ? 'DISPUTE_RESOLVED' : 'DISPUTE_DISMISSED',
        title,
        body,
        metadata: { claimId: claim.id, decision: input.decision, finalApprovedFine: finalFine },
      }).catch(() => {}),
      claim.renterId
        ? this.notifications.create({
            userId: claim.renterId,
            type: isResolved ? 'DISPUTE_RESOLVED' : 'DISPUTE_DISMISSED',
            title,
            body,
            metadata: { claimId: claim.id, decision: input.decision, finalApprovedFine: finalFine },
          }).catch(() => {})
        : Promise.resolve(),
    ]);

    return updated;
  }

  // ── 3. Complaints ─────────────────────────────────────────────────────────────

  async createComplaint(
    complainantId: string,
    input: CreateComplaintInput,
  ): Promise<Complaint> {
    return this.repository.createComplaint(complainantId, input);
  }

  async listComplaints(
    userId: string,
    userRole: string,
    options: { status?: string; page: number; pageSize: number },
  ): Promise<{ items: Complaint[]; total: number }> {
    const filterUserId = userRole === 'ADMIN' ? undefined : userId;
    return this.repository.listComplaints({
      ...options,
      complainantId: filterUserId,
    });
  }

  async updateComplaint(
    complaintId: string,
    adminId: string,
    input: UpdateComplaintInput,
  ): Promise<Complaint> {
    const updated = await this.repository.updateComplaint(complaintId, adminId, input);
    if (!updated) {
      throw new HttpError(404, 'COMPLAINT_NOT_FOUND', 'The complaint was not found.');
    }
    return updated;
  }
}

export const disputesService = new DisputesService();
