export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type EquipmentStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE';
export type ProfileRole = 'RENTER' | 'OWNER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export type MaintenanceType = 'PREVENTIVE' | 'REPAIR' | 'INSPECTION' | 'CLEANING' | 'OTHER';
export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type DamageSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DamageStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

export type PaymentType = 'RENTAL' | 'SECURITY_DEPOSIT' | 'REFUND';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export type NotificationType =
  | 'BOOKING_REQUESTED'
  | 'BOOKING_APPROVED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_COMPLETED'
  | 'DAMAGE_REPORTED'
  | 'DAMAGE_RESOLVED'
  | 'MAINTENANCE_SCHEDULED'
  | 'MAINTENANCE_STARTED'
  | 'MAINTENANCE_COMPLETED'
  | 'REVIEW_RECEIVED'
  | 'SYSTEM';

export interface ProfileRecord {
  id: string;
  email: string | null;
  full_name: string | null;
  role: ProfileRole;
  account_status: AccountStatus;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentRecord {
  id: string;
  owner_id: string;
  category_id: string;
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  condition: string;
  status: EquipmentStatus;
  price_per_day: number | null;
  security_deposit: number | null;
  location: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  reported_by: string;
  maintenance_type: MaintenanceType;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  cost: number;
  status: MaintenanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DamageReport {
  id: string;
  equipment_id: string;
  booking_id: string | null;
  reported_by: string;
  description: string;
  severity: DamageSeverity;
  status: DamageStatus;
  estimated_cost: number | null;
  actual_cost: number | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  reported_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  equipment_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentReviewSummary {
  equipment_id: string;
  average_rating: number | null;
  review_count: number;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_booking_id: string | null;
  related_equipment_id: string | null;
  related_damage_report_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  payer_id: string;
  amount: number;
  payment_type: PaymentType;
  status: PaymentStatus;
  transaction_reference: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_amount: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformStatistics {
  total_users: number;
  total_renters: number;
  total_owners: number;
  total_equipment: number;
  published_equipment: number;
  total_bookings: number;
  pending_bookings: number;
  approved_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_reviews: number;
  average_rating: number | null;
  open_damage_reports: number;
  active_maintenance_records: number;
  successful_payments: number;
  total_rental_revenue: number;
  security_deposits_collected: number;
}
