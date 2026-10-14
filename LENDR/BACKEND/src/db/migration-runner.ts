import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool, PoolClient } from 'pg';

export const PRODUCTION_BRANCH_ID = 'br-round-bread-b5lhdrn9';
const MIGRATION_LOCK_ID = '74923810451001';
const MIGRATION_FILE_PATTERN = /^(\d{3,})_[a-z0-9_]+\.sql$/;

export interface Migration {
  version: number;
  filename: string;
  checksum: string;
  sql: string;
}

export interface AppliedMigration {
  version: number;
  filename: string;
  checksum: string;
}

export interface NeonTargetIdentity {
  projectId: string | null;
  branchId: string | null;
}

export interface MigrationQueryClient {
  query(sql: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

export function checksumMigration(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

export async function loadMigrations(directory: string): Promise<Migration[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && MIGRATION_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => {
      const leftVersion = Number(left.match(MIGRATION_FILE_PATTERN)?.[1]);
      const rightVersion = Number(right.match(MIGRATION_FILE_PATTERN)?.[1]);
      return leftVersion - rightVersion || left.localeCompare(right);
    });
  const migrations: Migration[] = [];

  for (const filename of files) {
    const match = filename.match(MIGRATION_FILE_PATTERN);
    if (!match) {
      continue;
    }
    const version = Number(match[1]);
    if (migrations.some((migration) => migration.version === version)) {
      throw new Error(`Duplicate migration version ${version}.`);
    }
    const sql = await readFile(path.join(directory, filename), 'utf8');
    migrations.push({ version, filename, checksum: checksumMigration(sql), sql });
  }

  return migrations;
}

export function assertSafeMigrationTarget(
  actual: NeonTargetIdentity,
  expected: NeonTargetIdentity,
): void {
  if (!actual.projectId || !actual.branchId) {
    throw new Error('Migration refused: Neon project and branch identity could not be verified.');
  }
  if (!expected.projectId || !expected.branchId) {
    throw new Error('Migration refused: expected Neon project and branch IDs must be explicitly configured.');
  }
  if (actual.projectId !== expected.projectId || actual.branchId !== expected.branchId) {
    throw new Error('Migration refused: the connected Neon project or branch does not match the expected target.');
  }
  if (actual.branchId === PRODUCTION_BRANCH_ID) {
    throw new Error('Migration refused: migrations are not permitted on the production branch.');
  }
}

export function findPendingMigrations(
  migrations: Migration[],
  applied: AppliedMigration[],
): Migration[] {
  const appliedByVersion = new Map(applied.map((migration) => [migration.version, migration]));
  const migrationsByVersion = new Map(migrations.map((migration) => [migration.version, migration]));

  for (const previous of applied) {
    const migration = migrationsByVersion.get(previous.version);
    if (
      !migration ||
      previous.filename !== migration.filename ||
      previous.checksum !== migration.checksum
    ) {
      throw new Error(`Migration checksum mismatch for version ${previous.version} (${previous.filename}).`);
    }
  }

  return migrations.filter((migration) => !appliedByVersion.has(migration.version));
}

export async function applyMigration(client: MigrationQueryClient, migration: Migration): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(migration.sql);
    await client.query(
      `INSERT INTO schema_migrations (version, filename, checksum)
       VALUES ($1, $2, $3)`,
      [migration.version, migration.filename, migration.checksum],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function getNeonTargetIdentity(client: PoolClient): Promise<NeonTargetIdentity> {
  const result = await client.query(
    `SELECT
       current_setting('neon.project_id', true) AS project_id,
       current_setting('neon.branch_id', true) AS branch_id`,
  );
  const identity = result.rows[0] as { project_id: string | null; branch_id: string | null } | undefined;
  return {
    projectId: identity?.project_id ?? null,
    branchId: identity?.branch_id ?? null,
  };
}

export async function runMigrations(
  pool: Pool,
  directory: string,
  expectedTarget: NeonTargetIdentity,
  mode: 'up' | 'status',
): Promise<string[]> {
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    const actualTarget = await getNeonTargetIdentity(client);
    assertSafeMigrationTarget(actualTarget, expectedTarget);

    if (mode === 'up') {
      await client.query('SELECT pg_advisory_lock($1::bigint)', [MIGRATION_LOCK_ID]);
      lockAcquired = true;
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version integer PRIMARY KEY,
          filename text NOT NULL UNIQUE,
          checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
          applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    const migrations = await loadMigrations(directory);
    const tableExists = await client.query<{ exists: boolean }>(
      `SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists`,
    );
    const applied = tableExists.rows[0]?.exists
      ? (
          await client.query<AppliedMigration>(
            'SELECT version, filename, checksum FROM schema_migrations ORDER BY version',
          )
        ).rows
      : [];
    const pending = findPendingMigrations(migrations, applied);
    const lines: string[] = [];

    for (const migration of migrations) {
      const status = pending.some((item) => item.version === migration.version) ? 'pending' : 'applied';
      lines.push(`${migration.version} ${migration.filename} ${status}`);
    }

    if (mode === 'up') {
      for (const migration of pending) {
        await applyMigration(client, migration);
        lines[lines.findIndex((line) => line.startsWith(`${migration.version} `))] =
          `${migration.version} ${migration.filename} applied`;
      }
    }

    return lines;
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1::bigint)', [MIGRATION_LOCK_ID]);
    }
    client.release();
  }
}
