import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { GearItem, BookingRequest } from '../../types/gear';
import {
  equipmentApi,
  wantedApi,
  paymentsApi,
  favoritesApi,
  bookingsApi,
  reviewsApi,
  type ApiUser,
  type ApiUserPayment,
  type ApiWantedRequestWithOffers,
  type ApiUserSentOffer,
  type ApiEquipmentListing,
  type ApiPaymentRecord,
  type ApiUserReputationSummary,
  ApiError,
} from '../../services/api';
import {
  adaptEquipmentToGearItem,
  adaptBookingToRequest,
  getUserInitials,
} from '../../services/adapters';
import { EditProfileModal } from './EditProfileModal';
import { ReviewModal } from '../ReviewModal';

interface MyGearHubScreenProps {
  currentUser: ApiUser | null;
  bookings: BookingRequest[];
  onSelectItem: (item: GearItem) => void;
  onOpenListGear: () => void;
  onNavigateCatalog: () => void;
  onNavigateWanted: () => void;
  onOpenAuth: () => void;
  onProceedToPayment?: (booking: BookingRequest) => void;
  onReturnBooking?: (bookingId: string) => Promise<void>;
  onOpenConditionReports?: (booking: BookingRequest) => void;
  onOpenDamageClaim?: (booking: BookingRequest) => void;
  onOpenComplaints?: (bookingId?: string) => void;
  onOpenReceipt?: (booking: BookingRequest, payment: ApiPaymentRecord) => void;
  onRefreshBookings?: () => void;
}

type HubTab = 'overview' | 'rentals' | 'approvals' | 'favourites' | 'listings' | 'wanted' | 'payments';
type RentalFilter = 'all' | 'pending' | 'ready_to_pay' | 'paid_upcoming' | 'active' | 'return_requested' | 'completed' | 'cancelled';
type ApprovalFilter = 'all' | 'pending' | 'ready_handover' | 'active' | 'return_requested' | 'completed';
type ListingFilter = 'all' | 'active' | 'inactive';
type WantedSubTab = 'requests' | 'offers';

