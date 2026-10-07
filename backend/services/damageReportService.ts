import { supabase } from '../utils/supabase';
import type { DamageReport, DamageSeverity, DamageStatus } from '../types';

export async function getDamageReportsForEquipment(equipmentId: string): Promise<DamageReport[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('damage_reports')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('reported_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load damage reports: ${error.message}`);
  }

  return (data ?? []) as DamageReport[];
}

export async function createDamageReport(input: {
  equipment_id: string;
  booking_id: string;
  description: string;
  severity: DamageSeverity;
  estimated_cost?: number;
}): Promise<DamageReport> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase.rpc('create_damage_report', {
    p_equipment_id: input.equipment_id,
    p_booking_id: input.booking_id,
    p_description: input.description,
    p_severity: input.severity,
    p_estimated_cost: input.estimated_cost ?? 0,
  });

  if (error) {
    throw new Error(`Failed to create damage report: ${error.message}`);
  }

  return (data as DamageReport) ?? null;
}

export async function resolveDamageReport(
  id: string,
  updates: Partial<{
    status: DamageStatus;
    actual_cost: number;
    resolution_notes: string | null;
    resolved_at: string;
  }>
): Promise<DamageReport> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase
    .from('damage_reports')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to resolve damage report: ${error.message}`);
  }

  return data as DamageReport;
}
