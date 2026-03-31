import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { portalUserRepo } from 'hum-core';
import { db } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const user = await portalUserRepo.getByEmail(db, email);
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  await portalUserRepo.update(db, user.id, { lastLoginAt: new Date() });

  const response = NextResponse.json({ ok: true });
  return setAuthCookie(response, user.id);
}
