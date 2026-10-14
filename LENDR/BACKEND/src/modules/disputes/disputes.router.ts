import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../../middleware/http-error';
import { createAuthenticate, requireAdmin, requireStudent } from '../auth/auth.middleware';
import type { AuthDependencies } from '../auth/auth.dependencies';
import { disputesService as defaultDisputesService, DisputesService } from './disputes.service';
import {
  createConditionReportSchema,
  createDamageClaimSchema,
  borrowerClaimResponseSchema,
  adminReopenClaimSchema,
  adminResolveClaimSchema,
  createComplaintSchema,
  updateComplaintSchema,
} from './disputes.validation';

const idSchema = z.string().uuid();

function requireId(val: unknown, entityName = 'ID'): string {
  const parsed = idSchema.safeParse(val);
  if (!parsed.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', `The ${entityName} is invalid.`);
  }
  return parsed.data;
}

function requireParsed<T>(
  schema: { safeParse: (val: unknown) => { success: boolean; data?: T; error?: z.ZodError } },
  val: unknown,
  message = 'The request data is invalid.',
): T {
  const parsed = schema.safeParse(val);
  if (!parsed.success || parsed.data === undefined) {
    throw new HttpError(400, 'VALIDATION_ERROR', message);
  }
  return parsed.data;
}

// ── 1. Booking Disputes Router (mounted on /api/v1/bookings) ────────────────────

export function createBookingDisputesRouter(
  authDependencies: AuthDependencies,
  disputesService: DisputesService = defaultDisputesService,
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authDependencies);

  // Condition Evidence: POST /api/v1/bookings/:id/condition-reports
  router.post('/:id/condition-reports', authenticate, async (req: Request, res: Response) => {
    const bookingId = requireId(req.params.id, 'booking ID');
    const input = requireParsed(createConditionReportSchema, req.body);
    const report = await disputesService.createConditionReport(
      bookingId,
      req.authUser!.id,
      req.authUser!.role,
      input,
    );
    res.status(201).json({ conditionReport: report });
  });

  // Condition Evidence: GET /api/v1/bookings/:id/condition-reports
  router.get('/:id/condition-reports', authenticate, async (req: Request, res: Response) => {
    const bookingId = requireId(req.params.id, 'booking ID');
    const items = await disputesService.listConditionReports(
      bookingId,
      req.authUser!.id,
      req.authUser!.role,
    );
    res.status(200).json({ items });
  });

  // Damage Claims: POST /api/v1/bookings/:id/damage-claims
  router.post('/:id/damage-claims', authenticate, requireStudent, async (req: Request, res: Response) => {
    const bookingId = requireId(req.params.id, 'booking ID');
    const input = requireParsed(createDamageClaimSchema, req.body);
    const claim = await disputesService.createDamageClaim(
      bookingId,
      req.authUser!.id,
      input,
    );
    res.status(201).json({ damageClaim: claim });
  });

  // Damage Claims: GET /api/v1/bookings/:id/damage-claims
  router.get('/:id/damage-claims', authenticate, async (req: Request, res: Response) => {
    const bookingId = requireId(req.params.id, 'booking ID');
    const result = await disputesService.listDamageClaims(
      req.authUser!.id,
      req.authUser!.role,
      { bookingId, page: 1, pageSize: 50 },
    );
    res.status(200).json({ items: result.items });
  });

  return router;
}

// ── 2. Damage Claims Router (mounted on /api/v1/damage-claims) ──────────────────

export function createDamageClaimsRouter(
  authDependencies: AuthDependencies,
  disputesService: DisputesService = defaultDisputesService,
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authDependencies);

  // List claims: GET /api/v1/damage-claims
  router.get('/', authenticate, async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
    const status = req.query.status ? String(req.query.status) : undefined;

    const result = await disputesService.listDamageClaims(
      req.authUser!.id,
      req.authUser!.role,
      { status, page, pageSize },
    );

    res.status(200).json({
      items: result.items,
      pagination: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / pageSize),
      },
    });
  });

  // Get claim by ID: GET /api/v1/damage-claims/:id
  router.get('/:id', authenticate, async (req: Request, res: Response) => {
    const claimId = requireId(req.params.id, 'claim ID');
    const result = await disputesService.getDamageClaim(
      claimId,
      req.authUser!.id,
      req.authUser!.role,
    );
    res.status(200).json({
      damageClaim: result.claim,
      statusHistory: result.history,
    });
  });

  // Borrower response: POST /api/v1/damage-claims/:id/respond
  router.post('/:id/respond', authenticate, requireStudent, async (req: Request, res: Response) => {
    const claimId = requireId(req.params.id, 'claim ID');
    const input = requireParsed(borrowerClaimResponseSchema, req.body);
    const claim = await disputesService.respondToClaim(
      claimId,
      req.authUser!.id,
      input,
    );
    res.status(200).json({ damageClaim: claim });
  });

  // Admin reopen case: POST /api/v1/damage-claims/:id/admin-reopen
  router.post('/:id/admin-reopen', authenticate, requireAdmin, async (req: Request, res: Response) => {
    const claimId = requireId(req.params.id, 'claim ID');
    const input = requireParsed(adminReopenClaimSchema, req.body);
    const claim = await disputesService.adminReopenClaim(
      claimId,
      req.authUser!.id,
      input.reason,
    );
    res.status(200).json({ damageClaim: claim });
  });

  // Admin resolve / dismiss: POST /api/v1/damage-claims/:id/admin-resolve
  router.post('/:id/admin-resolve', authenticate, requireAdmin, async (req: Request, res: Response) => {
    const claimId = requireId(req.params.id, 'claim ID');
    const input = requireParsed(adminResolveClaimSchema, req.body);
    const claim = await disputesService.adminResolveClaim(
      claimId,
      req.authUser!.id,
      input,
    );
    res.status(200).json({ damageClaim: claim });
  });

  return router;
}

// ── 3. Complaints Router (mounted on /api/v1/complaints) ─────────────────────────

export function createComplaintsRouter(
  authDependencies: AuthDependencies,
  disputesService: DisputesService = defaultDisputesService,
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authDependencies);

  // Student submit complaint: POST /api/v1/complaints
  router.post('/', authenticate, requireStudent, async (req: Request, res: Response) => {
    const input = requireParsed(createComplaintSchema, req.body);
    const complaint = await disputesService.createComplaint(
      req.authUser!.id,
      input,
    );
    res.status(201).json({ complaint });
  });

  // Student list own complaints: GET /api/v1/complaints/me
  router.get('/me', authenticate, async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
    const result = await disputesService.listComplaints(
      req.authUser!.id,
      'STUDENT',
      { page, pageSize },
    );
    res.status(200).json({
      items: result.items,
      pagination: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / pageSize),
      },
    });
  });

  // Admin list all complaints: GET /api/v1/complaints
  router.get('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
    const status = req.query.status ? String(req.query.status) : undefined;
    const result = await disputesService.listComplaints(
      req.authUser!.id,
      'ADMIN',
      { status, page, pageSize },
    );
    res.status(200).json({
      items: result.items,
      pagination: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / pageSize),
      },
    });
  });

  // Admin update complaint: PATCH /api/v1/complaints/:id
  router.patch('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
    const complaintId = requireId(req.params.id, 'complaint ID');
    const input = requireParsed(updateComplaintSchema, req.body);
    const complaint = await disputesService.updateComplaint(
      complaintId,
      req.authUser!.id,
      input,
    );
    res.status(200).json({ complaint });
  });

  return router;
}
