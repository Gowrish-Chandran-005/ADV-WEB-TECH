import { pool } from '../../config/database';
import type {
  AuthUser,
  CreateStudentInput,
  UpdateProfileInput,
  UserRepository,
  UserWithPassword,
} from './auth.types';

const userFields = `
  id,
  email,
  full_name AS "fullName",
  registration_number AS "registrationNumber",
  phone,
  role,
  status,
  email_verified_at AS "emailVerifiedAt",
  token_version AS "tokenVersion",
  created_at AS "createdAt",
  updated_at AS "updatedAt"`;

function requirePool() {
  if (!pool) {
    throw new Error('PostgreSQL connection settings are not configured.');
  }
  return pool;
}

export const userRepository: UserRepository = {
  async findByEmail(email): Promise<UserWithPassword | null> {
    const result = await requirePool().query(
      `SELECT ${userFields}, password_hash AS "passwordHash"
       FROM users
       WHERE email = $1`,
      [email],
    );
    return result.rows[0] ?? null;
  },

  async findById(id): Promise<AuthUser | null> {
    const result = await requirePool().query(
      `SELECT ${userFields}
       FROM users
       WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  },

  async createStudent(input: CreateStudentInput): Promise<AuthUser> {
    const result = await requirePool().query(
      `INSERT INTO users (email, password_hash, full_name, registration_number, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${userFields}`,
      [input.email, input.passwordHash, input.fullName, input.registrationNumber, input.phone],
    );
    return result.rows[0] as AuthUser;
  },

  async updateProfile(id: string, input: UpdateProfileInput): Promise<AuthUser | null> {
    const values: unknown[] = [id];
    const assignments: string[] = [];

    if (input.fullName !== undefined) {
      values.push(input.fullName);
      assignments.push(`full_name = $${values.length}`);
    }
    if (input.registrationNumber !== undefined) {
      values.push(input.registrationNumber);
      assignments.push(`registration_number = $${values.length}`);
    }
    if (input.phone !== undefined) {
      values.push(input.phone);
      assignments.push(`phone = $${values.length}`);
    }

    const result = await requirePool().query(
      `UPDATE users
       SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING ${userFields}`,
      values,
    );
    return result.rows[0] ?? null;
  },

  async incrementTokenVersion(id: string): Promise<void> {
    await requirePool().query(
      `UPDATE users
       SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id],
    );
  },
};
