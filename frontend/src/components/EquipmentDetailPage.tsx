import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkBookingConflict, createBooking } from '../services/bookingService';
import {
  getCategories,
  getEquipmentById,
  getEquipmentImages,
  type EquipmentCategory,
  type EquipmentRecord,
} from '../services/equipmentService';

interface EquipmentDetailPageProps {
  equipmentId: string;
  onBack: () => void;
  onNavigateToMyBookings: () => void;
}

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function EquipmentDetailPage({ equipmentId, onBack, onNavigateToMyBookings }: EquipmentDetailPageProps) {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<EquipmentRecord | null>(null);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [renterNotes, setRenterNotes] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadEquipment = async () => {
      try {
        setLoading(true);
        setError(null);

        const [equipmentData, categoriesData] = await Promise.all([
          getEquipmentById(equipmentId),
          getCategories(),
        ]);

        if (!equipmentData) {
          setError('Equipment not found.');
          setEquipment(null);
          return;
        }

        const imageData = await getEquipmentImages(equipmentId);

        setEquipment(equipmentData);
        setCategories(categoriesData);
        setImages(imageData.map((image) => image.image_url));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load this equipment item.');
      } finally {
        setLoading(false);
      }
    };

    void loadEquipment();
  }, [equipmentId]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const computedDays = useMemo(() => {
    if (!startDate || !endDate) {
      return 0;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return 0;
    }

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  }, [startDate, endDate]);

  const rentalTotal = computedDays * (equipment?.price_per_day ?? 0);
  const securityDeposit = equipment?.security_deposit ?? 0;
  const estimatedTotal = rentalTotal + securityDeposit;

  const canBook =
    Boolean(user) &&
    Boolean(equipment) &&
    equipment?.is_published === true &&
    equipment?.status?.toLowerCase() === 'available' &&
    equipment?.owner_id !== user?.id;

  const validateDates = () => {
    if (!startDate || !endDate) {
      return 'Both start and end dates are required.';
    }

    if (startDate < today) {
      return 'Start date cannot be before today.';
    }

    if (endDate < startDate) {
      return 'End date cannot be before the start date.';
    }

    if (!equipment) {
      return 'Equipment information is not available.';
    }

    if (!user) {
      return 'Please sign in to request this equipment.';
    }

    if (equipment.owner_id === user.id) {
      return 'You cannot book your own equipment.';
    }

    if (!equipment.is_published || equipment.status?.toLowerCase() !== 'available') {
      return 'This equipment is not available for booking right now.';
    }

    return null;
  };

  const handleRequestBooking = async () => {
    const validationMessage = validateDates();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const conflict = await checkBookingConflict(equipment!.id, startDate, endDate);
    if (conflict) {
      setError('This equipment is already booked for the selected dates. Please choose different dates.');
      return;
    }

    setError(null);
    setIsConfirming(true);
  };

  const confirmBookingRequest = async () => {
    if (!equipment || !user) {
      setError('Please sign in to request this equipment.');
      return;
    }

    const validationMessage = validateDates();
    if (validationMessage) {
      setError(validationMessage);
      setIsConfirming(false);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createBooking(equipment.id, startDate, endDate, renterNotes || undefined);
      setSuccessMessage('Booking request sent.');
      setIsConfirming(false);
      setStartDate('');
      setEndDate('');
      setRenterNotes('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create the booking request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl rounded-[28px] border border-[#dfe3df] bg-white p-8 text-[#404947]">Loading equipment details...</div>;
  }

  if (error || !equipment) {
    return (
      <div className="mx-auto max-w-4xl rounded-[28px] border border-[#f0d0c5] bg-[#fff2ee] p-8 text-[#994531]">
        {error || 'Equipment not found.'}
      </div>
    );
  }

  const categoryName = categories.find((category) => category.id === equipment.category_id)?.name ?? 'Uncategorized';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center rounded-full border border-[#dfe3df] bg-white px-4 py-2 text-sm font-medium text-[#094d48]"
      >
        ← Back to marketplace
      </button>

      <div className="overflow-hidden rounded-[32px] border border-[#dfe3df] bg-white shadow-[0_20px_45px_rgba(12,32,28,0.06)]">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-[#eef2f1] p-4">
            {images.length > 0 ? (
              <img src={images[0]} alt={equipment.name} className="h-[420px] w-full rounded-[24px] object-cover" />
            ) : (
              <div className="flex h-[420px] items-center justify-center rounded-[24px] bg-[#edf2f0] text-[#6b7773]">
                No photos available
              </div>
            )}

            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {images.slice(1, 4).map((image, index) => (
                  <img key={`${image}-${index}`} src={image} alt={`${equipment.name} view ${index + 2}`} className="h-28 w-full rounded-2xl object-cover" />
                ))}
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#edf9f7] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#094d48]">
                {categoryName}
              </span>
              <span className="text-sm text-[#404947]">{equipment.condition}</span>
            </div>

            <h2 className="text-3xl font-bold tracking-[-0.04em] text-[#101613]">{equipment.name}</h2>
            <p className="mt-2 text-[#404947]">
              {equipment.brand || 'Brand not provided'} · {equipment.model || 'Model not provided'}
            </p>

            <div className="mt-5 space-y-3 rounded-[24px] bg-[#f7f3eb] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[#6b7773]">Daily rate</span>
                <span className="text-2xl font-bold text-[#094d48]">{money.format(equipment.price_per_day ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b7773]">Security deposit</span>
                <span className="font-semibold text-[#1c1c17]">{money.format(equipment.security_deposit ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b7773]">Location</span>
                <span className="font-semibold text-[#1c1c17]">{equipment.location || 'Not specified'}</span>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-[#dfe3df] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Rent this equipment</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Start date</label>
                  <input
                    type="date"
                    min={today}
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-2xl border border-[#dfe3df] px-3 py-2.5 outline-none transition-colors focus:border-[#094d48]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">End date</label>
                  <input
                    type="date"
                    min={startDate || today}
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-2xl border border-[#dfe3df] px-3 py-2.5 outline-none transition-colors focus:border-[#094d48]"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Notes for owner</label>
                <textarea
                  rows={3}
                  value={renterNotes}
                  onChange={(event) => setRenterNotes(event.target.value)}
                  placeholder="Optional details for the owner"
                  className="w-full rounded-2xl border border-[#dfe3df] px-3 py-2.5 outline-none transition-colors focus:border-[#094d48]"
                />
              </div>

              {startDate && endDate && (
                <div className="mt-5 rounded-[20px] bg-[#f7f3eb] p-4">
                  <div className="flex items-center justify-between text-sm text-[#404947]">
                    <span>Rental duration</span>
                    <span>{computedDays} days</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-[#404947]">
                    <span>Price per day</span>
                    <span>{money.format(equipment.price_per_day ?? 0)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-[#404947]">
                    <span>Rental total</span>
                    <span>{money.format(rentalTotal)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-[#404947]">
                    <span>Security deposit</span>
                    <span>{money.format(securityDeposit)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[#dfe3df] pt-3 text-base font-semibold text-[#094d48]">
                    <span>Estimated total</span>
                    <span>{money.format(estimatedTotal)}</span>
                  </div>
                </div>
              )}

              {error && <div className="mt-4 rounded-2xl border border-[#f0d0c5] bg-[#fff2ee] p-3 text-sm text-[#994531]">{error}</div>}
              {successMessage && (
                <div className="mt-4 rounded-2xl border border-[#b5e3c4] bg-[#ecfdf5] p-3 text-sm text-[#166534]">{successMessage}</div>
              )}

              {!user && !successMessage && (
                <div className="mt-4 rounded-2xl border border-[#f0d0c5] bg-[#fff2ee] p-3 text-sm text-[#994531]">
                  Please sign in to request this equipment.
                </div>
              )}

              {user && canBook && !successMessage && (
                <button
                  type="button"
                  onClick={() => void handleRequestBooking()}
                  className="mt-6 w-full rounded-full bg-[#094d48] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(9,77,72,0.20)]"
                >
                  Request to rent
                </button>
              )}

              {successMessage && (
                <button
                  type="button"
                  onClick={onNavigateToMyBookings}
                  className="mt-6 w-full rounded-full bg-[#094d48] px-5 py-3 text-sm font-semibold text-white"
                >
                  View My Bookings
                </button>
              )}
            </div>

            <div className="mt-5 rounded-[20px] border border-[#dfe3df] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Description</p>
              <p className="mt-3 text-sm leading-7 text-[#404947]">{equipment.description || 'No description provided yet.'}</p>
            </div>
          </div>
        </div>
      </div>

      {isConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#122927]/55 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(12,32,28,0.16)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Confirm rental</p>
            <h3 className="mt-2 text-2xl font-bold text-[#094d48]">{equipment.name}</h3>
            <div className="mt-4 space-y-2 text-sm text-[#404947]">
              <div className="flex items-center justify-between"><span>Dates</span><span>{startDate} – {endDate}</span></div>
              <div className="flex items-center justify-between"><span>Duration</span><span>{computedDays} days</span></div>
              <div className="flex items-center justify-between"><span>Rental</span><span>{money.format(rentalTotal)}</span></div>
              <div className="flex items-center justify-between"><span>Security deposit</span><span>{money.format(securityDeposit)}</span></div>
              <div className="flex items-center justify-between font-semibold text-[#094d48]"><span>Estimated total</span><span>{money.format(estimatedTotal)}</span></div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsConfirming(false)} className="rounded-full border border-[#dfe3df] px-4 py-2 text-sm font-medium text-[#404947]">
                Cancel
              </button>
              <button type="button" onClick={() => void confirmBookingRequest()} disabled={isSubmitting} className="rounded-full bg-[#094d48] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
