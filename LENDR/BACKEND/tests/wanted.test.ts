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

import jwt from 'jsonwebtoken';
import request from 'supertest';
import { vi } from 'vitest';
import { createApp } from '../src/app';
import type { AuthDependencies } from '../src/modules/auth/auth.dependencies';
import type { AuthUser, UserRepository } from '../src/modules/auth/auth.types';
import type { WantedService } from '../src/modules/wanted/wanted.service';

const testSecret = 'wanted-test-secret-with-at-least-thirty-two-chars';
const testStudentId = '55555555-5555-4555-8555-555555555555';

function testStudent(id: string): AuthUser {
  const now = new Date('2026-10-10T00:00:00.000Z');
  return {
    id,
    email: `${id}@vitstudent.ac.in`,
    fullName: 'Test Student',
    registrationNumber: '21BCE2000',
    phone: '9876543210',
    role: 'STUDENT',
    status: 'ACTIVE',
    emailVerifiedAt: null,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function tokenForStudent(id: string): string {
  return jwt.sign({ tokenVersion: 0 }, testSecret, {
    algorithm: 'HS256',
    audience: 'lendr',
    issuer: 'lendr-api',
    expiresIn: '1h',
    subject: id,
  });
}

describe('Wanted Student Hub Endpoints', () => {
  function createHarness() {
    const user = testStudent(testStudentId);
    const users: UserRepository = {
      create: vi.fn(),
      findByEmail: vi.fn().mockImplementation(async (email) => (email === user.email ? user : null)),
      findById: vi.fn().mockImplementation(async (id) => (id === user.id ? user : null)),
      updateProfile: vi.fn().mockResolvedValue(user),
      incrementTokenVersion: vi.fn(),
    };

    const authDeps: AuthDependencies = {
      users,
      jwtSecret: testSecret,
      loginRateLimiter: { isAllowed: () => true, recordFailure: () => undefined },
    };

    const mockWantedService = {
      createRequest: vi.fn(),
      getRequestById: vi.fn(),
      listRequests: vi.fn(),
      updateRequest: vi.fn(),
      withdrawRequest: vi.fn(),
      getOffersForRequest: vi.fn(),
      findMatchesForRequest: vi.fn(),
      createOffer: vi.fn(),
      respondToOffer: vi.fn(),
      getMyRequests: vi.fn().mockResolvedValue([
        {
          id: 'req-1',
          userId: testStudentId,
          title: 'Need 4K Monitor for hackathon',
          description: 'Needed for code sprint',
          startDate: '2026-11-01',
          endDate: '2026-11-02',
          urgency: 'HIGH',
          status: 'OPEN',
          offersCount: 1,
          author: { id: testStudentId, fullName: 'Test Student', initials: 'TS' },
          offers: [
            {
              id: 'offer-1',
              wantedRequestId: 'req-1',
              offererUserId: 'other-user',
              offererName: 'Rohan Sharma',
              equipmentId: 'eq-mon',
              equipmentTitle: 'LG 27-inch 4K Display',
              dailyRentalPrice: '300.00',
              status: 'PENDING',
            },
          ],
        },
      ]),
      getMyOffers: vi.fn().mockResolvedValue([
        {
          id: 'offer-2',
          wantedRequestId: 'req-other',
          offererUserId: testStudentId,
          offererName: 'Test Student',
          equipmentId: 'eq-mine',
          equipmentTitle: 'Sony A7 IV',
          dailyRentalPrice: '500.00',
          status: 'PENDING',
          wantedRequestTitle: 'Looking for mirrorless camera',
          wantedRequestStartDate: '2026-11-05',
          wantedRequestEndDate: '2026-11-07',
          wantedRequestUrgency: 'HIGH',
          wantedRequestStatus: 'OPEN',
        },
      ]),
    } as unknown as WantedService;

    const app = createApp(
      vi.fn().mockResolvedValue(undefined),
      authDeps,
      undefined,
      undefined,
      mockWantedService,
    );

    return { app, mockWantedService };
  }

  it('GET /api/v1/wanted/my/requests returns user requests and received offers', async () => {
    const { app, mockWantedService } = createHarness();
    const token = tokenForStudent(testStudentId);

    const response = await request(app)
      .get('/api/v1/wanted/my/requests')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].title).toBe('Need 4K Monitor for hackathon');
    expect(response.body.items[0].offers).toHaveLength(1);
    expect(mockWantedService.getMyRequests).toHaveBeenCalledWith(testStudentId);
  });

  it('GET /api/v1/wanted/my/offers returns user sent offers', async () => {
    const { app, mockWantedService } = createHarness();
    const token = tokenForStudent(testStudentId);

    const response = await request(app)
      .get('/api/v1/wanted/my/offers')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].equipmentTitle).toBe('Sony A7 IV');
    expect(response.body.items[0].wantedRequestTitle).toBe('Looking for mirrorless camera');
    expect(mockWantedService.getMyOffers).toHaveBeenCalledWith(testStudentId);
  });

  it('rejects unauthenticated requests to /my/requests and /my/offers with 401', async () => {
    const { app } = createHarness();

    const res1 = await request(app).get('/api/v1/wanted/my/requests');
    expect(res1.status).toBe(401);

    const res2 = await request(app).get('/api/v1/wanted/my/offers');
    expect(res2.status).toBe(401);
  });
});
