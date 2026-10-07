import { supabase } from '../utils/supabase';
import type { NotificationRecord } from '../types';

export async function getNotificationsForUser(userId: string): Promise<NotificationRecord[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load notifications: ${error.message}`);
  }

  return (data ?? []) as NotificationRecord[];
}

export async function markNotificationRead(notificationId: string): Promise<NotificationRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update notification: ${error.message}`);
  }

  return data as NotificationRecord;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .neq('is_read', true);

  if (error) {
    throw new Error(`Failed to update notifications: ${error.message}`);
  }
}
