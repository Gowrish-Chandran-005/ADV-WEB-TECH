import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PoolClient } from 'pg';
import { databaseConfig, env } from '../src/config/env';
import { pool as applicationPool } from '../src/config/database';
import { runMigrations } from '../src/db/migration-runner';

const enabled = process.env.LENDR_RUN_DB_TESTS === 'true';
const projectId = env.MIGRATION_EXPECTED_NEON_PROJECT_ID ?? null;
const branchId = env.MIGRATION_EXPECTED_NEON_BRANCH_ID ?? null;

const suite = enabled ? describe : describe.skip;

async function expectSqlState(
  client: PoolClient,
  sql: string,
  parameters: unknown[],
  expectedCode: string,
): Promise<void> {
  await client.query('SAVEPOINT expected_constraint_failure');
  try {
    await expect(client.query(sql, parameters)).rejects.toMatchObject({ code: expectedCode });
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT expected_constraint_failure');
    await client.query('RELEASE SAVEPOINT expected_constraint_failure');
  }
}

async function createFixture(client: PoolClient): Promise<{
  ownerId: string;
  renterId: string;
  otherRenterId: string;
  equipmentId: string;
}> {
  const ownerId = randomUUID();
  const renterId = randomUUID();
  const otherRenterId = randomUUID();
  const equipmentId = randomUUID();
  const category = await client.query<{ id: string }>(
    "SELECT id FROM categories WHERE slug = 'cameras'",
  );

  for (const [id, name] of [
    [ownerId, 'Schema Test Owner'],
    [renterId, 'Schema Test Renter'],
    [otherRenterId, 'Schema Test Other Renter'],
  ]) {
    await client.query(
      `INSERT INTO users (id, email, password_hash, full_name)
       VALUES ($1, $2, 'test-hash-not-for-authentication', $3)`,
      [id, `${id}@vitstudent.ac.in`, name],
    );
  }

  await client.query(
    `INSERT INTO equipment
       (id, owner_user_id, category_id, title, description, pickup_location, use_cases)
     VALUES ($1, $2, $3, 'Schema test camera', 'Integration test item', 'TT', ARRAY['filmmaking','night shooting'])`,
    [equipmentId, ownerId, category.rows[0].id],
  );

  return { ownerId, renterId, otherRenterId, equipmentId };
}

async function insertBooking(
  client: PoolClient,
  input: {
    id?: string;
    equipmentId: string;
    renterId: string;
    start: string;
    end: string;
    status?: string;
  },
): Promise<string> {
  const id = input.id ?? randomUUID();
  await client.query(
    `INSERT INTO bookings
       (id, equipment_id, renter_id, start_at, end_at, status, rental_days,
        daily_rental_price_snapshot, security_deposit_snapshot, total_price)
     VALUES
       ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, 2, 100, 50, 250)`,
    [id, input.equipmentId, input.renterId, input.start, input.end, input.status ?? 'PENDING'],
  );
  return id;
}

