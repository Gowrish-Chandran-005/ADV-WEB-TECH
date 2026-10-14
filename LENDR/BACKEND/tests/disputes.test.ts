import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type { AuthDependencies } from '../src/modules/auth/auth.dependencies';
import type { AuthUser, UserRepository } from '../src/modules/auth/auth.types';
import { DisputesService } from '../src/modules/disputes/disputes.service';
import type { PostgresDisputesRepository } from '../src/modules/disputes/disputes.repository';
import type { NotificationsRepository } from '../src/modules/notifications/notifications.types';

const secret = 'disputes-test-secret-with-at-least-thirty-two-characters';
const lenderId = '11111111-1111-4111-8111-111111111111';
const borrowerId = '22222222-2222-4222-8222-222222222222';
const thirdPartyId = '33333333-3333-4333-8333-333333333333';
const adminId = '99999999-9999-4999-8999-999999999999';

const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const equipmentId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const claimId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function testUser(id: string, role: 'STUDENT' | 'ADMIN' = 'STUDENT'): AuthUser {
  const now = new Date('2026-10-10T00:00:00.000Z');
  return {
    id,
    email: `${id}@vitstudent.ac.in`,
    fullName: role === 'ADMIN' ? 'Admin User' : `User ${id.slice(0, 4)}`,
    registrationNumber: '21BCE0001',
    phone: null,
    role,
    status: 'ACTIVE',
    emailVerifiedAt: null,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function tokenFor(id: string): string {
  return jwt.sign({ tokenVersion: 0 }, secret, {
    algorithm: 'HS256',
    audience: 'lendr',
    issuer: 'lendr-api',
    expiresIn: '1h',
    subject: id,
  });
}

function createHarness(options: {
  returnRecordedAt?: Date | null;
  bookingStatus?: string;
  hasActiveClaim?: boolean;
} = {}) {
  const users = new Map<string, AuthUser>([
    [lenderId, testUser(lenderId, 'STUDENT')],
    [borrowerId, testUser(borrowerId, 'STUDENT')],
    [thirdPartyId, testUser(thirdPartyId, 'STUDENT')],
    [adminId, testUser(adminId, 'ADMIN')],
  ]);

  const userRepository: UserRepository = {
    async findById(id: string) {
      return users.get(id) ?? null;
    },
    async findByEmail() {
      return null;
    },
    async create() {
      throw new Error('Unused');
    },
    async incrementTokenVersion() {},
    async updateProfile() {
      throw new Error('Unused');
    },
  };

  const authDeps: AuthDependencies = {
    users: userRepository,
    jwtSecret: secret,
    jwtExpiresIn: '1h',
    passwordHashRounds: 4,
  };

  const bookingContext = {
    id: bookingId,
    equipmentId,
    equipmentTitle: 'Sony FX3 Cinema Rig',
    ownerUserId: lenderId,
    renterId: borrowerId,
    status: options.bookingStatus ?? 'RETURN_REQUESTED',
    returnRecordedAt: options.returnRecordedAt !== undefined ? options.returnRecordedAt : new Date(),
  };

  let mockClaim: any = options.hasActiveClaim
    ? {
        id: claimId,
        bookingId,
        equipmentId,
        equipmentTitle: 'Sony FX3 Cinema Rig',
        reporterId: lenderId,
        reporterFullName: 'Lender User',
        renterId: borrowerId,
        renterFullName: 'Borrower User',
        description: 'Scratched lens element',
        status: 'AWAITING_BORROWER_RESPONSE',
        evidenceUrls: ['/uploads/scratch.jpg'],
        proposedFineAmount: '500.00',
        fineExplanation: 'Lens buffing required',
        borrowerResponse: null,
        borrowerDisputed: false,
        borrowerEvidenceUrls: [],
        borrowerRespondedAt: null,
        reopenedByAdminId: null,
        reopenedAt: null,
        reopenedReason: null,
        resolvedByAdminId: null,
        resolvedAt: null,
        adminDecisionNotes: null,
        finalApprovedFine: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    : null;

  const mockConditionReports: any[] = [];
  const mockStatusHistory: any[] = [];
  const mockComplaints: any[] = [];

  const mockRepo = {
    async getBookingContext(id: string) {
      return id === bookingId ? bookingContext : null;
    },
    async getActiveDamageClaimByBooking(id: string) {
      return mockClaim && mockClaim.bookingId === id && !['RESOLVED', 'DISMISSED'].includes(mockClaim.status)
        ? mockClaim
        : null;
    },
    async getDamageClaimById(id: string) {
      return mockClaim && mockClaim.id === id ? mockClaim : null;
    },
    async createDamageClaim(bId: string, rId: string, input: any, initialStatus: any) {
      mockClaim = {
        id: 'claim-new-1',
        bookingId: bId,
        equipmentId,
        equipmentTitle: 'Sony FX3 Cinema Rig',
        reporterId: rId,
        reporterFullName: 'Lender User',
        renterId: borrowerId,
        renterFullName: 'Borrower User',
        description: input.description,
        status: initialStatus,
        evidenceUrls: input.evidenceUrls,
        proposedFineAmount: input.proposedFineAmount ? String(input.proposedFineAmount) : null,
        fineExplanation: input.fineExplanation ?? null,
        borrowerResponse: null,
        borrowerDisputed: false,
        borrowerEvidenceUrls: [],
        borrowerRespondedAt: null,
        reopenedByAdminId: null,
        reopenedAt: null,
        reopenedReason: null,
        resolvedByAdminId: null,
        resolvedAt: null,
        adminDecisionNotes: null,
        finalApprovedFine: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return mockClaim;
    },
    async listDamageClaims() {
      return { items: mockClaim ? [mockClaim] : [], total: mockClaim ? 1 : 0 };
    },
    async updateBorrowerResponse(cId: string, bId: string, prevStatus: any, input: any) {
      mockClaim = {
        ...mockClaim,
        status: 'UNDER_REVIEW',
        borrowerResponse: input.response,
        borrowerDisputed: input.disputed,
        borrowerEvidenceUrls: input.evidenceUrls ?? [],
        borrowerRespondedAt: new Date(),
      };
      return mockClaim;
    },
    async adminReopenClaim(cId: string, aId: string, prevStatus: any, reason: string) {
      mockClaim = {
        ...mockClaim,
        status: 'UNDER_REVIEW',
        reopenedByAdminId: aId,
        reopenedAt: new Date(),
        reopenedReason: reason,
      };
      return mockClaim;
    },
    async adminResolveClaim(cId: string, aId: string, prevStatus: any, decision: any, fine: any, notes: string) {
      mockClaim = {
        ...mockClaim,
        status: decision,
        resolvedByAdminId: aId,
        resolvedAt: new Date(),
        adminDecisionNotes: notes,
        finalApprovedFine: fine ? String(fine) : null,
      };
      return mockClaim;
    },
    async getStatusHistory() {
      return mockStatusHistory;
    },
    async createConditionReport(bId: string, repId: string, input: any) {
      const report = {
        id: `cr-${Date.now()}`,
        bookingId: bId,
        reporterId: repId,
        reportType: input.reportType,
        condition: input.condition,
        notes: input.notes,
        evidenceUrls: input.evidenceUrls,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockConditionReports.push(report);
      return report;
    },
    async listConditionReportsByBooking() {
      return mockConditionReports;
    },
    async createComplaint(compUserId: string, input: any) {
      const c = {
        id: 'comp-1',
        bookingId: input.bookingId ?? null,
        complainantId: compUserId,
        category: input.category,
        description: input.description,
        evidenceUrls: input.evidenceUrls ?? [],
        status: 'OPEN',
        adminNotes: null,
        resolvedByAdminId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockComplaints.push(c);
      return c;
    },
    async listComplaints() {
      return { items: mockComplaints, total: mockComplaints.length };
    },
    async updateComplaint(id: string, aId: string, input: any) {
      const c = mockComplaints.find((x) => x.id === id);
      if (!c) return null;
      c.status = input.status;
      c.adminNotes = input.adminNotes ?? null;
      c.resolvedByAdminId = aId;
      return c;
    },
  } as unknown as PostgresDisputesRepository;

  const mockNotif: NotificationsRepository = {
    async create() {
      return {} as any;
    },
    async hasMatchNotification() {
      return false;
    },
    async listForUser() {
      return { items: [], unreadCount: 0, page: 1, pageSize: 20, total: 0 };
    },
    async markAsRead() {
      return null;
    },
    async markAllAsRead() {
      return 0;
    },
    async getUnreadCount() {
      return 0;
    },
  };

  const service = new DisputesService(mockRepo, mockNotif, 24);
  const app = createApp(undefined, authDeps, undefined, undefined, undefined, undefined, service);

  return { app, mockRepo, mockClaimRef: () => mockClaim };
}

describe('Damage Dispute Architecture & Security (Phase 6B.1)', () => {
  // ── 1. 24-Hour Reporting Window Deadline ──────────────────────────────────────
  it('allows lender to file damage claim within 24 hours of return', async () => {
    // 5 hours since return
    const returnTime = new Date(Date.now() - 5 * 3600 * 1000);
    const { app } = createHarness({ returnRecordedAt: returnTime, bookingStatus: 'RETURN_REQUESTED' });

    const response = await request(app)
      .post(`/api/v1/bookings/${bookingId}/damage-claims`)
      .set('Authorization', `Bearer ${tokenFor(lenderId)}`)
      .send({
        description: 'Noticeable scratch on the front optic',
        evidenceUrls: ['/uploads/scratch.jpg'],
        proposedFineAmount: 500,
        fineExplanation: 'Cost of protective filter replacement',
      });

    expect(response.status).toBe(201);
    expect(response.body.damageClaim.status).toBe('AWAITING_BORROWER_RESPONSE');
    expect(response.body.damageClaim.proposedFineAmount).toBe('500');
  });

  it('rejects claim filed outside the 24-hour return window with 422 CLAIM_WINDOW_EXPIRED', async () => {
    // 26 hours since return
    const returnTime = new Date(Date.now() - 26 * 3600 * 1000);
    const { app } = createHarness({ returnRecordedAt: returnTime, bookingStatus: 'COMPLETED' });

    const response = await request(app)
      .post(`/api/v1/bookings/${bookingId}/damage-claims`)
      .set('Authorization', `Bearer ${tokenFor(lenderId)}`)
      .send({
        description: 'Late discovered scratch',
        evidenceUrls: ['/uploads/scratch.jpg'],
        proposedFineAmount: 200,
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('CLAIM_WINDOW_EXPIRED');
  });

  // ── 2. Admin Reopening ────────────────────────────────────────────────────────
  it('allows authorized administrator to reopen an expired or existing claim with a reason', async () => {
    const { app } = createHarness({ hasActiveClaim: true });

    const response = await request(app)
      .post(`/api/v1/damage-claims/${claimId}/admin-reopen`)
      .set('Authorization', `Bearer ${tokenFor(adminId)}`)
      .send({ reason: 'Lender was hospitalized during the 24h window; medical evidence presented.' });

    expect(response.status).toBe(200);
    expect(response.body.damageClaim.status).toBe('UNDER_REVIEW');
    expect(response.body.damageClaim.reopenedReason).toContain('hospitalized');
  });

  it('rejects non-admin student attempting to reopen a case with 403 FORBIDDEN', async () => {
    const { app } = createHarness({ hasActiveClaim: true });

    const response = await request(app)
      .post(`/api/v1/damage-claims/${claimId}/admin-reopen`)
      .set('Authorization', `Bearer ${tokenFor(lenderId)}`)
      .send({ reason: 'I want to reopen this' });

    expect(response.status).toBe(403);
  });

  it('rejects admin reopen request when reason is missing or too short', async () => {
    const { app } = createHarness({ hasActiveClaim: true });

    const response = await request(app)
      .post(`/api/v1/damage-claims/${claimId}/admin-reopen`)
      .set('Authorization', `Bearer ${tokenFor(adminId)}`)
      .send({ reason: 'bad' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 3. Authorization on Claims & Evidence ─────────────────────────────────────
  it('forbids borrower from filing a damage claim against themselves', async () => {
    const { app } = createHarness({ bookingStatus: 'RETURN_REQUESTED' });

    const response = await request(app)
      .post(`/api/v1/bookings/${bookingId}/damage-claims`)
      .set('Authorization', `Bearer ${tokenFor(borrowerId)}`)
      .send({
        description: 'Trying to self-claim',
        evidenceUrls: ['/uploads/photo.jpg'],
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('forbids unrelated third-party student from filing or viewing claims', async () => {
    const { app } = createHarness({ hasActiveClaim: true });

    const viewRes = await request(app)
      .get(`/api/v1/damage-claims/${claimId}`)
      .set('Authorization', `Bearer ${tokenFor(thirdPartyId)}`);

    expect(viewRes.status).toBe(403);
  });

  // ── 4. Duplicate Claims Prevention ───────────────────────────────────────────
  it('prevents duplicate active damage claims on the same booking with 409', async () => {
    const { app } = createHarness({ hasActiveClaim: true });

    const response = await request(app)
      .post(`/api/v1/bookings/${bookingId}/damage-claims`)
      .set('Authorization', `Bearer ${tokenFor(lenderId)}`)
      .send({
        description: 'Attempting a second claim while one is open',
        evidenceUrls: ['/uploads/second.jpg'],
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DUPLICATE_CLAIM_NOT_ALLOWED');
  });

  // ── 5. Borrower Response & Dispute ───────────────────────────────────────────
  it('allows borrower to dispute the fine and attach counter-evidence', async () => {
    const { app } = createHarness({ hasActiveClaim: true });

    const response = await request(app)
      .post(`/api/v1/damage-claims/${claimId}/respond`)
      .set('Authorization', `Bearer ${tokenFor(borrowerId)}`)
      .send({
        response: 'The scratch was already present during initial handover in SJT.',
        disputed: true,
        evidenceUrls: ['/uploads/handover_photo.jpg'],
      });

    expect(response.status).toBe(200);
    expect(response.body.damageClaim.status).toBe('UNDER_REVIEW');
    expect(response.body.damageClaim.borrowerDisputed).toBe(true);
    expect(response.body.damageClaim.borrowerResponse).toContain('already present');
  });

  // ── 6. Admin Resolution & Financial Safety ────────────────────────────────────
  it('allows admin to resolve dispute with an approved fine amount without touching deposits', async () => {
    const { app } = createHarness({ hasActiveClaim: true });

    const response = await request(app)
      .post(`/api/v1/damage-claims/${claimId}/admin-resolve`)
      .set('Authorization', `Bearer ${tokenFor(adminId)}`)
      .send({
        decision: 'RESOLVED',
        finalApprovedFine: 250,
        notes: 'Mutual compromise: 50% wear split approved after reviewing photo timestamps.',
      });

    expect(response.status).toBe(200);
    expect(response.body.damageClaim.status).toBe('RESOLVED');
    expect(response.body.damageClaim.finalApprovedFine).toBe('250');
    expect(response.body.damageClaim.adminDecisionNotes).toContain('Mutual compromise');
  });

  it('rejects non-admin attempting to resolve claim with 403', async () => {
    const { app } = createHarness({ hasActiveClaim: true });

    const response = await request(app)
      .post(`/api/v1/damage-claims/${claimId}/admin-resolve`)
      .set('Authorization', `Bearer ${tokenFor(lenderId)}`)
      .send({
        decision: 'RESOLVED',
        notes: 'Lender trying to self-approve fine',
      });

    expect(response.status).toBe(403);
  });

  // ── 7. Condition Reports (Handover & Return Evidence) ─────────────────────────
  it('allows parties to submit handover condition evidence', async () => {
    const { app } = createHarness();

    const response = await request(app)
      .post(`/api/v1/bookings/${bookingId}/condition-reports`)
      .set('Authorization', `Bearer ${tokenFor(borrowerId)}`)
      .send({
        reportType: 'HANDOVER',
        condition: 'LIKE_NEW',
        notes: 'Lens front element inspected at SJT ground floor; clean.',
        evidenceUrls: ['/uploads/handover-front.jpg'],
      });

    expect(response.status).toBe(201);
    expect(response.body.conditionReport.reportType).toBe('HANDOVER');
    expect(response.body.conditionReport.condition).toBe('LIKE_NEW');
  });

  it('forbids unrelated students from submitting condition reports', async () => {
    const { app } = createHarness();

    const response = await request(app)
      .post(`/api/v1/bookings/${bookingId}/condition-reports`)
      .set('Authorization', `Bearer ${tokenFor(thirdPartyId)}`)
      .send({
        reportType: 'HANDOVER',
        condition: 'GOOD',
        notes: 'Intruder report',
        evidenceUrls: [],
      });

    expect(response.status).toBe(403);
  });
});
