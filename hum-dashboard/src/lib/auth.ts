import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const COOKIE_NAME = 'hum-auth';
export const TOKEN_VALUE = 'authenticated';

export async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value === TOKEN_VALUE;
}

export function setAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, TOKEN_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return response;
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.delete(COOKIE_NAME);
  return response;
}

export function requireAuth(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
}
