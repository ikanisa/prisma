import type { KBScope } from './registry-loader';

export interface DeepSearchParams {
  query: string;
  category?: string;
  jurisdictions?: string[];
  tags?: string[];
  matchCount?: number;
  minSimilarity?: number;
}

export interface DeepSearchResult {
  id: string;
  content: string;
  metadata: {
    source: string;
    category: string;
    jurisdiction?: string;
    tags?: string[];
    similarity: number;
  };
}

export class DeepSearchWrapper {
  private searchFunction: (params: DeepSearchParams) => Promise<DeepSearchResult[]>;

  constructor(searchFunction: (params: DeepSearchParams) => Promise<DeepSearchResult[]>) {
    this.searchFunction = searchFunction;
  }

  async search(
    query: string,
    scopes: KBScope[],
    additionalParams?: Partial<DeepSearchParams>
  ): Promise<DeepSearchResult[]> {
    const allResults: DeepSearchResult[] = [];

    for (const scope of scopes) {
      const params: DeepSearchParams = {
        query,
        category: scope.category,
        jurisdictions: scope.jurisdictions,
        tags: scope.tags_any.length > 0 ? scope.tags_any : undefined,
        matchCount: scope.max_results,
        minSimilarity: scope.min_similarity,
        ...additionalParams,
      };

      const results = await this.searchFunction(params);
      allResults.push(...results);
    }

    const uniqueResults = this.deduplicateResults(allResults);
    
    return uniqueResults.sort((a, b) => b.metadata.similarity - a.metadata.similarity);
  }

  private deduplicateResults(results: DeepSearchResult[]): DeepSearchResult[] {
    const seen = new Set<string>();
    const unique: DeepSearchResult[] = [];

    for (const result of results) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        unique.push(result);
      }
    }

    return unique;
  }

  async searchSingleScope(
    query: string,
    scope: KBScope,
    additionalParams?: Partial<DeepSearchParams>
  ): Promise<DeepSearchResult[]> {
    return this.search(query, [scope], additionalParams);
  }

  static formatResultsForPrompt(results: DeepSearchResult[]): string {
    if (results.length === 0) {
      return 'No relevant knowledge base results found.';
    }

    const formatted = results.map((result, index) => {
      const source = result.metadata.source || 'Unknown';
      const jurisdiction = result.metadata.jurisdiction || 'N/A';
      const similarity = (result.metadata.similarity * 100).toFixed(1);
      
      return [
        `[${index + 1}] ${source} (${jurisdiction}) - Relevance: ${similarity}%`,
        result.content,
        '---',
      ].join('\n');
    });

    return [
      '## Knowledge Base Results',
      '',
      ...formatted,
    ].join('\n');
  }
}
