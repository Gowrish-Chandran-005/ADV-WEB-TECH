import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/config/database';
import { env } from '../src/config/env';
import { createApp } from '../src/app';
import { currentIstDate } from '../src/modules/bookings/booking.validation';

const enabled = process.env.LENDR_RUN_DB_TESTS === 'true';
const suite = enabled ? describe : describe.skip;

const fixtureId = randomUUID();
const studentAId = randomUUID(); // Requester
const studentBId = randomUUID(); // Offerer 1
const studentCId = randomUUID(); // Offerer 2 / Bystander

const app = createApp();

function token(userId: string): string {
  if (!env.AUTH_JWT_SECRET) {
    throw new Error('AUTH_JWT_SECRET is required.');
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

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

suite('Wanted Board and Notifications PostgreSQL Integration', () => {
  let categoryId: string;
  let equipmentAId: string; // Owned by student A
  let equipmentB1Id: string; // Owned by student B
  let equipmentB2Id: string; // Owned by student B
  let equipmentCId: string; // Owned by student C

  let createdRequestId: string;
  let createdOffer1Id: string;
  let createdOffer2Id: string;

  const today = currentIstDate();
  const startDate = addDays(today, 12);
  const endDate = addDays(today, 14);

  beforeAll(async () => {
    if (!pool) {
      throw new Error('Database pool not configured.');
    }

    // 1. Get a real category
    const catRes = await pool.query<{ id: string }>(
      "SELECT id FROM categories WHERE slug = 'cameras' LIMIT 1",
    );
    categoryId = catRes.rows[0].id;

    // 2. Create test students
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, registration_number, phone, role, status)
       VALUES
         ($1, $4, 'hash', 'Aarav Wanted', '21BCE1001', '+919999900001', 'STUDENT', 'ACTIVE'),
         ($2, $5, 'hash', 'Bhavna Offerer', '21BCE1002', '+919999900002', 'STUDENT', 'ACTIVE'),
         ($3, $6, 'hash', 'Chirag Peer', '21BCE1003', '+919999900003', 'STUDENT', 'ACTIVE')`,
      [
        studentAId,
        studentBId,
        studentCId,
        `student-a-${fixtureId}@vitstudent.ac.in`,
        `student-b-${fixtureId}@vitstudent.ac.in`,
        `student-c-${fixtureId}@vitstudent.ac.in`,
      ],
    );

    // 3. Create test equipment for students
    equipmentAId = randomUUID();
    equipmentB1Id = randomUUID();
    equipmentB2Id = randomUUID();
    equipmentCId = randomUUID();

    await pool.query(
      `INSERT INTO equipment (id, owner_user_id, category_id, title, description, daily_rental_price, pickup_location, status)
       VALUES
         ($1, $5, $8, 'Student A Sony Rig', 'Cam equipment', 500, 'SJT', 'ACTIVE'),
         ($2, $6, $8, 'Student B Canon R6', 'Matching Canon camera kit', 450, 'TT', 'ACTIVE'),
         ($3, $6, $8, 'Student B GoPro 11', 'Action camera', 250, 'MB', 'ACTIVE'),
         ($4, $7, $8, 'Student C Red Dragon', 'Cinema camera', 1200, 'SMV', 'ACTIVE')`,
      [
        equipmentAId,
        equipmentB1Id,
        equipmentB2Id,
        equipmentCId,
        studentAId,
        studentBId,
        studentCId,
        categoryId,
      ],
    );
  }, 30000);

  afterAll(async () => {
    if (!pool) return;
    // Clean up created test data cleanly
    await pool.query('DELETE FROM wanted_offers WHERE offerer_user_id IN ($1, $2, $3)', [
      studentAId,
      studentBId,
      studentCId,
    ]);
    await pool.query('DELETE FROM notifications WHERE user_id IN ($1, $2, $3)', [
      studentAId,
      studentBId,
      studentCId,
    ]);
    await pool.query('DELETE FROM wanted_requests WHERE user_id IN ($1, $2, $3)', [
      studentAId,
      studentBId,
      studentCId,
    ]);
    await pool.query('DELETE FROM equipment WHERE id IN ($1, $2, $3, $4)', [
      equipmentAId,
      equipmentB1Id,
      equipmentB2Id,
      equipmentCId,
    ]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [
      studentAId,
      studentBId,
      studentCId,
    ]);
  });

  // ── 1. Create and list wanted requests
  it('allows authenticated student to create a wanted request', async () => {
    const res = await request(app)
      .post('/api/v1/wanted')
      .set('Authorization', `Bearer ${token(studentAId)}`)
      .send({
        title: `Need 4K Canon Camera for Fest ${fixtureId}`,
        description: 'Looking for a Canon mirrorless or cinema camera for 2 days shoot.',
        categoryId,
        locationBlock: '📌 TT Block',
        startDate,
        endDate,
        urgency: 'HIGH',
      });

    expect(res.status).toBe(201);
    expect(res.body.request).toBeDefined();
    expect(res.body.request.title).toContain('Need 4K Canon Camera');
    expect(res.body.request.status).toBe('OPEN');
    expect(res.body.request.author.fullName).toBe('Aarav Wanted');
    expect(res.body.request.author.initials).toBe('AW');
    createdRequestId = res.body.request.id;
  });

  it('lists wanted requests publicly without leaking sensitive student info', async () => {
    const res = await request(app)
      .get('/api/v1/wanted')
      .query({ status: 'OPEN' });

    expect(res.status).toBe(200);
    expect(res.body.items).toBeInstanceOf(Array);
    const item = res.body.items.find((r: any) => r.id === createdRequestId);
    expect(item).toBeDefined();
    expect(item.author.fullName).toBe('Aarav Wanted');
    // Ensure email, phone, and registration number are NOT exposed
    expect(item.author.email).toBeUndefined();
    expect(item.author.phone).toBeUndefined();
    expect(item.author.registrationNumber).toBeUndefined();
  });

  // ── 2. Invalid dates and invalid input
  it('rejects invalid date range or missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/wanted')
      .set('Authorization', `Bearer ${token(studentAId)}`)
      .send({
        title: 'Short',
        description: 'Tiny',
        startDate: addDays(today, 5),
        endDate: addDays(today, 2), // Inverted
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // ── 3. Prevent self-offers
  it('prevents a student from offering gear on their own wanted request', async () => {
    const res = await request(app)
      .post(`/api/v1/wanted/${createdRequestId}/offers`)
      .set('Authorization', `Bearer ${token(studentAId)}`)
      .send({
        equipmentId: equipmentAId,
        message: 'Self offer attempt',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SELF_OFFER_NOT_ALLOWED');
  });

  // ── 4. Prevent offering another student's equipment
  it('prevents offering equipment owned by another student', async () => {
    const res = await request(app)
      .post(`/api/v1/wanted/${createdRequestId}/offers`)
      .set('Authorization', `Bearer ${token(studentBId)}`)
      .send({
        equipmentId: equipmentCId, // Owned by student C!
        message: 'Offering C gear',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EQUIPMENT_NOT_OWNED');
  });

  // ── 5. Successful offer creation & notifications
  it('allows student B to submit an offer using their own gear', async () => {
    const res = await request(app)
      .post(`/api/v1/wanted/${createdRequestId}/offers`)
      .set('Authorization', `Bearer ${token(studentBId)}`)
      .send({
        equipmentId: equipmentB1Id,
        message: 'I have this Canon R6 kit ready for you!',
      });

    expect(res.status).toBe(201);
    expect(res.body.offer.status).toBe('PENDING');
    createdOffer1Id = res.body.offer.id;

    // Verify notification was sent to Student A
    const notifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token(studentAId)}`);

    expect(notifRes.status).toBe(200);
    const offerNotif = notifRes.body.items.find(
      (n: any) => n.type === 'WANTED_OFFER_RECEIVED',
    );
    expect(offerNotif).toBeDefined();
  });

  // ── 6. Prevent duplicate pending offers
  it('rejects duplicate pending offer for the same equipment on the same request', async () => {
    const res = await request(app)
      .post(`/api/v1/wanted/${createdRequestId}/offers`)
      .set('Authorization', `Bearer ${token(studentBId)}`)
      .send({
        equipmentId: equipmentB1Id,
        message: 'Duplicate offer attempt',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_OFFER');
  });

  // ── 7. Offer visibility authorization
  it('author can view offers in GET /:id but public/peers cannot', async () => {
    // Author viewing
    const authorRes = await request(app)
      .get(`/api/v1/wanted/${createdRequestId}`)
      .set('Authorization', `Bearer ${token(studentAId)}`);

    expect(authorRes.status).toBe(200);
    expect(authorRes.body.offers).toBeInstanceOf(Array);
    expect(authorRes.body.offers.length).toBeGreaterThan(0);

    // Unauthenticated viewing
    const publicRes = await request(app)
      .get(`/api/v1/wanted/${createdRequestId}`);

    expect(publicRes.status).toBe(200);
    expect(publicRes.body.offers).toBeUndefined();
    expect(publicRes.body.request.offersCount).toBeGreaterThan(0);
  });

  // ── 8. Student C submits another offer
  it('allows student C to submit a second offer', async () => {
    const res = await request(app)
      .post(`/api/v1/wanted/${createdRequestId}/offers`)
      .set('Authorization', `Bearer ${token(studentCId)}`)
      .send({
        equipmentId: equipmentCId,
        message: 'Can lend Red Dragon if needed',
      });

    expect(res.status).toBe(201);
    createdOffer2Id = res.body.offer.id;
  });

  // ── 9. Author-only respond authorization
  it('prevents non-author from accepting an offer', async () => {
    const res = await request(app)
      .post(`/api/v1/wanted/offers/${createdOffer1Id}/respond`)
      .set('Authorization', `Bearer ${token(studentBId)}`) // Student B is not the author!
      .send({ action: 'accept' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── 10. Decline an offer
  it('allows author to decline an offer', async () => {
    const res = await request(app)
      .post(`/api/v1/wanted/offers/${createdOffer2Id}/respond`)
      .set('Authorization', `Bearer ${token(studentAId)}`)
      .send({ action: 'decline' });

    expect(res.status).toBe(200);
    expect(res.body.offer.status).toBe('DECLINED');

    // Offerer C receives DECLINED notification
    const notifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token(studentCId)}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.items.some((n: any) => n.type === 'WANTED_OFFER_DECLINED')).toBe(true);
  });

  // ── 11. Transaction-safe accept offer
  it('allows author to accept offer 1, marks request FULFILLED and notifies offerer', async () => {
    const res = await request(app)
      .post(`/api/v1/wanted/offers/${createdOffer1Id}/respond`)
      .set('Authorization', `Bearer ${token(studentAId)}`)
      .send({ action: 'accept' });

    expect(res.status).toBe(200);
    expect(res.body.offer.status).toBe('ACCEPTED');

    // Request is now FULFILLED
    const reqRes = await request(app).get(`/api/v1/wanted/${createdRequestId}`);
    expect(reqRes.body.request.status).toBe('FULFILLED');

    // Verify Offerer B received ACCEPTED notification
    const notifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token(studentBId)}`);
    expect(notifRes.body.items.some((n: any) => n.type === 'WANTED_OFFER_ACCEPTED')).toBe(true);
  });

  // ── 12. Accepted offer does NOT create a booking automatically
  it('does NOT create a booking automatically when an offer is accepted', async () => {
    const bookingRes = await pool!.query<{ count: string }>(
      'SELECT count(*)::text as count FROM bookings WHERE equipment_id = $1',
      [equipmentB1Id],
    );
    // Booking count must be 0 for this newly created test equipment!
    expect(Number(bookingRes.rows[0].count)).toBe(0);
  });

  // ── 13. Prevent offers on fulfilled or closed request
  it('rejects new offers on fulfilled requests', async () => {
    const res = await request(app)
      .post(`/api/v1/wanted/${createdRequestId}/offers`)
      .set('Authorization', `Bearer ${token(studentBId)}`)
      .send({
        equipmentId: equipmentB2Id,
        message: 'Late offer',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('REQUEST_NOT_OPEN');
  });

  // ── 14. Notification isolation and mark as read
  it('ensures notifications can only be marked as read by their owner', async () => {
    const notifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token(studentAId)}`);

    const notifId = notifs.body.items[0].id;

    // Student B attempts to mark Student A's notification as read
    const hijackRes = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${token(studentBId)}`);

    expect(hijackRes.status).toBe(404);

    // Student A marks their own notification as read
    const successRes = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${token(studentAId)}`);

    expect(successRes.status).toBe(200);
    expect(successRes.body.notification.readAt).not.toBeNull();
  });

  // ── 15. Matching endpoint
  it('returns matching available gear for a wanted request', async () => {
    const matchRes = await request(app).get(`/api/v1/wanted/${createdRequestId}/matches`);
    expect(matchRes.status).toBe(200);
    expect(matchRes.body.items).toBeInstanceOf(Array);
    // Should exclude equipmentA (student A's own gear)
    expect(matchRes.body.items.some((i: any) => i.id === equipmentAId)).toBe(false);
  });
});
