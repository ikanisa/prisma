/**
 * Tests for OpenAI Web Search Tool utilities
 */

import { describe, it, expect } from 'vitest';
import {
  createWebSearchTool,
  createWebSearchPreviewTool,
  createUserLocation,
  extractTextFromWebSearchResponse,
  extractUrlCitations,
  extractWebSearchSourcesFromResponse,
  extractWebSearchResults,
  validateDomainFormat,
  normalizeDomain,
  normalizeAllowedDomains,
} from '../web-search-utils.js';
import type { WebSearchResponse } from '../types/web-search.js';

describe('createWebSearchTool', () => {
  it('should create a basic web search tool', () => {
    const tool = createWebSearchTool();
    expect(tool).toEqual({ type: 'web_search' });
  });

  it('should include allowed domains', () => {
    const tool = createWebSearchTool({
      allowedDomains: ['example.com', 'test.org'],
    });
    expect(tool).toEqual({
      type: 'web_search',
      filters: {
        allowed_domains: ['example.com', 'test.org'],
      },
    });
  });

  it('should include user location', () => {
    const tool = createWebSearchTool({
      userLocation: {
        type: 'approximate',
        country: 'US',
        city: 'New York',
      },
    });
    expect(tool.user_location).toEqual({
      type: 'approximate',
      country: 'US',
      city: 'New York',
    });
  });

  it('should include external_web_access', () => {
    const tool = createWebSearchTool({
      externalWebAccess: false,
    });
    expect(tool.external_web_access).toBe(false);
  });

  it('should throw error if more than 20 domains', () => {
    const domains = Array.from({ length: 21 }, (_, i) => `domain${i}.com`);
    expect(() => createWebSearchTool({ allowedDomains: domains })).toThrow(
      'allowedDomains cannot exceed 20 entries'
    );
  });
});

describe('createWebSearchPreviewTool', () => {
  it('should create a web search preview tool', () => {
    const tool = createWebSearchPreviewTool();
    expect(tool).toEqual({ type: 'web_search_preview' });
  });

  it('should include filters', () => {
    const tool = createWebSearchPreviewTool({
      allowedDomains: ['example.com'],
    });
    expect(tool.filters).toEqual({
      allowed_domains: ['example.com'],
    });
  });
});

describe('createUserLocation', () => {
  it('should return undefined if no location data', () => {
    const location = createUserLocation({});
    expect(location).toBeUndefined();
  });

  it('should create location with country only', () => {
    const location = createUserLocation({ country: 'GB' });
    expect(location).toEqual({
      type: 'approximate',
      country: 'GB',
    });
  });

  it('should create location with all fields', () => {
    const location = createUserLocation({
      country: 'US',
      city: 'Minneapolis',
      region: 'Minnesota',
      timezone: 'America/Chicago',
    });
    expect(location).toEqual({
      type: 'approximate',
      country: 'US',
      city: 'Minneapolis',
      region: 'Minnesota',
      timezone: 'America/Chicago',
    });
  });
});

describe('extractTextFromWebSearchResponse', () => {
  it('should return empty string for null response', () => {
    const text = extractTextFromWebSearchResponse(null as any);
    expect(text).toBe('');
  });

  it('should extract output_text', () => {
    const response: WebSearchResponse = {
      output_text: 'Test output',
    };
    const text = extractTextFromWebSearchResponse(response);
    expect(text).toBe('Test output');
  });

  it('should extract text from output array', () => {
    const response: WebSearchResponse = {
      output: [
        {
          type: 'message',
          content: [
            { type: 'output_text', text: 'First part' },
            { type: 'output_text', text: 'Second part' },
          ],
        },
      ],
    };
    const text = extractTextFromWebSearchResponse(response);
    expect(text).toBe('First part\nSecond part');
  });
});

describe('extractUrlCitations', () => {
  it('should return empty array for null response', () => {
    const citations = extractUrlCitations(null as any);
    expect(citations).toEqual([]);
  });

  it('should extract url_citation annotations', () => {
    const response: WebSearchResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'Some text with citation',
              annotations: [
                {
                  type: 'url_citation',
                  start_index: 10,
                  end_index: 20,
                  url: 'https://example.com',
                  title: 'Example',
                },
              ],
            },
          ],
        },
      ],
    };
    const citations = extractUrlCitations(response);
    expect(citations).toHaveLength(1);
    expect(citations[0]).toEqual({
      type: 'url_citation',
      start_index: 10,
      end_index: 20,
      url: 'https://example.com',
      title: 'Example',
    });
  });
});

