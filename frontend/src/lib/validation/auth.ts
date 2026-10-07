import { z } from 'zod';

export const allowedRoles = ['RENTER', 'OWNER'] as const;
export type AppRole = (typeof allowedRoles)[number];

export const roleSchema = z.enum(allowedRoles);

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters long.')
    .max(80, 'Full name must be under 80 characters.'),
  email: z.string().trim().email('Please enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone number is too short.')
    .max(20, 'Phone number is too long.')
    .optional()
    .or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  role: z
    .string()
    .transform((value) => value.toUpperCase())
    .pipe(roleSchema)
    .default('RENTER'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

export const normalizeRole = (value: string | null | undefined): AppRole => {
  const normalized = value?.trim().toUpperCase();
  return roleSchema.safeParse(normalized).success ? roleSchema.parse(normalized) : 'RENTER';
};
