import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema.js';

/** Run Postgres migrations. Call during deploy, not on every connection. */
export async function runMigrations(url: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  await migrate(db, {
    migrationsFolder: new URL('./migrations', import.meta.url).pathname,
  });
  await pool.end();
}
