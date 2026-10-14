import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { HttpError } from '../../middleware/http-error';
import type { AuthUser } from './auth.types';

const JWT_ISSUER = 'lendr-api';
const JWT_AUDIENCE = 'lendr';
const JWT_LIFETIME = '1h';
const dummyPasswordHash = bcrypt.hash('not-a-real-account-password', 12);

export function requireJwtSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) {
    throw new HttpError(503, 'AUTH_UNAVAILABLE', 'Authentication is not configured.');
  }
  return secret;
}

export async function hashPassword(password: string, rounds: number): Promise<string> {
  return bcrypt.hash(password, rounds);
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  const comparisonHash = hash ?? (await dummyPasswordHash);
  const matches = await bcrypt.compare(password, comparisonHash);
  return hash !== null && matches;
}

export function signAccessToken(user: Pick<AuthUser, 'id' | 'tokenVersion'>, secret: string): string {
  return jwt.sign(
    { tokenVersion: user.tokenVersion },
    requireJwtSecret(secret),
    {
      algorithm: 'HS256',
      audience: JWT_AUDIENCE,
      expiresIn: JWT_LIFETIME,
      issuer: JWT_ISSUER,
      subject: user.id,
    },
  );
}

export function verifyAccessToken(token: string, secret: string): { userId: string; tokenVersion: number } {
  let payload: string | JwtPayload;
  try {
    payload = jwt.verify(token, requireJwtSecret(secret), {
      algorithms: ['HS256'],
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    });
  } catch {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    !Number.isInteger(payload.tokenVersion) ||
    (payload.tokenVersion as number) < 0
  ) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  return { userId: payload.sub, tokenVersion: payload.tokenVersion as number };
}
