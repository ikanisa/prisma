/**
 * Agent Testing Framework
 * 
 * Automated testing for agent accuracy, RAG quality, and response consistency.
 * Uses golden test sets to validate agent improvements over time.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export interface TestCase {
  id: string;
  category: string;
  jurisdiction: string;
  query: string;
  expectedKeywords: string[];
  expectedSources?: string[];
  minSimilarityScore?: number;
  expectedConfidenceMin?: number;
  tags: string[];
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualResponse: string;
  actualSources: string[];
  actualSimilarity: number;
  actualConfidence: number;
  matchedKeywords: string[];
  missedKeywords: string[];
  errors: string[];
  durationMs: number;
  timestamp: string;
}

export interface TestSuite {
  name: string;
  description: string;
  agentId: string;
  testCases: TestCase[];
}

/**
 * Agent Test Runner
 */
export class AgentTestRunner {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor(supabaseUrl: string, supabaseKey: string, openaiKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  /**
   * Run a test suite against an agent
   */
  async runTestSuite(suite: TestSuite, agent: any): Promise<{
    suiteName: string;
    totalTests: number;
    passed: number;
    failed: number;
    passRate: number;
    results: TestResult[];
  }> {
    const results: TestResult[] = [];

    for (const testCase of suite.testCases) {
      const result = await this.runTestCase(testCase, agent);
      results.push(result);
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    // Store results in database
    await this.storeTestResults(suite.name, suite.agentId, results);

    return {
      suiteName: suite.name,
      totalTests: results.length,
      passed,
      failed,
      passRate: (passed / results.length) * 100,
      results,
    };
  }

  /**
   * Run a single test case
   */
  async runTestCase(testCase: TestCase, agent: any): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let passed = true;

    try {
      // Execute agent query
      const response = await agent.answerQuery(testCase.query);

      // Check expected keywords
      const matchedKeywords: string[] = [];
      const missedKeywords: string[] = [];

      for (const keyword of testCase.expectedKeywords) {
        if (response.answer.toLowerCase().includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
        } else {
          missedKeywords.push(keyword);
          passed = false;
          errors.push(`Missing expected keyword: ${keyword}`);
        }
      }

      // Check similarity score
      if (
        testCase.minSimilarityScore &&
        response.ragStats.topSimilarity < testCase.minSimilarityScore
      ) {
        passed = false;
        errors.push(
          `Low similarity: ${response.ragStats.topSimilarity} < ${testCase.minSimilarityScore}`
        );
      }

      // Check expected sources
      if (testCase.expectedSources && testCase.expectedSources.length > 0) {
        const actualSourceUrls = response.sources.map((s: any) => s.url);
        for (const expectedSource of testCase.expectedSources) {
          if (!actualSourceUrls.some((url: string) => url.includes(expectedSource))) {
            passed = false;
            errors.push(`Missing expected source: ${expectedSource}`);
          }
        }
      }

      // Check confidence
      if (testCase.expectedConfidenceMin && response.ragStats.avgSimilarity < testCase.expectedConfidenceMin) {
        passed = false;
        errors.push(`Low confidence: ${response.ragStats.avgSimilarity}`);
      }

      return {
        testCaseId: testCase.id,
        passed,
        actualResponse: response.answer,
        actualSources: response.sources.map((s: any) => s.url),
        actualSimilarity: response.ragStats.topSimilarity,
        actualConfidence: response.ragStats.avgSimilarity,
        matchedKeywords,
        missedKeywords,
        errors,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        testCaseId: testCase.id,
        passed: false,
        actualResponse: '',
        actualSources: [],
        actualSimilarity: 0,
        actualConfidence: 0,
        matchedKeywords: [],
        missedKeywords: testCase.expectedKeywords,
        errors: [error.message],
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Store test results in database
   */
  async storeTestResults(
    suiteName: string,
    agentId: string,
    results: TestResult[]
  ): Promise<void> {
    const { error } = await this.supabase.from('agent_test_runs').insert({
      suite_name: suiteName,
      agent_id: agentId,
      total_tests: results.length,
      passed_tests: results.filter((r) => r.passed).length,
      failed_tests: results.filter((r) => !r.passed).length,
      pass_rate: (results.filter((r) => r.passed).length / results.length) * 100,
      results_json: results,
      run_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to store test results:', error);
    }
  }

  /**
   * Generate test cases from high-rated queries
   */
  async generateTestCasesFromFeedback(limit = 20): Promise<TestCase[]> {
    const { data: highRatedQueries } = await this.supabase
      .from('agent_execution_logs')
      .select(`
        *,
        feedback:agent_feedback(rating, was_helpful),
        rag:agent_rag_usage(*)
      `)
      .gte('feedback.rating', 4)
      .eq('status', 'success')
      .limit(limit);

    if (!highRatedQueries || highRatedQueries.length === 0) return [];

    const testCases: TestCase[] = [];

    for (const query of highRatedQueries) {
      // Extract keywords from successful response
      const keywords = await this.extractKeywords(query.user_query);

      testCases.push({
        id: `test-${query.id}`,
        category: query.agent_category,
        jurisdiction: query.rag?.search_jurisdiction || 'GLOBAL',
        query: query.user_query,
        expectedKeywords: keywords,
        minSimilarityScore: query.rag?.top_similarity * 0.9, // 90% of actual
        expectedConfidenceMin: query.confidence_score * 0.9,
        tags: query.rag?.search_tags || [],
      });
    }

    return testCases;
  }

  /**
   * Extract keywords from a query using GPT
   */
  private async extractKeywords(query: string): Promise<string[]> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content:
            'Extract 3-5 key terms or concepts that should appear in a good answer to this query. Return as a comma-separated list.',
        },
        { role: 'user', content: query },
      ],
      temperature: 0.3,
    });

    const keywords = completion.choices[0].message.content || '';
    return keywords.split(',').map((k) => k.trim());
  }

