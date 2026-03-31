import { describe, it, expect, afterEach } from 'vitest';
import { createDb, type HumDb } from '../connection.js';
import { clients } from '../schema.js';

describe('createDb', () => {
  let humDb: HumDb;

  afterEach(async () => {
    await humDb?.close();
  });

  it('creates a PGlite database when no postgres URL given', async () => {
    humDb = await createDb();
    expect(humDb).toBeDefined();
    expect(humDb.db).toBeDefined();
  });

  it('can execute queries after schema creation', async () => {
    humDb = await createDb();
    const result = await humDb.db.select().from(clients);
    expect(result).toEqual([]);
  });
});
