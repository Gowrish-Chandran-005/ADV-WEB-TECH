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
}

export const OfferGearModal: React.FC<OfferGearModalProps> = ({
  isOpen,
  onClose,
  request,
  onSuccess,
}) => {
  const [myListings, setMyListings] = useState<ApiEquipmentListing[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setMessage('');
      setSelectedEquipmentId('');
      equipmentApi
        .myListings({ status: 'ACTIVE', pageSize: 50 })
        .then((res) => {
          setMyListings(res.items);
          if (res.items.length > 0) {
            setSelectedEquipmentId(res.items[0].id);
          }
        })
        .catch(() => {
          setError('Could not retrieve your gear listings. Please try again.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (request.userId) {
      // Safety check if user attempts self-offer
    }
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
      onSuccess();
      onClose();
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
          <div className="mt-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-xs font-mono text-emerald-300">
            Loading your active listings...
          </div>
        ) : myListings.length === 0 ? (
          <div className="mt-6 p-6 rounded-2xl bg-[#0d382f]/80 border border-emerald-700/50 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-900/50 flex items-center justify-center mx-auto text-emerald-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="font-bold text-white text-sm">No Active Equipment Listings Found</div>
            <p className="text-xs text-emerald-200/80 max-w-sm mx-auto">
              To offer gear to fellow students on LENDR, you need at least one active listing published in your locker.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#14594b] hover:bg-emerald-700 text-xs text-white font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
            <div>
              <label className="block font-mono text-emerald-200 mb-2">
                SELECT FROM YOUR ACTIVE LISTINGS *
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {myListings.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedEquipmentId === item.id
                        ? 'bg-[#14594b] border-emerald-400 text-white shadow-sm'
                        : 'bg-[#0d382f]/60 border-emerald-800/60 hover:bg-[#0d382f] text-emerald-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="equipmentListing"
                      value={item.id}
                      checked={selectedEquipmentId === item.id}
                      onChange={() => setSelectedEquipmentId(item.id)}
                      className="text-[#d96543] focus:ring-0 cursor-pointer"
                    />
                    {item.imageUrls[0] && (
                      <img
                        src={item.imageUrls[0]}
                        alt={item.title}
                        className="w-10 h-10 rounded-lg object-cover bg-emerald-950 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{item.title}</div>
                      <div className="text-[11px] text-emerald-300 font-mono">
                        ₹{item.dailyRentalPrice}/day • {item.pickupLocation}
                      </div>
                    </div>
                  </label>
                ))}
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
                placeholder="Mention included batteries, condition, or flexible handover timing..."
                className="w-full bg-[#0d382f] border border-emerald-700/60 rounded-xl px-3.5 py-2 text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400 resize-none"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#14594b]/60">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-transparent hover:bg-[#14594b] text-emerald-300 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedEquipmentId}
                className="px-6 py-2.5 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Sending Offer...' : 'Send Gear Offer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
