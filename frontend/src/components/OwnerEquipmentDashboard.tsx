import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  approveBooking,
  completeBooking,
  getOwnerBookings,
  rejectBooking,
  type BookingStatus,
} from '../services/bookingService';
import {
  deleteEquipment,
  getCategories,
  getEquipmentById,
  getEquipmentImages,
  getOwnerEquipment,
  publishEquipment,
  type EquipmentCategory,
  type EquipmentRecord,
} from '../services/equipmentService';
import type { BookingRecord } from '../types';
import { EquipmentFormModal } from './EquipmentFormModal';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function OwnerEquipmentDashboard() {
  const { user, profile } = useAuth();
  const [equipment, setEquipment] = useState<EquipmentRecord[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [imagesByEquipment, setImagesByEquipment] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentRecord | null>(null);
  const [ownerBookings, setOwnerBookings] = useState<BookingRecord[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'All' | BookingStatus>('All');
  const [bookingEquipmentMap, setBookingEquipmentMap] = useState<Record<string, EquipmentRecord>>({});
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const canManageEquipment = Boolean(user && (profile?.role === 'OWNER' || profile?.role === 'ADMIN'));

  const loadOwnerEquipment = async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [equipmentResponse, categoriesResponse] = await Promise.all([
        getOwnerEquipment(user.id),
        getCategories(),
      ]);

      setEquipment(equipmentResponse);
      setCategories(categoriesResponse);

      const nextImages: Record<string, string[]> = {};
      for (const item of equipmentResponse) {
        const images = await getEquipmentImages(item.id);
        nextImages[item.id] = images.map((image) => image.image_url);
      }
      setImagesByEquipment(nextImages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your equipment.');
    } finally {
      setLoading(false);
    }
  };

  const loadOwnerBookings = async () => {
    if (!user) {
      return;
    }

    try {
      setBookingLoading(true);
      setBookingError(null);
      const rows = await getOwnerBookings();
      setOwnerBookings(rows);

      const nextEquipmentMap: Record<string, EquipmentRecord> = {};
      for (const booking of rows) {
        const equipmentItem = await getEquipmentById(booking.equipment_id);
        if (equipmentItem) {
          nextEquipmentMap[booking.equipment_id] = equipmentItem;
        }
      }
      setBookingEquipmentMap(nextEquipmentMap);
    } catch (loadError) {
      setBookingError(loadError instanceof Error ? loadError.message : 'Unable to load booking requests.');
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      void loadOwnerEquipment();
      void loadOwnerBookings();
    }
  }, [user]);

  const openCreateModal = () => {
    setSelectedEquipment(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: EquipmentRecord) => {
    setSelectedEquipment(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Delete this equipment listing?')) {
      return;
    }

    try {
      await deleteEquipment(itemId);
      await loadOwnerEquipment();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete equipment.');
    }
  };

  const handlePublishToggle = async (item: EquipmentRecord) => {
    try {
      await publishEquipment(item.id, !item.is_published);
      await loadOwnerEquipment();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update listing state.');
    }
  };

  const filteredOwnerBookings = useMemo(() => {
    if (bookingFilter === 'All') {
      return ownerBookings;
    }

    return ownerBookings.filter((booking) => booking.status === bookingFilter);
  }, [bookingFilter, ownerBookings]);

  const handleApprove = async (bookingId: string) => {
    const confirmed = window.confirm('Approve this booking request?');
    if (!confirmed) {
      return;
    }

    try {
      await approveBooking(bookingId);
      await loadOwnerBookings();
    } catch (approveError) {
      setBookingError(approveError instanceof Error ? approveError.message : 'Unable to approve this booking.');
    }
  };

  const handleReject = async (bookingId: string) => {
    const rejectionReason = window.prompt('Reason for rejection (optional)', '');
    try {
      await rejectBooking(bookingId, rejectionReason || undefined);
      await loadOwnerBookings();
    } catch (rejectError) {
      setBookingError(rejectError instanceof Error ? rejectError.message : 'Unable to reject this booking.');
    }
  };

  const handleComplete = async (bookingId: string) => {
    const confirmed = window.confirm('Mark this booking as completed?');
    if (!confirmed) {
      return;
    }

    try {
      await completeBooking(bookingId);
      await loadOwnerBookings();
    } catch (completeError) {
      setBookingError(completeError instanceof Error ? completeError.message : 'Unable to complete this booking.');
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl rounded-[28px] border border-[#dfe3df] bg-[#f9faf8] p-8 text-[#404947]">
        Sign in as an owner to manage your listings.
      </div>
    );
  }

  if (!canManageEquipment) {
    return (
      <div className="mx-auto max-w-4xl rounded-[28px] border border-[#f0d0c5] bg-[#fff2ee] p-8 text-[#994531]">
        Your account is not set up as an owner yet. Switch to the OWNER role or request access.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-[#dfe3df] bg-[#fffaf3] p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#6b7773]">Owner dashboard</p>
          <h2 className="mt-2 text-3xl font-bold text-[#094d48]">Manage your gear</h2>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-[#094d48] px-5 py-3 text-sm font-semibold text-white"
        >
          + Add equipment
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-[22px] border border-[#f0d0c5] bg-[#fff2ee] p-4 text-sm text-[#994531]">{error}</div>
      )}

      {loading ? (
        <div className="rounded-[28px] border border-dashed border-[#bfc8c6] bg-[#f7f3eb] p-8 text-[#404947]">
          Loading your equipment...
        </div>
      ) : equipment.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#bfc8c6] bg-[#f7f3eb] p-8 text-center text-[#404947]">
          You haven’t listed any gear yet. Add your first item to start renting.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {equipment.map((item) => {
            const categoryName = categories.find((category) => category.id === item.category_id)?.name ?? 'Uncategorized';
            const primaryImage = imagesByEquipment[item.id]?.[0] ?? '';

            return (
              <article key={item.id} className="overflow-hidden rounded-[28px] border border-[#dfe3df] bg-white shadow-[0_8px_30px_rgba(12,32,28,0.04)]">
                <div className="h-48 bg-[#edf2f0]">
                  {primaryImage ? (
                    <img src={primaryImage} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#6b7773]">No image yet</div>
                  )}
                </div>

                <div className="p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#edf9f7] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#094d48]">
                      {categoryName}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.is_published ? 'bg-[#ecfdf5] text-[#166534]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                      {item.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#1c1c17]">{item.name}</h3>
                  <p className="mt-2 text-sm text-[#404947]">{item.condition} · {item.location || 'No location set'}</p>
                  <p className="mt-3 text-[#404947]">{money.format(item.price_per_day ?? 0)} / day</p>

                  <div className="mt-5 flex gap-2">
                    <button type="button" onClick={() => openEditModal(item)} className="flex-1 rounded-full border border-[#dfe3df] px-3 py-2 text-sm font-medium text-[#094d48]">
                      Edit
                    </button>
                    <button type="button" onClick={() => handlePublishToggle(item)} className="flex-1 rounded-full bg-[#094d48] px-3 py-2 text-sm font-medium text-white">
                      {item.is_published ? 'Hide' : 'Publish'}
                    </button>
                    <button type="button" onClick={() => handleDelete(item.id)} className="rounded-full border border-[#f0d0c5] px-3 py-2 text-sm font-medium text-[#994531]">
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-10 rounded-[28px] border border-[#dfe3df] bg-white p-6 shadow-[0_8px_30px_rgba(12,32,28,0.04)]">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#6b7773]">Booking requests</p>
            <h3 className="mt-2 text-2xl font-bold text-[#094d48]">Incoming bookings</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['All', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setBookingFilter(option)}
                className={`rounded-full px-3 py-2 text-sm font-medium ${
                  bookingFilter === option ? 'bg-[#094d48] text-white' : 'border border-[#dfe3df] bg-[#f9faf8] text-[#404947]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {bookingError && <div className="mb-4 rounded-[20px] border border-[#f0d0c5] bg-[#fff2ee] p-3 text-sm text-[#994531]">{bookingError}</div>}

        {bookingLoading ? (
          <div className="rounded-[20px] border border-dashed border-[#bfc8c6] bg-[#f7f3eb] p-6 text-[#404947]">Loading booking requests...</div>
        ) : filteredOwnerBookings.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[#bfc8c6] bg-[#f7f3eb] p-6 text-[#404947]">No booking requests yet.</div>
        ) : (
          <div className="grid gap-4">
            {filteredOwnerBookings.map((booking) => {
              const equipmentItem = bookingEquipmentMap[booking.equipment_id];
              const bookingStatusTone =
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
                <div key={booking.id} className="rounded-[22px] border border-[#dfe3df] bg-[#f9faf8] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[#1c1c17]">{equipmentItem?.name ?? 'Equipment booking'}</p>
                      <p className="mt-1 text-sm text-[#404947]">
                        {new Date(booking.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} –{' '}
                        {new Date(booking.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${bookingStatusTone}`}>
                      {booking.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm text-[#404947]">
                    <div><span className="text-[#6b7773]">Renter</span><p className="mt-1 font-medium text-[#1c1c17]">{booking.renter_id.slice(0, 8)}</p></div>
                    <div><span className="text-[#6b7773]">Duration</span><p className="mt-1 font-medium text-[#1c1c17]">{booking.total_days} days</p></div>
                    <div><span className="text-[#6b7773]">Rental</span><p className="mt-1 font-medium text-[#1c1c17]">{money.format(booking.total_amount)}</p></div>
                    <div><span className="text-[#6b7773]">Deposit</span><p className="mt-1 font-medium text-[#1c1c17]">{money.format(booking.security_deposit)}</p></div>
                  </div>

                  {booking.renter_notes && (
                    <p className="mt-4 text-sm text-[#404947]">Notes: {booking.renter_notes}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {booking.status === 'PENDING' && (
                      <>
                        <button type="button" onClick={() => void handleApprove(booking.id)} className="rounded-full bg-[#094d48] px-4 py-2 text-sm font-medium text-white">Approve</button>
                        <button type="button" onClick={() => void handleReject(booking.id)} className="rounded-full border border-[#f0d0c5] px-4 py-2 text-sm font-medium text-[#994531]">Reject</button>
                      </>
                    )}

                    {booking.status === 'APPROVED' && (
                      <button type="button" onClick={() => void handleComplete(booking.id)} className="rounded-full bg-[#0f766e] px-4 py-2 text-sm font-medium text-white">Mark as Completed</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EquipmentFormModal
        categories={categories}
        equipment={selectedEquipment}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEquipment(null);
        }}
        onSaved={() => {
          void loadOwnerEquipment();
          setIsModalOpen(false);
          setSelectedEquipment(null);
        }}
      />
    </div>
  );
}
