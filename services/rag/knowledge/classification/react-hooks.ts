/**
 * React Hooks for Web Source Classification
 * 
 * Provides hooks for easy integration with React components
 */

import { useState, useCallback } from 'react';

export interface WebSource {
  id: string;
  name: string;
  base_url: string;
  source_type?: string;
  verification_level?: 'primary' | 'secondary' | 'tertiary';
  source_priority?: string;
  jurisdictions: string[];
  domains: string[];
  auto_classified: boolean;
  classification_confidence?: number;
  classification_source?: 'HEURISTIC' | 'LLM' | 'MIXED' | 'MANUAL';
  is_active: boolean;
  created_at: string;
}

export interface ClassificationResult {
  category: string;
  jurisdictionCode: string;
  tags: string[];
  confidence: number;
  source: 'HEURISTIC' | 'LLM' | 'MIXED';
  sourceType?: string;
  verificationLevel?: 'primary' | 'secondary' | 'tertiary';
  sourcePriority?: string;
}

/**
 * Hook for creating a web source with auto-classification
 */
export function useCreateWebSource() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WebSource | null>(null);

  const createSource = useCallback(async (data: {
    name: string;
    base_url: string;
    description?: string;
    page_title?: string;
    page_snippet?: string;
    force_manual?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/v1/web-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create source');
      }

      const source = await response.json();
      setResult(source);
      return source;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return {
    createSource,
    loading,
    error,
    result,
    reset,
  };
}

/**
 * Hook for listing web sources with filters
 */
export function useWebSources(filters?: {
  page?: number;
  page_size?: number;
  auto_classified?: boolean;
  source_type?: string;
  jurisdiction?: string;
}) {
  const [sources, setSources] = useState<WebSource[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.page_size) params.set('page_size', filters.page_size.toString());
      if (filters?.auto_classified !== undefined) {
        params.set('auto_classified', filters.auto_classified.toString());
      }
      if (filters?.source_type) params.set('source_type', filters.source_type);
      if (filters?.jurisdiction) params.set('jurisdiction', filters.jurisdiction);

      const response = await fetch(`/api/v1/web-sources?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch sources');
      }

      const data = await response.json();
      setSources(data.sources);
      setTotal(data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters?.page, filters?.page_size, filters?.auto_classified, filters?.source_type, filters?.jurisdiction]);

  return {
    sources,
    total,
    loading,
    error,
    fetchSources,
    setSources,
  };
}

/**
 * Hook for reclassifying a web source
 */
export function useReclassifySource() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reclassify = useCallback(async (id: string, forceLLM = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/web-sources/${id}/reclassify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_llm: forceLLM }),
      });

      if (!response.ok) {
        throw new Error('Reclassification failed');
      }

      const data = await response.json();
      return data.source;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    reclassify,
    loading,
    error,
  };
}

/**
 * Hook for updating a web source
 */
export function useUpdateWebSource() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSource = useCallback(async (id: string, updates: Partial<WebSource>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/web-sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateSource,
    loading,
    error,
  };
}

/**
 * Hook for deleting a web source
 */
export function useDeleteWebSource() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSource = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/web-sources/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deleteSource,
    loading,
    error,
  };
}

/**
 * Utility: Get badge color for confidence score
 */
export function getConfidenceBadgeColor(confidence?: number): string {
  if (!confidence) return 'gray';
  if (confidence >= 80) return 'green';
  if (confidence >= 50) return 'yellow';
  return 'red';
}

/**
 * Utility: Get badge color for classification source
 */
export function getSourceBadgeColor(
  source?: 'HEURISTIC' | 'LLM' | 'MIXED' | 'MANUAL'
): string {
  switch (source) {
    case 'HEURISTIC':
      return 'blue';
    case 'LLM':
      return 'purple';
    case 'MIXED':
      return 'indigo';
    case 'MANUAL':
    default:
      return 'gray';
  }
}

/**
 * Utility: Format jurisdiction codes for display
 */
export function formatJurisdictions(jurisdictions: string[]): string {
  if (!jurisdictions || jurisdictions.length === 0) return 'None';
  return jurisdictions.join(', ');
}

/**
 * Utility: Get verification level badge
 */
export function getVerificationBadge(
  level?: 'primary' | 'secondary' | 'tertiary'
): { text: string; color: string } {
  switch (level) {
    case 'primary':
      return { text: 'Primary', color: 'green' };
    case 'secondary':
      return { text: 'Secondary', color: 'blue' };
    case 'tertiary':
      return { text: 'Tertiary', color: 'gray' };
    default:
      return { text: 'Unknown', color: 'gray' };
  }
}
