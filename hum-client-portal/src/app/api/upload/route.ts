import { NextRequest, NextResponse } from 'next/server';
import { getPortalUser } from '@/lib/auth';
import { clientUploadRepo } from 'hum-core';
import { db } from '@/lib/db';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'application/pdf',
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
};

export async function POST(request: NextRequest) {
  const user = await getPortalUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const category = formData.get('category') as string | null;

  if (!file || !category) {
    return NextResponse.json(
      { error: 'Missing file or category' },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `File type ${file.type} is not allowed. Accepted: JPEG, PNG, HEIC, PDF` },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'File exceeds 10 MB limit' },
      { status: 400 },
    );
  }

  const validCategories = ['food_photo', 'menu', 'logo', 'interior', 'other'];
  if (!validCategories.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const ext = EXT_MAP[file.type] ?? 'bin';
  const dir = join(process.cwd(), 'media', 'uploads', user.id);
  const filename = `${id}.${ext}`;
  const storagePath = join(dir, filename);

  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  const upload = await clientUploadRepo.create(db, {
    portalUserId: user.id,
    filename: file.name,
    storagePath,
    mimeType: file.type,
    sizeBytes: file.size,
    category: category as 'food_photo' | 'menu' | 'logo' | 'interior' | 'other',
  });

  return NextResponse.json(upload);
}

export async function GET(request: NextRequest) {
  const user = await getPortalUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') ?? undefined;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));

  const all = await clientUploadRepo.listByPortalUserId(db, user.id, {
    category,
  });

  const total = all.length;
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);

  return NextResponse.json({ items, total, page, limit });
}
