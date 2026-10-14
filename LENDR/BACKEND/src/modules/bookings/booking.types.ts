export type BookingStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'ACTIVE'
  | 'RETURN_REQUESTED'
  | 'COMPLETED';

export type BookingAction = 'approve' | 'reject' | 'cancel' | 'start' | 'request-return' | 'complete';

export interface BookingDateRange {
  startDate: string;
  endDate: string;
}

export interface CreateBookingInput extends BookingDateRange {
  equipmentId: string;
  notes?: string | null;
}

export interface CreateMaintenanceInput extends BookingDateRange {
  reason: string;
}

export interface Booking {
  id: string;
  equipmentId: string;
  equipmentTitle: string;
  equipmentStatus: string;
  renterId: string;
  renterFullName: string;
  ownerUserId: string;
  organizationId: string | null;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  paymentStatus: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED';
  rentalDays: number;
  dailyRentalPrice: string;
  securityDeposit: string;
  totalPrice: string;
  notes: string | null;
  expiresAt: Date;
  returnRecordedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  payerId: string;
  amount: string;
  currency: string;
  provider: string;
  providerReference: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPaymentRecord extends PaymentRecord {
  bookingReference: string;
  startAt: Date;
  endAt: Date;
  bookingStatus: BookingStatus;
  bookingPaymentStatus: string;
  totalPrice: string;
  equipmentId: string;
  equipmentTitle: string;
  imageUrls: string[];
  ownerName: string;
}

export interface MaintenanceBlock {
  id: string;
  equipmentId: string;
  startAt: Date;
  endAt: Date;
  reason: string;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingFilters {
  page: number;
  pageSize: number;
}

export interface BookingPage {
  items: Booking[];
  page: number;
  pageSize: number;
  total: number;
}

export type BookingCreateResult =
  | { booking: Booking }
  | 'equipment_not_found'
  | 'unavailable'
  | 'self_booking'
  | 'pending_limit'
  | 'maintenance_conflict'
  | 'duration_exceeded';

export type BookingTransitionResult =
  | { booking: Booking }
  | 'not_found'
  | 'forbidden'
  | 'invalid_transition'
  | 'expired'
  | 'dispute_hold';

export interface AvailabilityResult {
  available: boolean;
  conflictingBookings: number;
  maintenanceBlocks: Array<Pick<MaintenanceBlock, 'startAt' | 'endAt'>>;
}

export interface BookingRepository {
  create(renterId: string, input: CreateBookingInput): Promise<BookingCreateResult>;
  listMine(userId: string, filters: BookingFilters): Promise<BookingPage>;
  listReceived(userId: string, filters: BookingFilters): Promise<BookingPage>;
  getById(id: string, userId: string): Promise<Booking | null>;
  transition(
    id: string,
    userId: string,
    action: BookingAction,
    reason?: string,
  ): Promise<BookingTransitionResult>;
  availability(
    equipmentId: string,
    range: BookingDateRange,
  ): Promise<AvailabilityResult | null | 'duration_exceeded'>;
  listMaintenance(equipmentId: string): Promise<MaintenanceBlock[] | null>;
  createMaintenance(
    equipmentId: string,
    userId: string,
    input: CreateMaintenanceInput,
  ): Promise<MaintenanceBlock | 'not_found' | 'forbidden' | 'booking_conflict' | 'maintenance_conflict'>;
  deleteMaintenance(
    equipmentId: string,
    blockId: string,
    userId: string,
  ): Promise<'deleted' | 'not_found' | 'forbidden'>;
  expirePending(): Promise<number>;
  processMockPayment(
    bookingId: string,
    userId: string,
    action: 'SUCCESS' | 'FAIL',
  ): Promise<
    | { payment: PaymentRecord; booking: Booking; alreadyPaid?: boolean }
    | 'not_found'
    | 'forbidden'
    | 'not_approved'
    | 'invalid_status'
  >;
  getPaymentsForBooking(
    bookingId: string,
    userId: string,
  ): Promise<PaymentRecord[] | 'not_found' | 'forbidden'>;
  listPaymentsForUser(userId: string): Promise<UserPaymentRecord[]>;
}
