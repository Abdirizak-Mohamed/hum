import type {
  FleetStats,
  ClientListItem,
  ClientDetail,
  IssueItem,
} from '@/types';

// ─── Core fetch helper ────────────────────────────────────────────────────────

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Content item shape returned by the list endpoint ─────────────────────────

export type ContentItem = {
  id: string;
  clientId: string;
  clientName: string;
  contentType: string;
  status: string;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  mediaUrls: string[];
  platforms: string[];
  scheduledAt: string | null;
  postedAt: string | null;
  performance: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

// ─── API namespace ─────────────────────────────────────────────────────────────

export const api = {
  fleet: {
    stats: () => fetchJson<FleetStats>('/api/fleet/stats'),
  },

  clients: {
    list: () => fetchJson<ClientListItem[]>('/api/clients'),
    get: (id: string) => fetchJson<ClientDetail>(`/api/clients/${id}`),
    update: (id: string, data: { status: string }) =>
      fetchJson<unknown>(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },

  content: {
    list: (params?: {
      clientId?: string;
      platform?: string;
      range?: string;
      status?: string;
    }) => {
      const sp = new URLSearchParams();
      if (params?.clientId) sp.set('clientId', params.clientId);
      if (params?.platform) sp.set('platform', params.platform);
      if (params?.range) sp.set('range', params.range);
      if (params?.status) sp.set('status', params.status);
      const qs = sp.toString();
      return fetchJson<ContentItem[]>(`/api/content${qs ? `?${qs}` : ''}`);
    },
    pause: (id: string) =>
      fetchJson<unknown>(`/api/content/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      }),
    remove: (id: string) =>
      fetchJson<unknown>(`/api/content/${id}`, { method: 'DELETE' }),
  },

  issues: {
    list: (type?: string) =>
      fetchJson<IssueItem[]>(`/api/issues${type ? `?type=${type}` : ''}`),
    count: () => fetchJson<{ count: number }>('/api/issues?countOnly=true'),
    retry: (id: string) =>
      fetchJson<unknown>(`/api/issues/${id}/retry`, { method: 'POST' }),
    dismiss: (id: string) =>
      fetchJson<unknown>(`/api/issues/${id}/dismiss`, { method: 'POST' }),
  },
};
