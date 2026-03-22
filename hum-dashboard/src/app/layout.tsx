import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Sidebar } from '@/components/sidebar';
import { verifyAuth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Hum Dashboard',
  description: 'Hum AI Marketing Agency Fleet Dashboard',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthed = await verifyAuth();

  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <Providers>
          {isAuthed ? (
            <>
              <Sidebar />
              <main className="ml-52 p-6 min-h-screen">{children}</main>
            </>
          ) : (
            children
          )}
        </Providers>
      </body>
    </html>
  );
}
