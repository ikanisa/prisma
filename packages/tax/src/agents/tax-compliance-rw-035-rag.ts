/**
 * Rwanda Tax Compliance & Filing Agent (RAG-Enhanced)
 * 
 * Augmented with RAG knowledge base for Rwanda Revenue Authority (RRA) guidance.
 * Provides accurate, cited tax advice based on official sources.
 *
 * Jurisdiction: Rwanda (East African Community)
 * Knowledge Sources: RRA, OECD, East African Tax guidelines
 */

import type { TaxJurisdiction, FilingDeadline } from '../types';
import { RAGEnhancedAgent, type RAGContext } from '@prisma-glow/core';
import OpenAI from 'openai';

export interface RwandaComplianceAgentConfig {
  organizationId: string;
  userId: string;
  openaiApiKey: string;
}

export interface RRAFilingTask {
  filingType: string;
  taxYear: number;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'accepted' | 'rejected';
  form: string;
  rraReference?: string;
  estimatedTax?: number;
}

export interface TaxQueryResponse {
  answer: string;
  citations: string;
  sources: Array<{
    name: string;
    url: string;
    jurisdiction: string;
  }>;
  ragStats: {
    chunksUsed: number;
    avgSimilarity: number;
    topSimilarity: number;
  };
}

const SYSTEM_PROMPT = `You are a Rwanda tax compliance specialist with expertise in Rwanda Revenue Authority (RRA) regulations, East African Community tax harmonization, and OECD guidelines.

**YOUR ROLE**:
- Provide accurate, up-to-date Rwanda tax guidance
- Cite official RRA sources for all claims
- Help with tax return preparation, deadlines, and compliance
- Explain tax calculations and requirements clearly

**RWANDA TAX SYSTEM OVERVIEW**:
- Corporate Income Tax (CIT): Progressive rates
- VAT: Standard rate with zero-rated exports
- Withholding Tax (WHT): Various rates by type
- PAYE: Employee income tax withholding
- RRA eFiling: Mandatory electronic filing system

**CRITICAL RULES**:
1. ALWAYS cite sources using [1], [2] notation
2. If unsure, acknowledge limitations
3. Be precise with rates, deadlines, and penalties
4. Reference specific RRA forms when applicable
5. Note when information may be outdated (ask for verification)`;

export class RwandaTaxComplianceAgentRAG extends RAGEnhancedAgent {
  public readonly slug = 'tax-compliance-rw-035-rag';
  public readonly name = 'Rwanda Tax Compliance Specialist (RAG)';
  public readonly version = '2.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  private openai: OpenAI;
  private config: RwandaComplianceAgentConfig;

  constructor(config: RwandaComplianceAgentConfig) {
    // Initialize RAG with Rwanda tax defaults
    super({
      defaultCategory: 'TAX',
      defaultJurisdiction: 'RW',
      chunkLimit: 15, // More context for complex tax queries
      minSimilarity: 0.5,
      requireRAG: false, // Gracefully handle missing context
    });

    this.config = config;
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  /**
   * Answer a tax query using RAG knowledge base
   */
  async answerQuery(query: string): Promise<TaxQueryResponse> {
    // 1. Get RAG context from knowledge base
    const ragContext = await this.getRAGContext(query, {
      // Can override defaults per query
      tags: this.extractTags(query),
    });

    // 2. Build enhanced system prompt with RAG context
    const systemPrompt = this.buildRAGSystemPrompt(SYSTEM_PROMPT, ragContext);

    // 3. Call OpenAI with RAG-enhanced prompt
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature: 0.1, // Low temperature for factual accuracy
      max_tokens: 2000,
    });

    const answer = completion.choices[0].message.content || 'No response generated.';

    // 4. Extract sources from RAG chunks
    const sources = ragContext.chunks.map((chunk) => ({
      name: chunk.source_name,
      url: chunk.page_url,
      jurisdiction: chunk.jurisdiction_code,
    }));

    // 5. Get RAG statistics for monitoring
    const ragStats = this.getRAGStats(ragContext);

