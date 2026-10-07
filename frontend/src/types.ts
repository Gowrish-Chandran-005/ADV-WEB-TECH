export type GearCategory = 
  | 'Cameras' 
  | 'Drones' 
  | 'Audio & Mics' 
  | 'Projectors' 
  | 'Outdoors' 
  | 'Makers & Tools';

export interface GearItem {
  id: string;
  title: string;
  category: GearCategory;
  location: string;
  rating: number;
  reviewsCount: number;
  pricePerDay: number;
  depositAmount: number;
  description: string;
  condition?: string;
  badge?: 'Just Listed' | 'Available Now' | 'Near Media Lab' | 'Weekend Special' | 'Popular';
  badgeColor?: string;
  imageUrl: string;
  owner: {
    name: string;
    avatarInitials: string;
    rating: number;
    department: string;
    handoverLocation: string;
  };
  pickupCheckImage?: string;
  returnCheckImage?: string;
  isBookmarked?: boolean;
}

export interface RentalBooking {
  id: string;
  item: GearItem;
  startDate: string;
  endDate: string;
  totalDays: number;
  rentalFee: number;
  depositAmount: number;
  status: 'active' | 'pending_pickup' | 'returned' | 'deposit_released';
  custodyStampId: string;
  timestamp: string;
  pickupPhotosVerified: boolean;
  returnPhotosVerified: boolean;
}

export interface WantedPost {
  id: string;
  author: string;
  location: string;
  text: string;
  repliesCount: number;
  timeAgo: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  unread: boolean;
  type: 'deposit' | 'booking' | 'reply';
}

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface BookingRecord {
  id: string;
  equipment_id: string;
  renter_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  price_per_day: number;
  total_amount: number;
  security_deposit: number;
  status: BookingStatus;
  renter_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingWithEquipment extends BookingRecord {
  equipment?: Partial<{
    id: string;
    name: string;
    description: string | null;
    price_per_day: number | null;
    security_deposit: number | null;
    location: string | null;
    status: string | null;
    image_url?: string;
  }>;
}

export interface BookingWithProfiles extends BookingRecord {
  renter_profile?: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  owner_profile?: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}
