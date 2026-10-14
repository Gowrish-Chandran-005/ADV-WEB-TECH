import { randomUUID } from 'node:crypto';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/config/database';
import { env } from '../src/config/env';
import { createApp } from '../src/app';
import { runMigrations } from '../src/db/migration-runner';

const enabled = process.env.LENDR_RUN_DB_TESTS === 'true';
const suite = enabled ? describe : describe.skip;
const testEmail = `auth-integration-${randomUUID()}@vitstudent.ac.in`;
const testPassword = 'auth-integration-test-password-123';
const app = createApp();

suite('authentication PostgreSQL integration', () => {
  beforeAll(async () => {
    if (!pool) {
      throw new Error('Authentication integration tests require PostgreSQL configuration.');
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
  });

  afterAll(async () => {
    if (pool) {
      await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    }
  });

  it('registers, authenticates, updates a safe profile, enforces account status and logs out', async () => {
    const registration = await request(app).post('/api/v1/auth/register').send({
      email: testEmail.toUpperCase(),
      password: testPassword,
      fullName: 'Authentication Integration Student',
      registrationNumber: null,
      phone: null,
    });

    expect(registration.status).toBe(201);
    expect(registration.body.user.email).toBe(testEmail);
    expect(registration.body.user.role).toBe('STUDENT');
    expect(registration.body.user.emailVerified).toBe(false);
    expect(registration.body.user.emailVerifiedAt).toBeNull();
    expect(JSON.stringify(registration.body)).not.toMatch(/password(hash)?/i);
    expect(registration.body.accessToken).toEqual(expect.any(String));

    const duplicate = await request(app).post('/api/v1/auth/register').send({
      email: testEmail.toUpperCase(),
      password: testPassword,
      fullName: 'Duplicate Student',
    });
    expect(duplicate.status).toBe(409);

    const login = await request(app).post('/api/v1/auth/login').send({
      email: testEmail.toUpperCase(),
      password: testPassword,
    });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toEqual(expect.any(String));
    const token = login.body.accessToken as string;

    const currentAuthUser = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    const currentProfile = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(currentAuthUser.status).toBe(200);
    expect(currentProfile.status).toBe(200);
    expect(currentProfile.body.user.email).toBe(testEmail);

    const updatedProfile = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Updated Integration Student', phone: '9876543210' });
    expect(updatedProfile.status).toBe(200);
    expect(updatedProfile.body.user.fullName).toBe('Updated Integration Student');
    expect(updatedProfile.body.user.phone).toBe('9876543210');

    const privilegeEscalation = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN', status: 'SUSPENDED' });
    expect(privilegeEscalation.status).toBe(400);

    await pool!.query("UPDATE users SET status = 'SUSPENDED' WHERE email = $1", [testEmail]);
    const suspendedProfile = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    const suspendedLogin = await request(app).post('/api/v1/auth/login').send({
      email: testEmail,
      password: testPassword,
    });
    expect(suspendedProfile.status).toBe(401);
    expect(suspendedLogin.status).toBe(401);

    await pool!.query("UPDATE users SET status = 'DEACTIVATED' WHERE email = $1", [testEmail]);
    const deactivatedProfile = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(deactivatedProfile.status).toBe(401);

    await pool!.query("UPDATE users SET status = 'ACTIVE' WHERE email = $1", [testEmail]);
    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    const invalidatedProfile = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(logout.status).toBe(204);
    expect(invalidatedProfile.status).toBe(401);
  }, 30000);
});
