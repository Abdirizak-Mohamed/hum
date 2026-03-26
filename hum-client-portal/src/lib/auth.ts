import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { portalUserRepo, type PortalUser } from 'hum-core';
import { db } from '@/lib/db';
import { COOKIE_NAME } from '@/lib/constants';

export { COOKIE_NAME };

export async function getPortalUser(): Promise<PortalUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  const user = await portalUserRepo.getById(db, cookie.value);
  return user ?? null;
}

export async function verifyAuth(): Promise<boolean> {
  const user = await getPortalUser();
  return user !== null;
}

export function setAuthCookie(response: NextResponse, portalUserId: string): NextResponse {
  response.cookies.set(COOKIE_NAME, portalUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.delete(COOKIE_NAME);
  return response;
}
