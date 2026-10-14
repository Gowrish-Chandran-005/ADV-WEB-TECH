/**
 * LENDR API service layer.
 * All backend calls go through this module.
 * No UI logic here — only HTTP communication and typed responses.
 */

const BASE_URL = '/api/v1';

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('lendr_token');
}

function setToken(token: string): void {
  localStorage.setItem('lendr_token', token);
}

function clearToken(): void {
  localStorage.removeItem('lendr_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let code = 'UNKNOWN';

    if (data && typeof data === 'object') {
      if (typeof data.error === 'object' && data.error !== null) {
        if (typeof data.error.message === 'string' && data.error.message.trim()) {
          message = data.error.message;
        }
        if (typeof data.error.code === 'string') {
          code = data.error.code;
        }
      } else if (typeof data.message === 'string' && data.message.trim()) {
        message = data.message;
      } else if (typeof data.error === 'string' && data.error.trim()) {
        message = data.error;
      }

      if (typeof data.code === 'string') {
        code = data.code;
      }
    }

    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
    const retryAfter = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined;

    throw new ApiError(response.status, code, message, retryAfter);
  }

  return data as T;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}


// ─── Types (mirrors backend shapes) ──────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  registrationNumber: string | null;
  phone: string | null;
  role: 'STUDENT' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ApiEquipmentListing {
  id: string;
  ownerUserId: string;
  ownerFullName: string;
  organizationId: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  title: string;
  description: string;
  tags: string[];
  features: string[];
  useCases: string[];
  specifications: Record<string, unknown>;
  imageUrls: string[];
  dailyRentalPrice: string;
  securityDeposit: string | null;
  maxRentalDays: number;
  pickupLocation: string;
  condition: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiPagedResult<T> {
  items: T[];
  pagination: ApiPagination;
}

export interface ApiBooking {
  id: string;
  equipmentId: string;
  equipmentTitle: string;
  equipmentStatus: string;
  renterId: string;
  renterFullName: string;
  ownerUserId: string;
  organizationId: string | null;
  startAt: string;
  endAt: string;
  status: string;
  rentalDays: number;
  dailyRentalPrice: string;
  securityDeposit: string;
  totalPrice: string;
  notes: string | null;
  expiresAt: string;
  returnRecordedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAvailability {
  available: boolean;
  conflictingBookings: number;
  maintenanceBlocks: Array<{ startAt: string; endAt: string }>;
}

export interface ApiMaintenanceBlock {
  id: string;
  equipmentId: string;
  startAt: string;
  endAt: string;
  reason: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceBody {
  startDate: string;
  endDate: string;
  reason: string;
}

export interface CreateEquipmentBody {
  categoryId: string;
  title: string;
  description: string;
  tags: string[];
  features: string[];
  useCases: string[];
  specifications: Record<string, unknown>;
  imageUrls: string[];
  dailyRentalPrice: number;
  securityDeposit?: number | null;
  maxRentalDays: number;
  pickupLocation: string;
  condition?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  organizationId?: string | null;
}

export interface CreateBookingBody {
  equipmentId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  notes?: string | null;
}

// ─── Wanted & Notifications Types ─────────────────────────────────────────────

export type ApiWantedUrgency = 'HIGH' | 'MEDIUM';
export type ApiWantedStatus = 'OPEN' | 'FULFILLED' | 'WITHDRAWN' | 'EXPIRED';
export type ApiOfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';

export interface ApiWantedAuthor {
  id: string;
  fullName: string;
  initials: string;
}

export interface ApiWantedRequest {
  id: string;
  userId: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  title: string;
  description: string;
  locationBlock: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  urgency: ApiWantedUrgency;
  status: ApiWantedStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  offersCount: number;
  author: ApiWantedAuthor;
}

export interface ApiWantedOffer {
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
  status: ApiOfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMatchedEquipmentItem {
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

export interface ApiNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface ApiNotificationListResult {
  items: ApiNotification[];
  unreadCount: number;
  pagination: ApiPagination;
}

export interface BrowseWantedParams {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  status?: ApiWantedStatus | 'ALL';
  urgency?: ApiWantedUrgency;
  sort?: 'newest' | 'urgent';
}

export interface CreateWantedPayload {
  title: string;
  description: string;
  categoryId?: string | null;
  locationBlock?: string | null;
  startDate: string;
  endDate: string;
  urgency?: ApiWantedUrgency;
}

export interface UpdateWantedPayload {
  title?: string;
  description?: string;
  categoryId?: string | null;
  locationBlock?: string | null;
  startDate?: string;
  endDate?: string;
  urgency?: ApiWantedUrgency;
}

export interface CreateOfferPayload {
  equipmentId: string;
  message?: string | null;
}

export interface RespondOfferPayload {
  action: 'accept' | 'decline';
  reason?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  async register(payload: {
    email: string;
    password: string;
    fullName: string;
    registrationNumber?: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const result = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(result.accessToken);
    return result;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const result = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(result.accessToken);
    return result;
  },

  async me(): Promise<{ user: ApiUser }> {
    return apiFetch<{ user: ApiUser }>('/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' });
    } finally {
      clearToken();
    }
  },

  getToken,
  isLoggedIn: () => Boolean(getToken()),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  async me(): Promise<{ user: ApiUser }> {
    return apiFetch<{ user: ApiUser }>('/users/me');
  },

  async updateProfile(payload: {
    fullName?: string;
    registrationNumber?: string | null;
    phone?: string | null;
  }): Promise<{ user: ApiUser }> {
    return apiFetch<{ user: ApiUser }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  async list(): Promise<{ items: ApiCategory[] }> {
    return apiFetch<{ items: ApiCategory[] }>('/categories');
  },
};

// ─── Equipment ────────────────────────────────────────────────────────────────

export interface BrowseEquipmentParams {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}

export const equipmentApi = {
  async browse(
    params: BrowseEquipmentParams = {},
  ): Promise<ApiPagedResult<ApiEquipmentListing>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params.q) searchParams.set('q', params.q);
    if (params.category) searchParams.set('category', params.category);
    if (params.minPrice !== undefined) searchParams.set('minPrice', String(params.minPrice));
    if (params.maxPrice !== undefined) searchParams.set('maxPrice', String(params.maxPrice));
    if (params.sort) searchParams.set('sort', params.sort);
    const qs = searchParams.toString();
    return apiFetch<ApiPagedResult<ApiEquipmentListing>>(
      `/equipment${qs ? `?${qs}` : ''}`,
    );
  },

  async getById(id: string): Promise<{ equipment: ApiEquipmentListing }> {
    return apiFetch<{ equipment: ApiEquipmentListing }>(`/equipment/${id}`);
  },

  async create(body: CreateEquipmentBody): Promise<{ equipment: ApiEquipmentListing }> {
    return apiFetch<{ equipment: ApiEquipmentListing }>('/equipment', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async myListings(
    params: { page?: number; pageSize?: number; sort?: string; status?: string } = {},
  ): Promise<ApiPagedResult<ApiEquipmentListing>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return apiFetch<ApiPagedResult<ApiEquipmentListing>>(
      `/users/me/equipment${qs ? `?${qs}` : ''}`,
    );
  },

  async addFavorite(id: string): Promise<{ favorited: boolean }> {
    return apiFetch<{ favorited: boolean }>(`/equipment/${id}/favorite`, {
      method: 'POST',
    });
  },

  async removeFavorite(id: string): Promise<void> {
    return apiFetch<void>(`/equipment/${id}/favorite`, { method: 'DELETE' });
  },

  async myFavorites(
    params: { page?: number; pageSize?: number } = {},
  ): Promise<ApiPagedResult<ApiEquipmentListing>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    const qs = searchParams.toString();
    return apiFetch<ApiPagedResult<ApiEquipmentListing>>(
      `/users/me/favorites${qs ? `?${qs}` : ''}`,
    );
  },

  async checkAvailability(
    id: string,
    startDate: string,
    endDate: string,
  ): Promise<ApiAvailability> {
    return apiFetch<ApiAvailability>(
      `/equipment/${id}/availability?startDate=${startDate}&endDate=${endDate}`,
    );
  },
};

// ─── Favorites ────────────────────────────────────────────────────────────────

export const favoritesApi = {
  addFavorite: (id: string): Promise<{ favorited: boolean }> => equipmentApi.addFavorite(id),
  removeFavorite: (id: string): Promise<void> => equipmentApi.removeFavorite(id),
  myFavorites: (
    params: { page?: number; pageSize?: number } = {},
  ): Promise<ApiPagedResult<ApiEquipmentListing>> => equipmentApi.myFavorites(params),
};

// ─── Maintenance & Unavailability ─────────────────────────────────────────────

export const maintenanceApi = {
  async list(equipmentId: string): Promise<{ items: ApiMaintenanceBlock[] }> {
    return apiFetch<{ items: ApiMaintenanceBlock[] }>(`/equipment/${equipmentId}/maintenance`);
  },

  async create(
    equipmentId: string,
    body: CreateMaintenanceBody,
  ): Promise<{ maintenance: ApiMaintenanceBlock }> {
    return apiFetch<{ maintenance: ApiMaintenanceBlock }>(`/equipment/${equipmentId}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async delete(equipmentId: string, blockId: string): Promise<void> {
    return apiFetch<void>(`/equipment/${equipmentId}/maintenance/${blockId}`, {
      method: 'DELETE',
    });
  },
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookingsApi = {
  async create(body: CreateBookingBody): Promise<{ booking: ApiBooking }> {
    return apiFetch<{ booking: ApiBooking }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async myBookings(
    params: { page?: number; pageSize?: number } = {},
  ): Promise<ApiPagedResult<ApiBooking>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    const qs = searchParams.toString();
    return apiFetch<ApiPagedResult<ApiBooking>>(
      `/bookings/me${qs ? `?${qs}` : ''}`,
    );
  },

  async receivedBookings(
    params: { page?: number; pageSize?: number } = {},
  ): Promise<ApiPagedResult<ApiBooking>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    const qs = searchParams.toString();
    return apiFetch<ApiPagedResult<ApiBooking>>(
      `/bookings/received${qs ? `?${qs}` : ''}`,
    );
  },

  async getById(id: string): Promise<{ booking: ApiBooking }> {
    return apiFetch<{ booking: ApiBooking }>(`/bookings/${id}`);
  },

  async approve(id: string): Promise<{ booking: ApiBooking }> {
    return apiFetch<{ booking: ApiBooking }>(`/bookings/${id}/approve`, { method: 'POST' });
  },

  async reject(id: string, reason?: string): Promise<{ booking: ApiBooking }> {
    return apiFetch<{ booking: ApiBooking }>(`/bookings/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async cancel(id: string): Promise<{ booking: ApiBooking }> {
    return apiFetch<{ booking: ApiBooking }>(`/bookings/${id}/cancel`, { method: 'POST' });
  },

  async requestReturn(id: string): Promise<{ booking: ApiBooking }> {
    return apiFetch<{ booking: ApiBooking }>(`/bookings/${id}/request-return`, { method: 'POST' });
  },

  async complete(id: string): Promise<{ booking: ApiBooking }> {
    return apiFetch<{ booking: ApiBooking }>(`/bookings/${id}/complete`, { method: 'POST' });
  },
};

// ─── Wanted Board ─────────────────────────────────────────────────────────────

export const wantedApi = {
  async list(params: BrowseWantedParams = {}): Promise<ApiPagedResult<ApiWantedRequest>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params.q) searchParams.set('q', params.q);
    if (params.category) searchParams.set('category', params.category);
    if (params.status) searchParams.set('status', params.status);
    if (params.urgency) searchParams.set('urgency', params.urgency);
    if (params.sort) searchParams.set('sort', params.sort);
    const qs = searchParams.toString();
    return apiFetch<ApiPagedResult<ApiWantedRequest>>(`/wanted${qs ? `?${qs}` : ''}`);
  },

  async getById(id: string): Promise<{ request: ApiWantedRequest; offers?: ApiWantedOffer[] }> {
    return apiFetch<{ request: ApiWantedRequest; offers?: ApiWantedOffer[] }>(`/wanted/${id}`);
  },

  async create(body: CreateWantedPayload): Promise<{ request: ApiWantedRequest }> {
    return apiFetch<{ request: ApiWantedRequest }>('/wanted', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async update(id: string, body: UpdateWantedPayload): Promise<{ request: ApiWantedRequest }> {
    return apiFetch<{ request: ApiWantedRequest }>(`/wanted/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async withdraw(id: string): Promise<{ status: string }> {
    return apiFetch<{ status: string }>(`/wanted/${id}`, {
      method: 'DELETE',
    });
  },

  async getMatches(id: string): Promise<{ items: ApiMatchedEquipmentItem[] }> {
    return apiFetch<{ items: ApiMatchedEquipmentItem[] }>(`/wanted/${id}/matches`);
  },

  async createOffer(requestId: string, body: CreateOfferPayload): Promise<{ offer: ApiWantedOffer }> {
    return apiFetch<{ offer: ApiWantedOffer }>(`/wanted/${requestId}/offers`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async respondOffer(offerId: string, body: RespondOfferPayload): Promise<{ offer: ApiWantedOffer }> {
    return apiFetch<{ offer: ApiWantedOffer }>(`/wanted/offers/${offerId}/respond`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  async list(params: { page?: number; pageSize?: number } = {}): Promise<ApiNotificationListResult> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    const qs = searchParams.toString();
    return apiFetch<ApiNotificationListResult>(`/notifications${qs ? `?${qs}` : ''}`);
  },

  async markAsRead(id: string): Promise<{ notification: ApiNotification }> {
    return apiFetch<{ notification: ApiNotification }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllAsRead(): Promise<{ status: string; markedCount: number }> {
    return apiFetch<{ status: string; markedCount: number }>('/notifications/read-all', {
      method: 'POST',
    });
  },
};

// ─── Uploads ──────────────────────────────────────────────────────────────────

export interface ApiUploadItem {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export interface ApiUploadResult {
  url: string;
  items: ApiUploadItem[];
}

export const uploadApi = {
  async uploadFile(file: File): Promise<ApiUploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/uploads`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || data?.message || `Upload failed (${response.status})`;
      const code = data?.error?.code || 'UPLOAD_ERROR';
      throw new ApiError(response.status, code, message);
    }
    return data as ApiUploadResult;
  },

  async uploadFiles(files: File[]): Promise<ApiUploadResult> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/uploads`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || data?.message || `Upload failed (${response.status})`;
      const code = data?.error?.code || 'UPLOAD_ERROR';
      throw new ApiError(response.status, code, message);
    }
    return data as ApiUploadResult;
  },
};

// ─── Condition Reports (Phase 6B) ─────────────────────────────────────────────

export type ConditionReportType = 'HANDOVER' | 'RETURN' | 'DAMAGE_INSPECTION';
export type EquipmentCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';

export interface ApiBookingConditionReport {
  id: string;
  bookingId: string;
  reporterId: string;
  reporterFullName?: string;
  reportType: ConditionReportType;
  condition: EquipmentCondition;
  notes: string;
  evidenceUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateConditionReportPayload {
  reportType: ConditionReportType;
  condition: EquipmentCondition;
  notes?: string;
  evidenceUrls?: string[];
}

export const conditionReportsApi = {
  async create(
    bookingId: string,
    payload: CreateConditionReportPayload,
  ): Promise<{ conditionReport: ApiBookingConditionReport }> {
    return apiFetch<{ conditionReport: ApiBookingConditionReport }>(
      `/bookings/${bookingId}/condition-reports`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async list(bookingId: string): Promise<{ items: ApiBookingConditionReport[] }> {
    return apiFetch<{ items: ApiBookingConditionReport[] }>(
      `/bookings/${bookingId}/condition-reports`,
    );
  },
};

// ─── Damage Claims & Disputes (Phase 6B) ──────────────────────────────────────

export type DisputeStatus =
  | 'SUBMITTED'
  | 'AWAITING_BORROWER_RESPONSE'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'DISMISSED';

export interface ApiDamageClaim {
  id: string;
  bookingId: string;
  equipmentId?: string;
  equipmentTitle?: string;
  reporterId: string;
  reporterFullName?: string;
  renterId?: string;
  renterFullName?: string;
  description: string;
  status: DisputeStatus;
  evidenceUrls: string[];
  proposedFineAmount: string | null;
  fineExplanation: string | null;
  borrowerResponse: string | null;
  borrowerDisputed: boolean;
  borrowerEvidenceUrls: string[];
  borrowerRespondedAt: string | null;
  reopenedByAdminId: string | null;
  reopenedAt: string | null;
  reopenedReason: string | null;
  resolvedByAdminId: string | null;
  resolvedAt: string | null;
  adminDecisionNotes: string | null;
  finalApprovedFine: string | null;
  returnRecordedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDamageClaimPayload {
  description: string;
  evidenceUrls: string[];
  proposedFineAmount?: number | null;
  fineExplanation?: string | null;
}

export interface BorrowerClaimResponsePayload {
  response: string;
  disputed: boolean;
  evidenceUrls?: string[];
}

export interface AdminReopenClaimPayload {
  reason: string;
}

export interface AdminResolveClaimPayload {
  decision: 'RESOLVED' | 'DISMISSED';
  finalApprovedFine?: number | null;
  notes: string;
}

export interface ApiDamageClaimStatusHistory {
  id: string;
  damageReportId: string;
  previousStatus: string | null;
  newStatus: string;
  actorUserId: string | null;
  actorFullName?: string;
  notes: string | null;
  createdAt: string;
}

export const damageClaimsApi = {
  async create(
    bookingId: string,
    payload: CreateDamageClaimPayload,
  ): Promise<{ damageClaim: ApiDamageClaim }> {
    return apiFetch<{ damageClaim: ApiDamageClaim }>(
      `/bookings/${bookingId}/damage-claims`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async listForBooking(bookingId: string): Promise<{ items: ApiDamageClaim[] }> {
    return apiFetch<{ items: ApiDamageClaim[] }>(
      `/bookings/${bookingId}/damage-claims`,
    );
  },

  async list(
    params: { status?: string; page?: number; pageSize?: number } = {},
  ): Promise<ApiPagedResult<ApiDamageClaim>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params.status && params.status !== 'ALL') searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return apiFetch<ApiPagedResult<ApiDamageClaim>>(`/damage-claims${qs ? `?${qs}` : ''}`);
  },

  async getById(
    id: string,
  ): Promise<{ damageClaim: ApiDamageClaim; statusHistory: ApiDamageClaimStatusHistory[] }> {
    return apiFetch<{ damageClaim: ApiDamageClaim; statusHistory: ApiDamageClaimStatusHistory[] }>(
      `/damage-claims/${id}`,
    );
  },

  async respond(
    id: string,
    payload: BorrowerClaimResponsePayload,
  ): Promise<{ damageClaim: ApiDamageClaim }> {
    return apiFetch<{ damageClaim: ApiDamageClaim }>(`/damage-claims/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async adminReopen(
    id: string,
    payload: AdminReopenClaimPayload,
  ): Promise<{ damageClaim: ApiDamageClaim }> {
    return apiFetch<{ damageClaim: ApiDamageClaim }>(`/damage-claims/${id}/admin-reopen`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async adminResolve(
    id: string,
    payload: AdminResolveClaimPayload,
  ): Promise<{ damageClaim: ApiDamageClaim }> {
    return apiFetch<{ damageClaim: ApiDamageClaim }>(`/damage-claims/${id}/admin-resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ─── Complaints (Phase 6B) ────────────────────────────────────────────────────

export interface ApiComplaint {
  id: string;
  bookingId: string | null;
  complainantId: string;
  complainantFullName?: string;
  category: string;
  description: string;
  evidenceUrls: string[];
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  adminNotes: string | null;
  resolvedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplaintPayload {
  bookingId?: string | null;
  category: string;
  description: string;
  evidenceUrls?: string[];
}

export interface UpdateComplaintPayload {
  status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  adminNotes?: string | null;
}

export const complaintsApi = {
  async create(payload: CreateComplaintPayload): Promise<{ complaint: ApiComplaint }> {
    return apiFetch<{ complaint: ApiComplaint }>('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async myComplaints(
    params: { page?: number; pageSize?: number } = {},
  ): Promise<ApiPagedResult<ApiComplaint>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    const qs = searchParams.toString();
    return apiFetch<ApiPagedResult<ApiComplaint>>(`/complaints/me${qs ? `?${qs}` : ''}`);
  },

  async list(
    params: { status?: string; page?: number; pageSize?: number } = {},
  ): Promise<ApiPagedResult<ApiComplaint>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params.status && params.status !== 'ALL') searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return apiFetch<ApiPagedResult<ApiComplaint>>(`/complaints${qs ? `?${qs}` : ''}`);
  },

  async update(
    id: string,
    payload: UpdateComplaintPayload,
  ): Promise<{ complaint: ApiComplaint }> {
    return apiFetch<{ complaint: ApiComplaint }>(`/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};

// ─── Reviews API ─────────────────────────────────────────────────────────────

export interface ApiPublicReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
  reviewerInitials: string;
}

export interface ApiEquipmentReviewsResponse {
  items: ApiPublicReview[];
  averageRating: number;
  reviewCount: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  eligibleBookingId: string | null;
}

export interface CreateReviewPayload {
  rating: number;
  comment?: string;
  bookingId?: string;
}

export const reviewsApi = {
  async listForEquipment(equipmentId: string): Promise<ApiEquipmentReviewsResponse> {
    return apiFetch<ApiEquipmentReviewsResponse>(`/equipment/${equipmentId}/reviews`);
  },

  async createForBooking(
    bookingId: string,
    payload: { rating: number; comment?: string },
  ): Promise<{ review: ApiPublicReview }> {
    return apiFetch<{ review: ApiPublicReview }>(`/bookings/${bookingId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createForEquipment(
    equipmentId: string,
    payload: CreateReviewPayload,
  ): Promise<{ review: ApiPublicReview }> {
    return apiFetch<{ review: ApiPublicReview }>(`/equipment/${equipmentId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};


