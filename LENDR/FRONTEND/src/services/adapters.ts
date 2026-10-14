/**
 * Maps backend API shapes to the frontend's existing GearItem type.
 *
 * The backend EquipmentListing has fewer fields than GearItem.
 * This adapter fills in reasonable defaults so existing UI components
 * work without any changes to their JSX.
 */

import type {
  ApiEquipmentListing,
  ApiBooking,
  ApiUser,
  ApiWantedRequest,
  ApiMatchedEquipmentItem,
} from '../services/api';
import type { GearItem, GearCategory, BookingRequest, WantedPost } from '../types/gear';

// ─── Category slug → GearCategory mapping ────────────────────────────────────

const SLUG_TO_CATEGORY: Record<string, GearCategory> = {
  cameras: 'cameras',
  audio: 'audio',
  drones: 'drones',
  projectors: 'projectors',
  makers: 'makers',
  lighting: 'lighting',
  outdoors: 'outdoors',
  electronics: 'drones',
  'project-kits': 'makers',
  computing: 'makers',
  'event-equipment': 'projectors',
  academic: 'makers',
  sports: 'outdoors',
  tools: 'makers',
  other: 'makers',
};

function slugToCategory(slug: string): GearCategory {
  return SLUG_TO_CATEGORY[slug.toLowerCase()] ?? 'makers';
}

// ─── Location heuristics ──────────────────────────────────────────────────────

function inferLocationCategory(
  pickupLocation: string,
): GearItem['locationCategory'] {
  const loc = pickupLocation.toLowerCase();
  if (loc.includes('sjt') || loc.includes('silver jubilee')) return 'sjt';
  if (loc.includes('tt') || loc.includes('technology tower')) return 'tt';
  if (loc.includes('mb') || loc.includes('main building')) return 'mb';
  if (loc.includes('ladies') || loc.includes('lh') || loc.includes('women')) return 'ladies_hostel';
  if (
    loc.includes('men') ||
    loc.includes('block a') || loc.includes('block b') ||
    loc.includes('block c') || loc.includes('block d') ||
    loc.includes('block e') || loc.includes('block f') ||
    loc.includes('hostel')
  )
    return 'mens_hostel';
  return 'all';
}

// ─── Deposit inference ────────────────────────────────────────────────────────

function inferDepositType(
  securityDeposit: string | null,
): GearItem['depositType'] {
  if (!securityDeposit || parseFloat(securityDeposit) === 0) return 'zero';
  return 'token';
}

// ─── Initials helper ──────────────────────────────────────────────────────────

function initials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Availability badge ───────────────────────────────────────────────────────

function availabilityBadge(listing: ApiEquipmentListing): string {
  if (listing.status !== 'ACTIVE') return 'Inactive';
  const condition = listing.condition;
  if (condition === 'NEW' || condition === 'LIKE_NEW') return 'Available Today';
  if (condition === 'GOOD') return 'Available Today';
  return 'Available';
}

// ─── Specifications adapter ───────────────────────────────────────────────────

function adaptSpecs(
  specs: Record<string, unknown>,
): { label: string; value: string; desc: string }[] {
  const entries = Object.entries(specs);
  if (entries.length === 0) return [];
  return entries.slice(0, 6).map(([key, val]) => ({
    label: key,
    value: String(val ?? ''),
    desc: '',
  }));
}

// ─── Main adapter ─────────────────────────────────────────────────────────────

export function adaptEquipmentToGearItem(listing: ApiEquipmentListing): GearItem {
  const price = parseFloat(listing.dailyRentalPrice) || 0;
  const deposit = listing.securityDeposit ? parseFloat(listing.securityDeposit) : 0;
  const depositType = inferDepositType(listing.securityDeposit);
  const category = slugToCategory(listing.categorySlug);

  // Build a reasonable owner object from the available fields
  const ownerInitials = initials(listing.ownerFullName);
  const specs = adaptSpecs(listing.specifications);

  return {
    id: listing.id,
    ownerId: listing.ownerUserId,
    title: listing.title,
    subtitle: listing.description,
    category,
    categoryLabel: listing.categoryName,
    pricePerDay: Math.round(price),
    location: listing.pickupLocation,
    locationCategory: inferLocationCategory(listing.pickupLocation),
    depositType,
    depositAmount: Math.round(deposit),
    tags: listing.tags.slice(0, 3),
    availabilityBadge: availabilityBadge(listing),
    isAvailableToday: listing.status === 'ACTIVE',
    isWeekendFriendly: listing.status === 'ACTIVE',
    image: listing.imageUrls[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
    images: listing.imageUrls,
    condition: listing.condition,
    galleryViews: listing.imageUrls.length > 0
      ? listing.imageUrls.map((url, i) => ({
          id: `view-${i}`,
          label: i === 0 ? 'COVER' : `VIEW ${i + 1}`,
          title: i === 0 ? 'Cover Photo' : `Angle ${i + 1}`,
          description: url,
        }))
      : undefined,
    specs: specs.length > 0
      ? specs
      : [
          { label: 'Condition', value: listing.condition, desc: 'Equipment condition' },
          { label: 'Max Rental', value: `${listing.maxRentalDays} days`, desc: 'Maximum rental period' },
        ],
    inclusions: listing.features.length > 0 ? listing.features : [`${listing.title} (complete unit)`],
    owner: {
      name: listing.ownerFullName,
      initials: ownerInitials,
      department: 'VIT Vellore',
      block: listing.pickupLocation,
      rating: 4.8,
      handoversCount: 0,
      avgReplyTime: '< 30m',
      isVerified: false,
      badge: 'Student Lender',
    },
    useCases: listing.useCases.length > 0
      ? (listing.useCases as GearItem['useCases'])
      : ['club_event'],
    serialNumber: undefined,
  };
}

// ─── API Booking → BookingRequest adapter ─────────────────────────────────────

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return isoString;
  }
}

