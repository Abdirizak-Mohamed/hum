import * as schema from './schema.js';
import { type PgDatabase } from 'drizzle-orm/pg-core';

export type HumDb = {
  db: PgDatabase<any, typeof schema>;
  close(): void | Promise<void>;
};

export async function createDb(url?: string): Promise<HumDb> {
  const dbUrl = url ?? process.env.DATABASE_URL ?? '';

  if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
    const { createPgDb } = await import('./connection-pg.js');
    return createPgDb(dbUrl);
  } else {
    const { createPgliteDb } = await import('./connection-pglite.js');
    return createPgliteDb(dbUrl || undefined);
  }
}
