import { pool } from '../../config/database';
import { env } from '../../config/env';
import { assertSafeMigrationTarget } from '../../db/migration-runner';
import { bookingRepository } from './booking.repository';

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    throw new Error('Pending-booking expiry command is disabled in production.');
  }
  if (!pool) {
    throw new Error('Database connection settings are not configured.');
  }
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT current_setting('neon.project_id', true) AS project_id,
              current_setting('neon.branch_id', true) AS branch_id`,
    );
    const target = result.rows[0] as { project_id: string | null; branch_id: string | null } | undefined;
    assertSafeMigrationTarget(
      { projectId: target?.project_id ?? null, branchId: target?.branch_id ?? null },
      {
        projectId: env.MIGRATION_EXPECTED_NEON_PROJECT_ID ?? null,
        branchId: env.MIGRATION_EXPECTED_NEON_BRANCH_ID ?? null,
      },
    );
  } finally {
    client.release();
  }
  const expired = await bookingRepository.expirePending();
  console.info(`Expired ${expired} pending booking request(s).`);
}

main()
  .catch((error: unknown) => {
    console.error(
      'Pending-booking expiry failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool?.end();
  });
