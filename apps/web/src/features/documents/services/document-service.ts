import { getApiClient } from '@/src/lib/api-client';
import type { ApiClientInstance } from '@/src/lib/api-client';

export type DocumentSummary = {
  id: string;
  name: string;
  category: string;
  state: 'active' | 'archived';
  updatedAt: string;
  owner?: string | null;
};

export interface DocumentResult {
  documents: DocumentSummary[];
  total: number;
  source: 'api' | 'stub';
}

const buildStubDocuments = (orgSlug: string): DocumentResult => {
  const now = new Date();
  const docs: DocumentSummary[] = [
    {
      id: `${orgSlug}-doc-1`,
      name: 'FY25 Revenue testing pack.pdf',
      category: 'Audit evidence',
      state: 'active',
      updatedAt: now.toISOString(),
      owner: 'alex.rivera@demo.local',
    },
    {
      id: `${orgSlug}-doc-2`,
      name: 'Group consolidation walkthrough.md',
      category: 'Accounting memo',
      state: 'active',
      updatedAt: new Date(now.getTime() - 3 * 86_400_000).toISOString(),
      owner: 'priya.patel@demo.local',
    },
    {
      id: `${orgSlug}-doc-3`,
      name: 'Tax provisioning checklist.xlsx',
      category: 'Tax',
      state: 'archived',
      updatedAt: new Date(now.getTime() - 7 * 86_400_000).toISOString(),
      owner: 'samira.ahmed@demo.local',
    },
  ];
  return { documents: docs, total: docs.length, source: 'stub' };
};

const ensureId = (candidate: Record<string, unknown>) => {
  if (typeof candidate.id === 'string') return candidate.id;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `doc-${Math.random().toString(36).slice(2, 10)}`;
};

const normaliseDocument = (candidate: Record<string, unknown>): DocumentSummary => ({
  id: ensureId(candidate),
  name: typeof candidate.name === 'string' && candidate.name.length > 0 ? candidate.name : 'Untitled document',
  category: typeof candidate.category === 'string' && candidate.category.length > 0 ? candidate.category : 'Uncategorised',
  state: candidate.state === 'archived' ? 'archived' : 'active',
  updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
  owner: typeof candidate.owner === 'string' ? candidate.owner : null,
});

const extractDocuments = (payload: unknown): DocumentResult | null => {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const rawDocuments = Array.isArray(record.documents)
    ? (record.documents as unknown[])
    : Array.isArray(record.items)
    ? (record.items as unknown[])
    : Array.isArray(record.data)
    ? (record.data as unknown[])
    : null;
  if (!rawDocuments) return null;
  const documents = rawDocuments
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(normaliseDocument);
  const total = typeof record.total === 'number' ? record.total : documents.length;
  return { documents, total, source: 'api' };
};

export const fetchDocuments = async (
  orgSlug: string,
  repo?: string | null,
  token?: string | null,
  clientFactory: (token?: string) => ApiClientInstance = getApiClient,
): Promise<DocumentResult> => {
  if (!orgSlug) {
    return buildStubDocuments('demo');
  }

  const client = clientFactory(token ?? undefined);
  try {
    const response = await client.listDocuments({ orgSlug, repo: repo ?? undefined });
    const normalised = extractDocuments(response);
    if (normalised) {
      return normalised;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Falling back to stubbed documents', error);
    }
  }

  return buildStubDocuments(orgSlug);
};
