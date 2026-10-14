import { z } from 'zod';
import { currentIstDate } from '../bookings/booking.validation';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be valid YYYY-MM-DD calendar dates.').refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(year, month - 1, day);
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}, 'Dates must be real calendar dates.');

export const createWantedSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(150, 'Title cannot exceed 150 characters.'),
    description: z.string().trim().min(5, 'Description must be at least 5 characters.').max(2000, 'Description cannot exceed 2000 characters.'),
    categoryId: z.string().uuid().nullable().optional(),
    locationBlock: z.string().trim().max(100).nullable().optional(),
    startDate: dateSchema,
    endDate: dateSchema,
    urgency: z.enum(['HIGH', 'MEDIUM']).default('MEDIUM'),
  })
  .strict()
  .refine((value) => value.endDate >= value.startDate, {
    message: 'endDate must be on or after startDate.',
    path: ['endDate'],
  })
  .refine((value) => value.startDate >= currentIstDate(), {
    message: 'startDate cannot be before today.',
    path: ['startDate'],
  });

export const updateWantedSchema = z
  .object({
    title: z.string().trim().min(3).max(150).optional(),
    description: z.string().trim().min(5).max(2000).optional(),
    categoryId: z.string().uuid().nullable().optional(),
    locationBlock: z.string().trim().max(100).nullable().optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    urgency: z.enum(['HIGH', 'MEDIUM']).optional(),
  })
  .strict()
  .refine((value) => {
    if (value.startDate && value.endDate) {
      return value.endDate >= value.startDate;
    }
    return true;
  }, {
    message: 'endDate must be on or after startDate.',
    path: ['endDate'],
  })
  .refine((value) => {
    if (value.startDate) {
      return value.startDate >= currentIstDate();
    }
    return true;
  }, {
    message: 'startDate cannot be before today.',
    path: ['startDate'],
  });

export const createOfferSchema = z
  .object({
    equipmentId: z.string().uuid('Valid equipment UUID is required.'),
    message: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const respondOfferSchema = z
  .object({
    action: z.enum(['accept', 'decline']),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const wantedQuerySchema = z
  .object({
    q: z.string().trim().optional(),
    category: z.string().trim().optional(),
    status: z.enum(['OPEN', 'FULFILLED', 'WITHDRAWN', 'EXPIRED', 'ALL']).default('OPEN'),
    urgency: z.enum(['HIGH', 'MEDIUM']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    sort: z.enum(['newest', 'urgent']).default('newest'),
  })
  .strict();
