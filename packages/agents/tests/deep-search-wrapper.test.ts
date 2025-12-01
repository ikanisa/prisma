import { describe, it, expect, vi } from 'vitest';
import { DeepSearchWrapper, type DeepSearchParams, type DeepSearchResult } from '../src/deep-search-wrapper';
import type { KBScope } from '../src/registry-loader';

describe('DeepSearchWrapper', () => {
  const mockResults: DeepSearchResult[] = [
    {
      id: 'result-1',
      content: 'IFRS 15 establishes principles for reporting revenue.',
      metadata: {
        source: 'IFRS 15',
        category: 'IFRS',
        jurisdiction: 'GLOBAL',
        tags: ['ifrs-15', 'revenue'],
        similarity: 0.92,
      },
    },
    {
      id: 'result-2',
      content: 'ASC 606 is the US GAAP equivalent to IFRS 15.',
      metadata: {
        source: 'ASC 606',
        category: 'US_GAAP',
        jurisdiction: 'US',
        tags: ['asc-606', 'revenue'],
        similarity: 0.88,
      },
    },
    {
      id: 'result-3',
      content: 'Revenue recognition requires identifying performance obligations.',
      metadata: {
        source: 'IFRS 15 Implementation',
        category: 'IFRS',
        jurisdiction: 'GLOBAL',
        tags: ['ifrs-15', 'implementation'],
        similarity: 0.75,
      },
    },
  ];

  describe('search', () => {
    it('should call search function with correct params', async () => {
      const searchFn = vi.fn().mockResolvedValue(mockResults);
      const wrapper = new DeepSearchWrapper(searchFn);

      const scopes: KBScope[] = [
        {
          tool: 'deep_search_kb',
          category: 'IFRS',
          jurisdictions: ['GLOBAL'],
          tags_any: ['ifrs-15', 'revenue'],
          max_results: 20,
          min_similarity: 0.72,
        },
      ];

      await wrapper.search('revenue recognition', scopes);

      expect(searchFn).toHaveBeenCalledWith({
        query: 'revenue recognition',
        category: 'IFRS',
        jurisdictions: ['GLOBAL'],
        tags: ['ifrs-15', 'revenue'],
        matchCount: 20,
        minSimilarity: 0.72,
      });
    });

    it('should handle multiple scopes', async () => {
      const searchFn = vi.fn().mockResolvedValue(mockResults);
      const wrapper = new DeepSearchWrapper(searchFn);

      const scopes: KBScope[] = [
        {
          tool: 'deep_search_kb',
          category: 'IFRS',
          jurisdictions: ['GLOBAL'],
          tags_any: ['ifrs-15'],
          max_results: 20,
          min_similarity: 0.72,
        },
        {
          tool: 'deep_search_kb',
          category: 'US_GAAP',
          jurisdictions: ['US'],
          tags_any: ['asc-606'],
          max_results: 10,
          min_similarity: 0.72,
        },
      ];

      await wrapper.search('revenue', scopes);

      expect(searchFn).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate results', async () => {
      const duplicateResults = [
        mockResults[0],
        mockResults[0],
        mockResults[1],
      ];
      const searchFn = vi.fn().mockResolvedValue(duplicateResults);
      const wrapper = new DeepSearchWrapper(searchFn);

      const scopes: KBScope[] = [
        {
          tool: 'deep_search_kb',
          category: 'IFRS',
          jurisdictions: ['GLOBAL'],
          tags_any: [],
          max_results: 10,
          min_similarity: 0.7,
        },
      ];

      const results = await wrapper.search('test', scopes);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('result-1');
      expect(results[1].id).toBe('result-2');
    });

    it('should sort by similarity descending', async () => {
      const searchFn = vi.fn().mockResolvedValue(mockResults);
      const wrapper = new DeepSearchWrapper(searchFn);

      const scopes: KBScope[] = [
        {
          tool: 'deep_search_kb',
          category: 'IFRS',
          jurisdictions: ['GLOBAL'],
          tags_any: [],
          max_results: 10,
          min_similarity: 0.7,
        },
      ];

      const results = await wrapper.search('test', scopes);

      expect(results[0].metadata.similarity).toBeGreaterThanOrEqual(
        results[1].metadata.similarity
      );
      expect(results[1].metadata.similarity).toBeGreaterThanOrEqual(
        results[2].metadata.similarity
      );
    });

    it('should handle empty tags_any', async () => {
      const searchFn = vi.fn().mockResolvedValue(mockResults);
      const wrapper = new DeepSearchWrapper(searchFn);

      const scopes: KBScope[] = [
        {
          tool: 'deep_search_kb',
          category: 'TAX',
          jurisdictions: ['RW'],
          tags_any: [],
          max_results: 15,
          min_similarity: 0.72,
        },
      ];

      await wrapper.search('tax rates', scopes);

      expect(searchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: undefined,
        })
      );
    });

    it('should merge additional params', async () => {
      const searchFn = vi.fn().mockResolvedValue(mockResults);
      const wrapper = new DeepSearchWrapper(searchFn);

      const scopes: KBScope[] = [
        {
          tool: 'deep_search_kb',
          category: 'IFRS',
          jurisdictions: ['GLOBAL'],
          tags_any: [],
          max_results: 10,
          min_similarity: 0.7,
        },
      ];

      await wrapper.search('test', scopes, { matchCount: 30 });

      expect(searchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          matchCount: 30,
        })
      );
    });
  });

  describe('searchSingleScope', () => {
    it('should search with single scope', async () => {
      const searchFn = vi.fn().mockResolvedValue(mockResults);
      const wrapper = new DeepSearchWrapper(searchFn);

      const scope: KBScope = {
        tool: 'deep_search_kb',
        category: 'IFRS',
        jurisdictions: ['GLOBAL'],
        tags_any: ['ifrs-15'],
        max_results: 20,
        min_similarity: 0.72,
      };

      const results = await wrapper.searchSingleScope('test', scope);

      expect(searchFn).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(3);
    });
  });

  describe('formatResultsForPrompt', () => {
    it('should format results correctly', () => {
      const formatted = DeepSearchWrapper.formatResultsForPrompt(mockResults);

      expect(formatted).toContain('## Knowledge Base Results');
      expect(formatted).toContain('[1] IFRS 15 (GLOBAL) - Relevance: 92.0%');
      expect(formatted).toContain('[2] ASC 606 (US) - Relevance: 88.0%');
      expect(formatted).toContain('[3] IFRS 15 Implementation (GLOBAL) - Relevance: 75.0%');
      expect(formatted).toContain('IFRS 15 establishes principles');
      expect(formatted).toContain('---');
    });

    it('should handle empty results', () => {
      const formatted = DeepSearchWrapper.formatResultsForPrompt([]);
      expect(formatted).toBe('No relevant knowledge base results found.');
    });

    it('should handle missing metadata fields', () => {
      const partialResults: DeepSearchResult[] = [
        {
          id: 'test',
          content: 'Test content',
          metadata: {
            source: '',
            category: 'TAX',
            similarity: 0.85,
          },
        },
      ];

      const formatted = DeepSearchWrapper.formatResultsForPrompt(partialResults);
      expect(formatted).toContain('Unknown');
      expect(formatted).toContain('N/A');
      expect(formatted).toContain('85.0%');
    });
  });
});
