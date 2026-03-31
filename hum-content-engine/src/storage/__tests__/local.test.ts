import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalStorageClient } from '../local.js';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

let storage: LocalStorageClient;
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), 'hum-storage-'));
  storage = new LocalStorageClient(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('LocalStorageClient', () => {
  it('saves a file and returns a path', async () => {
    const data = Buffer.from('fake image data');
    const savedPath = await storage.save('client-1', 'content-1', data, 'png');
    expect(savedPath).toContain('client-1');
    expect(savedPath).toContain('content-1.png');
    const contents = await readFile(storage.getUrl(savedPath));
    expect(contents.toString()).toBe('fake image data');
  });

  it('creates nested directories automatically', async () => {
    const data = Buffer.from('data');
    const savedPath = await storage.save('new-client', 'img-1', data, 'jpg');
    const contents = await readFile(storage.getUrl(savedPath));
    expect(contents.toString()).toBe('data');
  });

  it('getUrl returns absolute path', () => {
    const url = storage.getUrl('client-1/content-1.png');
    expect(path.isAbsolute(url)).toBe(true);
  });

  it('deletes a file', async () => {
    const data = Buffer.from('to delete');
    const savedPath = await storage.save('client-1', 'del-1', data, 'png');
    await storage.delete(savedPath);
    await expect(readFile(storage.getUrl(savedPath))).rejects.toThrow();
  });
});
