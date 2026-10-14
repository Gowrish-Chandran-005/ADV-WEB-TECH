import React, { useState, useEffect } from 'react';
import { BookingRequest } from '../types/gear';
import {
  bookingsApi,
  damageClaimsApi,
  type ApiDamageClaim,
  type ApiUser,
} from '../services/api';
import { adaptBookingToRequest } from '../services/adapters';
import { ReviewModal } from './ReviewModal';

interface BookingsDrawerProps {
  bookings: BookingRequest[];
  isLoading: boolean;
  loadError: string | null;
  onClose: () => void;
  onReturnBooking: (bookingId: string) => Promise<void>;
  currentUser?: ApiUser | null;
  onOpenConditionReports?: (booking: BookingRequest) => void;
  onOpenDamageClaim?: (booking: BookingRequest) => void;
  onOpenClaimDetail?: (claimId: string) => void;
  onOpenComplaints?: (bookingId?: string) => void;
  onProceedToPayment?: (booking: BookingRequest) => void;
  onRefreshBookings?: () => void;
}

export const BookingsDrawer: React.FC<BookingsDrawerProps> = ({
  bookings,
  isLoading,
  loadError,
  onClose,
  onReturnBooking,
  currentUser = null,
  onOpenConditionReports,
  onOpenDamageClaim,
  onOpenClaimDetail,
  onOpenComplaints,
  onProceedToPayment,
  onRefreshBookings,
}) => {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(bookings[0]?.id || null);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [isRequestingReturn, setIsRequestingReturn] = useState(false);
  const [showChecklist, setShowChecklist] = useState<string | null>(null);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<BookingRequest | null>(null);
  const [checklistChecks, setChecklistChecks] = useState<{ [key: string]: boolean }>({
    power: true,
    sensor: true,
    accessories: true,
  });

  // Tab: 'renter' (My Rentals) vs 'owner' (Lender Approvals)
  const [activeTab, setActiveTab] = useState<'renter' | 'owner'>('renter');
  const [receivedBookings, setReceivedBookings] = useState<BookingRequest[]>([]);
  const [isLoadingReceived, setIsLoadingReceived] = useState(false);
  const [receivedActionId, setReceivedActionId] = useState<string | null>(null);

  const loadReceived = React.useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingReceived(true);
    try {
      const res = await bookingsApi.receivedBookings({ pageSize: 50 });
      const adapted = res.items.map((b) => adaptBookingToRequest(b));
      setReceivedBookings(adapted);
    } catch {
      // ignore
    } finally {
      setIsLoadingReceived(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'owner') {
      loadReceived();
    }
  }, [activeTab, loadReceived]);

  const handleApproveReceived = async (bookingId: string) => {
    setReceivedActionId(bookingId);
    try {
      await bookingsApi.approve(bookingId);
      await loadReceived();
      if (onRefreshBookings) onRefreshBookings();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve booking.');
    } finally {
      setReceivedActionId(null);
    }
  };

  const handleRejectReceived = async (bookingId: string) => {
    setReceivedActionId(bookingId);
    try {
      await bookingsApi.reject(bookingId, 'Declined by owner');
      await loadReceived();
      if (onRefreshBookings) onRefreshBookings();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to decline booking.');
    } finally {
      setReceivedActionId(null);
    }
  };

  // Active claims for selected booking
  const [activeClaims, setActiveClaims] = useState<ApiDamageClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId) || bookings[0];

  useEffect(() => {
    if (!selectedBooking?.id) return;
    setLoadingClaims(true);
    damageClaimsApi
      .listForBooking(selectedBooking.id)
      .then((res) => setActiveClaims(res.items))
      .catch(() => setActiveClaims([]))
      .finally(() => setLoadingClaims(false));
  }, [selectedBooking?.id]);

  const isLender = Boolean(
    currentUser &&
    selectedBooking &&
    (selectedBooking.ownerUserId === currentUser.id || selectedBooking.ownerUserId === undefined),
  );

  const isReturned = Boolean(
    selectedBooking &&
    (['return_requested', 'completed'].includes(selectedBooking.status) ||
      selectedBooking.returnRecordedAt),
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs modal-backdrop-enter">
      <div className="bg-[#fbf9f5] w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-[#e7e2d7] drawer-slide-in">
        {/* Header */}
        <div className="p-6 border-b border-[#e7e2d7] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#114b3f] text-white flex items-center justify-center font-bold shadow-xs">
              <svg className="w-5 h-5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#114b3f]">My Campus Bookings</h2>
              <p className="text-xs text-[#697a73] font-mono">Verified Peer Handover Passes &amp; Condition Audits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Role Toggle Tabs */}
        <div className="px-6 pt-3 pb-0 bg-white border-b border-[#e7e2d7] flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('renter')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'renter'
                ? 'border-[#114b3f] text-[#114b3f]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            My Rentals ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('owner')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'owner'
                ? 'border-[#114b3f] text-[#114b3f]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Lender Approvals ({receivedBookings.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'owner' ? (
            /* Lender Approvals Tab */
            <div className="space-y-4">
              {isLoadingReceived ? (
                <p className="text-center py-12 text-xs text-[#697a73] font-mono">Loading requests...</p>
              ) : receivedBookings.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto text-lg font-mono">
                    0
                  </div>
                  <p className="text-sm font-bold text-[#114b3f]">No incoming requests</p>
                  <p className="text-xs text-[#697a73]">When other students request your gear, they appear here for your approval.</p>
                </div>
              ) : (
                receivedBookings.map((b) => (
                  <div key={b.id} className="bg-white border border-[#e7e2d7] rounded-2xl p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase text-[#d96543]">
                          REQUEST • {b.id.slice(0, 8)}
                        </span>
                        <h4 className="font-bold text-sm text-[#114b3f]">{b.gearTitle}</h4>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                        b.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-200 text-stone-700'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-stone-500 block">Renter</span>
                        <span className="font-bold text-stone-900">{b.lenderName || 'VIT Student'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Total Rental Fee</span>
                        <span className="font-bold text-[#d96543] font-mono">₹{b.totalAmount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Dates</span>
                        <span className="font-semibold text-stone-800">{b.startDate} → {b.endDate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Payment Status</span>
                        <span className={`font-mono text-[10px] font-bold ${
                          b.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          {b.paymentStatus === 'paid' ? 'PAID (DEMO)' : 'UNPAID'}
                        </span>
                      </div>
                    </div>

                    {b.status === 'pending' && (
                      <div className="pt-2 flex items-center gap-2 border-t border-stone-100">
                        <button
                          type="button"
                          disabled={receivedActionId === b.id}
                          onClick={() => handleApproveReceived(b.id)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#114b3f] hover:bg-[#0c382f] text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 text-center"
                        >
                          {receivedActionId === b.id ? 'Updating...' : 'Approve Request'}
                        </button>
                        <button
                          type="button"
                          disabled={receivedActionId === b.id}
                          onClick={() => handleRejectReceived(b.id)}
                          className="py-2 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs transition cursor-pointer disabled:opacity-50 text-center"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {b.status === 'approved' && b.paymentStatus !== 'paid' && (
                      <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 text-xs font-medium">
                        Approved. Waiting for student to complete checkout demo payment.
                      </div>
                    )}

                    {b.status === 'approved' && b.paymentStatus === 'paid' && (
                      <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                        <span className="text-[11px] text-emerald-800 font-semibold">Payment received (mock). Ready for handover!</span>
                        <button
                          type="button"
                          disabled={receivedActionId === b.id}
                          onClick={async () => {
                            setReceivedActionId(b.id);
                            try {
                              await bookingsApi.start(b.id);
                              await loadReceived();
                              if (onRefreshBookings) onRefreshBookings();
                            } catch (err: unknown) {
                              alert(err instanceof Error ? err.message : 'Failed to record handover.');
                            } finally {
                              setReceivedActionId(null);
                            }
                          }}
                          className="py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                        >
                          {receivedActionId === b.id ? 'Starting...' : 'Hand Over Gear'}
                        </button>
                      </div>
                    )}

                    {b.status === 'return_requested' && (
                      <div className="pt-2 space-y-2 border-t border-stone-100">
                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 text-xs font-semibold">
                          Return requested by renter. Please verify equipment condition.
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={receivedActionId === b.id}
                            onClick={async () => {
                              setReceivedActionId(b.id);
                              try {
                                await bookingsApi.complete(b.id);
                                await loadReceived();
                                if (onRefreshBookings) onRefreshBookings();
                              } catch (err: unknown) {
                                if (err && typeof err === 'object' && ('code' in err) && (err as any).code === 'ACTIVE_DISPUTE_HOLD') {
                                  alert('Active Dispute Hold: Cannot complete return while an unresolved damage claim is active on this booking.');
                                } else {
                                  alert(err instanceof Error ? err.message : 'Failed to confirm return.');
                                }
                              } finally {
                                setReceivedActionId(null);
                              }
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#114b3f] hover:bg-[#0c382f] text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 text-center"
                          >
                            {receivedActionId === b.id ? 'Confirming...' : 'Confirm Return'}
                          </button>
                          {onOpenDamageClaim && (
                            <button
                              type="button"
                              onClick={() => onOpenDamageClaim(b)}
                              className="py-2 px-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs transition cursor-pointer text-center"
                            >
                              Report Damage
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {b.status === 'completed' && (
                      <div className="pt-2 flex items-center justify-end border-t border-stone-100">
                        <button
                          type="button"
                          onClick={() => setSelectedReviewBooking(b)}
                          className="py-1.5 px-3 rounded-xl bg-[#114b3f] hover:bg-[#0c382f] text-white font-bold text-xs transition cursor-pointer"
                        >
                          ★ Rate Renter
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* My Rentals Tab */
            <>
              {loadError && (
                <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  {loadError}
                </div>
              )}
              {isLoading ? (
                <p className="text-center py-12 text-xs text-[#697a73] font-mono">Loading bookings...</p>
              ) : bookings.length === 0 && !loadError ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto text-lg font-mono">
                    0
                  </div>
                  <p className="text-sm font-bold text-[#114b3f]">No active bookings</p>
                  <p className="text-xs text-[#697a73]">Browse the campus catalog to request equipment.</p>
                </div>
              ) : bookings.length > 0 ? (
                <>
                  {/* Booking Select Tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {bookings.map((booking) => (
                      <button
                        key={booking.id}
                        onClick={() => setSelectedBookingId(booking.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          selectedBooking?.id === booking.id
                            ? 'bg-[#114b3f] text-white shadow-sm'
                            : 'bg-white border border-[#e7e2d7] text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <span>{booking.gearTitle}</span>
                        <span className="ml-2 text-[10px] opacity-80 uppercase">({booking.status})</span>
                      </button>
                    ))}
                  </div>

                  {selectedBooking && (
                    <div className="space-y-6">
                      {/* Digital Handover Pass Card */}
                      <div className="bg-white border-2 border-[#114b3f] rounded-3xl p-6 shadow-md relative overflow-hidden">
                        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase text-[#d96543]">
                              HANDOVER PASS • {selectedBooking.id.slice(0, 8)}
                            </span>
                            <h3 className="font-display text-lg font-bold text-[#114b3f]">
                              {selectedBooking.gearTitle}
                            </h3>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase ${
                                ['approved', 'active'].includes(selectedBooking.status)
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ['completed', 'cancelled', 'rejected'].includes(selectedBooking.status)
                                  ? 'bg-stone-200 text-stone-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {selectedBooking.status}
                            </span>
                            <span
                              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                                selectedBooking.paymentStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : selectedBooking.paymentStatus === 'failed'
                                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                                  : 'bg-amber-50 text-amber-700 border-amber-300'
                              }`}
                            >
                              {selectedBooking.paymentStatus === 'paid'
                                ? 'PAID • DEMO'
                                : selectedBooking.paymentStatus === 'failed'
                                ? 'PAYMENT FAILED'
                                : 'UNPAID'}
                            </span>
                          </div>
                        </div>

                        <div className="py-4 grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-[10px] font-mono uppercase text-[#697a73] block">Lender</span>
                            <span className="font-bold text-[#1c2421]">{selectedBooking.lenderName}</span>
                            <span className="text-[11px] text-[#697a73] block">{selectedBooking.lenderBlock}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase text-[#697a73] block">Handover Spot</span>
                            <span className="font-bold text-[#1c2421] line-clamp-1">{selectedBooking.landmark}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase text-[#697a73] block">Rental Starts</span>
                            <span className="font-bold text-[#1c2421]">
                              {selectedBooking.pickupDate}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase text-[#697a73] block">Last Rental Day</span>
                            <span className="font-bold text-[#1c2421]">
                              {selectedBooking.returnDate}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 bg-[#f4ede2] rounded-2xl p-4 flex items-center justify-between gap-4 border border-[#e6d8c3]">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono uppercase font-bold text-[#114b3f]">
                              Booking Reference
                            </span>
                            <p className="font-mono text-[11px] text-stone-800 font-bold">{selectedBooking.id}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono uppercase font-bold text-[#697a73] block">
                              Total Rental Price
                            </span>
                            <span className="font-mono text-sm font-bold text-[#d96543]">
                              ₹{selectedBooking.totalAmount}
                            </span>
                          </div>
                        </div>

                        {/* Payment CTA Callout */}
                        {selectedBooking.status === 'approved' && selectedBooking.paymentStatus !== 'paid' && (
                          <div className="mt-4 p-4 rounded-2xl bg-[#f5ebe4] border-2 border-[#d96543]/40 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#114b3f]">
                                <span className="w-2 h-2 rounded-full bg-[#d96543] animate-pulse"></span>
                                <span>Approved • Ready for Payment</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-[#d96543]">
                                ₹{selectedBooking.totalAmount}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-600 leading-relaxed">
                              Your rental request has been approved by the equipment owner. Complete the demo checkout to confirm your handover pass.
                            </p>
                            <button
                              type="button"
                              onClick={() => onProceedToPayment && onProceedToPayment(selectedBooking)}
                              className="w-full py-2.5 px-4 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span>Proceed to Payment (₹{selectedBooking.totalAmount} Demo)</span>
                            </button>
                          </div>
                        )}

                        {selectedBooking.paymentStatus === 'failed' && (
                          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-300 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-rose-900">Payment Failed</span>
                              <span className="text-xs font-mono font-bold text-rose-800">Unpaid</span>
                            </div>
                            <p className="text-[11px] text-rose-700 leading-relaxed">
                              The previous simulated payment attempt failed. Your booking remains approved and unpaid.
                            </p>
                            <button
                              type="button"
                              onClick={() => onProceedToPayment && onProceedToPayment(selectedBooking)}
                              className="w-full py-2 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer text-center"
                            >
                              Retry Payment (₹{selectedBooking.totalAmount} Demo)
                            </button>
                          </div>
                        )}

                        {selectedBooking.paymentStatus === 'paid' && (
                          <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                                ✓
                              </div>
                              <div>
                                <span className="text-xs font-bold text-emerald-950 block">Demo Payment Confirmed</span>
                                <span className="text-[10px] text-emerald-700">Paid ₹{selectedBooking.totalAmount} • Pass Active</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                              PAID
                            </span>
                          </div>
                        )}

                        {selectedBooking.status === 'pending' && (
                          <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Awaiting owner approval. You will be able to pay once the owner approves your request.</span>
                          </div>
                        )}
                      </div>

                  {/* Active Damage Claim Banner (If open claim exists on this booking) */}
                  {activeClaims.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-900 tracking-wider">
                          Active Damage Dispute
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-200 text-amber-900">
                          {activeClaims[0].status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        A condition dispute is currently under review for this equipment rental.
                        {activeClaims[0].proposedFineAmount && ` Proposed fine: ₹${activeClaims[0].proposedFineAmount}.`}
                      </p>
                      <button
                        onClick={() => {
                          if (onOpenClaimDetail) {
                            onOpenClaimDetail(activeClaims[0].id);
                          }
                        }}
                        className="w-full py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-colors cursor-pointer text-center"
                      >
                        View Dispute Dossier &amp; Responses
                      </button>
                    </div>
                  )}

                  {/* Actions Hub: Condition Evidence & Damage Filing */}
                  <div className="bg-white border border-[#e7e2d7] rounded-2xl p-5 space-y-3">
                    <h4 className="font-bold text-sm text-[#114b3f]">Handover &amp; Return Evidence</h4>
                    <p className="text-xs text-[#697a73]">
                      Inspect equipment condition and record timestamped photographic snapshots to prevent disputes.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (onOpenConditionReports) {
                            onOpenConditionReports(selectedBooking);
                          }
                        }}
                        className="py-2.5 px-3 rounded-xl border border-[#114b3f] bg-emerald-50/50 hover:bg-emerald-50 text-[#114b3f] text-xs font-bold transition-colors cursor-pointer text-center"
                      >
                        Condition Reports &amp; Photos
                      </button>

                      {isReturned && activeClaims.length === 0 && (
                        <button
                          onClick={() => {
                            if (onOpenDamageClaim) {
                              onOpenDamageClaim(selectedBooking);
                            }
                          }}
                          className="py-2.5 px-3 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white text-xs font-bold transition-colors cursor-pointer text-center shadow-xs"
                        >
                          Report Return Damage
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 30-Second Condition Checklist Inspection */}
                  <div className="bg-white border border-[#e7e2d7] rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-[#114b3f]">Handover Diagnostics Checklist</h4>
                      <button
                        onClick={() =>
                          setShowChecklist(showChecklist === selectedBooking.id ? null : selectedBooking.id)
                        }
                        className="text-xs font-mono font-bold text-[#d96543] underline cursor-pointer"
                      >
                        {showChecklist === selectedBooking.id ? 'Hide' : 'Inspect'}
                      </button>
                    </div>

                    {showChecklist === selectedBooking.id && (
                      <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checklistChecks.power}
                            onChange={(e) =>
                              setChecklistChecks({ ...checklistChecks, power: e.target.checked })
                            }
                            className="rounded text-[#114b3f] accent-[#114b3f]"
                          />
                          <span>Power-On &amp; Screen Diagnostics Verified</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checklistChecks.sensor}
                            onChange={(e) =>
                              setChecklistChecks({ ...checklistChecks, sensor: e.target.checked })
                            }
                            className="rounded text-[#114b3f] accent-[#114b3f]"
                          />
                          <span>Clean Sensor &amp; Scratch-Free Lens Optics</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checklistChecks.accessories}
                            onChange={(e) =>
                              setChecklistChecks({ ...checklistChecks, accessories: e.target.checked })
                            }
                            className="rounded text-[#114b3f] accent-[#114b3f]"
                          />
                          <span>Batteries at 100% + All Inclusions Present</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Return Request Button */}
                  {selectedBooking.status === 'active' && (
                    <div className="bg-[#e8f3ef] border border-[#d1e7dd] rounded-2xl p-5 space-y-4">
                      <h4 className="font-bold text-sm text-[#114b3f]">Finished Your Shoot / Project?</h4>
                      <p className="text-xs text-[#697a73]">
                        Send a return request to the equipment owner. They must confirm the return.
                      </p>

                      {returnError && (
                        <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                          {returnError}
                        </div>
                      )}

                      <button
                        disabled={isRequestingReturn}
                        onClick={async () => {
                          setIsRequestingReturn(true);
                          setReturnError(null);
                          try {
                            await onReturnBooking(selectedBooking.id);
                          } catch (error) {
                            setReturnError(error instanceof Error ? error.message : 'Return request failed. Please try again.');
                          } finally {
                            setIsRequestingReturn(false);
                          }
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#114b3f] hover:bg-[#0c382f] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        {isRequestingReturn ? 'Sending Return Request...' : 'Request Return'}
                      </button>
                    </div>
                  )}

                  {selectedBooking.status === 'return_requested' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-900">
                      Return request sent. Waiting for the equipment owner to confirm and inspect return condition.
                    </div>
                  )}

                  {selectedBooking.status === 'completed' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-[#114b3f]">Rental Completed</h4>
                          <p className="text-xs text-stone-600">
                            Rate your experience with the owner &amp; equipment.
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedReviewBooking(selectedBooking)}
                          className="py-2 px-4 rounded-xl bg-[#114b3f] hover:bg-[#0c382f] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <span>★ Rate Owner &amp; Gear</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Campus Grievance Link */}
                  <div className="text-center pt-2">
                    <button
                      onClick={() => {
                        if (onOpenComplaints) {
                          onOpenComplaints(selectedBooking.id);
                        }
                      }}
                      className="text-xs font-mono text-[#697a73] hover:text-[#114b3f] underline cursor-pointer"
                    >
                      Report a peer violation or general grievance
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  </div>

  {/* Two-Way Review Modal */}
  {selectedReviewBooking && (
    <ReviewModal
      isOpen={!!selectedReviewBooking}
      onClose={() => setSelectedReviewBooking(null)}
      booking={selectedReviewBooking}
      currentUser={currentUser}
      onSuccess={() => {
        loadReceived();
        if (onRefreshBookings) onRefreshBookings();
      }}
    />
  )}
</div>
);
};

