import { NextRequest, NextResponse } from 'next/server';
import { getPortalUser } from '@/lib/auth';
import { clientUploadRepo } from 'hum-core';
import { getDb } from '@/lib/db';
import { readFile } from 'fs/promises';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getPortalUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const { id } = await params;
  const upload = await clientUploadRepo.getById(db, id);

  if (!upload) {
    return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
  }

  if (upload.portalUserId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const fileBuffer = await readFile(upload.storagePath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': upload.mimeType,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
  }
}
