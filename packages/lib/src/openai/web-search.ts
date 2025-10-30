import type OpenAI from 'openai';

/**
 * OpenAI Web Search Tool module
 * Provides comprehensive support for web search functionality in the Responses API
 * Based on OpenAI's web search documentation and API specifications
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * User location information for refining web search results by geography
 */
export interface WebSearchUserLocation {
  /** Location type - currently only 'approximate' is supported */
  type: 'approximate';
  /** Two-letter ISO country code (e.g., 'US', 'GB') */
  country?: string;
  /** City name as free text (e.g., 'Minneapolis', 'London') */
  city?: string;
  /** Region/state name as free text (e.g., 'Minnesota', 'California') */
  region?: string;
  /** IANA timezone (e.g., 'America/Chicago', 'Europe/London') */
  timezone?: string;
}

/**
 * Domain filtering configuration for web search
 */
export interface WebSearchFilters {
  /**
   * Allow-list of up to 20 domains to limit search results
   * Format URLs without HTTP/HTTPS prefix (e.g., 'openai.com' instead of 'https://openai.com/')
   * Includes subdomains automatically
   */
  allowed_domains?: string[];
}

/**
 * Web search tool configuration for the Responses API
 */
export interface WebSearchTool {
  /** Tool type identifier */
  type: 'web_search';
  /** Optional domain filtering configuration */
  filters?: WebSearchFilters;
  /** Optional user location for geographically-relevant results */
  user_location?: WebSearchUserLocation;
  /**
   * Control whether web search fetches live content or uses cached/indexed results
   * Default: true (live access)
   * Set to false for offline/cache-only mode
   */
  external_web_access?: boolean;
}

/**
 * Web search preview tool - ignores external_web_access parameter
 */
export interface WebSearchPreviewTool {
  /** Tool type identifier for preview variant */
  type: 'web_search_preview';
  /** Optional domain filtering configuration */
  filters?: WebSearchFilters;
  /** Optional user location for geographically-relevant results */
  user_location?: WebSearchUserLocation;
}

/**
 * Actions that can be performed during a web search
 */
export type WebSearchAction = 'search' | 'open_page' | 'find_in_page';

/**
 * Source information from web search results
 */
export interface WebSearchSource {
  /** URL of the source */
  url?: string;
  /** Title of the source page */
  title?: string;
  /** Source type - can be URL or real-time feed (oai-sports, oai-weather, oai-finance) */
  type?: string;
  /** Additional metadata about the source */
  [key: string]: unknown;
}

/**
 * Web search action details
 */
export interface WebSearchActionDetails {
  /** The action performed (search, open_page, find_in_page) */
  action?: WebSearchAction;
  /** Search query if action is 'search' */
  query?: string;
  /** Domains that were searched */
  domains?: string[];
  /** List of all URLs retrieved during the search */
  sources?: WebSearchSource[];
}

/**
 * Web search call output item
 */
export interface WebSearchCallItem {
  type: 'web_search_call';
  /** Unique identifier for the search call */
  id: string;
  /** Status of the web search call */
  status: 'in_progress' | 'completed' | 'cancelled' | 'failed';
  /** Action details including sources */
  action?: WebSearchActionDetails;
}

/**
 * URL citation annotation in response content
 */
export interface UrlCitationAnnotation {
  type: 'url_citation';
  /** Start index of the citation in the text */
  start_index: number;
  /** End index of the citation in the text */
  end_index: number;
  /** URL being cited */
  url: string;
  /** Title of the cited page */
  title?: string;
}

/**
 * Text content with annotations (citations)
 */
export interface AnnotatedTextContent {
  type: 'output_text' | 'text';
  /** The text content */
  text: string;
  /** Inline citation annotations */
  annotations?: UrlCitationAnnotation[];
}

/**
 * Message item with web search results
 */
export interface MessageItemWithCitations {
  id: string;
  type: 'message';
  status: 'in_progress' | 'completed' | 'cancelled' | 'failed';
  role: 'assistant' | 'user' | 'system';
  /** Content array with text and citations */
  content: AnnotatedTextContent[];
}

/**
 * Response output that may include web search calls and messages with citations
 */
export interface WebSearchResponse {
  /** Response ID */
  id?: string;
  /** Array of output items including web search calls and messages */
  output?: Array<WebSearchCallItem | MessageItemWithCitations | Record<string, unknown>>;
  /** Alternative: direct output text (for some response formats) */
  output_text?: string;
  /** Alternative: web_search_calls array (flattened format) */
  web_search_calls?: WebSearchCallItem[];
  /** Additional response properties */
  [key: string]: unknown;
}

