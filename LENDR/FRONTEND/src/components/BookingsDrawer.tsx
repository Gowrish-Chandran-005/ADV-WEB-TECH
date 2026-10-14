import React, { useState, useEffect } from 'react';
import { BookingRequest } from '../types/gear';
import {
  damageClaimsApi,
  type ApiDamageClaim,
  type ApiUser,
} from '../services/api';

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
}) => {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(bookings[0]?.id || null);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [isRequestingReturn, setIsRequestingReturn] = useState(false);
  const [showChecklist, setShowChecklist] = useState<string | null>(null);
  const [checklistChecks, setChecklistChecks] = useState<{ [key: string]: boolean }>({
    power: true,
    sensor: true,
    accessories: true,
  });

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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                    </div>
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
        </div>
      </div>
    </div>
  );
};
