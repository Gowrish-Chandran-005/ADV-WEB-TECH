export type UserRole = 'STUDENT' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  registrationNumber: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends AuthUser {
  passwordHash: string;
}

export interface CreateStudentInput {
  email: string;
  passwordHash: string;
  fullName: string;
  registrationNumber: string | null;
  phone: string | null;
}

export interface UpdateProfileInput {
  fullName?: string;
  registrationNumber?: string | null;
  phone?: string | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserWithPassword | null>;
  findById(id: string): Promise<AuthUser | null>;
  createStudent(input: CreateStudentInput): Promise<AuthUser>;
  updateProfile(id: string, input: UpdateProfileInput): Promise<AuthUser | null>;
  incrementTokenVersion(id: string): Promise<void>;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}