/**
 * Helper type for reasoning effort levels
 */
export type ReasoningEffortLevel = 'minimal' | 'low' | 'medium' | 'high';

/**
 * Helper type for text verbosity levels
 */
export type VerbosityLevel = 'low' | 'medium' | 'high';

/**
 * Extracted web search results for API responses
 */
export interface ExtractedWebSearchResults {
  /** The answer text generated by the model */
  answer: string;
  /** Inline citations extracted from the response */
  citations: UrlCitationAnnotation[];
  /** All sources consulted during the search */
  sources: WebSearchSource[];
}

// ============================================================================
// Tool Builder Functions
// ============================================================================

export interface CreateWebSearchToolOptions {
  /** Optional list of allowed domains (max 20) */
  allowedDomains?: string[];
  /** Optional user location for geographically-relevant results */
  userLocation?: WebSearchUserLocation;
  /** Optional: control live internet access (default: true) */
  externalWebAccess?: boolean;
}

/**
 * Create a web search tool configuration
 */
export function createWebSearchTool(options?: CreateWebSearchToolOptions): WebSearchTool {
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

// ============================================================================
// Response Extraction Functions
// ============================================================================

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
export function extractWebSearchSources(response: WebSearchResponse): WebSearchSource[] {
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
    citations: extractUrlCitations(response),
    sources: extractWebSearchSources(response),
  };
}

// ============================================================================
// Domain Validation and Normalization
// ============================================================================

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

// ============================================================================
// High-Level API Function
// ============================================================================

export interface RunWebSearchOptions {
  /** OpenAI client with Responses API support */
  client: Pick<OpenAI, 'responses'>;
  /** The search query or input prompt */
  query: string;
  /** Model to use (e.g., 'gpt-5', 'o4-mini', 'gpt-4o') */
  model: string;
  /** Optional: allowed domains (max 20) */
  allowedDomains?: string[];
  /** Optional: user location for geographically-relevant results */
  userLocation?: WebSearchUserLocation;
  /** Optional: control live internet access (default: true) */
  externalWebAccess?: boolean;
  /** Optional: reasoning effort level for reasoning models */
  reasoningEffort?: ReasoningEffortLevel;
  /** Optional: text verbosity level */
  verbosity?: VerbosityLevel;
  /** Optional: use preview tool variant */
  usePreview?: boolean;
  /** Optional: include sources in response */
  includeSources?: boolean;
  /** Optional: force web search tool usage */
  forceWebSearch?: boolean;
}

/**
 * Run a web search using OpenAI's Responses API
 * This is the primary function for performing web searches with comprehensive options
 */
export async function runWebSearch(options: RunWebSearchOptions): Promise<ExtractedWebSearchResults> {
  if (!options.query || typeof options.query !== 'string' || options.query.trim().length === 0) {
    throw new Error('query is required and must be a non-empty string');
  }

  if (!options.model || typeof options.model !== 'string') {
    throw new Error('model is required and must be a string');
  }

  // Build the web search tool
  const tool = options.usePreview
    ? createWebSearchPreviewTool({
        allowedDomains: options.allowedDomains,
        userLocation: options.userLocation,
      })
    : createWebSearchTool({
        allowedDomains: options.allowedDomains,
        userLocation: options.userLocation,
        externalWebAccess: options.externalWebAccess,
      });

  // Build the request payload
  const requestPayload: Record<string, unknown> = {
    model: options.model,
    input: options.query,
    tools: [tool as any],
  };

  // Add reasoning configuration if specified
  if (options.reasoningEffort) {
    requestPayload.reasoning = { effort: options.reasoningEffort };
  }

  // Add text verbosity if specified
  if (options.verbosity) {
    requestPayload.text = { verbosity: options.verbosity };
  }

  // Include sources if requested
  if (options.includeSources) {
    requestPayload.include = ['web_search_call.action.sources'];
  }

  // Force web search tool usage if requested
  if (options.forceWebSearch) {
    requestPayload.tool_choice = { type: tool.type };
  }

  // Make the API request
  const response = await options.client.responses.create(requestPayload);

  // Extract and return results
  return extractWebSearchResults(response as unknown as WebSearchResponse);
}
