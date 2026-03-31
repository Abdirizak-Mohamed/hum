'use client';

import { StatusBadge } from '@/components/status-badge';
import { usePauseClient } from '@/lib/queries';
import type { Client } from '@/types';

type ClientHeaderProps = {
  client: Client;
};

export function ClientHeader({ client }: ClientHeaderProps) {
  const pauseClient = usePauseClient();

  const isPaused = client.status === 'paused';

  function handleToggle() {
    pauseClient.mutate({
      id: client.id,
      status: isPaused ? 'active' : 'paused',
    });
  }

  return (
    <div className="flex items-start justify-between rounded-lg border border-gray-800 bg-gray-900 p-5">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">{client.businessName}</h1>
          <StatusBadge status={client.status} />
          <span className="inline-flex items-center rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-300 capitalize">
            {client.planTier}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{client.email}</span>
          {client.address && <span>{client.address}</span>}
          {client.phone && <span>{client.phone}</span>}
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={pauseClient.isPending}
        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          isPaused
            ? 'bg-green-700 hover:bg-green-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
        }`}
      >
        {pauseClient.isPending
          ? 'Saving…'
          : isPaused
          ? 'Resume'
          : 'Pause'}
      </button>
    </div>
  );
}
