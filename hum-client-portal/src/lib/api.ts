// ─── Core fetch helper ────────────────────────────────────────────────────────

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const api = {
  content: {
    list: (params?: { status?: string; page?: number; limit?: number }) => {
      const sp = new URLSearchParams();
      if (params?.status) sp.set('status', params.status);
      if (params?.page) sp.set('page', String(params.page));
      if (params?.limit) sp.set('limit', String(params.limit));
      const qs = sp.toString();
      return fetchJson<{
        items: Record<string, unknown>[];
        total: number;
        page: number;
        limit: number;
      }>(`/api/content${qs ? `?${qs}` : ''}`);
    },
  },
};
