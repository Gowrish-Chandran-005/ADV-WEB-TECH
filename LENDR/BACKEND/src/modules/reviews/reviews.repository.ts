import { pool } from '../../config/database';
import { HttpError } from '../../middleware/http-error';
import type {
  CreateReviewInput,
  EquipmentReviewsResponse,
  PublicReview,
  RatingDistribution,
  ReviewsRepository,
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
           SELECT 1 FROM reviews r WHERE r.booking_id = b.id
         )
       ORDER BY b.end_time DESC
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
      renterId: string;
      status: string;
      ownerUserId: string;
      reviewerFullName: string;
    }>(
      `SELECT
         b.id,
         b.equipment_id AS "equipmentId",
         b.renter_id AS "renterId",
         b.status,
         e.owner_user_id AS "ownerUserId",
         u.full_name AS "reviewerFullName"
       FROM bookings b
       JOIN equipment e ON e.id = b.equipment_id
       JOIN users u ON u.id = b.renter_id
       WHERE b.id = $1`,
      [bookingId],
    );

    const booking = bookingResult.rows[0];
    if (!booking) {
      throw new HttpError(404, 'BOOKING_NOT_FOUND', 'The booking was not found.');
    }

    // 2. Enforce renter ownership
    if (booking.renterId !== reviewerId) {
      throw new HttpError(403, 'FORBIDDEN', 'Only the renter of this booking can review the equipment.');
    }

    // 3. Prevent owner from reviewing own equipment
    if (booking.ownerUserId === reviewerId) {
      throw new HttpError(403, 'FORBIDDEN', 'Owners cannot review their own equipment.');
    }

    // 4. Enforce COMPLETED status
    if (booking.status !== 'COMPLETED') {
      throw new HttpError(
        422,
        'BOOKING_NOT_COMPLETED',
        'Reviews can only be submitted for completed bookings.',
      );
    }

    // 5. Check if review already exists
    const existingResult = await db.query<{ id: string }>(
      'SELECT id FROM reviews WHERE booking_id = $1',
      [bookingId],
    );
    if (existingResult.rows.length > 0) {
      throw new HttpError(
        409,
        'REVIEW_ALREADY_EXISTS',
        'A review has already been submitted for this booking.',
      );
    }

    // 6. Insert review
    try {
      const insertResult = await db.query<{
        id: string;
        rating: number;
        comment: string | null;
        createdAt: Date;
      }>(
        `INSERT INTO reviews (
           booking_id,
           reviewer_id,
           reviewed_user_id,
           equipment_id,
           rating,
           comment
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING
           id,
           rating,
           comment,
           created_at AS "createdAt"`,
        [
          booking.id,
          reviewerId,
          booking.ownerUserId,
          booking.equipmentId,
          input.rating,
          input.comment?.trim() || null,
        ],
      );

      const row = insertResult.rows[0];
      return {
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.createdAt.toISOString(),
        reviewerName: booking.reviewerFullName,
        reviewerInitials: formatInitials(booking.reviewerFullName),
      };
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        throw new HttpError(
          409,
          'REVIEW_ALREADY_EXISTS',
          'A review has already been submitted for this booking.',
        );
      }
      if (pgError.code === '23514') {
        throw new HttpError(
          422,
          'BOOKING_NOT_COMPLETED',
          'A review can only be created for a completed booking by its renter.',
        );
      }
      throw error;
    }
  }
}

export const reviewsRepository = new PostgresReviewsRepository();
