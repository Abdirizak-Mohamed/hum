import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { StorageClient } from './types.js';

export class LocalStorageClient implements StorageClient {
  constructor(private basePath: string) {}

  async save(clientId: string, contentId: string, data: Buffer, ext: string): Promise<string> {
    const dir = path.join(this.basePath, clientId);
    await mkdir(dir, { recursive: true });
    const relativePath = path.join(clientId, `${contentId}.${ext}`);
    await writeFile(path.join(this.basePath, relativePath), data);
    return relativePath;
  }

  getUrl(filePath: string): string {
    return path.resolve(this.basePath, filePath);
  }

  async delete(filePath: string): Promise<void> {
    await unlink(path.join(this.basePath, filePath));
  }
}