describe('extractWebSearchSourcesFromResponse', () => {
  it('should return empty array for null response', () => {
    const sources = extractWebSearchSourcesFromResponse(null as any);
    expect(sources).toEqual([]);
  });

  it('should extract sources from web_search_calls', () => {
    const response: WebSearchResponse = {
      web_search_calls: [
        {
          type: 'web_search_call',
          id: 'call_123',
          status: 'completed',
          action: {
            sources: [
              { url: 'https://example.com', title: 'Example' },
              { url: 'https://test.org', title: 'Test' },
            ],
          },
        },
      ],
    };
    const sources = extractWebSearchSourcesFromResponse(response);
    expect(sources).toHaveLength(2);
    expect(sources[0].url).toBe('https://example.com');
  });

  it('should extract sources from output array', () => {
    const response: WebSearchResponse = {
      output: [
        {
          type: 'web_search_call',
          id: 'call_456',
          status: 'completed',
          action: {
            sources: [{ url: 'https://example.org', title: 'Example Org' }],
          },
        },
      ],
    };
    const sources = extractWebSearchSourcesFromResponse(response);
    expect(sources).toHaveLength(1);
    expect(sources[0].url).toBe('https://example.org');
  });

  it('should deduplicate sources', () => {
    const response: WebSearchResponse = {
      web_search_calls: [
        {
          type: 'web_search_call',
          id: 'call_1',
          status: 'completed',
          action: {
            sources: [{ url: 'https://example.com', title: 'Example' }],
          },
        },
      ],
      output: [
        {
          type: 'web_search_call',
          id: 'call_2',
          status: 'completed',
          action: {
            sources: [{ url: 'https://example.com', title: 'Example' }],
          },
        },
      ],
    };
    const sources = extractWebSearchSourcesFromResponse(response);
    expect(sources).toHaveLength(1);
  });
});

describe('extractWebSearchResults', () => {
  it('should extract complete results', () => {
    const response: WebSearchResponse = {
      output_text: 'Test answer',
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'Test answer',
              annotations: [
                {
                  type: 'url_citation',
                  start_index: 0,
                  end_index: 10,
                  url: 'https://example.com',
                },
              ],
            },
          ],
        },
      ],
      web_search_calls: [
        {
          type: 'web_search_call',
          id: 'call_123',
          status: 'completed',
          action: {
            sources: [{ url: 'https://example.com', title: 'Example' }],
          },
        },
      ],
    };
    const results = extractWebSearchResults(response);
    expect(results.answer).toBe('Test answer');
    expect(results.citations).toHaveLength(1);
    expect(results.sources).toHaveLength(1);
  });
});

describe('validateDomainFormat', () => {
  it('should validate correct domains', () => {
    expect(validateDomainFormat('example.com')).toBe(true);
    expect(validateDomainFormat('subdomain.example.com')).toBe(true);
    expect(validateDomainFormat('test.org')).toBe(true);
  });

  it('should reject invalid domains', () => {
    expect(validateDomainFormat('https://example.com')).toBe(false);
    expect(validateDomainFormat('http://example.com')).toBe(false);
    expect(validateDomainFormat('//example.com')).toBe(false);
    expect(validateDomainFormat('')).toBe(false);
    expect(validateDomainFormat('   ')).toBe(false);
  });
});

describe('normalizeDomain', () => {
  it('should remove protocol', () => {
    expect(normalizeDomain('https://example.com')).toBe('example.com');
    expect(normalizeDomain('http://example.com')).toBe('example.com');
  });

  it('should remove leading slashes', () => {
    expect(normalizeDomain('//example.com')).toBe('example.com');
  });

  it('should remove trailing slash', () => {
    expect(normalizeDomain('example.com/')).toBe('example.com');
  });

  it('should handle all together', () => {
    expect(normalizeDomain('https://example.com/')).toBe('example.com');
  });
});

describe('normalizeAllowedDomains', () => {
  it('should normalize domain list', () => {
    const domains = [
      'https://example.com/',
      'http://test.org',
      '//invalid.com',
      'valid.net',
      '',
      '   ',
    ];
    const normalized = normalizeAllowedDomains(domains);
    expect(normalized).toEqual(['example.com', 'test.org', 'invalid.com', 'valid.net']);
  });
});
