import { Pool } from 'pg';
import { databaseConfig } from './env';

export const pool = databaseConfig ? new Pool(databaseConfig) : null;

export async function checkDatabaseConnection(): Promise<void> {
  if (!pool) {
    throw new Error('PostgreSQL connection settings are not configured.');
  }

  await pool.query('SELECT 1');
}
