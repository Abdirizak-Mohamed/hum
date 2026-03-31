import { createDb, type HumDb } from 'hum-core';

let _dbPromise: Promise<HumDb['db']> | null = null;

export function getDb(): Promise<HumDb['db']> {
  if (!_dbPromise) {
    _dbPromise = createDb().then(({ db }) => db);
  }
  return _dbPromise;
}
