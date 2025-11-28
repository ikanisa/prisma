/**
 * Type definitions for OpenAI Web Search Tool
 * Based on OpenAI Responses API documentation
 */

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
 * Web search request payload for Responses API
 */
export interface WebSearchRequestPayload {
  /** Model to use (e.g., 'gpt-5', 'gpt-4o-mini') */
  model: string;
  /** Input prompt or messages */
  input: string | Array<{ role: string; content: string }>;
  /** Array of tools including web search */
  tools: Array<WebSearchTool | WebSearchPreviewTool | Record<string, unknown>>;
  /** Optional: force tool usage */
  tool_choice?: 'auto' | { type: 'web_search' | 'web_search_preview' };
  /** Optional: include specific fields in response */
  include?: string[];
  /** Optional: reasoning configuration for reasoning models */
  reasoning?: { effort: ReasoningEffortLevel };
  /** Optional: text verbosity configuration */
  text?: { verbosity: VerbosityLevel };
  /** Additional request properties */
  [key: string]: unknown;
}

/**
 * Extracted web search results for API responses
 */
export interface ExtractedWebSearchResults {
  /** The answer text generated by the model */
  answer: string;
  /** Inline citations extracted from the response */
  citations: Array<Record<string, unknown>>;
  /** All sources consulted during the search */
  sources: WebSearchSource[];
}
