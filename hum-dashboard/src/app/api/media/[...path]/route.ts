import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type RouteContext = { params: Promise<{ path: string[] }> };

const BUCKET = process.env.MEDIA_BUCKET;
const s3 = BUCKET ? new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' }) : null;

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { path: segments } = await params;

  // S3 mode (production)
  if (s3 && BUCKET) {
    try {
      const key = segments.join('/');
      const url = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }), { expiresIn: 3600 });
      return NextResponse.redirect(url);
    } catch (err) {
      console.error('[media/[...path]] S3 error:', err);
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  // Local fallback (dev)
  try {
    const { readFile } = await import('fs/promises');
    const path = await import('path');
    const MEDIA_BASE = path.resolve(process.env.MEDIA_STORAGE_PATH ?? './media');
    const filePath = path.resolve(MEDIA_BASE, segments.join('/'));

    if (!filePath.startsWith(MEDIA_BASE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const types: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
    };
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': types[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
