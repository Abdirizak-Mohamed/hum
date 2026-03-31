import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { getPortalUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: 'Hum — Your Marketing Portal',
  description: 'View your content, upload photos, manage your account',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getPortalUser();
  const headersList = await headers();
  const pathname = headersList.get('x-next-pathname') ?? '';

  if (user) {
    const publicPaths = ['/login', '/signup'];
    if (publicPaths.some((p) => pathname.startsWith(p))) {
      if (user.isPendingIntake()) redirect('/intake');
      if (user.isPendingApproval()) redirect('/waiting');
      redirect('/');
    }
    if (user.status === 'suspended' && pathname !== '/suspended') redirect('/suspended');
    if (user.isPendingApproval() && pathname !== '/waiting') redirect('/waiting');
    if (user.isPendingIntake() && !pathname.startsWith('/intake')) redirect('/intake');
  }

  return (
    <html lang="en">
      <body className="bg-white text-gray-900 min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
