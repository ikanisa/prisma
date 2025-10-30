/**
 * Comprehensive tests for OpenAI Web Search module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createWebSearchTool,
  createWebSearchPreviewTool,
  createUserLocation,
  extractTextFromWebSearchResponse,
  extractUrlCitations,
  extractWebSearchSources,
  extractWebSearchResults,
  validateDomainFormat,
  normalizeDomain,
  normalizeAllowedDomains,
  runWebSearch,
  type WebSearchResponse,
  type WebSearchUserLocation,
  type UrlCitationAnnotation,
  type WebSearchSource,
} from '../web-search.js';

describe('createWebSearchTool', () => {
  it('should create a basic web search tool', () => {
    const tool = createWebSearchTool();
    expect(tool).toEqual({ type: 'web_search' });
  });

  it('should include domain filters when provided', () => {
    const tool = createWebSearchTool({
      allowedDomains: ['openai.com', 'example.com'],
    });
    expect(tool).toEqual({
      type: 'web_search',
      filters: {
        allowed_domains: ['openai.com', 'example.com'],
      },
    });
  });

  it('should include user location when provided', () => {
    const location: WebSearchUserLocation = {
      type: 'approximate',
      country: 'US',
      city: 'San Francisco',
      region: 'California',
    };
    const tool = createWebSearchTool({ userLocation: location });
    expect(tool.user_location).toEqual(location);
  });

  it('should include external_web_access when provided', () => {
    const tool = createWebSearchTool({ externalWebAccess: false });
    expect(tool.external_web_access).toBe(false);
  });

  it('should throw error if more than 20 domains provided', () => {
    const domains = Array.from({ length: 21 }, (_, i) => `domain${i}.com`);
    expect(() => createWebSearchTool({ allowedDomains: domains })).toThrow(
      'allowedDomains cannot exceed 20 entries'
    );
  });

  it('should allow exactly 20 domains', () => {
    const domains = Array.from({ length: 20 }, (_, i) => `domain${i}.com`);
    const tool = createWebSearchTool({ allowedDomains: domains });
    expect(tool.filters?.allowed_domains).toHaveLength(20);
  });

  it('should not include filters if empty domain list', () => {
    const tool = createWebSearchTool({ allowedDomains: [] });
    expect(tool.filters).toBeUndefined();
  });
});

describe('createWebSearchPreviewTool', () => {
  it('should create a preview tool', () => {
    const tool = createWebSearchPreviewTool();
    expect(tool).toEqual({ type: 'web_search_preview' });
  });

  it('should include domain filters in preview tool', () => {
    const tool = createWebSearchPreviewTool({
      allowedDomains: ['openai.com'],
    });
    expect(tool.filters?.allowed_domains).toEqual(['openai.com']);
  });

  it('should not include external_web_access in preview tool', () => {
    const tool = createWebSearchPreviewTool();
    expect('external_web_access' in tool).toBe(false);
  });

  it('should throw error if more than 20 domains in preview tool', () => {
    const domains = Array.from({ length: 21 }, (_, i) => `domain${i}.com`);
    expect(() => createWebSearchPreviewTool({ allowedDomains: domains })).toThrow(
      'allowedDomains cannot exceed 20 entries'
    );
  });
});

describe('createUserLocation', () => {
  it('should return undefined if no location info provided', () => {
    const location = createUserLocation({});
    expect(location).toBeUndefined();
  });

  it('should create location with country only', () => {
    const location = createUserLocation({ country: 'US' });
    expect(location).toEqual({
      type: 'approximate',
      country: 'US',
    });
  });

  it('should create location with all fields', () => {
    const location = createUserLocation({
      country: 'GB',
      city: 'London',
      region: 'Greater London',
      timezone: 'Europe/London',
    });
    expect(location).toEqual({
      type: 'approximate',
      country: 'GB',
      city: 'London',
      region: 'Greater London',
      timezone: 'Europe/London',
    });
  });

  it('should create location with partial fields', () => {
    const location = createUserLocation({
      city: 'New York',
      timezone: 'America/New_York',
    });
    expect(location).toEqual({
      type: 'approximate',
      city: 'New York',
      timezone: 'America/New_York',
    });
  });
});

describe('extractTextFromWebSearchResponse', () => {
  it('should extract text from output_text field', () => {
    const response: WebSearchResponse = {
      output_text: 'This is the answer',
    };
    expect(extractTextFromWebSearchResponse(response)).toBe('This is the answer');
  });

  it('should extract text from output array with message items', () => {
    const response: WebSearchResponse = {
      output: [
        {
          type: 'message',
          id: 'msg_1',
          status: 'completed',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'First part',
            },
            {
              type: 'output_text',
              text: 'Second part',
            },
          ],
        },
      ],
    };
    expect(extractTextFromWebSearchResponse(response)).toBe('First part\nSecond part');
  });

  it('should return empty string for empty response', () => {
    expect(extractTextFromWebSearchResponse({} as WebSearchResponse)).toBe('');
  });

  it('should handle mixed content types', () => {
    const response: WebSearchResponse = {
      output: [
        {
          type: 'web_search_call',
          id: 'ws_1',
          status: 'completed',
        },
        {
          type: 'message',
          id: 'msg_1',
          status: 'completed',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Answer text',
            },
          ],
        },
      ],
    };
    expect(extractTextFromWebSearchResponse(response)).toBe('Answer text');
  });
});

describe('extractUrlCitations', () => {
  it('should extract citations from response', () => {
    const response: WebSearchResponse = {
      output: [
        {
          type: 'message',
          id: 'msg_1',
          status: 'completed',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Some text',
              annotations: [
                {
                  type: 'url_citation',
                  start_index: 0,
                  end_index: 10,
                  url: 'https://example.com',
                  title: 'Example',
                },
                {
                  type: 'url_citation',
                  start_index: 11,
                  end_index: 20,
                  url: 'https://test.org',
                  title: 'Test',
                },
              ],
            },
          ],
        },
      ],
    };

    const citations = extractUrlCitations(response);
    expect(citations).toHaveLength(2);
    expect(citations[0]).toEqual({
      type: 'url_citation',
      start_index: 0,
      end_index: 10,
      url: 'https://example.com',
      title: 'Example',
    });
  });

  it('should return empty array if no citations', () => {
    const response: WebSearchResponse = {
      output: [
        {
          type: 'message',
          id: 'msg_1',
          status: 'completed',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Some text',
            },
          ],
        },
      ],
    };
    expect(extractUrlCitations(response)).toEqual([]);
  });

  it('should handle missing annotations gracefully', () => {
    const response: WebSearchResponse = {
      output: [
        {
          type: 'message',
          id: 'msg_1',
          status: 'completed',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Some text',
              annotations: [],
            },
          ],
        },
      ],
    };
    expect(extractUrlCitations(response)).toEqual([]);
  });
});

describe('extractWebSearchSources', () => {
  it('should extract sources from web_search_calls', () => {
    const response: WebSearchResponse = {
      web_search_calls: [
        {
          type: 'web_search_call',
          id: 'ws_1',
          status: 'completed',
          action: {
            action: 'search',
            sources: [
              { url: 'https://example.com', title: 'Example', type: 'url' },
              { url: 'https://test.org', title: 'Test', type: 'url' },
            ],
          },
        },
      ],
    };

    const sources = extractWebSearchSources(response);
    expect(sources).toHaveLength(2);
    expect(sources[0].url).toBe('https://example.com');
    expect(sources[1].url).toBe('https://test.org');
  });

  it('should extract sources from output array', () => {
    const response: WebSearchResponse = {
      output: [
        {
          type: 'web_search_call',
          id: 'ws_1',
          status: 'completed',
          action: {
            sources: [{ url: 'https://example.com', title: 'Example' }],
          },
        },
      ],
    };

    const sources = extractWebSearchSources(response);
    expect(sources).toHaveLength(1);
    expect(sources[0].url).toBe('https://example.com');
  });

  it('should deduplicate sources by URL', () => {
    const response: WebSearchResponse = {
      output: [
        {
          type: 'web_search_call',
          id: 'ws_1',
          status: 'completed',
          action: {
            sources: [
              { url: 'https://example.com', title: 'Example 1' },
              { url: 'https://example.com', title: 'Example 2' },
            ],
          },
        },
      ],
    };

    const sources = extractWebSearchSources(response);
    expect(sources).toHaveLength(1);
    expect(sources[0].title).toBe('Example 1'); // First one wins
  });

  it('should return empty array if no sources', () => {
    const response: WebSearchResponse = {
      output: [],
    };
    expect(extractWebSearchSources(response)).toEqual([]);
  });

  it('should handle real-time feed sources', () => {
    const response: WebSearchResponse = {
      web_search_calls: [
        {
          type: 'web_search_call',
          id: 'ws_1',
          status: 'completed',
          action: {
            sources: [
              { url: 'https://example.com', title: 'Regular', type: 'url' },
              { title: 'Sports Feed', type: 'oai-sports' },
            ],
          },
        },
      ],
    };

    const sources = extractWebSearchSources(response);
    expect(sources).toHaveLength(2);
    expect(sources[1].type).toBe('oai-sports');
  });
});

describe('extractWebSearchResults', () => {
  it('should extract all results together', () => {
    const response: WebSearchResponse = {
      output: [
        {
          type: 'web_search_call',
          id: 'ws_1',
          status: 'completed',
          action: {
            sources: [{ url: 'https://example.com', title: 'Example' }],
          },
        },
        {
          type: 'message',
          id: 'msg_1',
          status: 'completed',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Answer text',
              annotations: [
                {
                  type: 'url_citation',
                  start_index: 0,
                  end_index: 6,
                  url: 'https://example.com',
                  title: 'Example',
                },
              ],
            },
          ],
        },
      ],
    };

    const results = extractWebSearchResults(response);
    expect(results.answer).toBe('Answer text');
    expect(results.citations).toHaveLength(1);
    expect(results.sources).toHaveLength(1);
  });
});

describe('validateDomainFormat', () => {
  it('should validate correct domain format', () => {
    expect(validateDomainFormat('example.com')).toBe(true);
    expect(validateDomainFormat('sub.example.com')).toBe(true);
    expect(validateDomainFormat('www.example.org')).toBe(true);
  });

  it('should reject domains with protocol', () => {
    expect(validateDomainFormat('https://example.com')).toBe(false);
    expect(validateDomainFormat('http://example.com')).toBe(false);
    expect(validateDomainFormat('//example.com')).toBe(false);
  });

  it('should reject empty or invalid domains', () => {
    expect(validateDomainFormat('')).toBe(false);
    expect(validateDomainFormat('   ')).toBe(false);
  });

  it('should handle non-string input', () => {
    expect(validateDomainFormat(null as any)).toBe(false);
    expect(validateDomainFormat(undefined as any)).toBe(false);
    expect(validateDomainFormat(123 as any)).toBe(false);
  });
});

describe('normalizeDomain', () => {
  it('should remove https:// prefix', () => {
    expect(normalizeDomain('https://example.com')).toBe('example.com');
  });

  it('should remove http:// prefix', () => {
    expect(normalizeDomain('http://example.com')).toBe('example.com');
  });

  it('should remove // prefix', () => {
    expect(normalizeDomain('//example.com')).toBe('example.com');
  });

  it('should remove trailing slash', () => {
    expect(normalizeDomain('example.com/')).toBe('example.com');
    expect(normalizeDomain('https://example.com/')).toBe('example.com');
  });

  it('should trim whitespace', () => {
    expect(normalizeDomain('  example.com  ')).toBe('example.com');
  });

  it('should handle already normalized domains', () => {
    expect(normalizeDomain('example.com')).toBe('example.com');
  });
});

describe('normalizeAllowedDomains', () => {
  it('should normalize array of domains', () => {
    const domains = [
      'https://example.com',
      'http://test.org/',
      '  openai.com  ',
      'valid.domain.net',
    ];
    const normalized = normalizeAllowedDomains(domains);
    expect(normalized).toEqual(['example.com', 'test.org', 'openai.com', 'valid.domain.net']);
  });

  it('should filter out invalid domains', () => {
    const domains = ['example.com', '', '   ', 'https://test.org'];
    const normalized = normalizeAllowedDomains(domains);
    expect(normalized).toEqual(['example.com', 'test.org']);
  });

  it('should handle empty array', () => {
    expect(normalizeAllowedDomains([])).toEqual([]);
  });
});

describe('runWebSearch', () => {
  const mockClient = {
    responses: {
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should perform basic web search', async () => {
    const mockResponse: WebSearchResponse = {
      output: [
        {
          type: 'web_search_call',
          id: 'ws_1',
          status: 'completed',
          action: {
            sources: [{ url: 'https://example.com', title: 'Example' }],
          },
        },
        {
          type: 'message',
          id: 'msg_1',
          status: 'completed',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Answer text',
            },
          ],
        },
      ],
    };

    mockClient.responses.create.mockResolvedValue(mockResponse);

    const result = await runWebSearch({
      client: mockClient as any,
      query: 'test query',
      model: 'gpt-5',
    });

    expect(result.answer).toBe('Answer text');
    expect(result.sources).toHaveLength(1);
    expect(mockClient.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5',
        input: 'test query',
        tools: [{ type: 'web_search' }],
      })
    );
  });

  it('should include reasoning effort when specified', async () => {
    mockClient.responses.create.mockResolvedValue({ output_text: 'Answer' });

    await runWebSearch({
      client: mockClient as any,
      query: 'test',
      model: 'gpt-5',
      reasoningEffort: 'high',
    });

    expect(mockClient.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reasoning: { effort: 'high' },
      })
    );
  });

  it('should include allowed domains', async () => {
    mockClient.responses.create.mockResolvedValue({ output_text: 'Answer' });

    await runWebSearch({
      client: mockClient as any,
      query: 'test',
      model: 'gpt-5',
      allowedDomains: ['example.com', 'test.org'],
    });

    expect(mockClient.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [
          {
            type: 'web_search',
            filters: { allowed_domains: ['example.com', 'test.org'] },
          },
        ],
      })
    );
  });

  it('should include user location', async () => {
    mockClient.responses.create.mockResolvedValue({ output_text: 'Answer' });

    const location: WebSearchUserLocation = {
      type: 'approximate',
      country: 'US',
      city: 'New York',
    };

    await runWebSearch({
      client: mockClient as any,
      query: 'test',
      model: 'gpt-5',
      userLocation: location,
    });

    expect(mockClient.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [
          {
            type: 'web_search',
            user_location: location,
          },
        ],
      })
    );
  });

  it('should use preview tool when requested', async () => {
    mockClient.responses.create.mockResolvedValue({ output_text: 'Answer' });

    await runWebSearch({
      client: mockClient as any,
      query: 'test',
      model: 'gpt-5',
      usePreview: true,
    });

    expect(mockClient.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [{ type: 'web_search_preview' }],
      })
    );
  });

  it('should include sources when requested', async () => {
    mockClient.responses.create.mockResolvedValue({ output_text: 'Answer' });

    await runWebSearch({
      client: mockClient as any,
      query: 'test',
      model: 'gpt-5',
      includeSources: true,
    });

    expect(mockClient.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        include: ['web_search_call.action.sources'],
      })
    );
  });

  it('should force web search when requested', async () => {
    mockClient.responses.create.mockResolvedValue({ output_text: 'Answer' });

    await runWebSearch({
      client: mockClient as any,
      query: 'test',
      model: 'gpt-5',
      forceWebSearch: true,
    });

    expect(mockClient.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_choice: { type: 'web_search' },
      })
    );
  });

  it('should set external_web_access to false for cache-only mode', async () => {
    mockClient.responses.create.mockResolvedValue({ output_text: 'Answer' });

    await runWebSearch({
      client: mockClient as any,
      query: 'test',
      model: 'gpt-5',
      externalWebAccess: false,
    });

    expect(mockClient.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [{ type: 'web_search', external_web_access: false }],
      })
    );
  });

  it('should throw error if query is empty', async () => {
    await expect(
      runWebSearch({
        client: mockClient as any,
        query: '',
        model: 'gpt-5',
      })
    ).rejects.toThrow('query is required and must be a non-empty string');
  });

  it('should throw error if model is missing', async () => {
    await expect(
      runWebSearch({
        client: mockClient as any,
        query: 'test',
        model: '',
      })
    ).rejects.toThrow('model is required and must be a string');
  });

  it('should include verbosity when specified', async () => {
    mockClient.responses.create.mockResolvedValue({ output_text: 'Answer' });

    await runWebSearch({
      client: mockClient as any,
      query: 'test',
      model: 'gpt-5',
      verbosity: 'high',
    });

    expect(mockClient.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        text: { verbosity: 'high' },
      })
    );
  });
});
