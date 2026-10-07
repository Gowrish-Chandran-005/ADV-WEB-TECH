import { supabase } from '../utils/supabase';
import type { EquipmentRecord, ProfileRecord } from '../types';

export async function adminUpdateUserStatus(targetUserId: string, newStatus: 'ACTIVE' | 'SUSPENDED'): Promise<ProfileRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase.rpc('admin_update_user_status', {
    target_user_id: targetUserId,
    new_status: newStatus,
  });

  if (error) {
    throw new Error(`Failed to update user status: ${error.message}`);
  }

  return data as ProfileRecord;
}

export async function adminUpdateUserRole(targetUserId: string, newRole: 'RENTER' | 'OWNER' | 'ADMIN'): Promise<ProfileRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase.rpc('admin_update_user_role', {
    target_user_id: targetUserId,
    new_role: newRole,
  });

  if (error) {
    throw new Error(`Failed to update user role: ${error.message}`);
  }

  return data as ProfileRecord;
}

export async function adminUpdateEquipmentStatus(id: string, newStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE'): Promise<EquipmentRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase.rpc('admin_update_equipment_status', {
    p_equipment_id: id,
    p_new_status: newStatus,
  });

  if (error) {
    throw new Error(`Failed to update equipment status: ${error.message}`);
  }

  return data as EquipmentRecord;
}

export async function adminUpdateEquipmentVisibility(id: string, isPublished: boolean): Promise<EquipmentRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase.rpc('admin_update_equipment_visibility', {
    p_equipment_id: id,
    p_is_published: isPublished,
  });

  if (error) {
    throw new Error(`Failed to update equipment visibility: ${error.message}`);
  }

  return data as EquipmentRecord;
}
