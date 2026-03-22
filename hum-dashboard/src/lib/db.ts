import { createDb, type HumDb } from 'hum-core';

// Lazy singleton — created on first access so the sqlite3 binding is only
// loaded when a request actually arrives, not at module evaluation time.
let _db: HumDb['db'] | null = null;

export function getDb(): HumDb['db'] {
  if (!_db) {
    const { db } = createDb();
    _db = db;
  }
  return _db;
}

// Named export for convenience — same lazy behaviour because module-level
// 'const db = getDb()' would call createDb() eagerly.
export const db = new Proxy({} as HumDb['db'], {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
