'use client';

import { useState, useMemo } from 'react';
import { useClients } from '@/lib/queries';
import { ClientRow } from '@/components/client-row';
import type { ClientListItem } from '@/types';

type StatusFilter = 'all' | 'active' | 'issues' | 'onboarding' | 'paused';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'issues', label: 'Issues' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'paused', label: 'Paused' },
];

function clientMatchesIssues(client: ClientListItem): boolean {
  return client.platforms.some((p) => p.status === 'expired' || p.status === 'disconnected');
}

function clientMatchesFilter(client: ClientListItem, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'issues') return clientMatchesIssues(client);
  return client.status === filter;
}

export default function ClientsPage() {
  const { data: clients, isLoading, isError } = useClients();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.toLowerCase();
    return clients.filter((c) => {
      const matchesSearch =
        !q ||
        c.businessName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);
      const matchesStatus = clientMatchesFilter(c, statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  function countForFilter(filter: StatusFilter): number {
    if (!clients) return 0;
    return clients.filter((c) => clientMatchesFilter(c, filter)).length;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-400">Loading clients…</p>
      </div>
    );
  }

  if (isError || !clients) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-red-400">Failed to load clients. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Clients</h1>

      {/* Search */}
      <input
        type="search"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-xs rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {STATUS_TABS.map((tab) => {
          const count = countForFilter(tab.key);
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t transition-colors ${
                isActive
                  ? 'border-b-2 border-blue-500 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-900 border-b border-gray-800">
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Client
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Platforms
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
                Scheduled
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-900/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                  No clients found.
                </td>
              </tr>
            ) : (
              filtered.map((client) => (
                <ClientRow key={client.id} client={client} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
