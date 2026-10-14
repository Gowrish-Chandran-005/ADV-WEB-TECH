import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(year, month - 1, day);
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}, 'Dates must be valid ISO calendar dates.');

const dateRangeObject = z.object({ startDate: date, endDate: date }).strict();

export const dateRangeSchema = dateRangeObject
  .refine((value) => value.endDate >= value.startDate, {
    message: 'endDate must be on or after startDate.',
  })
  .refine((value) => value.startDate >= currentIstDate(), {
    message: 'startDate cannot be before the current campus date.',
  });

export const createBookingSchema = dateRangeObject
  .extend({
    equipmentId: z.string().uuid(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .refine((value) => value.endDate >= value.startDate, {
    message: 'endDate must be on or after startDate.',
  })
  .refine((value) => value.startDate >= currentIstDate(), {
    message: 'startDate cannot be before the current campus date.',
  });

export const availabilityQuerySchema = dateRangeSchema;

export const rejectBookingSchema = z
  .object({ reason: z.string().trim().min(1).max(500).optional() })
  .strict();

export const createMaintenanceSchema = dateRangeObject
  .extend({ reason: z.string().trim().min(1).max(500) })
  .strict()
  .refine((value) => value.endDate >= value.startDate, {
    message: 'endDate must be on or after startDate.',
  })
  .refine((value) => value.startDate >= currentIstDate(), {
    message: 'startDate cannot be before the current campus date.',
  });

export const bookingListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export function currentIstDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function inclusiveRentalDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function nextCalendarDate(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
