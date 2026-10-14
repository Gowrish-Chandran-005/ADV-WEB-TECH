import type { RequestHandler } from 'express';
import { HttpError } from '../../middleware/http-error';
import { requireJwtSecret, verifyAccessToken } from './auth.security';
import type { AuthDependencies } from './auth.dependencies';
import type { UserRole } from './auth.types';

export function createAuthenticate(dependencies: AuthDependencies): RequestHandler {
  return async (request, _response, next) => {
    try {
      const authorization = request.header('authorization');
      const match = authorization?.match(/^Bearer ([^\s]+)$/i);
      if (!match) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required.');
      }

      const token = verifyAccessToken(match[1], requireJwtSecret(dependencies.jwtSecret));
      const user = await dependencies.users.findById(token.userId);
      if (
        !user ||
        user.status !== 'ACTIVE' ||
        user.tokenVersion !== token.tokenVersion
      ) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required.');
      }

      request.authUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createOptionalAuthenticate(dependencies: AuthDependencies): RequestHandler {
  return async (request, _response, next) => {
    try {
      const authorization = request.header('authorization');
      const match = authorization?.match(/^Bearer ([^\s]+)$/i);
      if (!match) {
        return next();
      }

      const token = verifyAccessToken(match[1], requireJwtSecret(dependencies.jwtSecret));
      const user = await dependencies.users.findById(token.userId);
      if (
        user &&
        user.status === 'ACTIVE' &&
        user.tokenVersion === token.tokenVersion
      ) {
        request.authUser = user;
      }
      next();
    } catch {
      next();
    }
  };
}

export function requireRole(role: UserRole): RequestHandler {
  return (request, _response, next) => {
    if (!request.authUser) {
      next(new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
      return;
    }
    if (request.authUser.role !== role) {
      next(new HttpError(403, 'FORBIDDEN', 'You are not authorized to access this resource.'));
      return;
    }
    next();
  };
}

export const requireStudent = requireRole('STUDENT');
export const requireAdmin = requireRole('ADMIN');
