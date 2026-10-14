export type ReviewDirection = 'RENTER_TO_OWNER' | 'OWNER_TO_RENTER';
export type ReviewStatus = 'PENDING_REVEAL' | 'REVEALED';

export interface ReviewRecord {
  id: string;
  bookingId: string;
  reviewerId: string;
  reviewedUserId: string;
  equipmentId: string;
  direction: ReviewDirection;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  revealAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicReview {
  id: string;
  bookingId?: string;
  equipmentId?: string;
  equipmentTitle?: string;
  reviewerId?: string;
  reviewedUserId?: string;
  direction?: ReviewDirection;
  rating: number;
  comment: string | null;
  status?: ReviewStatus;
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

export interface BookingReviewItem {
  id?: string;
  rating?: number;
  comment?: string | null;
  status: ReviewStatus;
  createdAt?: string;
  reviewerName?: string;
  reviewerInitials?: string;
  isRevealed: boolean;
}

export interface BookingReviewSummary {
  bookingId: string;
  status: string;
  canReview: boolean;
  myRole: 'renter' | 'owner' | 'none';
  myDirection: ReviewDirection | null;
  myReview: BookingReviewItem | null;
  partnerReview: BookingReviewItem | null;
}

export interface ReputationCategory {
  averageRating: number | null;
  reviewCount: number;
  completedRentals: number;
  reviews: PublicReview[];
}

export interface UserReputationSummary {
  userId: string;
  ownerReputation: ReputationCategory;
  renterReputation: ReputationCategory;
}

export interface ReviewsRepository {
  getEquipmentReviews(equipmentId: string, currentUserId?: string): Promise<EquipmentReviewsResponse>;
  createReview(bookingId: string, reviewerId: string, input: CreateReviewInput): Promise<PublicReview>;
  getBookingReviews(bookingId: string, currentUserId: string): Promise<BookingReviewSummary>;
  getUserReputation(userId: string): Promise<UserReputationSummary>;
  findEligibleBookingId(equipmentId: string, userId: string): Promise<string | null>;
}
