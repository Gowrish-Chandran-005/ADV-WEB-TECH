import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    CORS_ORIGIN: z.string().min(1).default('*'),
    AUTH_JWT_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(32).optional(),
    ),
    DATABASE_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().url().optional(),
    ),
    PGHOST: z.string().min(1).optional(),
    PGPORT: z.coerce.number().int().min(1).max(65535).optional(),
    PGDATABASE: z.string().min(1).optional(),
    PGUSER: z.string().min(1).optional(),
    PGPASSWORD: z.string().optional(),
    MIGRATION_EXPECTED_NEON_PROJECT_ID: z
      .preprocess((value) => (value === '' ? undefined : value), z.string().min(1).optional()),
    MIGRATION_EXPECTED_NEON_BRANCH_ID: z
      .preprocess((value) => (value === '' ? undefined : value), z.string().min(1).optional()),
    UPLOADS_DIRECTORY: z
      .preprocess((value) => (value === '' ? undefined : value), z.string().min(1).optional()),
    DAMAGE_CLAIM_WINDOW_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  })
  .superRefine((env, context) => {
    const hasIndividualDatabaseSettings = [
      env.PGHOST,
      env.PGPORT,
      env.PGDATABASE,
      env.PGUSER,
      env.PGPASSWORD,
    ].some((value) => value !== undefined);
    const hasRequiredIndividualSettings = Boolean(env.PGHOST && env.PGDATABASE && env.PGUSER);

    if (!env.DATABASE_URL && hasIndividualDatabaseSettings && !hasRequiredIndividualSettings) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Set DATABASE_URL or provide PGHOST, PGDATABASE, and PGUSER together.',
        path: ['DATABASE_URL'],
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment configuration:', parsedEnv.error.flatten().fieldErrors);
  throw new Error('Environment configuration is invalid.');
}

export const env = parsedEnv.data;

export const databaseConfig = env.DATABASE_URL
  ? { connectionString: env.DATABASE_URL }
  : env.PGHOST && env.PGDATABASE && env.PGUSER
    ? {
        host: env.PGHOST,
        ...(env.PGPORT ? { port: env.PGPORT } : {}),
        database: env.PGDATABASE,
        user: env.PGUSER,
        ...(env.PGPASSWORD !== undefined ? { password: env.PGPASSWORD } : {}),
      }
    : undefined;