function campusDate(isoString: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(isoString));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '05:00 PM';
  }
}

function bookingStatusToFrontend(
  status: string,
): BookingRequest['status'] {
  switch (status) {
    case 'CANCELLED':
      return 'cancelled';
    case 'REJECTED':
      return 'rejected';
    case 'COMPLETED':
      return 'completed';
    case 'APPROVED':
      return 'approved';
    case 'ACTIVE':
      return 'active';
    case 'RETURN_REQUESTED':
      return 'return_requested';
    case 'PENDING':
    default:
      return 'pending';
  }
}

export function adaptBookingToRequest(
  booking: ApiBooking,
  equipmentImage = '',
): BookingRequest {
  const totalPrice = parseFloat(booking.totalPrice) || 0;
  const dailyPrice = parseFloat(booking.dailyRentalPrice) || 0;
  const baseAmount = dailyPrice * booking.rentalDays;
  const securityDeposit = parseFloat(booking.securityDeposit) || 0;
  const lastRentalDay = new Date(new Date(booking.endAt).getTime() - 1).toISOString();

  return {
    id: booking.id,
    gearId: booking.equipmentId,
    startDate: campusDate(booking.startAt),
    endDate: campusDate(lastRentalDay),
    gearTitle: booking.equipmentTitle,
    gearImage: equipmentImage,
    lenderName: 'Equipment owner',
    lenderBlock: 'Campus',
    pickupDate: formatDate(booking.startAt),
    pickupTime: formatTime(booking.startAt),
    returnDate: formatDate(lastRentalDay),
    returnTime: formatTime(booking.endAt),
    durationDays: booking.rentalDays,
    landmark: 'See equipment listing',
    purpose: booking.notes ?? 'Campus Rental',
    baseAmount: Math.round(baseAmount),
    securityDeposit: Math.round(securityDeposit),
    totalAmount: Math.round(totalPrice),
    status: bookingStatusToFrontend(booking.status),
    paymentStatus: (booking.paymentStatus?.toLowerCase() as any) || 'unpaid',
    ownerUserId: booking.ownerUserId,
    renterId: booking.renterId,
    returnRecordedAt: booking.returnRecordedAt ?? null,
    qrCodeId: '',
    createdAt: formatDate(booking.createdAt),
  };
}

// ─── Auth user → display helpers ──────────────────────────────────────────────

export function getUserInitials(user: ApiUser): string {
  return initials(user.fullName);
}

export function getUserDisplayName(user: ApiUser): string {
  const nameParts = user.fullName.split(' ');
  return nameParts[0] + (nameParts[1] ? ` ${nameParts[1][0]}.` : '');
}

// ─── Date helpers for bookings ────────────────────────────────────────────────

/** Format today's date as YYYY-MM-DD in IST */
export function todayIST(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}

/** Add N days to a YYYY-MM-DD string */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Time Ago Helper ──────────────────────────────────────────────────────────

export function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'Just now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ─── Wanted Request Adapter ───────────────────────────────────────────────────

export function adaptWantedRequestToPost(req: ApiWantedRequest): WantedPost {
  const location = req.locationBlock ? req.locationBlock.replace(/^📌\s*/, '') : 'Campus';
  const block = location;

  return {
    id: req.id,
    author: req.author.fullName,
    initials: req.author.initials,
    location,
    block,
    text: req.description,
    timeAgo: formatTimeAgo(req.createdAt),
    repliesCount: req.offersCount,
    category: req.categoryName || 'General',
    urgency: req.urgency,
    userId: req.userId,
    categoryId: req.categoryId,
    categorySlug: req.categorySlug,
    startDate: req.startDate,
    endDate: req.endDate,
    status: req.status,
    expiresAt: req.expiresAt,
    createdAt: req.createdAt,
  };
}

// ─── Matched Equipment Item Adapter ───────────────────────────────────────────

export function adaptMatchedItemToGearItem(item: ApiMatchedEquipmentItem): GearItem {
  const price = parseFloat(item.dailyRentalPrice) || 0;
  const deposit = item.securityDeposit ? parseFloat(item.securityDeposit) : 0;
  const category = slugToCategory(item.categorySlug);

  return {
    id: item.id,
    title: item.title,
    subtitle: item.description,
    category,
    categoryLabel: item.categoryName,
    pricePerDay: Math.round(price),
    location: item.pickupLocation,
    locationCategory: inferLocationCategory(item.pickupLocation),
    depositType: deposit > 0 ? 'token' : 'zero',
    depositAmount: Math.round(deposit),
    tags: item.matchReasons.slice(0, 3),
    availabilityBadge: 'Available Match',
    isAvailableToday: true,
    isWeekendFriendly: true,
    image: item.imageUrls[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
    images: item.imageUrls,
    condition: item.condition,
    specs: [
      { label: 'Condition', value: item.condition, desc: 'Equipment condition' },
      ...item.matchReasons.map((r, i) => ({ label: `Match #${i + 1}`, value: r, desc: '' })),
    ],
    inclusions: [`${item.title} (complete unit)`],
    owner: {
      name: 'Campus Lender',
      initials: 'CL',
      department: 'VIT Vellore',
      block: item.pickupLocation,
      rating: 4.8,
      handoversCount: 0,
      avgReplyTime: '< 30m',
      isVerified: false,
      badge: 'Student Lender',
    },
    useCases: ['club_event'],
    serialNumber: undefined,
  };
}