  /**
   * Compare test runs to track improvements
   */
  async compareTestRuns(
    agentId: string,
    suiteName: string,
    days = 7
  ): Promise<{
    current: any;
    previous: any;
    improvement: number;
    regressions: string[];
  }> {
    const { data: runs } = await this.supabase
      .from('agent_test_runs')
      .select('*')
      .eq('agent_id', agentId)
      .eq('suite_name', suiteName)
      .gte('run_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('run_at', { ascending: false })
      .limit(2);

    if (!runs || runs.length < 2) {
      return {
        current: runs?.[0] || null,
        previous: null,
        improvement: 0,
        regressions: [],
      };
    }

    const current = runs[0];
    const previous = runs[1];

    const improvement = current.pass_rate - previous.pass_rate;

    // Find regressions (tests that passed before but fail now)
    const regressions: string[] = [];
    const currentResults = current.results_json as TestResult[];
    const previousResults = previous.results_json as TestResult[];

    for (const prevResult of previousResults) {
      const currResult = currentResults.find((r) => r.testCaseId === prevResult.testCaseId);
      if (currResult && !currResult.passed && prevResult.passed) {
        regressions.push(prevResult.testCaseId);
      }
    }

    return {
      current,
      previous,
      improvement,
      regressions,
    };
  }
}

/**
 * Example test suites
 */
export const RWANDA_TAX_TEST_SUITE: TestSuite = {
  name: 'Rwanda Tax Agent - Core Queries',
  description: 'Validates Rwanda tax agent accuracy on common queries',
  agentId: 'tax-compliance-rw-035-rag',
  testCases: [
    {
      id: 'rw-vat-rate',
      category: 'TAX',
      jurisdiction: 'RW',
      query: 'What is the standard VAT rate in Rwanda?',
      expectedKeywords: ['18%', 'VAT', 'Rwanda'],
      minSimilarityScore: 0.7,
      tags: ['vat', 'rate'],
    },
    {
      id: 'rw-vat-export',
      category: 'TAX',
      jurisdiction: 'RW',
      query: 'Are exported services zero-rated for VAT in Rwanda?',
      expectedKeywords: ['zero-rated', 'export', '0%'],
      expectedSources: ['rra.gov.rw'],
      minSimilarityScore: 0.65,
      tags: ['vat', 'export', 'zero-rated'],
    },
    {
      id: 'rw-cit-rate',
      category: 'TAX',
      jurisdiction: 'RW',
      query: 'What is the corporate income tax rate in Rwanda?',
      expectedKeywords: ['30%', 'corporate', 'income tax'],
      minSimilarityScore: 0.7,
      tags: ['cit', 'rate'],
    },
    {
      id: 'rw-filing-deadline',
      category: 'TAX',
      jurisdiction: 'RW',
      query: 'When is the corporate tax return filing deadline in Rwanda?',
      expectedKeywords: ['March 31', 'deadline', 'filing'],
      minSimilarityScore: 0.65,
      tags: ['filing', 'deadline'],
    },
  ],
};

export const AUDIT_PLANNING_TEST_SUITE: TestSuite = {
  name: 'Audit Planning - ISA Compliance',
  description: 'Validates audit planning agent ISA knowledge',
  agentId: 'audit-plan-012-rag',
  testCases: [
    {
      id: 'isa-320-materiality',
      category: 'IFRS',
      jurisdiction: 'GLOBAL',
      query: 'How to calculate overall materiality per ISA 320?',
      expectedKeywords: ['ISA 320', 'materiality', 'benchmark', 'percentage'],
      minSimilarityScore: 0.7,
      tags: ['isa-320', 'materiality'],
    },
    {
      id: 'isa-315-risk',
      category: 'IFRS',
      jurisdiction: 'GLOBAL',
      query: 'What is risk of material misstatement per ISA 315?',
      expectedKeywords: ['ISA 315', 'risk', 'material misstatement', 'RMM'],
      minSimilarityScore: 0.7,
      tags: ['isa-315', 'risk'],
    },
  ],
};

/**
 * Example usage:
 * 
 * import { AgentTestRunner, RWANDA_TAX_TEST_SUITE } from '@prisma-glow/lib';
 * import { RwandaTaxComplianceAgentRAG } from '@prisma-glow/tax';
 * 
 * const runner = new AgentTestRunner(
 *   process.env.SUPABASE_URL!,
 *   process.env.SUPABASE_SERVICE_ROLE_KEY!,
 *   process.env.OPENAI_API_KEY!
 * );
 * 
 * const agent = new RwandaTaxComplianceAgentRAG({...});
 * 
 * const results = await runner.runTestSuite(RWANDA_TAX_TEST_SUITE, agent);
 * console.log(`Pass rate: ${results.passRate}%`);
 */