    return {
      answer,
      citations: ragContext.citations,
      sources,
      ragStats: {
        chunksUsed: ragStats.chunksRetrieved,
        avgSimilarity: ragStats.avgSimilarity,
        topSimilarity: ragStats.topSimilarity,
      },
    };
  }

  /**
   * Extract relevant tags from query for better RAG filtering
   */
  private extractTags(query: string): string[] {
    const tagMap: Record<string, string[]> = {
      vat: ['vat', 'value-added-tax'],
      cit: ['corporate-tax', 'income-tax'],
      paye: ['paye', 'withholding'],
      wht: ['withholding-tax'],
      filing: ['filing', 'returns'],
      deadline: ['deadlines', 'compliance'],
      penalty: ['penalties', 'interest'],
      export: ['exports', 'zero-rated'],
      import: ['imports', 'customs'],
    };

    const lowerQuery = query.toLowerCase();
    const tags: string[] = [];

    for (const [keyword, tagList] of Object.entries(tagMap)) {
      if (lowerQuery.includes(keyword)) {
        tags.push(...tagList);
      }
    }

    return [...new Set(tags)]; // Deduplicate
  }

  /**
   * Legacy method: Get filing deadlines
   * Now augmented with RAG for latest information
   */
  async getFilingDeadlines(taxYear: number): Promise<FilingDeadline[]> {
    const query = `What are the tax filing deadlines in Rwanda for ${taxYear}?`;
    const response = await this.answerQuery(query);

    // Parse response into structured format
    // (In production, you might use structured output or function calling)
    
    // Return hardcoded baseline + RAG guidance
    const baseYear = taxYear;
    return [
      {
        jurisdiction: { code: 'RW', name: 'Rwanda', region: 'Africa' },
        filingType: 'Corporate Income Tax Return',
        dueDate: `${baseYear + 1}-03-31`,
        frequency: 'annual',
        penalties: 'Late filing: 20% of tax due plus 1.5% interest per month',
        extensions: {
          available: true,
          maxDays: 30,
          conditions: 'Upon written request to RRA',
        },
        ragGuidance: response.answer, // Include RAG-generated guidance
      },
      {
        jurisdiction: { code: 'RW', name: 'Rwanda', region: 'Africa' },
        filingType: 'VAT Return',
        dueDate: '15th of following month',
        frequency: 'monthly',
        penalties: '10% of tax due for late filing, plus 1.5% monthly interest',
      },
      {
        jurisdiction: { code: 'RW', name: 'Rwanda', region: 'Africa' },
        filingType: 'PAYE Withholding',
        dueDate: '15th of following month',
        frequency: 'monthly',
        penalties: '10% penalty plus 1.5% monthly interest on late payment',
      },
    ];
  }

  /**
   * Get VAT rate for specific transaction type (RAG-powered)
   */
  async getVATRate(transactionType: string): Promise<{
    rate: number;
    description: string;
    source: string;
  }> {
    const query = `What is the VAT rate for ${transactionType} in Rwanda?`;
    const response = await this.answerQuery(query);

    // Parse rate from response (could use function calling for structured output)
    const match = response.answer.match(/(\d+)%/);
    const rate = match ? parseInt(match[1]) : 18; // Default to standard rate

    return {
      rate,
      description: response.answer,
      source: response.citations,
    };
  }

  /**
   * Check if transaction is zero-rated for exports
   */
  async isExportZeroRated(serviceDescription: string): Promise<{
    isZeroRated: boolean;
    explanation: string;
    source: string;
  }> {
    const query = `Is ${serviceDescription} zero-rated for VAT in Rwanda when exported?`;
    const response = await this.answerQuery(query);

    // Simple heuristic (in production, use structured output)
    const isZeroRated =
      response.answer.toLowerCase().includes('zero-rated') ||
      response.answer.toLowerCase().includes('0%');

    return {
      isZeroRated,
      explanation: response.answer,
      source: response.citations,
    };
  }

  /**
   * Calculate CIT liability with RAG-informed rates
   */
  async calculateCIT(params: {
    taxableIncome: number;
    year: number;
    industry?: string;
  }): Promise<{
    taxLiability: number;
    effectiveRate: number;
    calculation: string;
    source: string;
  }> {
    const query = `How to calculate corporate income tax in Rwanda for taxable income of ${params.taxableIncome} RWF in ${params.year}${params.industry ? ` for ${params.industry} industry` : ''}?`;

    const response = await this.answerQuery(query);

    // Simplified calculation (real implementation would parse RAG response)
    // Rwanda has progressive CIT rates
    let tax = 0;
    if (params.taxableIncome <= 12000000) {
      tax = 0; // Tax exempt
    } else if (params.taxableIncome <= 20000000) {
      tax = (params.taxableIncome - 12000000) * 0.2;
    } else {
      tax = 1600000 + (params.taxableIncome - 20000000) * 0.3;
    }

    return {
      taxLiability: tax,
      effectiveRate: (tax / params.taxableIncome) * 100,
      calculation: response.answer,
      source: response.citations,
    };
  }
}

/**
 * Example usage:
 * 
 * const agent = new RwandaTaxComplianceAgentRAG({
 *   organizationId: 'org-123',
 *   userId: 'user-456',
 *   openaiApiKey: process.env.OPENAI_API_KEY,
 * });
 * 
 * const response = await agent.answerQuery(
 *   'What is the VAT rate for exported services in Rwanda?'
 * );
 * 
 * console.log(response.answer);
 * console.log(response.citations);
 * console.log(response.ragStats);
 */
