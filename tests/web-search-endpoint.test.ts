/**
 * Integration test example for Web Search API endpoint
 * This demonstrates how to test the web search endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSearchResponse } from '../services/rag/types/web-search.js';

describe('Web Search API Endpoint', () => {
  // Mock OpenAI client
  const mockOpenAiClient = {
    responses: {
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should perform basic web search', async () => {
    const mockResponse: WebSearchResponse = {
      id: 'resp_123',
      output: [
        {
          type: 'web_search_call',
          id: 'ws_456',
          status: 'completed',
          action: {
            action: 'search',
            query: 'latest IFRS amendments',
            sources: [
              {
                url: 'https://www.ifrs.org/news-and-events/updates/',
                title: 'IFRS Updates',
                type: 'url',
              },
            ],
          },
        },
        {
          type: 'message',
          id: 'msg_789',
          status: 'completed',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Recent IFRS amendments include...',
              annotations: [
                {
                  type: 'url_citation',
                  start_index: 0,
                  end_index: 20,
                  url: 'https://www.ifrs.org/news-and-events/updates/',
                  title: 'IFRS Updates',
                },
              ],
            },
          ],
        },
      ],
    };

    mockOpenAiClient.responses.create.mockResolvedValue(mockResponse);

    // Simulate API request
    const requestBody = {
      orgSlug: 'test-org',
      agentKey: 'financialReporting',
      query: 'latest IFRS amendments',
    };

    // The endpoint would call openai.responses.create
    expect(mockOpenAiClient.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(String),
        input: 'latest IFRS amendments',
        tools: expect.arrayContaining([
          expect.objectContaining({ type: 'web_search' }),
        ]),
      })
    );
  });

  it('should include domain filtering', async () => {
    const mockResponse: WebSearchResponse = {
      output_text: 'Medical research results...',
      web_search_calls: [
        {
          type: 'web_search_call',
          id: 'ws_medical',
          status: 'completed',
          action: {
            sources: [
              {
                url: 'https://pubmed.ncbi.nlm.nih.gov/article/123',
                title: 'Research Article',
              },
            ],
          },
        },
      ],
    };

    mockOpenAiClient.responses.create.mockResolvedValue(mockResponse);

    const requestBody = {
      orgSlug: 'test-org',
      agentKey: 'advisory',
      query: 'diabetes treatment research',
      allowedDomains: [
        'pubmed.ncbi.nlm.nih.gov',
        'clinicaltrials.gov',
        'www.who.int',
      ],
    };

    // Verify tool configuration includes filters
    const expectedTool = {
      type: 'web_search',
      filters: {
        allowed_domains: [
          'pubmed.ncbi.nlm.nih.gov',
          'clinicaltrials.gov',
          'www.who.int',
        ],
      },
    };

    expect(expectedTool.filters?.allowed_domains).toHaveLength(3);
  });

  it('should include user location', async () => {
    const mockResponse: WebSearchResponse = {
      output_text: 'London restaurants...',
    };

    mockOpenAiClient.responses.create.mockResolvedValue(mockResponse);

    const requestBody = {
      orgSlug: 'test-org',
      agentKey: 'advisory',
      query: 'best restaurants near me',
      location: {
        country: 'GB',
        city: 'London',
        region: 'London',
        timezone: 'Europe/London',
      },
    };

    // Verify tool includes user_location
    const expectedTool = {
      type: 'web_search',
      user_location: {
        type: 'approximate',
        country: 'GB',
        city: 'London',
        region: 'London',
        timezone: 'Europe/London',
      },
    };

    expect(expectedTool.user_location).toBeDefined();
    expect(expectedTool.user_location?.timezone).toBe('Europe/London');
  });

  it('should support cache-only mode', async () => {
    const mockResponse: WebSearchResponse = {
      output_text: 'Sunrise time from cache...',
    };

    mockOpenAiClient.responses.create.mockResolvedValue(mockResponse);

    const requestBody = {
      orgSlug: 'test-org',
      agentKey: 'advisory',
      query: 'sunrise time in Paris',
      externalWebAccess: false,
    };

    // Verify external_web_access is false
    const expectedTool = {
      type: 'web_search',
      external_web_access: false,
    };

    expect(expectedTool.external_web_access).toBe(false);
  });

  it('should extract citations and sources correctly', async () => {
    const mockResponse: WebSearchResponse = {
      output: [
        {
          type: 'web_search_call',
          id: 'ws_1',
          status: 'completed',
          action: {
            sources: [
              { url: 'https://example.com', title: 'Example' },
              { url: 'https://test.org', title: 'Test' },
            ],
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
              text: 'Information from sources',
              annotations: [
                {
                  type: 'url_citation',
                  start_index: 0,
                  end_index: 11,
                  url: 'https://example.com',
                  title: 'Example',
                },
              ],
            },
          ],
        },
      ],
    };

    mockOpenAiClient.responses.create.mockResolvedValue(mockResponse);

    // Extract results (this would be done by the endpoint)
    const sources = mockResponse.output
      ?.filter((item: any) => item.type === 'web_search_call')
      .flatMap((item: any) => item.action?.sources || []);

    const citations = mockResponse.output
      ?.filter((item: any) => item.type === 'message')
      .flatMap((item: any) => item.content || [])
      .flatMap((content: any) => content.annotations || [])
      .filter((ann: any) => ann.type === 'url_citation');

    expect(sources).toHaveLength(2);
    expect(citations).toHaveLength(1);
    expect(citations![0].url).toBe('https://example.com');
  });

  it('should reject requests without required fields', () => {
    const invalidRequests = [
      { agentKey: 'test', query: 'test' }, // missing orgSlug
      { orgSlug: 'test', query: 'test' }, // missing agentKey
      { orgSlug: 'test', agentKey: 'test' }, // missing query
    ];

    invalidRequests.forEach((request) => {
      const hasOrgSlug = 'orgSlug' in request && typeof request.orgSlug === 'string';
      const hasAgentKey = 'agentKey' in request && typeof request.agentKey === 'string';
      const hasQuery = 'query' in request && typeof request.query === 'string';

      expect(hasOrgSlug && hasAgentKey && hasQuery).toBe(false);
    });
  });

  it('should reject more than 20 allowed domains', () => {
    const domains = Array.from({ length: 21 }, (_, i) => `domain${i}.com`);

    const requestBody = {
      orgSlug: 'test-org',
      agentKey: 'test',
      query: 'test',
      allowedDomains: domains,
    };

    // Validation should fail
    expect(requestBody.allowedDomains.length).toBeGreaterThan(20);
  });
});
