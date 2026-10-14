import type { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { canManageEquipment } from '../equipment/equipment.repository';
import { inclusiveRentalDays, nextCalendarDate, currentIstDate } from './booking.validation';
import type {
  AvailabilityResult,
  Booking,
  BookingAction,
  BookingCreateResult,
  BookingDateRange,
  BookingFilters,
  BookingPage,
  BookingRepository,
  BookingStatus,
  CreateBookingInput,
  CreateMaintenanceInput,
  MaintenanceBlock,
  BookingTransitionResult,
} from './booking.types';

const bookingFields = `
  b.id,
  b.equipment_id AS "equipmentId",
  e.title AS "equipmentTitle",
  e.status AS "equipmentStatus",
  b.renter_id AS "renterId",
  renter.full_name AS "renterFullName",
  e.owner_user_id AS "ownerUserId",
  e.organization_id AS "organizationId",
  b.start_at AS "startAt",
  b.end_at AS "endAt",
  b.status,
  b.rental_days AS "rentalDays",
  b.daily_rental_price_snapshot AS "dailyRentalPrice",
  b.security_deposit_snapshot AS "securityDeposit",
  b.total_price AS "totalPrice",
  b.notes,
  b.expires_at AS "expiresAt",
  b.return_recorded_at AS "returnRecordedAt",
  b.created_at AS "createdAt",
  b.updated_at AS "updatedAt"`;

const maintenanceFields = `
  id,
  equipment_id AS "equipmentId",
  start_at AS "startAt",
  end_at AS "endAt",
  reason,
  created_by_user_id AS "createdByUserId",
  created_at AS "createdAt",
  updated_at AS "updatedAt"`;

const blockingStatuses = ['PENDING', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED'];
const pendingExpiryReason = 'Pending request expired after 48 hours.';

function requirePool() {
  if (!pool) {
    throw new Error('PostgreSQL connection settings are not configured.');
  }
  return pool;
}

function dateParameters(range: BookingDateRange): [string, string] {
  return [range.startDate, nextCalendarDate(range.endDate)];
}

function hasSqlError(error: unknown, code: string, constraint?: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code &&
    (constraint === undefined || ('constraint' in error && error.constraint === constraint))
  );
}

async function selectBooking(client: Pick<PoolClient, 'query'>, id: string): Promise<Booking | null> {
  const result = await client.query<Booking>(
    `SELECT ${bookingFields}
     FROM bookings b
     JOIN equipment e ON e.id = b.equipment_id
     JOIN users renter ON renter.id = b.renter_id
     WHERE b.id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

async function addNotification(
  client: Pick<PoolClient, 'query'>,
  userId: string,
  bookingId: string,
  eventKey: string,
  type: string,
  title: string,
  body: string,
): Promise<void> {
  await client.query(
    `INSERT INTO notifications (user_id, type, title, body, metadata)
     SELECT $1, $2, $3, $4, jsonb_build_object('bookingId', $5::text, 'eventKey', $6::text)
     WHERE NOT EXISTS (
       SELECT 1 FROM notifications
       WHERE user_id = $1 AND metadata->>'eventKey' = $6
     )`,
    [userId, type, title, body, bookingId, eventKey],
  );
}

async function recordTransition(
  client: Pick<PoolClient, 'query'>,
  input: {
    bookingId: string;
    previousStatus: BookingStatus | null;
    newStatus: BookingStatus;
    actorId: string | null;
    reason: string | null;
    notification?: {
      userId: string;
      eventKey: string;
      type: string;
      title: string;
      body: string;
    };
  },
): Promise<void> {
  await client.query(
    `INSERT INTO booking_status_history
       (booking_id, previous_status, new_status, actor_user_id, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.bookingId, input.previousStatus, input.newStatus, input.actorId, input.reason],
  );
  if (input.notification) {
    await addNotification(
      client,
      input.notification.userId,
      input.bookingId,
      input.notification.eventKey,
      input.notification.type,
      input.notification.title,
      input.notification.body,
    );
  }
}

async function expireForEquipment(client: PoolClient, equipmentId: string): Promise<number> {
  const expired = await client.query<{
    id: string;
    renter_id: string;
    owner_user_id: string;
    title: string;
  }>(
    `UPDATE bookings b
     SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
     FROM equipment e
     WHERE b.equipment_id = $1
       AND e.id = b.equipment_id
       AND b.status = 'PENDING'
       AND b.expires_at <= CURRENT_TIMESTAMP
     RETURNING b.id, b.renter_id, e.owner_user_id, e.title`,
    [equipmentId],
  );
  for (const booking of expired.rows) {
    await recordTransition(client, {
      bookingId: booking.id,
      previousStatus: 'PENDING',
      newStatus: 'CANCELLED',
      actorId: null,
      reason: pendingExpiryReason,
    });
    await addNotification(
      client,
      booking.renter_id,
      booking.id,
      `${booking.id}:expired:renter`,
      'BOOKING_CANCELLED',
      'Booking request expired',
      `Your request for ${booking.title} expired after 48 hours.`,
    );
    if (booking.owner_user_id !== booking.renter_id) {
      await addNotification(
        client,
        booking.owner_user_id,
        booking.id,
        `${booking.id}:expired:owner`,
        'BOOKING_CANCELLED',
        'Booking request expired',
        `The pending request for ${booking.title} expired after 48 hours.`,
      );
    }
  }
  return expired.rowCount ?? 0;
}

async function pagedBookings(
  client: Pick<PoolClient, 'query'>,
  where: string,
  values: unknown[],
  filters: BookingFilters,
): Promise<BookingPage> {
  const count = await client.query<{ total: string }>(
    `SELECT count(*)::text AS total
     FROM bookings b
     JOIN equipment e ON e.id = b.equipment_id
     JOIN users renter ON renter.id = b.renter_id
     WHERE ${where}`,
    values,
  );
  const pageValues = [...values, filters.pageSize, (filters.page - 1) * filters.pageSize];
  const result = await client.query<Booking>(
    `SELECT ${bookingFields}
     FROM bookings b
     JOIN equipment e ON e.id = b.equipment_id
     JOIN users renter ON renter.id = b.renter_id
     WHERE ${where}
     ORDER BY b.created_at DESC, b.id DESC
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues,
  );
  return {
    items: result.rows,
    page: filters.page,
    pageSize: filters.pageSize,
    total: Number(count.rows[0]?.total ?? 0),
  };
}

async function equipmentManagerPredicate(
  client: Pick<PoolClient, 'query'>,
  equipmentId: string,
  userId: string,
): Promise<boolean> {
  const result = await client.query<{
    owner_user_id: string;
    organization_id: string | null;
  }>('SELECT owner_user_id, organization_id FROM equipment WHERE id = $1', [equipmentId]);
  const equipment = result.rows[0];
  return equipment ? canManageEquipment(client, equipment, userId) : false;
}

export const bookingRepository: BookingRepository = {
  async create(renterId: string, input: CreateBookingInput): Promise<BookingCreateResult> {
    if (input.startDate < currentIstDate()) {
      return 'unavailable';
    }
    const rentalDays = inclusiveRentalDays(input.startDate, input.endDate);
    const [startDate, endDate] = dateParameters(input);
    const client = await requirePool().connect();
    try {
      await client.query('BEGIN');
      const renter = await client.query<{ status: string }>(
        'SELECT status FROM users WHERE id = $1',
        [renterId],
      );
      if (renter.rows[0]?.status !== 'ACTIVE') {
        await client.query('ROLLBACK');
        return 'equipment_not_found';
      }
      const equipmentResult = await client.query<{
        id: string;
        owner_user_id: string;
        organization_id: string | null;
        status: string;
        max_rental_days: number;
        daily_rental_price: string;
        security_deposit: string | null;
        title: string;
      }>(
        `SELECT id, owner_user_id, organization_id, status, max_rental_days,
                daily_rental_price, security_deposit, title
         FROM equipment WHERE id = $1 FOR UPDATE`,
        [input.equipmentId],
      );
      const equipment = equipmentResult.rows[0];
      if (!equipment) {
        await client.query('ROLLBACK');
        return 'equipment_not_found';
      }
      await expireForEquipment(client, input.equipmentId);
      if (equipment.status !== 'ACTIVE') {
        await client.query('ROLLBACK');
        return 'unavailable';
      }
      if (await canManageEquipment(client, equipment, renterId)) {
        await client.query('ROLLBACK');
        return 'self_booking';
      }
      if (rentalDays > equipment.max_rental_days) {
        await client.query('ROLLBACK');
        return 'duration_exceeded';
      }

      const maintenance = await client.query(
        `SELECT 1 FROM maintenance_blocks
         WHERE equipment_id = $1
           AND start_at < ($3::date::timestamp AT TIME ZONE 'Asia/Kolkata')
           AND end_at > ($2::date::timestamp AT TIME ZONE 'Asia/Kolkata')
         LIMIT 1`,
        [input.equipmentId, startDate, endDate],
      );
      if ((maintenance.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');
        return 'maintenance_conflict';
      }

      const pending = await client.query(
        `SELECT 1 FROM bookings
         WHERE renter_id = $1
           AND status = 'PENDING'
           AND expires_at > CURRENT_TIMESTAMP
         LIMIT 3`,
        [renterId],
      );
      if ((pending.rowCount ?? 0) >= 3) {
        await client.query('ROLLBACK');
        return 'pending_limit';
      }

      // The database trigger locks the renter row and rechecks this cap atomically at insert time.
      const created = await client.query<{ id: string }>(
        `INSERT INTO bookings (
           equipment_id, renter_id, start_at, end_at, status, rental_days,
           daily_rental_price_snapshot, security_deposit_snapshot,
           total_price, notes, expires_at
         )
         VALUES (
           $1, $2,
           $3::date::timestamp AT TIME ZONE 'Asia/Kolkata',
           $4::date::timestamp AT TIME ZONE 'Asia/Kolkata',
           'PENDING', $5, $6, $7,
           ($5::integer::numeric * $6::numeric + $7::numeric),
           $8, CURRENT_TIMESTAMP + interval '48 hours'
         )
         RETURNING id`,
        [
          input.equipmentId,
          renterId,
          startDate,
          endDate,
          rentalDays,
          equipment.daily_rental_price,
          equipment.security_deposit ?? '0',
          input.notes ?? null,
        ],
      );
      const bookingId = created.rows[0].id;
      await recordTransition(client, {
        bookingId,
        previousStatus: null,
        newStatus: 'PENDING',
        actorId: renterId,
        reason: null,
      });
      await addNotification(
        client,
        equipment.owner_user_id,
        bookingId,
        `${bookingId}:created:owner`,
        'BOOKING_REQUEST_RECEIVED',
        'New booking request',
        `A student requested ${equipment.title}.`,
      );
      const booking = await selectBooking(client, bookingId);
      if (!booking) {
        throw new Error('Created booking could not be reloaded inside its transaction.');
      }
      await client.query('COMMIT');
      return { booking };
    } catch (error) {
      await client.query('ROLLBACK');
      if (hasSqlError(error, '23514', 'bookings_pending_limit')) {
        return 'pending_limit';
      }
      throw error;
    } finally {
      client.release();
    }
  },

  async listMine(userId, filters): Promise<BookingPage> {
    return pagedBookings(
      requirePool(),
      'b.renter_id = $1',
      [userId],
      filters,
    );
  },

  async listReceived(userId, filters): Promise<BookingPage> {
    return pagedBookings(
      requirePool(),
      `(
         e.owner_user_id = $1
         OR EXISTS (
           SELECT 1 FROM organization_memberships membership
           JOIN organizations organization ON organization.id = membership.organization_id
           WHERE membership.organization_id = e.organization_id
             AND membership.user_id = $1
             AND membership.status = 'ACTIVE'
             AND membership.membership_role IN ('OWNER', 'ADMIN')
             AND organization.status = 'ACTIVE'
         )
       )`,
      [userId],
      filters,
    );
  },

  async getById(id, userId): Promise<Booking | null> {
    const client = requirePool();
    const result = await client.query<Booking>(
      `SELECT ${bookingFields}
       FROM bookings b
       JOIN equipment e ON e.id = b.equipment_id
       JOIN users renter ON renter.id = b.renter_id
       WHERE b.id = $1
         AND (
           b.renter_id = $2
           OR e.owner_user_id = $2
           OR EXISTS (
             SELECT 1 FROM organization_memberships membership
             JOIN organizations organization ON organization.id = membership.organization_id
             WHERE membership.organization_id = e.organization_id
               AND membership.user_id = $2
               AND membership.status = 'ACTIVE'
               AND membership.membership_role IN ('OWNER', 'ADMIN')
               AND organization.status = 'ACTIVE'
           )
         )`,
      [id, userId],
    );
    return result.rows[0] ?? null;
  },

  async transition(id, userId, action, reason): Promise<BookingTransitionResult> {
    const client = await requirePool().connect();
    try {
      await client.query('BEGIN');
      const reference = await client.query<{ equipment_id: string }>(
        'SELECT equipment_id FROM bookings WHERE id = $1',
        [id],
      );
      if (!reference.rows[0]) {
        await client.query('ROLLBACK');
        return 'not_found';
      }
      const lockedEquipment = await client.query(
        'SELECT id FROM equipment WHERE id = $1 FOR UPDATE',
        [reference.rows[0].equipment_id],
      );
      if ((lockedEquipment.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return 'not_found';
      }
      await expireForEquipment(client, reference.rows[0].equipment_id);
      const bookingResult = await client.query<Booking>(
        `SELECT ${bookingFields}
         FROM bookings b
         JOIN equipment e ON e.id = b.equipment_id
         JOIN users renter ON renter.id = b.renter_id
         WHERE b.id = $1
         FOR UPDATE OF b`,
        [id],
      );
      const booking = bookingResult.rows[0];
      if (!booking) {
        await client.query('ROLLBACK');
        return 'not_found';
      }
      const isRenter = booking.renterId === userId;
      const isManager = await equipmentManagerPredicate(client, booking.equipmentId, userId);
      const expiredHistory = await client.query(
        `SELECT 1 FROM booking_status_history
         WHERE booking_id = $1
           AND new_status = 'CANCELLED'
           AND actor_user_id IS NULL
           AND reason = $2
         LIMIT 1`,
        [booking.id, pendingExpiryReason],
      );
      const expiredRequest = (expiredHistory.rowCount ?? 0) > 0;
      if (action === 'approve' || action === 'reject') {
        if (!isManager || isRenter) {
          await client.query('ROLLBACK');
          return 'forbidden';
        }
      } else if (action === 'cancel' || action === 'request-return') {
        if (!isRenter) {
          await client.query('ROLLBACK');
          return 'forbidden';
        }
      } else if (!isManager || isRenter) {
        await client.query('ROLLBACK');
        return 'forbidden';
      }

      const transition = transitionTarget(action, booking.status);
      if (!transition) {
        await client.query('ROLLBACK');
        return expiredRequest ? 'expired' : 'invalid_transition';
      }
      if (
        action === 'cancel' &&
        booking.startAt.getTime() <= Date.now()
      ) {
        await client.query('ROLLBACK');
        return 'invalid_transition';
      }
      if (action === 'start') {
        const inRentalPeriod = await client.query(
          `SELECT 1 FROM bookings
           WHERE id = $1
             AND CURRENT_TIMESTAMP >= start_at
             AND CURRENT_TIMESTAMP < end_at`,
          [id],
        );
        if ((inRentalPeriod.rowCount ?? 0) === 0) {
          await client.query('ROLLBACK');
          return 'invalid_transition';
        }
      }

      await client.query(
        `UPDATE bookings 
         SET status = $2, 
             return_recorded_at = CASE 
               WHEN $2 IN ('RETURN_REQUESTED', 'COMPLETED') AND return_recorded_at IS NULL THEN CURRENT_TIMESTAMP 
               ELSE return_recorded_at 
             END,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [id, transition.newStatus],
      );
      await recordTransition(client, {
        bookingId: id,
        previousStatus: booking.status,
        newStatus: transition.newStatus,
        actorId: userId,
        reason: action === 'reject' ? (reason ?? null) : null,
      });
      const recipient = isRenter ? booking.ownerUserId : booking.renterId;
      const notification = notificationFor(transition.newStatus, booking.equipmentTitle);
      await addNotification(
        client,
        recipient,
        booking.id,
        `${booking.id}:${transition.newStatus}:${userId}`,
        notification.type,
        notification.title,
        notification.body,
      );
      const updatedBooking = await selectBooking(client, id);
      if (!updatedBooking) {
        throw new Error('Updated booking could not be reloaded inside its transaction.');
      }
      await client.query('COMMIT');
      return { booking: updatedBooking };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async availability(equipmentId, range): Promise<AvailabilityResult | null | 'duration_exceeded'> {
    if (range.startDate < currentIstDate()) {
      return null;
    }
    const client = await requirePool().connect();
    try {
      await client.query('BEGIN');
      const equipment = await client.query<{ status: string; max_rental_days: number }>(
        'SELECT status, max_rental_days FROM equipment WHERE id = $1 FOR UPDATE',
        [equipmentId],
      );
      if (!equipment.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      await expireForEquipment(client, equipmentId);
      const days = inclusiveRentalDays(range.startDate, range.endDate);
      if (days > equipment.rows[0].max_rental_days) {
        await client.query('ROLLBACK');
        return 'duration_exceeded';
      }
      const [startDate, endDate] = dateParameters(range);
      const [bookings, maintenance] = await Promise.all([
        client.query(
          `SELECT count(*)::int AS count FROM bookings
           WHERE equipment_id = $1
             AND status = ANY($4::text[])
             AND start_at < ($3::date::timestamp AT TIME ZONE 'Asia/Kolkata')
             AND end_at > ($2::date::timestamp AT TIME ZONE 'Asia/Kolkata')`,
          [equipmentId, startDate, endDate, blockingStatuses],
        ),
        client.query<Pick<MaintenanceBlock, 'startAt' | 'endAt'>>(
          `SELECT start_at AS "startAt", end_at AS "endAt"
           FROM maintenance_blocks
           WHERE equipment_id = $1
             AND start_at < ($3::date::timestamp AT TIME ZONE 'Asia/Kolkata')
             AND end_at > ($2::date::timestamp AT TIME ZONE 'Asia/Kolkata')
           ORDER BY start_at`,
          [equipmentId, startDate, endDate],
        ),
      ]);
      const conflictingBookings = Number(bookings.rows[0]?.count ?? 0);
      const maintenanceBlocks = maintenance.rows;
      await client.query('COMMIT');
      return {
        available:
          equipment.rows[0].status === 'ACTIVE' &&
          conflictingBookings === 0 &&
          maintenanceBlocks.length === 0,
        conflictingBookings,
        maintenanceBlocks,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async listMaintenance(equipmentId): Promise<MaintenanceBlock[] | null> {
    const client = requirePool();
    const equipment = await client.query('SELECT 1 FROM equipment WHERE id = $1', [equipmentId]);
    if ((equipment.rowCount ?? 0) === 0) {
      return null;
    }
    const result = await client.query<MaintenanceBlock>(
      `SELECT ${maintenanceFields}
       FROM maintenance_blocks
       WHERE equipment_id = $1
       ORDER BY start_at, id`,
      [equipmentId],
    );
    return result.rows;
  },

  async createMaintenance(equipmentId, userId, input): Promise<
    MaintenanceBlock | 'not_found' | 'forbidden' | 'booking_conflict' | 'maintenance_conflict'
  > {
    if (input.startDate < currentIstDate()) {
      return 'maintenance_conflict';
    }
    const [startDate, endDate] = dateParameters(input);
    const client = await requirePool().connect();
    try {
      await client.query('BEGIN');
      const equipmentResult = await client.query<{
        owner_user_id: string;
        organization_id: string | null;
        id: string;
      }>(
        'SELECT id, owner_user_id, organization_id FROM equipment WHERE id = $1 FOR UPDATE',
        [equipmentId],
      );
      const equipment = equipmentResult.rows[0];
      if (!equipment) {
        await client.query('ROLLBACK');
        return 'not_found';
      }
      if (!(await canManageEquipment(client, equipment, userId))) {
        await client.query('ROLLBACK');
        return 'forbidden';
      }
      await expireForEquipment(client, equipmentId);
      const conflict = await client.query(
        `SELECT 1 FROM bookings
         WHERE equipment_id = $1
           AND status = ANY($4::text[])
           AND start_at < ($3::date::timestamp AT TIME ZONE 'Asia/Kolkata')
           AND end_at > ($2::date::timestamp AT TIME ZONE 'Asia/Kolkata')
         LIMIT 1`,
        [equipmentId, startDate, endDate, blockingStatuses],
      );
      if ((conflict.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');
        return 'booking_conflict';
      }
      const created = await client.query<MaintenanceBlock>(
        `INSERT INTO maintenance_blocks
           (equipment_id, start_at, end_at, reason, created_by_user_id)
         VALUES (
           $1,
           $2::date::timestamp AT TIME ZONE 'Asia/Kolkata',
           $3::date::timestamp AT TIME ZONE 'Asia/Kolkata',
           $4, $5
         )
         RETURNING ${maintenanceFields}`,
        [equipmentId, startDate, endDate, input.reason, userId],
      );
      await client.query('COMMIT');
      return created.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (hasSqlError(error, '23P01', 'maintenance_blocks_no_overlap')) {
        return 'maintenance_conflict';
      }
      throw error;
    } finally {
      client.release();
    }
  },

  async deleteMaintenance(equipmentId, blockId, userId): Promise<'deleted' | 'not_found' | 'forbidden'> {
    const client = await requirePool().connect();
    try {
      await client.query('BEGIN');
      const equipmentResult = await client.query<{
        owner_user_id: string;
        organization_id: string | null;
        id: string;
      }>(
        'SELECT id, owner_user_id, organization_id FROM equipment WHERE id = $1 FOR UPDATE',
        [equipmentId],
      );
      const equipment = equipmentResult.rows[0];
      if (!equipment) {
        await client.query('ROLLBACK');
        return 'not_found';
      }
      if (!(await canManageEquipment(client, equipment, userId))) {
        await client.query('ROLLBACK');
        return 'forbidden';
      }
      const deleted = await client.query(
        'DELETE FROM maintenance_blocks WHERE id = $1 AND equipment_id = $2',
        [blockId, equipmentId],
      );
      if ((deleted.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return 'not_found';
      }
      await client.query('COMMIT');
      return 'deleted';
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async expirePending(): Promise<number> {
    const database = requirePool();
    let totalExpired = 0;
    while (true) {
      const client = await database.connect();
      try {
        await client.query('BEGIN');
        const equipment = await client.query<{ id: string }>(
          `SELECT e.id
           FROM equipment e
           WHERE EXISTS (
             SELECT 1 FROM bookings b
             WHERE b.equipment_id = e.id
               AND b.status = 'PENDING'
               AND b.expires_at <= CURRENT_TIMESTAMP
           )
           ORDER BY e.id
           LIMIT 100
           FOR UPDATE OF e SKIP LOCKED`,
        );
        if (equipment.rows.length === 0) {
          await client.query('COMMIT');
          return totalExpired;
        }
        for (const row of equipment.rows) {
          totalExpired += await expireForEquipment(client, row.id);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  },
};

export function transitionTarget(
  action: BookingAction,
  current: BookingStatus,
): { newStatus: BookingStatus } | null {
  const transitions: Record<BookingAction, Partial<Record<BookingStatus, BookingStatus>>> = {
    approve: { PENDING: 'APPROVED' },
    reject: { PENDING: 'REJECTED' },
    cancel: { PENDING: 'CANCELLED', APPROVED: 'CANCELLED' },
    start: { APPROVED: 'ACTIVE' },
    'request-return': { ACTIVE: 'RETURN_REQUESTED' },
    complete: { RETURN_REQUESTED: 'COMPLETED' },
  };
  const newStatus = transitions[action][current];
  return newStatus ? { newStatus } : null;
}

function notificationFor(status: BookingStatus, equipmentTitle: string) {
  const values: Record<BookingStatus, { type: string; title: string; body: string }> = {
    PENDING: {
      type: 'BOOKING_REQUEST_RECEIVED',
      title: 'New booking request',
      body: `A student requested ${equipmentTitle}.`,
    },
    APPROVED: {
      type: 'BOOKING_APPROVED',
      title: 'Booking approved',
      body: `Your request for ${equipmentTitle} was approved.`,
    },
    REJECTED: {
      type: 'BOOKING_REJECTED',
      title: 'Booking declined',
      body: `Your request for ${equipmentTitle} was declined.`,
    },
    CANCELLED: {
      type: 'BOOKING_CANCELLED',
      title: 'Booking cancelled',
      body: `The booking request for ${equipmentTitle} was cancelled.`,
    },
    ACTIVE: {
      type: 'RENTAL_ACTIVATED',
      title: 'Rental started',
      body: `The rental for ${equipmentTitle} is now active.`,
    },
    RETURN_REQUESTED: {
      type: 'RETURN_REQUESTED',
      title: 'Return requested',
      body: `The renter requested to return ${equipmentTitle}.`,
    },
    COMPLETED: {
      type: 'RETURN_COMPLETED',
      title: 'Return confirmed',
      body: `The return of ${equipmentTitle} was confirmed.`,
    },
  };
  return values[status];
}
