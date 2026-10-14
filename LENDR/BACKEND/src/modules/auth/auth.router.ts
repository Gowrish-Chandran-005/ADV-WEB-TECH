import { Router } from 'express';
import { HttpError } from '../../middleware/http-error';
import { createRateLimit } from '../../middleware/rate-limit';
import { createDefaultAuthDependencies, type AuthDependencies } from './auth.dependencies';
import { createAuthenticate } from './auth.middleware';
import {
  hashPassword,
  requireJwtSecret,
  signAccessToken,
  verifyPassword,
} from './auth.security';
import { loginBodySchema, registerBodySchema } from './auth.validation';
import type { AuthUser, CreateStudentInput } from './auth.types';

function publicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    registrationNumber: user.registrationNumber,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function invalidBody(message = 'The request body is invalid.'): HttpError {
  return new HttpError(400, 'VALIDATION_ERROR', message);
}

function isDuplicateEmail(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error &&
    error.constraint === 'users_email_key'
  );
}

function isDuplicateRegistrationNumber(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error &&
    (error.constraint === 'users_registration_number_key' ||
      error.constraint === 'users_registration_number_unique')
  );
}

export function createAuthRouter(
  dependencies: AuthDependencies = createDefaultAuthDependencies(),
): Router {
  const router = Router();
  const authenticate = createAuthenticate(dependencies);
  const loginRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 });
  const registrationRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 });

  router.post('/register', registrationRateLimit, async (request, response) => {
    requireJwtSecret(dependencies.jwtSecret);
    const parsed = registerBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const detailMessage = firstIssue?.message || 'The request body is invalid.';
      throw invalidBody(detailMessage);
    }

    const { email, password, fullName, registrationNumber, phone } = parsed.data;
    const input: CreateStudentInput = {
      email,
      passwordHash: await hashPassword(password, dependencies.passwordHashRounds),
      fullName,
      registrationNumber: registrationNumber ?? null,
      phone: phone ?? null,
    };

    let user: AuthUser;
    try {
      user = await dependencies.users.createStudent(input);
    } catch (error) {
      if (isDuplicateEmail(error)) {
        throw new HttpError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.');
      }
      if (isDuplicateRegistrationNumber(error)) {
        throw new HttpError(409, 'REGISTRATION_NUMBER_ALREADY_USED', 'This registration number is already in use.');
      }
      throw error;
    }

    response.status(201).json({
      user: publicUser(user),
      accessToken: signAccessToken(user, dependencies.jwtSecret!),
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  });


  router.post('/login', loginRateLimit, async (request, response) => {
    requireJwtSecret(dependencies.jwtSecret);
    const parsed = loginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw invalidBody();
    }

    const user = await dependencies.users.findByEmail(parsed.data.email);
    const validPassword = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);
    if (!user || !validPassword || user.status !== 'ACTIVE') {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }

    response.status(200).json({
      user: publicUser(user),
      accessToken: signAccessToken(user, dependencies.jwtSecret!),
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  });

  router.get('/me', authenticate, (request, response) => {
    response.status(200).json({ user: publicUser(request.authUser!) });
  });

  router.post('/logout', authenticate, async (request, response) => {
    await dependencies.users.incrementTokenVersion(request.authUser!.id);
    response.status(204).end();
  });

  return router;
}
