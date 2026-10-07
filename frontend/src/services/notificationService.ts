import { supabase } from '../lib/supabase/client';
import type { NotificationItem } from '../types';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_booking_id: string | null;
  related_equipment_id: string | null;
  related_damage_report_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

const formatTimeAgo = (value: string) => {
  const createdAt = new Date(value);
  const diffMs = Date.now() - createdAt.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};

const mapNotification = (row: NotificationRow): NotificationItem => {
  const type =
    row.type.startsWith('BOOKING')
      ? 'booking'
      : row.type.startsWith('DAMAGE')
        ? 'deposit'
        : row.type.startsWith('REVIEW') || row.type.startsWith('SYSTEM')
          ? 'reply'
          : 'booking';

  return {
    id: row.id,
    title: row.title,
    message: row.message,
    timeAgo: formatTimeAgo(row.created_at),
    unread: !row.is_read,
    type,
  };
};

export async function getNotificationsForCurrentUser(): Promise<NotificationItem[]> {
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
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load notifications: ${error.message}`);
  }

  return (data ?? []).map((row) => mapNotification(row as NotificationRow));
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  if (!supabase) {
    return;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return;
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    throw new Error(`Failed to update notifications: ${error.message}`);
  }
}
