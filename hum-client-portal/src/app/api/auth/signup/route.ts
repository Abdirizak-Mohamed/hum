import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { portalUserRepo } from 'hum-core';
import { db } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password, name } = body;
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
  }

  const existing = await portalUserRepo.getByEmail(db, email);
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await portalUserRepo.create(db, { email, passwordHash, name });

  const response = NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  return setAuthCookie(response, user.id);
}
