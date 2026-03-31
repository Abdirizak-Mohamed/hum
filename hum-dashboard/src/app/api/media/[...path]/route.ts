import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

type RouteContext = { params: Promise<{ path: string[] }> };

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { path: segments } = await params;

    const MEDIA_BASE = path.resolve(
      process.env.MEDIA_STORAGE_PATH ?? './media',
    );

    // Join path segments and resolve
    const relativePath = segments.join('/');
    const filePath = path.resolve(MEDIA_BASE, relativePath);

    // Prevent directory traversal
    if (!filePath.startsWith(MEDIA_BASE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(filePath);
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] ?? 'application/octet-stream';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('[media/[...path]] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
