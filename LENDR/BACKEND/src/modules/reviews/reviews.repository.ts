import { pool } from '../../config/database';
import { HttpError } from '../../middleware/http-error';
import type {
  CreateReviewInput,
  EquipmentReviewsResponse,
  PublicReview,
  RatingDistribution,
  ReviewsRepository,
  BookingReviewSummary,
  UserReputationSummary,
  ReviewDirection,
} from './reviews.types';

function requirePool() {
  if (!pool) {
    throw new Error('PostgreSQL connection settings are not configured.');
  }
  return pool;
}

export function formatInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'V';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export class PostgresReviewsRepository implements ReviewsRepository {
  async getEquipmentReviews(
    equipmentId: string,
    currentUserId?: string,
  ): Promise<EquipmentReviewsResponse> {
    const db = requirePool();

    const [reviewsResult, eligibleBookingId] = await Promise.all([
      db.query<{
        id: string;
        rating: number;
        comment: string | null;
        createdAt: Date;
        reviewerFullName: string;
      }>(
        `SELECT
           r.id,
           r.rating,
           r.comment,
           r.created_at AS "createdAt",
           u.full_name AS "reviewerFullName"
         FROM reviews r
         JOIN users u ON u.id = r.reviewer_id
         WHERE r.equipment_id = $1
           AND r.direction = 'RENTER_TO_OWNER'
           AND (r.status = 'REVEALED' OR r.reveal_at <= CURRENT_TIMESTAMP)
         ORDER BY r.created_at DESC`,
        [equipmentId],
      ),
      currentUserId ? this.findEligibleBookingId(equipmentId, currentUserId) : Promise.resolve(null),
    ]);

    const items: PublicReview[] = reviewsResult.rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
      reviewerName: row.reviewerFullName,
      reviewerInitials: formatInitials(row.reviewerFullName),
    }));

    const distribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    for (const item of items) {
      sum += item.rating;
      if (item.rating in distribution) {
        distribution[item.rating as keyof RatingDistribution]++;
      }
    }

    const reviewCount = items.length;
    const averageRating = reviewCount > 0 ? Math.round((sum / reviewCount) * 10) / 10 : 0;

    return {
      items,
      averageRating,
      reviewCount,
      ratingDistribution: distribution,
      eligibleBookingId,
    };
  }

  async findEligibleBookingId(equipmentId: string, userId: string): Promise<string | null> {
    const db = requirePool();
    const result = await db.query<{ id: string }>(
      `SELECT b.id
       FROM bookings b
       WHERE b.equipment_id = $1
         AND b.renter_id = $2
         AND b.status = 'COMPLETED'
         AND NOT EXISTS (
           SELECT 1 FROM reviews r
           WHERE r.booking_id = b.id AND r.direction = 'RENTER_TO_OWNER'
         )
       ORDER BY b.end_at DESC
       LIMIT 1`,
      [equipmentId, userId],
    );
    return result.rows[0]?.id ?? null;
  }

  async createReview(
    bookingId: string,
    reviewerId: string,
    input: CreateReviewInput,
  ): Promise<PublicReview> {
    const db = requirePool();

    // 1. Fetch booking with equipment owner info and renter name
    const bookingResult = await db.query<{
      id: string;
      equipmentId: string;
      equipmentTitle: string;
      renterId: string;
      status: string;
      ownerUserId: string;
      renterName: string;
      ownerName: string;
    }>(
      `SELECT
         b.id,
         b.equipment_id AS "equipmentId",
         e.title AS "equipmentTitle",
         b.renter_id AS "renterId",
         b.status,
         e.owner_user_id AS "ownerUserId",
         renter.full_name AS "renterName",
         owner.full_name AS "ownerName"
       FROM bookings b
       JOIN equipment e ON e.id = b.equipment_id
       JOIN users renter ON renter.id = b.renter_id
       JOIN users owner ON owner.id = e.owner_user_id
       WHERE b.id = $1`,
      [bookingId],
    );

    const booking = bookingResult.rows[0];
    if (!booking) {
      throw new HttpError(404, 'BOOKING_NOT_FOUND', 'The booking was not found.');
    }

    // 2. Enforce COMPLETED status
    if (booking.status !== 'COMPLETED') {
      throw new HttpError(
        422,
        'BOOKING_NOT_COMPLETED',
        'Reviews can only be submitted for completed bookings.',
      );
    }

    // 3. Determine review direction & reviewed user
    let direction: ReviewDirection;
    let reviewedUserId: string;
    let reviewerName: string;

    if (reviewerId === booking.renterId) {
      direction = 'RENTER_TO_OWNER';
      reviewedUserId = booking.ownerUserId;
      reviewerName = booking.renterName;
    } else if (reviewerId === booking.ownerUserId) {
      direction = 'OWNER_TO_RENTER';
      reviewedUserId = booking.renterId;
      reviewerName = booking.ownerName;
    } else {
      throw new HttpError(
        403,
        'FORBIDDEN',
        'Only the renter or owner of this booking can submit a review.',
      );
    }

    // 4. Prevent self-review
    if (reviewerId === reviewedUserId) {
      throw new HttpError(403, 'FORBIDDEN', 'Owners cannot review their own equipment or self.');
    }

    // 5. Check if review in this direction already exists
    const existingResult = await db.query<{ id: string }>(
      'SELECT id FROM reviews WHERE booking_id = $1 AND direction = $2',
      [bookingId, direction],
    );
    if (existingResult.rows.length > 0) {
      throw new HttpError(
        409,
        'REVIEW_ALREADY_EXISTS',
        'A review has already been submitted for this booking in this direction.',
      );
    }

    // 6. Check if reciprocal review exists
    const reciprocalResult = await db.query<{ id: string }>(
      'SELECT id FROM reviews WHERE booking_id = $1 AND direction <> $2',
      [bookingId, direction],
    );
    const hasReciprocal = reciprocalResult.rows.length > 0;
    const initialStatus = hasReciprocal ? 'REVEALED' : 'PENDING_REVEAL';

    // 7. Insert review
    try {
      const insertResult = await db.query<{
        id: string;
        rating: number;
        comment: string | null;
        direction: ReviewDirection;
        status: 'PENDING_REVEAL' | 'REVEALED';
        createdAt: Date;
      }>(
        `INSERT INTO reviews (
           booking_id,
           reviewer_id,
           reviewed_user_id,
           equipment_id,
           direction,
           rating,
           comment,
           status,
           reveal_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP + interval '7 days')
         RETURNING
           id,
           rating,
           comment,
           direction,
           status,
           created_at AS "createdAt"`,
        [
          booking.id,
          reviewerId,
          reviewedUserId,
          booking.equipmentId,
          direction,
          input.rating,
          input.comment?.trim() || null,
          initialStatus,
        ],
      );

      // If reciprocal existed, make sure both are REVEALED
      if (hasReciprocal) {
        await db.query(
          `UPDATE reviews SET status = 'REVEALED' WHERE booking_id = $1`,
          [booking.id],
        );

        // Notify both parties of review reveal
        await db.query(
          `INSERT INTO notifications (user_id, type, title, body, metadata)
           VALUES
             ($1, 'REVIEW_REVEALED', 'Reviews Revealed!', $3, jsonb_build_object('bookingId', $5::text)),
             ($2, 'REVIEW_REVEALED', 'Reviews Revealed!', $4, jsonb_build_object('bookingId', $5::text))`,
          [
            booking.renterId,
            booking.ownerUserId,
            `Both reviews have been submitted for ${booking.equipmentTitle}. You can now view your feedback!`,
            `Both reviews have been submitted for ${booking.equipmentTitle}. You can now view your feedback!`,
            booking.id,
          ],
        );
      } else {
        // Notify the other party that their partner left a review
        const notifyTarget = direction === 'RENTER_TO_OWNER' ? booking.ownerUserId : booking.renterId;
        await db.query(
          `INSERT INTO notifications (user_id, type, title, body, metadata)
           VALUES ($1, 'REVIEW_PARTNER_SUBMITTED', 'Review Received', $2, jsonb_build_object('bookingId', $3::text))`,
          [
            notifyTarget,
            `Your rental partner submitted a review for ${booking.equipmentTitle}. Submit yours to reveal mutual feedback!`,
            booking.id,
          ],
        );
      }

      const row = insertResult.rows[0];
      return {
        id: row.id,
        bookingId: booking.id,
        equipmentId: booking.equipmentId,
        equipmentTitle: booking.equipmentTitle,
        reviewerId,
        reviewedUserId,
        direction: row.direction,
        rating: row.rating,
        comment: row.comment,
        status: hasReciprocal ? 'REVEALED' : row.status,
        createdAt: row.createdAt.toISOString(),
        reviewerName,
        reviewerInitials: formatInitials(reviewerName),
      };
    } catch (error: unknown) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === '23505' || pgError.constraint === 'reviews_booking_direction_unique') {
        throw new HttpError(
          409,
          'REVIEW_ALREADY_EXISTS',
          'A review has already been submitted for this booking in this direction.',
        );
      }
      if (pgError.code === '23514') {
        throw new HttpError(
          422,
          'BOOKING_NOT_COMPLETED',
          'Reviews can only be submitted for completed bookings.',
        );
      }
      throw error;
    }
  }

  async getBookingReviews(bookingId: string, currentUserId: string): Promise<BookingReviewSummary> {
    const db = requirePool();

    // 1. Fetch booking to verify authorization
    const bookingResult = await db.query<{
      id: string;
      renter_id: string;
      owner_user_id: string;
      status: string;
    }>(
      `SELECT b.id, b.renter_id, e.owner_user_id, b.status
       FROM bookings b
       JOIN equipment e ON e.id = b.equipment_id
       WHERE b.id = $1`,
      [bookingId],
    );

    const booking = bookingResult.rows[0];
    if (!booking) {
      throw new HttpError(404, 'BOOKING_NOT_FOUND', 'The booking was not found.');
    }

    const isRenter = booking.renter_id === currentUserId;
    const isOwner = booking.owner_user_id === currentUserId;

    if (!isRenter && !isOwner) {
      throw new HttpError(403, 'FORBIDDEN', 'You are not authorized to view reviews for this booking.');
    }

    const myRole: 'renter' | 'owner' = isRenter ? 'renter' : 'owner';
    const myDirection: ReviewDirection = isRenter ? 'RENTER_TO_OWNER' : 'OWNER_TO_RENTER';
    const partnerDirection: ReviewDirection = isRenter ? 'OWNER_TO_RENTER' : 'RENTER_TO_OWNER';

    // 2. Fetch all reviews for this booking
    const reviewsResult = await db.query<{
      id: string;
      reviewer_id: string;
      direction: ReviewDirection;
      rating: number;
      comment: string | null;
      status: 'PENDING_REVEAL' | 'REVEALED';
      reveal_at: Date;
      created_at: Date;
      reviewer_name: string;
    }>(
      `SELECT r.id, r.reviewer_id, r.direction, r.rating, r.comment,
              r.status, r.reveal_at, r.created_at, u.full_name AS reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.booking_id = $1`,
      [bookingId],
    );

    const rows = reviewsResult.rows;
    const bothSubmitted = rows.length >= 2;

    const myRow = rows.find((r) => r.direction === myDirection);
    const partnerRow = rows.find((r) => r.direction === partnerDirection);

    const canReview = booking.status === 'COMPLETED' && !myRow;

    // Helper to evaluate reveal
    const isReviewRevealed = (r: (typeof rows)[0]) =>
      r.status === 'REVEALED' || new Date(r.reveal_at) <= new Date() || bothSubmitted;

    const myReview = myRow
      ? {
          id: myRow.id,
          rating: myRow.rating,
          comment: myRow.comment,
          status: isReviewRevealed(myRow) ? ('REVEALED' as const) : ('PENDING_REVEAL' as const),
          createdAt: myRow.created_at.toISOString(),
          reviewerName: myRow.reviewer_name,
          reviewerInitials: formatInitials(myRow.reviewer_name),
          isRevealed: isReviewRevealed(myRow),
        }
      : null;

    let partnerReview = null;
    if (partnerRow) {
      const revealed = isReviewRevealed(partnerRow);
      if (revealed) {
        partnerReview = {
          id: partnerRow.id,
          rating: partnerRow.rating,
          comment: partnerRow.comment,
          status: 'REVEALED' as const,
          createdAt: partnerRow.created_at.toISOString(),
          reviewerName: partnerRow.reviewer_name,
          reviewerInitials: formatInitials(partnerRow.reviewer_name),
          isRevealed: true,
        };
      } else {
        // Double-blind: submitted but contents hidden
        partnerReview = {
          status: 'PENDING_REVEAL' as const,
          createdAt: partnerRow.created_at.toISOString(),
          isRevealed: false,
        };
      }
    }

    return {
      bookingId,
      status: booking.status,
      canReview,
      myRole,
      myDirection,
      myReview,
      partnerReview,
    };
  }

  async getUserReputation(userId: string): Promise<UserReputationSummary> {
    const db = requirePool();

    const [ownerReviewsRes, renterReviewsRes, ownerRentalsRes, renterRentalsRes] = await Promise.all([
      // 1. Owner reviews: where reviewed_user_id = userId AND direction = 'RENTER_TO_OWNER'
      db.query<{
        id: string;
        booking_id: string;
        equipment_id: string;
        equipment_title: string;
        rating: number;
        comment: string | null;
        created_at: Date;
        reviewer_name: string;
      }>(
        `SELECT r.id, r.booking_id, r.equipment_id, e.title AS equipment_title,
                r.rating, r.comment, r.created_at, u.full_name AS reviewer_name
         FROM reviews r
         JOIN equipment e ON e.id = r.equipment_id
         JOIN users u ON u.id = r.reviewer_id
         WHERE r.reviewed_user_id = $1
           AND r.direction = 'RENTER_TO_OWNER'
           AND (r.status = 'REVEALED' OR r.reveal_at <= CURRENT_TIMESTAMP)
         ORDER BY r.created_at DESC`,
        [userId],
      ),

      // 2. Renter reviews: where reviewed_user_id = userId AND direction = 'OWNER_TO_RENTER'
      db.query<{
        id: string;
        booking_id: string;
        equipment_id: string;
        equipment_title: string;
        rating: number;
        comment: string | null;
        created_at: Date;
        reviewer_name: string;
      }>(
        `SELECT r.id, r.booking_id, r.equipment_id, e.title AS equipment_title,
                r.rating, r.comment, r.created_at, u.full_name AS reviewer_name
         FROM reviews r
         JOIN equipment e ON e.id = r.equipment_id
         JOIN users u ON u.id = r.reviewer_id
         WHERE r.reviewed_user_id = $1
           AND r.direction = 'OWNER_TO_RENTER'
           AND (r.status = 'REVEALED' OR r.reveal_at <= CURRENT_TIMESTAMP)
         ORDER BY r.created_at DESC`,
        [userId],
      ),

      // 3. Completed rentals as owner
      db.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM bookings b
         JOIN equipment e ON e.id = b.equipment_id
         WHERE e.owner_user_id = $1 AND b.status = 'COMPLETED'`,
        [userId],
      ),

      // 4. Completed rentals as renter
      db.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM bookings b
         WHERE b.renter_id = $1 AND b.status = 'COMPLETED'`,
        [userId],
      ),
    ]);

    const mapReview = (r: (typeof ownerReviewsRes.rows)[0]): PublicReview => ({
      id: r.id,
      bookingId: r.booking_id,
      equipmentId: r.equipment_id,
      equipmentTitle: r.equipment_title,
      rating: r.rating,
      comment: r.comment,
      status: 'REVEALED',
      createdAt: r.created_at.toISOString(),
      reviewerName: r.reviewer_name,
      reviewerInitials: formatInitials(r.reviewer_name),
    });

    const ownerReviews = ownerReviewsRes.rows.map(mapReview);
    const renterReviews = renterReviewsRes.rows.map(mapReview);

    const calcAverage = (list: { rating: number }[]) => {
      if (list.length === 0) return null;
      const sum = list.reduce((acc, curr) => acc + curr.rating, 0);
      return Math.round((sum / list.length) * 10) / 10;
    };

    return {
      userId,
      ownerReputation: {
        averageRating: calcAverage(ownerReviews),
        reviewCount: ownerReviews.length,
        completedRentals: parseInt(ownerRentalsRes.rows[0]?.count || '0', 10),
        reviews: ownerReviews,
      },
      renterReputation: {
        averageRating: calcAverage(renterReviews),
        reviewCount: renterReviews.length,
        completedRentals: parseInt(renterRentalsRes.rows[0]?.count || '0', 10),
        reviews: renterReviews,
      },
    };
  }
}

export const reviewsRepository = new PostgresReviewsRepository();
