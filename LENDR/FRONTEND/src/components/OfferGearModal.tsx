import React, { useState, useEffect } from 'react';
import {
  equipmentApi,
  wantedApi,
  type ApiEquipmentListing,
  type ApiWantedRequest,
} from '../services/api';

interface OfferGearModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ApiWantedRequest | null;
  onSuccess: () => void;
  onOpenListGear?: () => void;
  preselectedEquipmentId?: string | null;
}

export const OfferGearModal: React.FC<OfferGearModalProps> = ({
  isOpen,
  onClose,
  request,
  onSuccess,
  onOpenListGear,
  preselectedEquipmentId,
}) => {
  const [myListings, setMyListings] = useState<ApiEquipmentListing[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setMessage('');
      setSelectedEquipmentId(preselectedEquipmentId || '');
      equipmentApi
        .myListings({ status: 'ACTIVE', pageSize: 50 })
        .then((res) => {
          setMyListings(res.items);
          if (res.items.length > 0) {
            if (preselectedEquipmentId && res.items.some((it) => it.id === preselectedEquipmentId)) {
              setSelectedEquipmentId(preselectedEquipmentId);
            } else {
              setSelectedEquipmentId((prev) => (prev && res.items.some((it) => it.id === prev) ? prev : res.items[0].id));
            }
          }
        })
        .catch(() => {
          setError('Could not retrieve your gear listings. Please try again.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, preselectedEquipmentId]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipmentId) {
      setError('Please select an active piece of equipment to offer.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await wantedApi.createOffer(request.id, {
        equipmentId: selectedEquipmentId,
        message: message.trim() || undefined,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onSuccess();
        onClose();
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit offer. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto modal-backdrop-enter">
      <div className="bg-[#114b3f] text-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-board relative border border-emerald-900/60 my-8 modal-card-enter">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#14594b]/80">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-[#d96543]">★</span>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-emerald-300 uppercase">
                CAMPUS GEAR OFFER
              </div>
              <h2 className="font-display text-xl font-black text-white">I Have This Gear</h2>
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

        {/* Request target snippet */}
        <div className="mt-4 p-3.5 bg-[#092620]/80 rounded-2xl border border-emerald-800/60">
          <div className="text-[11px] font-mono text-emerald-300">OFFERING GEAR FOR REQUEST:</div>
          <div className="font-display font-bold text-white text-sm mt-0.5">{request.title}</div>
          <div className="text-xs text-emerald-200/70 mt-1 line-clamp-2">{request.description}</div>
          <div className="text-[11px] font-mono text-emerald-400 mt-2">
            Dates: {request.startDate} to {request.endDate} • {request.locationBlock || 'Campus'}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3.5 bg-rose-950/90 border border-rose-500/60 rounded-xl text-xs text-rose-200 flex items-start gap-2.5">
            <span className="text-rose-400 font-bold shrink-0">✕</span>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-xs font-mono text-emerald-300">
            Loading your active listings...
          </div>
        ) : myListings.length === 0 ? (
          /* Scenario B — Student has no active equipment listings */
          <div className="mt-6 p-6 sm:p-8 rounded-3xl bg-[#092620]/90 border border-emerald-800/80 text-center space-y-4 shadow-board">
            <div className="w-14 h-14 rounded-2xl bg-[#0d382f] border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-300 shadow-sm">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display font-black text-white text-lg sm:text-xl tracking-tight">
                No gear listed yet
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-sm mx-auto leading-relaxed">
                Have the equipment this student needs? List it on LENDR first, then come back and make your offer.
              </p>
            </div>
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={onOpenListGear}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#d96543] hover:bg-[#c85635] text-white font-bold text-xs sm:text-sm transition-all shadow-md hover:shadow-xl cursor-pointer flex items-center justify-center gap-2 btn-magnetic"
              >
                <span>+ List Your Gear</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 rounded-full bg-[#14594b] hover:bg-[#0c382f] text-emerald-200 hover:text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer border border-emerald-800"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Scenario A — Student has active equipment listings */
          <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block font-mono text-emerald-200 uppercase">
                  SELECT FROM YOUR ACTIVE LISTINGS *
                </label>
                {onOpenListGear && (
                  <button
                    type="button"
                    onClick={onOpenListGear}
                    className="text-[11px] font-mono text-emerald-300 hover:text-white underline cursor-pointer"
                  >
                    + List another item
                  </button>
                )}
              </div>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {myListings.map((item) => {
                  const isSelected = selectedEquipmentId === item.id;
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#14594b] border-emerald-400 text-white shadow-md ring-1 ring-emerald-400/50'
                          : 'bg-[#0d382f]/60 border-emerald-800/60 hover:bg-[#0d382f] text-emerald-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="equipmentListing"
                        value={item.id}
                        checked={isSelected}
                        onChange={() => setSelectedEquipmentId(item.id)}
                        className="text-[#d96543] focus:ring-0 cursor-pointer accent-[#d96543]"
                      />
                      {item.imageUrls && item.imageUrls[0] ? (
                        <img
                          src={item.imageUrls[0]}
                          alt={item.title}
                          className="w-12 h-12 rounded-xl object-cover bg-emerald-950 shrink-0 border border-emerald-700/50"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0 text-xs font-mono font-bold">
                          GEAR
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{item.title}</div>
                        <div className="text-[11px] text-emerald-300 font-mono flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-white">₹{item.dailyRentalPrice}/day</span>
                          <span className="text-emerald-500">•</span>
                          <span className="truncate">{item.pickupLocation}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-mono text-emerald-200 mb-1">
                MESSAGE TO STUDENT (OPTIONAL)
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Mention included accessories, condition, or flexible handover timing..."
                className="w-full bg-[#0d382f] border border-emerald-700/60 rounded-xl px-3.5 py-2 text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400 resize-none"
              />
            </div>

            {isSuccess && (
              <div className="p-3 bg-emerald-950/90 border border-emerald-500/80 rounded-xl text-xs text-emerald-200 flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-400 text-[#092620] flex items-center justify-center font-bold text-xs shrink-0">✓</span>
                <span className="font-semibold text-white">Offer sent successfully! Closing...</span>
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#14594b]/60">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isSuccess}
                className="px-4 py-2 rounded-xl bg-transparent hover:bg-[#14594b] text-emerald-300 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isSuccess || !selectedEquipmentId}
                className="px-6 py-2.5 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Sending Offer...</span>
                  </>
                ) : (
                  <span>Send Gear Offer</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
