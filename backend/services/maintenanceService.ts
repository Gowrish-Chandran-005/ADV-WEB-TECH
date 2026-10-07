import { supabase } from '../utils/supabase';
import type { MaintenanceRecord, MaintenanceStatus, MaintenanceType } from '../types';

export async function getMaintenanceForEquipment(equipmentId: string): Promise<MaintenanceRecord[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('maintenance_records')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load maintenance records: ${error.message}`);
  }

  return (data ?? []) as MaintenanceRecord[];
}

export async function createMaintenanceRecord(input: {
  equipment_id: string;
  title: string;
  maintenance_type: MaintenanceType;
  description?: string | null;
  scheduled_date?: string | null;
  cost?: number;
  status?: MaintenanceStatus;
  notes?: string | null;
}): Promise<MaintenanceRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Authentication is required to create maintenance records.');
  }

  const { data, error } = await supabase
    .from('maintenance_records')
    .insert({
      equipment_id: input.equipment_id,
      reported_by: user.id,
      maintenance_type: input.maintenance_type,
      title: input.title,
      description: input.description ?? null,
      scheduled_date: input.scheduled_date ?? null,
      cost: input.cost ?? 0,
      status: input.status ?? 'SCHEDULED',
      notes: input.notes ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create maintenance record: ${error.message}`);
  }

  return data as MaintenanceRecord;
}

export async function updateMaintenanceRecord(
  id: string,
  updates: Partial<{
    title: string;
    description: string | null;
    maintenance_type: MaintenanceType;
    scheduled_date: string | null;
    started_at: string | null;
    completed_at: string | null;
    cost: number;
    status: MaintenanceStatus;
    notes: string | null;
  }>
): Promise<MaintenanceRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase
    .from('maintenance_records')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update maintenance record: ${error.message}`);
  }

  return data as MaintenanceRecord;
}

export async function markMaintenanceStarted(id: string): Promise<MaintenanceRecord> {
  return updateMaintenanceRecord(id, {
    status: 'IN_PROGRESS',
    started_at: new Date().toISOString(),
  });
}

export async function completeMaintenance(id: string, notes?: string): Promise<MaintenanceRecord> {
  return updateMaintenanceRecord(id, {
    status: 'COMPLETED',
    completed_at: new Date().toISOString(),
    notes: notes ?? null,
  });
}
