'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDocuments, type DocumentResult } from '../services/document-service';
import { queryKeys } from '../../common/query-keys';
import { useAppStore } from '@/src/store/app-store';
import { useAuthStore } from '@/src/store/auth-store';

export function useDocuments(repo?: string | null) {
  const rawOrgSlug = useAppStore((state) => state.orgSlug);
  const orgSlug = rawOrgSlug?.trim() || 'demo';
  const token = useAuthStore((state) => state.session?.access_token ?? null);

  const queryKey = useMemo(() => queryKeys.documents.list(orgSlug, repo), [orgSlug, repo]);

  const query = useQuery<DocumentResult>({
    queryKey,
    queryFn: () => fetchDocuments(orgSlug, repo, token),
  });

  const fallback: DocumentResult = { documents: [], total: 0, source: 'stub' };
  const result = query.data ?? fallback;

  return {
    documents: result.documents,
    total: result.total,
    source: result.source,
    ...query,
  };
}
