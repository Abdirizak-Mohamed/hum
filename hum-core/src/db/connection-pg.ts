import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema.js';
import type { HumDb } from './connection.js';

export async function createPgDb(url: string): Promise<HumDb> {
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  await migrate(db, {
    migrationsFolder: new URL('./migrations', import.meta.url).pathname,
  });

  return {
    db,
    async close() {
      await pool.end();
    },
  };
}
