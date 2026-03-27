import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export const QUERY_KEYS = {
  content: (params?: Record<string, unknown>) => ['content', params ?? {}] as const,
} as const;

export function useContent(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: QUERY_KEYS.content(params),
    queryFn: () => api.content.list(params),
  });
}
