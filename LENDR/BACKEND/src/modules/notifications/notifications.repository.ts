import type { PoolClient } from 'pg';
import { pool } from '../../config/database';
import type {
  CreateNotificationInput,
  Notification,
  NotificationPage,
  NotificationsRepository,
} from './notifications.types';

function requirePool() {
  if (!pool) {
    throw new Error('PostgreSQL connection settings are not configured.');
  }
  return pool;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  read_at: Date | null;
  created_at: Date;
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    metadata: row.metadata ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export const postgresNotificationsRepository: NotificationsRepository = {
  async create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification> {
    const runner = client ?? requirePool();
    const query = `
      INSERT INTO notifications (user_id, type, title, body, metadata)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING id, user_id, type, title, body, metadata, read_at, created_at
    `;
    const values = [
      input.userId,
      input.type,
      input.title,
      input.body,
      JSON.stringify(input.metadata ?? {}),
    ];
    const result = await runner.query<NotificationRow>(query, values);
    return mapNotification(result.rows[0]);
  },

  async hasMatchNotification(userId: string, wantedRequestId: string): Promise<boolean> {
    const result = await requirePool().query<{ count: string }>(
      `SELECT count(*)::text as count
       FROM notifications
       WHERE user_id = $1
         AND type = 'WANTED_MATCH'
         AND (metadata->>'wantedRequestId') = $2`,
      [userId, wantedRequestId],
    );
    return Number(result.rows[0]?.count ?? 0) > 0;
  },

  async listForUser(
    userId: string,
    options: { page: number; pageSize: number },
  ): Promise<NotificationPage> {
    const page = Math.max(1, options.page);
    const pageSize = Math.min(50, Math.max(1, options.pageSize));
    const offset = (page - 1) * pageSize;

    const [itemsResult, countResult, unreadResult] = await Promise.all([
      requirePool().query<NotificationRow>(
        `SELECT id, user_id, type, title, body, metadata, read_at, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, pageSize, offset],
      ),
      requirePool().query<{ total: string }>(
        `SELECT count(*)::text as total FROM notifications WHERE user_id = $1`,
        [userId],
      ),
      requirePool().query<{ unread: string }>(
        `SELECT count(*)::text as unread FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
        [userId],
      ),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);
    const unreadCount = Number(unreadResult.rows[0]?.unread ?? 0);

    return {
      items: itemsResult.rows.map(mapNotification),
      unreadCount,
      page,
      pageSize,
      total,
    };
  },

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const result = await requirePool().query<NotificationRow>(
      `UPDATE notifications
       SET read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, type, title, body, metadata, read_at, created_at`,
      [id, userId],
    );
    if (!result.rows[0]) {
      return null;
    }
    return mapNotification(result.rows[0]);
  },

  async markAllAsRead(userId: string): Promise<number> {
    const result = await requirePool().query(
      `UPDATE notifications
       SET read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId],
    );
    return result.rowCount ?? 0;
  },

  async getUnreadCount(userId: string): Promise<number> {
    const result = await requirePool().query<{ unread: string }>(
      `SELECT count(*)::text as unread FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [userId],
    );
    return Number(result.rows[0]?.unread ?? 0);
  },
};
