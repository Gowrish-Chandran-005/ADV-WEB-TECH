import type { PoolClient } from 'pg';

export type NotificationType =
  | 'WANTED_MATCH'
  | 'WANTED_OFFER_RECEIVED'
  | 'WANTED_OFFER_ACCEPTED'
  | 'WANTED_OFFER_DECLINED'
  | 'BOOKING_UPDATE';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationPage {
  items: Notification[];
  unreadCount: number;
  page: number;
  pageSize: number;
  total: number;
}

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationsRepository {
  create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification>;
  hasMatchNotification(userId: string, wantedRequestId: string): Promise<boolean>;
  listForUser(userId: string, options: { page: number; pageSize: number }): Promise<NotificationPage>;
  markAsRead(id: string, userId: string): Promise<Notification | null>;
  markAllAsRead(userId: string): Promise<number>;
  getUnreadCount(userId: string): Promise<number>;
}
