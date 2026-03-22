'use client';

import Link from 'next/link';
import { useFleetStats } from '@/lib/queries';
import { FleetStatsBar } from '@/components/fleet-stats';
import { SystemHealth } from '@/components/system-health';

const SEVERITY_BORDER: Record<string, string> = {
  red: 'border-l-red-500',
  amber: 'border-l-amber-500',
  purple: 'border-l-purple-500',
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Home() {
  const { data: stats, isLoading, isError } = useFleetStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-400">Loading fleet stats…</p>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-red-400">Failed to load fleet stats. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="text-xl font-semibold text-white">Fleet Overview</h1>

      {/* Stat cards */}
      <FleetStatsBar stats={stats} />

      {/* Health + Recent issues */}
      <div className="grid grid-cols-2 gap-4">
        <SystemHealth health={stats.health} />

        {/* Recent Issues */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Recent Issues
            </h2>
            <Link href="/issues" className="text-xs text-blue-400 hover:text-blue-300">
              View all →
            </Link>
          </div>

          {stats.recentIssues.length === 0 ? (
            <p className="text-sm text-gray-500">No recent issues.</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentIssues.map((issue) => (
                <li
                  key={issue.id}
                  className={`border-l-4 pl-3 py-2 bg-gray-800/50 rounded-r ${SEVERITY_BORDER[issue.severity] ?? 'border-l-gray-600'}`}
                >
                  <p className="text-sm font-medium text-gray-200">{issue.clientName}</p>
                  <p className="text-xs text-gray-400">{issue.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatRelative(issue.timestamp)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Upcoming Content */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Upcoming Content
          </h2>
          <Link href="/content" className="text-xs text-blue-400 hover:text-blue-300">
            View all →
          </Link>
        </div>

        {stats.upcomingContent.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming content scheduled.</p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {stats.upcomingContent.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="h-24 bg-gray-800 flex items-center justify-center">
                  {item.mediaUrl ? (
                    <img
                      src={`/api/media/${item.mediaUrl}`}
                      alt={item.contentType}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-gray-600">
                      {item.platform === 'instagram' ? '📷' : '📄'}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5 space-y-1">
                  <p className="text-xs font-medium text-gray-200 capitalize">
                    {item.contentType}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{item.clientName}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-400 capitalize">{item.platform}</span>
                    <span className="text-xs text-gray-500">{formatTime(item.scheduledAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
