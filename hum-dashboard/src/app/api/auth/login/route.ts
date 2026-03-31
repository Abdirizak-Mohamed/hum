import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;

  if (!password) {
    return NextResponse.json(
      { error: 'Server misconfiguration: DASHBOARD_PASSWORD not set', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body', code: 'BAD_REQUEST' }, { status: 400 });
  }

  if (body.password !== password) {
    return NextResponse.json({ error: 'Invalid password', code: 'INVALID_PASSWORD' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  return setAuthCookie(response);
}
