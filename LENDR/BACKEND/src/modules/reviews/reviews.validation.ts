import { z } from 'zod';

export const createReviewSchema = z
  .object({
    rating: z
      .coerce
      .number()
      .int('Rating must be an integer')
      .min(1, 'Rating must be between 1 and 5')
      .max(5, 'Rating must be between 1 and 5'),
    comment: z
      .string()
      .trim()
      .max(1000, 'Comment cannot exceed 1000 characters')
      .optional()
      .nullable(),
  })
  .strict();

export const equipmentReviewSchema = z
  .object({
    bookingId: z.string().uuid('Invalid booking ID').optional(),
    rating: z
      .coerce
      .number()
      .int('Rating must be an integer')
      .min(1, 'Rating must be between 1 and 5')
      .max(5, 'Rating must be between 1 and 5'),
    comment: z
      .string()
      .trim()
      .max(1000, 'Comment cannot exceed 1000 characters')
      .optional()
      .nullable(),
  })
  .strict();
