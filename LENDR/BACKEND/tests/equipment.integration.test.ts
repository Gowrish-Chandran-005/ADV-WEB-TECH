import { randomUUID } from 'node:crypto';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/config/database';
import { env } from '../src/config/env';
import { createApp } from '../src/app';
import { runMigrations } from '../src/db/migration-runner';

const enabled = process.env.LENDR_RUN_DB_TESTS === 'true';
const suite = enabled ? describe : describe.skip;
const fixtureId = randomUUID();
const userIds = [randomUUID(), randomUUID(), randomUUID()];
const [ownerId, organizationAdminId, organizationMemberId] = userIds;
const organizationId = randomUUID();
const equipmentIds: string[] = [];
const bookingIds: string[] = [];
const app = createApp();

function token(userId: string): string {
  if (!env.AUTH_JWT_SECRET) {
    throw new Error('AUTH_JWT_SECRET is required for equipment integration tests.');
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

function listingBody(title: string, dailyRentalPrice: number, status?: 'ACTIVE' | 'INACTIVE') {
  return {
    categoryId: equipmentCategoryId,
    title,
    description: `Integration description ${fixtureId}`,
    tags: ['phase3', 'integration'],
    features: ['test fixture'],
    useCases: ['Arduino/IoT', 'academic projects'],
    specifications: { fixture: fixtureId },
    imageUrls: ['https://example.com/lendr-equipment-test.jpg'],
    dailyRentalPrice,
    securityDeposit: 50,
    maxRentalDays: 30,
    pickupLocation: 'TT',
    ...(status ? { status } : {}),
  };
}

let equipmentCategoryId = '';

suite('equipment PostgreSQL integration', () => {
  beforeAll(async () => {
    if (!pool) {
      throw new Error('Equipment integration tests require PostgreSQL configuration.');
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

    for (const [index, id] of userIds.entries()) {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, full_name)
         VALUES ($1, $2, 'integration-test-hash', $3)`,
        [id, `equipment-${fixtureId}-${index}@vitstudent.ac.in`, `Equipment Test ${index}`],
      );
    }
    await pool.query(
      `INSERT INTO organizations (id, name, slug)
       VALUES ($1, $2, $3)`,
      [organizationId, `Equipment Test ${fixtureId}`, `equipment-test-${fixtureId}`],
    );
    await pool.query(
      `INSERT INTO organization_memberships (organization_id, user_id, membership_role)
       VALUES ($1, $2, 'ADMIN'), ($1, $3, 'MEMBER')`,
      [organizationId, organizationAdminId, organizationMemberId],
    );
  }, 30000);

  afterAll(async () => {
    if (!pool) {
      return;
    }
    if (bookingIds.length) {
      await pool.query('DELETE FROM bookings WHERE id = ANY($1::uuid[])', [bookingIds]);
    }
    if (equipmentIds.length) {
      await pool.query('DELETE FROM favorites WHERE equipment_id = ANY($1::uuid[])', [equipmentIds]);
      await pool.query('DELETE FROM equipment WHERE id = ANY($1::uuid[])', [equipmentIds]);
    }
    await pool.query('DELETE FROM organization_memberships WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
  });

  it('supports discovery, creation, authorization, favorites, safe deactivation and archival', async () => {
    const ownerToken = token(ownerId);
    const organizationAdminToken = token(organizationAdminId);
    const organizationMemberToken = token(organizationMemberId);
    const unauthenticatedWrite = await request(app)
      .post('/api/v1/equipment')
      .send(listingBody(`Unauthenticated ${fixtureId}`, 15));
    expect(unauthenticatedWrite.status).toBe(401);

    const categories = await request(app).get('/api/v1/categories');
    expect(categories.status).toBe(200);
    expect(categories.body.items).toHaveLength(11);

    const invalidPrice = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...listingBody(`Invalid price ${fixtureId}`, 15), dailyRentalPrice: -1 });
    const invalidCategory = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...listingBody(`Invalid category ${fixtureId}`, 15), categoryId: randomUUID() });
    const attemptedPrivilege = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...listingBody(`Privilege ${fixtureId}`, 15), ownerUserId: organizationAdminId });
    expect(invalidPrice.status).toBe(400);
    expect(invalidCategory.status).toBe(422);
    expect(attemptedPrivilege.status).toBe(400);

    const created = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(listingBody(`Arduino IoT ${fixtureId}`, 25));
    expect(created.status).toBe(201);
    const listingId = created.body.equipment.id as string;
    equipmentIds.push(listingId);
    expect(created.body.equipment.ownerUserId).toBe(ownerId);
    expect(created.body.equipment.useCases).toContain('Arduino/IoT');

    const inactiveCreated = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(listingBody(`Inactive ${fixtureId}`, 10, 'INACTIVE'));
    expect(inactiveCreated.status).toBe(201);
    const inactiveId = inactiveCreated.body.equipment.id as string;
    equipmentIds.push(inactiveId);

    const publicBrowse = await request(app)
      .get('/api/v1/equipment')
      .query({ q: fixtureId, category: 'electronics', minPrice: '20', maxPrice: '30', page: '1', pageSize: '5' });
    expect(publicBrowse.status).toBe(200);
    expect(publicBrowse.body.items.map((item: { id: string }) => item.id)).toEqual([listingId]);
    expect(publicBrowse.body.pagination.total).toBe(1);
    const hiddenDetails = await request(app).get(`/api/v1/equipment/${inactiveId}`);
    expect(hiddenDetails.status).toBe(404);
    const invalidPagination = await request(app).get('/api/v1/equipment?pageSize=500');
    expect(invalidPagination.status).toBe(400);

    const ownEquipment = await request(app)
      .get('/api/v1/users/me/equipment')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownEquipment.status).toBe(200);
    expect(ownEquipment.body.items.map((item: { id: string }) => item.id).sort()).toEqual(
      [listingId, inactiveId].sort(),
    );

    const ownerUpdate = await request(app)
      .patch(`/api/v1/equipment/${listingId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ useCases: ['filmmaking', 'night shooting'] });
    expect(ownerUpdate.status).toBe(200);
    expect(ownerUpdate.body.equipment.useCases).toEqual(['filmmaking', 'night shooting']);

    const organizationListingResponse = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${organizationAdminToken}`)
      .send({
        ...listingBody(`Organization ${fixtureId}`, 40),
        organizationId,
      });
    expect(organizationListingResponse.status).toBe(201);
    const organizationListingId = organizationListingResponse.body.equipment.id as string;
    equipmentIds.push(organizationListingId);
    expect(organizationListingResponse.body.equipment.ownerUserId).toBe(organizationAdminId);
    const unauthorizedOrganizationEdit = await request(app)
      .patch(`/api/v1/equipment/${organizationListingId}`)
      .set('Authorization', `Bearer ${organizationMemberToken}`)
      .send({ title: `Unauthorized ${fixtureId}` });
    const authorizedOrganizationEdit = await request(app)
      .patch(`/api/v1/equipment/${organizationListingId}`)
      .set('Authorization', `Bearer ${organizationAdminToken}`)
      .send({ title: `Authorized ${fixtureId}` });
    expect(unauthorizedOrganizationEdit.status).toBe(404);
    expect(authorizedOrganizationEdit.status).toBe(200);

    const favorite = await request(app)
      .post(`/api/v1/equipment/${listingId}/favorite`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const duplicateFavorite = await request(app)
      .post(`/api/v1/equipment/${listingId}/favorite`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const favorites = await request(app)
      .get('/api/v1/users/me/favorites')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(favorite.status).toBe(200);
    expect(duplicateFavorite.status).toBe(200);
    expect(favorites.body.items.map((item: { id: string }) => item.id)).toEqual([listingId]);
    expect(
      (
        await request(app)
          .get('/api/v1/users/me/favorites')
          .set('Authorization', `Bearer ${organizationAdminToken}`)
      ).body.items,
    ).toHaveLength(0);

    const pendingBookingId = randomUUID();
    await pool!.query(
      `INSERT INTO bookings (
         id, equipment_id, renter_id, start_at, end_at, rental_days,
         daily_rental_price_snapshot, security_deposit_snapshot, total_price
       )
       VALUES ($1, $2, $3, '2040-01-01 00:00:00+05:30', '2040-01-03 00:00:00+05:30',
               2, 25, 50, 100)`,
      [pendingBookingId, listingId, organizationAdminId],
    );
    bookingIds.push(pendingBookingId);

    const deactivateConflict = await request(app)
      .patch(`/api/v1/equipment/${listingId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'INACTIVE' });
    const archiveConflict = await request(app)
      .delete(`/api/v1/equipment/${listingId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(deactivateConflict.status).toBe(409);
    expect(archiveConflict.status).toBe(409);

    await pool!.query("UPDATE bookings SET status = 'CANCELLED' WHERE id = $1", [pendingBookingId]);
    const inactive = await request(app)
      .patch(`/api/v1/equipment/${listingId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'INACTIVE' });
    expect(inactive.status).toBe(200);
    const noLongerPublic = await request(app)
      .get('/api/v1/equipment')
      .query({ q: `Arduino IoT ${fixtureId}` });
    expect(noLongerPublic.body.items).toEqual([]);

    const bookingForInactive = await pool!.query(
      `INSERT INTO bookings (
         equipment_id, renter_id, start_at, end_at, rental_days,
         daily_rental_price_snapshot, security_deposit_snapshot, total_price
       )
       VALUES ($1, $2, '2041-01-01 00:00:00+05:30', '2041-01-03 00:00:00+05:30',
               2, 25, 50, 100)`,
      [listingId, organizationAdminId],
    ).then(
      () => null,
      (error: unknown) => error,
    );
    expect(bookingForInactive).toMatchObject({ code: '23514', constraint: 'bookings_equipment_must_be_active' });

    const archived = await request(app)
      .delete(`/api/v1/equipment/${inactiveId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(archived.status).toBe(200);
    expect(archived.body.status).toBe('archived');
    const archiveDetails = await request(app).get(`/api/v1/equipment/${inactiveId}`);
    expect(archiveDetails.status).toBe(404);

    const favoriteRemoval = await request(app)
      .delete(`/api/v1/equipment/${listingId}/favorite`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(favoriteRemoval.status).toBe(204);
  }, 60000);
});
