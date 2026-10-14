import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { HttpError } from '../../middleware/http-error';
import { createAuthenticate, requireStudent } from '../auth/auth.middleware';
import type { AuthDependencies } from '../auth/auth.dependencies';
import { requireJwtSecret, verifyAccessToken } from '../auth/auth.security';
import { wantedService as defaultWantedService, WantedService } from './wanted.service';
import {
  createOfferSchema,
  createWantedSchema,
  respondOfferSchema,
  updateWantedSchema,
  wantedQuerySchema,
} from './wanted.validation';

const idSchema = z.string().uuid();

function requireId(val: unknown, entityName = 'ID'): string {
  const parsed = idSchema.safeParse(val);
  if (!parsed.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', `The ${entityName} is invalid.`);
  }
  return parsed.data;
}

export function createWantedRouter(
  authDependencies: AuthDependencies,
  wantedService: WantedService = defaultWantedService,
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authDependencies);
  const student = [authenticate, requireStudent] as const;

  // Optional authentication middleware for GET /:id so authors see offers
  const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.header('authorization');
      const match = header?.match(/^Bearer ([^\s]+)$/i);
      if (match) {
        const token = verifyAccessToken(match[1], requireJwtSecret(authDependencies.jwtSecret));
        const user = await authDependencies.users.findById(token.userId);
        if (user && user.status === 'ACTIVE' && user.tokenVersion === token.tokenVersion) {
          req.authUser = user;
        }
      }
    } catch {
      // Ignore token failure for public endpoints
    }
    next();
  };

  // ── 1. GET /api/v1/wanted ── Public paginated feed
  router.get('/', async (request, response) => {
    const query = wantedQuerySchema.safeParse(request.query);
    if (!query.success) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'The query parameters are invalid.');
    }

    const { q, category, status, urgency, page, pageSize, sort } = query.data;
    const result = await wantedService.listRequests({
      query: q,
      category,
      status,
      urgency,
      page,
      pageSize,
      sort,
    });

    response.status(200).json({
      items: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize) || 1,
      },
    });
  });

  // ── 2. POST /api/v1/wanted ── Create request
  router.post('/', ...student, async (request, response) => {
    const parsedBody = createWantedSchema.safeParse(request.body);
    if (!parsedBody.success) {
      const firstIssue = parsedBody.error.issues[0]?.message || 'The request data is invalid.';
      throw new HttpError(400, 'VALIDATION_ERROR', firstIssue);
    }

    const created = await wantedService.createRequest(request.authUser!.id, parsedBody.data);
    response.status(201).json({ request: created });
  });

  // ── 3. GET /api/v1/wanted/:id/matches ── Active available equipment matches
  router.get('/:id/matches', async (request, response) => {
    const id = requireId(request.params.id, 'wanted request ID');
    const matches = await wantedService.findMatchesForRequest(id);
    response.status(200).json({ items: matches });
  });

  // ── 4. POST /api/v1/wanted/:id/offers ── Submit gear offer
  router.post('/:id/offers', ...student, async (request, response) => {
    const id = requireId(request.params.id, 'wanted request ID');
    const parsedBody = createOfferSchema.safeParse(request.body);
    if (!parsedBody.success) {
      const firstIssue = parsedBody.error.issues[0]?.message || 'The offer data is invalid.';
      throw new HttpError(400, 'VALIDATION_ERROR', firstIssue);
    }

    const result = await wantedService.createOffer(
      request.authUser!.id,
      id,
      parsedBody.data,
    );

    if (result === 'request_not_found') {
      throw new HttpError(404, 'WANTED_REQUEST_NOT_FOUND', 'The wanted request was not found.');
    }
    if (result === 'request_not_open') {
      throw new HttpError(409, 'REQUEST_NOT_OPEN', 'Offers can only be submitted for open requests.');
    }
    if (result === 'self_offer') {
      throw new HttpError(403, 'SELF_OFFER_NOT_ALLOWED', 'You cannot offer equipment on your own wanted request.');
    }
    if (result === 'equipment_not_found') {
      throw new HttpError(404, 'EQUIPMENT_NOT_FOUND', 'The offered equipment does not exist.');
    }
    if (result === 'equipment_not_owned') {
      throw new HttpError(403, 'EQUIPMENT_NOT_OWNED', 'You can only offer equipment that you own.');
    }
    if (result === 'equipment_inactive') {
      throw new HttpError(422, 'EQUIPMENT_INACTIVE', 'Offered equipment must be active.');
    }
    if (result === 'equipment_unavailable') {
      throw new HttpError(409, 'EQUIPMENT_UNAVAILABLE', 'Offered equipment has conflicting bookings or maintenance for requested dates.');
    }
    if (result === 'duplicate_offer') {
      throw new HttpError(409, 'DUPLICATE_OFFER', 'You already have a pending offer for this equipment on this request.');
    }

    response.status(201).json({ offer: result });
  });

  // ── 5. POST /api/v1/wanted/offers/:offerId/respond ── Author responds to offer
  router.post('/offers/:offerId/respond', ...student, async (request, response) => {
    const offerId = requireId(request.params.offerId, 'offer ID');
    const parsedBody = respondOfferSchema.safeParse(request.body);
    if (!parsedBody.success) {
      const firstIssue = parsedBody.error.issues[0]?.message || 'The response data is invalid.';
      throw new HttpError(400, 'VALIDATION_ERROR', firstIssue);
    }

    const result = await wantedService.respondToOffer(
      request.authUser!.id,
      offerId,
      parsedBody.data,
    );

    if (result === 'offer_not_found') {
      throw new HttpError(404, 'OFFER_NOT_FOUND', 'The offer was not found.');
    }
    if (result === 'request_not_found') {
      throw new HttpError(404, 'WANTED_REQUEST_NOT_FOUND', 'The wanted request was not found.');
    }
    if (result === 'forbidden') {
      throw new HttpError(403, 'FORBIDDEN', 'Only the author of the wanted request can respond to offers.');
    }
    if (result === 'offer_not_pending') {
      throw new HttpError(409, 'OFFER_NOT_PENDING', 'This offer is no longer pending.');
    }
    if (result === 'request_not_open') {
      throw new HttpError(409, 'REQUEST_NOT_OPEN', 'This wanted request is no longer open.');
    }
    if (result === 'already_accepted') {
      throw new HttpError(409, 'OFFER_ALREADY_ACCEPTED', 'Another offer has already been accepted for this request.');
    }
    if (result === 'equipment_unavailable') {
      throw new HttpError(409, 'EQUIPMENT_UNAVAILABLE', 'The offered equipment is no longer available for the requested dates.');
    }

    response.status(200).json({ offer: result });
  });

  // ── 6. GET /api/v1/wanted/:id ── Request details + offers (if author)
  router.get('/:id', optionalAuth, async (request, response) => {
    const id = requireId(request.params.id, 'wanted request ID');
    const wantedRequest = await wantedService.getRequestById(id);
    if (!wantedRequest) {
      throw new HttpError(404, 'WANTED_REQUEST_NOT_FOUND', 'The wanted request was not found.');
    }

    let offers = undefined;
    // Reveal full offers only to the request author
    if (request.authUser && request.authUser.id === wantedRequest.userId) {
      offers = await wantedService.getOffersForRequest(id);
    }

    response.status(200).json({
      request: wantedRequest,
      offers,
    });
  });

  // ── 7. PATCH /api/v1/wanted/:id ── Author edit
  router.patch('/:id', ...student, async (request, response) => {
    const id = requireId(request.params.id, 'wanted request ID');
    const parsedBody = updateWantedSchema.safeParse(request.body);
    if (!parsedBody.success) {
      const firstIssue = parsedBody.error.issues[0]?.message || 'The request data is invalid.';
      throw new HttpError(400, 'VALIDATION_ERROR', firstIssue);
    }

    const result = await wantedService.updateRequest(
      id,
      request.authUser!.id,
      parsedBody.data,
    );

    if (result === 'not_found') {
      throw new HttpError(404, 'WANTED_REQUEST_NOT_FOUND', 'The wanted request was not found.');
    }
    if (result === 'not_open') {
      throw new HttpError(409, 'REQUEST_NOT_EDITABLE', 'Only open requests can be edited.');
    }

    response.status(200).json({ request: result });
  });

  // ── 8. DELETE /api/v1/wanted/:id ── Author withdrawal
  router.delete('/:id', ...student, async (request, response) => {
    const id = requireId(request.params.id, 'wanted request ID');
    const result = await wantedService.withdrawRequest(id, request.authUser!.id);
    if (result === 'not_found') {
      throw new HttpError(404, 'WANTED_REQUEST_NOT_FOUND', 'The wanted request was not found.');
    }
    response.status(200).json({ status: 'withdrawn' });
  });

  return router;
}
