'use client';

import type { FleetStats } from '@/types';

type StatCard = {
  label: string;
  value: number;
  colorClass: string;
  dotColor: string;
};

function StatCard({ label, value, colorClass, dotColor }: StatCard) {
  return (
    <div className={`rounded-lg border p-4 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-sm font-medium text-gray-300">{label}</span>
      </div>
      <p className="text-4xl font-bold text-white">{value}</p>
    </div>
  );
}

type FleetStatsBarProps = {
  stats: FleetStats;
};

export function FleetStatsBar({ stats }: FleetStatsBarProps) {
  const cards: StatCard[] = [
    {
      label: 'Active',
      value: stats.active,
      colorClass: 'bg-green-950/40 border-green-800/50',
      dotColor: 'bg-green-400',
    },
    {
      label: 'Issues',
      value: stats.issues,
      colorClass: 'bg-amber-950/40 border-amber-800/50',
      dotColor: 'bg-amber-400',
    },
    {
      label: 'Onboarding',
      value: stats.onboarding,
      colorClass: 'bg-blue-950/40 border-blue-800/50',
      dotColor: 'bg-blue-400',
    },
    {
      label: 'Paused',
      value: stats.paused,
      colorClass: 'bg-gray-900 border-gray-700',
      dotColor: 'bg-gray-500',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
