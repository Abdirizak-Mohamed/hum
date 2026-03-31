import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import type { HumDb } from './connection.js';

export async function createPgDb(url: string): Promise<HumDb> {
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  return {
    db,
    async close() {
      await pool.end();
    },
  };
}

/** Run migrations — call this separately during deploy, not on every connection. */
export async function runMigrations(url: string): Promise<void> {
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  await migrate(db, {
    migrationsFolder: new URL('./migrations', import.meta.url).pathname,
  });
  await pool.end();
}
