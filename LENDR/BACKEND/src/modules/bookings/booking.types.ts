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
  | 'expired';

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
}
