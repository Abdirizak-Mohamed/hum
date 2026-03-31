'use client';

import type { FleetStats } from '@/types';

const DOT_COLORS: Record<'green' | 'amber' | 'red', string> = {
  green: 'bg-green-400',
  amber: 'bg-amber-400',
  red: 'bg-red-400',
};

type SystemHealthProps = {
  health: FleetStats['health'];
};

type HealthRow = {
  key: string;
  label: string;
  status: 'green' | 'amber' | 'red';
  detail: string;
};

export function SystemHealth({ health }: SystemHealthProps) {
  const rows: HealthRow[] = [
    {
      key: 'contentPipeline',
      label: 'Content Pipeline',
      status: health.contentPipeline.status,
      detail: health.contentPipeline.detail,
    },
    {
      key: 'socialConnections',
      label: 'Social Connections',
      status: health.socialConnections.status,
      detail: health.socialConnections.detail,
    },
    {
      key: 'tokenStatus',
      label: 'Token Status',
      status: health.tokenStatus.status,
      detail: health.tokenStatus.detail,
    },
    {
      key: 'contentGeneration',
      label: 'Content Generation',
      status: health.contentGeneration.status,
      detail: health.contentGeneration.detail,
    },
  ];

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        System Health
      </h2>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-3">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT_COLORS[row.status]}`}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-200">{row.label}</p>
              <p className="text-xs text-gray-400 truncate">{row.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
