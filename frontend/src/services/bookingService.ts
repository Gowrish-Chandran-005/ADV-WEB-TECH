import { supabase } from '../lib/supabase/client';
import type { BookingRecord, BookingStatus } from '../types';

export type { BookingStatus } from '../types';

const bookingStatusValues: BookingStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'];

const friendlyBookingError = (message: string) => {
  const normalized = message.toLowerCase();

  if (normalized.includes('already booked') || normalized.includes('conflict') || normalized.includes('overlap')) {
    return 'This equipment is already booked for the selected dates. Please choose different dates.';
  }

  if (normalized.includes('sign in') || normalized.includes('authenticated') || normalized.includes('not logged')) {
    return 'Please sign in to request this equipment.';
  }

  if (normalized.includes('not available') || normalized.includes('published')) {
    return 'This equipment is not available for booking right now.';
  }

  return 'Unable to process this booking request right now. Please try again.';
};

export async function getBookingById(id: string): Promise<BookingRecord | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(friendlyBookingError(error.message));
  }

  return (data as BookingRecord | null) ?? null;
}

export async function getMyBookings(): Promise<BookingRecord[]> {
  if (!supabase) {
    return [];
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('renter_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(friendlyBookingError(error.message));
  }

  return (data ?? []) as BookingRecord[];
}

export async function getOwnerBookings(): Promise<BookingRecord[]> {
  if (!supabase) {
    return [];
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(friendlyBookingError(error.message));
  }

  return (data ?? []) as BookingRecord[];
}

export async function getPendingOwnerBookings(): Promise<BookingRecord[]> {
  const rows = await getOwnerBookings();
  return rows.filter((booking) => booking.status === 'PENDING');
}

export async function getBookingForEquipment(equipmentId: string): Promise<BookingRecord[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('start_date', { ascending: true });

  if (error) {
    throw new Error(friendlyBookingError(error.message));
  }

  return (data ?? []) as BookingRecord[];
}

export async function checkBookingConflict(
  equipmentId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string | null
): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.rpc('has_booking_conflict', {
    p_equipment_id: equipmentId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_exclude_booking_id: excludeBookingId ?? null,
  });

  if (error) {
    return false;
  }

  return Boolean(data);
}

export async function createBooking(
  equipmentId: string,
  startDate: string,
  endDate: string,
  renterNotes?: string
): Promise<BookingRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase.rpc('create_booking', {
    p_equipment_id: equipmentId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_renter_notes: renterNotes ?? null,
  });

  if (error) {
    throw new Error(friendlyBookingError(error.message));
  }

  if (!data) {
    throw new Error('Booking request could not be created.');
  }

  const bookingId = typeof data === 'string' ? data : data?.id ?? data;
  const created = await getBookingById(String(bookingId));

  if (!created) {
    throw new Error('Booking request was created but could not be loaded.');
  }

  return created;
}

export async function cancelBooking(bookingId: string): Promise<BookingRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    throw new Error(friendlyBookingError(error.message));
  }

  return data as BookingRecord;
}

export async function approveBooking(bookingId: string): Promise<BookingRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    throw new Error(friendlyBookingError(error.message));
  }

  return data as BookingRecord;
}

export async function rejectBooking(bookingId: string, rejectionReason?: string): Promise<BookingRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'REJECTED',
      rejection_reason: rejectionReason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    throw new Error(friendlyBookingError(error.message));
  }

  return data as BookingRecord;
}

export async function completeBooking(bookingId: string): Promise<BookingRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    throw new Error(friendlyBookingError(error.message));
  }

  return data as BookingRecord;
}

export { bookingStatusValues };
