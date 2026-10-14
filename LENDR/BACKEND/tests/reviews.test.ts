import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type { AuthDependencies } from '../src/modules/auth/auth.dependencies';
import type { AuthUser, UserRepository } from '../src/modules/auth/auth.types';
import type {
  CreateReviewInput,
  EquipmentReviewsResponse,
  PublicReview,
  ReviewsRepository,
} from '../src/modules/reviews/reviews.types';
import { formatInitials } from '../src/modules/reviews/reviews.repository';
import { HttpError } from '../src/middleware/http-error';

const secret = 'reviews-test-secret-with-at-least-thirty-two-characters';
const ownerId = '11111111-1111-4111-8111-111111111111';
const renterId = '22222222-2222-4222-8222-222222222222';
const thirdPartyId = '33333333-3333-4333-8333-333333333333';
const equipmentId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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
      async deleteByUserId() {},
    },
    auditLogs: {
      async record() {},
    },
  };

  const reviews: Array<{
    id: string;
    bookingId: string;
    reviewerId: string;
    reviewedUserId: string;
    equipmentId: string;
    direction: 'RENTER_TO_OWNER' | 'OWNER_TO_RENTER';
    rating: number;
    comment: string | null;
    status: 'PENDING_REVEAL' | 'REVEALED';
    createdAt: string;
    reviewerName: string;
  }> = [
    {
      id: 'rev-1',
      bookingId: 'prev-booking-id',
      reviewerId: renterId,
      reviewedUserId: ownerId,
      equipmentId,
      direction: 'RENTER_TO_OWNER',
      rating: 5,
      comment: 'Super crisp lens! Lender gave a thorough inspection.',
      status: 'REVEALED',
      createdAt: '2026-10-12T10:00:00.000Z',
      reviewerName: 'Gowrish Chandran',
    },
  ];

  let bookingStatus = 'COMPLETED';
  let bookingRenterId = renterId;
  let bookingOwnerId = ownerId;

  const mockReviewsRepo: ReviewsRepository = {
    async getEquipmentReviews(eqId: string, currentUserId?: string): Promise<EquipmentReviewsResponse> {
      const items: PublicReview[] = reviews
        .filter((r) => r.equipmentId === eqId && r.direction === 'RENTER_TO_OWNER' && r.status === 'REVEALED')
        .map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          reviewerName: r.reviewerName,
          reviewerInitials: formatInitials(r.reviewerName),
        }));

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      for (const item of items) {
        sum += item.rating;
        distribution[item.rating as keyof typeof distribution]++;
      }

      return {
        items,
        averageRating: items.length > 0 ? Math.round((sum / items.length) * 10) / 10 : 0,
        reviewCount: items.length,
        ratingDistribution: distribution,
        eligibleBookingId: currentUserId === renterId ? bookingId : null,
      };
    },

    async findEligibleBookingId(eqId: string, userId: string): Promise<string | null> {
      if (userId === renterId && bookingStatus === 'COMPLETED') {
        const alreadyReviewed = reviews.some((r) => r.bookingId === bookingId && r.direction === 'RENTER_TO_OWNER');
        return alreadyReviewed ? null : bookingId;
      }
      return null;
    },

    async createReview(bId: string, revId: string, input: CreateReviewInput): Promise<PublicReview> {
      if (bId !== bookingId) {
        throw new HttpError(404, 'BOOKING_NOT_FOUND', 'The booking was not found.');
      }
      if (bookingStatus !== 'COMPLETED') {
        throw new HttpError(422, 'BOOKING_NOT_COMPLETED', 'Reviews can only be submitted for completed bookings.');
      }

      let direction: 'RENTER_TO_OWNER' | 'OWNER_TO_RENTER';
      let reviewedUserId: string;
      if (revId === bookingRenterId) {
        direction = 'RENTER_TO_OWNER';
        reviewedUserId = bookingOwnerId;
      } else if (revId === bookingOwnerId) {
        direction = 'OWNER_TO_RENTER';
        reviewedUserId = bookingRenterId;
      } else {
        throw new HttpError(403, 'FORBIDDEN', 'Only the renter or owner of this booking can submit a review.');
      }

      if (revId === reviewedUserId) {
        throw new HttpError(403, 'FORBIDDEN', 'Owners cannot review their own equipment or self.');
      }

      if (reviews.some((r) => r.bookingId === bId && r.direction === direction)) {
        throw new HttpError(409, 'REVIEW_ALREADY_EXISTS', 'A review has already been submitted for this booking in this direction.');
      }

      const reciprocal = reviews.find((r) => r.bookingId === bId && r.direction !== direction);
      const isRevealed = !!reciprocal;

      const user = users.get(revId)!;
      const created = {
        id: `rev-${reviews.length + 1}`,
        bookingId: bId,
        reviewerId: revId,
        reviewedUserId,
        equipmentId,
        direction,
        rating: input.rating,
        comment: input.comment ?? null,
        status: isRevealed ? ('REVEALED' as const) : ('PENDING_REVEAL' as const),
        createdAt: new Date().toISOString(),
        reviewerName: user.fullName,
      };

      if (reciprocal) {
        reciprocal.status = 'REVEALED';
      }
      reviews.push(created);

      return {
        id: created.id,
        rating: created.rating,
        comment: created.comment,
        direction: created.direction,
        status: created.status,
        createdAt: created.createdAt,
        reviewerName: created.reviewerName,
        reviewerInitials: formatInitials(created.reviewerName),
      };
    },

    async getBookingReviews(bId: string, currentUserId: string): Promise<any> {
      if (bId !== bookingId) {
        throw new HttpError(404, 'BOOKING_NOT_FOUND', 'The booking was not found.');
      }
      const isRenter = currentUserId === bookingRenterId;
      const isOwner = currentUserId === bookingOwnerId;
      if (!isRenter && !isOwner) {
        throw new HttpError(403, 'FORBIDDEN', 'You are not authorized to view reviews for this booking.');
      }

      const myDirection = isRenter ? 'RENTER_TO_OWNER' : 'OWNER_TO_RENTER';
      const partnerDirection = isRenter ? 'OWNER_TO_RENTER' : 'RENTER_TO_OWNER';

      const myRow = reviews.find((r) => r.bookingId === bId && r.direction === myDirection);
      const partnerRow = reviews.find((r) => r.bookingId === bId && r.direction === partnerDirection);

      const bothSubmitted = !!myRow && !!partnerRow;

      const myReview = myRow
        ? {
            id: myRow.id,
            rating: myRow.rating,
            comment: myRow.comment,
            status: myRow.status,
            createdAt: myRow.createdAt,
            reviewerName: myRow.reviewerName,
            reviewerInitials: formatInitials(myRow.reviewerName),
            isRevealed: myRow.status === 'REVEALED' || bothSubmitted,
          }
        : null;

      let partnerReview = null;
      if (partnerRow) {
        if (partnerRow.status === 'REVEALED' || bothSubmitted) {
          partnerReview = {
            id: partnerRow.id,
            rating: partnerRow.rating,
            comment: partnerRow.comment,
            status: 'REVEALED' as const,
            createdAt: partnerRow.createdAt,
            reviewerName: partnerRow.reviewerName,
            reviewerInitials: formatInitials(partnerRow.reviewerName),
            isRevealed: true,
          };
        } else {
          partnerReview = {
            status: 'PENDING_REVEAL' as const,
            createdAt: partnerRow.createdAt,
            isRevealed: false,
          };
        }
      }

      return {
        bookingId: bId,
        status: bookingStatus,
        canReview: bookingStatus === 'COMPLETED' && !myRow,
        myRole: isRenter ? 'renter' : 'owner',
        myDirection,
        myReview,
        partnerReview,
      };
    },

    async getUserReputation(userId: string): Promise<any> {
      const ownerRev = reviews.filter(
        (r) => r.reviewedUserId === userId && r.direction === 'RENTER_TO_OWNER' && r.status === 'REVEALED',
      );
      const renterRev = reviews.filter(
        (r) => r.reviewedUserId === userId && r.direction === 'OWNER_TO_RENTER' && r.status === 'REVEALED',
      );

      const calcAvg = (list: typeof ownerRev) => {
        if (list.length === 0) return null;
        return Math.round((list.reduce((acc, c) => acc + c.rating, 0) / list.length) * 10) / 10;
      };

      return {
        userId,
        ownerReputation: {
          averageRating: calcAvg(ownerRev),
          reviewCount: ownerRev.length,
          completedRentals: ownerRev.length,
          reviews: ownerRev.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            reviewerName: r.reviewerName,
            reviewerInitials: formatInitials(r.reviewerName),
          })),
        },
        renterReputation: {
          averageRating: calcAvg(renterRev),
          reviewCount: renterRev.length,
          completedRentals: renterRev.length,
          reviews: renterRev.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            reviewerName: r.reviewerName,
            reviewerInitials: formatInitials(r.reviewerName),
          })),
        },
      };
    },
  };

  const app = createApp(
    async () => {},
    authDependencies,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    mockReviewsRepo,
  );

  return {
    app,
    reviews,
    setBookingStatus: (s: string) => {
      bookingStatus = s;
    },
    setBookingRenterId: (id: string) => {
      bookingRenterId = id;
    },
    setBookingOwnerId: (id: string) => {
      bookingOwnerId = id;
    },
  };
}

