'use client';

import { useState, useMemo } from 'react';
import { useContent, useClients } from '@/lib/queries';
import { ContentCard } from '@/components/content-card';
import { ContentPreviewModal } from '@/components/content-preview-modal';
import type { ContentItem } from '@/lib/api';

const PLATFORMS = ['instagram', 'facebook', 'google_business'];
const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Draft' },
  { value: 'posted', label: 'Posted' },
  { value: 'failed', label: 'Failed' },
];
const RANGES = [
  { value: '', label: 'All time' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function groupByDate(items: ContentItem[]): Array<{ date: string; label: string; items: ContentItem[] }> {
  const map = new Map<string, ContentItem[]>();
  for (const item of items) {
    const key = item.scheduledAt
      ? new Date(item.scheduledAt).toDateString()
      : 'No date';
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }
  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    label: items[0].scheduledAt ? formatDateLabel(items[0].scheduledAt) : 'Unscheduled',
    items,
  }));
}

export default function ContentPage() {
  const [clientId, setClientId] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState('');
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);

  const params = {
    clientId: clientId || undefined,
    platform: platform || undefined,
    status: status || undefined,
    range: range || undefined,
  };

  const { data: contentItems, isLoading, isError } = useContent(params);
  const { data: clients } = useClients();

  const grouped = useMemo(() => {
    if (!contentItems) return [];
    return groupByDate(contentItems);
  }, [contentItems]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-white">Content</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Client filter */}
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Clients</option>
          {(clients ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.businessName}
            </option>
          ))}
        </select>

        {/* Platform filter */}
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p.replace('_', ' ')}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Range filter */}
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-40">
          <p className="text-gray-400">Loading content…</p>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center min-h-40">
          <p className="text-red-400">Failed to load content. Please refresh.</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex items-center justify-center min-h-40">
          <p className="text-gray-500">No content found for the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.date}>
              <h2 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wider">
                {group.label}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {group.items.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    onPreview={setPreviewItem}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewItem && (
        <ContentPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}
