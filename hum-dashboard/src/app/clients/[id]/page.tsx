'use client';

import { use } from 'react';
import { useClient } from '@/lib/queries';
import { ClientHeader } from '@/components/client-header';
import { BrandProfilePanel } from '@/components/brand-profile-panel';
import { SocialAccountsPanel } from '@/components/social-accounts-panel';
import { OnboardingProgress } from '@/components/onboarding-progress';
import { RecentContent } from '@/components/recent-content';

type Params = { id: string };

export default function ClientDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const { data, isLoading, isError } = useClient(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-400">Loading client…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-red-400">Failed to load client. Please refresh.</p>
      </div>
    );
  }

  const { client, brandProfile, socialAccounts, recentContent, onboarding } = data;
  const isOnboarding = client.status === 'onboarding';

  return (
    <div className="space-y-5">
      <ClientHeader client={client} />

      <div className="grid grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          <BrandProfilePanel brandProfile={brandProfile} />
          <SocialAccountsPanel accounts={socialAccounts} />
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {isOnboarding && <OnboardingProgress onboarding={onboarding} />}
          <RecentContent items={recentContent} clientId={id} />
        </div>
      </div>
    </div>
  );
}
