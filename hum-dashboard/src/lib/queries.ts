import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FleetStats, ClientListItem, ClientDetail, IssueItem } from '@/types';
import type { ContentItem } from '@/lib/api';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const QUERY_KEYS = {
  fleetStats: ['fleet', 'stats'] as const,
  clients: ['clients'] as const,
  client: (id: string) => ['clients', id] as const,
  content: (params?: {
    clientId?: string;
    platform?: string;
    range?: string;
    status?: string;
  }) => ['content', params ?? {}] as const,
  issues: (type?: string) => ['issues', type ?? 'all'] as const,
  issuesCount: ['issues', 'count'] as const,
};

// ─── Fleet hooks ──────────────────────────────────────────────────────────────

export function useFleetStats() {
  return useQuery<FleetStats>({
    queryKey: QUERY_KEYS.fleetStats,
    queryFn: () => api.fleet.stats(),
  });
}

// ─── Client hooks ─────────────────────────────────────────────────────────────

export function useClients() {
  return useQuery<ClientListItem[]>({
    queryKey: QUERY_KEYS.clients,
    queryFn: () => api.clients.list(),
  });
}

export function useClient(id: string) {
  return useQuery<ClientDetail>({
    queryKey: QUERY_KEYS.client(id),
    queryFn: () => api.clients.get(id),
    enabled: Boolean(id),
  });
}

export function usePauseClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.clients.update(id, { status }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.clients });
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.client(id) });
    },
  });
}

// ─── Content hooks ────────────────────────────────────────────────────────────

export function useContent(params?: {
  clientId?: string;
  platform?: string;
  range?: string;
  status?: string;
}) {
  return useQuery<ContentItem[]>({
    queryKey: QUERY_KEYS.content(params),
    queryFn: () => api.content.list(params),
  });
}

export function usePauseContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.content.pause(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.content.remove(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

// ─── Issues hooks ─────────────────────────────────────────────────────────────

export function useIssues(type?: string) {
  return useQuery<IssueItem[]>({
    queryKey: QUERY_KEYS.issues(type),
    queryFn: () => api.issues.list(type),
  });
}

export function useRetryIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.issues.retry(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['issues'] });
    },
  });
}

export function useDismissIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.issues.dismiss(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['issues'] });
    },
  });
}
