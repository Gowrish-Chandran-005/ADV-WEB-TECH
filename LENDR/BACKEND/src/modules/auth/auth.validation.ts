import { z } from 'zod';

const vitStudentEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .refine((email) => email.split('@')[1] === 'vitstudent.ac.in', {
    message: 'Email must use the @vitstudent.ac.in domain.',
  });

const password = z
  .string()
  .min(12, 'Password must be at least 12 characters long.')
  .max(72, 'Password must not exceed 72 characters.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password must be at most 72 bytes when encoded as UTF-8.',
  });

const optionalProfileString = (maximumLength: number) =>
  z
    .string()
    .trim()
    .max(maximumLength)
    .nullable()
    .optional();

export const registerBodySchema = z
  .object({
    email: vitStudentEmail,
    password,
    fullName: z.string().trim().min(1).max(120),
    registrationNumber: optionalProfileString(32),
    phone: optionalProfileString(32),
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: vitStudentEmail,
    password: z.string().min(1).max(72),
  })
  .strict();

export const updateProfileBodySchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    registrationNumber: optionalProfileString(32),
    phone: optionalProfileString(32),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field must be provided.',
  });

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
