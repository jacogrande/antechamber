import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';
import { createLogger } from '../lib/logger';

const log = createLogger('db');

let db: ReturnType<typeof createDb> | null = null;
let sqlClient: Sql | null = null;

function createDb(connectionString: string) {
  sqlClient = postgres(connectionString, {
    ssl: 'require',
    connect_timeout: 10,
    prepare: false, // Required for Supabase Transaction mode pooler
    max: 1, // Limit connections per serverless instance
  });
  return drizzle(sqlClient, { schema });
}

/**
 * Build the database URL, substituting [password] placeholder with URL-encoded DB_PASSWORD
 */
function buildDatabaseUrl(url: string): string {
  const dbPassword = process.env.DB_PASSWORD;
  if (dbPassword && url.includes('[password]')) {
    const encodedPassword = encodeURIComponent(dbPassword);
    return url.replace('[password]', encodedPassword);
  }
  return url;
}

export function getDb(connectionString?: string): ReturnType<typeof createDb> {
  if (db) return db;
  const rawUrl = connectionString ?? process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  const url = buildDatabaseUrl(rawUrl);
  db = createDb(url);
  return db;
}

/**
 * Test the database connection on startup
 */
export async function checkDbConnection(): Promise<boolean> {
  try {
    // Ensure db is initialized
    getDb();
    if (!sqlClient) {
      log.error('SQL client not initialized');
      return false;
    }
    log.debug('Testing connection...');
    const result = await sqlClient`SELECT NOW() as now`;
    log.debug('Connection successful', { serverTime: result[0]?.now });
    return true;
  } catch (error) {
    log.error('Connection failed', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

export type Database = ReturnType<typeof getDb>;

/** Reset the cached DB instance — useful in tests */
export function resetDb(): void {
  db = null;
}
