import { supabase } from '../utils/supabase';
import type { EquipmentReviewSummary, Review } from '../types';

export async function createReview(input: {
  booking_id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
}): Promise<Review> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase.rpc('create_review', {
    p_booking_id: input.booking_id,
    p_rating: input.rating,
    p_title: input.title ?? null,
    p_comment: input.comment ?? null,
  });

  if (error) {
    throw new Error(`Failed to create review: ${error.message}`);
  }

  return data as Review;
}

export async function getReviewsForEquipment(equipmentId: string): Promise<Review[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load reviews: ${error.message}`);
  }

  return (data ?? []) as Review[];
}

export async function getEquipmentReviewSummary(equipmentId: string): Promise<EquipmentReviewSummary | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('equipment_review_summary')
    .select('*')
    .eq('equipment_id', equipmentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load equipment review summary: ${error.message}`);
  }

  return (data as EquipmentReviewSummary | null) ?? null;
}
