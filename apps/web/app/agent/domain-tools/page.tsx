'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { DomainAgent } from '@prisma-glow/api-client';
import { useDomainAgentsQuery } from '@/src/features/agents/hooks';

const EMPTY_AGENTS: DomainAgent[] = [];

type Citation =
  | { type: 'url'; url: string; title?: string; location?: string }
  | { type: 'file'; fileId: string; filename?: string; location?: string };

type WebSearchSource = {
  url?: string;
  title?: string;
  snippet?: string;
  domain?: string;
};

type WebSearchResult = {
  answer: string;
  citations: Citation[];
  sources?: WebSearchSource[];
};

type FileSearchHit = {
  fileId: string;
  filename: string;
  score?: number;
  content?: string[];
};

type FileSearchResult = {
  answer: string;
  citations: Citation[];
  results: FileSearchHit[];
};

type RetrievalHit = {
  fileId: string;
  filename: string;
  score: number;
  content: string[];
  attributes?: Record<string, string | number | boolean | null> | null;
};

type RetrievalResult = {
  results: RetrievalHit[];
};

type ImageGenerationResult = {
  imageBase64: string;
  revisedPrompt?: string | null;
};

type Gpt5Result = {
  answer: string;
  citations: Citation[];
};

type Primitive = string | number | boolean | null;

type AttributeExample = {
  value: Primitive;
  label: string;
  type: string;
};

type VectorStoreAttribute = {
  key: string;
  types: string[];
  examples: AttributeExample[];
};

type VectorStoreDescriptor = {
  id: string;
  name: string | null;
  description: string | null;
  status: string | null;
  fileCount: number | null;
  createdAt: string | null;
  attributes: VectorStoreAttribute[];
  attributeSampledCount: number;
  attributeHasMore: boolean;
  attributeNextCursor: string | null;
  metadata: Record<string, unknown> | null;
};

type VectorStoreCatalog = {
  attributeSampleSize?: number;
  attributePageLimit?: number;
  vectorStores: VectorStoreDescriptor[];
};

type VectorStoreAttributePage = {
  attributes: VectorStoreAttribute[];
  sampledCount: number;
  hasMore: boolean;
  nextCursor: string | null;
};

type FilterCondition = {
  key: string;
  value: Primitive;
  label: string;
  type: string;
};

const SUPPORTED_AGENT_KEYS = new Set(['brokerageEnablement', 'callerMarketing', 'mobilityOps']);

interface AsyncState<T> {
  loading: boolean;
  error: string | null;
  result: T | null;
}

