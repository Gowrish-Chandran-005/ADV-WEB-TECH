import { env } from '../../config/env';
import { userRepository } from './auth.repository';
import type { UserRepository } from './auth.types';

export interface AuthDependencies {
  users: UserRepository;
  jwtSecret: string | undefined;
  passwordHashRounds: number;
}

export function createDefaultAuthDependencies(): AuthDependencies {
  return {
    users: userRepository,
    jwtSecret: env.AUTH_JWT_SECRET,
    passwordHashRounds: 12,
  };
}
