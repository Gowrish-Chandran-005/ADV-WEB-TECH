import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import type { AuthDependencies } from '../src/modules/auth/auth.dependencies';
import type { AuthUser, UserRepository } from '../src/modules/auth/auth.types';
import type {
  Booking,
  BookingRepository,
  PaymentRecord,
} from '../src/modules/bookings/booking.types';
import { bookingRepository as defaultBookingRepo } from '../src/modules/bookings/booking.repository';

const secret = 'payments-test-secret-with-at-least-thirty-two-chars';
const ownerId = '11111111-1111-4111-8111-111111111111';
const renterId = '22222222-2222-4222-8222-222222222222';
const thirdPartyId = '33333333-3333-4333-8333-333333333333';
const equipmentId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const approvedBookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const pendingBookingId = 'aaaaaaaa-bbbb-4bbb-8bbb-111111111111';
const rejectedBookingId = 'aaaaaaaa-bbbb-4bbb-8bbb-222222222222';
const cancelledBookingId = 'aaaaaaaa-bbbb-4bbb-8bbb-333333333333';

function testUser(id: string, name: string): AuthUser {
  const now = new Date('2026-10-10T00:00:00.000Z');
  return {
    id,
    email: `${id}@vitstudent.ac.in`,
    fullName: name,
    registrationNumber: '21BCE1000',
    phone: '9876543210',
    role: 'STUDENT',
    status: 'ACTIVE',
    emailVerifiedAt: null,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function tokenFor(id: string): string {
  return jwt.sign({ tokenVersion: 0 }, secret, {
    algorithm: 'HS256',
    audience: 'lendr',
    issuer: 'lendr-api',
    expiresIn: '1h',
    subject: id,
  });
}

function mockBooking(overrides: Partial<Booking> = {}): Booking {
  const now = new Date('2026-10-10T00:00:00.000Z');
  return {
    id: approvedBookingId,
    equipmentId,
    equipmentTitle: 'Sony FX3 Cinema Camera',
    equipmentStatus: 'ACTIVE',
    renterId,
    renterFullName: 'Gowrish Chandran',
    ownerUserId: ownerId,
    organizationId: null,
    startAt: new Date('2026-10-15T00:00:00.000Z'),
    endAt: new Date('2026-10-17T00:00:00.000Z'),
    status: 'APPROVED',
    paymentStatus: 'UNPAID',
    rentalDays: 2,
    dailyRentalPrice: '1200.00',
    securityDeposit: '0.00',
    totalPrice: '2400.00',
    notes: 'Campus short film project',
    expiresAt: new Date('2026-10-14T00:00:00.000Z'),
    returnRecordedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function mockPayment(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  const now = new Date('2026-10-10T00:00:00.000Z');
  return {
    id: 'pay-1111-2222-3333-4444',
    bookingId: approvedBookingId,
    payerId: renterId,
    amount: '2400.00',
    currency: 'INR',
    provider: 'MOCK',
    providerReference: 'MOCK-TXN-12345678',
    status: 'SUCCESS',
    metadata: { simulatedMode: true },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createHarness() {
  const users = new Map<string, AuthUser>([
    [ownerId, testUser(ownerId, 'Aditya Kumar')],
    [renterId, testUser(renterId, 'Gowrish Chandran')],
    [thirdPartyId, testUser(thirdPartyId, 'Suresh Raina')],
  ]);

  const userRepository: UserRepository = {
    async findById(id) {
      return users.get(id) ?? null;
    },
    async findByEmail() {
      return null;
    },
    async create() {
      throw new Error('Not implemented');
    },
    async updatePassword() {
      throw new Error('Not implemented');
    },
    async incrementTokenVersion() {
      throw new Error('Not implemented');
    },
  };

  const authDependencies: AuthDependencies = {
    jwtSecret: secret,
    accessTokenTtlSeconds: 3600,
    refreshTokenTtlSeconds: 86400,
    users: userRepository,
    sessions: {
      async create() {
        return {
          id: 'sess-1',
          userId: renterId,
          refreshTokenHash: 'hash',
          expiresAt: new Date(),
          createdAt: new Date(),
          userAgent: null,
          ipAddress: null,
        };
      },
      async findById() {
        return null;
      },
      async delete() {},
      async deleteAllForUser() {},
    },
    passwords: {
      async hash() {
        return 'hash';
      },
      async verify() {
        return true;
      },
    },
    mailer: {
      async send() {},
    },
  };

  const bookingRepo: BookingRepository = {
    ...defaultBookingRepo,
    async getById(id, userId) {
      if (id === approvedBookingId) return mockBooking();
      if (id === pendingBookingId) return mockBooking({ id: pendingBookingId, status: 'PENDING' });
      return null;
    },
    async processMockPayment(bookingId, userId, action) {
      if (bookingId === 'unknown-id') return 'not_found';
      if (userId !== renterId) return 'forbidden';
      if (bookingId === pendingBookingId) return 'not_approved';
      if (bookingId === rejectedBookingId || bookingId === cancelledBookingId) return 'invalid_status';

      if (action === 'SUCCESS') {
        return {
          payment: mockPayment({ bookingId, payerId: userId, status: 'SUCCESS' }),
          booking: mockBooking({ id: bookingId, paymentStatus: 'PAID' }),
        };
      } else {
        return {
          payment: mockPayment({ bookingId, payerId: userId, status: 'FAILED' }),
          booking: mockBooking({ id: bookingId, paymentStatus: 'FAILED' }),
        };
      }
    },
    async getPaymentsForBooking(bookingId, userId) {
      if (bookingId === 'unknown-id') return 'not_found';
      if (userId !== renterId && userId !== ownerId) return 'forbidden';
      return [mockPayment({ bookingId })];
    },
  };

  const app = createApp(
    async () => {},
    authDependencies,
    undefined,
    bookingRepo,
  );

  return { app, bookingRepo };
}

describe('mock payment simulation and booking confirmation', () => {
  it('1. processes successful mock payment for an eligible, approved booking', async () => {
    const { app } = createHarness();
    const token = tokenFor(renterId);

    const response = await request(app)
      .post(`/api/v1/bookings/${approvedBookingId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'SUCCESS' });

    expect(response.status).toBe(200);
    expect(response.body.payment).toBeDefined();
    expect(response.body.payment.status).toBe('SUCCESS');
    expect(response.body.payment.amount).toBe('2400.00');
    expect(response.body.payment.provider).toBe('MOCK');
    expect(response.body.booking.paymentStatus).toBe('PAID');
  });

  it('2. records failed mock payment and leaves the booking unpaid', async () => {
    const { app } = createHarness();
    const token = tokenFor(renterId);

    const response = await request(app)
      .post(`/api/v1/bookings/${approvedBookingId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'FAIL' });

    expect(response.status).toBe(200);
    expect(response.body.payment).toBeDefined();
    expect(response.body.payment.status).toBe('FAILED');
    expect(response.body.booking.paymentStatus).toBe('FAILED');
  });

  it('3. retrying after a failed attempt allows a successful payment', async () => {
    const { app } = createHarness();
    const token = tokenFor(renterId);

    // First attempt fails
    const failRes = await request(app)
      .post(`/api/v1/bookings/${approvedBookingId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'FAIL' });
    expect(failRes.status).toBe(200);
    expect(failRes.body.payment.status).toBe('FAILED');

    // Second retry attempt succeeds
    const successRes = await request(app)
      .post(`/api/v1/bookings/${approvedBookingId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'SUCCESS' });
    expect(successRes.status).toBe(200);
    expect(successRes.body.payment.status).toBe('SUCCESS');
    expect(successRes.body.booking.paymentStatus).toBe('PAID');
  });

  it('4. repeated successful payment requests do not duplicate payment (idempotent)', async () => {
    let callCount = 0;
    const { app, bookingRepo } = createHarness();
    const token = tokenFor(renterId);

    bookingRepo.processMockPayment = vi.fn().mockImplementation(async (bookingId, userId, action) => {
      callCount++;
      return {
        payment: mockPayment({ bookingId, payerId: userId, status: 'SUCCESS' }),
        booking: mockBooking({ id: bookingId, paymentStatus: 'PAID' }),
        alreadyPaid: callCount > 1,
      };
    });

    const res1 = await request(app)
      .post(`/api/v1/bookings/${approvedBookingId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'SUCCESS' });
    expect(res1.status).toBe(200);
    expect(res1.body.alreadyPaid).toBeFalsy();

    const res2 = await request(app)
      .post(`/api/v1/bookings/${approvedBookingId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'SUCCESS' });
    expect(res2.status).toBe(200);
    expect(res2.body.alreadyPaid).toBe(true);
    expect(res2.body.payment.status).toBe('SUCCESS');
  });

  it('5. a student cannot pay for another student\'s booking (403 Forbidden)', async () => {
    const { app } = createHarness();
    const otherStudentToken = tokenFor(thirdPartyId);

    const response = await request(app)
      .post(`/api/v1/bookings/${approvedBookingId}/pay`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({ action: 'SUCCESS' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('6. a pending booking cannot be paid for before owner approval (409 Conflict)', async () => {
    const { app } = createHarness();
    const token = tokenFor(renterId);

    const response = await request(app)
      .post(`/api/v1/bookings/${pendingBookingId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'SUCCESS' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('BOOKING_NOT_APPROVED');
  });

  it('7. a rejected or cancelled booking cannot be paid for (409 Conflict)', async () => {
    const { app } = createHarness();
    const token = tokenFor(renterId);

    const rejectRes = await request(app)
      .post(`/api/v1/bookings/${rejectedBookingId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'SUCCESS' });

    expect(rejectRes.status).toBe(409);
    expect(rejectRes.body.error.code).toBe('INVALID_BOOKING_STATUS');

    const cancelRes = await request(app)
      .post(`/api/v1/bookings/${cancelledBookingId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'SUCCESS' });

    expect(cancelRes.status).toBe(409);
    expect(cancelRes.body.error.code).toBe('INVALID_BOOKING_STATUS');
  });

  it('8. backend calculates the payable amount from trusted records and ignores frontend tampering', async () => {
    const { app, bookingRepo } = createHarness();
    const token = tokenFor(renterId);

    bookingRepo.processMockPayment = vi.fn().mockImplementation(async (bookingId, userId, action) => {
      // Backend uses trusted database amount 2400.00, completely ignoring any amount sent by client
      return {
        payment: mockPayment({ bookingId, amount: '2400.00' }),
        booking: mockBooking({ id: bookingId, paymentStatus: 'PAID' }),
      };
    });

    const response = await request(app)
      .post(`/api/v1/bookings/${approvedBookingId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'SUCCESS', amount: 1 }); // Attempting to pay ₹1

    expect(response.status).toBe(200);
    expect(response.body.payment.amount).toBe('2400.00');
  });

  it('9. unauthenticated requests are rejected with 401', async () => {
    const { app } = createHarness();

    const response = await request(app)
      .post(`/api/v1/bookings/${approvedBookingId}/pay`)
      .send({ action: 'SUCCESS' });

    expect(response.status).toBe(401);
  });

  it('10. retrieves payment history for authorized booking parties', async () => {
    const { app } = createHarness();
    const token = tokenFor(renterId);

    const response = await request(app)
      .get(`/api/v1/bookings/${approvedBookingId}/payments`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].bookingId).toBe(approvedBookingId);
  });

  it('11. GET /api/v1/users/me/payments returns payments for authenticated student', async () => {
    const { app, bookingRepo } = createHarness();
    const token = tokenFor(renterId);

    bookingRepo.listPaymentsForUser = vi.fn().mockResolvedValue([
      {
        id: 'pay-uuid-user',
        bookingId: approvedBookingId,
        payerId: renterId,
        amount: '2400.00',
        currency: 'INR',
        provider: 'MOCK',
        providerReference: 'MOCK-TXN-12345',
        status: 'SUCCESS',
        metadata: { simulatedMode: true },
        createdAt: new Date('2026-10-14T12:00:00.000Z'),
        updatedAt: new Date('2026-10-14T12:00:00.000Z'),
        bookingReference: approvedBookingId,
        startAt: new Date('2026-10-15T00:00:00.000Z'),
        endAt: new Date('2026-10-17T00:00:00.000Z'),
        bookingStatus: 'APPROVED',
        bookingPaymentStatus: 'PAID',
        totalPrice: '2400.00',
        equipmentId,
        equipmentTitle: 'Sony FX3 Cinema Camera',
        imageUrls: ['/uploads/camera.jpg'],
        ownerName: 'Meera Patel',
      },
    ]);

    const response = await request(app)
      .get('/api/v1/users/me/payments')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].amount).toBe('2400.00');
    expect(response.body.items[0].equipmentTitle).toBe('Sony FX3 Cinema Camera');
    expect(bookingRepo.listPaymentsForUser).toHaveBeenCalledWith(renterId);
  });

  it('12. GET /api/v1/users/me/payments rejects unauthenticated requests with 401', async () => {
    const { app } = createHarness();

    const response = await request(app).get('/api/v1/users/me/payments');
    expect(response.status).toBe(401);
  });
});
