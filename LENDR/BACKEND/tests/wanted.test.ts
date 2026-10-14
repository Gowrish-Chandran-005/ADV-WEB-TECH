import { describe, expect, it } from 'vitest';
import { currentIstDate } from '../src/modules/bookings/booking.validation';
import {
  createOfferSchema,
  createWantedSchema,
  respondOfferSchema,
  updateWantedSchema,
  wantedQuerySchema,
} from '../src/modules/wanted/wanted.validation';

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

describe('Wanted validation and rule schemas', () => {
  const today = currentIstDate();
  const future1 = addDays(today, 1);
  const future3 = addDays(today, 3);

  it('validates a valid wanted request payload', () => {
    const valid = {
      title: 'Need Sony A7S III or similar camera',
      description: 'Filming cultural festival documentary this weekend. Need camera with 4K 60fps.',
      categoryId: '6921cdd9-74a4-403c-9b83-a8b13879559f',
      locationBlock: '📌 TT Block',
      startDate: future1,
      endDate: future3,
      urgency: 'HIGH',
    };
    const parsed = createWantedSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects title that is too short or too long', () => {
    expect(
      createWantedSchema.safeParse({
        title: 'ab',
        description: 'Valid description with enough characters',
        startDate: future1,
        endDate: future3,
      }).success,
    ).toBe(false);

    expect(
      createWantedSchema.safeParse({
        title: 'a'.repeat(151),
        description: 'Valid description with enough characters',
        startDate: future1,
        endDate: future3,
      }).success,
    ).toBe(false);
  });

  it('rejects past dates or inverted date ranges', () => {
    const yesterday = addDays(today, -1);

    // Past start date
    expect(
      createWantedSchema.safeParse({
        title: 'Valid title here',
        description: 'Valid description with enough characters',
        startDate: yesterday,
        endDate: future1,
      }).success,
    ).toBe(false);

    // End date before start date
    expect(
      createWantedSchema.safeParse({
        title: 'Valid title here',
        description: 'Valid description with enough characters',
        startDate: future3,
        endDate: future1,
      }).success,
    ).toBe(false);
  });

  it('validates offer creation payload', () => {
    expect(
      createOfferSchema.safeParse({
        equipmentId: '6921cdd9-74a4-403c-9b83-a8b13879559f',
        message: 'I have this gear ready to borrow on Friday!',
      }).success,
    ).toBe(true);

    // Invalid UUID
    expect(
      createOfferSchema.safeParse({
        equipmentId: 'not-a-uuid',
      }).success,
    ).toBe(false);
  });

  it('validates offer response payload', () => {
    expect(respondOfferSchema.safeParse({ action: 'accept' }).success).toBe(true);
    expect(respondOfferSchema.safeParse({ action: 'decline', reason: 'Found another option' }).success).toBe(true);
    expect(respondOfferSchema.safeParse({ action: 'invalid_action' }).success).toBe(false);
  });

  it('validates wanted search queries and applies defaults', () => {
    const parsed = wantedQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.pageSize).toBe(20);
      expect(parsed.data.status).toBe('OPEN');
      expect(parsed.data.sort).toBe('newest');
    }
  });
});