suite('PostgreSQL schema integration', () => {
  const pool = applicationPool;

  beforeAll(async () => {
    if (!pool || !databaseConfig) {
      throw new Error('Database integration tests require configured PostgreSQL settings.');
    }
    await runMigrations(
      pool,
      path.resolve(__dirname, '../migrations'),
      { projectId, branchId },
      'status',
    );
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('creates the schema, seeds categories and enforces constraints and review integrity', async () => {
    const client = await pool!.connect();
    try {
      await client.query('BEGIN');
      const seeded = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM categories',
      );
      expect(Number(seeded.rows[0].count)).toBe(11);
      const conditionMetadata = await client.query<{ column_default: string | null }>(
        `SELECT column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'equipment' AND column_name = 'condition'`,
      );
      expect(conditionMetadata.rows[0].column_default).toContain('UNKNOWN');
      expect(await client.query("SELECT 1 FROM pg_extension WHERE extname = 'btree_gist'")).toHaveProperty(
        'rowCount',
        1,
      );

      const fixture = await createFixture(client);
      const bookingId = await insertBooking(client, {
        equipmentId: fixture.equipmentId,
        renterId: fixture.renterId,
        start: '2030-01-01 00:00:00+05:30',
        end: '2030-01-03 00:00:00+05:30',
        status: 'COMPLETED',
      });

      await expectSqlState(
        client,
        `INSERT INTO equipment
           (owner_user_id, category_id, title, description, pickup_location, daily_rental_price)
         VALUES ($1, $2, 'Invalid', 'Invalid price', 'TT', -1)`,
        [fixture.ownerId, (await client.query("SELECT id FROM categories WHERE slug='cameras'")).rows[0].id],
        '23514',
      );
      await expectSqlState(
        client,
        `INSERT INTO equipment
           (owner_user_id, category_id, title, description, pickup_location, condition)
         VALUES ($1, $2, 'Invalid condition', 'Invalid condition test', 'TT', 'BROKEN')`,
        [fixture.ownerId, (await client.query("SELECT id FROM categories WHERE slug='cameras'")).rows[0].id],
        '23514',
      );
      await expectSqlState(
        client,
        `INSERT INTO bookings
           (equipment_id, renter_id, start_at, end_at, rental_days,
            daily_rental_price_snapshot, security_deposit_snapshot, total_price)
         VALUES ($1, $2, '2030-03-01 00:00:00+05:30', '2030-04-01 00:00:00+05:30', 31, 100, 50, 3150)`,
        [fixture.equipmentId, fixture.renterId],
        '23514',
      );
      await expectSqlState(
        client,
        `INSERT INTO bookings
           (equipment_id, renter_id, start_at, end_at, rental_days,
            daily_rental_price_snapshot, security_deposit_snapshot, total_price)
         VALUES ($1, $2, '2030-01-01 00:00:00+05:30', '2030-01-03 00:00:00+05:30', 2, 100, 50, 249)`,
        [fixture.equipmentId, fixture.renterId],
        '23514',
      );
      await expectSqlState(
        client,
        `INSERT INTO bookings
           (equipment_id, renter_id, start_at, end_at, rental_days,
            daily_rental_price_snapshot, security_deposit_snapshot, total_price)
         VALUES ($1, $2, '2030-01-01 00:00:00+05:30', '2030-01-03 00:00:00+05:30', 2, 100, 50, 250)`,
        [fixture.equipmentId, randomUUID()],
        '23503',
      );
      const blockingBookingId = await insertBooking(client, {
        equipmentId: fixture.equipmentId,
        renterId: fixture.otherRenterId,
        start: '2030-01-01 00:00:00+05:30',
        end: '2030-01-03 00:00:00+05:30',
      });
      await expectSqlState(
        client,
        `INSERT INTO bookings
           (equipment_id, renter_id, start_at, end_at, rental_days,
            daily_rental_price_snapshot, security_deposit_snapshot, total_price)
         VALUES ($1, $2, '2030-01-02 00:00:00+05:30', '2030-01-04 00:00:00+05:30', 2, 100, 50, 250)`,
        [fixture.equipmentId, fixture.otherRenterId],
        '23P01',
      );
      await client.query(
        "UPDATE bookings SET status = 'ACTIVE' WHERE id = $1",
        [blockingBookingId],
      );
      await expectSqlState(
        client,
        `INSERT INTO bookings
           (equipment_id, renter_id, start_at, end_at, rental_days,
            daily_rental_price_snapshot, security_deposit_snapshot, total_price)
         VALUES ($1, $2, '2030-01-02 00:00:00+05:30', '2030-01-04 00:00:00+05:30', 2, 100, 50, 250)`,
        [fixture.equipmentId, fixture.renterId],
        '23P01',
      );

      await insertBooking(client, {
        equipmentId: fixture.equipmentId,
        renterId: fixture.otherRenterId,
        start: '2030-01-03 00:00:00+05:30',
        end: '2030-01-05 00:00:00+05:30',
      });

      const pendingReviewBooking = await insertBooking(client, {
        equipmentId: fixture.equipmentId,
        renterId: fixture.renterId,
        start: '2030-02-01 00:00:00+05:30',
        end: '2030-02-03 00:00:00+05:30',
      });
      await expectSqlState(
        client,
        `INSERT INTO reviews (booking_id, reviewer_id, reviewed_user_id, equipment_id, rating)
         VALUES ($1, $2, $3, $4, 5)`,
        [pendingReviewBooking, fixture.renterId, fixture.ownerId, fixture.equipmentId],
        '23514',
      );
      await client.query(
        "UPDATE bookings SET status = 'COMPLETED' WHERE id = $1",
        [pendingReviewBooking],
      );

      for (const [start, end] of [
        ['2032-01-01 00:00:00+05:30', '2032-01-03 00:00:00+05:30'],
        ['2034-01-01 00:00:00+05:30', '2034-01-03 00:00:00+05:30'],
        ['2036-01-01 00:00:00+05:30', '2036-01-03 00:00:00+05:30'],
      ]) {
        await insertBooking(client, {
          equipmentId: fixture.equipmentId,
          renterId: fixture.renterId,
          start,
          end,
        });
      }
      await expectSqlState(
        client,
        `INSERT INTO bookings
           (equipment_id, renter_id, start_at, end_at, rental_days,
            daily_rental_price_snapshot, security_deposit_snapshot, total_price)
         VALUES ($1, $2, '2038-01-01 00:00:00+05:30', '2038-01-03 00:00:00+05:30',
                 2, 100, 50, 250)`,
        [fixture.equipmentId, fixture.renterId],
        '23514',
      );

      await client.query(
        'INSERT INTO favorites (user_id, equipment_id) VALUES ($1, $2)',
        [fixture.renterId, fixture.equipmentId],
      );
      await expectSqlState(
        client,
        'INSERT INTO favorites (user_id, equipment_id) VALUES ($1, $2)',
        [fixture.renterId, fixture.equipmentId],
        '23505',
      );

      await client.query(
        `INSERT INTO reviews (booking_id, reviewer_id, reviewed_user_id, equipment_id, rating)
         VALUES ($1, $2, $3, $4, 5)`,
        [bookingId, fixture.renterId, fixture.ownerId, fixture.equipmentId],
      );
      await expectSqlState(
        client,
        `INSERT INTO reviews (booking_id, reviewer_id, reviewed_user_id, equipment_id, rating)
         VALUES ($1, $2, $3, $4, 4)`,
        [bookingId, fixture.otherRenterId, fixture.ownerId, fixture.equipmentId],
        '23514',
      );
      await expectSqlState(
        client,
        `INSERT INTO reviews (booking_id, reviewer_id, reviewed_user_id, equipment_id, rating)
         VALUES ($1, $2, $3, $4, 4)`,
        [bookingId, fixture.renterId, fixture.ownerId, fixture.equipmentId],
        '23505',
      );

      const foreignKeys = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM information_schema.table_constraints
         WHERE constraint_type = 'FOREIGN KEY'
           AND table_schema = 'public'`,
      );
      expect(Number(foreignKeys.rows[0].count)).toBeGreaterThan(0);
      const integrityConstraints = await client.query<{ constraint_name: string }>(
        `SELECT conname AS constraint_name
         FROM pg_constraint
         WHERE conname IN (
           'reviews_booking_equipment_renter_fk',
           'bookings_no_overlapping_blocking_equipment'
         )`,
      );
      expect(integrityConstraints.rows.map((row) => row.constraint_name)).toContain(
        'reviews_booking_equipment_renter_fk',
      );
      expect(integrityConstraints.rows.map((row) => row.constraint_name)).toContain(
        'bookings_no_overlapping_blocking_equipment',
      );
      await client.query('ROLLBACK');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }, 30000);

  it('prevents two concurrent overlapping booking inserts from both committing', async () => {
    const fixtureClient = await pool!.connect();
    const firstClient = await pool!.connect();
    const secondClient = await pool!.connect();
    const fixture = await createFixture(fixtureClient);
    const firstBookingId = randomUUID();
    const secondBookingId = randomUUID();
    const pendingLimitFirstId = randomUUID();
    const pendingLimitSecondId = randomUUID();
    const pendingLimitBaseIds = [
      await insertBooking(fixtureClient, {
        equipmentId: fixture.equipmentId,
        renterId: fixture.renterId,
        start: '2032-01-01 00:00:00+05:30',
        end: '2032-01-03 00:00:00+05:30',
      }),
      await insertBooking(fixtureClient, {
        equipmentId: fixture.equipmentId,
        renterId: fixture.renterId,
        start: '2034-01-01 00:00:00+05:30',
        end: '2034-01-03 00:00:00+05:30',
      }),
    ];

    try {
      await firstClient.query('BEGIN');
      await firstClient.query(
        `INSERT INTO bookings
           (id, equipment_id, renter_id, start_at, end_at, rental_days,
            daily_rental_price_snapshot, security_deposit_snapshot, total_price)
         VALUES ($1, $2, $3, '2031-01-01 00:00:00+05:30', '2031-01-03 00:00:00+05:30',
                 2, 100, 50, 250)`,
        [firstBookingId, fixture.equipmentId, fixture.otherRenterId],
      );
      await secondClient.query('BEGIN');
      const secondInsert = secondClient
        .query(
          `INSERT INTO bookings
             (id, equipment_id, renter_id, start_at, end_at, rental_days,
              daily_rental_price_snapshot, security_deposit_snapshot, total_price)
           VALUES ($1, $2, $3, '2031-01-02 00:00:00+05:30', '2031-01-04 00:00:00+05:30',
                   2, 100, 50, 250)`,
          [secondBookingId, fixture.equipmentId, fixture.renterId],
        )
        .then(
          () => ({ error: null }),
          (error: unknown) => ({ error }),
        );

      await new Promise((resolve) => setTimeout(resolve, 150));
      await firstClient.query('COMMIT');
      expect((await secondInsert).error).toMatchObject({ code: '23P01' });
      await secondClient.query('ROLLBACK');

      await firstClient.query('BEGIN');
      await insertBooking(firstClient, {
        id: pendingLimitFirstId,
        equipmentId: fixture.equipmentId,
        renterId: fixture.renterId,
        start: '2036-01-01 00:00:00+05:30',
        end: '2036-01-03 00:00:00+05:30',
      });
      await secondClient.query('BEGIN');
      const fourthPendingInsert = insertBooking(secondClient, {
        id: pendingLimitSecondId,
        equipmentId: fixture.equipmentId,
        renterId: fixture.renterId,
        start: '2038-01-01 00:00:00+05:30',
        end: '2038-01-03 00:00:00+05:30',
      }).then(
        () => ({ error: null }),
        (error: unknown) => ({ error }),
      );
      await new Promise((resolve) => setTimeout(resolve, 150));
      await firstClient.query('COMMIT');
      expect((await fourthPendingInsert).error).toMatchObject({ code: '23514' });
      await secondClient.query('ROLLBACK');
    } finally {
      await firstClient.query('ROLLBACK').catch(() => undefined);
      await secondClient.query('ROLLBACK').catch(() => undefined);
      await firstClient.release();
      await secondClient.release();
      await fixtureClient.query(
        'DELETE FROM bookings WHERE id = ANY($1::uuid[])',
        [[...pendingLimitBaseIds, firstBookingId, secondBookingId, pendingLimitFirstId, pendingLimitSecondId]],
      );
      await fixtureClient.query('DELETE FROM equipment WHERE id = $1', [fixture.equipmentId]);
      await fixtureClient.query(
        'DELETE FROM users WHERE id = ANY($1::uuid[])',
        [[fixture.ownerId, fixture.renterId, fixture.otherRenterId]],
      );
      fixtureClient.release();
    }
  }, 30000);

  it('rolls back a failed migration transaction without leaving its temporary object', async () => {
    const client = await pool!.connect();
    const temporaryTable = `migration_rollback_probe_${randomUUID().replaceAll('-', '')}`;
    try {
      await client.query('BEGIN');
      await client.query(`CREATE TEMP TABLE ${temporaryTable} (id integer)`);
      await expect(client.query('SELECT * FROM relation_that_does_not_exist')).rejects.toMatchObject({
        code: '42P01',
      });
      await client.query('ROLLBACK');
      const result = await client.query<{ exists: boolean }>(
        `SELECT to_regclass('pg_temp.${temporaryTable}') IS NOT NULL AS exists`,
      );
      expect(result.rows[0].exists).toBe(false);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  }, 30000);
});
