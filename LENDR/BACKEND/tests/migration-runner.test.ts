import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  applyMigration,
  assertSafeMigrationTarget,
  checksumMigration,
  findPendingMigrations,
  loadMigrations,
  PRODUCTION_BRANCH_ID,
  type Migration,
  type MigrationQueryClient,
} from '../src/db/migration-runner';

const temporaryDirectories: string[] = [];

async function createMigrationDirectory(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lendr-migrations-'));
  temporaryDirectories.push(directory);
  for (const [filename, sql] of Object.entries(files)) {
    await writeFile(path.join(directory, filename), sql);
  }
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('migration discovery and checksums', () => {
  it('loads migration files in numeric version order', async () => {
    const directory = await createMigrationDirectory({
      '002_second.sql': 'SELECT 2;',
      '001_first.sql': 'SELECT 1;',
      'not-a-migration.sql': 'SELECT 0;',
    });

    const migrations = await loadMigrations(directory);

    expect(migrations.map(({ version, filename }) => [version, filename])).toEqual([
      [1, '001_first.sql'],
      [2, '002_second.sql'],
    ]);
  });

  it('detects changed, renamed, or removed applied migrations', async () => {
    const migrations: Migration[] = [
      { version: 1, filename: '001_initial.sql', sql: 'SELECT 1;', checksum: checksumMigration('SELECT 1;') },
    ];
    const unchanged = [{ version: 1, filename: '001_initial.sql', checksum: checksumMigration('SELECT 1;') }];
    const changed = [{ version: 1, filename: '001_initial.sql', checksum: checksumMigration('SELECT 2;') }];
    const renamed = [{ version: 1, filename: '001_renamed.sql', checksum: checksumMigration('SELECT 1;') }];
    const removed: typeof unchanged = [];

    expect(findPendingMigrations(migrations, unchanged)).toEqual([]);
    expect(() => findPendingMigrations(migrations, changed)).toThrow(/checksum mismatch/i);
    expect(() => findPendingMigrations(migrations, renamed)).toThrow(/checksum mismatch/i);
    expect(() => findPendingMigrations([], unchanged)).toThrow(/checksum mismatch/i);
  });

  it('rejects duplicate migration versions', async () => {
    const directory = await createMigrationDirectory({
      '001_first.sql': 'SELECT 1;',
      '001_second.sql': 'SELECT 2;',
    });

    await expect(loadMigrations(directory)).rejects.toThrow(/duplicate migration version/i);
  });

  it('uses a stable SHA-256 checksum for migration contents', async () => {
    const sql = await readFile(
      path.resolve(__dirname, '../migrations/001_initial_schema.sql'),
      'utf8',
    );

    expect(checksumMigration(sql)).toMatch(/^[a-f0-9]{64}$/);
    expect(checksumMigration(sql)).toBe(checksumMigration(sql));
  });
});

describe('migration target safety', () => {
  it('requires the actual Neon identity to match explicitly expected IDs', () => {
    expect(() =>
      assertSafeMigrationTarget(
        { projectId: 'project-dev', branchId: 'branch-dev' },
        { projectId: 'project-dev', branchId: 'branch-dev' },
      ),
    ).not.toThrow();
    expect(() =>
      assertSafeMigrationTarget(
        { projectId: 'project-dev', branchId: 'branch-prod' },
        { projectId: 'project-dev', branchId: 'branch-dev' },
      ),
    ).toThrow(/does not match/i);
    expect(() =>
      assertSafeMigrationTarget(
        { projectId: 'project-dev', branchId: PRODUCTION_BRANCH_ID },
        { projectId: 'project-dev', branchId: PRODUCTION_BRANCH_ID },
      ),
    ).toThrow(/production branch/i);
    expect(() =>
      assertSafeMigrationTarget(
        { projectId: null, branchId: null },
        { projectId: 'project-dev', branchId: 'branch-dev' },
      ),
    ).toThrow(/could not be verified/i);
  });
});

describe('transactional migration application', () => {
  it('rolls back a failed migration without recording it', async () => {
    const calls: string[] = [];
    const client: MigrationQueryClient = {
      async query(sql) {
        calls.push(sql);
        if (sql === 'INVALID SQL') {
          throw new Error('simulated migration failure');
        }
        return { rows: [] };
      },
    };
    const migration: Migration = {
      version: 1,
      filename: '001_failing.sql',
      sql: 'INVALID SQL',
      checksum: checksumMigration('INVALID SQL'),
    };

    await expect(applyMigration(client, migration)).rejects.toThrow('simulated migration failure');
    expect(calls).toEqual(['BEGIN', 'INVALID SQL', 'ROLLBACK']);
    expect(calls.some((call) => call.includes('INSERT INTO schema_migrations'))).toBe(false);
  });

  it('records and commits a successfully applied migration', async () => {
    const calls: string[] = [];
    const client: MigrationQueryClient = {
      async query(sql) {
        calls.push(sql);
        return { rows: [] };
      },
    };
    const migration: Migration = {
      version: 1,
      filename: '001_ok.sql',
      sql: 'SELECT 1;',
      checksum: checksumMigration('SELECT 1;'),
    };

    await applyMigration(client, migration);

    expect(calls.map((call) => call.trim())).toEqual([
      'BEGIN',
      'SELECT 1;',
      'INSERT INTO schema_migrations (version, filename, checksum)\n       VALUES ($1, $2, $3)',
      'COMMIT',
    ]);
  });
});
