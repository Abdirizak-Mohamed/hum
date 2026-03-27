import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export const QUERY_KEYS = {
  content: (params?: Record<string, unknown>) => ['content', params ?? {}] as const,
  uploads: (params?: Record<string, unknown>) => ['uploads', params ?? {}] as const,
} as const;

export function useContent(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: QUERY_KEYS.content(params),
    queryFn: () => api.content.list(params),
  });
}

export function useUploads(params?: { category?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: QUERY_KEYS.uploads(params),
    queryFn: () => api.uploads.list(params),
  });
}
