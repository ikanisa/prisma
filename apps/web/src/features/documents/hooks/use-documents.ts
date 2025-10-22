'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDocuments } from '../services/document-service';
import { queryKeys } from '../../common/query-keys';
import { useAppStore } from '@/src/store/app-store';
import { useAuthStore } from '@/src/store/auth-store';

export function useDocuments(repo?: string | null) {
  const orgSlug = useAppStore((state) => state.orgSlug);
  const token = useAuthStore((state) => state.session?.access_token ?? null);

  const queryKey = useMemo(() => queryKeys.documents.list(orgSlug, repo), [orgSlug, repo]);

  const query = useQuery({
    queryKey,
    queryFn: async () => fetchDocuments(orgSlug ?? 'demo', repo, token),
    enabled: Boolean(orgSlug),
    suspense: true,
    useErrorBoundary: true,
  });

  return {
    documents: query.data?.documents ?? [],
    total: query.data?.total ?? 0,
    source: query.data?.source ?? 'stub',
    ...query,
  };
}
