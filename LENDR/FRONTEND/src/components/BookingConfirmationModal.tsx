import React, { useState } from 'react';
import { GearItem, BookingRequest } from '../types/gear';
import { useAuth } from '../context/AuthContext';

interface BookingConfirmationModalProps {
  item: GearItem;
  bookingDetails: {
    durationDays: number;
    startDate: string;
    endDate: string;
    pickupDate: string;
    pickupTime: string;
    returnDate: string;
    returnTime: string;
    landmark: string;
    purpose: string;
    baseAmount: number;
    securityDeposit: number;
    totalAmount: number;
  };
  onClose: () => void;
  onConfirmBooking: (newBooking: BookingRequest) => Promise<void>;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  item,
  bookingDetails,
  onClose,
  onConfirmBooking,
}) => {
  const { user } = useAuth();
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    const booking: BookingRequest = {
      id: '',
      gearId: item.id,
      startDate: bookingDetails.startDate,
      endDate: bookingDetails.endDate,
      gearTitle: item.title,
      gearImage: item.image,
      lenderName: item.owner.name,
      lenderBlock: item.owner.block,
      pickupDate: bookingDetails.pickupDate,
      pickupTime: bookingDetails.pickupTime,
      returnDate: bookingDetails.returnDate,
      returnTime: bookingDetails.returnTime,
      durationDays: bookingDetails.durationDays,
      landmark: bookingDetails.landmark,
      purpose: bookingDetails.purpose,
      baseAmount: bookingDetails.baseAmount,
      securityDeposit: bookingDetails.securityDeposit,
      totalAmount: bookingDetails.totalAmount,
      status: 'pending',
      qrCodeId: '',
      createdAt: '',
    };

    try {
      await onConfirmBooking(booking);
      setIsSuccess(true);
      setTimeout(onClose, 1200);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Booking request failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto modal-backdrop-enter">
      <div className="bg-[#fbf9f5] border-2 border-[#114b3f] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8 modal-card-enter">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {isSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-[#114b3f] rounded-full flex items-center justify-center mx-auto animate-bounce">
              <svg className="w-8 h-8 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display text-2xl font-black text-[#114b3f]">Request Submitted</h3>
            <p className="text-sm text-[#697a73]">
              Your request is pending approval from <strong>{item.owner.name}</strong>.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs font-mono text-emerald-900">
              Once approved by the owner, you can complete the mock payment simulation in My Bookings to confirm your rental.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="border-b border-stone-200 pb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e8f3ef] text-[#114b3f] text-[10px] font-mono font-bold uppercase mb-2">
                <span>●</span> VIT Student Account
              </div>
              <h3 className="font-display text-xl font-bold text-[#114b3f]">Review Booking Request</h3>
              <p className="text-xs text-[#697a73] mt-1">Review the rental dates and deposit before submitting a request.</p>
            </div>

            {/* Gear Summary Card */}
            <div className="bg-white border border-[#e7e2d7] rounded-2xl p-4 flex items-center gap-4">
              <img
                src={item.image}
                alt={item.title}
                className="w-16 h-16 rounded-xl object-cover bg-stone-100 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-[#d96543] font-bold block">{item.categoryLabel}</span>
                <h4 className="font-bold text-sm text-[#1c2421] truncate">{item.title}</h4>
                <p className="text-xs text-[#697a73]">
                  Lender: {item.owner.name} ({item.owner.block})
                </p>
              </div>
              <div className="text-right">
                <span className="font-display font-bold text-base text-[#114b3f]">
                  ₹{bookingDetails.totalAmount}
                </span>
                <span className="text-[10px] text-[#697a73] block">{bookingDetails.durationDays} Days</span>
              </div>
            </div>

            {/* Handover Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-stone-100/70 p-3 rounded-2xl">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#697a73] block">Pickup Spot</span>
                <span className="font-semibold text-[#1c2421] line-clamp-1">{bookingDetails.landmark}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#697a73] block">Rental Dates</span>
                <span className="font-semibold text-[#1c2421]">
                  {bookingDetails.pickupDate} – {bookingDetails.returnDate}
                </span>
              </div>
            </div>

            {/* Student ID Details */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
                  VIT Registration Number
                </label>
                <input
                  type="text"
                  value={user?.registrationNumber ?? ''}
                  readOnly
                  className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold uppercase text-stone-900 focus:outline-none focus:border-[#114b3f]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
                  Contact Mobile (for Handoff WhatsApp / SMS)
                </label>
                <input
                  type="text"
                  value={user?.phone ?? ''}
                  readOnly
                  className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#114b3f]"
                />
              </div>
            </div>

            {/* Agreement */}
            <label className="flex items-start gap-2.5 text-xs text-[#697a73] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded text-[#114b3f] focus:ring-[#114b3f] accent-[#114b3f]"
              />
              <span>
                I agree to verify physical student ID at handover and follow the 30-second condition inspection. Covered by Campus SafeGuard Mutual Pool.
              </span>
            </label>

            {submitError && (
              <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {submitError}
              </div>
            )}

            {/* Submit CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !agreedToTerms}
                className="w-full bg-[#114b3f] hover:bg-[#0c382f] disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Submitting request...</span>
                ) : (
                  <>
                    <span>Submit Booking Request · Est. ₹{bookingDetails.totalAmount}</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
