import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

let db: ReturnType<typeof createDb> | null = null;
let sqlClient: Sql | null = null;

function createDb(connectionString: string) {
  sqlClient = postgres(connectionString, {
    ssl: 'require',
    connect_timeout: 10,
  });
  return drizzle(sqlClient, { schema });
}

/**
 * Build the database URL, substituting [password] placeholder with URL-encoded DB_PASSWORD
 */
function buildDatabaseUrl(url: string): string {
  const dbPassword = process.env.DB_PASSWORD;
  console.log('[DB] Raw DATABASE_URL:', url);
  console.log('[DB] DB_PASSWORD:', dbPassword);
  console.log('[DB] DB_PASSWORD length:', dbPassword?.length);
  console.log('[DB] URL contains [password]:', url.includes('[password]'));
  if (dbPassword && url.includes('[password]')) {
    const encodedPassword = encodeURIComponent(dbPassword);
    console.log('[DB] Encoded password:', encodedPassword);
    const result = url.replace('[password]', encodedPassword);
    console.log('[DB] Final URL:', result);
    return result;
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
      console.error('[DB] SQL client not initialized');
      return false;
    }
    console.log('[DB] Testing connection...');
    const result = await sqlClient`SELECT NOW() as now`;
    console.log('[DB] Connection successful! Server time:', result[0]?.now);
    return true;
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    return false;
  }
}

export type Database = ReturnType<typeof getDb>;

/** Reset the cached DB instance — useful in tests */
export function resetDb(): void {
  db = null;
}
