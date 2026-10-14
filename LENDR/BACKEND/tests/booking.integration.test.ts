import { randomUUID } from 'node:crypto';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/config/database';
import { env } from '../src/config/env';
import { createApp } from '../src/app';
import { runMigrations } from '../src/db/migration-runner';
import { bookingRepository } from '../src/modules/bookings/booking.repository';
import { currentIstDate, nextCalendarDate } from '../src/modules/bookings/booking.validation';

const enabled = process.env.LENDR_RUN_DB_TESTS === 'true';
const suite = enabled ? describe : describe.skip;
const fixtureId = randomUUID();
const userIds = Array.from({ length: 8 }, () => randomUUID());
const [ownerId, renterId, otherRenterId, thirdRenterId, orgAdminId, orgMemberId, capRenterId, expiryRenterId] = userIds;
const organizationId = randomUUID();
const equipmentIds = Array.from({ length: 12 }, () => randomUUID());
const app = createApp();

function token(userId: string): string {
  if (!env.AUTH_JWT_SECRET) {
    throw new Error('AUTH_JWT_SECRET is required for booking integration tests.');
  }
  return jwt.sign(
    { tokenVersion: 0 },
    env.AUTH_JWT_SECRET,
    {
      algorithm: 'HS256',
      audience: 'lendr',
      expiresIn: '1h',
      issuer: 'lendr-api',
      subject: userId,
    },
  );
}

function campusDate(offset: number): string {
  const date = new Date(`${currentIstDate()}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function dateRange(offset: number, durationDays = 1) {
  return { startDate: campusDate(offset), endDate: campusDate(offset + durationDays - 1) };
}

function bookingBody(equipmentId: string, range: ReturnType<typeof dateRange>, notes?: string) {
  return { equipmentId, ...range, ...(notes ? { notes } : {}) };
}

async function createBooking(userId: string, equipmentId: string, range: ReturnType<typeof dateRange>) {
  return request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${token(userId)}`)
    .send(bookingBody(equipmentId, range));
}

let equipmentCategoryId = '';