describe('Reviews & Ratings Module', () => {
  it('formats student initials cleanly', () => {
    expect(formatInitials('Gowrish Chandran')).toBe('GC');
    expect(formatInitials('Priya')).toBe('PR');
    expect(formatInitials('Dr. APJ Abdul Kalam')).toBe('DK');
    expect(formatInitials('')).toBe('V');
  });

  describe('GET /api/v1/equipment/:id/reviews', () => {
    it('returns reviews, average rating, count, and hides private student PII', async () => {
      const { app } = createHarness();
      const res = await request(app).get(`/api/v1/equipment/${equipmentId}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.reviewCount).toBe(1);
      expect(res.body.averageRating).toBe(5);
      expect(res.body.ratingDistribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 });
      expect(res.body.eligibleBookingId).toBeNull();

      const item = res.body.items[0];
      expect(item.reviewerName).toBe('Gowrish Chandran');
      expect(item.reviewerInitials).toBe('GC');
      expect(item.rating).toBe(5);
      expect(item.comment).toBe('Super crisp lens! Lender gave a thorough inspection.');
      // Ensure zero PII leakage:
      expect(item.email).toBeUndefined();
      expect(item.phone).toBeUndefined();
      expect(item.registrationNumber).toBeUndefined();
      expect(item.reviewerId).toBeUndefined();
    });

    it('returns eligibleBookingId when called by authenticated student with completed booking', async () => {
      const { app } = createHarness();
      const res = await request(app)
        .get(`/api/v1/equipment/${equipmentId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(renterId)}`);

      expect(res.status).toBe(200);
      expect(res.body.eligibleBookingId).toBe(bookingId);
    });

    it('rejects invalid UUID for equipment ID', async () => {
      const { app } = createHarness();
      const res = await request(app).get('/api/v1/equipment/invalid-uuid/reviews');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/bookings/:id/reviews', () => {
    it('rejects unauthenticated requests', async () => {
      const { app } = createHarness();
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .send({ rating: 5, comment: 'Great!' });

      expect(res.status).toBe(401);
    });

    it('rejects invalid rating values (out of 1-5 integer bounds)', async () => {
      const { app } = createHarness();
      const res1 = await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(renterId)}`)
        .send({ rating: 6 });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(renterId)}`)
        .send({ rating: 0 });
      expect(res2.status).toBe(400);

      const res3 = await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(renterId)}`)
        .send({ rating: 4.5 });
      expect(res3.status).toBe(400);
    });

    it('rejects comments exceeding 1000 characters', async () => {
      const { app } = createHarness();
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(renterId)}`)
        .send({ rating: 5, comment: 'A'.repeat(1001) });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/1000 characters/i);
    });

    it('rejects review when booking is not completed', async () => {
      const { app, setBookingStatus } = createHarness();
      setBookingStatus('ACTIVE');

      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(renterId)}`)
        .send({ rating: 5, comment: 'Nice' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('BOOKING_NOT_COMPLETED');
    });

    it('rejects review when submitted by non-renter / non-owner student', async () => {
      const { app } = createHarness();
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(thirdPartyId)}`)
        .send({ rating: 5, comment: 'Fraudulent review' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects owner reviewing their own equipment or self', async () => {
      const { app, setBookingRenterId, setBookingOwnerId } = createHarness();
      setBookingRenterId(ownerId);
      setBookingOwnerId(ownerId);

      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .send({ rating: 5, comment: 'Reviewing myself' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('creates review successfully for completed booking by renter', async () => {
      const { app } = createHarness();
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(renterId)}`)
        .send({ rating: 4, comment: 'Handled gently, smooth return process.' });

      expect(res.status).toBe(201);
      expect(res.body.review.rating).toBe(4);
      expect(res.body.review.comment).toBe('Handled gently, smooth return process.');
      expect(res.body.review.reviewerName).toBe('Gowrish Chandran');
      expect(res.body.review.reviewerInitials).toBe('GC');
    });

    it('creates review successfully for completed booking by owner (OWNER_TO_RENTER)', async () => {
      const { app } = createHarness();
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .send({ rating: 5, comment: 'Renter returned equipment in immaculate condition.' });

      expect(res.status).toBe(201);
      expect(res.body.review.rating).toBe(5);
      expect(res.body.review.direction).toBe('OWNER_TO_RENTER');
      expect(res.body.review.reviewerName).toBe('Aditya Kumar');
    });

    it('enforces one review per direction per booking (duplicate returns 409)', async () => {
      const { app } = createHarness();
      // First submission
      const res1 = await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(renterId)}`)
        .send({ rating: 4 });
      expect(res1.status).toBe(201);

      // Second submission for same booking by same renter
      const res2 = await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(renterId)}`)
        .send({ rating: 5, comment: 'Second review attempt' });

      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('REVIEW_ALREADY_EXISTS');
    });
  });

  describe('GET /api/v1/bookings/:id/reviews (Double-Blind Trust Reviews)', () => {
    it('rejects unauthorized third party user from viewing booking reviews', async () => {
      const { app } = createHarness();
      const res = await request(app)
        .get(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(thirdPartyId)}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('conceals partner review details until both parties submit (fair double-blind)', async () => {
      const { app } = createHarness();

      // 1. Renter submits review
      await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(renterId)}`)
        .send({ rating: 5, comment: 'Outstanding lender!' });

      // 2. Owner checks reviews before submitting their own
      const ownerViewRes = await request(app)
        .get(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`);

      expect(ownerViewRes.status).toBe(200);
      expect(ownerViewRes.body.myRole).toBe('owner');
      expect(ownerViewRes.body.canReview).toBe(true);
      expect(ownerViewRes.body.myReview).toBeNull();
      // Partner (renter) submitted, but rating and comment are hidden!
      expect(ownerViewRes.body.partnerReview).toBeDefined();
      expect(ownerViewRes.body.partnerReview.isRevealed).toBe(false);
      expect(ownerViewRes.body.partnerReview.rating).toBeUndefined();
      expect(ownerViewRes.body.partnerReview.comment).toBeUndefined();
      expect(ownerViewRes.body.partnerReview.status).toBe('PENDING_REVEAL');

      // 3. Owner submits review -> both reviews should reveal immediately
      await request(app)
        .post(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .send({ rating: 4, comment: 'Great renter, timely return.' });

      // 4. Now owner views again -> both revealed!
      const revealedRes = await request(app)
        .get(`/api/v1/bookings/${bookingId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`);

      expect(revealedRes.status).toBe(200);
      expect(revealedRes.body.partnerReview.isRevealed).toBe(true);
      expect(revealedRes.body.partnerReview.rating).toBe(5);
      expect(revealedRes.body.partnerReview.comment).toBe('Outstanding lender!');
      expect(revealedRes.body.myReview.isRevealed).toBe(true);
      expect(revealedRes.body.myReview.rating).toBe(4);
    });
  });

  describe('GET /api/v1/users/:id/reputation & /me/reputation', () => {
    it('returns separated owner and renter reputation metrics', async () => {
      const { app } = createHarness();

      const res = await request(app)
        .get(`/api/v1/users/${ownerId}/reputation`)
        .set('Authorization', `Bearer ${tokenFor(renterId)}`);

      expect(res.status).toBe(200);
      expect(res.body.ownerReputation).toBeDefined();
      expect(res.body.renterReputation).toBeDefined();
      // Owner received review from rev-1
      expect(res.body.ownerReputation.averageRating).toBe(5);
      expect(res.body.ownerReputation.reviewCount).toBe(1);
      // Renter has no reviews as renter yet -> null average rating
      expect(res.body.renterReputation.averageRating).toBeNull();
      expect(res.body.renterReputation.reviewCount).toBe(0);
    });

    it('returns own reputation at /api/v1/users/me/reputation', async () => {
      const { app } = createHarness();

      const res = await request(app)
        .get('/api/v1/users/me/reputation')
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(ownerId);
      expect(res.body.ownerReputation.averageRating).toBe(5);
    });
  });

  describe('POST /api/v1/equipment/:id/reviews', () => {
    it('creates review by resolving eligible booking automatically if not provided in body', async () => {
      const { app } = createHarness();
      const res = await request(app)
        .post(`/api/v1/equipment/${equipmentId}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(renterId)}`)
        .send({ rating: 5, comment: 'Auto-resolved booking review!' });

      expect(res.status).toBe(201);
      expect(res.body.review.rating).toBe(5);
      expect(res.body.review.comment).toBe('Auto-resolved booking review!');
    });
  });
});

