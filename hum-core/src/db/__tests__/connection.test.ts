import { describe, it, expect, afterEach } from 'vitest';
import { createDb } from '../connection.js';
import { clients } from '../schema.js';
import { sql } from 'drizzle-orm';

describe('createDb', () => {
  let db: ReturnType<typeof createDb>;

  afterEach(() => {
    db?.close();
  });

  it('creates an in-memory SQLite database', () => {
    db = createDb(':memory:');
    expect(db).toBeDefined();
    expect(db.db).toBeDefined();
  });

  it('can execute queries after migration', () => {
    db = createDb(':memory:');
    const result = db.db.select().from(clients).all();
    expect(result).toEqual([]);
  });
});
