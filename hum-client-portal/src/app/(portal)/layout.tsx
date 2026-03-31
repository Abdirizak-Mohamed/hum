import { redirect } from 'next/navigation';
import { getPortalUser } from '@/lib/auth';
import { clientRepo } from 'hum-core';
import { db } from '@/lib/db';
import { PortalNav } from '@/components/portal-nav';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getPortalUser();

  if (!user) {
    redirect('/login');
  }

  if (user.isPendingIntake()) {
    redirect('/intake');
  }

  if (user.isPendingApproval()) {
    redirect('/waiting');
  }

  if (user.status === 'suspended') {
    redirect('/suspended');
  }

  // At this point user must be active
  if (user.status !== 'active') {
    redirect('/login');
  }

  let businessName = 'Hum';
  if (user.clientId) {
    const client = await clientRepo.getById(db, user.clientId);
    if (client) {
      businessName = client.businessName;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 sm:pb-0">
      <PortalNav businessName={businessName} />
      <main className="w-full max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
