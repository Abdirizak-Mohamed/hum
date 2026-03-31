import { describe, it, expect, vi, beforeEach } from 'vitest';
import { S3StorageClient } from '../s3.js';

vi.mock('@aws-sdk/client-s3', () => {
  const send = vi.fn().mockResolvedValue({});
  return {
    S3Client: vi.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://bucket.s3.amazonaws.com/signed-url'),
}));

describe('S3StorageClient', () => {
  let storage: S3StorageClient;

  beforeEach(() => {
    storage = new S3StorageClient('test-bucket');
  });

  it('saves a file and returns the S3 key', async () => {
    const data = Buffer.from('fake image data');
    const key = await storage.save('client-1', 'content-1', data, 'png');
    expect(key).toBe('client-1/content-1.png');
  });

  it('getUrl returns a URL containing the key', () => {
    const url = storage.getUrl('client-1/content-1.png');
    expect(url).toContain('client-1/content-1.png');
  });

  it('deletes a file', async () => {
    await expect(storage.delete('client-1/content-1.png')).resolves.not.toThrow();
  });
});
