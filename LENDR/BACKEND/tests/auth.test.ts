import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type { AuthDependencies } from '../src/modules/auth/auth.dependencies';
import type {
  AuthUser,
  CreateStudentInput,
  UpdateProfileInput,
  UserRepository,
  UserWithPassword,
} from '../src/modules/auth/auth.types';

const jwtSecret = 'unit-test-secret-with-at-least-thirty-two-characters';

function makeUser(
  input: Partial<AuthUser> & Pick<AuthUser, 'id' | 'email' | 'fullName'>,
): AuthUser {
  const now = new Date('2026-10-10T00:00:00.000Z');
  return {
    registrationNumber: null,
    phone: null,
    role: 'STUDENT',
    status: 'ACTIVE',
    emailVerifiedAt: null,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

function createTestApp(initialUsers: UserWithPassword[] = []) {
  const users = new Map<string, UserWithPassword>(
    initialUsers.map((user) => [user.id, { ...user }]),
  );

  const repository: UserRepository = {
    async findByEmail(email) {
      const user = [...users.values()].find((entry) => entry.email === email);
      return user ? { ...user } : null;
    },
    async findById(id) {
      const user = users.get(id);
      if (!user) {
        return null;
      }
      const { passwordHash: _passwordHash, ...safeUser } = user;
      return { ...safeUser };
    },
    async createStudent(input: CreateStudentInput) {
      if ([...users.values()].some((user) => user.email === input.email)) {
        throw { code: '23505', constraint: 'users_email_key' };
      }
      const user = makeUser({
        id: `user-${users.size + 1}`,
        email: input.email,
        fullName: input.fullName,
        registrationNumber: input.registrationNumber,
        phone: input.phone,
      });
      users.set(user.id, { ...user, passwordHash: input.passwordHash });
      return { ...user };
    },
    async updateProfile(id, input: UpdateProfileInput) {
      const user = users.get(id);
      if (!user) {
        return null;
      }
      if (input.fullName !== undefined) {
        user.fullName = input.fullName;
      }
      if (input.registrationNumber !== undefined) {
        user.registrationNumber = input.registrationNumber;
      }
      if (input.phone !== undefined) {
        user.phone = input.phone;
      }
      return { ...user };
    },
    async incrementTokenVersion(id) {
      const user = users.get(id);
      if (user) {
        user.tokenVersion += 1;
      }
    },
  };

  const dependencies: AuthDependencies = {
    users: repository,
    jwtSecret,
    passwordHashRounds: 4,
  };

  return { app: createApp(undefined, dependencies), users };
}

describe('authentication endpoints', () => {
  it('registers with a normalized VIT email and does not expose the password hash', async () => {
    const { app, users } = createTestApp();
    const response = await request(app).post('/api/v1/auth/register').send({
      email: '  Student.One@VITSTUDENT.AC.IN ',
      password: 'long-secure-password-123',
      fullName: 'Student One',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('student.one@vitstudent.ac.in');
    expect(response.body.user.role).toBe('STUDENT');
    expect(response.body.user.emailVerified).toBe(false);
    expect(response.body.user.emailVerifiedAt).toBeNull();
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('password_hash');
    expect(JSON.stringify(response.body)).not.toContain('long-secure-password-123');
    expect([...users.values()][0].passwordHash).not.toBe('long-secure-password-123');
    expect(await bcrypt.compare('long-secure-password-123', [...users.values()][0].passwordHash)).toBe(
      true,
    );
  });

  it('rejects duplicate normalized email addresses', async () => {
    const passwordHash = await bcrypt.hash('long-secure-password-123', 4);
    const user = makeUser({
      id: 'existing-user',
      email: 'student@vitstudent.ac.in',
      fullName: 'Existing Student',
    });
    const { app } = createTestApp([{ ...user, passwordHash }]);
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'STUDENT@VITSTUDENT.AC.IN',
      password: 'long-secure-password-123',
      fullName: 'Duplicate Student',
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it.each([
    'student@gmail.com',
    'student@vitstudent.ac.in.attacker.com',
    'student@sub.vitstudent.ac.in',
    'student@vitstudentx.ac.in',
    'student@vitstudent.ac.in.evil',
  ])('rejects a non-VIT email domain: %s', async (email) => {
    const { app } = createTestApp();
    const response = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'long-secure-password-123',
      fullName: 'Student',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects short passwords, malformed bodies and privilege assignment', async () => {
    const { app } = createTestApp();
    const shortPassword = await request(app).post('/api/v1/auth/register').send({
      email: 'student@vitstudent.ac.in',
      password: 'short',
      fullName: 'Student',
    });
    const malformed = await request(app).post('/api/v1/auth/register').send({
      email: 'student@vitstudent.ac.in',
      password: 'long-secure-password-123',
      fullName: 'Student',
      role: 'ADMIN',
    });
    const emptyProfile = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', 'Bearer invalid');

    expect(shortPassword.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(emptyProfile.status).toBe(401);
  });

  it('logs in with case-normalized email and returns the same safe user projection', async () => {
    const passwordHash = await bcrypt.hash('long-secure-password-123', 4);
    const user = makeUser({
      id: 'login-user',
      email: 'student@vitstudent.ac.in',
      fullName: 'Student Login',
    });
    const { app } = createTestApp([{ ...user, passwordHash }]);
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'STUDENT@VITSTUDENT.AC.IN',
      password: 'long-secure-password-123',
    });

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(user.id);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toContain(passwordHash);
  });

  it('uses the same login error for unknown email and incorrect password', async () => {
    const passwordHash = await bcrypt.hash('long-secure-password-123', 4);
    const user = makeUser({
      id: 'login-error-user',
      email: 'student@vitstudent.ac.in',
      fullName: 'Student',
    });
    const { app } = createTestApp([{ ...user, passwordHash }]);
    const incorrectPassword = await request(app).post('/api/v1/auth/login').send({
      email: user.email,
      password: 'different-secure-password',
    });
    const unknownEmail = await request(app).post('/api/v1/auth/login').send({
      email: 'unknown@vitstudent.ac.in',
      password: 'different-secure-password',
    });

    expect(incorrectPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(incorrectPassword.body);
  });

  it('rejects missing, malformed, expired, invalidated and inactive-account tokens', async () => {
    const passwordHash = await bcrypt.hash('long-secure-password-123', 4);
    const user = makeUser({
      id: 'protected-user',
      email: 'protected@vitstudent.ac.in',
      fullName: 'Protected User',
    });
    const { app, users } = createTestApp([{ ...user, passwordHash }]);
    const missing = await request(app).get('/api/v1/auth/me');
    const malformed = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-jwt');
    const expiredToken = jwt.sign(
      { tokenVersion: 0 },
      jwtSecret,
      {
        algorithm: 'HS256',
        audience: 'lendr',
        expiresIn: -1,
        issuer: 'lendr-api',
        subject: user.id,
      },
    );
    const expired = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    const validToken = jwt.sign(
      { tokenVersion: 0 },
      jwtSecret,
      {
        algorithm: 'HS256',
        audience: 'lendr',
        expiresIn: '1h',
        issuer: 'lendr-api',
        subject: user.id,
      },
    );
    users.get(user.id)!.tokenVersion = 1;
    const invalidated = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`);
    users.get(user.id)!.tokenVersion = 0;
    users.get(user.id)!.status = 'SUSPENDED';
    const suspended = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`);
    users.get(user.id)!.status = 'DEACTIVATED';
    const deactivatedLogin = await request(app).post('/api/v1/auth/login').send({
      email: user.email,
      password: 'long-secure-password-123',
    });

    for (const response of [missing, malformed, expired, invalidated, suspended]) {
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    }
    expect(deactivatedLogin.status).toBe(401);
    expect(deactivatedLogin.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('serves the current profile and prevents profile privilege escalation', async () => {
    const passwordHash = await bcrypt.hash('long-secure-password-123', 4);
    const user = makeUser({
      id: 'profile-user',
      email: 'profile@vitstudent.ac.in',
      fullName: 'Before Update',
    });
    const { app } = createTestApp([{ ...user, passwordHash }]);
    const token = jwt.sign(
      { tokenVersion: 0 },
      jwtSecret,
      {
        algorithm: 'HS256',
        audience: 'lendr',
        expiresIn: '1h',
        issuer: 'lendr-api',
        subject: user.id,
      },
    );
    const profile = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    const updated = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'After Update', phone: '9876543210' });
    const privilegeEscalation = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN', status: 'ACTIVE' });

    expect(profile.status).toBe(200);
    expect(profile.body.user.fullName).toBe('Before Update');
    expect(updated.status).toBe(200);
    expect(updated.body.user.fullName).toBe('After Update');
    expect(updated.body.user.phone).toBe('9876543210');
    expect(updated.body.user.role).toBe('STUDENT');
    expect(privilegeEscalation.status).toBe(400);
    expect(JSON.stringify(updated.body)).not.toContain(passwordHash);
  });

  it('invalidates the current token on logout', async () => {
    const passwordHash = await bcrypt.hash('long-secure-password-123', 4);
    const user = makeUser({
      id: 'logout-user',
      email: 'logout@vitstudent.ac.in',
      fullName: 'Logout User',
    });
    const { app } = createTestApp([{ ...user, passwordHash }]);
    const login = await request(app).post('/api/v1/auth/login').send({
      email: user.email,
      password: 'long-secure-password-123',
    });
    const token = login.body.accessToken as string;
    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    const afterLogout = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(logout.status).toBe(204);
    expect(afterLogout.status).toBe(401);
  });

  it('rate limits repeated registration attempts', async () => {
    const { app } = createTestApp();
    const attempts = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        request(app).post('/api/v1/auth/register').send({
          email: `rate-limit-${index}@vitstudent.ac.in`,
          password: 'long-secure-password-123',
          fullName: 'Rate Limit',
        }),
      ),
    );

    expect(attempts.slice(0, 5).every((response) => response.status === 201)).toBe(true);
    expect(attempts[5].status).toBe(429);
    expect(attempts[5].headers['retry-after']).toBeTruthy();
  });
});
