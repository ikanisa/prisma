/**
 * Utility functions for working with OpenAI Web Search Tool
 */

import type {
  WebSearchTool,
  WebSearchPreviewTool,
  WebSearchUserLocation,
  WebSearchFilters,
  WebSearchResponse,
  WebSearchSource,
  ExtractedWebSearchResults,
  UrlCitationAnnotation,
} from './types/web-search.js';

/**
 * Create a web search tool configuration
 */
export function createWebSearchTool(options?: {
  allowedDomains?: string[];
  userLocation?: WebSearchUserLocation;
  externalWebAccess?: boolean;
}): WebSearchTool {
  const tool: WebSearchTool = { type: 'web_search' };

  if (options?.allowedDomains && options.allowedDomains.length > 0) {
    // Validate domain count (max 20)
    if (options.allowedDomains.length > 20) {
      throw new Error('allowedDomains cannot exceed 20 entries');
    }
    tool.filters = { allowed_domains: options.allowedDomains };
  }

  if (options?.userLocation) {
    tool.user_location = options.userLocation;
  }

  if (typeof options?.externalWebAccess === 'boolean') {
    tool.external_web_access = options.externalWebAccess;
  }

  return tool;
}

/**
 * Create a web search preview tool configuration
 * Note: Preview variant ignores external_web_access parameter
 */
export function createWebSearchPreviewTool(options?: {
  allowedDomains?: string[];
  userLocation?: WebSearchUserLocation;
}): WebSearchPreviewTool {
  const tool: WebSearchPreviewTool = { type: 'web_search_preview' };

  if (options?.allowedDomains && options.allowedDomains.length > 0) {
    if (options.allowedDomains.length > 20) {
      throw new Error('allowedDomains cannot exceed 20 entries');
    }
    tool.filters = { allowed_domains: options.allowedDomains };
  }

  if (options?.userLocation) {
    tool.user_location = options.userLocation;
  }

  return tool;
}

/**
 * Create a user location object for web search
 */
export function createUserLocation(options: {
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
}): WebSearchUserLocation | undefined {
  // Return undefined if no location info provided
  if (!options.country && !options.city && !options.region && !options.timezone) {
    return undefined;
  }

  const location: WebSearchUserLocation = { type: 'approximate' };

  if (options.country) {
    location.country = options.country;
  }
  if (options.city) {
    location.city = options.city;
  }
  if (options.region) {
    location.region = options.region;
  }
  if (options.timezone) {
    location.timezone = options.timezone;
  }

  return location;
}

/**
 * Extract text content from web search response
 */
export function extractTextFromWebSearchResponse(response: WebSearchResponse): string {
  if (!response) return '';

  // Check for direct output_text
  if (response.output_text) {
    return response.output_text;
  }

  // Extract from output array
  if (Array.isArray(response.output)) {
    return response.output
      .flatMap((item: any) => {
        if (!item || typeof item !== 'object') return [];
        
        // Handle message items with content
        if (item.type === 'message' && Array.isArray(item.content)) {
          return item.content
            .filter((part: any) => part?.type === 'output_text' || part?.type === 'text')
            .map((part: any) => part?.text ?? '')
            .filter((text: string) => text.length > 0);
        }
        
        // Handle direct content arrays
        if (Array.isArray(item.content)) {
          return item.content
            .map((part: any) => part?.text ?? part?.output_text ?? '')
            .filter((text: string) => text.length > 0);
        }
        
        return [];
      })
      .join('\n');
  }

  return '';
}

/**
 * Extract URL citations from web search response
 */
export function extractUrlCitations(response: WebSearchResponse): UrlCitationAnnotation[] {
  const citations: UrlCitationAnnotation[] = [];

  if (!response || !Array.isArray(response.output)) {
    return citations;
  }

  for (const item of response.output) {
    if (!item || typeof item !== 'object') continue;

    // Look for message items with content
    const content = Array.isArray((item as any).content) ? (item as any).content : [];
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;

      // Check for annotations array
      const annotations = Array.isArray((part as any).annotations) ? (part as any).annotations : [];
      for (const annotation of annotations) {
        if (!annotation || typeof annotation !== 'object') continue;

        if (annotation.type === 'url_citation') {
          citations.push({
            type: 'url_citation',
            start_index: annotation.start_index ?? 0,
            end_index: annotation.end_index ?? 0,
            url: annotation.url ?? '',
            title: annotation.title,
          });
        }
      }
    }
  }

  return citations;
}

/**
 * Extract sources from web search response
 */
export function extractWebSearchSourcesFromResponse(response: WebSearchResponse): WebSearchSource[] {
  const sources: WebSearchSource[] = [];
  const seenUrls = new Set<string>();

  if (!response) {
    return sources;
  }

  // Check web_search_calls in flattened format
  if (Array.isArray(response.web_search_calls)) {
    for (const call of response.web_search_calls) {
      if (!call || typeof call !== 'object') continue;

      const action = (call as any).action;
      if (action && Array.isArray(action.sources)) {
        for (const source of action.sources) {
          if (source && typeof source === 'object') {
            const url = source.url ?? '';
            if (url && !seenUrls.has(url)) {
              seenUrls.add(url);
              sources.push(source as WebSearchSource);
            }
          }
        }
      }
    }
  }

  // Check output array for web_search_call items
  if (Array.isArray(response.output)) {
    for (const item of response.output) {
      if (!item || typeof item !== 'object') continue;

      if ((item as any).type === 'web_search_call') {
        const action = (item as any).action;
        if (action && Array.isArray(action.sources)) {
          for (const source of action.sources) {
            if (source && typeof source === 'object') {
              const url = source.url ?? '';
              if (url && !seenUrls.has(url)) {
                seenUrls.add(url);
                sources.push(source as WebSearchSource);
              }
            }
          }
        }
      }
    }
  }

  return sources;
}

/**
 * Extract complete web search results (text, citations, sources)
 */
export function extractWebSearchResults(response: WebSearchResponse): ExtractedWebSearchResults {
  return {
    answer: extractTextFromWebSearchResponse(response),
    citations: extractUrlCitations(response).map((c) => c as unknown as Record<string, unknown>),
    sources: extractWebSearchSourcesFromResponse(response),
  };
}

/**
 * Validate domain format for web search filters
 * Domains should not include HTTP/HTTPS prefix
 */
export function validateDomainFormat(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmed = domain.trim();

  // Should not be empty
  if (trimmed.length === 0) {
    return false;
  }

  // Should not start with http:// or https://
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return false;
  }

  // Should not start with //
  if (trimmed.startsWith('//')) {
    return false;
  }

  return true;
}

/**
 * Normalize domain for web search (remove protocol if present)
 */
export function normalizeDomain(domain: string): string {
  let normalized = domain.trim();

  // Remove http:// or https://
  if (normalized.startsWith('https://')) {
    normalized = normalized.substring(8);
  } else if (normalized.startsWith('http://')) {
    normalized = normalized.substring(7);
  }

  // Remove leading //
  if (normalized.startsWith('//')) {
    normalized = normalized.substring(2);
  }

  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.substring(0, normalized.length - 1);
  }

  return normalized;
}

/**
 * Validate and normalize allowed domains for web search
 */
export function normalizeAllowedDomains(domains: string[]): string[] {
  return domains
    .map((d) => normalizeDomain(d))
    .filter((d) => d.length > 0 && validateDomainFormat(d));
}
