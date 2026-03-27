import { getPortalUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogoutButton } from '@/components/logout-button';

export default async function WaitingPage() {
  const user = await getPortalUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">hum</h1>
        </div>

        {/* Main message */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            We're reviewing your application
          </h2>
          <p className="text-base text-gray-600">
            We'll have everything set up shortly. You'll be able to log in to your full dashboard once we've reviewed your information.
          </p>
        </div>

        {/* User greeting */}
        {user.name && (
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-700">
              Thanks for submitting, <strong>{user.name}</strong>!
            </p>
          </div>
        )}

        {/* Logout button */}
        <div className="flex justify-center pt-4">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
