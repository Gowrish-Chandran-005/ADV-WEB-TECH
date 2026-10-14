import React, { useState, useEffect, useCallback } from 'react';
import {
  wantedApi,
  equipmentApi,
  type ApiWantedRequest,
  type ApiWantedOffer,
  type ApiMatchedEquipmentItem,
  type ApiUser,
} from '../services/api';
import { formatTimeAgo, adaptEquipmentToGearItem } from '../services/adapters';
import type { GearItem } from '../types/gear';

interface WantedDetailModalProps {
  isOpen: boolean;
  requestId: string | null;
  currentUser: ApiUser | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenOfferModal: (request: ApiWantedRequest) => void;
  onOpenEditModal: (request: ApiWantedRequest) => void;
  onRequestWithdrawn: () => void;
  onProceedToBooking: (item: GearItem, startDate: string, endDate: string) => void;
}

export const WantedDetailModal: React.FC<WantedDetailModalProps> = ({
  isOpen,
  requestId,
  currentUser,
  onClose,
  onOpenAuth,
  onOpenOfferModal,
  onOpenEditModal,
  onRequestWithdrawn,
  onProceedToBooking,
}) => {
  const [request, setRequest] = useState<ApiWantedRequest | null>(null);
  const [offers, setOffers] = useState<ApiWantedOffer[]>([]);
  const [matches, setMatches] = useState<ApiMatchedEquipmentItem[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'offers' | 'matches'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const isAuthor = currentUser && request ? currentUser.id === request.userId : false;

  const loadData = useCallback(async () => {
    if (!requestId) return;
    setIsLoading(true);
    setError(null);
    setActionError(null);
    try {
      const res = await wantedApi.getById(requestId);
      setRequest(res.request);
      if (res.offers) {
        setOffers(res.offers);
      }

      // Fetch matches
      try {
        const matchesRes = await wantedApi.getMatches(requestId);
        setMatches(matchesRes.items);
      } catch {
        // Matches are non-critical
        setMatches([]);
      }
    } catch {
      setError('Could not load wanted request details. It may have been removed.');
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (isOpen && requestId) {
      loadData();
      setActiveTab('details');
    }
  }, [isOpen, requestId, loadData]);

  if (!isOpen || !requestId) return null;

  const handleWithdraw = async () => {
    if (!request || !window.confirm('Are you sure you want to withdraw this wanted request?')) {
      return;
    }
    setIsProcessingAction(true);
    setActionError(null);
    try {
      await wantedApi.withdraw(request.id);
      onRequestWithdrawn();
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to withdraw request.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOfferResponse = async (offerId: string, action: 'accept' | 'decline') => {
    setIsProcessingAction(true);
    setActionError(null);
    try {
      await wantedApi.respondOffer(offerId, { action });
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : `Failed to ${action} offer.`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleBookOfferedGear = async (offer: ApiWantedOffer) => {
    if (!request) return;
    setIsProcessingAction(true);
    setActionError(null);
    try {
      const { equipment } = await equipmentApi.getById(offer.equipmentId);
      const adapted = adaptEquipmentToGearItem(equipment);
      onProceedToBooking(adapted, request.startDate, request.endDate);
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to retrieve gear details for booking.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleBookMatchedGear = async (match: ApiMatchedEquipmentItem) => {
    if (!request) return;
    setIsProcessingAction(true);
    setActionError(null);
    try {
      const { equipment } = await equipmentApi.getById(match.id);
      const adapted = adaptEquipmentToGearItem(equipment);
      onProceedToBooking(adapted, request.startDate, request.endDate);
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to retrieve gear details for booking.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto modal-backdrop-enter">
      <div className="bg-[#114b3f] text-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-board relative border border-emerald-900/60 my-8 modal-card-enter">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#14594b]/80">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-[#d96543]">★</span>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-emerald-300 uppercase">
                CAMPUS NOTICEBOARD DETAILS
              </div>
              <h2 className="font-display text-xl font-black text-white">
                {request ? request.title : 'Wanted Request'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-[#14594b] hover:bg-[#0c382f] flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error ? (
          <div className="py-8 text-center text-xs text-red-200">
            {error}
          </div>
        ) : isLoading || !request ? (
          <div className="py-16 text-center text-xs font-mono text-emerald-300">
            Loading request details...
          </div>
        ) : (
          <div className="mt-4">
            {actionError && (
              <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200">
                {actionError}
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#14594b]/60 pb-2 mb-4 text-xs font-mono">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'details'
                    ? 'bg-[#14594b] text-white font-bold'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                Overview
              </button>
              {isAuthor && (
                <button
                  onClick={() => setActiveTab('offers')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'offers'
                      ? 'bg-[#14594b] text-white font-bold'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                >
                  <span>Gear Offers</span>
                  {offers.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#d96543] text-[10px] text-white font-bold">
                      {offers.length}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setActiveTab('matches')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'matches'
                    ? 'bg-[#14594b] text-white font-bold'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                <span>Matching Gear</span>
                {matches.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-700 text-[10px] text-emerald-100 font-bold">
                    {matches.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB: Details */}
            {activeTab === 'details' && (
              <div className="space-y-4 text-xs">
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                    request.urgency === 'HIGH'
                      ? 'bg-rose-900/80 text-rose-200 border border-rose-700/60'
                      : request.urgency === 'MEDIUM'
                      ? 'bg-amber-900/80 text-amber-200 border border-amber-700/60'
                      : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700/60'
                  }`}>
                    {request.urgency} URGENCY
                  </span>

                  <span className="px-2.5 py-1 rounded-full bg-[#0d382f] text-emerald-200 border border-emerald-700/50 text-[10px] font-mono">
                    {request.categoryName}
                  </span>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                    request.status === 'OPEN'
                      ? 'bg-emerald-800 text-emerald-100'
                      : request.status === 'FULFILLED'
                      ? 'bg-blue-900 text-blue-200'
                      : 'bg-stone-800 text-stone-300'
                  }`}>
                    {request.status}
                  </span>
                </div>

                {/* Description Body */}
                <div className="p-4 bg-[#0d382f]/70 rounded-2xl border border-emerald-800/60 text-stone-200 leading-relaxed text-sm">
                  {request.description}
                </div>

                {/* Logistics Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-[#092620]/80 rounded-xl border border-emerald-800/50">
                    <span className="text-emerald-400 block mb-0.5">REQUESTED DATES</span>
                    <span className="text-white font-bold">{request.startDate} to {request.endDate}</span>
                  </div>
                  <div className="p-3 bg-[#092620]/80 rounded-xl border border-emerald-800/50">
                    <span className="text-emerald-400 block mb-0.5">PICKUP / MEETUP ZONE</span>
                    <span className="text-white font-bold">{request.locationBlock || 'Campus Area'}</span>
                  </div>
                </div>

                {/* Author Card (Privacy preserved: initials & first name only) */}
                <div className="flex items-center justify-between p-3.5 bg-[#092620]/50 rounded-xl border border-emerald-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#14594b] text-emerald-200 flex items-center justify-center font-bold text-xs ring-1 ring-emerald-500/40">
                      {request.author.initials}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{request.author.fullName}</div>
                      <div className="text-[10px] text-emerald-300/80 font-mono">
                        Posted {formatTimeAgo(request.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[11px] font-mono text-emerald-300">
                    {request.offersCount} {request.offersCount === 1 ? 'offer' : 'offers'} received
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#14594b]/60">
                  {isAuthor ? (
                    <>
                      {request.status === 'OPEN' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenEditModal(request)}
                            disabled={isProcessingAction}
                            className="px-4 py-2 rounded-xl bg-[#14594b] hover:bg-emerald-700 text-white font-bold transition-all cursor-pointer"
                          >
                            Edit Request
                          </button>
                          <button
                            type="button"
                            onClick={handleWithdraw}
                            disabled={isProcessingAction}
                            className="px-4 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 font-bold transition-all cursor-pointer"
                          >
                            Withdraw Request
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {request.status === 'OPEN' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser) {
                              onOpenAuth();
                              return;
                            }
                            onOpenOfferModal(request);
                          }}
                          className="px-6 py-2.5 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white font-bold transition-all shadow-md cursor-pointer"
                        >
                          I Have This Gear
                        </button>
                      ) : (
                        <span className="text-xs font-mono text-emerald-300/80">
                          This request is {request.status.toLowerCase()}.
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Offers (Author Only) */}
            {activeTab === 'offers' && isAuthor && (
              <div className="space-y-3">
                {offers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-emerald-300/80 bg-[#0d382f]/40 rounded-2xl border border-emerald-800/40">
                    No offers received yet. Students browsing the Wanted Board will be able to offer their gear here.
                  </div>
                ) : (
                  offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="p-4 bg-[#0d382f]/80 rounded-2xl border border-emerald-700/60 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {offer.equipmentImage && (
                            <img
                              src={offer.equipmentImage}
                              alt={offer.equipmentTitle}
                              className="w-12 h-12 rounded-xl object-cover bg-emerald-950 shrink-0"
                            />
                          )}
                          <div>
                            <div className="font-bold text-sm text-white">{offer.equipmentTitle}</div>
                            <div className="text-xs text-emerald-300 font-mono">
                              Offered by {offer.offererName} • ₹{offer.dailyRentalPrice}/day
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                            offer.status === 'ACCEPTED'
                              ? 'bg-emerald-600 text-white'
                              : offer.status === 'DECLINED'
                              ? 'bg-stone-800 text-stone-400'
                              : 'bg-amber-900/80 text-amber-200 border border-amber-700/60'
                          }`}
                        >
                          {offer.status}
                        </span>
                      </div>

                      {offer.message && (
                        <div className="p-2.5 bg-[#092620] rounded-xl text-xs text-emerald-100 border border-emerald-800/50">
                          “{offer.message}”
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-emerald-800/60">
                        <div className="text-[10px] font-mono text-emerald-400">
                          {formatTimeAgo(offer.createdAt)}
                        </div>

                        <div className="flex items-center gap-2">
                          {offer.status === 'PENDING' && request.status === 'OPEN' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOfferResponse(offer.id, 'accept')}
                                disabled={isProcessingAction}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors"
                              >
                                Accept Offer
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOfferResponse(offer.id, 'decline')}
                                disabled={isProcessingAction}
                                className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-red-950/80 border border-red-500/40 text-red-200 font-semibold text-xs cursor-pointer transition-colors"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {offer.status === 'ACCEPTED' && (
                            <button
                              type="button"
                              onClick={() => handleBookOfferedGear(offer)}
                              disabled={isProcessingAction}
                              className="px-4 py-2 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white font-bold text-xs shadow-md cursor-pointer transition-all"
                            >
                              Proceed to Book Gear →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: Matches */}
            {activeTab === 'matches' && (
              <div className="space-y-3">
                {matches.length === 0 ? (
                  <div className="p-8 text-center text-xs text-emerald-300/80 bg-[#0d382f]/40 rounded-2xl border border-emerald-800/40">
                    No matching equipment currently in the catalog. Check back soon as students list new gear!
                  </div>
                ) : (
                  matches.map((match) => (
                    <div
                      key={match.id}
                      className="p-4 bg-[#0d382f]/80 rounded-2xl border border-emerald-700/60 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {match.imageUrls[0] && (
                          <img
                            src={match.imageUrls[0]}
                            alt={match.title}
                            className="w-14 h-14 rounded-xl object-cover bg-emerald-950 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-white truncate">{match.title}</div>
                          <div className="text-xs text-emerald-300 font-mono">
                            ₹{match.dailyRentalPrice}/day • {match.pickupLocation}
                          </div>
                          {match.matchReasons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {match.matchReasons.map((reason, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-mono text-emerald-400 bg-[#092620] px-1.5 py-0.5 rounded border border-emerald-800/60"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBookMatchedGear(match)}
                        disabled={isProcessingAction}
                        className="px-4 py-2 rounded-xl bg-[#14594b] hover:bg-emerald-600 text-white font-bold text-xs shrink-0 cursor-pointer transition-all"
                      >
                        Book Gear
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
