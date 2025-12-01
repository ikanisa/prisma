/**
 * OpenAI Agents SDK Tool: deep_search_kb
 * Connects AI agents to the curated knowledge base via vector search
 */

import { tool } from '@openai/agents';
import { z } from 'zod';
import { deepSearch } from '../../lib/deepSearch';

export const deepSearchTool = tool({
  name: 'deep_search_kb',
  description: `
Search the curated accounting/audit/tax knowledge base (IFRS, IAS, ISA, ACCA, RRA, CFR, OECD, Big4, etc.).
Use this instead of web search for authoritative standards and regulations.
Results include content snippets plus source name and URL for citations.

Categories:
- IFRS: International Financial Reporting Standards
- ISA: International Standards on Auditing
- TAX: Tax laws and regulations (Rwanda, Malta, OECD)
- ETHICS: Professional ethics codes
- CORP: Corporate law and governance
- REG: Regulatory frameworks
- AML: Anti-money laundering
- US_GAAP: US accounting standards
- And more...

Jurisdictions:
- GLOBAL: International/universal standards
- RW: Rwanda
- MT: Malta
- EU, US, etc.
`.trim(),
  parameters: z.object({
    query: z.string().describe('User question or specific topic to search for'),
    category: z
      .enum([
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
      ])
      .nullable()
      .optional()
      .describe('Knowledge category filter'),
    jurisdictionCode: z
      .string()
      .nullable()
      .optional()
      .describe('Jurisdiction code like "RW", "MT", "EU", "US", "GLOBAL"'),
    matchCount: z
      .number()
      .int()
      .min(1)
      .max(30)
      .default(10)
      .describe('How many chunks to retrieve (default: 10)'),
  }),
  execute: async ({ query, category, jurisdictionCode, matchCount }) => {
    const results = await deepSearch({
      query,
      category: category ?? null,
      jurisdictionCode: jurisdictionCode ?? null,
      matchCount,
    });

    return {
      total_hits: results.length,
      hits: results.map((r) => ({
        id: r.id,
        content: r.content,
        similarity: r.similarity,
        source_name: r.source_name,
        page_url: r.page_url,
        category: r.category,
        jurisdiction_code: r.jurisdiction_code,
        tags: r.tags,
      })),
    };
  },
});
