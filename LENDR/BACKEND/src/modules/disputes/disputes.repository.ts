import type { PoolClient } from 'pg';
import { pool } from '../../config/database';
import type {
  BookingConditionReport,
  CreateConditionReportInput,
  DamageClaim,
  CreateDamageClaimInput,
  BorrowerClaimResponseInput,
  DamageClaimStatusHistory,
  DisputeStatus,
  Complaint,
  CreateComplaintInput,
  UpdateComplaintInput,
} from './disputes.types';

function requirePool() {
  if (!pool) {
    throw new Error('PostgreSQL connection settings are not configured.');
  }
  return pool;
}

export interface BookingDisputeContext {
  id: string;
  equipmentId: string;
  equipmentTitle: string;
  ownerUserId: string;
  renterId: string;
  status: string;
  returnRecordedAt: Date | null;
}

export class PostgresDisputesRepository {
  // ── 1. Condition Reports ──────────────────────────────────────────────────────

  async createConditionReport(
    bookingId: string,
    reporterId: string,
    input: CreateConditionReportInput,
  ): Promise<BookingConditionReport> {
    const p = requirePool();
    const result = await p.query(
      `INSERT INTO booking_condition_reports (
        booking_id, reporter_id, report_type, condition, notes, evidence_urls
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        booking_id AS "bookingId",
        reporter_id AS "reporterId",
        report_type AS "reportType",
        condition,
        notes,
        evidence_urls AS "evidenceUrls",
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
      [
        bookingId,
        reporterId,
        input.reportType,
        input.condition,
        input.notes,
        input.evidenceUrls,
      ],
    );
    return result.rows[0];
  }

  async listConditionReportsByBooking(bookingId: string): Promise<BookingConditionReport[]> {
    const p = requirePool();
    const result = await p.query(
      `SELECT
        cr.id,
        cr.booking_id AS "bookingId",
        cr.reporter_id AS "reporterId",
        u.full_name AS "reporterFullName",
        cr.report_type AS "reportType",
        cr.condition,
        cr.notes,
        cr.evidence_urls AS "evidenceUrls",
        cr.created_at AS "createdAt",
        cr.updated_at AS "updatedAt"
       FROM booking_condition_reports cr
       JOIN users u ON u.id = cr.reporter_id
       WHERE cr.booking_id = $1
       ORDER BY cr.created_at ASC`,
      [bookingId],
    );
    return result.rows;
  }

  // ── 2. Booking Context ────────────────────────────────────────────────────────

  async getBookingContext(bookingId: string): Promise<BookingDisputeContext | null> {
    const p = requirePool();
    const result = await p.query(
      `SELECT
        b.id,
        b.equipment_id AS "equipmentId",
        e.title AS "equipmentTitle",
        e.owner_user_id AS "ownerUserId",
        b.renter_id AS "renterId",
        b.status,
        b.return_recorded_at AS "returnRecordedAt"
       FROM bookings b
       JOIN equipment e ON e.id = b.equipment_id
       WHERE b.id = $1`,
      [bookingId],
    );
    return result.rows[0] ?? null;
  }

  // ── 3. Damage Claims ──────────────────────────────────────────────────────────

  async getActiveDamageClaimByBooking(bookingId: string): Promise<DamageClaim | null> {
    const p = requirePool();
    const result = await p.query(
      `SELECT
        dr.id,
        dr.booking_id AS "bookingId",
        dr.reporter_id AS "reporterId",
        dr.description,
        dr.status,
        dr.evidence_urls AS "evidenceUrls",
        dr.proposed_fine_amount AS "proposedFineAmount",
        dr.fine_explanation AS "fineExplanation",
        dr.borrower_response AS "borrowerResponse",
        dr.borrower_disputed AS "borrowerDisputed",
        dr.borrower_evidence_urls AS "borrowerEvidenceUrls",
        dr.borrower_responded_at AS "borrowerRespondedAt",
        dr.reopened_by_admin_id AS "reopenedByAdminId",
        dr.reopened_at AS "reopenedAt",
        dr.reopened_reason AS "reopenedReason",
        dr.resolved_by_admin_id AS "resolvedByAdminId",
        dr.resolved_at AS "resolvedAt",
        dr.admin_decision_notes AS "adminDecisionNotes",
        dr.final_approved_fine AS "finalApprovedFine",
        dr.created_at AS "createdAt",
        dr.updated_at AS "updatedAt"
       FROM damage_reports dr
       WHERE dr.booking_id = $1
         AND dr.status NOT IN ('RESOLVED', 'DISMISSED')
       LIMIT 1`,
      [bookingId],
    );
    return result.rows[0] ?? null;
  }

  async getDamageClaimById(id: string): Promise<DamageClaim | null> {
    const p = requirePool();
    const result = await p.query(
      `SELECT
        dr.id,
        dr.booking_id AS "bookingId",
        e.id AS "equipmentId",
        e.title AS "equipmentTitle",
        dr.reporter_id AS "reporterId",
        reporter.full_name AS "reporterFullName",
        b.renter_id AS "renterId",
        renter.full_name AS "renterFullName",
        dr.description,
        dr.status,
        dr.evidence_urls AS "evidenceUrls",
        dr.proposed_fine_amount AS "proposedFineAmount",
        dr.fine_explanation AS "fineExplanation",
        dr.borrower_response AS "borrowerResponse",
        dr.borrower_disputed AS "borrowerDisputed",
        dr.borrower_evidence_urls AS "borrowerEvidenceUrls",
        dr.borrower_responded_at AS "borrowerRespondedAt",
        dr.reopened_by_admin_id AS "reopenedByAdminId",
        dr.reopened_at AS "reopenedAt",
        dr.reopened_reason AS "reopenedReason",
        dr.resolved_by_admin_id AS "resolvedByAdminId",
        dr.resolved_at AS "resolvedAt",
        dr.admin_decision_notes AS "adminDecisionNotes",
        dr.final_approved_fine AS "finalApprovedFine",
        b.return_recorded_at AS "returnRecordedAt",
        dr.created_at AS "createdAt",
        dr.updated_at AS "updatedAt"
       FROM damage_reports dr
       JOIN bookings b ON b.id = dr.booking_id
       JOIN equipment e ON e.id = b.equipment_id
       JOIN users reporter ON reporter.id = dr.reporter_id
       JOIN users renter ON renter.id = b.renter_id
       WHERE dr.id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async createDamageClaim(
    bookingId: string,
    reporterId: string,
    input: CreateDamageClaimInput,
    initialStatus: DisputeStatus,
  ): Promise<DamageClaim> {
    const client = await requirePool().connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO damage_reports (
          booking_id, reporter_id, description, status, evidence_urls,
          proposed_fine_amount, fine_explanation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          bookingId,
          reporterId,
          input.description,
          initialStatus,
          input.evidenceUrls,
          input.proposedFineAmount ?? null,
          input.fineExplanation ?? null,
        ],
      );

      const claimId = result.rows[0].id;

      // Status history record
      await client.query(
        `INSERT INTO damage_report_status_history (
          damage_report_id, previous_status, new_status, actor_user_id, notes
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          claimId,
          null,
          initialStatus,
          reporterId,
          input.proposedFineAmount
            ? `Initial damage claim filed with proposed fine of ₹${input.proposedFineAmount}`
            : 'Initial damage claim filed',
        ],
      );

      await client.query('COMMIT');

      const claim = await this.getDamageClaimById(claimId);
      if (!claim) throw new Error('Claim re-fetch failed');
      return claim;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listDamageClaims(options: {
    userId?: string;
    bookingId?: string;
    status?: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: DamageClaim[]; total: number }> {
    const p = requirePool();
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (options.bookingId) {
      values.push(options.bookingId);
      conditions.push(`dr.booking_id = $${values.length}`);
    }

    if (options.userId) {
      values.push(options.userId);
      conditions.push(`(dr.reporter_id = $${values.length} OR b.renter_id = $${values.length})`);
    }

    if (options.status) {
      values.push(options.status);
      conditions.push(`dr.status = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await p.query(
      `SELECT count(*) AS total
       FROM damage_reports dr
       JOIN bookings b ON b.id = dr.booking_id
       ${whereClause}`,
      values,
    );
    const total = parseInt(countRes.rows[0]?.total ?? '0', 10);

    const offset = (options.page - 1) * options.pageSize;
    values.push(options.pageSize, offset);

    const rowsRes = await p.query(
      `SELECT
        dr.id,
        dr.booking_id AS "bookingId",
        e.id AS "equipmentId",
        e.title AS "equipmentTitle",
        dr.reporter_id AS "reporterId",
        reporter.full_name AS "reporterFullName",
        b.renter_id AS "renterId",
        renter.full_name AS "renterFullName",
        dr.description,
        dr.status,
        dr.evidence_urls AS "evidenceUrls",
        dr.proposed_fine_amount AS "proposedFineAmount",
        dr.fine_explanation AS "fineExplanation",
        dr.borrower_response AS "borrowerResponse",
        dr.borrower_disputed AS "borrowerDisputed",
        dr.borrower_evidence_urls AS "borrowerEvidenceUrls",
        dr.borrower_responded_at AS "borrowerRespondedAt",
        dr.reopened_by_admin_id AS "reopenedByAdminId",
        dr.reopened_at AS "reopenedAt",
        dr.reopened_reason AS "reopenedReason",
        dr.resolved_by_admin_id AS "resolvedByAdminId",
        dr.resolved_at AS "resolvedAt",
        dr.admin_decision_notes AS "adminDecisionNotes",
        dr.final_approved_fine AS "finalApprovedFine",
        b.return_recorded_at AS "returnRecordedAt",
        dr.created_at AS "createdAt",
        dr.updated_at AS "updatedAt"
       FROM damage_reports dr
       JOIN bookings b ON b.id = dr.booking_id
       JOIN equipment e ON e.id = b.equipment_id
       JOIN users reporter ON reporter.id = dr.reporter_id
       JOIN users renter ON renter.id = b.renter_id
       ${whereClause}
       ORDER BY dr.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    return { items: rowsRes.rows, total };
  }

  async updateBorrowerResponse(
    claimId: string,
    borrowerId: string,
    previousStatus: DisputeStatus,
    input: BorrowerClaimResponseInput,
  ): Promise<DamageClaim> {
    const client = await requirePool().connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE damage_reports
         SET status = 'UNDER_REVIEW',
             borrower_response = $2,
             borrower_disputed = $3,
             borrower_evidence_urls = $4,
             borrower_responded_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [claimId, input.response, input.disputed, input.evidenceUrls ?? []],
      );

      await client.query(
        `INSERT INTO damage_report_status_history (
          damage_report_id, previous_status, new_status, actor_user_id, notes
        ) VALUES ($1, $2, 'UNDER_REVIEW', $3, $4)`,
        [
          claimId,
          previousStatus,
          borrowerId,
          input.disputed ? 'Borrower disputed the claim/fine' : 'Borrower responded to the claim',
        ],
      );

      await client.query('COMMIT');

      const claim = await this.getDamageClaimById(claimId);
      if (!claim) throw new Error('Claim re-fetch failed');
      return claim;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async adminReopenClaim(
    claimId: string,
    adminId: string,
    previousStatus: DisputeStatus,
    reason: string,
  ): Promise<DamageClaim> {
    const client = await requirePool().connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE damage_reports
         SET status = 'UNDER_REVIEW',
             reopened_by_admin_id = $2,
             reopened_at = CURRENT_TIMESTAMP,
             reopened_reason = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [claimId, adminId, reason],
      );

      await client.query(
        `INSERT INTO damage_report_status_history (
          damage_report_id, previous_status, new_status, actor_user_id, notes
        ) VALUES ($1, $2, 'UNDER_REVIEW', $3, $4)`,
        [claimId, previousStatus, adminId, `Admin reopened case: ${reason}`],
      );

      await client.query(
        `INSERT INTO admin_audit_log (
          admin_user_id, action, target_type, target_id, metadata
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          adminId,
          'REOPEN_DAMAGE_CLAIM',
          'damage_report',
          claimId,
          JSON.stringify({ reason, previousStatus }),
        ],
      );

      await client.query('COMMIT');

      const claim = await this.getDamageClaimById(claimId);
      if (!claim) throw new Error('Claim re-fetch failed');
      return claim;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async adminResolveClaim(
    claimId: string,
    adminId: string,
    previousStatus: DisputeStatus,
    decision: 'RESOLVED' | 'DISMISSED',
    finalApprovedFine: number | null,
    notes: string,
  ): Promise<DamageClaim> {
    const client = await requirePool().connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE damage_reports
         SET status = $2,
             resolved_by_admin_id = $3,
             resolved_at = CURRENT_TIMESTAMP,
             admin_decision_notes = $4,
             final_approved_fine = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [claimId, decision, adminId, notes, finalApprovedFine],
      );

      await client.query(
        `INSERT INTO damage_report_status_history (
          damage_report_id, previous_status, new_status, actor_user_id, notes
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          claimId,
          previousStatus,
          decision,
          adminId,
          decision === 'RESOLVED'
            ? `Admin resolved dispute with approved fine of ₹${finalApprovedFine ?? 0}. Notes: ${notes}`
            : `Admin dismissed claim. Notes: ${notes}`,
        ],
      );

      await client.query(
        `INSERT INTO admin_audit_log (
          admin_user_id, action, target_type, target_id, metadata
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          adminId,
          decision === 'RESOLVED' ? 'RESOLVE_DAMAGE_CLAIM' : 'DISMISS_DAMAGE_CLAIM',
          'damage_report',
          claimId,
          JSON.stringify({ decision, finalApprovedFine, notes }),
        ],
      );

      await client.query('COMMIT');

      const claim = await this.getDamageClaimById(claimId);
      if (!claim) throw new Error('Claim re-fetch failed');
      return claim;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getStatusHistory(claimId: string): Promise<DamageClaimStatusHistory[]> {
    const p = requirePool();
    const result = await p.query(
      `SELECT
        h.id,
        h.damage_report_id AS "damageReportId",
        h.previous_status AS "previousStatus",
        h.new_status AS "newStatus",
        h.actor_user_id AS "actorUserId",
        u.full_name AS "actorFullName",
        h.notes,
        h.created_at AS "createdAt"
       FROM damage_report_status_history h
       LEFT JOIN users u ON u.id = h.actor_user_id
       WHERE h.damage_report_id = $1
       ORDER BY h.created_at ASC`,
      [claimId],
    );
    return result.rows;
  }

  // ── 4. Complaints ─────────────────────────────────────────────────────────────

  async createComplaint(
    complainantId: string,
    input: CreateComplaintInput,
  ): Promise<Complaint> {
    const p = requirePool();
    const result = await p.query(
      `INSERT INTO complaints (
        booking_id, complainant_id, category, description, evidence_urls, status
      ) VALUES ($1, $2, $3, $4, $5, 'OPEN')
      RETURNING
        id,
        booking_id AS "bookingId",
        complainant_id AS "complainantId",
        category,
        description,
        evidence_urls AS "evidenceUrls",
        status,
        admin_notes AS "adminNotes",
        resolved_by_admin_id AS "resolvedByAdminId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
      [
        input.bookingId ?? null,
        complainantId,
        input.category,
        input.description,
        input.evidenceUrls ?? [],
      ],
    );
    return result.rows[0];
  }

  async listComplaints(options: {
    complainantId?: string;
    bookingId?: string;
    status?: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: Complaint[]; total: number }> {
    const p = requirePool();
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (options.complainantId) {
      values.push(options.complainantId);
      conditions.push(`c.complainant_id = $${values.length}`);
    }

    if (options.bookingId) {
      values.push(options.bookingId);
      conditions.push(`c.booking_id = $${values.length}`);
    }

    if (options.status) {
      values.push(options.status);
      conditions.push(`c.status = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await p.query(
      `SELECT count(*) AS total FROM complaints c ${whereClause}`,
      values,
    );
    const total = parseInt(countRes.rows[0]?.total ?? '0', 10);

    const offset = (options.page - 1) * options.pageSize;
    values.push(options.pageSize, offset);

    const rowsRes = await p.query(
      `SELECT
        c.id,
        c.booking_id AS "bookingId",
        c.complainant_id AS "complainantId",
        u.full_name AS "complainantFullName",
        c.category,
        c.description,
        c.evidence_urls AS "evidenceUrls",
        c.status,
        c.admin_notes AS "adminNotes",
        c.resolved_by_admin_id AS "resolvedByAdminId",
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt"
       FROM complaints c
       JOIN users u ON u.id = c.complainant_id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    return { items: rowsRes.rows, total };
  }

  async updateComplaint(
    id: string,
    adminId: string,
    input: UpdateComplaintInput,
  ): Promise<Complaint | null> {
    const p = requirePool();
    const result = await p.query(
      `UPDATE complaints
       SET status = $2,
           admin_notes = COALESCE($3, admin_notes),
           resolved_by_admin_id = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING
        id,
        booking_id AS "bookingId",
        complainant_id AS "complainantId",
        category,
        description,
        evidence_urls AS "evidenceUrls",
        status,
        admin_notes AS "adminNotes",
        resolved_by_admin_id AS "resolvedByAdminId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
      [id, input.status, input.adminNotes ?? null, adminId],
    );
    return result.rows[0] ?? null;
  }
}

export const disputesRepository = new PostgresDisputesRepository();
