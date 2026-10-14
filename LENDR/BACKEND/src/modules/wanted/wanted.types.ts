export type WantedUrgency = 'HIGH' | 'MEDIUM';
export type WantedStatus = 'OPEN' | 'FULFILLED' | 'WITHDRAWN' | 'EXPIRED';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';

export interface WantedAuthorPublic {
  id: string;
  fullName: string;
  initials: string;
}

export interface WantedRequest {
  id: string;
  userId: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  title: string;
  description: string;
  locationBlock: string | null;
  startDate: string;
  endDate: string;
  urgency: WantedUrgency;
  status: WantedStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  offersCount: number;
  author: WantedAuthorPublic;
}

export interface WantedOffer {
  id: string;
  wantedRequestId: string;
  offererUserId: string;
  offererName: string;
  equipmentId: string;
  equipmentTitle: string;
  equipmentImage: string | null;
  dailyRentalPrice: string;
  securityDeposit: string | null;
  message: string | null;
  status: OfferStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface WantedRequestWithOffers extends WantedRequest {
  offers: WantedOffer[];
}

export interface UserSentOffer extends WantedOffer {
  wantedRequestTitle: string;
  wantedRequestStartDate: string;
  wantedRequestEndDate: string;
  wantedRequestUrgency: WantedUrgency;
  wantedRequestStatus: WantedStatus;
}

export interface CreateWantedRequestInput {
  title: string;
  description: string;
  categoryId?: string | null;
  locationBlock?: string | null;
  startDate: string;
  endDate: string;
  urgency?: WantedUrgency;
}

export interface UpdateWantedRequestInput {
  title?: string;
  description?: string;
  categoryId?: string | null;
  locationBlock?: string | null;
  startDate?: string;
  endDate?: string;
  urgency?: WantedUrgency;
}

export interface CreateOfferInput {
  equipmentId: string;
  message?: string | null;
}

export interface RespondOfferInput {
  action: 'accept' | 'decline';
  reason?: string;
}

export interface WantedFilterOptions {
  query?: string;
  category?: string;
  status?: string;
  urgency?: WantedUrgency;
  page: number;
  pageSize: number;
  sort?: 'newest' | 'urgent';
}

export interface WantedPage {
  items: WantedRequest[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MatchedEquipmentItem {
  id: string;
  title: string;
  description: string;
  categoryName: string;
  categorySlug: string;
  dailyRentalPrice: string;
  securityDeposit: string | null;
  pickupLocation: string;
  condition: string;
  imageUrls: string[];
  ownerUserId: string;
  matchReasons: string[];
}

export interface WantedRepository {
  createRequest(userId: string, input: CreateWantedRequestInput): Promise<WantedRequest>;
  getRequestById(id: string): Promise<WantedRequest | null>;
  listRequests(filters: WantedFilterOptions): Promise<WantedPage>;
  updateRequest(id: string, userId: string, input: UpdateWantedRequestInput): Promise<WantedRequest | 'not_found' | 'not_open'>;
  withdrawRequest(id: string, userId: string): Promise<boolean | 'not_found'>;
  getOffersForRequest(requestId: string): Promise<WantedOffer[]>;
  getOfferById(offerId: string): Promise<WantedOffer | null>;
  createOffer(offererUserId: string, requestId: string, input: CreateOfferInput): Promise<
    | { offer: WantedOffer; request: WantedRequest; equipmentOwnerId: string }
    | 'request_not_found'
    | 'request_not_open'
    | 'self_offer'
    | 'equipment_not_found'
    | 'equipment_not_owned'
    | 'equipment_inactive'
    | 'equipment_unavailable'
    | 'duplicate_offer'
  >;
  respondToOffer(
    authorUserId: string,
    offerId: string,
    input: RespondOfferInput,
  ): Promise<
    | { offer: WantedOffer; request: WantedRequest }
    | 'offer_not_found'
    | 'request_not_found'
    | 'forbidden'
    | 'offer_not_pending'
    | 'request_not_open'
    | 'already_accepted'
    | 'equipment_unavailable'
  >;
  findMatchesForRequest(requestId: string): Promise<MatchedEquipmentItem[]>;
  listRequestsByUser(userId: string): Promise<WantedRequestWithOffers[]>;
  listOffersByUser(userId: string): Promise<UserSentOffer[]>;
}
