import { getPortalUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';

export default async function SuspendedPage() {
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
            Account Suspended
          </h2>
          <p className="text-base text-gray-600">
            Your account has been suspended. Please contact support for assistance.
          </p>
        </div>

        {/* Logout button */}
        <div className="flex justify-center pt-4">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
