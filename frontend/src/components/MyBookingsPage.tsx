import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  cancelBooking,
  getMyBookings,
  type BookingStatus,
} from '../services/bookingService';
import { getEquipmentById, getEquipmentImages, type EquipmentRecord } from '../services/equipmentService';
import type { BookingRecord } from '../types';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const statusOptions: Array<'All' | BookingStatus> = ['All', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'];

export function MyBookingsPage({ onNavigateToBrowse }: { onNavigateToBrowse: () => void }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [equipmentById, setEquipmentById] = useState<Record<string, EquipmentRecord>>({});
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [equipmentImagesById, setEquipmentImagesById] = useState<Record<string, string[]>>({});
  const [statusFilter, setStatusFilter] = useState<'All' | BookingStatus>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = async () => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const rows = await getMyBookings();
      setBookings(rows);

      const nextEquipmentMap: Record<string, EquipmentRecord> = {};
      const nextImageMap: Record<string, string[]> = {};

      for (const booking of rows) {
        const equipment = await getEquipmentById(booking.equipment_id);
        if (equipment) {
          nextEquipmentMap[booking.equipment_id] = equipment;

          const images = await getEquipmentImages(booking.equipment_id);
          nextImageMap[booking.equipment_id] = images.map((image) => image.image_url);
        }
      }

      setEquipmentById(nextEquipmentMap);
      setEquipmentImagesById(nextImageMap);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, [user]);

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'All') {
      return bookings;
    }

    return bookings.filter((booking) => booking.status === statusFilter);
  }, [bookings, statusFilter]);

  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId) ?? null;
  const selectedEquipment = selectedBooking ? equipmentById[selectedBooking.equipment_id] ?? null : null;

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const confirmed = window.confirm('Cancel this booking request?');
      if (!confirmed) {
        return;
      }

      await cancelBooking(bookingId);
      setSelectedBookingId(null);
      await loadBookings();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Unable to cancel this booking.');
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-[28px] border border-dashed border-[#bfc8c6] bg-[#f7f3eb] p-8 text-[#404947]">
          Please sign in to access your bookings.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 rounded-[28px] border border-[#dfe3df] bg-[#fffaf3] p-6 shadow-[0_12px_28px_rgba(12,32,28,0.03)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Renting activity</p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#094d48]">My bookings</h2>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {statusOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatusFilter(option)}
            className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              statusFilter === option ? 'bg-[#094d48] text-white' : 'border border-[#dfe3df] bg-white text-[#404947]'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {error && <div className="mb-6 rounded-[22px] border border-[#f0d0c5] bg-[#fff2ee] p-4 text-sm text-[#994531]">{error}</div>}

      {loading ? (
        <div className="rounded-[28px] border border-dashed border-[#bfc8c6] bg-[#f7f3eb] p-8 text-[#404947]">Loading bookings...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#bfc8c6] bg-[#f7f3eb] p-8 text-center text-[#404947]">
          No matching bookings yet.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredBookings.map((booking) => {
            const equipment = equipmentById[booking.equipment_id];
            const equipmentImage = equipmentImagesById[booking.equipment_id]?.[0] ?? '';
            const statusColor =
              booking.status === 'PENDING'
                ? 'bg-[#fef3c7] text-[#92400e]'
                : booking.status === 'APPROVED'
                  ? 'bg-[#dcfce7] text-[#166534]'
                  : booking.status === 'REJECTED'
                    ? 'bg-[#fee2e2] text-[#991b1b]'
                    : booking.status === 'CANCELLED'
                      ? 'bg-[#e5e7eb] text-[#374151]'
                      : 'bg-[#dbeafe] text-[#1d4ed8]';

            return (
              <article key={booking.id} className="overflow-hidden rounded-[28px] border border-[#dfe3df] bg-white shadow-[0_12px_30px_rgba(12,32,28,0.04)]">
                <div className="h-40 bg-[#edf2f0]">
                  {equipmentImage ? (
                    <img src={equipmentImage} alt={equipment?.name ?? 'Equipment'} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#6b7773]">No image</div>
                  )}
                </div>

                <div className="p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#edf9f7] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#094d48]">
                      {equipment?.name ?? 'Equipment'}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusColor}`}>{booking.status}</span>
                  </div>

                  <p className="text-sm text-[#404947]">
                    {new Date(booking.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} -{' '}
                    {new Date(booking.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="mt-2 text-sm text-[#404947]">Duration: {booking.total_days} days</p>
                  <p className="mt-1 text-sm text-[#404947]">Rental: {money.format(booking.total_amount)}</p>

                  <button
                    type="button"
                    onClick={() => setSelectedBookingId(booking.id)}
                    className="mt-4 w-full rounded-full border border-[#dfe3df] bg-[#f9faf8] px-4 py-2 text-sm font-medium text-[#094d48]"
                  >
                    View details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedBooking && selectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#122927]/55 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(12,32,28,0.16)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Booking details</p>
                <h3 className="text-2xl font-bold text-[#094d48]">{selectedEquipment.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedBookingId(null)} className="text-sm font-medium text-[#404947]">
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] bg-[#f7f3eb] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Booking ID</p>
                <p className="mt-2 font-semibold text-[#1c1c17]">{selectedBooking.id}</p>
              </div>
              <div className="rounded-[22px] bg-[#f7f3eb] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Status</p>
                <p className="mt-2 font-semibold text-[#1c1c17]">{selectedBooking.status}</p>
              </div>
              <div className="rounded-[22px] bg-[#f7f3eb] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Dates</p>
                <p className="mt-2 font-semibold text-[#1c1c17]">
                  {new Date(selectedBooking.start_date).toLocaleDateString('en-IN')} – {new Date(selectedBooking.end_date).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div className="rounded-[22px] bg-[#f7f3eb] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Duration</p>
                <p className="mt-2 font-semibold text-[#1c1c17]">{selectedBooking.total_days} days</p>
              </div>
              <div className="rounded-[22px] bg-[#f7f3eb] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Rental total</p>
                <p className="mt-2 font-semibold text-[#1c1c17]">{money.format(selectedBooking.total_amount)}</p>
              </div>
              <div className="rounded-[22px] bg-[#f7f3eb] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Security deposit</p>
                <p className="mt-2 font-semibold text-[#1c1c17]">{money.format(selectedBooking.security_deposit)}</p>
              </div>
            </div>

            {selectedBooking.renter_notes && (
              <div className="mt-4 rounded-[22px] border border-[#dfe3df] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Renter notes</p>
                <p className="mt-2 text-[#404947]">{selectedBooking.renter_notes}</p>
              </div>
            )}

            {selectedBooking.rejection_reason && (
              <div className="mt-4 rounded-[22px] border border-[#f0d0c5] bg-[#fff2ee] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#994531]">Rejection reason</p>
                <p className="mt-2 text-[#994531]">{selectedBooking.rejection_reason}</p>
              </div>
            )}

            {['PENDING', 'APPROVED'].includes(selectedBooking.status) && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleCancelBooking(selectedBooking.id)}
                  className="rounded-full border border-[#f0d0c5] px-4 py-2 text-sm font-medium text-[#994531]"
                >
                  Cancel Booking
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={onNavigateToBrowse} className="rounded-full bg-[#094d48] px-5 py-2.5 text-sm font-semibold text-white">
          Browse equipment
        </button>
      </div>
    </div>
  );
}
