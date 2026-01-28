import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let db: ReturnType<typeof createDb> | null = null;

function createDb(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export function getDb(connectionString?: string): ReturnType<typeof createDb> {
  if (db) return db;
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  db = createDb(url);
  return db;
}

export type Database = ReturnType<typeof getDb>;

/** Reset the cached DB instance — useful in tests */
export function resetDb(): void {
  db = null;
}
