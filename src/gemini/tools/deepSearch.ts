/**
 * Gemini Function Declaration: deep_search_kb
 * Mirror of OpenAI deepSearchTool for Gemini 1.5/2.0 agents
 */

export const geminiDeepSearchDeclaration = {
  name: 'deep_search_kb',
  description:
    'Search the curated accounting/audit/tax knowledge base (IFRS, IAS, ISA, ACCA, RRA, CFR, OECD, Big4, etc.). Returns authoritative content with source citations.',
  parameters: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description: 'User question or specific topic to search for',
      },
      category: {
        type: 'string' as const,
        enum: [
          'IFRS',
          'ISA',
          'ETHICS',
          'TAX',
          'CORP',
          'REG',
          'AML',
          'US_GAAP',
          'PUBLIC_SECTOR',
          'ESG',
          'VALUATION',
          'LAW',
          'KNOWLEDGE',
          'TECH',
          'BANKING',
          'FIRM',
          'GOVERNANCE',
        ],
        description: 'Knowledge category filter',
      },
      jurisdictionCode: {
        type: 'string' as const,
        description: 'Jurisdiction code like "RW", "MT", "EU", "US", "GLOBAL"',
      },
      matchCount: {
        type: 'integer' as const,
        minimum: 1,
        maximum: 30,
        default: 10,
        description: 'How many chunks to retrieve',
      },
    },
    required: ['query'],
  },
};

export type GeminiDeepSearchArgs = {
  query: string;
  category?: string | null;
  jurisdictionCode?: string | null;
  matchCount?: number;
};
