import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { StorageClient } from './types.js';

export class S3StorageClient implements StorageClient {
  private s3: S3Client;
  private bucket: string;

  constructor(bucket: string, region?: string) {
    this.bucket = bucket;
    this.s3 = new S3Client({ region: region ?? process.env.AWS_REGION ?? 'us-east-1' });
  }

  async save(clientId: string, contentId: string, data: Buffer, ext: string): Promise<string> {
    const key = `${clientId}/${contentId}.${ext}`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: this.getMimeType(ext),
    }));
    return key;
  }

  getUrl(key: string): string {
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  private getMimeType(ext: string): string {
    const types: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', webp: 'image/webp',
    };
    return types[ext] ?? 'application/octet-stream';
  }
}