suite('booking and maintenance PostgreSQL integration', () => {
  beforeAll(async () => {
    if (!pool) {
      throw new Error('Booking integration tests require PostgreSQL configuration.');
    }
    await runMigrations(
      pool,
      path.resolve(__dirname, '../migrations'),
      {
        projectId: env.MIGRATION_EXPECTED_NEON_PROJECT_ID ?? null,
        branchId: env.MIGRATION_EXPECTED_NEON_BRANCH_ID ?? null,
      },
      'status',
    );
    const category = await pool.query<{ id: string }>(
      "SELECT id FROM categories WHERE slug = 'electronics' AND is_active = true",
    );
    equipmentCategoryId = category.rows[0].id;

    for (const [index, userId] of userIds.entries()) {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, full_name)
         VALUES ($1, $2, 'booking-integration-hash', $3)`,
        [userId, `booking-${fixtureId}-${index}@vitstudent.ac.in`, `Booking Test ${index}`],
      );
    }
    await pool.query(
      `INSERT INTO organizations (id, name, slug)
       VALUES ($1, $2, $3)`,
      [organizationId, `Booking Test ${fixtureId}`, `booking-test-${fixtureId}`],
    );
    await pool.query(
      `INSERT INTO organization_memberships (organization_id, user_id, membership_role)
       VALUES ($1, $2, 'ADMIN'), ($1, $3, 'MEMBER')`,
      [organizationId, orgAdminId, orgMemberId],
    );
    for (const [index, equipmentId] of equipmentIds.entries()) {
      await pool.query(
        `INSERT INTO equipment
           (id, owner_user_id, organization_id, category_id, title, description,
            pickup_location, daily_rental_price, security_deposit, max_rental_days)
         VALUES ($1, $2, $3, $4, $5, $6, 'TT', 100, 50, 30)`,
        [
          equipmentId,
          ownerId,
          index === 8 ? organizationId : null,
          equipmentCategoryId,
          `Booking fixture ${fixtureId} ${index}`,
          `Isolated booking fixture ${fixtureId}`,
        ],
      );
    }
  }, 30000);

  afterAll(async () => {
    if (!pool) {
      return;
    }
    await pool.query('DELETE FROM bookings WHERE equipment_id = ANY($1::uuid[])', [equipmentIds]);
    await pool.query('DELETE FROM maintenance_blocks WHERE equipment_id = ANY($1::uuid[])', [equipmentIds]);
    await pool.query('DELETE FROM equipment WHERE id = ANY($1::uuid[])', [equipmentIds]);
    await pool.query('DELETE FROM organization_memberships WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
  });

  it('enforces the booking lifecycle, availability, maintenance and concurrent reservation limits', async () => {
    const ownerToken = token(ownerId);
    const renterToken = token(renterId);
    const todayRange = dateRange(0, 2);
    const invalidDate = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${renterToken}`)
      .send(bookingBody(equipmentIds[0], { startDate: '2026-02-30', endDate: '2026-03-01' }));
    const invalidOrder = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${renterToken}`)
      .send(bookingBody(equipmentIds[0], { startDate: campusDate(3), endDate: campusDate(2) }));
    expect(invalidDate.status).toBe(400);
    expect(invalidOrder.status).toBe(400);
    const excessiveDuration = await createBooking(renterId, equipmentIds[0], dateRange(3, 31));
    expect(excessiveDuration.status).toBe(422);

    const initialAvailability = await request(app)
      .get(`/api/v1/equipment/${equipmentIds[0]}/availability`)
      .query(todayRange);
    expect(initialAvailability.status).toBe(200);
    expect(initialAvailability.body.available).toBe(true);

    const untrustedPrice = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ ...bookingBody(equipmentIds[0], todayRange), dailyRentalPrice: 0 });
    expect(untrustedPrice.status).toBe(400);

    const create = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${renterToken}`)
      .send(bookingBody(equipmentIds[0], todayRange, 'Academic electronics project'));
    expect(create.status).toBe(201);
    const bookingId = create.body.booking.id as string;
    expect(create.body.booking).toMatchObject({
      status: 'PENDING',
      rentalDays: 2,
      dailyRentalPrice: '100.00',
      securityDeposit: '50.00',
      totalPrice: '250.00',
      notes: 'Academic electronics project',
    });
    const storedDateRange = await pool!.query(
      `SELECT (start_at AT TIME ZONE 'Asia/Kolkata')::date::text AS start_date,
              (end_at AT TIME ZONE 'Asia/Kolkata')::date::text AS exclusive_end_date,
              rental_days
       FROM bookings WHERE id = $1`,
      [bookingId],
    );
    expect(storedDateRange.rows[0]).toEqual({
      start_date: todayRange.startDate,
      exclusive_end_date: nextCalendarDate(todayRange.endDate),
      rental_days: 2,
    });

    const ownBookings = await request(app).get('/api/v1/bookings/me').set('Authorization', `Bearer ${renterToken}`);
    const receivedBookings = await request(app).get('/api/v1/bookings/received').set('Authorization', `Bearer ${ownerToken}`);
    const bookingDetails = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${renterToken}`);
    const unrelatedRead = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token(thirdRenterId)}`);
    expect(ownBookings.body.items.map((item: { id: string }) => item.id).includes(bookingId)).toBe(true);
    expect(receivedBookings.body.items.map((item: { id: string }) => item.id).includes(bookingId)).toBe(true);
    expect(bookingDetails.status).toBe(200);
    expect(unrelatedRead.status).toBe(404);

    const renterApproval = await request(app)
      .post(`/api/v1/bookings/${bookingId}/approve`)
      .set('Authorization', `Bearer ${renterToken}`);
    const earlyStart = await request(app)
      .post(`/api/v1/bookings/${bookingId}/start`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(renterApproval.status).toBe(403);
    expect(earlyStart.status).toBe(409);

    const approval = await request(app)
      .post(`/api/v1/bookings/${bookingId}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(approval.status).toBe(200);
    expect(approval.body.booking.status).toBe('APPROVED');
    const invalidReject = await request(app)
      .post(`/api/v1/bookings/${bookingId}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Too late' });
    expect(invalidReject.status).toBe(409);

    const start = await request(app)
      .post(`/api/v1/bookings/${bookingId}/start`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(start.status).toBe(200);
    expect(start.body.booking.status).toBe('ACTIVE');
    const renterCancellation = await request(app)
      .post(`/api/v1/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${renterToken}`);
    expect(renterCancellation.status).toBe(409);
    const returnRequest = await request(app)
      .post(`/api/v1/bookings/${bookingId}/request-return`)
      .set('Authorization', `Bearer ${renterToken}`);
    expect(returnRequest.status).toBe(200);
    expect(returnRequest.body.booking.status).toBe('RETURN_REQUESTED');
    const unrelatedCompletion = await request(app)
      .post(`/api/v1/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${token(thirdRenterId)}`);
    expect(unrelatedCompletion.status).toBe(403);
    const completion = await request(app)
      .post(`/api/v1/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const duplicateCompletion = await request(app)
      .post(`/api/v1/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(completion.status).toBe(200);
    expect(completion.body.booking.status).toBe('COMPLETED');
    expect(duplicateCompletion.status).toBe(409);
    const lifecycleHistory = await pool!.query(
      'SELECT previous_status, new_status FROM booking_status_history WHERE booking_id = $1 ORDER BY created_at, id',
      [bookingId],
    );
    expect(lifecycleHistory.rows.map((row) => row.new_status)).toEqual([
      'PENDING',
      'APPROVED',
      'ACTIVE',
      'RETURN_REQUESTED',
      'COMPLETED',
    ]);
    const lifecycleNotifications = await pool!.query(
      `SELECT count(*)::int AS count
       FROM notifications
       WHERE metadata->>'bookingId' = $1`,
      [bookingId],
    );
    expect(lifecycleNotifications.rows[0].count).toBe(5);

    const rejectBooking = await createBooking(otherRenterId, equipmentIds[1], dateRange(4));
    expect(rejectBooking.status).toBe(201);
    const rejection = await request(app)
      .post(`/api/v1/bookings/${rejectBooking.body.booking.id}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Equipment unavailable for the requested purpose.' });
    expect(rejection.status).toBe(200);
    expect(rejection.body.booking.status).toBe('REJECTED');
    const rejectHistory = await pool!.query(
      'SELECT reason FROM booking_status_history WHERE booking_id = $1 AND new_status = $2',
      [rejectBooking.body.booking.id, 'REJECTED'],
    );
    expect(rejectHistory.rows[0].reason).toBe('Equipment unavailable for the requested purpose.');

    const pendingCancel = await createBooking(thirdRenterId, equipmentIds[2], dateRange(5));
    const cancelPending = await request(app)
      .post(`/api/v1/bookings/${pendingCancel.body.booking.id}/cancel`)
      .set('Authorization', `Bearer ${token(thirdRenterId)}`);
    expect(cancelPending.status).toBe(200);
    expect(cancelPending.body.booking.status).toBe('CANCELLED');

    const approvedCancel = await createBooking(otherRenterId, equipmentIds[3], dateRange(6));
    const approveToCancel = await request(app)
      .post(`/api/v1/bookings/${approvedCancel.body.booking.id}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const cancelApproved = await request(app)
      .post(`/api/v1/bookings/${approvedCancel.body.booking.id}/cancel`)
      .set('Authorization', `Bearer ${token(otherRenterId)}`);
    expect(approveToCancel.status).toBe(200);
    expect(cancelApproved.status).toBe(200);
    expect(cancelApproved.body.booking.status).toBe('CANCELLED');

    const orgBooking = await createBooking(renterId, equipmentIds[8], dateRange(7));
    expect(orgBooking.status).toBe(201);
    const orgReceived = await request(app)
      .get('/api/v1/bookings/received')
      .set('Authorization', `Bearer ${token(orgAdminId)}`);
    expect(orgReceived.body.items.some((item: { id: string }) => item.id === orgBooking.body.booking.id)).toBe(true);
    const orgMemberRead = await request(app)
      .get(`/api/v1/bookings/${orgBooking.body.booking.id}`)
      .set('Authorization', `Bearer ${token(orgMemberId)}`);
    const memberApproval = await request(app)
      .post(`/api/v1/bookings/${orgBooking.body.booking.id}/approve`)
      .set('Authorization', `Bearer ${token(orgMemberId)}`);
    const orgApproval = await request(app)
      .post(`/api/v1/bookings/${orgBooking.body.booking.id}/approve`)
      .set('Authorization', `Bearer ${token(orgAdminId)}`);
    expect(orgMemberRead.status).toBe(404);
    expect(memberApproval.status).toBe(403);
    expect(orgApproval.status).toBe(200);
    const orgMaintenanceRange = dateRange(70);
    const unauthorizedOrgMaintenance = await request(app)
      .post(`/api/v1/equipment/${equipmentIds[8]}/maintenance`)
      .set('Authorization', `Bearer ${token(orgMemberId)}`)
      .send({ ...orgMaintenanceRange, reason: 'Member cannot manage maintenance.' });
    const orgMaintenance = await request(app)
      .post(`/api/v1/equipment/${equipmentIds[8]}/maintenance`)
      .set('Authorization', `Bearer ${token(orgAdminId)}`)
      .send({ ...orgMaintenanceRange, reason: 'Organization equipment maintenance.' });
    expect(unauthorizedOrgMaintenance.status).toBe(403);
    expect(orgMaintenance.status).toBe(201);
    const orgMaintenanceDeletion = await request(app)
      .delete(`/api/v1/equipment/${equipmentIds[8]}/maintenance/${orgMaintenance.body.maintenance.id}`)
      .set('Authorization', `Bearer ${token(orgAdminId)}`);
    expect(orgMaintenanceDeletion.status).toBe(204);

    const overlappingRange = dateRange(10, 2);
    const raceResults = await Promise.all([
      createBooking(otherRenterId, equipmentIds[4], overlappingRange),
      createBooking(thirdRenterId, equipmentIds[4], overlappingRange),
    ]);
    expect(raceResults.map((result) => result.status).sort()).toEqual([201, 409]);
    const adjacentRange = dateRange(12);
    const adjacent = await createBooking(expiryRenterId, equipmentIds[4], adjacentRange);
    expect(adjacent.status).toBe(201);
    const adjacentAvailability = await request(app)
      .get(`/api/v1/equipment/${equipmentIds[4]}/availability`)
      .query(adjacentRange);
    expect(adjacentAvailability.body.available).toBe(false);
    const openAdjacentRange = dateRange(13);
    const openAvailability = await request(app)
      .get(`/api/v1/equipment/${equipmentIds[4]}/availability`)
      .query(openAdjacentRange);
    expect(openAvailability.body.available).toBe(true);

    const sqlClient = await pool!.connect();
    try {
      await sqlClient.query('BEGIN');
      await sqlClient.query('SAVEPOINT exclusion_check');
      await expect(
        sqlClient.query(
          `INSERT INTO bookings (
             equipment_id, renter_id, start_at, end_at, rental_days,
             daily_rental_price_snapshot, security_deposit_snapshot, total_price
           )
           VALUES (
             $1, $2,
             $3::date::timestamp AT TIME ZONE 'Asia/Kolkata',
             $4::date::timestamp AT TIME ZONE 'Asia/Kolkata',
             2, 100, 50, 250
           )`,
          [equipmentIds[4], orgMemberId, overlappingRange.startDate, nextCalendarDate(overlappingRange.endDate)],
        ),
      ).rejects.toMatchObject({ code: '23P01' });
      await sqlClient.query('ROLLBACK TO SAVEPOINT exclusion_check');
      await sqlClient.query('RELEASE SAVEPOINT exclusion_check');
      await sqlClient.query('COMMIT');
    } catch (error) {
      await sqlClient.query('ROLLBACK');
      throw error;
    } finally {
      sqlClient.release();
    }

    const cappedDate = dateRange(30);
    const cappedAttempts = await Promise.all(
      equipmentIds.slice(5, 9).map((equipmentId) => createBooking(capRenterId, equipmentId, cappedDate)),
    );
    expect(cappedAttempts.map((result) => result.status).sort()).toEqual([201, 201, 201, 409]);
    const capCount = await pool!.query(
      `SELECT count(*)::int AS count FROM bookings
       WHERE renter_id = $1 AND status = 'PENDING' AND expires_at > CURRENT_TIMESTAMP`,
      [capRenterId],
    );
    expect(capCount.rows[0].count).toBe(3);
    const capHistoryCount = await pool!.query(
      `SELECT count(*)::int AS count FROM booking_status_history history
       JOIN bookings booking ON booking.id = history.booking_id
       WHERE booking.renter_id = $1 AND history.new_status = 'PENDING'`,
      [capRenterId],
    );
    expect(capHistoryCount.rows[0].count).toBe(3);

    const maintenanceRange = dateRange(40, 2);
    const maintenance = await request(app)
      .post(`/api/v1/equipment/${equipmentIds[9]}/maintenance`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...maintenanceRange, reason: 'Scheduled equipment maintenance' });
    expect(maintenance.status).toBe(201);
    const blockedBooking = await createBooking(otherRenterId, equipmentIds[9], maintenanceRange);
    expect(blockedBooking.status).toBe(409);
    const maintenanceList = await request(app).get(`/api/v1/equipment/${equipmentIds[9]}/maintenance`);
    expect(maintenanceList.body.items).toHaveLength(1);
    const unauthorizedMaintenanceDelete = await request(app)
      .delete(`/api/v1/equipment/${equipmentIds[9]}/maintenance/${maintenance.body.maintenance.id}`)
      .set('Authorization', `Bearer ${token(orgMemberId)}`);
    const maintenanceDelete = await request(app)
      .delete(`/api/v1/equipment/${equipmentIds[9]}/maintenance/${maintenance.body.maintenance.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(unauthorizedMaintenanceDelete.status).toBe(403);
    expect(maintenanceDelete.status).toBe(204);

    const bookingDuringMaintenance = await createBooking(otherRenterId, equipmentIds[10], dateRange(42));
    expect(bookingDuringMaintenance.status).toBe(201);
    const maintenanceOverBooking = await request(app)
      .post(`/api/v1/equipment/${equipmentIds[10]}/maintenance`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...dateRange(42), reason: 'Should be rejected due to booking.' });
    expect(maintenanceOverBooking.status).toBe(409);

    const expiring = await createBooking(expiryRenterId, equipmentIds[11], dateRange(50));
    expect(expiring.status).toBe(201);
    const expiredBookingId = expiring.body.booking.id as string;
    await pool!.query(
      'UPDATE bookings SET expires_at = CURRENT_TIMESTAMP - interval \'1 second\' WHERE id = $1',
      [expiredBookingId],
    );
    const expiryAvailability = await request(app)
      .get(`/api/v1/equipment/${equipmentIds[11]}/availability`)
      .query(dateRange(50));
    expect(expiryAvailability.body.available).toBe(true);
    const expiredStatus = await pool!.query('SELECT status FROM bookings WHERE id = $1', [expiredBookingId]);
    expect(expiredStatus.rows[0].status).toBe('CANCELLED');
    const expiryHistoryCount = await pool!.query(
      `SELECT count(*)::int AS count FROM booking_status_history
       WHERE booking_id = $1 AND reason = 'Pending request expired after 48 hours.'`,
      [expiredBookingId],
    );
    expect(expiryHistoryCount.rows[0].count).toBe(1);
    const expiryNotificationCount = await pool!.query(
      `SELECT count(*)::int AS count FROM notifications
       WHERE metadata->>'bookingId' = $1`,
      [expiredBookingId],
    );
    expect(expiryNotificationCount.rows[0].count).toBe(3);

    const workerExpiring = await createBooking(expiryRenterId, equipmentIds[1], dateRange(51));
    expect(workerExpiring.status).toBe(201);
    await pool!.query(
      'UPDATE bookings SET expires_at = CURRENT_TIMESTAMP - interval \'1 second\' WHERE id = $1',
      [workerExpiring.body.booking.id],
    );
    const expiredByWorker = await bookingRepository.expirePending();
    const repeatedExpiry = await bookingRepository.expirePending();
    expect(expiredByWorker).toBeGreaterThanOrEqual(1);
    expect(repeatedExpiry).toBe(0);

    const inactiveUpdate = await request(app)
      .patch(`/api/v1/equipment/${equipmentIds[11]}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'INACTIVE' });
    expect(inactiveUpdate.status).toBe(200);
    const inactiveBooking = await createBooking(otherRenterId, equipmentIds[11], dateRange(60));
    expect(inactiveBooking.status).toBe(409);
  }, 120000);
});
