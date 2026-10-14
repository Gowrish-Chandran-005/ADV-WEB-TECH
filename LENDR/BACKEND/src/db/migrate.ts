import path from 'node:path';
import { pool } from '../config/database';
import { env } from '../config/env';
import { runMigrations } from './migration-runner';

async function main(): Promise<void> {
  if (!pool) {
    throw new Error('Database connection settings are not configured.');
  }

  const argument = process.argv[2] ?? 'up';
  if (argument !== 'up' && argument !== 'status') {
    throw new Error('Usage: migrate.ts [up|status].');
  }
  const mode = argument;
  const lines = await runMigrations(
    pool,
    path.resolve(__dirname, '../../migrations'),
    {
      projectId: env.MIGRATION_EXPECTED_NEON_PROJECT_ID ?? null,
      branchId: env.MIGRATION_EXPECTED_NEON_BRANCH_ID ?? null,
    },
    mode,
  );

  console.info(lines.length ? lines.join('\n') : 'No SQL migrations found.');
}

main()
  .catch((error: unknown) => {
    console.error('Database migration command failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool?.end();
  });
