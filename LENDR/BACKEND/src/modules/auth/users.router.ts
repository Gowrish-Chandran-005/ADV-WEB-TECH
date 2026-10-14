import { Router } from 'express';
import { HttpError } from '../../middleware/http-error';
import { createDefaultAuthDependencies, type AuthDependencies } from './auth.dependencies';
import { createAuthenticate } from './auth.middleware';
import { requireJwtSecret } from './auth.security';
import { updateProfileBodySchema } from './auth.validation';

function publicUser(user: NonNullable<Express.Request['authUser']>) {
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

export function createUsersRouter(
  dependencies: AuthDependencies = createDefaultAuthDependencies(),
): Router {
  const router = Router();
  const authenticate = createAuthenticate(dependencies);

  router.get('/me', authenticate, (request, response) => {
    response.status(200).json({ user: publicUser(request.authUser!) });
  });

  router.patch('/me', authenticate, async (request, response) => {
    requireJwtSecret(dependencies.jwtSecret);
    const parsed = updateProfileBodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'The request body is invalid.');
    }

    try {
      const user = await dependencies.users.updateProfile(request.authUser!.id, parsed.data);
      if (!user) {
        throw new HttpError(404, 'USER_NOT_FOUND', 'The account could not be found.');
      }
      response.status(200).json({ user: publicUser(user) });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new HttpError(409, 'REGISTRATION_NUMBER_ALREADY_USED', 'The registration number is already in use.');
      }
      throw error;
    }
  });

  return router;
}