const DEFAULT_ASYNC_STATE = { loading: false, error: null, result: null } as const;

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
  if (!response.ok) {
    const message = typeof body.error === 'string' && body.error.trim().length > 0
      ? body.error
      : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
  if (!response.ok) {
    const message = typeof body.error === 'string' && body.error.trim().length > 0
      ? body.error
      : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

function formatVectorStoreLabel(store: VectorStoreDescriptor): string {
  const label = store.name?.trim() || store.description?.trim();
  if (label) {
    return `${label} (${store.id})`;
  }
  return store.id;
}

function buildAttributeFilterPayload(conditions: FilterCondition[]): Record<string, unknown> | undefined {
  if (!conditions.length) return undefined;
  if (conditions.length === 1) {
    const [condition] = conditions;
    return { type: 'eq', key: condition.key, value: condition.value };
  }
  return {
    type: 'and',
    filters: conditions.map((condition) => ({ type: 'eq', key: condition.key, value: condition.value })),
  };
}

function mergeAttributeSummaries(
  existing: VectorStoreAttribute[],
  incoming: VectorStoreAttribute[],
): VectorStoreAttribute[] {
  const map = new Map<string, { key: string; types: Set<string>; examples: AttributeExample[] }>();

  for (const attribute of existing) {
    map.set(attribute.key, {
      key: attribute.key,
      types: new Set(attribute.types),
      examples: [...attribute.examples],
    });
  }

  for (const attribute of incoming) {
    const record = map.get(attribute.key) ?? {
      key: attribute.key,
      types: new Set<string>(),
      examples: [] as AttributeExample[],
    };

    for (const type of attribute.types) {
      record.types.add(type);
    }

    for (const example of attribute.examples) {
      if (record.examples.length >= 5) {
        break;
      }
      const duplicate = record.examples.some(
        (existingExample) => JSON.stringify(existingExample.value) === JSON.stringify(example.value),
      );
      if (!duplicate && record.examples.length < 5) {
        record.examples.push(example);
      }
    }

    map.set(attribute.key, record);
  }

  return Array.from(map.values())
    .map((entry) => ({
      key: entry.key,
      types: Array.from(entry.types).sort(),
      examples: entry.examples.slice(0, 5),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function CitationsList({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <ul className="mt-2 space-y-1 text-xs">
      {citations.map((citation, index) => {
        if (citation.type === 'url') {
          return (
            <li key={`url-${citation.url ?? index}`} className="truncate">
              <span className="font-semibold">Source {index + 1}:</span>{' '}
              {citation.url ? (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  {citation.title ?? citation.url}
                </a>
              ) : (
                citation.title ?? 'Web reference'
              )}
              {citation.location ? <span className="text-muted-foreground"> ({citation.location})</span> : null}
            </li>
          );
        }
        return (
          <li key={`file-${citation.fileId ?? index}`}>
            <span className="font-semibold">File {index + 1}:</span> {citation.filename ?? citation.fileId}
            {citation.location ? <span className="text-muted-foreground"> ({citation.location})</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function SourcesList({ sources }: { sources?: WebSearchSource[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
      {sources.map((source, index) => {
        const key = source.url ?? `source-${index}`;
        const label = source.title ?? source.url ?? `Result ${index + 1}`;
        return (
          <li key={key} className="space-y-1">
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                {label}
              </a>
            ) : (
              <span className="font-medium text-foreground">{label}</span>
            )}
            {source.domain ? <span> ({source.domain})</span> : null}
            {source.snippet ? <p className="whitespace-pre-wrap leading-snug">{source.snippet}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

export default function DomainToolsPage() {
  const [orgSlug, setOrgSlug] = useState('demo');
  const agentsQuery = useDomainAgentsQuery();
  const agentsResponse = agentsQuery.data;
  const agents: DomainAgent[] = agentsResponse?.agents ?? EMPTY_AGENTS;
  const agentsLoading = agentsQuery.isLoading;
  const agentsError = agentsQuery.error
    ? agentsQuery.error instanceof Error
      ? agentsQuery.error.message
      : 'Failed to load agents'
    : null;
  const [selectedAgentKey, setSelectedAgentKey] = useState<string>('brokerageEnablement');

  const [webQuery, setWebQuery] = useState('Latest broker-dealer regulation changes impacting EU listings');
  const [webDomains, setWebDomains] = useState('');
  const [webCountry, setWebCountry] = useState('');
  const [webCity, setWebCity] = useState('');
  const [webRegion, setWebRegion] = useState('');
  const [webReasoning, setWebReasoning] = useState<'minimal' | 'low' | 'medium' | 'high'>('low');

  const [fileQuery, setFileQuery] = useState('Summarise the value proposition for our premium tier.');
  const [vectorStoreState, setVectorStoreState] = useState<AsyncState<VectorStoreDescriptor[]>>({
    ...DEFAULT_ASYNC_STATE,
  });
  const [attributeSampleSize, setAttributeSampleSize] = useState(40);
  const [attributeSampleInput, setAttributeSampleInput] = useState('40');
  const [attributeSampleError, setAttributeSampleError] = useState<string | null>(null);
  const [attributePageLimit, setAttributePageLimit] = useState(20);
  const [vectorStoreFetchVersion, setVectorStoreFetchVersion] = useState(0);
  const [attributeSampleState, setAttributeSampleState] = useState<{
    storeId: string | null;
    loading: boolean;
    error: string | null;
  }>({ storeId: null, loading: false, error: null });
  const [selectedFileVectorStores, setSelectedFileVectorStores] = useState<string[]>([]);
  const [fileMaxResults, setFileMaxResults] = useState(4);

  const [selectedRetrievalStore, setSelectedRetrievalStore] = useState('');
  const [retrievalQuery, setRetrievalQuery] = useState('What campaign messaging resonated last quarter?');
  const [retrievalMaxResults, setRetrievalMaxResults] = useState(5);
  const [retrievalRewrite, setRetrievalRewrite] = useState(true);
  const [retrievalFilterConditions, setRetrievalFilterConditions] = useState<FilterCondition[]>([]);
  const [filterBuilderKey, setFilterBuilderKey] = useState('');
  const [filterBuilderExampleIndex, setFilterBuilderExampleIndex] = useState('');
  const [filterBuilderError, setFilterBuilderError] = useState<string | null>(null);
  const [customFilterValue, setCustomFilterValue] = useState('');
  const [customFilterType, setCustomFilterType] = useState<'string' | 'number' | 'boolean' | 'null'>('string');

  const [imagePrompt, setImagePrompt] = useState('Design a hero banner showcasing a modern electric fleet in motion with optimistic tones.');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageQuality, setImageQuality] = useState('high');
  const [imageBackground, setImageBackground] = useState<'auto' | 'transparent' | 'opaque'>('auto');

  const [gptPrompt, setGptPrompt] = useState('Draft a concise executive summary for the upcoming mobility operations review.');
  const [gptReasoning, setGptReasoning] = useState<'minimal' | 'low' | 'medium' | 'high'>('medium');
  const [gptVerbosity, setGptVerbosity] = useState<'low' | 'medium' | 'high'>('medium');
  const [gptMaxTokens, setGptMaxTokens] = useState<number | undefined>(800);

  const [webState, setWebState] = useState<AsyncState<WebSearchResult>>({ ...DEFAULT_ASYNC_STATE });
  const [fileState, setFileState] = useState<AsyncState<FileSearchResult>>({ ...DEFAULT_ASYNC_STATE });
  const [retrievalState, setRetrievalState] = useState<AsyncState<RetrievalResult>>({ ...DEFAULT_ASYNC_STATE });
  const [imageState, setImageState] = useState<AsyncState<ImageGenerationResult>>({ ...DEFAULT_ASYNC_STATE });
  const [gptState, setGptState] = useState<AsyncState<Gpt5Result>>({ ...DEFAULT_ASYNC_STATE });

  const domainAgents = useMemo(
    () => agents.filter((agent) => SUPPORTED_AGENT_KEYS.has(agent.key)),
    [agents],
  );

  const trimmedOrgSlug = useMemo(() => orgSlug.trim(), [orgSlug]);

  useEffect(() => {
    if (domainAgents.length && !SUPPORTED_AGENT_KEYS.has(selectedAgentKey)) {
      setSelectedAgentKey(domainAgents[0]?.key ?? 'brokerageEnablement');
    }
  }, [domainAgents, selectedAgentKey]);

  const selectedAgent = domainAgents.find((agent) => agent.key === selectedAgentKey) ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!trimmedOrgSlug || !SUPPORTED_AGENT_KEYS.has(selectedAgentKey)) {
      setVectorStoreState({ loading: false, error: null, result: [] });
      setSelectedFileVectorStores([]);
      setSelectedRetrievalStore('');
      setAttributeSampleState({ storeId: null, loading: false, error: null });
      return () => {
        cancelled = true;
      };
    }

    setVectorStoreState({ loading: true, error: null, result: null });
    const params = new URLSearchParams({ orgSlug: trimmedOrgSlug, agentKey: selectedAgentKey });
    params.set('attributeSampleSize', String(attributeSampleSize));

    void fetchJson<VectorStoreCatalog>(`/api/agent/domain-tools/vector-stores?${params.toString()}`)
      .then((catalog) => {
        if (cancelled) return;
        const vectorStores = catalog.vectorStores ?? [];
        setVectorStoreState({ loading: false, error: null, result: vectorStores });

        if (typeof catalog.attributeSampleSize === 'number' && Number.isFinite(catalog.attributeSampleSize)) {
          const sanitized = Math.max(1, Math.min(Math.floor(catalog.attributeSampleSize), 200));
          setAttributeSampleSize((current) => (current === sanitized ? current : sanitized));
          setAttributeSampleInput(String(sanitized));
          setAttributeSampleError(null);
        }
        if (typeof catalog.attributePageLimit === 'number' && Number.isFinite(catalog.attributePageLimit)) {
          const pageLimit = Math.max(1, Math.min(Math.floor(catalog.attributePageLimit), 50));
          setAttributePageLimit(pageLimit);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load vector stores';
        setVectorStoreState({ loading: false, error: message, result: null });
      });

    return () => {
      cancelled = true;
    };
  }, [trimmedOrgSlug, selectedAgentKey, attributeSampleSize, vectorStoreFetchVersion]);

  useEffect(() => {
    const stores = vectorStoreState.result ?? [];
    if (!stores.length) {
      setSelectedFileVectorStores([]);
      setSelectedRetrievalStore('');
      setAttributeSampleState({ storeId: null, loading: false, error: null });
      return;
    }

    setSelectedFileVectorStores((current) => {
      const valid = current.filter((id) => stores.some((store) => store.id === id));
      if (valid.length) {
        return valid;
      }
      return [stores[0].id];
    });

    setSelectedRetrievalStore((current) => {
      if (current && stores.some((store) => store.id === current)) {
        return current;
      }
      return stores[0].id;
    });
    setAttributeSampleState({ storeId: null, loading: false, error: null });
  }, [vectorStoreState.result]);

  useEffect(() => {
    setRetrievalFilterConditions([]);
    setFilterBuilderKey('');
    setFilterBuilderExampleIndex('');
    setFilterBuilderError(null);
    setCustomFilterValue('');
    setCustomFilterType('string');
  }, [selectedRetrievalStore]);

  const vectorStores = useMemo(
    () => vectorStoreState.result ?? [],
    [vectorStoreState.result],
  );
  const selectedVectorStore = useMemo(
    () => vectorStores.find((store) => store.id === selectedRetrievalStore) ?? null,
    [vectorStores, selectedRetrievalStore],
  );

  const vectorStoreSelectSize = useMemo(
    () => (vectorStores.length > 0 ? Math.min(6, Math.max(3, vectorStores.length)) : 3),
    [vectorStores.length],
  );

  const availableAttributes = useMemo(
    () => [...(selectedVectorStore?.attributes ?? [])].sort((a, b) => a.key.localeCompare(b.key)),
    [selectedVectorStore],
  );

  const selectedAttribute = useMemo(
    () => availableAttributes.find((attribute) => attribute.key === filterBuilderKey) ?? null,
    [availableAttributes, filterBuilderKey],
  );

  const selectedExample = useMemo(() => {
    if (!selectedAttribute) return null;
    const index = Number.parseInt(filterBuilderExampleIndex, 10);
    if (!Number.isFinite(index) || index < 0) return null;
    return selectedAttribute.examples[index] ?? null;
  }, [selectedAttribute, filterBuilderExampleIndex]);

  const handleApplyAttributeSampleSize = useCallback(() => {
    if (!trimmedOrgSlug || !SUPPORTED_AGENT_KEYS.has(selectedAgentKey)) {
      setAttributeSampleError('Enter an org slug and select a domain persona before refreshing the catalog.');
      return;
    }
    const parsed = Number.parseInt(attributeSampleInput.trim(), 10);
    if (!Number.isFinite(parsed)) {
      setAttributeSampleError('Enter a positive integer up to 200.');
      return;
    }
    const sanitized = Math.max(1, Math.min(Math.floor(parsed), 200));
    setAttributeSampleError(null);
    setAttributeSampleInput(String(sanitized));
    setAttributeSampleSize((current) => (current === sanitized ? current : sanitized));
    setVectorStoreFetchVersion((value) => value + 1);
  }, [attributeSampleInput, trimmedOrgSlug, selectedAgentKey]);

  const handleLoadMoreAttributes = useCallback(() => {
    if (!selectedVectorStore || !selectedVectorStore.attributeHasMore) {
      return;
    }
    if (!trimmedOrgSlug || !SUPPORTED_AGENT_KEYS.has(selectedAgentKey)) {
      setAttributeSampleState({
        storeId: selectedVectorStore.id,
        loading: false,
        error: 'Provide an org slug and domain persona before loading more attributes.',
      });
      return;
    }
    if (!selectedVectorStore.attributeNextCursor) {
      setAttributeSampleState({
        storeId: selectedVectorStore.id,
        loading: false,
        error: 'No pagination cursor available. Reload the catalog to continue sampling.',
      });
      return;
    }

    const params = new URLSearchParams({ orgSlug: trimmedOrgSlug, agentKey: selectedAgentKey });
    if (selectedVectorStore.attributeNextCursor) {
      params.set('cursor', selectedVectorStore.attributeNextCursor);
    }
    params.set('limit', String(attributePageLimit));

    setAttributeSampleState({ storeId: selectedVectorStore.id, loading: true, error: null });

    void fetchJson<VectorStoreAttributePage>(
      `/api/agent/domain-tools/vector-stores/${selectedVectorStore.id}/attributes?${params.toString()}`,
    )
      .then((page) => {
        setVectorStoreState((current) => {
          const result = current.result ?? [];
          return {
            ...current,
            result: result.map((store) => {
              if (store.id !== selectedVectorStore.id) return store;
              return {
                ...store,
                attributes: mergeAttributeSummaries(store.attributes, page.attributes ?? []),
                attributeSampledCount: store.attributeSampledCount + (page.sampledCount ?? 0),
                attributeHasMore: page.hasMore,
                attributeNextCursor: page.nextCursor ?? null,
              };
            }),
          };
        });
        setAttributeSampleState({ storeId: null, loading: false, error: null });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to load attribute samples';
        setAttributeSampleState({ storeId: selectedVectorStore.id, loading: false, error: message });
      });
  }, [selectedVectorStore, trimmedOrgSlug, selectedAgentKey, attributePageLimit]);

  const isAttributeLoading =
    attributeSampleState.loading && attributeSampleState.storeId === selectedVectorStore?.id;
  const attributeLoadError =
    attributeSampleState.storeId === selectedVectorStore?.id ? attributeSampleState.error : null;

  const handleAddExampleFilter = useCallback(() => {
    if (!selectedAttribute) {
      setFilterBuilderError('Select an attribute key.');
      return;
    }
    if (!selectedExample) {
      setFilterBuilderError('Select a sample value.');
      return;
    }
    setRetrievalFilterConditions((prev) => [
      ...prev,
      {
        key: selectedAttribute.key,
        value: selectedExample.value,
        label: selectedExample.label,
        type: selectedExample.type,
      },
    ]);
    setFilterBuilderExampleIndex('');
    setFilterBuilderError(null);
  }, [selectedAttribute, selectedExample]);

  const handleAddCustomFilter = useCallback(() => {
    if (!filterBuilderKey.trim()) {
      setFilterBuilderError('Select an attribute key.');
      return;
    }

    let parsedValue: Primitive;
    let label: string;

    if (customFilterType === 'number') {
      const parsedNumber = Number(customFilterValue);
      if (!Number.isFinite(parsedNumber)) {
        setFilterBuilderError('Enter a valid number.');
        return;
      }
      parsedValue = parsedNumber;
      label = String(parsedNumber);
    } else if (customFilterType === 'boolean') {
      const normalised = customFilterValue.trim().toLowerCase();
      if (normalised !== 'true' && normalised !== 'false') {
        setFilterBuilderError('Enter true or false.');
        return;
      }
      parsedValue = normalised === 'true';
      label = normalised;
    } else if (customFilterType === 'null') {
      parsedValue = null;
      label = 'null';
    } else {
      parsedValue = customFilterValue;
      label = customFilterValue.length ? customFilterValue : '""';
    }

    setRetrievalFilterConditions((prev) => [
      ...prev,
      { key: filterBuilderKey, value: parsedValue, label, type: customFilterType },
    ]);
    setCustomFilterValue('');
    setFilterBuilderError(null);
  }, [filterBuilderKey, customFilterValue, customFilterType]);

  const handleRemoveFilter = useCallback((index: number) => {
    setRetrievalFilterConditions((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleWebSearch = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!webQuery.trim()) {
        setWebState({ loading: false, error: 'Enter a search query.', result: null });
        return;
      }
      setWebState({ loading: true, error: null, result: null });
      try {
        const allowedDomains = webDomains
          .split('\n')
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
        const location = {
          country: webCountry.trim() || undefined,
          city: webCity.trim() || undefined,
          region: webRegion.trim() || undefined,
        };
        const payload = {
          orgSlug: orgSlug.trim(),
          agentKey: selectedAgentKey,
          query: webQuery.trim(),
          reasoningEffort: webReasoning,
          allowedDomains: allowedDomains.length ? allowedDomains : undefined,
          location: Object.values(location).some(Boolean) ? location : undefined,
        };
        const result = await postJson<WebSearchResult>('/api/agent/domain-tools/web-search', payload);
        setWebState({ loading: false, error: null, result });
      } catch (error) {
        setWebState({ loading: false, error: error instanceof Error ? error.message : 'Web search failed', result: null });
      }
    },
    [webQuery, webReasoning, webDomains, webCountry, webCity, webRegion, orgSlug, selectedAgentKey],
  );

  const handleFileSearch = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedFileVectorStores.length) {
        setFileState({ loading: false, error: 'Select at least one vector store.', result: null });
        return;
      }
      if (!fileQuery.trim()) {
        setFileState({ loading: false, error: 'Enter a query.', result: null });
        return;
      }
      setFileState({ loading: true, error: null, result: null });
      try {
        const payload = {
          orgSlug: orgSlug.trim(),
          agentKey: selectedAgentKey,
          query: fileQuery.trim(),
          vectorStoreIds: selectedFileVectorStores,
          maxResults: Number.isFinite(fileMaxResults) ? fileMaxResults : undefined,
        };
        const result = await postJson<FileSearchResult>('/api/agent/domain-tools/file-search', payload);
        setFileState({ loading: false, error: null, result });
      } catch (error) {
        setFileState({ loading: false, error: error instanceof Error ? error.message : 'File search failed', result: null });
      }
    },
    [selectedFileVectorStores, fileQuery, fileMaxResults, orgSlug, selectedAgentKey],
  );

  const handleRetrieval = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedRetrievalStore.trim()) {
        setRetrievalState({ loading: false, error: 'Select a vector store.', result: null });
        return;
      }
      if (!retrievalQuery.trim()) {
        setRetrievalState({ loading: false, error: 'Enter a search query.', result: null });
        return;
      }
      setRetrievalState({ loading: true, error: null, result: null });
      try {
        const attributeFilter = buildAttributeFilterPayload(retrievalFilterConditions);
        const payload = {
          orgSlug: orgSlug.trim(),
          agentKey: selectedAgentKey,
          vectorStoreId: selectedRetrievalStore,
          query: retrievalQuery.trim(),
          maxResults: Number.isFinite(retrievalMaxResults) ? retrievalMaxResults : undefined,
          rewriteQuery: retrievalRewrite,
          attributeFilter,
        };
        const result = await postJson<RetrievalResult>('/api/agent/domain-tools/retrieval', payload);
        setRetrievalState({ loading: false, error: null, result });
      } catch (error) {
        setRetrievalState({ loading: false, error: error instanceof Error ? error.message : 'Retrieval failed', result: null });
      }
    },
    [selectedRetrievalStore, retrievalQuery, retrievalMaxResults, retrievalRewrite, retrievalFilterConditions, orgSlug, selectedAgentKey],
  );

  const handleImageGeneration = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!imagePrompt.trim()) {
        setImageState({ loading: false, error: 'Enter an image prompt.', result: null });
        return;
      }
      setImageState({ loading: true, error: null, result: null });
      try {
        const payload = {
          orgSlug: orgSlug.trim(),
          agentKey: selectedAgentKey,
          prompt: imagePrompt.trim(),
          size: imageSize.trim() || undefined,
          quality: imageQuality.trim() || undefined,
          background: imageBackground,
        };
        const result = await postJson<ImageGenerationResult>('/api/agent/domain-tools/image-generation', payload);
        setImageState({ loading: false, error: null, result });
      } catch (error) {
        setImageState({ loading: false, error: error instanceof Error ? error.message : 'Image generation failed', result: null });
      }
    },
    [imagePrompt, imageSize, imageQuality, imageBackground, orgSlug, selectedAgentKey],
  );

  const handleGptCall = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!gptPrompt.trim()) {
        setGptState({ loading: false, error: 'Enter a prompt.', result: null });
        return;
      }
      setGptState({ loading: true, error: null, result: null });
      try {
        const payload = {
          orgSlug: orgSlug.trim(),
          agentKey: selectedAgentKey,
          prompt: gptPrompt.trim(),
          reasoningEffort: gptReasoning,
          verbosity: gptVerbosity,
          maxOutputTokens: gptMaxTokens ?? undefined,
        };
        const result = await postJson<Gpt5Result>('/api/agent/domain-tools/gpt5', payload);
        setGptState({ loading: false, error: null, result });
      } catch (error) {
        setGptState({ loading: false, error: error instanceof Error ? error.message : 'GPT-5 request failed', result: null });
      }
    },
    [gptPrompt, gptReasoning, gptVerbosity, gptMaxTokens, orgSlug, selectedAgentKey],
  );

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Domain Agent Tool Harness</h1>
        <p className="text-sm text-muted-foreground">
          Explore the broker, caller marketing, and mobility agent personas with live integrations for web search, file search,
          retrieval, image generation, and GPT-5 reasoning.
        </p>
      </header>

      <section className="rounded-lg border p-4" aria-labelledby="setup-heading">
        <h2 id="setup-heading" className="text-lg font-semibold">Session Context</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm">
            <span className="font-medium">Org Slug</span>
            <input
              className="mt-1 rounded border px-2 py-1"
              value={orgSlug}
              onChange={(event) => setOrgSlug(event.target.value)}
              placeholder="demo"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="font-medium">Agent Persona</span>
            <select
              className="mt-1 rounded border px-2 py-1"
              value={selectedAgentKey}
              onChange={(event) => setSelectedAgentKey(event.target.value)}
            >
              {domainAgents.map((agent) => (
                <option key={agent.key} value={agent.key}>
                  {agent.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        {agentsLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading agent metadata…</p> : null}
        {agentsError ? (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {agentsError}
          </p>
        ) : null}
        {selectedAgent ? (
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border px-2 py-0.5 text-xs uppercase">{selectedAgent.status}</span>
              <span className="text-muted-foreground">Owner: {selectedAgent.owner}</span>
            </div>
            <p>{selectedAgent.description}</p>
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold">Capabilities:</span> {selectedAgent.capabilities.join(', ')}
            </div>
            {selectedAgent.tooling?.length ? (
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold">Tooling:</span>{' '}
                {selectedAgent.tooling.map((tool) => tool.name).join(', ')}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border p-4" aria-labelledby="web-search-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="web-search-heading" className="text-lg font-semibold">Web Search with Citations</h2>
            <p className="text-sm text-muted-foreground">
              Runs the OpenAI Responses API with the <code>web_search</code> tool, returning inline citations and the consulted
              sources.
            </p>
          </div>
        </div>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleWebSearch}>
          <label className="flex flex-col text-sm md:col-span-2">
            <span className="font-medium">Search query</span>
            <textarea
              className="mt-1 min-h-[80px] rounded border px-2 py-1"
              value={webQuery}
              onChange={(event) => setWebQuery(event.target.value)}
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="font-medium">Allowed domains (optional)</span>
            <textarea
              className="mt-1 min-h-[60px] rounded border px-2 py-1"
              value={webDomains}
              onChange={(event) => setWebDomains(event.target.value)}
              placeholder="example.com\nsec.gov"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col">
              <span className="font-medium">Country (ISO)</span>
              <input className="mt-1 rounded border px-2 py-1" value={webCountry} onChange={(e) => setWebCountry(e.target.value)} />
            </label>
            <label className="flex flex-col">
              <span className="font-medium">Region</span>
              <input className="mt-1 rounded border px-2 py-1" value={webRegion} onChange={(e) => setWebRegion(e.target.value)} />
            </label>
            <label className="flex flex-col">
              <span className="font-medium">City</span>
              <input className="mt-1 rounded border px-2 py-1" value={webCity} onChange={(e) => setWebCity(e.target.value)} />
            </label>
            <label className="flex flex-col">
              <span className="font-medium">Reasoning effort</span>
              <select className="mt-1 rounded border px-2 py-1" value={webReasoning} onChange={(e) => setWebReasoning(e.target.value as typeof webReasoning)}>
                <option value="minimal">minimal</option>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded border border-slate-400 px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              disabled={webState.loading}
            >
              {webState.loading ? 'Running search…' : 'Run search'}
            </button>
          </div>
        </form>
        {webState.error ? (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {webState.error}
          </p>
        ) : null}
        {webState.result ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">Answer</h3>
            <p className="whitespace-pre-wrap text-sm">{webState.result.answer}</p>
            <CitationsList citations={webState.result.citations} />
            <SourcesList sources={webState.result.sources} />
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border p-4" aria-labelledby="file-search-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="file-search-heading" className="text-lg font-semibold">File Search (vector stores)</h2>
            <p className="text-sm text-muted-foreground">
              Invokes the <code>file_search</code> tool so the agent can cite indexed marketing, brokerage, or mobility collateral.
            </p>
          </div>
        </div>
        {vectorStoreState.loading ? (
          <p className="mt-3 text-xs text-muted-foreground">Loading available vector stores…</p>
        ) : null}
        {vectorStoreState.error ? (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">
            {vectorStoreState.error}
          </p>
        ) : null}
        <div className="mt-3 grid gap-3 md:grid-cols-4 md:items-end">
          <label className="flex flex-col text-sm md:col-span-1">
            <span className="font-medium">Attribute sample size</span>
            <input
              className="mt-1 rounded border px-2 py-1"
              value={attributeSampleInput}
              onChange={(event) => {
                setAttributeSampleInput(event.target.value);
                setAttributeSampleError(null);
              }}
              inputMode="numeric"
              pattern="\\d*"
            />
          </label>
          <div className="flex items-end md:col-span-1">
            <button
              type="button"
              className="rounded border border-slate-400 px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleApplyAttributeSampleSize}
              disabled={vectorStoreState.loading}
            >
              {vectorStoreState.loading ? 'Refreshing…' : 'Reload catalog'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground md:col-span-2">
            Sampling up to <span className="font-semibold">{attributeSampleSize}</span> files per store. Additional batches fetch
            <span className="font-semibold"> {attributePageLimit}</span> files when you load more attributes.
          </p>
        </div>
        {attributeSampleError ? (
          <p role="alert" className="mt-2 text-xs text-red-600">{attributeSampleError}</p>
        ) : null}
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleFileSearch}>
          <label className="flex flex-col text-sm md:col-span-2">
            <span className="font-medium">Query</span>
            <textarea className="mt-1 min-h-[60px] rounded border px-2 py-1" value={fileQuery} onChange={(e) => setFileQuery(e.target.value)} />
          </label>
          <label className="flex flex-col text-sm md:col-span-2">
            <span className="font-medium">Vector stores</span>
            <select
              multiple
              size={vectorStoreSelectSize}
              className="mt-1 rounded border px-2 py-1"
              value={selectedFileVectorStores}
              onChange={(event) => {
                const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                setSelectedFileVectorStores(values);
              }}
              disabled={vectorStoreState.loading || vectorStores.length === 0}
            >
              {vectorStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {formatVectorStoreLabel(store)}
                </option>
              ))}
            </select>
            {vectorStores.length === 0 && !vectorStoreState.loading ? (
              <span className="mt-1 text-xs text-muted-foreground">No vector stores available for this persona.</span>
            ) : (
              <span className="mt-1 text-xs text-muted-foreground">Hold Ctrl/Cmd to select multiple vector stores.</span>
            )}
          </label>
          <label className="flex flex-col text-sm">
            <span className="font-medium">Max results</span>
            <input
              type="number"
              className="mt-1 rounded border px-2 py-1"
              value={fileMaxResults}
              min={1}
              max={20}
              onChange={(e) => setFileMaxResults(Number.parseInt(e.target.value, 10) || 0)}
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded border border-slate-400 px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              disabled={fileState.loading}
            >
              {fileState.loading ? 'Searching files…' : 'Search files'}
            </button>
          </div>
        </form>
        {fileState.error ? (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {fileState.error}
          </p>
        ) : null}
        {fileState.result ? (
          <div className="mt-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Answer</h3>
              <p className="whitespace-pre-wrap text-sm">{fileState.result.answer}</p>
              <CitationsList citations={fileState.result.citations} />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Retrieved chunks</h3>
              {fileState.result.results.length ? (
                <ul className="space-y-2 text-xs">
                  {fileState.result.results.map((hit) => (
                    <li key={hit.fileId} className="rounded border border-dashed p-2">
                      <div className="font-semibold">{hit.filename}</div>
                      {typeof hit.score === 'number' ? (
                        <div className="text-muted-foreground">Score: {hit.score.toFixed(3)}</div>
                      ) : null}
                      {hit.content?.length ? (
                        <div className="mt-1 space-y-1">
                          {hit.content.map((text, index) => (
                            <p key={index} className="whitespace-pre-wrap">{text}</p>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No matching chunks returned.</p>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border p-4" aria-labelledby="retrieval-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="retrieval-heading" className="text-lg font-semibold">Semantic Retrieval API</h2>
            <p className="text-sm text-muted-foreground">
              Directly queries vector stores for semantic matches, allowing optional metadata filters and query rewriting.
            </p>
          </div>
        </div>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleRetrieval}>
          <label className="flex flex-col text-sm md:col-span-2">
            <span className="font-medium">Vector store</span>
            <select
              className="mt-1 rounded border px-2 py-1"
              value={selectedRetrievalStore}
              onChange={(event) => {
                setSelectedRetrievalStore(event.target.value);
                setFilterBuilderError(null);
              }}
              disabled={vectorStoreState.loading || vectorStores.length === 0}
            >
              {vectorStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {formatVectorStoreLabel(store)}
                </option>
              ))}
            </select>
            {vectorStores.length === 0 && !vectorStoreState.loading ? (
              <span className="mt-1 text-xs text-muted-foreground">No vector stores available for this persona.</span>
            ) : null}
          </label>
          <label className="flex flex-col text-sm md:col-span-2">
            <span className="font-medium">Query</span>
            <textarea className="mt-1 min-h-[60px] rounded border px-2 py-1" value={retrievalQuery} onChange={(e) => setRetrievalQuery(e.target.value)} />
          </label>
          <label className="flex flex-col text-sm">
            <span className="font-medium">Max results</span>
            <input
              type="number"
              className="mt-1 rounded border px-2 py-1"
              value={retrievalMaxResults}
              min={1}
              max={50}
              onChange={(e) => setRetrievalMaxResults(Number.parseInt(e.target.value, 10) || 0)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={retrievalRewrite}
              onChange={(e) => setRetrievalRewrite(e.target.checked)}
            />
            Allow query rewriting
          </label>
          <div className="md:col-span-2 space-y-3 rounded border border-dashed p-3">
            <div className="flex flex-col gap-3 md:flex-row">
              <label className="flex-1 text-sm">
                <span className="font-medium">Attribute key</span>
                <select
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={filterBuilderKey}
                  onChange={(event) => {
                    setFilterBuilderKey(event.target.value);
                    setFilterBuilderExampleIndex('');
                    setFilterBuilderError(null);
                  }}
                  disabled={!availableAttributes.length}
                >
                  <option value="">Select attribute</option>
                  {availableAttributes.map((attribute) => (
                    <option key={attribute.key} value={attribute.key}>
                      {attribute.key}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1 text-sm">
                <span className="font-medium">Sample values</span>
                <select
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={filterBuilderExampleIndex}
                  onChange={(event) => {
                    setFilterBuilderExampleIndex(event.target.value);
                    setFilterBuilderError(null);
                  }}
                  disabled={!selectedAttribute || !selectedAttribute.examples.length}
                >
                  <option value="">Select sample</option>
                  {selectedAttribute?.examples.map((example, index) => (
                    <option key={`${selectedAttribute.key}-${index}`} value={String(index)}>
                      {example.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  className="rounded border border-slate-400 px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleAddExampleFilter}
                  disabled={!selectedAttribute || vectorStores.length === 0}
                >
                  Add sample filter
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="flex flex-col text-sm md:col-span-2">
                <span className="font-medium">Custom value</span>
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={customFilterValue}
                  onChange={(event) => {
                    setCustomFilterValue(event.target.value);
                    setFilterBuilderError(null);
                  }}
                  disabled={customFilterType === 'null'}
                  placeholder={customFilterType === 'boolean' ? 'true or false' : undefined}
                />
              </label>
              <label className="flex flex-col text-sm">
                <span className="font-medium">Type</span>
                <select
                  className="mt-1 rounded border px-2 py-1"
                  value={customFilterType}
                  onChange={(event) => {
                    setCustomFilterType(event.target.value as typeof customFilterType);
                    if (event.target.value === 'null') {
                      setCustomFilterValue('');
                    }
                    setFilterBuilderError(null);
                  }}
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="null">null</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  className="rounded border border-slate-400 px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleAddCustomFilter}
                  disabled={!filterBuilderKey}
                >
                  Add custom filter
                </button>
              </div>
            </div>
            {filterBuilderError ? (
              <p role="alert" className="text-xs text-red-600">{filterBuilderError}</p>
            ) : null}
            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap gap-2">
                {retrievalFilterConditions.length ? (
                  retrievalFilterConditions.map((condition, index) => (
                    <span
                      key={`${condition.key}-${index}`}
                      className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700"
                    >
                      <span>
                        {condition.key} = <span className="font-semibold">{condition.label}</span>
                      </span>
                      <button
                        type="button"
                        className="text-xs text-slate-500 hover:text-slate-800"
                        onClick={() => handleRemoveFilter(index)}
                        aria-label={`Remove filter ${condition.key}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">No metadata filters applied.</span>
                )}
              </div>
              <div className="space-y-2 text-muted-foreground">
                {selectedVectorStore?.attributes.length ? (
                  <div>
                    <span className="font-medium">Discovered attributes:</span>{' '}
                    {selectedVectorStore.attributes.map((attribute) => attribute.key).join(', ')}
                  </div>
                ) : (
                  <div>No attribute metadata detected for this store.</div>
                )}
                {selectedVectorStore ? (
                  <>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span>
                        <span className="font-medium">Status:</span>{' '}
                        {selectedVectorStore.status ?? 'unknown'}
                      </span>
                      {typeof selectedVectorStore.fileCount === 'number' ? (
                        <span>
                          <span className="font-medium">Files indexed:</span>{' '}
                          {selectedVectorStore.fileCount}
                        </span>
                      ) : null}
                      {selectedVectorStore.createdAt ? (
                        <span>
                          <span className="font-medium">Created:</span>{' '}
                          {selectedVectorStore.createdAt}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span>
                        <span className="font-medium">Sampled files:</span>{' '}
                        {selectedVectorStore.attributeSampledCount}
                      </span>
                      {selectedVectorStore.attributeHasMore ? (
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={handleLoadMoreAttributes}
                          disabled={isAttributeLoading}
                        >
                          {isAttributeLoading
                            ? 'Loading attributes…'
                            : `Load ${attributePageLimit} more samples`}
                        </button>
                      ) : (
                        <span>All available attribute metadata captured.</span>
                      )}
                    </div>
                    {isAttributeLoading ? (
                      <p className="text-[11px] text-muted-foreground">Gathering additional attribute samples…</p>
                    ) : null}
                    {attributeLoadError ? (
                      <p role="alert" className="text-[11px] text-red-600">{attributeLoadError}</p>
                    ) : null}
                    {selectedVectorStore.metadata ? (
                      <details className="mt-2 rounded border border-slate-200 bg-slate-50 p-2">
                        <summary className="cursor-pointer text-slate-600">View metadata</summary>
                        <pre className="mt-2 overflow-x-auto text-[11px]">
                          {JSON.stringify(selectedVectorStore.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded border border-slate-400 px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              disabled={retrievalState.loading || !selectedRetrievalStore}
            >
              {retrievalState.loading ? 'Searching…' : 'Search vector store'}
            </button>
          </div>
        </form>
        {retrievalState.error ? (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {retrievalState.error}
          </p>
        ) : null}
        {retrievalState.result ? (
          <div className="mt-4 space-y-2">
            {retrievalState.result.results.length ? (
              <ul className="space-y-2 text-xs">
                {retrievalState.result.results.map((hit) => (
                  <li key={`${hit.fileId}-${hit.score}`} className="rounded border border-dashed p-2">
                    <div className="font-semibold">{hit.filename}</div>
                    <div className="text-muted-foreground">Score: {hit.score.toFixed(3)}</div>
                    {hit.attributes ? (
                      <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-[11px]">
                        {JSON.stringify(hit.attributes, null, 2)}
                      </pre>
                    ) : null}
                    {hit.content.length ? (
                      <div className="mt-1 space-y-1">
                        {hit.content.map((text, index) => (
                          <p key={index} className="whitespace-pre-wrap">{text}</p>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No semantic hits returned.</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border p-4" aria-labelledby="image-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="image-heading" className="text-lg font-semibold">Image Generation</h2>
            <p className="text-sm text-muted-foreground">
              Forces the <code>image_generation</code> tool so the agent can produce on-brand visuals for campaigns or mobility updates.
            </p>
          </div>
        </div>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleImageGeneration}>
          <label className="flex flex-col text-sm md:col-span-2">
            <span className="font-medium">Prompt</span>
            <textarea className="mt-1 min-h-[60px] rounded border px-2 py-1" value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} />
          </label>
          <label className="flex flex-col text-sm">
            <span className="font-medium">Size</span>
            <input className="mt-1 rounded border px-2 py-1" value={imageSize} onChange={(e) => setImageSize(e.target.value)} />
          </label>
          <label className="flex flex-col text-sm">
            <span className="font-medium">Quality</span>
            <select className="mt-1 rounded border px-2 py-1" value={imageQuality} onChange={(e) => setImageQuality(e.target.value)}>
              <option value="auto">auto</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="font-medium">Background</span>
            <select className="mt-1 rounded border px-2 py-1" value={imageBackground} onChange={(e) => setImageBackground(e.target.value as typeof imageBackground)}>
              <option value="auto">auto</option>
              <option value="transparent">transparent</option>
              <option value="opaque">opaque</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded border border-slate-400 px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              disabled={imageState.loading}
            >
              {imageState.loading ? 'Generating…' : 'Generate image'}
            </button>
          </div>
        </form>
        {imageState.error ? (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {imageState.error}
          </p>
        ) : null}
        {imageState.result ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">Preview</h3>
            <div className="overflow-hidden rounded border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${imageState.result.imageBase64}`}
                alt="Generated visual"
                className="h-auto w-full"
              />
            </div>
            {imageState.result.revisedPrompt ? (
              <p className="text-xs text-muted-foreground">Revised prompt: {imageState.result.revisedPrompt}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border p-4" aria-labelledby="gpt-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="gpt-heading" className="text-lg font-semibold">GPT-5 Reasoning Output</h2>
            <p className="text-sm text-muted-foreground">
              Calls GPT-5 through the Responses API with configurable reasoning effort and verbosity controls.
            </p>
          </div>
        </div>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleGptCall}>
          <label className="flex flex-col text-sm md:col-span-2">
            <span className="font-medium">Prompt</span>
            <textarea className="mt-1 min-h-[80px] rounded border px-2 py-1" value={gptPrompt} onChange={(e) => setGptPrompt(e.target.value)} />
          </label>
          <label className="flex flex-col text-sm">
            <span className="font-medium">Reasoning effort</span>
            <select className="mt-1 rounded border px-2 py-1" value={gptReasoning} onChange={(e) => setGptReasoning(e.target.value as typeof gptReasoning)}>
              <option value="minimal">minimal</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="font-medium">Verbosity</span>
            <select className="mt-1 rounded border px-2 py-1" value={gptVerbosity} onChange={(e) => setGptVerbosity(e.target.value as typeof gptVerbosity)}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="font-medium">Max output tokens</span>
            <input
              type="number"
              className="mt-1 rounded border px-2 py-1"
              value={gptMaxTokens ?? ''}
              placeholder="auto"
              min={100}
              max={4000}
              onChange={(e) => {
                const value = e.target.value.trim();
                setGptMaxTokens(value ? Number.parseInt(value, 10) || undefined : undefined);
              }}
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded border border-slate-400 px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              disabled={gptState.loading}
            >
              {gptState.loading ? 'Generating…' : 'Generate response'}
            </button>
          </div>
        </form>
        {gptState.error ? (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {gptState.error}
          </p>
        ) : null}
        {gptState.result ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">Response</h3>
            <p className="whitespace-pre-wrap text-sm">{gptState.result.answer}</p>
            <CitationsList citations={gptState.result.citations} />
          </div>
        ) : null}
      </section>
    </main>
  );
}
