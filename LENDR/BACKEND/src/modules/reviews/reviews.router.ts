import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../middleware/http-error';
import {
  createAuthenticate,
  createOptionalAuthenticate,
  requireStudent,
} from '../auth/auth.middleware';
import type { AuthDependencies } from '../auth/auth.dependencies';
import { reviewsRepository } from './reviews.repository';
import type { ReviewsRepository } from './reviews.types';
import { createReviewSchema, equipmentReviewSchema } from './reviews.validation';

const idSchema = z.string().uuid();

function requireId(value: unknown, message = 'The ID is invalid.'): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', message);
  }
  return parsed.data;
}

export function createEquipmentReviewsRouter(
  authDependencies: AuthDependencies,
  repository: ReviewsRepository = reviewsRepository,
): Router {
  const router = Router();
  const optionalAuth = createOptionalAuthenticate(authDependencies);
  const authenticate = createAuthenticate(authDependencies);

  router.get('/:id/reviews', optionalAuth, async (request, response) => {
    const equipmentId = requireId(request.params.id, 'The equipment ID is invalid.');
    const result = await repository.getEquipmentReviews(equipmentId, request.authUser?.id);
    response.status(200).json(result);
  });

  router.post('/:id/reviews', authenticate, requireStudent, async (request, response) => {
    const equipmentId = requireId(request.params.id, 'The equipment ID is invalid.');
    const parsedBody = equipmentReviewSchema.safeParse(request.body);
    if (!parsedBody.success) {
      const issue = parsedBody.error.issues[0]?.message || 'The review submission is invalid.';
      throw new HttpError(400, 'VALIDATION_ERROR', issue);
    }

    let bookingId = parsedBody.data.bookingId;
    if (!bookingId) {
      const eligible = await repository.findEligibleBookingId(equipmentId, request.authUser!.id);
      if (!eligible) {
        throw new HttpError(
          400,
          'NO_ELIGIBLE_BOOKING',
          'No completed booking eligible for review was found for this equipment.',
        );
      }
      bookingId = eligible;
    }

    const review = await repository.createReview(bookingId, request.authUser!.id, {
      rating: parsedBody.data.rating,
      comment: parsedBody.data.comment,
    });

    response.status(201).json({ review });
  });

  return router;
}

export function createBookingReviewsRouter(
  authDependencies: AuthDependencies,
  repository: ReviewsRepository = reviewsRepository,
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authDependencies);

  router.post('/:id/reviews', authenticate, requireStudent, async (request, response) => {
    const bookingId = requireId(request.params.id, 'The booking ID is invalid.');
    const parsedBody = createReviewSchema.safeParse(request.body);
    if (!parsedBody.success) {
      const issue = parsedBody.error.issues[0]?.message || 'The review submission is invalid.';
      throw new HttpError(400, 'VALIDATION_ERROR', issue);
    }

    const review = await repository.createReview(bookingId, request.authUser!.id, {
      rating: parsedBody.data.rating,
      comment: parsedBody.data.comment,
    });

    response.status(201).json({ review });
  });

  return router;
}
