export type GearCategory = 'cameras' | 'audio' | 'drones' | 'projectors' | 'makers' | 'lighting' | 'outdoors';

export interface GearOwner {
  name: string;
  initials: string;
  department: string;
  block: string;
  rating: number;
  handoversCount: number;
  avgReplyTime: string;
  isVerified: boolean;
  badge?: string;
  review?: {
    author: string;
    text: string;
    rating: number;
  };
}

export interface GearItem {
  id: string;
  ownerId?: string;
  title: string;
  subtitle: string;
  category: GearCategory;
  categoryLabel: string;
  pricePerDay: number;
  location: string;
  locationCategory: 'all' | 'sjt' | 'tt' | 'mb' | 'mens_hostel' | 'ladies_hostel';
  depositType: 'zero' | 'token' | 'club';
  depositAmount: number;
  tags: string[];
  availabilityBadge: string;
  isAvailableToday: boolean;
  isWeekendFriendly: boolean;
  image: string;
  images?: string[];
  condition?: string;
  galleryViews?: {
    id: string;
    label: string;
    title: string;
    description: string;
  }[];
  specs: {
    label: string;
    value: string;
    desc: string;
  }[];
  inclusions: string[];
  owner: GearOwner;
  useCases: ('filmmaking' | 'hackathon' | 'podcast' | 'robotics' | 'club_event' | 'academic')[];
  serialNumber?: string;
}

export interface WantedPost {
  id: string;
  author: string;
  initials: string;
  location: string;
  block: string;
  text: string;
  timeAgo: string;
  repliesCount: number;
  category: string;
  urgency: 'HIGH' | 'MEDIUM';
  userId?: string;
  categoryId?: string | null;
  categorySlug?: string | null;
  startDate?: string;
  endDate?: string;
  status?: 'OPEN' | 'FULFILLED' | 'WITHDRAWN' | 'EXPIRED';
  expiresAt?: string;
  createdAt?: string;
}

export interface BookingRequest {
  id: string;
  gearId: string;
  startDate: string;
  endDate: string;
  gearTitle: string;
  gearImage: string;
  lenderName: string;
  lenderBlock: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  durationDays: number;
  landmark: string;
  purpose: string;
  baseAmount: number;
  securityDeposit: number;
  totalAmount: number;
  status: 'pending' | 'approved' | 'active' | 'return_requested' | 'completed' | 'cancelled' | 'rejected';
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'failed';
  ownerUserId?: string;
  renterId?: string;
  returnRecordedAt?: string | null;
  qrCodeId: string;
  createdAt: string;
}
