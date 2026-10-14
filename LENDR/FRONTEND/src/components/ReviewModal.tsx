import React, { useState, useEffect } from 'react';
import type { BookingRequest } from '../types/gear';
import {
  reviewsApi,
  type ApiBookingReviewSummary,
  type ApiUser,
} from '../services/api';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingRequest;
  currentUser: ApiUser | null;
  onSuccess?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor — Significant issues encountered',
  2: 'Fair — Acceptable but room for improvement',
  3: 'Good — Met standard campus expectations',
  4: 'Very Good — Smooth and well-maintained',
  5: 'Excellent — Flawless handover and pristine condition',
};

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  booking,
  currentUser,
  onSuccess,
}) => {
  const [summary, setSummary] = useState<ApiBookingReviewSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isOwner = Boolean(
    currentUser && booking.ownerUserId && booking.ownerUserId === currentUser.id,
  );

  const fetchSummary = React.useCallback(async () => {
    setIsLoadingSummary(true);
    setErrorMessage(null);
    try {
      const data = await reviewsApi.getForBooking(booking.id);
      setSummary(data);
    } catch (err: unknown) {
      // If error fetching, fallback gracefully
      const msg = err instanceof Error ? err.message : 'Unable to load review details.';
      setErrorMessage(msg);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [booking.id]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setRating(5);
      setComment('');
      fetchSummary();
    }
  }, [isOpen, fetchSummary]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setErrorMessage('Please select a star rating between 1 and 5.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await reviewsApi.createForBooking(booking.id, {
        rating,
        comment: comment.trim() || undefined,
      });
      setSuccessMessage('Your review has been submitted successfully!');
      await fetchSummary();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit review.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveRating = hoverRating || rating;
  const isRenterPerspective = summary ? summary.myRole === 'renter' : !isOwner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs modal-backdrop-enter">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-[#114b3f] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-[#0d382f] to-[#114b3f] text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-300">
                CAMPUS TRUST &amp; REPUTATION
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/80 text-[10px] font-mono text-emerald-200 border border-emerald-500/30">
                {isRenterPerspective ? 'RENTER → OWNER' : 'OWNER → RENTER'}
              </span>
            </div>
            <h3 className="font-display text-xl font-black mt-1">
              {isRenterPerspective ? 'Rate Owner & Equipment' : 'Rate Renter & Gear Care'}
            </h3>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              {booking.gearTitle} • {booking.startDate} to {booking.endDate}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Double-Blind Trust Notice */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3">
            <span className="text-lg">🔒</span>
            <div className="text-xs text-amber-900">
              <strong className="block font-semibold">Fair Double-Blind Reviews</strong>
              Reviews remain private until both parties submit their feedback or 7 days pass.
              Neither student can see the other's rating beforehand, preventing bias or retaliation.
            </div>
          </div>

          {isLoadingSummary ? (
            <div className="text-center py-8 text-xs text-stone-500 font-mono">
              Loading review status...
            </div>
          ) : (
            <>
              {/* Partner Review Status Card */}
              {summary?.partnerReview && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-700">
                      Partner Review ({isRenterPerspective ? 'Equipment Owner' : 'Student Renter'})
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                        summary.partnerReview.isRevealed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {summary.partnerReview.isRevealed ? 'Revealed' : 'Submitted (Concealed)'}
                    </span>
                  </div>

                  {summary.partnerReview.isRevealed ? (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center gap-1 text-amber-500 text-sm">
                        {'★'.repeat(summary.partnerReview.rating || 0)}
                        {'☆'.repeat(5 - (summary.partnerReview.rating || 0))}
                        <span className="text-xs font-bold text-stone-800 ml-1">
                          {summary.partnerReview.rating}/5
                        </span>
                      </div>
                      {summary.partnerReview.comment && (
                        <p className="text-xs text-stone-700 italic bg-white p-2.5 rounded-xl border border-stone-100">
                          "{summary.partnerReview.comment}"
                        </p>
                      )}
                      <p className="text-[10px] text-stone-400">
                        Submitted by {summary.partnerReview.reviewerName || 'Partner'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-600">
                      Partner submitted their review. It will unlock and be published once your review is submitted!
                    </p>
                  )}
                </div>
              )}

              {/* Already Submitted View */}
              {summary?.myReview ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">Your Submitted Review</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                        summary.myReview.isRevealed
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {summary.myReview.isRevealed ? 'Revealed & Published' : 'Pending Partner Reveal'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-amber-500 text-lg">
                    {'★'.repeat(summary.myReview.rating || 0)}
                    {'☆'.repeat(5 - (summary.myReview.rating || 0))}
                    <span className="text-sm font-bold text-stone-800 ml-1">
                      {summary.myReview.rating} of 5 Stars
                    </span>
                  </div>

                  {summary.myReview.comment ? (
                    <p className="text-xs text-stone-800 bg-white/80 p-3 rounded-xl border border-emerald-100">
                      "{summary.myReview.comment}"
                    </p>
                  ) : (
                    <p className="text-xs text-stone-500 italic">No written comment provided.</p>
                  )}

                  {!summary.myReview.isRevealed && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-100/60 p-2.5 rounded-xl">
                      ⏳ Your review is recorded. As soon as your partner submits theirs (or when the 7-day reveal window closes), both reviews will appear on each other's campus profile.
                    </div>
                  )}
                </div>
              ) : (
                /* Submit Review Form */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                      {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
                      {successMessage}
                    </div>
                  )}

                  {/* Star Rating Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-800 block">
                      {isRenterPerspective
                        ? 'How would you rate the equipment condition & owner handover?'
                        : 'How would you rate the renter’s gear care & timeliness?'}
                    </label>

                    <div className="flex items-center gap-2 pt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          className="text-3xl transition-transform hover:scale-125 cursor-pointer focus:outline-hidden"
                          aria-label={`${star} star`}
                        >
                          <span
                            className={
                              star <= effectiveRating
                                ? 'text-amber-400 drop-shadow-xs'
                                : 'text-stone-300'
                            }
                          >
                            ★
                          </span>
                        </button>
                      ))}
                      <span className="ml-2 font-display font-bold text-sm text-[#114b3f]">
                        {rating} / 5
                      </span>
                    </div>

                    <div className="text-[11px] text-[#697a73] font-medium h-4">
                      {RATING_LABELS[effectiveRating] || ''}
                    </div>
                  </div>

                  {/* Optional Comment */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-800">
                        Feedback &amp; Recommendations <span className="text-stone-400 font-normal">(Optional)</span>
                      </label>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {comment.length}/1000
                      </span>
                    </div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                      rows={3}
                      placeholder={
                        isRenterPerspective
                          ? 'Share details about gear condition, lenses, cleanliness, and communication...'
                          : 'Share details about how responsibly the renter treated your gear and return punctuality...'
                      }
                      className="w-full text-xs p-3 rounded-2xl border border-stone-300 focus:border-[#114b3f] focus:ring-1 focus:ring-[#114b3f] outline-hidden resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold cursor-pointer transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#114b3f] hover:bg-[#0c382f] text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 text-center"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
