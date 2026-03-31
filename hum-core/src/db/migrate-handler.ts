import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');

  console.log('Running migrations...');
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  const __dirname = dirname(fileURLToPath(import.meta.url));
  await migrate(db, {
    migrationsFolder: join(__dirname, 'migrations'),
  });

  await pool.end();
  console.log('Migrations complete');
  return { statusCode: 200, body: 'Migrations complete' };
}
