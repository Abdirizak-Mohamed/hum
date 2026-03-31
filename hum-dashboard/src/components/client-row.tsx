'use client';

import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/status-badge';
import { cn } from '@/lib/utils';
import type { ClientListItem } from '@/types';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-900/50 text-pink-300',
  facebook: 'bg-blue-900/50 text-blue-300',
  google_business: 'bg-yellow-900/50 text-yellow-300',
  twitter: 'bg-sky-900/50 text-sky-300',
  linkedin: 'bg-blue-900/50 text-blue-300',
};

const DEFAULT_PLATFORM_COLOR = 'bg-gray-800 text-gray-400';

type ClientRowProps = {
  client: ClientListItem;
};

export function ClientRow({ client }: ClientRowProps) {
  const router = useRouter();
  const isPaused = client.status === 'paused';

  return (
    <tr
      onClick={() => router.push(`/clients/${client.id}`)}
      className={cn(
        'border-b border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors',
        isPaused && 'opacity-50'
      )}
    >
      {/* Name / location / email */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-100">{client.businessName}</p>
        {client.address && (
          <p className="text-xs text-gray-400 truncate max-w-[180px]">{client.address}</p>
        )}
        <p className="text-xs text-gray-500">{client.email}</p>
      </td>

      {/* Plan tier */}
      <td className="px-4 py-3">
        <span className="text-xs text-gray-300 capitalize">{client.planTier}</span>
      </td>

      {/* Platforms */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {client.platforms.map((p) => {
            const colorClass = PLATFORM_COLORS[p.platform] ?? DEFAULT_PLATFORM_COLOR;
            const isExpired = p.status === 'expired';
            return (
              <span
                key={p.platform}
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                  colorClass,
                  isExpired && 'line-through opacity-60'
                )}
              >
                {p.platform.replace('_', ' ')}
              </span>
            );
          })}
        </div>
      </td>

      {/* Scheduled count */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm text-gray-300">{client.scheduledCount}</span>
      </td>

      {/* Status badge */}
      <td className="px-4 py-3">
        <StatusBadge status={client.status} />
      </td>
    </tr>
  );
}
