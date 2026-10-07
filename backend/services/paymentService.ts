import { supabase } from '../utils/supabase';
import type { PaymentRecord } from '../types';

export async function createMockPayment(bookingId: string, paymentType: 'RENTAL' | 'SECURITY_DEPOSIT'): Promise<PaymentRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase.rpc('create_mock_payment', {
    p_booking_id: bookingId,
    p_payment_type: paymentType,
  });

  if (error) {
    throw new Error(`Failed to create mock payment: ${error.message}`);
  }

  return data as PaymentRecord;
}

export async function createMockRefund(paymentId: string, refundAmount: number): Promise<PaymentRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase.rpc('create_mock_refund', {
    p_payment_id: paymentId,
    p_refund_amount: refundAmount,
  });

  if (error) {
    throw new Error(`Failed to create refund: ${error.message}`);
  }

  return data as PaymentRecord;
}

export async function getPaymentsForBooking(bookingId: string): Promise<PaymentRecord[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load payments: ${error.message}`);
  }

  return (data ?? []) as PaymentRecord[];
}
