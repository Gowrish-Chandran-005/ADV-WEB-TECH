import { describe, expect, it } from 'vitest';
import {
  currentIstDate,
  dateRangeSchema,
  inclusiveRentalDays,
  nextCalendarDate,
} from '../src/modules/bookings/booking.validation';
import { transitionTarget } from '../src/modules/bookings/booking.repository';

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

describe('booking date and lifecycle rules', () => {
  it('uses the campus date in Asia/Kolkata', () => {
    expect(currentIstDate(new Date('2026-10-10T18:40:00.000Z'))).toBe('2026-10-11');
    expect(currentIstDate(new Date('2026-10-10T18:29:59.000Z'))).toBe('2026-10-10');
  });

  it('converts inclusive calendar days to a half-open end date and calculates rental days', () => {
    expect(nextCalendarDate('2028-02-28')).toBe('2028-02-29');
    expect(nextCalendarDate('2028-02-29')).toBe('2028-03-01');
    expect(nextCalendarDate('2026-12-31')).toBe('2027-01-01');
    expect(inclusiveRentalDays('2026-12-31', '2027-01-01')).toBe(2);
  });

  it('rejects malformed, impossible, past, reversed and non-ISO calendar dates', () => {
    const today = currentIstDate();
    expect(dateRangeSchema.safeParse({ startDate: today, endDate: today }).success).toBe(true);
    expect(dateRangeSchema.safeParse({ startDate: addDays(today, 1), endDate: today }).success).toBe(false);
    expect(dateRangeSchema.safeParse({ startDate: '2028-02-30', endDate: '2028-03-01' }).success).toBe(false);
    expect(dateRangeSchema.safeParse({ startDate: '10-10-2026', endDate: '10-10-2026' }).success).toBe(false);
    expect(dateRangeSchema.safeParse({ startDate: addDays(today, -1), endDate: today }).success).toBe(false);
  });

  it('permits only the documented booking transitions', () => {
    expect(transitionTarget('approve', 'PENDING')).toEqual({ newStatus: 'APPROVED' });
    expect(transitionTarget('reject', 'PENDING')).toEqual({ newStatus: 'REJECTED' });
    expect(transitionTarget('cancel', 'PENDING')).toEqual({ newStatus: 'CANCELLED' });
    expect(transitionTarget('cancel', 'APPROVED')).toEqual({ newStatus: 'CANCELLED' });
    expect(transitionTarget('start', 'APPROVED')).toEqual({ newStatus: 'ACTIVE' });
    expect(transitionTarget('request-return', 'ACTIVE')).toEqual({ newStatus: 'RETURN_REQUESTED' });
    expect(transitionTarget('complete', 'RETURN_REQUESTED')).toEqual({ newStatus: 'COMPLETED' });
    expect(transitionTarget('approve', 'APPROVED')).toBeNull();
    expect(transitionTarget('start', 'PENDING')).toBeNull();
    expect(transitionTarget('complete', 'ACTIVE')).toBeNull();
  });
});
