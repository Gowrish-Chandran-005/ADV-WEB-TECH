import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../middleware/http-error';
import { createAuthenticate, requireStudent } from '../auth/auth.middleware';
import { createDefaultAuthDependencies, type AuthDependencies } from '../auth/auth.dependencies';
import { bookingRepository } from './booking.repository';
import {
  availabilityQuerySchema,
  bookingListQuerySchema,
  createBookingSchema,
  createMaintenanceSchema,
  rejectBookingSchema,
} from './booking.validation';
import type { BookingRepository } from './booking.types';

const idSchema = z.string().uuid();

function requireId(value: unknown): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'The ID is invalid.');
  }
  return parsed.data;
}

function requireParsed<T>(
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  value: unknown,
  message = 'The request data is invalid.',
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success || parsed.data === undefined) {
    throw new HttpError(400, 'VALIDATION_ERROR', message);
  }
  return parsed.data;
}

function pagedResponse(result: {
  items: unknown[];
  page: number;
  pageSize: number;
  total: number;
}) {
  return {
    items: result.items,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / result.pageSize),
    },
  };
}

export function createBookingRouter(
  authDependencies: AuthDependencies = createDefaultAuthDependencies(),
  repository: BookingRepository = bookingRepository,
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authDependencies);
  const student = [authenticate, requireStudent] as const;

  router.post('/', ...student, async (request, response) => {
    const input = requireParsed(createBookingSchema, request.body);
    const result = await repository.create(request.authUser!.id, input);
    if (result === 'equipment_not_found') {
      throw new HttpError(404, 'EQUIPMENT_NOT_FOUND', 'The equipment listing was not found.');
    }
    if (result === 'unavailable') {
      throw new HttpError(409, 'EQUIPMENT_UNAVAILABLE', 'The equipment is not available for those dates.');
    }
    if (result === 'self_booking') {
      throw new HttpError(403, 'SELF_BOOKING_NOT_ALLOWED', 'You cannot request your own equipment.');
    }
    if (result === 'pending_limit') {
      throw new HttpError(409, 'PENDING_BOOKING_LIMIT', 'You already have three unexpired pending requests.');
    }
    if (result === 'maintenance_conflict') {
      throw new HttpError(409, 'MAINTENANCE_CONFLICT', 'The equipment is under maintenance for those dates.');
    }
    if (result === 'duration_exceeded') {
      throw new HttpError(422, 'RENTAL_DURATION_EXCEEDED', 'The requested duration exceeds this listing’s limit.');
    }
    response.status(201).json({ booking: result.booking });
  });

  router.get('/me', ...student, async (request, response) => {
    const query = requireParsed(bookingListQuerySchema, request.query, 'The query parameters are invalid.');
    const result = await repository.listMine(request.authUser!.id, query);
    response.status(200).json(pagedResponse(result));
  });

  router.get('/received', ...student, async (request, response) => {
    const query = requireParsed(bookingListQuerySchema, request.query, 'The query parameters are invalid.');
    const result = await repository.listReceived(request.authUser!.id, query);
    response.status(200).json(pagedResponse(result));
  });

  router.get('/:id', ...student, async (request, response) => {
    const booking = await repository.getById(requireId(request.params.id), request.authUser!.id);
    if (!booking) {
      throw new HttpError(404, 'BOOKING_NOT_FOUND', 'The booking was not found.');
    }
    response.status(200).json({ booking });
  });

  const transitions = [
    ['approve', undefined],
    ['reject', rejectBookingSchema],
    ['cancel', undefined],
    ['start', undefined],
    ['request-return', undefined],
    ['complete', undefined],
  ] as const;

  for (const [action, schema] of transitions) {
    router.post(`/:id/${action}`, ...student, async (request, response) => {
      const reason =
        schema === rejectBookingSchema
          ? requireParsed(rejectBookingSchema, request.body ?? {}).reason
          : undefined;
      const result = await repository.transition(
        requireId(request.params.id),
        request.authUser!.id,
        action,
        reason,
      );
      if (result === 'not_found') {
        throw new HttpError(404, 'BOOKING_NOT_FOUND', 'The booking was not found.');
      }
      if (result === 'forbidden') {
        throw new HttpError(403, 'FORBIDDEN', 'You are not authorized to change this booking.');
      }
      if (result === 'expired') {
        throw new HttpError(409, 'BOOKING_EXPIRED', 'The pending request has expired.');
      }
      if (result === 'invalid_transition') {
        throw new HttpError(409, 'INVALID_BOOKING_TRANSITION', 'This booking cannot make that state transition.');
      }
      response.status(200).json({ booking: result.booking });
    });
  }

  return router;
}

export function createEquipmentBookingRouter(
  authDependencies: AuthDependencies = createDefaultAuthDependencies(),
  repository: BookingRepository = bookingRepository,
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authDependencies);

  router.get('/:id/availability', async (request, response) => {
    const range = requireParsed(
      availabilityQuerySchema,
      request.query,
      'The requested date range is invalid.',
    );
    const result = await repository.availability(requireId(request.params.id), range);
    if (result === null) {
      throw new HttpError(404, 'EQUIPMENT_NOT_FOUND', 'The equipment listing was not found.');
    }
    if (result === 'duration_exceeded') {
      throw new HttpError(422, 'RENTAL_DURATION_EXCEEDED', 'The requested duration exceeds this listing’s limit.');
    }
    response.status(200).json(result);
  });

  router.get('/:id/maintenance', async (request, response) => {
    const blocks = await repository.listMaintenance(requireId(request.params.id));
    if (blocks === null) {
      throw new HttpError(404, 'EQUIPMENT_NOT_FOUND', 'The equipment listing was not found.');
    }
    response.status(200).json({ items: blocks });
  });

  router.post('/:id/maintenance', authenticate, requireStudent, async (request, response) => {
    const input = requireParsed(
      createMaintenanceSchema,
      request.body,
      'The maintenance request is invalid.',
    );
    const result = await repository.createMaintenance(
      requireId(request.params.id),
      request.authUser!.id,
      input,
    );
    if (result === 'not_found') {
      throw new HttpError(404, 'EQUIPMENT_NOT_FOUND', 'The equipment listing was not found.');
    }
    if (result === 'forbidden') {
      throw new HttpError(403, 'FORBIDDEN', 'You are not authorized to manage this listing.');
    }
    if (result === 'booking_conflict') {
      throw new HttpError(409, 'BOOKING_CONFLICT', 'Maintenance cannot overlap a blocking booking.');
    }
    if (result === 'maintenance_conflict') {
      throw new HttpError(409, 'MAINTENANCE_CONFLICT', 'The maintenance period overlaps another block.');
    }
    response.status(201).json({ maintenance: result });
  });

  router.delete('/:id/maintenance/:blockId', authenticate, requireStudent, async (request, response) => {
    const result = await repository.deleteMaintenance(
      requireId(request.params.id),
      requireId(request.params.blockId),
      request.authUser!.id,
    );
    if (result === 'not_found') {
      throw new HttpError(404, 'MAINTENANCE_NOT_FOUND', 'The maintenance block was not found.');
    }
    if (result === 'forbidden') {
      throw new HttpError(403, 'FORBIDDEN', 'You are not authorized to manage this listing.');
    }
    response.status(204).end();
  });

  return router;
}