export const MyGearHubScreen: React.FC<MyGearHubScreenProps> = ({
  currentUser,
  bookings,
  onSelectItem,
  onOpenListGear,
  onNavigateCatalog,
  onNavigateWanted,
  onOpenAuth,
  onProceedToPayment,
  onReturnBooking,
  onOpenConditionReports,
  onOpenDamageClaim,
  onOpenComplaints,
  onOpenReceipt,
  onRefreshBookings,
}) => {
  const [activeTab, setActiveTab] = useState<HubTab>('overview');
  const [rentalFilter, setRentalFilter] = useState<RentalFilter>('all');
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('all');
  const [listingFilter, setListingFilter] = useState<ListingFilter>('all');
  const [wantedSubTab, setWantedSubTab] = useState<WantedSubTab>('requests');

  // Edit Profile Modal
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Review Modal state
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<BookingRequest | null>(null);

  // Two-Way Trust Reputation state
  const [userReputation, setUserReputation] = useState<ApiUserReputationSummary | null>(null);
  const [isLoadingReputation, setIsLoadingReputation] = useState(false);

  // Lender Approvals (Received Bookings)
  const [receivedBookings, setReceivedBookings] = useState<BookingRequest[]>([]);
  const [isLoadingReceived, setIsLoadingReceived] = useState(false);
  const [receivedActionId, setReceivedActionId] = useState<string | null>(null);
  const [disputeHoldError, setDisputeHoldError] = useState<string | null>(null);

  // Data states
  const [favorites, setFavorites] = useState<GearItem[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

  const [myListings, setMyListings] = useState<ApiEquipmentListing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);

  const [myWantedRequests, setMyWantedRequests] = useState<ApiWantedRequestWithOffers[]>([]);
  const [isLoadingWanted, setIsLoadingWanted] = useState(false);

  const [mySentOffers, setMySentOffers] = useState<ApiUserSentOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);

  const [myPayments, setMyPayments] = useState<ApiUserPayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  // Respond to offer action loading
  const [respondingOfferId, setRespondingOfferId] = useState<string | null>(null);
  const [offerActionFeedback, setOfferActionFeedback] = useState<{ id: string; msg: string; type: 'success' | 'error' } | null>(null);

  // Returning booking state
  const [returningBookingId, setReturningBookingId] = useState<string | null>(null);

  // Load all hub data
  const loadHubData = useCallback(async () => {
    if (!currentUser) return;

    // Load Two-Way Reputation
    setIsLoadingReputation(true);
    reviewsApi
      .getMyReputation()
      .then((res) => setUserReputation(res))
      .catch(() => setUserReputation(null))
      .finally(() => setIsLoadingReputation(false));

    // Load Received Bookings (as Equipment Owner)
    setIsLoadingReceived(true);
    bookingsApi
      .receivedBookings({ pageSize: 50 })
      .then((res) => {
        setReceivedBookings(res.items.map((b) => adaptBookingToRequest(b)));
      })
      .catch(() => setReceivedBookings([]))
      .finally(() => setIsLoadingReceived(false));

    // Load Favorites
    setIsLoadingFavorites(true);
    favoritesApi
      .myFavorites({ pageSize: 50 })
      .then((res) => {
        setFavorites(res.items.map(adaptEquipmentToGearItem));
      })
      .catch(() => setFavorites([]))
      .finally(() => setIsLoadingFavorites(false));

    // Load My Equipment Listings
    setIsLoadingListings(true);
    equipmentApi
      .myListings({ pageSize: 50 })
      .then((res) => {
        setMyListings(res.items);
      })
      .catch(() => setMyListings([]))
      .finally(() => setIsLoadingListings(false));

    // Load My Wanted Requests
    setIsLoadingWanted(true);
    wantedApi
      .myRequests()
      .then((res) => {
        setMyWantedRequests(res.items);
      })
      .catch(() => setMyWantedRequests([]))
      .finally(() => setIsLoadingWanted(false));

    // Load My Sent Offers
    setIsLoadingOffers(true);
    wantedApi
      .myOffers()
      .then((res) => {
        setMySentOffers(res.items);
      })
      .catch(() => setMySentOffers([]))
      .finally(() => setIsLoadingOffers(false));

    // Load Payments
    setIsLoadingPayments(true);
    paymentsApi
      .myPayments()
      .then((res) => {
        setMyPayments(res.items);
      })
      .catch(() => setMyPayments([]))
      .finally(() => setIsLoadingPayments(false));
  }, [currentUser]);

  useEffect(() => {
    loadHubData();
  }, [loadHubData]);

  // Remove from favorites helper
  const handleRemoveFavorite = async (equipmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await favoritesApi.removeFavorite(equipmentId);
      setFavorites((prev) => prev.filter((item) => item.id !== equipmentId));
    } catch {
      // Ignore
    }
  };

  // Respond to offer on student's wanted request
  const handleRespondOffer = async (offerId: string, action: 'accept' | 'decline') => {
    setRespondingOfferId(offerId);
    setOfferActionFeedback(null);
    try {
      await wantedApi.respondOffer(offerId, { action });
      setOfferActionFeedback({
        id: offerId,
        msg: `Offer ${action === 'accept' ? 'accepted' : 'declined'} successfully!`,
        type: 'success',
      });
      // Refresh wanted requests
      const res = await wantedApi.myRequests();
      setMyWantedRequests(res.items);
    } catch (err: unknown) {
      setOfferActionFeedback({
        id: offerId,
        msg: err instanceof Error ? err.message : `Failed to ${action} offer.`,
        type: 'error',
      });
    } finally {
      setRespondingOfferId(null);
    }
  };

  // Handle return request from renter
  const handleReturn = async (bookingId: string) => {
    setReturningBookingId(bookingId);
    try {
      if (onReturnBooking) {
        await onReturnBooking(bookingId);
      } else {
        await bookingsApi.requestReturn(bookingId);
      }
      if (onRefreshBookings) onRefreshBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to request return.');
    } finally {
      setReturningBookingId(null);
    }
  };

  // Lender: Approve incoming booking
  const handleApproveReceived = async (bookingId: string) => {
    setReceivedActionId(bookingId);
    try {
      await bookingsApi.approve(bookingId);
      await loadHubData();
      if (onRefreshBookings) onRefreshBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to approve booking request.');
    } finally {
      setReceivedActionId(null);
    }
  };

  // Lender: Decline incoming booking
  const handleRejectReceived = async (bookingId: string) => {
    setReceivedActionId(bookingId);
    try {
      await bookingsApi.reject(bookingId, 'Declined by equipment owner');
      await loadHubData();
      if (onRefreshBookings) onRefreshBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to decline booking request.');
    } finally {
      setReceivedActionId(null);
    }
  };

  // Lender: Hand Over Gear (Start booking)
  const handleStartHandover = async (bookingId: string) => {
    setReceivedActionId(bookingId);
    try {
      await bookingsApi.start(bookingId);
      await loadHubData();
      if (onRefreshBookings) onRefreshBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to record gear handover.');
    } finally {
      setReceivedActionId(null);
    }
  };

  // Lender: Confirm return and complete rental
  const handleConfirmReturn = async (bookingId: string) => {
    setReceivedActionId(bookingId);
    setDisputeHoldError(null);
    try {
      await bookingsApi.complete(bookingId);
      await loadHubData();
      if (onRefreshBookings) onRefreshBookings();
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.code === 'ACTIVE_DISPUTE_HOLD' || err.status === 409)) {
        setDisputeHoldError(
          'Active Dispute Hold: Cannot confirm return while an unresolved damage claim is active on this booking. Please resolve the dispute first.',
        );
      } else {
        alert(err instanceof Error ? err.message : 'Failed to confirm return.');
      }
    } finally {
      setReceivedActionId(null);
    }
  };

  // Filter rentals by lifecycle
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (rentalFilter === 'all') return true;
      if (rentalFilter === 'pending') return b.status === 'pending';
      if (rentalFilter === 'ready_to_pay') return b.status === 'approved' && b.paymentStatus !== 'paid';
      if (rentalFilter === 'paid_upcoming') return b.status === 'approved' && b.paymentStatus === 'paid';
      if (rentalFilter === 'active') return b.status === 'active';
      if (rentalFilter === 'return_requested') return b.status === 'return_requested';
      if (rentalFilter === 'completed') return b.status === 'completed';
      if (rentalFilter === 'cancelled') return b.status === 'cancelled' || b.status === 'rejected';
      return true;
    });
  }, [bookings, rentalFilter]);

  // Filter received bookings for lender approvals
  const filteredReceivedBookings = useMemo(() => {
    return receivedBookings.filter((b) => {
      if (approvalFilter === 'all') return true;
      if (approvalFilter === 'pending') return b.status === 'pending';
      if (approvalFilter === 'ready_handover') return b.status === 'approved' && b.paymentStatus === 'paid';
      if (approvalFilter === 'active') return b.status === 'active';
      if (approvalFilter === 'return_requested') return b.status === 'return_requested';
      if (approvalFilter === 'completed') return b.status === 'completed';
      return true;
    });
  }, [receivedBookings, approvalFilter]);

  // Filter listings
  const filteredListings = useMemo(() => {
    return myListings.filter((item) => {
      if (listingFilter === 'all') return true;
      // If status property exists on item
      const itemStatus = (item as unknown as { status?: string }).status;
      if (listingFilter === 'active') return !itemStatus || itemStatus === 'ACTIVE';
      if (listingFilter === 'inactive') return itemStatus === 'INACTIVE';
      return true;
    });
  }, [myListings, listingFilter]);

  // Open receipt modal helper
  const handleViewReceipt = (payment: ApiUserPayment) => {
    if (!onOpenReceipt) return;

    // Synthesize BookingRequest
    const synthBooking: BookingRequest = {
      id: payment.bookingId,
      gearId: payment.equipmentId,
      startDate: payment.startAt,
      endDate: payment.endAt,
      gearTitle: payment.equipmentTitle,
      gearImage: payment.imageUrls?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800',
      lenderName: payment.ownerName || 'VIT Equipment Owner',
      lenderBlock: 'Campus Hub',
      pickupDate: payment.startAt,
      pickupTime: '10:00 AM',
      returnDate: payment.endAt,
      returnTime: '06:00 PM',
      durationDays: 1,
      landmark: 'Campus Main Gate / SJT Food Court',
      purpose: 'Academic project & campus rental',
      baseAmount: Math.round(parseFloat(payment.amount) * 0.8),
      securityDeposit: Math.round(parseFloat(payment.amount) * 0.2),
      totalAmount: Math.round(parseFloat(payment.amount)),
      status: (payment.bookingStatus?.toLowerCase() as BookingRequest['status']) || 'approved',
      paymentStatus: (payment.status === 'SUCCESS' ? 'paid' : payment.status.toLowerCase()) as BookingRequest['paymentStatus'],
      qrCodeId: `QR-${payment.bookingId.slice(0, 8).toUpperCase()}`,
      createdAt: payment.createdAt,
    };

    const synthRecord: ApiPaymentRecord = {
      id: payment.id,
      bookingId: payment.bookingId,
      payerId: payment.payerId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      providerReference: payment.providerReference,
      metadata: payment.metadata || {},
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };

    onOpenReceipt(synthBooking, synthRecord);
  };

  // If student is not logged in
  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#fbf9f5]">
        <div className="max-w-md w-full bg-white border-2 border-[#114b3f] rounded-3xl p-8 text-center shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#114b3f] text-white flex items-center justify-center mx-auto text-2xl font-bold shadow-md">
            L.
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#d96543]">
              STUDENT PROFILE
            </span>
            <h2 className="font-display text-2xl font-black text-[#114b3f]">
              Sign in to My Gear Hub
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Access your campus rentals, saved favourites, equipment listings, wanted requests, and payment receipts.
            </p>
          </div>
          <button
            onClick={onOpenAuth}
            className="w-full py-3 px-6 rounded-2xl bg-[#114b3f] hover:bg-[#0c362d] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Sign In with VIT Account
          </button>
        </div>
      </div>
    );
  }

  // Member Since date
  const memberSinceFormatted = (() => {
    try {
      return new Date(currentUser.createdAt).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Campus Member';
    }
  })();

  const initials = getUserInitials(currentUser);

  return (
    <div className="min-h-screen bg-[#fbf9f5] pb-20">
      {/* ─── Profile Header Banner ────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-[#092620] via-[#0d382f] to-[#114b3f] text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-emerald-950/80 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Avatar & Identity */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#14594b] text-white border-2 border-emerald-400/40 flex items-center justify-center font-display font-black text-2xl sm:text-3xl shadow-xl ring-4 ring-emerald-500/20">
                  {initials}
                </div>
                <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-400 border-2 border-[#092620] rounded-full shadow-xs" title="Online & Verified"></span>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {currentUser.fullName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/90 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-200">
                    {currentUser.role === 'ADMIN' ? 'CAMPUS ADMIN' : 'VIT STUDENT'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-200/90 font-mono">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {currentUser.email}
                  </span>

                  {currentUser.registrationNumber && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      ID: {currentUser.registrationNumber}
                    </span>
                  )}

                  {currentUser.phone && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      📞 {currentUser.phone}
                    </span>
                  )}

                  <span className="text-emerald-300/70">
                    Member since {memberSinceFormatted}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditProfileOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-emerald-400/30 text-white text-xs font-bold transition-all shadow-xs cursor-pointer backdrop-blur-md"
              >
                <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Edit Profile</span>
              </button>

              <button
                onClick={onOpenListGear}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#d96543] hover:bg-[#c85635] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <span>+ List Gear</span>
              </button>

              <button
                onClick={() => {
                  loadHubData();
                  if (onRefreshBookings) onRefreshBookings();
                }}
                className="p-2.5 rounded-2xl bg-[#092620]/60 hover:bg-[#092620] border border-emerald-700/50 text-emerald-300 transition-all cursor-pointer"
                title="Refresh Hub data"
                aria-label="Refresh Hub data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Top Metric Summary Cards ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
          {/* 1. My Rentals */}
          <button
            onClick={() => setActiveTab('rentals')}
            className={`p-4 rounded-3xl border-2 transition-all duration-200 text-left shadow-sm cursor-pointer group ${
              activeTab === 'rentals'
                ? 'bg-white border-[#114b3f] ring-2 ring-[#114b3f]/20'
                : 'bg-white/90 hover:bg-white border-[#ebdccd]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-stone-500">
                Rentals
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#114b3f] flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="font-display font-black text-2xl text-[#114b3f]">
              {bookings.length}
            </div>
            <div className="text-[11px] text-stone-600 font-medium truncate">
              {bookings.filter((b) => b.status === 'active').length} active currently
            </div>
          </button>

          {/* 2. Lender Approvals */}
          <button
            onClick={() => setActiveTab('approvals')}
            className={`p-4 rounded-3xl border-2 transition-all duration-200 text-left shadow-sm cursor-pointer group ${
              activeTab === 'approvals'
                ? 'bg-white border-[#114b3f] ring-2 ring-[#114b3f]/20'
                : 'bg-white/90 hover:bg-white border-[#ebdccd]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-stone-500">
                Approvals
              </span>
              <div className="w-7 h-7 rounded-xl bg-teal-50 text-[#114b3f] flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="font-display font-black text-2xl text-[#114b3f]">
              {receivedBookings.length}
            </div>
            <div className="text-[11px] text-stone-600 font-medium truncate">
              {receivedBookings.filter((b) => b.status === 'pending' || b.status === 'return_requested').length} need action
            </div>
          </button>

          {/* 3. Favourites */}
          <button
            onClick={() => setActiveTab('favourites')}
            className={`p-4 rounded-3xl border-2 transition-all duration-200 text-left shadow-sm cursor-pointer group ${
              activeTab === 'favourites'
                ? 'bg-white border-[#114b3f] ring-2 ring-[#114b3f]/20'
                : 'bg-white/90 hover:bg-white border-[#ebdccd]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-stone-500">
                Favourites
              </span>
              <div className="w-7 h-7 rounded-xl bg-rose-50 text-[#d96543] flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
            </div>
            <div className="font-display font-black text-2xl text-[#114b3f]">
              {favorites.length}
            </div>
            <div className="text-[11px] text-stone-600 font-medium truncate">
              Saved campus gear
            </div>
          </button>

          {/* 4. My Listings */}
          <button
            onClick={() => setActiveTab('listings')}
            className={`p-4 rounded-3xl border-2 transition-all duration-200 text-left shadow-sm cursor-pointer group ${
              activeTab === 'listings'
                ? 'bg-white border-[#114b3f] ring-2 ring-[#114b3f]/20'
                : 'bg-white/90 hover:bg-white border-[#ebdccd]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-stone-500">
                My Gear
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#114b3f] flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div className="font-display font-black text-2xl text-[#114b3f]">
              {myListings.length}
            </div>
            <div className="text-[11px] text-stone-600 font-medium truncate">
              Active listings
            </div>
          </button>

          {/* 5. Wanted Requests */}
          <button
            onClick={() => {
              setActiveTab('wanted');
              setWantedSubTab('requests');
            }}
            className={`p-4 rounded-3xl border-2 transition-all duration-200 text-left shadow-sm cursor-pointer group ${
              activeTab === 'wanted' && wantedSubTab === 'requests'
                ? 'bg-white border-[#114b3f] ring-2 ring-[#114b3f]/20'
                : 'bg-white/90 hover:bg-white border-[#ebdccd]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-stone-500">
                Requests
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
            </div>
            <div className="font-display font-black text-2xl text-[#114b3f]">
              {myWantedRequests.length}
            </div>
            <div className="text-[11px] text-stone-600 font-medium truncate">
              Wanted gear posts
            </div>
          </button>

          {/* 6. Offers Sent */}
          <button
            onClick={() => {
              setActiveTab('wanted');
              setWantedSubTab('offers');
            }}
            className={`p-4 rounded-3xl border-2 transition-all duration-200 text-left shadow-sm cursor-pointer group ${
              activeTab === 'wanted' && wantedSubTab === 'offers'
                ? 'bg-white border-[#114b3f] ring-2 ring-[#114b3f]/20'
                : 'bg-white/90 hover:bg-white border-[#ebdccd]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-stone-500">
                Offers Sent
              </span>
              <div className="w-7 h-7 rounded-xl bg-orange-50 text-[#d96543] flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="font-display font-black text-2xl text-[#114b3f]">
              {mySentOffers.length}
            </div>
            <div className="text-[11px] text-stone-600 font-medium truncate">
              Lend proposals
            </div>
          </button>

          {/* 7. Payments & Receipts */}
          <button
            onClick={() => setActiveTab('payments')}
            className={`p-4 rounded-3xl border-2 transition-all duration-200 text-left shadow-sm cursor-pointer group ${
              activeTab === 'payments'
                ? 'bg-white border-[#114b3f] ring-2 ring-[#114b3f]/20'
                : 'bg-white/90 hover:bg-white border-[#ebdccd]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-stone-500">
                Payments
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#114b3f] flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="font-display font-black text-2xl text-[#114b3f]">
              {myPayments.length}
            </div>
            <div className="text-[11px] text-stone-600 font-medium truncate">
              Receipts recorded
            </div>
          </button>
        </div>
      </section>

      {/* ─── Tab Navigation Bar ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#ebdccd]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#114b3f] text-white shadow-sm'
                : 'bg-white hover:bg-[#ebdccd]/50 text-stone-700 border border-[#ebdccd]'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab('rentals')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rentals'
                ? 'bg-[#114b3f] text-white shadow-sm'
                : 'bg-white hover:bg-[#ebdccd]/50 text-stone-700 border border-[#ebdccd]'
            }`}
          >
            <span>My Rentals</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'rentals' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {bookings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'approvals'
                ? 'bg-[#114b3f] text-white shadow-sm'
                : 'bg-white hover:bg-[#ebdccd]/50 text-stone-700 border border-[#ebdccd]'
            }`}
          >
            <span>Lender Approvals</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'approvals' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {receivedBookings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('favourites')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'favourites'
                ? 'bg-[#114b3f] text-white shadow-sm'
                : 'bg-white hover:bg-[#ebdccd]/50 text-stone-700 border border-[#ebdccd]'
            }`}
          >
            <span>Saved Favourites</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'favourites' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {favorites.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('listings')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'listings'
                ? 'bg-[#114b3f] text-white shadow-sm'
                : 'bg-white hover:bg-[#ebdccd]/50 text-stone-700 border border-[#ebdccd]'
            }`}
          >
            <span>My Equipment</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'listings' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {myListings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('wanted')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'wanted'
                ? 'bg-[#114b3f] text-white shadow-sm'
                : 'bg-white hover:bg-[#ebdccd]/50 text-stone-700 border border-[#ebdccd]'
            }`}
          >
            <span>Wanted &amp; Offers</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'wanted' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {myWantedRequests.length + mySentOffers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'bg-[#114b3f] text-white shadow-sm'
                : 'bg-white hover:bg-[#ebdccd]/50 text-stone-700 border border-[#ebdccd]'
            }`}
          >
            <span>Payments &amp; Receipts</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'payments' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {myPayments.length}
            </span>
          </button>
        </div>
      </section>

      {/* ─── Main Content Tabs ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ═══════════ TAB 1: OVERVIEW ═══════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Active / Next Rental Highlight */}
            {bookings.length > 0 && (
              <div className="bg-white border-2 border-[#114b3f] rounded-3xl p-6 sm:p-7 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#ebdccd]">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#114b3f] text-white text-[10px] font-mono font-bold uppercase">
                      LATEST RENTAL
                    </span>
                    <h3 className="font-display text-lg font-black text-[#114b3f]">
                      {bookings[0].gearTitle}
                    </h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                    bookings[0].status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : bookings[0].status === 'approved'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {bookings[0].status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4 text-xs">
                  <div>
                    <span className="text-stone-400 font-mono text-[10px] block uppercase">Rental Dates</span>
                    <span className="font-semibold text-stone-900">{bookings[0].startDate} → {bookings[0].endDate}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 font-mono text-[10px] block uppercase">Owner / Lender</span>
                    <span className="font-semibold text-stone-900">{bookings[0].lenderName}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 font-mono text-[10px] block uppercase">Total Rental Fee</span>
                    <span className="font-mono font-bold text-[#d96543] text-sm">₹{bookings[0].totalAmount}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 font-mono text-[10px] block uppercase">Payment Status</span>
                    <span className={`font-mono font-bold text-xs ${
                      bookings[0].paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {bookings[0].paymentStatus === 'paid' ? 'PAID (DEMO)' : 'UNPAID'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#ebdccd] flex items-center justify-end gap-3">
                  {bookings[0].status === 'approved' && bookings[0].paymentStatus !== 'paid' && onProceedToPayment && (
                    <button
                      onClick={() => onProceedToPayment(bookings[0])}
                      className="px-4 py-2 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Proceed to Payment (₹{bookings[0].totalAmount})
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('rentals')}
                    className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    View All Rentals ({bookings.length}) →
                  </button>
                </div>
              </div>
            )}

            {/* ─── Two-Way Trust Reputation Profiles ─── */}
            <div className="bg-white border-2 border-[#114b3f] rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#ebdccd]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛡️</span>
                    <h3 className="font-display text-lg font-black text-[#114b3f]">
                      Campus Trust &amp; Reputation Scores
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Verified two-way feedback from VIT peers. Lender and borrower reputations are tracked separately and revealed only under fair double-blind rules.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    DOUBLE-BLIND VERIFIED
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Equipment Owner Reputation */}
                <div className="p-5 rounded-2xl border-2 border-emerald-900/10 bg-gradient-to-br from-[#fbfdfc] to-emerald-50/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                        AS EQUIPMENT OWNER / LENDER
                      </span>
                      <h4 className="font-display font-bold text-base text-[#114b3f]">
                        Lender Trust Score
                      </h4>
                    </div>
                    <div className="text-right">
                      {userReputation?.ownerReputation.averageRating !== null && userReputation?.ownerReputation.averageRating !== undefined ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-amber-500 text-lg">★</span>
                          <span className="font-display font-black text-2xl text-[#114b3f]">
                            {userReputation.ownerReputation.averageRating}
                          </span>
                          <span className="text-xs text-stone-400 font-bold">/5</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                          No reviews yet
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-2 border-y border-emerald-100/60 text-xs">
                    <div>
                      <span className="text-stone-400 font-mono text-[10px] block uppercase">Verified Reviews</span>
                      <span className="font-bold text-stone-800">
                        {userReputation?.ownerReputation.reviewCount ?? 0} reviews received
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 font-mono text-[10px] block uppercase">Rentals Lent</span>
                      <span className="font-bold text-stone-800">
                        {userReputation?.ownerReputation.completedRentals ?? 0} completed
                      </span>
                    </div>
                  </div>

                  {/* Reviews excerpt */}
                  {userReputation?.ownerReputation.reviews && userReputation.ownerReputation.reviews.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-stone-400 block">
                        Recent Feedback from Borrowers
                      </span>
                      {userReputation.ownerReputation.reviews.slice(0, 2).map((rev) => (
                        <div key={rev.id} className="p-3 bg-white rounded-xl border border-stone-200/80 text-xs space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-900 truncate">
                              {rev.equipmentTitle || 'Equipment'}
                            </span>
                            <div className="flex text-amber-500 text-xs">
                              {'★'.repeat(rev.rating)}
                            </div>
                          </div>
                          {rev.comment && <p className="text-stone-600 italic text-[11px]">"{rev.comment}"</p>}
                          <span className="text-[10px] text-stone-400 block">
                            — {rev.reviewerName} • {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-500 italic">
                      Rent out your gear to campus students to build your Lender Trust rating!
                    </p>
                  )}
                </div>

                {/* 2. Renter Reputation */}
                <div className="p-5 rounded-2xl border-2 border-emerald-900/10 bg-gradient-to-br from-[#fbfdfc] to-blue-50/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#d96543]">
                        AS BORROWER / RENTER
                      </span>
                      <h4 className="font-display font-bold text-base text-[#114b3f]">
                        Renter Care &amp; Punctuality Score
                      </h4>
                    </div>
                    <div className="text-right">
                      {userReputation?.renterReputation.averageRating !== null && userReputation?.renterReputation.averageRating !== undefined ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-amber-500 text-lg">★</span>
                          <span className="font-display font-black text-2xl text-[#114b3f]">
                            {userReputation.renterReputation.averageRating}
                          </span>
                          <span className="text-xs text-stone-400 font-bold">/5</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                          No reviews yet
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-2 border-y border-stone-200/60 text-xs">
                    <div>
                      <span className="text-stone-400 font-mono text-[10px] block uppercase">Verified Reviews</span>
                      <span className="font-bold text-stone-800">
                        {userReputation?.renterReputation.reviewCount ?? 0} reviews received
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 font-mono text-[10px] block uppercase">Rentals Borrowed</span>
                      <span className="font-bold text-stone-800">
                        {userReputation?.renterReputation.completedRentals ?? 0} completed
                      </span>
                    </div>
                  </div>

                  {/* Reviews excerpt */}
                  {userReputation?.renterReputation.reviews && userReputation.renterReputation.reviews.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-stone-400 block">
                        Recent Feedback from Lenders
                      </span>
                      {userReputation.renterReputation.reviews.slice(0, 2).map((rev) => (
                        <div key={rev.id} className="p-3 bg-white rounded-xl border border-stone-200/80 text-xs space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-900 truncate">
                              {rev.equipmentTitle || 'Rental'}
                            </span>
                            <div className="flex text-amber-500 text-xs">
                              {'★'.repeat(rev.rating)}
                            </div>
                          </div>
                          {rev.comment && <p className="text-stone-600 italic text-[11px]">"{rev.comment}"</p>}
                          <span className="text-[10px] text-stone-400 block">
                            — {rev.reviewerName} • {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-500 italic">
                      Borrow gear responsibly and return on time to build your Renter Trust score!
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Grid: Favourites Preview & Gear Listings Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Saved Favourites Snapshot */}
              <div className="bg-white border-2 border-[#ebdccd] rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#ebdccd]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#d96543] rounded-sm"></span>
                    <h3 className="font-display text-base font-bold text-[#114b3f]">
                      Saved Favourites ({favorites.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('favourites')}
                    className="text-xs font-bold text-[#114b3f] hover:underline cursor-pointer"
                  >
                    View All →
                  </button>
                </div>

                {favorites.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-xs text-stone-500 font-medium">No saved gear items yet.</p>
                    <button
                      onClick={onNavigateCatalog}
                      className="px-4 py-1.5 rounded-xl bg-[#114b3f] text-white text-xs font-bold hover:bg-[#0c362d] transition cursor-pointer"
                    >
                      Browse Catalog
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {favorites.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onSelectItem(item)}
                        className="flex items-center justify-between p-3 rounded-2xl border border-stone-200 hover:border-[#114b3f] bg-stone-50/50 hover:bg-white transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-12 h-12 rounded-xl object-cover border border-stone-200"
                          />
                          <div>
                            <h4 className="font-bold text-xs text-stone-900 group-hover:text-[#114b3f] transition-colors line-clamp-1">
                              {item.title}
                            </h4>
                            <span className="text-[11px] font-mono text-stone-500">
                              ₹{item.pricePerDay}/day • {item.location}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#d96543] group-hover:translate-x-1 transition-transform">
                          Book →
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* My Listings Snapshot */}
              <div className="bg-white border-2 border-[#ebdccd] rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#ebdccd]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#114b3f] rounded-sm"></span>
                    <h3 className="font-display text-base font-bold text-[#114b3f]">
                      My Equipment Listings ({myListings.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('listings')}
                    className="text-xs font-bold text-[#114b3f] hover:underline cursor-pointer"
                  >
                    Manage →
                  </button>
                </div>

                {myListings.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-xs text-stone-500 font-medium">You haven&apos;t listed any gear on campus yet.</p>
                    <button
                      onClick={onOpenListGear}
                      className="px-4 py-2 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      + List Your First Gear
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myListings.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onSelectItem(adaptEquipmentToGearItem(item))}
                        className="flex items-center justify-between p-3 rounded-2xl border border-stone-200 hover:border-[#114b3f] bg-stone-50/50 hover:bg-white transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUrls[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'}
                            alt={item.title}
                            className="w-12 h-12 rounded-xl object-cover border border-stone-200"
                          />
                          <div>
                            <h4 className="font-bold text-xs text-stone-900 group-hover:text-[#114b3f] transition-colors line-clamp-1">
                              {item.title}
                            </h4>
                            <span className="text-[11px] font-mono text-stone-500">
                              ₹{item.dailyRentalPrice}/day • {item.categoryName}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          ACTIVE
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Latest Payment Snapshot */}
            {myPayments.length > 0 && (
              <div className="bg-white border-2 border-[#ebdccd] rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[#ebdccd] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-600 rounded-sm"></span>
                    <h3 className="font-display text-base font-bold text-[#114b3f]">
                      Recent Payment Transaction
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="text-xs font-bold text-[#114b3f] hover:underline cursor-pointer"
                  >
                    All Payments ({myPayments.length}) →
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-900">
                        {myPayments[0].providerReference || `MOCK-TXN-${myPayments[0].id.slice(0, 8).toUpperCase()}`}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                        {myPayments[0].status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 font-medium">
                      Gear: {myPayments[0].equipmentTitle}
                    </p>
                    <span className="text-[11px] text-stone-400 font-mono">
                      {new Date(myPayments[0].createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-stone-400 block">Total Amount</span>
                      <span className="font-mono font-black text-lg text-[#114b3f]">
                        ₹{Math.round(parseFloat(myPayments[0].amount))}
                      </span>
                    </div>
                    <button
                      onClick={() => handleViewReceipt(myPayments[0])}
                      className="px-4 py-2 rounded-xl bg-[#114b3f] hover:bg-[#0c362d] text-white text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      View Receipt
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB 2: MY RENTALS & BOOKINGS ═══════════ */}
        {activeTab === 'rentals' && (
          <div className="space-y-6">
            {/* Lifecycle Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Awaiting Approval' },
                  { id: 'ready_to_pay', label: 'Ready to Pay' },
                  { id: 'paid_upcoming', label: 'Paid / Upcoming' },
                  { id: 'active', label: 'Active Rentals' },
                  { id: 'return_requested', label: 'Return Requested' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'cancelled', label: 'Cancelled / Rejected' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setRentalFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    rentalFilter === f.id
                      ? 'bg-[#114b3f] text-white shadow-xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Bookings List */}
            {filteredBookings.length === 0 ? (
              <div className="bg-white border-2 border-[#ebdccd] rounded-3xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto text-xl">
                  📦
                </div>
                <h4 className="font-display font-bold text-base text-stone-800">
                  No bookings found in this category
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Browse the campus inventory to request cameras, audio gear, and lab equipment.
                </p>
                <button
                  onClick={onNavigateCatalog}
                  className="mt-2 px-5 py-2.5 rounded-2xl bg-[#114b3f] text-white text-xs font-bold hover:bg-[#0c362d] transition shadow-xs cursor-pointer"
                >
                  Explore Equipment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white border-2 border-[#ebdccd] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 hover:border-[#114b3f]/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase text-[#d96543]">
                          REF • {b.id.slice(0, 8).toUpperCase()}
                        </span>
                        <h4 className="font-display font-black text-lg text-[#114b3f]">
                          {b.gearTitle}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Badge */}
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${
                          b.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'active'
                            ? 'bg-blue-100 text-blue-800'
                            : b.status === 'approved'
                            ? 'bg-teal-100 text-teal-800'
                            : b.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}>
                          {b.status.replace('_', ' ')}
                        </span>

                        {/* Payment Status Badge */}
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${
                          b.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.paymentStatus === 'failed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {b.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 block uppercase">Rental Dates</span>
                        <span className="font-semibold text-stone-900">{b.startDate} → {b.endDate}</span>
                        <span className="text-[11px] text-stone-500 block">({b.durationDays} day{b.durationDays > 1 ? 's' : ''})</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 block uppercase">Lender / Handover Spot</span>
                        <span className="font-semibold text-stone-900">{b.lenderName}</span>
                        <span className="text-[11px] text-stone-500 block truncate">{b.landmark}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 block uppercase">Price Breakdown</span>
                        <span className="font-semibold text-stone-900">Base: ₹{b.baseAmount}</span>
                        <span className="text-[11px] text-stone-500 block">Deposit: ₹{b.securityDeposit}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 block uppercase">Total Rental Fee</span>
                        <span className="font-mono font-black text-base text-[#d96543]">
                          ₹{b.totalAmount}
                        </span>
                      </div>
                    </div>

                    {/* Rental Action Controls */}
                    <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-end gap-2.5">
                      {/* Ready to pay button */}
                      {b.status === 'approved' && b.paymentStatus !== 'paid' && onProceedToPayment && (
                        <button
                          onClick={() => onProceedToPayment(b)}
                          className="px-4 py-2 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Proceed to Payment (₹{b.totalAmount})</span>
                        </button>
                      )}

                      {/* Payment failed - retry button */}
                      {b.paymentStatus === 'failed' && onProceedToPayment && (
                        <button
                          onClick={() => onProceedToPayment(b)}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          Retry Payment (₹{b.totalAmount})
                        </button>
                      )}

                      {/* Active rental - request return */}
                      {b.status === 'active' && (
                        <button
                          disabled={returningBookingId === b.id}
                          onClick={() => {
                            if (window.confirm(`Request return for ${b.gearTitle}? Make sure all accessories and cables are ready for peer handover.`)) {
                              handleReturn(b.id);
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-[#114b3f] hover:bg-[#0c362d] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {returningBookingId === b.id ? 'Requesting...' : 'Request Return'}
                        </button>
                      )}

                      {/* Return requested notice */}
                      {b.status === 'return_requested' && (
                        <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          <span>Return requested — waiting for owner confirmation</span>
                        </div>
                      )}

                      {/* Completed rental - Rate Owner */}
                      {b.status === 'completed' && (
                        <button
                          onClick={() => setSelectedReviewBooking(b)}
                          className="px-3.5 py-2 rounded-xl bg-[#114b3f] hover:bg-[#0c362d] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <span>★ Rate Owner &amp; Gear</span>
                        </button>
                      )}

                      {/* Paid or Completed - View Receipt */}
                      {b.paymentStatus === 'paid' && onOpenReceipt && (
                        <button
                          onClick={() => {
                            const synthRecord: ApiPaymentRecord = {
                              id: `pay-${b.id}`,
                              bookingId: b.id,
                              payerId: currentUser.id,
                              amount: String(b.totalAmount),
                              currency: 'INR',
                              status: 'SUCCESS',
                              provider: 'MOCK_UPI',
                              providerReference: `MOCK-TXN-${b.id.slice(0, 8).toUpperCase()}`,
                              metadata: {},
                              createdAt: b.createdAt,
                              updatedAt: b.createdAt,
                            };
                            onOpenReceipt(b, synthRecord);
                          }}
                          className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Receipt</span>
                        </button>
                      )}

                      {/* Condition Reports */}
                      {onOpenConditionReports && (
                        <button
                          onClick={() => onOpenConditionReports(b)}
                          className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 text-xs font-semibold transition cursor-pointer"
                        >
                          Inspection Log
                        </button>
                      )}

                      {/* Grievance / Dispute */}
                      {onOpenComplaints && (
                        <button
                          onClick={() => onOpenComplaints(b.id)}
                          className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition cursor-pointer"
                        >
                          File Dispute
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB 2B: LENDER APPROVALS ═══════════ */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-black text-[#114b3f]">
                  Lender Approvals &amp; Gear Return Management
                </h3>
                <p className="text-xs text-stone-600">
                  Manage incoming student requests for your listed gear, hand over equipment upon payment, and confirm returns.
                </p>
              </div>

              <button
                onClick={onOpenListGear}
                className="px-4 py-2 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
              >
                + List More Gear
              </button>
            </div>

            {/* Active Dispute Hold Alert Banner */}
            {disputeHoldError && (
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-medium flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <span className="text-base">⚠️</span>
                  <div>
                    <strong className="block font-bold">Dispute Hold Active</strong>
                    {disputeHoldError}
                  </div>
                </div>
                <button
                  onClick={() => setDisputeHoldError(null)}
                  className="text-rose-500 hover:text-rose-800 font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Lifecycle Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {(
                [
                  { id: 'all', label: 'All Requests' },
                  { id: 'pending', label: 'Pending Approval' },
                  { id: 'ready_handover', label: 'Ready for Handover' },
                  { id: 'active', label: 'Active on Campus' },
                  { id: 'return_requested', label: 'Return Requested' },
                  { id: 'completed', label: 'Completed' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setApprovalFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    approvalFilter === f.id
                      ? 'bg-[#114b3f] text-white shadow-xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Lender Bookings List */}
            {isLoadingReceived ? (
              <div className="text-center py-12 text-xs text-stone-500 font-mono">
                Loading incoming requests...
              </div>
            ) : filteredReceivedBookings.length === 0 ? (
              <div className="bg-white border-2 border-[#ebdccd] rounded-3xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto text-xl">
                  📥
                </div>
                <h4 className="font-display font-bold text-base text-stone-800">
                  No incoming requests in this filter
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  When students book your equipment, their handover passes and requests appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredReceivedBookings.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white border-2 border-[#ebdccd] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 hover:border-[#114b3f]/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase text-[#d96543]">
                          REQUEST REF • {b.id.slice(0, 8).toUpperCase()}
                        </span>
                        <h4 className="font-display font-black text-lg text-[#114b3f]">
                          {b.gearTitle}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${
                          b.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'active'
                            ? 'bg-blue-100 text-blue-800'
                            : b.status === 'approved'
                            ? 'bg-teal-100 text-teal-800'
                            : b.status === 'return_requested'
                            ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-400'
                            : b.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}>
                          {b.status.replace('_', ' ')}
                        </span>

                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${
                          b.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {b.paymentStatus === 'paid' ? 'PAID (DEMO)' : 'UNPAID'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 block uppercase">Renter (Student)</span>
                        <span className="font-semibold text-stone-900">{b.lenderName || 'VIT Student'}</span>
                        <span className="text-[11px] text-stone-500 block truncate">{b.landmark}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 block uppercase">Rental Dates</span>
                        <span className="font-semibold text-stone-900">{b.startDate} → {b.endDate}</span>
                        <span className="text-[11px] text-stone-500 block">({b.durationDays} day{b.durationDays > 1 ? 's' : ''})</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 block uppercase">Rental Earnings</span>
                        <span className="font-mono font-black text-base text-[#114b3f]">
                          ₹{b.totalAmount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 block uppercase">Payment Status</span>
                        <span className={`font-mono text-xs font-bold ${
                          b.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          {b.paymentStatus === 'paid' ? 'Paid via Demo' : 'Awaiting Payment'}
                        </span>
                      </div>
                    </div>

                    {/* Return Requested Banner for Owner */}
                    {b.status === 'return_requested' && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📦</span>
                          <span>
                            <strong>Return Requested:</strong> The borrower has submitted a return request. Please inspect your equipment thoroughly before confirming receipt.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Lender Actions */}
                    <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-end gap-2.5">
                      {/* Pending approval controls */}
                      {b.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            disabled={receivedActionId === b.id}
                            onClick={() => handleApproveReceived(b.id)}
                            className="px-4 py-2 rounded-xl bg-[#114b3f] hover:bg-[#0c382f] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {receivedActionId === b.id ? 'Updating...' : 'Approve Request'}
                          </button>
                          <button
                            type="button"
                            disabled={receivedActionId === b.id}
                            onClick={() => handleRejectReceived(b.id)}
                            className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {/* Ready for handover (Approved and Paid) */}
                      {b.status === 'approved' && b.paymentStatus === 'paid' && (
                        <button
                          type="button"
                          disabled={receivedActionId === b.id}
                          onClick={() => handleStartHandover(b.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <span>🤝</span>
                          <span>{receivedActionId === b.id ? 'Starting...' : 'Hand Over Gear (Start Rental)'}</span>
                        </button>
                      )}

                      {/* Return requested actions */}
                      {b.status === 'return_requested' && (
                        <>
                          <button
                            type="button"
                            disabled={receivedActionId === b.id}
                            onClick={() => {
                              if (window.confirm(`Confirm return for ${b.gearTitle}? This marks the rental as COMPLETED and verifies that the equipment has been received.`)) {
                                handleConfirmReturn(b.id);
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-[#114b3f] hover:bg-[#0c382f] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <span>✓</span>
                            <span>{receivedActionId === b.id ? 'Confirming...' : 'Confirm Return & Complete'}</span>
                          </button>

                          {onOpenDamageClaim && (
                            <button
                              type="button"
                              onClick={() => onOpenDamageClaim(b)}
                              className="px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                            >
                              <span>⚠️</span>
                              <span>Report a Problem</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Completed rental - Rate Renter */}
                      {b.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() => setSelectedReviewBooking(b)}
                          className="px-3.5 py-2 rounded-xl bg-[#114b3f] hover:bg-[#0c362d] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <span>★ Rate Renter</span>
                        </button>
                      )}

                      {/* Condition Reports Inspection Log */}
                      {onOpenConditionReports && (
                        <button
                          type="button"
                          onClick={() => onOpenConditionReports(b)}
                          className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 text-xs font-semibold transition cursor-pointer"
                        >
                          Inspection Log
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB 3: SAVED FAVOURITES ═══════════ */}
        {activeTab === 'favourites' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-black text-[#114b3f]">
                  Saved Campus Gear
                </h3>
                <p className="text-xs text-stone-600">
                  Equipment you have bookmarked for upcoming video shoots, club fests, and hackathons.
                </p>
              </div>

              <button
                onClick={onNavigateCatalog}
                className="px-4 py-2 rounded-2xl bg-[#114b3f] text-white text-xs font-bold hover:bg-[#0c362d] transition shadow-xs cursor-pointer"
              >
                + Browse More Gear
              </button>
            </div>

            {isLoadingFavorites ? (
              <div className="py-16 text-center text-xs font-mono text-stone-500">
                Loading saved favourites...
              </div>
            ) : favorites.length === 0 ? (
              <div className="bg-white border-2 border-[#ebdccd] rounded-3xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-[#d96543] flex items-center justify-center mx-auto text-xl">
                  ❤️
                </div>
                <h4 className="font-display font-bold text-base text-stone-800">
                  No Saved Equipment Yet
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Click the heart icon on any gear card to save it here for fast booking.
                </p>
                <button
                  onClick={onNavigateCatalog}
                  className="mt-2 px-5 py-2.5 rounded-2xl bg-[#114b3f] text-white text-xs font-bold hover:bg-[#0c362d] transition shadow-xs cursor-pointer"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="bg-white border-2 border-[#ebdccd] rounded-3xl overflow-hidden hover:border-[#114b3f] shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      {/* Image & Heart Remove Button */}
                      <div className="relative aspect-video overflow-hidden bg-stone-100">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          onClick={(e) => handleRemoveFavorite(item.id, e)}
                          title="Remove from favourites"
                          aria-label="Remove from favourites"
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-rose-600 flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </button>
                        <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono">
                          {item.location}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-2">
                        <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
                          <span className="uppercase">{item.categoryLabel}</span>
                          <span className="text-emerald-700 font-bold">{item.availabilityBadge}</span>
                        </div>
                        <h4 className="font-display font-bold text-base text-[#114b3f] group-hover:text-[#d96543] transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Price & Book CTA */}
                    <div className="p-5 pt-0 border-t border-stone-100 flex items-center justify-between gap-3 mt-2">
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 block uppercase">Price</span>
                        <span className="font-mono font-black text-base text-[#d96543]">
                          ₹{item.pricePerDay}
                          <span className="text-xs font-normal text-stone-500">/day</span>
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(item);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#114b3f] hover:bg-[#0c362d] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <span>Book Now</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB 4: MY EQUIPMENT LISTINGS ═══════════ */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-black text-[#114b3f]">
                  Equipment You Own &amp; List
                </h3>
                <p className="text-xs text-stone-600">
                  Manage your campus equipment, daily rental rates, deposits, and status.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Active / Inactive Filter */}
                <div className="inline-flex rounded-xl bg-stone-200/70 p-1 border border-stone-300/50">
                  {(['all', 'active', 'inactive'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setListingFilter(mode)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                        listingFilter === mode ? 'bg-white text-[#114b3f] shadow-xs' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <button
                  onClick={onOpenListGear}
                  className="px-4 py-2 rounded-2xl bg-[#d96543] hover:bg-[#c85635] text-white text-xs font-bold transition shadow-md cursor-pointer whitespace-nowrap"
                >
                  + List New Gear
                </button>
              </div>
            </div>

            {isLoadingListings ? (
              <div className="py-16 text-center text-xs font-mono text-stone-500">
                Loading equipment listings...
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="bg-white border-2 border-[#ebdccd] rounded-3xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#114b3f] flex items-center justify-center mx-auto text-xl">
                  📹
                </div>
                <h4 className="font-display font-bold text-base text-stone-800">
                  No Gear Listings Found
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Earn rental income by lending your idle camera, tripod, mic, or tools to fellow VITians.
                </p>
                <button
                  onClick={onOpenListGear}
                  className="mt-2 px-5 py-2.5 rounded-2xl bg-[#d96543] hover:bg-[#c85635] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  + List Your Gear Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((item) => {
                  const adapted = adaptEquipmentToGearItem(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectItem(adapted)}
                      className="bg-white border-2 border-[#ebdccd] rounded-3xl overflow-hidden hover:border-[#114b3f] shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        {/* Image & Status Badge */}
                        <div className="relative aspect-video overflow-hidden bg-stone-100">
                          <img
                            src={item.imageUrls[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                            ACTIVE
                          </span>
                          <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono">
                            {item.pickupLocation}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="p-5 space-y-2">
                          <span className="text-[10px] font-mono uppercase text-stone-500 block">
                            {item.categoryName}
                          </span>
                          <h4 className="font-display font-bold text-base text-[#114b3f] group-hover:text-[#d96543] transition-colors line-clamp-1">
                            {item.title}
                          </h4>
                          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Pricing & Control CTA */}
                      <div className="p-5 pt-0 border-t border-stone-100 flex items-center justify-between gap-3 mt-2">
                        <div>
                          <span className="text-[10px] font-mono text-stone-400 block uppercase">Rate</span>
                          <span className="font-mono font-black text-base text-[#d96543]">
                            ₹{item.dailyRentalPrice}
                            <span className="text-xs font-normal text-stone-500">/day</span>
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItem(adapted);
                          }}
                          className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition cursor-pointer"
                        >
                          View Listing →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB 5: WANTED REQUESTS & OFFERS ═══════════ */}
        {activeTab === 'wanted' && (
          <div className="space-y-6">
            {/* Sub-tabs: Requests Created vs Offers Sent */}
            <div className="flex items-center justify-between border-b border-[#ebdccd] pb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setWantedSubTab('requests')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    wantedSubTab === 'requests'
                      ? 'bg-[#114b3f] text-white shadow-xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                >
                  My Wanted Requests ({myWantedRequests.length})
                </button>
                <button
                  onClick={() => setWantedSubTab('offers')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    wantedSubTab === 'offers'
                      ? 'bg-[#114b3f] text-white shadow-xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                >
                  Offers Sent ({mySentOffers.length})
                </button>
              </div>

              <button
                onClick={onNavigateWanted}
                className="px-4 py-2 rounded-2xl bg-[#d96543] hover:bg-[#c85635] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                + Post Wanted Request
              </button>
            </div>

            {/* Sub-tab 1: My Wanted Requests */}
            {wantedSubTab === 'requests' && (
              <div className="space-y-4">
                {isLoadingWanted ? (
                  <div className="py-16 text-center text-xs font-mono text-stone-500">
                    Loading your wanted requests...
                  </div>
                ) : myWantedRequests.length === 0 ? (
                  <div className="bg-white border-2 border-[#ebdccd] rounded-3xl p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto text-xl">
                      📢
                    </div>
                    <h4 className="font-display font-bold text-base text-stone-800">
                      No Wanted Requests Posted
                    </h4>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                      Need gear that is not in the catalog? Post a request on the campus Wanted Board.
                    </p>
                    <button
                      onClick={onNavigateWanted}
                      className="mt-2 px-5 py-2.5 rounded-2xl bg-[#114b3f] text-white text-xs font-bold hover:bg-[#0c362d] transition shadow-xs cursor-pointer"
                    >
                      Post to Wanted Board
                    </button>
                  </div>
                ) : (
                  myWantedRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white border-2 border-[#ebdccd] rounded-3xl p-6 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase text-[#d96543]">
                              {req.categoryName || 'GENERAL'} • URGENCY: {req.urgency}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-[10px] font-mono text-stone-400">
                              Block {req.locationBlock || 'Campus'}
                            </span>
                          </div>
                          <h4 className="font-display font-black text-lg text-[#114b3f]">
                            {req.title}
                          </h4>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${
                          req.status === 'OPEN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'FULFILLED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      <p className="text-xs text-stone-700 leading-relaxed">
                        {req.description}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-stone-50 p-3 rounded-2xl border border-stone-200">
                        <div>
                          <span className="text-[10px] font-mono text-stone-400 uppercase block">Required Dates</span>
                          <span className="font-semibold text-stone-900">{req.startDate} → {req.endDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-stone-400 uppercase block">Offers Received</span>
                          <span className="font-bold text-[#114b3f]">{req.offers?.length || 0} Lender Offers</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-stone-400 uppercase block">Created At</span>
                          <span className="text-stone-600 font-mono text-[11px]">
                            {new Date(req.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Offers List for this request */}
                      {req.offers && req.offers.length > 0 && (
                        <div className="pt-3 border-t border-stone-100 space-y-3">
                          <h5 className="font-bold text-xs text-stone-700 uppercase tracking-wider">
                            Received Gear Offers ({req.offers.length})
                          </h5>
                          <div className="space-y-2">
                            {req.offers.map((offer) => (
                              <div
                                key={offer.id}
                                className="p-4 rounded-2xl border border-stone-200 bg-[#fbf9f5] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-[#114b3f]">
                                      {offer.equipmentTitle}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                      offer.status === 'ACCEPTED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : offer.status === 'DECLINED'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {offer.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-stone-600">
                                    Offered by <span className="font-bold">{offer.offererName}</span> • ₹{offer.dailyRentalPrice}/day
                                  </p>
                                  {offer.message && (
                                    <p className="text-[11px] text-stone-500 italic">
                                      &ldquo;{offer.message}&rdquo;
                                    </p>
                                  )}
                                </div>

                                {/* Offer action buttons */}
                                {offer.status === 'PENDING' && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      disabled={respondingOfferId === offer.id}
                                      onClick={() => handleRespondOffer(offer.id, 'accept')}
                                      className="px-3.5 py-1.5 rounded-xl bg-[#114b3f] hover:bg-[#0c362d] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                                    >
                                      {respondingOfferId === offer.id ? 'Saving...' : 'Accept Offer'}
                                    </button>
                                    <button
                                      disabled={respondingOfferId === offer.id}
                                      onClick={() => handleRespondOffer(offer.id, 'decline')}
                                      className="px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {offerActionFeedback && (
                        <div className={`p-3 rounded-xl text-xs font-medium ${
                          offerActionFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {offerActionFeedback.msg}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Sub-tab 2: Offers Sent by User */}
            {wantedSubTab === 'offers' && (
              <div className="space-y-4">
                {isLoadingOffers ? (
                  <div className="py-16 text-center text-xs font-mono text-stone-500">
                    Loading your sent offers...
                  </div>
                ) : mySentOffers.length === 0 ? (
                  <div className="bg-white border-2 border-[#ebdccd] rounded-3xl p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-orange-50 text-[#d96543] flex items-center justify-center mx-auto text-xl">
                      🤝
                    </div>
                    <h4 className="font-display font-bold text-base text-stone-800">
                      No Offers Sent Yet
                    </h4>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                      Explore student requests on the Wanted Board and lend your equipment.
                    </p>
                    <button
                      onClick={onNavigateWanted}
                      className="mt-2 px-5 py-2.5 rounded-2xl bg-[#114b3f] text-white text-xs font-bold hover:bg-[#0c362d] transition shadow-xs cursor-pointer"
                    >
                      Browse Wanted Board
                    </button>
                  </div>
                ) : (
                  mySentOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="bg-white border-2 border-[#ebdccd] rounded-3xl p-5 sm:p-6 shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase text-[#d96543]">
                            TARGET REQUEST
                          </span>
                          <h4 className="font-display font-black text-base text-[#114b3f]">
                            {offer.wantedRequestTitle}
                          </h4>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${
                          offer.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : offer.status === 'DECLINED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {offer.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] font-mono text-stone-400 uppercase block">Equipment Offered</span>
                          <span className="font-bold text-stone-900">{offer.equipmentTitle}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-stone-400 uppercase block">Offered Daily Rate</span>
                          <span className="font-mono font-bold text-[#d96543]">₹{offer.dailyRentalPrice}/day</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-stone-400 uppercase block">Request Dates</span>
                          <span className="text-stone-700">{offer.wantedRequestStartDate} → {offer.wantedRequestEndDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-stone-400 uppercase block">Offer Date</span>
                          <span className="font-mono text-stone-600 text-[11px]">
                            {new Date(offer.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {offer.message && (
                        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 italic">
                          &ldquo;{offer.message}&rdquo;
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB 6: PAYMENTS & RECEIPTS ═══════════ */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display text-xl font-black text-[#114b3f]">
                Payment History &amp; Receipts
              </h3>
              <p className="text-xs text-stone-600">
                Verified campus transactions, mock checkout references, and official payment receipts.
              </p>
            </div>

            {isLoadingPayments ? (
              <div className="py-16 text-center text-xs font-mono text-stone-500">
                Loading payment records...
              </div>
            ) : myPayments.length === 0 ? (
              <div className="bg-white border-2 border-[#ebdccd] rounded-3xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#114b3f] flex items-center justify-center mx-auto text-xl">
                  💳
                </div>
                <h4 className="font-display font-bold text-base text-stone-800">
                  No Payment Records Found
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  When you complete a demo payment for an approved booking, the receipt and mock transaction reference will appear here.
                </p>
                <button
                  onClick={() => setActiveTab('rentals')}
                  className="mt-2 px-5 py-2.5 rounded-2xl bg-[#114b3f] text-white text-xs font-bold hover:bg-[#0c362d] transition shadow-xs cursor-pointer"
                >
                  View Rentals Awaiting Payment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myPayments.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border-2 border-[#ebdccd] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#114b3f]/50 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-stone-900">
                          {p.providerReference || `MOCK-TXN-${p.id.slice(0, 8).toUpperCase()}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          p.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-mono">
                          {p.provider || 'MOCK GATEWAY'}
                        </span>
                      </div>

                      <h4 className="font-display font-bold text-base text-[#114b3f]">
                        {p.equipmentTitle}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 font-mono">
                        <span>Lender: {p.ownerName}</span>
                        <span>•</span>
                        <span>Dates: {p.startAt} → {p.endAt}</span>
                        <span>•</span>
                        <span>
                          {new Date(p.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100 justify-between sm:justify-end">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-mono text-stone-400 block uppercase">Amount Paid</span>
                        <span className="font-mono font-black text-xl text-[#d96543]">
                          ₹{Math.round(parseFloat(p.amount))}
                        </span>
                      </div>

                      <button
                        onClick={() => handleViewReceipt(p)}
                        className="px-4 py-2 rounded-xl bg-[#114b3f] hover:bg-[#0c362d] text-white text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>View Receipt</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── Edit Profile Modal ─────────────────────────────────────────── */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={currentUser}
      />

      {/* ─── Two-Way Review Modal ────────────────────────────────────────── */}
      {selectedReviewBooking && (
        <ReviewModal
          isOpen={!!selectedReviewBooking}
          onClose={() => setSelectedReviewBooking(null)}
          booking={selectedReviewBooking}
          currentUser={currentUser}
          onSuccess={() => {
            loadHubData();
            if (onRefreshBookings) onRefreshBookings();
          }}
        />
      )}
    </div>
  );
};

