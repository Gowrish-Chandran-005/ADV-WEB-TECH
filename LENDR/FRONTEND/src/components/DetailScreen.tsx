import React, { useState, useEffect, useMemo } from 'react';
import { GearItem } from '../types/gear';
import { addDays, todayIST } from '../services/adapters';
import { useFavorites } from '../context/FavoritesContext';
import {
  maintenanceApi,
  reviewsApi,
  type ApiMaintenanceBlock,
  type ApiEquipmentReviewsResponse,
  type ApiUser,
  ApiError,
} from '../services/api';

interface DetailScreenProps {
  item: GearItem;
  onBack: () => void;
  onRequestBooking: (bookingDetails: {
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
  }) => void;
  onOpenAuth?: () => void;
  currentUser?: ApiUser | null;
}

function formatCampusDate(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatBlockDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString.slice(0, 10);
  }
}

function formatReviewDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString.slice(0, 10);
  }
}

function StarRating({
  rating,
  max = 5,
  size = 'w-4 h-4',
}: {
  rating: number;
  max?: number;
  size?: string;
}) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const isFilled = rating >= i + 1;
        return (
          <svg
            key={i}
            className={`${size} shrink-0 ${isFilled ? 'text-amber-400' : 'text-stone-300'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      })}
    </div>
  );
}

function checkMaintenanceConflict(
  reqStartDate: string,
  reqEndDate: string,
  blocks: ApiMaintenanceBlock[],
): ApiMaintenanceBlock | null {
  const reqStartTs = new Date(`${reqStartDate}T00:00:00+05:30`).getTime();
  const nextEnd = addDays(reqEndDate, 1);
  const reqEndTs = new Date(`${nextEnd}T00:00:00+05:30`).getTime();

  for (const block of blocks) {
    const bStart = new Date(block.startAt).getTime();
    const bEnd = new Date(block.endAt).getTime();
    if (bStart < reqEndTs && bEnd > reqStartTs) {
      return block;
    }
  }
  return null;
}

export const DetailScreen: React.FC<DetailScreenProps> = ({
  item,
  onBack,
  onRequestBooking,
  onOpenAuth,
  currentUser,
}) => {
  const { isFavorited, isToggling, toggleFavorite, error: favoritesError, clearError } = useFavorites();
  const [selectedViewIndex, setSelectedViewIndex] = useState(0);
  const [durationDays, setDurationDays] = useState(2);
  const [bookingStartDate, setBookingStartDate] = useState(todayIST());
  const [purpose, setPurpose] = useState('Short Film / Video');

  // Maintenance state
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<ApiMaintenanceBlock[]>([]);
  const [isLoadingMaintenance, setIsLoadingMaintenance] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [maintenanceSuccess, setMaintenanceSuccess] = useState<string | null>(null);

  // Owner block form state
  const [blockStartDate, setBlockStartDate] = useState(todayIST());
  const [blockEndDate, setBlockEndDate] = useState(todayIST());
  const [blockReason, setBlockReason] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);

  const isOwner = Boolean(
    currentUser &&
    (item.ownerId
      ? currentUser.id === item.ownerId
      : item.owner && currentUser.fullName.toLowerCase() === item.owner.name.toLowerCase())
  );

  const isUuidItem = /^[0-9a-f-]{36}$/i.test(item.id);

  // Fetch existing maintenance blocks
  useEffect(() => {
    let isMounted = true;
    if (isUuidItem) {
      setIsLoadingMaintenance(true);
      maintenanceApi
        .list(item.id)
        .then((res) => {
          if (isMounted) {
            setMaintenanceBlocks(res.items || []);
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch maintenance blocks:', err);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingMaintenance(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [item.id, isUuidItem]);

  // Reviews state
  const [reviewsData, setReviewsData] = useState<ApiEquipmentReviewsResponse | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState<string | null>(null);

  // Fetch reviews for equipment
  useEffect(() => {
    let isMounted = true;
    if (isUuidItem) {
      setIsLoadingReviews(true);
      setReviewsError(null);
      reviewsApi
        .listForEquipment(item.id)
        .then((res) => {
          if (isMounted) {
            setReviewsData(res);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setReviewsError(err instanceof ApiError ? err.message : 'Failed to load reviews.');
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingReviews(false);
          }
        });
    } else {
      setIsLoadingReviews(false);
    }
    return () => {
      isMounted = false;
    };
  }, [item.id, isUuidItem]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewsData?.eligibleBookingId || isSubmittingReview) return;

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewSubmitError('Please select a rating between 1 and 5 stars.');
      return;
    }
    if (reviewComment.length > 1000) {
      setReviewSubmitError('Comment cannot exceed 1000 characters.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewSubmitError(null);
    setReviewSubmitSuccess(null);

    try {
      const res = await reviewsApi.createForEquipment(item.id, {
        bookingId: reviewsData.eligibleBookingId,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });

      setReviewsData((prev) => {
        if (!prev) return null;
        const newItems = [res.review, ...prev.items];
        const newCount = prev.reviewCount + 1;
        const totalScore = prev.items.reduce((acc, r) => acc + r.rating, 0) + res.review.rating;
        const newAvg = Math.round((totalScore / newCount) * 10) / 10;
        const newDist = { ...prev.ratingDistribution };
        if (res.review.rating in newDist) {
          newDist[res.review.rating as keyof typeof newDist]++;
        }
        return {
          items: newItems,
          averageRating: newAvg,
          reviewCount: newCount,
          ratingDistribution: newDist,
          eligibleBookingId: null,
        };
      });

      setReviewComment('');
      setReviewSubmitSuccess('Thank you! Your verified student review has been published.');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setReviewSubmitError('A review has already been submitted for this booking.');
        } else if (err.status === 422) {
          setReviewSubmitError('Reviews can only be submitted for completed rentals.');
        } else if (err.status === 403) {
          setReviewSubmitError('Only the renter of this completed booking can submit a review.');
        } else {
          setReviewSubmitError(err.message || 'Failed to submit review.');
        }
      } else {
        setReviewSubmitError('Network error while submitting review.');
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const photos = (item.images && item.images.length > 0) ? item.images : [item.image];
  const activeImage = photos[selectedViewIndex] ?? item.image;
  const condition = item.specs.find((spec) => spec.label.toLowerCase() === 'condition')?.value ?? 'Not provided';

  const baseRate = item.pricePerDay;
  const baseTotal = baseRate * durationDays;
  const securityDeposit = item.depositAmount;
  const totalPayable = baseTotal + securityDeposit;
  const startDate = bookingStartDate;
  const endDate = addDays(startDate, durationDays - 1);

  // Conflict detection
  const conflictingBlock = useMemo(() => {
    return checkMaintenanceConflict(startDate, endDate, maintenanceBlocks);
  }, [startDate, endDate, maintenanceBlocks]);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictingBlock) return;
    onRequestBooking({
      durationDays,
      startDate,
      endDate,
      pickupDate: formatCampusDate(startDate),
      pickupTime: '',
      returnDate: formatCampusDate(endDate),
      returnTime: '',
      landmark: item.location,
      purpose,
      baseAmount: baseTotal,
      securityDeposit,
      totalAmount: totalPayable,
    });
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || isSubmittingBlock) return;

    if (!blockStartDate || blockStartDate < todayIST()) {
      setMaintenanceError('Start date cannot be before today.');
      return;
    }
    if (!blockEndDate || blockEndDate < blockStartDate) {
      setMaintenanceError('End date must be on or after start date.');
      return;
    }
    if (!blockReason.trim()) {
      setMaintenanceError('Please provide a reason for the maintenance block.');
      return;
    }

    setIsSubmittingBlock(true);
    setMaintenanceError(null);
    setMaintenanceSuccess(null);

    try {
      const res = await maintenanceApi.create(item.id, {
        startDate: blockStartDate,
        endDate: blockEndDate,
        reason: blockReason.trim(),
      });
      setMaintenanceBlocks((prev) =>
        [...prev, res.maintenance].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        ),
      );
      setMaintenanceSuccess(
        `Maintenance block created: ${formatBlockDate(res.maintenance.startAt)} – ${formatBlockDate(res.maintenance.endAt)}.`,
      );
      setBlockReason('');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409 && err.code === 'BOOKING_CONFLICT') {
          setMaintenanceError('Cannot block dates: An active or pending booking already exists in this period.');
        } else if (err.status === 409 && err.code === 'MAINTENANCE_CONFLICT') {
          setMaintenanceError('Cannot block dates: These dates overlap an existing maintenance block.');
        } else if (err.status === 403) {
          setMaintenanceError('Unauthorized: You can only manage maintenance for equipment you own.');
        } else {
          setMaintenanceError(err.message || 'Failed to create maintenance block.');
        }
      } else {
        setMaintenanceError('Network error while creating maintenance block.');
      }
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!isOwner || deletingBlockId) return;
    setDeletingBlockId(blockId);
    setMaintenanceError(null);
    setMaintenanceSuccess(null);

    try {
      await maintenanceApi.delete(item.id, blockId);
      setMaintenanceBlocks((prev) => prev.filter((b) => b.id !== blockId));
      setMaintenanceSuccess('Maintenance block removed successfully.');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setMaintenanceError(err.message || 'Failed to remove maintenance block.');
      } else {
        setMaintenanceError('Network error while removing maintenance block.');
      }
    } finally {
      setDeletingBlockId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 screen-transition-enter">
      {/* Breadcrumb & Notice */}
      <section className="border-b border-[#e9decb] pb-4 bg-[#fbf9f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs sm:text-sm text-[#6c7772] font-medium">
            <button onClick={onBack} className="hover:text-[#0d382f] transition-colors cursor-pointer flex items-center gap-1 font-semibold">
              <span>← Back to Catalog</span>
            </button>
            <span className="text-[#cfc4b0]">/</span>
            <span className="hover:text-[#0d382f] cursor-pointer" onClick={onBack}>
              {item.categoryLabel}
            </span>
            <span className="text-[#cfc4b0]">/</span>
            <span className="text-[#0d382f] font-bold truncate max-w-[200px] sm:max-w-none">
              {item.title}
            </span>
          </nav>

          <div className="inline-flex items-center gap-2 bg-[#092620] text-emerald-200 border border-emerald-800 px-3.5 py-1 rounded-full text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              {item.isAvailableToday
                ? 'Listing active; zero cash deposit required for verified students.'
                : 'This listing is not currently active.'}
            </span>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LEFT COLUMN: Gear Showcase & Detailed Specs */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-10">
            {/* Header tags */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className={`px-3 py-1 text-xs font-mono font-bold rounded-lg uppercase tracking-wide transition-transform hover:scale-105 ${
                        index === 0
                          ? 'bg-[#d96543]/15 text-[#d96543] border border-[#d96543]/30'
                          : index === 1
                          ? 'bg-[#0d382f]/10 text-[#0d382f] border border-[#0d382f]/20'
                          : 'bg-[#ede4d4] text-[#635544] border border-[#d6c7b0]'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.id, onOpenAuth)}
                    disabled={isToggling(item.id)}
                    aria-label={isFavorited(item.id) ? `Remove ${item.title} from favorites` : `Save ${item.title} to favorites`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#114b3f] active:scale-95 motion-reduce:transform-none ${
                      isFavorited(item.id)
                        ? 'bg-[#d96543]/15 text-[#d96543] border-[#d96543]/40'
                        : 'bg-white text-stone-700 hover:text-[#d96543] border-[#d8cabb]'
                    } ${isToggling(item.id) ? 'opacity-60 cursor-wait' : ''}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-3.5 h-3.5 transition-transform motion-reduce:transform-none"
                      fill={isFavorited(item.id) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                    <span>{isFavorited(item.id) ? 'Saved' : 'Save'}</span>
                  </button>
                  <div className="text-xs font-mono text-[#6c7772]">
                    ITEM ID: <span className="font-bold text-[#0d382f]">{item.id}</span>
                  </div>
                </div>
              </div>

              <div>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-[#0d382f] tracking-tight leading-tight">
                  {item.title}
                </h1>
                <p className="text-base sm:text-lg text-[#55635e] mt-1 font-medium">{item.subtitle}</p>
                {reviewsData && reviewsData.reviewCount > 0 && (
                  <div className="flex items-center gap-2 mt-2.5">
                    <StarRating rating={reviewsData.averageRating} size="w-4 h-4" />
                    <span className="text-sm font-bold text-[#114b3f]">
                      {reviewsData.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-[#6c7772] font-mono">
                      ({reviewsData.reviewCount} {reviewsData.reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Showcase Card - Modern Luxury Retail Presentation with Stitch Green */}
            <div className="relative bg-[#f4ede2] border-2 border-[#ebdccd] rounded-3xl overflow-hidden p-6 sm:p-10 shadow-lg flex flex-col items-center justify-center group transition-all duration-500 hover:shadow-2xl">
              {/* Retro Corner Pin Indicator */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-[#092620] text-emerald-200 px-3.5 py-1.5 rounded-full border border-emerald-700/60 text-[11px] font-mono font-bold shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Condition: {condition}
              </div>

              {/* Bookmark style corner ribbon */}
              <div className="absolute -top-1 -right-1 w-14 h-14 overflow-hidden z-20 pointer-events-none">
                <div className="bg-[#d96543] text-white text-[10px] font-mono font-bold py-1 w-24 text-center transform rotate-45 translate-x-3 translate-y-3 shadow-md">
                  VIT CO-OP
                </div>
              </div>

              {/* Hardware Graphic Box with Luxury Elevation */}
              <div className="w-full max-w-lg aspect-[4/3] rounded-3xl bg-white border border-[#ded0bf] p-6 shadow-md flex flex-col items-center justify-center relative mt-6 sm:mt-0 transition-transform duration-500 group-hover:scale-[1.02]">
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 image-zoom-container">
                  {activeImage ? (
                    <img
                      src={activeImage}
                      alt={`${item.title} angle ${selectedViewIndex + 1}`}
                      className="max-h-52 object-contain rounded-2xl drop-shadow-md transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                  ) : (
                    <p className="text-sm text-[#6c7772]">No image provided for this listing.</p>
                  )}
                  {photos.length > 1 && (
                    <p className="text-[11px] font-mono text-[#0d382f] mt-3 font-semibold">
                      Photo {selectedViewIndex + 1} of {photos.length}
                    </p>
                  )}
                </div>
                <p className="text-xs text-[#6c7772] font-mono mt-4 font-medium">
                  {item.serialNumber ? `Serial: ${item.serialNumber}` : 'Verified Campus Equipment'}
                </p>
              </div>
            </div>

            {/* Thumbnail Selector Strip */}
            {photos.length > 1 && (
              <div className="flex flex-wrap gap-3">
                {photos.map((photoUrl, idx) => (
                  <button
                    key={`detail-photo-${idx}`}
                    type="button"
                    onClick={() => setSelectedViewIndex(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden p-1 transition-all cursor-pointer ${
                      selectedViewIndex === idx
                        ? 'border-2 border-[#114b3f] ring-2 ring-[#114b3f]/25 bg-white shadow-sm scale-105'
                        : 'border border-[#ebdccd] hover:border-[#114b3f] bg-white/80 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photoUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <span className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[9px] font-mono font-bold text-center rounded py-0.5 backdrop-blur-xs">
                      {idx === 0 ? 'COVER' : `#${idx + 1}`}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Key Specs Grid */}
            <div className="space-y-4 border-t border-[#ebdccd] pt-8">
              <h2 className="font-display text-xl font-bold text-[#114b3f] flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#114b3f] rounded-sm"></span>
                Technical Specs Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {item.specs.map((spec, idx) => (
                  <div key={idx} className="bg-white border border-[#ebdccd] rounded-2xl p-4">
                    <span className="text-[11px] font-mono text-[#6c7772] uppercase block mb-1">
                      {spec.label}
                    </span>
                    <span className="text-base font-bold text-[#114b3f] block">{spec.value}</span>
                    <span className="text-xs text-[#6c7772] block">{spec.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What's Included in This Handover Kit */}
            <div className="bg-[#f5efe4] border-2 border-[#e6d8c3] rounded-3xl p-6 sm:p-7">
              <h2 className="font-display text-lg font-bold text-[#114b3f] mb-4 flex items-center justify-between">
                <span>What's Included in This Handover Kit</span>
                <span className="text-xs font-mono font-normal text-[#df6947] uppercase">
                  {item.inclusions.length} items listed
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {item.inclusions.map((inclusion, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/80 p-3 rounded-xl border border-[#ded1be]">
                    <span className="w-5 h-5 rounded-full bg-[#114b3f] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </span>
                    <span className="font-medium text-[#1c2421]">{inclusion}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Peer Community Notice & Handover Rules */}
            <div className="bg-[#092620] text-white rounded-3xl p-6 sm:p-7 relative overflow-hidden border border-emerald-900/60 shadow-md">
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#d96543] text-white text-[11px] font-mono font-bold uppercase tracking-wider">
                    Campus Rule
                  </span>
                  <h3 className="font-bold text-base">Handover &amp; Community Safety Policy</h3>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">
                  VIT Physical Student ID Card inspection is strictly mandatory at handover. Both borrower and lender will review and log camera power-on status, LCD touchscreen integrity, and sensor cleanness using the LENDR 30-second checklist.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-emerald-200 font-mono">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Spot: SJT Food Court or TT Library Lawn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Return strictly prior to 8:00 PM on due date</span>
                  </div>
                </div>
              </div>
            </div>

            {/* About the Gear Owner */}
            <div className="border-t border-[#ebdccd] pt-8">
              <h2 className="font-display text-xl font-bold text-[#114b3f] mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#114b3f] rounded-sm"></span>
                About the Gear Owner
              </h2>
              <div className="bg-white border-2 border-[#ebdccd] rounded-3xl p-6 sm:p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#0e3f35] text-white flex items-center justify-center font-bold text-2xl font-mono shadow-md">
                      {item.owner.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-[#1c2421]">{item.owner.name}</h3>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md font-mono">
                          ✓ VIT VERIFIED
                        </span>
                      </div>
                      <p className="text-xs text-[#6c7772] font-mono mt-0.5">
                        {item.owner.department} • {item.owner.block}
                      </p>
                      <p className="text-xs text-[#df6947] font-semibold mt-1">
                        {item.owner.badge || 'Super Lender • 100% On-Time Returns Record'}
                      </p>
                    </div>
                  </div>
                  {/* Owner Fast Stats */}
                  <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-[#ebdccd] pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto">
                    <div>
                      <div className="text-xl font-black text-[#114b3f] flex items-center gap-1.5">
                        <span>{item.owner.rating}</span>
                        <svg className="w-4 h-4 text-amber-500 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <div className="text-[11px] font-mono text-[#6c7772]">
                        {item.owner.handoversCount} Handovers
                      </div>
                    </div>
                    <div>
                      <div className="text-xl font-black text-[#114b3f]">{item.owner.avgReplyTime}</div>
                      <div className="text-[11px] font-mono text-[#6c7772]">Avg. Reply Time</div>
                    </div>
                  </div>
                </div>

                {/* Recent Peer Review Quote */}
                {item.owner.review && (
                  <div className="mt-6 pt-5 border-t border-dashed border-[#e6dac7] bg-[#fbf9f5] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#1c2421]">{item.owner.review.author}</span>
                      <StarRating rating={item.owner.review.rating} size="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs text-[#6c7772] italic">{item.owner.review.text}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Owner Section: Manage Availability & Maintenance */}
            {isOwner && (
              <section
                aria-label="Manage Availability"
                className="bg-[#fbf9f5] border-2 border-[#114b3f] rounded-3xl p-6 sm:p-7 shadow-sm space-y-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6d8c3] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#114b3f] text-emerald-100 text-[10px] font-mono font-bold">
                        OWNER CONTROLS
                      </span>
                      <h2 className="font-display text-xl font-bold text-[#114b3f]">
                        Manage Availability &amp; Maintenance
                      </h2>
                    </div>
                    <p className="text-xs text-[#6c7772] mt-1">
                      Schedule maintenance periods or blackout dates when your equipment cannot be rented.
                    </p>
                  </div>
                </div>

                {/* Success Banner */}
                {maintenanceSuccess && (
                  <div
                    role="status"
                    className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center justify-between gap-2 shadow-xs"
                  >
                    <span>{maintenanceSuccess}</span>
                    <button
                      type="button"
                      onClick={() => setMaintenanceSuccess(null)}
                      className="text-emerald-800 hover:text-emerald-950 font-bold px-1.5 py-0.5 cursor-pointer"
                      aria-label="Dismiss success message"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Error Banner */}
                {maintenanceError && (
                  <div
                    role="alert"
                    className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-2 shadow-xs"
                  >
                    <span>{maintenanceError}</span>
                    <button
                      type="button"
                      onClick={() => setMaintenanceError(null)}
                      className="text-amber-800 hover:text-amber-950 font-bold px-1.5 py-0.5 cursor-pointer"
                      aria-label="Dismiss error message"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Existing Maintenance Blocks List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold text-[#0d382f] uppercase tracking-wider">
                      Active Maintenance Blocks ({maintenanceBlocks.length})
                    </h3>
                    {isLoadingMaintenance && (
                      <span className="text-[11px] font-mono text-[#6c7772]">Refreshing...</span>
                    )}
                  </div>

                  {maintenanceBlocks.length === 0 ? (
                    <div className="bg-white p-5 rounded-2xl border border-[#ded1be] text-center text-xs text-[#6c7772]">
                      No maintenance or blackout dates are currently scheduled.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {maintenanceBlocks.map((block) => (
                        <div
                          key={block.id}
                          className="bg-white p-4 rounded-2xl border border-[#ded1be] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold text-[10px]">
                                BLOCKED
                              </span>
                              <span className="text-xs font-bold text-[#1c2421]">
                                {formatBlockDate(block.startAt)} – {formatBlockDate(block.endAt)}
                              </span>
                            </div>
                            <p className="text-xs text-[#55635e] font-medium truncate">
                              Reason: {block.reason}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(block.id)}
                            disabled={deletingBlockId === block.id}
                            className="px-3.5 py-1.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shrink-0 disabled:opacity-50"
                            aria-label={`Remove maintenance block from ${formatBlockDate(block.startAt)} to ${formatBlockDate(block.endAt)}`}
                          >
                            {deletingBlockId === block.id ? 'Removing...' : 'Remove Block'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Maintenance Block Form */}
                <form onSubmit={handleCreateBlock} className="space-y-4 pt-4 border-t border-[#e6d8c3]">
                  <h3 className="text-xs font-mono font-bold text-[#0d382f] uppercase tracking-wider">
                    Add New Maintenance Period
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="owner-block-start" className="block text-[11px] font-semibold text-[#6c7772]">
                        Start Date
                      </label>
                      <input
                        id="owner-block-start"
                        type="date"
                        min={todayIST()}
                        value={blockStartDate}
                        onChange={(e) => {
                          setBlockStartDate(e.target.value);
                          if (blockEndDate < e.target.value) {
                            setBlockEndDate(e.target.value);
                          }
                        }}
                        required
                        className="w-full bg-white border border-[#d8cabb] rounded-xl px-3 py-2 text-xs font-semibold text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="owner-block-end" className="block text-[11px] font-semibold text-[#6c7772]">
                        End Date
                      </label>
                      <input
                        id="owner-block-end"
                        type="date"
                        min={blockStartDate || todayIST()}
                        value={blockEndDate}
                        onChange={(e) => setBlockEndDate(e.target.value)}
                        required
                        className="w-full bg-white border border-[#d8cabb] rounded-xl px-3 py-2 text-xs font-semibold text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="owner-block-reason" className="block text-[11px] font-semibold text-[#6c7772]">
                      Reason for Unavailability (Required)
                    </label>
                    <input
                      id="owner-block-reason"
                      type="text"
                      placeholder="e.g. Scheduled sensor cleaning, personal project use, lens calibration"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      maxLength={500}
                      required
                      className="w-full bg-white border border-[#d8cabb] rounded-xl px-3.5 py-2 text-xs font-medium text-[#1c2421] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#114b3f]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingBlock}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#114b3f] hover:bg-[#08241e] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>{isSubmittingBlock ? 'Blocking Dates...' : 'Block Equipment Dates'}</span>
                  </button>
                </form>
              </section>
            )}

            {/* Reviews & Ratings Section */}
            <section
              aria-label="Student Reviews & Ratings"
              className="border-t border-[#ebdccd] pt-8 space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#114b3f] rounded-sm"></span>
                  <h2 className="font-display text-xl font-bold text-[#114b3f]">
                    Verified Student Reviews
                  </h2>
                </div>
                {reviewsData && reviewsData.reviewCount > 0 && (
                  <span className="text-xs font-mono font-bold text-[#df6947] uppercase">
                    {reviewsData.reviewCount} {reviewsData.reviewCount === 1 ? 'Review' : 'Reviews'}
                  </span>
                )}
              </div>

              {/* Rating Summary Card */}
              <div className="bg-[#fbf9f5] border-2 border-[#ebdccd] rounded-3xl p-6 sm:p-7 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                  {/* Left: Big Score & Stars */}
                  <div className="sm:col-span-5 flex flex-col items-center sm:items-start text-center sm:text-left sm:border-r border-[#ebdccd] sm:pr-6">
                    <span className="text-5xl font-black font-display text-[#114b3f]">
                      {reviewsData && reviewsData.reviewCount > 0
                        ? reviewsData.averageRating.toFixed(1)
                        : '0.0'}
                    </span>
                    <div className="mt-2">
                      <StarRating
                        rating={reviewsData?.averageRating ?? 0}
                        size="w-5 h-5"
                      />
                    </div>
                    <span className="text-xs text-[#6c7772] font-mono mt-2">
                      {reviewsData?.reviewCount ?? 0} Verified VIT Student {reviewsData?.reviewCount === 1 ? 'Review' : 'Reviews'}
                    </span>
                  </div>

                  {/* Right: Distribution Bars */}
                  <div className="sm:col-span-7 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count =
                        reviewsData?.ratingDistribution[star as keyof typeof reviewsData.ratingDistribution] ?? 0;
                      const total = reviewsData?.reviewCount || 1;
                      const percentage =
                        reviewsData && reviewsData.reviewCount > 0
                          ? Math.round((count / total) * 100)
                          : 0;

                      return (
                        <div key={star} className="flex items-center gap-2.5 text-xs">
                          <span className="w-3 font-mono font-bold text-[#1c2421] text-right">
                            {star}
                          </span>
                          <svg className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#114b3f] rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-8 font-mono text-[11px] text-[#6c7772] text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Review Submission Success Alert */}
              {reviewSubmitSuccess && (
                <div
                  role="status"
                  className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center justify-between gap-2 shadow-xs"
                >
                  <span className="font-medium">{reviewSubmitSuccess}</span>
                  <button
                    type="button"
                    onClick={() => setReviewSubmitSuccess(null)}
                    className="text-emerald-800 hover:text-emerald-950 font-bold px-1.5 py-0.5 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Review Submission Form (Only rendered when user has an eligible completed booking) */}
              {reviewsData?.eligibleBookingId && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="bg-white border-2 border-[#114b3f] rounded-3xl p-6 sm:p-7 shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-2 border-b border-[#ebdccd] pb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#114b3f] text-emerald-100 text-[10px] font-mono font-bold">
                      VERIFIED RENTER
                    </span>
                    <h3 className="font-display text-base font-bold text-[#114b3f]">
                      Rate &amp; Review Your Rental Experience
                    </h3>
                  </div>

                  <p className="text-xs text-[#6c7772]">
                    You recently completed a rental for this equipment. Share your honest experience with fellow VIT students to help the campus community.
                  </p>

                  {reviewSubmitError && (
                    <div
                      role="alert"
                      className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2"
                    >
                      <span>{reviewSubmitError}</span>
                      <button
                        type="button"
                        onClick={() => setReviewSubmitError(null)}
                        className="text-amber-800 hover:text-amber-950 font-bold px-1.5 py-0.5 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Rating Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#1c2421]">
                      Your Rating (1 to 5 Stars)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setReviewHoverRating(star)}
                          onMouseLeave={() => setReviewHoverRating(null)}
                          className="p-1 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-[#114b3f] cursor-pointer transition-transform hover:scale-110 active:scale-95"
                          aria-label={`Select ${star} out of 5 stars`}
                        >
                          <svg
                            className={`w-7 h-7 ${
                              (reviewHoverRating ?? reviewRating) >= star
                                ? 'text-amber-400'
                                : 'text-stone-300'
                            }`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                      <span className="text-xs font-mono font-bold text-[#114b3f] ml-2">
                        {reviewHoverRating ?? reviewRating} / 5 Stars
                      </span>
                    </div>
                  </div>

                  {/* Comment Textarea */}
                  <div className="space-y-1.5">
                    <label htmlFor="review-comment" className="block text-xs font-semibold text-[#1c2421]">
                      Review Comments (Optional)
                    </label>
                    <textarea
                      id="review-comment"
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      maxLength={1000}
                      placeholder="Share condition at handover, ease of operation, or tips for the next student borrower..."
                      className="w-full bg-[#fbf9f5] border border-[#d8cabb] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#1c2421] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#114b3f]"
                    />
                    <div className="text-right text-[10px] font-mono text-[#6c7772]">
                      {reviewComment.length}/1000 characters
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-5 py-2.5 rounded-xl bg-[#114b3f] hover:bg-[#08241e] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>{isSubmittingReview ? 'Submitting Review...' : 'Submit Student Review'}</span>
                  </button>
                </form>
              )}

              {/* Reviews List */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold text-[#0d382f] uppercase tracking-wider">
                  All Reviews ({reviewsData?.reviewCount ?? 0})
                </h3>

                {isLoadingReviews ? (
                  <div className="bg-white p-6 rounded-2xl border border-[#ded1be] text-center text-xs text-[#6c7772]">
                    Loading verified reviews...
                  </div>
                ) : reviewsError ? (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center text-xs text-amber-800">
                    {reviewsError}
                  </div>
                ) : !reviewsData || reviewsData.items.length === 0 ? (
                  <div className="bg-white p-6 rounded-2xl border border-[#ded1be] text-center text-xs text-[#6c7772]">
                    No verified reviews submitted for this equipment listing yet. Rent this equipment to be the first to review!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviewsData.items.map((rev) => (
                      <div
                        key={rev.id}
                        className="bg-white p-5 rounded-2xl border border-[#ded1be] space-y-3 shadow-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#0e3f35] text-white flex items-center justify-center font-bold text-xs font-mono">
                              {rev.reviewerInitials}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#1c2421]">
                                  {rev.reviewerName}
                                </span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded font-mono">
                                  ✓ VERIFIED RENTER
                                </span>
                              </div>
                              <span className="text-[10px] text-[#6c7772] font-mono">
                                {formatReviewDate(rev.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <StarRating rating={rev.rating} size="w-4 h-4" />
                          </div>
                        </div>

                        {rev.comment && (
                          <p className="text-xs text-[#3d4a45] leading-relaxed pl-12">
                            {rev.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Sticky Booking Request Card */}
          <aside className="lg:col-span-5 xl:col-span-4 sticky top-24">
            <div className="bg-[#f7f2ea] border-2 border-[#114b3f] rounded-3xl p-6 sm:p-7 shadow-board relative">
              {/* Rate & Deposit Header */}
              <div className="flex items-center justify-between pb-5 border-b border-[#ded2c0]">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#d96543] font-bold">
                    Standard Student Rate
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-display text-3xl sm:text-4xl font-black text-[#0d382f]">
                      ₹{item.pricePerDay}
                    </span>
                    <span className="text-sm font-semibold text-[#6c7772]">/ day</span>
                  </div>
                  {reviewsData && reviewsData.reviewCount > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <StarRating rating={reviewsData.averageRating} size="w-3.5 h-3.5" />
                      <span className="text-xs font-bold text-[#114b3f]">
                        {reviewsData.averageRating.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-[#6c7772] font-mono">
                        ({reviewsData.reviewCount})
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="inline-block bg-[#092620] text-emerald-200 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase border border-emerald-700/50">
                    {item.depositAmount > 0
                      ? `Deposit ₹${item.depositAmount}`
                      : 'Zero Deposit'}
                  </span>
                  <p className="text-[10px] text-[#6c7772] font-mono mt-1">VIT student account required</p>
                </div>
              </div>

              {/* Booking Configuration Form */}
              <form onSubmit={handleBookingSubmit} className="space-y-5 mt-6">
                {/* 1. Rental Timeline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono font-bold text-[#0d382f] uppercase tracking-wider">
                      1. Rental Timeline
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDurationDays(1)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-all ${
                          durationDays === 1 ? 'bg-[#0d382f] text-white shadow-xs' : 'bg-white text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        1d
                      </button>
                      <button
                        type="button"
                        onClick={() => setDurationDays(2)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-all ${
                          durationDays === 2 ? 'bg-[#0d382f] text-white shadow-xs' : 'bg-white text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        2d (Wknd)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDurationDays(3)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-all ${
                          durationDays === 3 ? 'bg-[#0d382f] text-white shadow-xs' : 'bg-white text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        3d
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 bg-white p-3 rounded-2xl border border-[#d8cabb]">
                    <div className="space-y-1">
                      <label htmlFor="booking-start-date" className="text-[10px] font-mono uppercase text-[#6c7772] block font-semibold cursor-pointer">
                        Start Date
                      </label>
                      <input
                        id="booking-start-date"
                        type="date"
                        min={todayIST()}
                        value={startDate}
                        onChange={(e) => setBookingStartDate(e.target.value)}
                        className="text-xs font-bold text-[#1c2421] bg-transparent border-0 p-0 focus:outline-none focus:ring-0 cursor-pointer w-full"
                      />
                    </div>
                    <div className="space-y-1 border-l border-[#ebdccd] pl-3">
                      <span className="text-[10px] font-mono uppercase text-[#6c7772] block font-semibold">
                        Last Rental Day
                      </span>
                      <div className="text-xs font-bold text-[#1c2421]">
                        {formatCampusDate(endDate)}
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Conflict Warning Banner */}
                  {conflictingBlock && (
                    <div
                      role="alert"
                      className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1 shadow-xs"
                    >
                      <div className="font-bold flex items-center gap-1.5 text-red-900">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span>Dates Blocked for Maintenance</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-red-700">
                        This equipment is unavailable from {formatBlockDate(conflictingBlock.startAt)} to {formatBlockDate(conflictingBlock.endAt)}: "{conflictingBlock.reason}". Please select different dates.
                      </p>
                    </div>
                  )}

                  {!isOwner && maintenanceBlocks.length > 0 && !conflictingBlock && (
                    <div className="px-3 py-2 bg-stone-100/80 border border-stone-200 rounded-xl text-[11px] text-[#55635e] flex items-center gap-2">
                      <span className="font-bold text-[#0d382f]">Note:</span>
                      <span>This equipment has {maintenanceBlocks.length} scheduled maintenance window{maintenanceBlocks.length > 1 ? 's' : ''}.</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#eaf4ef] border border-[#c6e4d7] rounded-xl text-xs font-medium text-[#0d382f]">
                    <span>Selected Duration:</span>
                    <span className="font-bold font-mono">
                      {durationDays} Day{durationDays > 1 ? 's' : ''} {durationDays === 2 ? '(Weekend Special)' : ''}
                    </span>
                  </div>
                </div>

                {/* 2. Listing Pickup Location */}
                <div className="space-y-2">
                  <label htmlFor="handover-landmark" className="block text-xs font-mono font-bold text-[#0d382f] uppercase tracking-wider">
                    2. Pickup Location
                  </label>
                  <div className="relative">
                    <input
                      id="handover-landmark"
                      value={item.location}
                      readOnly
                      className="w-full bg-white border border-[#d8cabb] text-xs font-semibold rounded-xl py-3 px-3.5 text-[#1c2421]"
                    />
                  </div>
                </div>

                {/* 3. Purpose of Booking */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold text-[#0d382f] uppercase tracking-wider">
                    3. Purpose of Booking
                  </label>
                  <p className="text-[11px] text-[#6c7772]">Helps {item.owner.name.split(' ')[0]} review your request swiftly</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['Short Film / Video', 'Club Event', 'Personal Shoot', 'Academic Project'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPurpose(p)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                          purpose === p
                            ? 'border-2 border-[#0d382f] bg-[#0d382f] text-white shadow-xs'
                            : 'border border-[#d8cabb] bg-white hover:border-[#0d382f] text-[#1c2421]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Breakdown Box */}
                <div className="space-y-2 pt-4 border-t border-[#ded2c0] text-xs">
                  <div className="flex justify-between text-[#6c7772] font-medium">
                    <span>
                      Base Gear Rental ({durationDays} Day{durationDays > 1 ? 's' : ''} × ₹{baseRate})
                    </span>
                    <span className="font-mono text-[#1c2421]">₹{baseTotal}</span>
                  </div>
                  <div className="flex justify-between text-[#6c7772] font-medium">
                    <span>Security Deposit</span>
                    <span className="font-mono text-[#1c2421]">₹{securityDeposit}</span>
                  </div>
                  {/* Total */}
                  <div className="flex justify-between items-baseline pt-3 border-t border-[#ded2c0] text-[#0d382f] font-black">
                    <span className="text-sm uppercase tracking-wide">Estimated Total</span>
                    <span className="text-2xl font-mono">₹{totalPayable}</span>
                  </div>
                </div>

                {/* Favorites error notice */}
                {favoritesError && (
                  <div
                    role="alert"
                    className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 shadow-xs"
                  >
                    <span>{favoritesError}</span>
                    <button
                      type="button"
                      onClick={clearError}
                      className="text-amber-800 hover:text-amber-950 font-bold px-1.5 py-0.5 cursor-pointer"
                      aria-label="Dismiss error"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Booking CTA Button & Favorite Action Area */}
                <div className="pt-2 flex items-stretch gap-3">
                  <button
                    type="submit"
                    disabled={Boolean(conflictingBlock)}
                    className={`flex-1 font-bold py-4 px-6 rounded-2xl shadow-notice transition-all text-sm flex items-center justify-center gap-2 group ${
                      conflictingBlock
                        ? 'bg-stone-300 text-stone-500 cursor-not-allowed border border-stone-400/40'
                        : 'bg-[#0d382f] hover:bg-[#08241e] text-white active:translate-y-0.5 cursor-pointer btn-magnetic'
                    }`}
                  >
                    <span>{conflictingBlock ? 'Dates Blocked for Maintenance' : 'Request to Book (Zero Deposit)'}</span>
                    {!conflictingBlock && (
                      <span className="group-hover:translate-x-1.5 transition-transform duration-300">→</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.id, onOpenAuth)}
                    disabled={isToggling(item.id)}
                    aria-label={isFavorited(item.id) ? `Remove ${item.title} from favorites` : `Save ${item.title} to favorites`}
                    title={isFavorited(item.id) ? 'Remove from favorites' : 'Save to favorites'}
                    className={`px-4 py-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#114b3f] active:scale-95 motion-reduce:transform-none ${
                      isFavorited(item.id)
                        ? 'bg-[#d96543]/15 text-[#d96543] border-[#d96543]/40 hover:bg-[#d96543]/20'
                        : 'bg-white text-stone-600 hover:text-[#d96543] hover:border-[#d96543]/40 border-[#d8cabb]'
                    } ${isToggling(item.id) ? 'opacity-60 cursor-wait' : ''}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-5 h-5 transition-transform motion-reduce:transform-none"
                      fill={isFavorited(item.id) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </button>
                </div>

                {/* Guarantee Note */}
                <div className="bg-white/70 p-3 rounded-xl border border-[#e4d8c8] text-[11px] text-[#6c7772] text-center space-y-1">
                  <p className="font-semibold text-[#114b3f]">No real payment is processed by this demo.</p>
                  <p>
                    The server checks availability and calculates the final rental amount and deposit when you submit.
                  </p>
                </div>
              </form>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
