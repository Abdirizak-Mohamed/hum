'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CreditCard, Link as LinkIcon, LogOut, Plus } from 'lucide-react';
import { SocialStatus } from '@/components/social-status';
import { useAccount } from '@/lib/queries';

export default function AccountPage() {
  const router = useRouter();
  const { data, isLoading } = useAccount();

  const client = data?.client;
  const socialAccounts = data?.socialAccounts ?? [];

  const clientData = client ? {
    businessName: String(client.businessName ?? ''),
    email: String(client.email ?? ''),
    phone: client.phone ? String(client.phone) : null,
    planTier: String(client.planTier ?? 'starter'),
  } : null;

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (response.ok) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleBillingClick = () => {
    alert('Billing management coming soon! Contact support to upgrade your plan.');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl bg-gray-100 h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="rounded-xl bg-white border border-gray-200 p-8 text-center">
        <p className="text-gray-600">Unable to load account details</p>
      </div>
    );
  }

  const planTierLabel = clientData.planTier.charAt(0).toUpperCase() + clientData.planTier.slice(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and connected social media.</p>
      </div>

      {/* Plan Info Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Plan</h2>
          <CreditCard className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Current Plan</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{planTierLabel}</p>
          </div>
          <button
            onClick={handleBillingClick}
            className="w-full bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Manage Billing
          </button>
        </div>
      </section>

      {/* Connected Accounts Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
          <LinkIcon className="w-5 h-5 text-gray-400" />
        </div>

        {socialAccounts.length > 0 ? (
          <div className="space-y-3 mb-4">
            {socialAccounts.map((account: Record<string, unknown>) => (
              <SocialStatus
                key={account.id as string}
                platform={account.platform as any}
                status={account.status as 'connected' | 'disconnected' | 'expired'}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 p-4 text-center mb-4">
            <p className="text-gray-600 text-sm">No connected accounts yet</p>
          </div>
        )}

        <Link
          href="/connect"
          className="flex items-center justify-center gap-2 w-full border border-gray-300 text-gray-900 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add More Accounts
        </Link>
      </section>

      {/* Account Details Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Business Name</p>
            <p className="text-base font-medium text-gray-900 mt-1">{clientData.businessName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-base font-medium text-gray-900 mt-1">{clientData.email}</p>
          </div>
          {clientData.phone && (
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-base font-medium text-gray-900 mt-1">{clientData.phone}</p>
            </div>
          )}
        </div>
      </section>

      {/* Logout Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-700 font-semibold py-3 px-4 rounded-lg hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </section>
    </div>
  );
}
