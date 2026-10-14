export interface ReviewRecord {
  id: string;
  bookingId: string;
  reviewerId: string;
  reviewedUserId: string;
  equipmentId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
  reviewerInitials: string;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface EquipmentReviewsResponse {
  items: PublicReview[];
  averageRating: number;
  reviewCount: number;
  ratingDistribution: RatingDistribution;
  eligibleBookingId: string | null;
}

export interface CreateReviewInput {
  rating: number;
  comment?: string | null;
}

export interface ReviewsRepository {
  getEquipmentReviews(equipmentId: string, currentUserId?: string): Promise<EquipmentReviewsResponse>;
  createReview(bookingId: string, reviewerId: string, input: CreateReviewInput): Promise<PublicReview>;
  findEligibleBookingId(equipmentId: string, userId: string): Promise<string | null>;
}
