/**
 * Audit Planning Specialist (RAG-Enhanced)
 * ISA 300 - Planning an Audit of Financial Statements
 * ISA 315 - Identifying and Assessing RoMM
 * ISA 320 - Materiality in Planning and Performing an Audit
 * 
 * Augmented with RAG knowledge base for IFRS, ISA, and audit guidance.
 */

import type {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  AuditContext,
  MaterialityCalculation,
  RiskAssessment,
  AuditProcedure,
} from '../types';
import { RAGEnhancedAgent, type RAGContext } from '@prisma-glow/core';
import OpenAI from 'openai';

export const PLANNING_AGENT_CONFIG: AgentConfig = {
  id: 'audit-plan-012-rag',
  name: 'Audit Planning Specialist (RAG)',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description:
    'Develops ISA-compliant audit plans using verified IFRS/ISA knowledge base',
  version: '2.0.0',
};

const SYSTEM_PROMPT = `You are an Audit Planning Specialist with expertise in ISA-compliant audit planning and risk assessment.

PLANNING FRAMEWORK (ISA 300):
1. PRELIMINARY ACTIVITIES
   - Engagement acceptance/continuance
   - Scope determination
   - Team composition
   - Independence confirmation

2. RISK ASSESSMENT (ISA 315)
   - Understanding the entity and environment
   - Internal control evaluation
   - Significant risk identification
   - Risk of material misstatement (RMM)

3. MATERIALITY (ISA 320)
   - Overall materiality calculation
   - Performance materiality
   - Specific materiality thresholds
   - Trivial threshold

4. AUDIT STRATEGY
   - Nature, timing, extent of procedures
   - Resource allocation
   - Timeline development
   - Specialist needs assessment

KEY OUTPUTS:
- Audit strategy memorandum
- Materiality calculations with rationale
- Risk assessment matrix
- Detailed audit program
- Resource allocation plan`;

export interface PlanningRequest extends AgentRequest {
  task:
    | 'calculate_materiality'
    | 'assess_risks'
    | 'develop_strategy'
    | 'create_audit_program';
  parameters: {
    financialData?: {
      revenue?: number;
      assets?: number;
      equity?: number;
      profitBeforeTax?: number;
    };
    riskFactors?: {
      industry?: string;
      firstYear?: boolean;
      significantChanges?: string[];
      regulatedEntity?: boolean;
    };
    auditScope?: {
      entityName?: string;
      yearEnd?: string;
      standards?: string[]; // IFRS, US GAAP, etc.
    };
  };
}

export interface PlanningResponse extends AgentResponse {
  materialityCalculation?: MaterialityCalculation;
  riskAssessment?: RiskAssessment;
  auditStrategy?: string;
  auditProgram?: AuditProcedure[];
  ragGuidance?: {
    relevantStandards: string[];
    citations: string;
    confidence: number;
  };
}

export class AuditPlanningAgentRAG extends RAGEnhancedAgent {
  private openai: OpenAI;

  constructor(openaiApiKey: string) {
    // Initialize RAG with IFRS/ISA defaults
    super({
      defaultCategory: 'IFRS', // Or 'ISA' or 'AUDIT'
      defaultJurisdiction: 'GLOBAL',
      chunkLimit: 20, // More context for complex audit standards
      minSimilarity: 0.6, // Higher threshold for audit standards
      requireRAG: false,
    });

    this.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  /**
   * Calculate materiality with RAG-informed guidance
   */
  async calculateMateriality(
    request: PlanningRequest
  ): Promise<MaterialityCalculation & { ragGuidance: string; citations: string }> {
    const { financialData, riskFactors, auditScope } = request.parameters;

    // Build query for RAG
    const query = `How should I calculate overall materiality for an audit of ${auditScope?.entityName || 'an entity'} in the ${riskFactors?.industry || 'general'} industry? Revenue: ${financialData?.revenue}, Assets: ${financialData?.assets}`;

    // Get RAG context from IFRS/ISA knowledge base
    const ragContext = await this.getRAGContext(query, {
      category: 'IFRS', // or 'ISA' depending on your taxonomy
      tags: ['materiality', 'isa-320', 'audit-planning'],
    });

    // Build enhanced prompt
    const systemPrompt = this.buildRAGSystemPrompt(SYSTEM_PROMPT, ragContext);

    // Call OpenAI for materiality calculation guidance
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Calculate overall materiality and performance materiality. Provide:
1. Benchmark selection rationale
2. Percentage to apply
3. Overall materiality amount
4. Performance materiality (typically 50-75% of overall)
5. Trivial threshold (typically 3-5% of overall)

Financial data:
${JSON.stringify(financialData, null, 2)}

Risk factors:
${JSON.stringify(riskFactors, null, 2)}`,
        },
      ],
      temperature: 0.2,
    });

    // Parse response (simplified - in production, use function calling)
    const guidance = completion.choices[0].message.content || '';

    // Calculate materiality (simplified logic)
    const benchmark = financialData?.revenue || financialData?.assets || 0;
    const percentageRate = riskFactors?.firstYear ? 0.003 : 0.005; // Lower % for first year
    const overallMateriality = benchmark * percentageRate;
    const performanceMateriality = overallMateriality * 0.75;
    const trivialThreshold = overallMateriality * 0.05;

    return {
      overallMateriality,
      performanceMateriality,
      trivialThreshold,
      benchmark: financialData?.revenue ? 'Revenue' : 'Total Assets',
      benchmarkAmount: benchmark,
      percentageApplied: percentageRate * 100,
      rationale: guidance,
      ragGuidance: guidance,
      citations: ragContext.citations,
    };
  }

  /**
   * Assess audit risks with RAG guidance
   */
  async assessRisks(request: PlanningRequest): Promise<RiskAssessment> {
    const { riskFactors, auditScope } = request.parameters;

    const query = `What are the key audit risks for a ${riskFactors?.industry || 'general'} company${riskFactors?.firstYear ? ' in a first-year audit' : ''}? ${riskFactors?.significantChanges ? `Recent changes: ${riskFactors.significantChanges.join(', ')}` : ''}`;

    const ragContext = await this.getRAGContext(query, {
      category: 'IFRS',
      tags: ['risk-assessment', 'isa-315', 'audit-risks'],
    });

    const systemPrompt = this.buildRAGSystemPrompt(SYSTEM_PROMPT, ragContext);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Identify and assess audit risks. For each risk provide:
1. Risk description
2. Likelihood (Low/Medium/High)
3. Impact (Low/Medium/High)
4. Whether it's a "significant risk" per ISA 315
5. Recommended audit response

Risk factors:
${JSON.stringify(riskFactors, null, 2)}

Audit scope:
${JSON.stringify(auditScope, null, 2)}`,
        },
      ],
      temperature: 0.3,
    });

    const guidance = completion.choices[0].message.content || '';

    // Return structured risk assessment
    // (Simplified - in production, parse structured output)
    return {
      significantRisks: [],
      otherRisks: [],
      controlReliance: 'Limited',
      ragGuidance: guidance,
      citations: ragContext.citations,
      relevantStandards: [...new Set(ragContext.chunks.map((c: any) => c.source_name as string))],
    } as any;
  }

  /**
   * Develop audit strategy with RAG guidance
   */
  async developStrategy(request: PlanningRequest): Promise<{
    strategy: string;
    timeline: string[];
    resourceAllocation: string;
    citations: string;
  }> {
    const { financialData, riskFactors, auditScope } = request.parameters;

    const query = `What should be the audit strategy for ${auditScope?.entityName || 'an entity'} considering ${riskFactors?.industry || 'general'} industry risks?`;

    const ragContext = await this.getRAGContext(query, {
      category: 'IFRS',
      tags: ['audit-strategy', 'isa-300', 'audit-planning'],
    });

    const systemPrompt = this.buildRAGSystemPrompt(SYSTEM_PROMPT, ragContext);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Develop a comprehensive audit strategy including:
1. Overall approach (substantive vs. combined)
2. Timeline and key milestones
3. Resource allocation (team size, specialists needed)
4. Critical areas requiring emphasis
5. Preliminary analytical procedures

Context:
${JSON.stringify({ financialData, riskFactors, auditScope }, null, 2)}`,
        },
      ],
      temperature: 0.3,
    });

    const strategy = completion.choices[0].message.content || '';

    return {
      strategy,
      timeline: [
        'Planning: Weeks 1-2',
        'Interim testing: Weeks 3-6',
        'Year-end procedures: Weeks 7-10',
        'Completion & reporting: Weeks 11-12',
      ],
      resourceAllocation: 'See strategy document',
      citations: ragContext.citations,
    };
  }

  /**
   * Create detailed audit program with RAG guidance
   */
  async createAuditProgram(request: PlanningRequest): Promise<{
    procedures: AuditProcedure[];
    citations: string;
    relevantStandards: string[];
  }> {
    const { financialData, riskFactors, auditScope } = request.parameters;

    const query = `What audit procedures should be performed for ${auditScope?.entityName || 'an entity'} in the ${riskFactors?.industry || 'general'} industry?`;

    const ragContext = await this.getRAGContext(query, {
      category: 'IFRS',
      tags: ['audit-procedures', 'substantive-testing', 'controls-testing'],
      limit: 25, // More detailed procedures need more context
    });

    const systemPrompt = this.buildRAGSystemPrompt(SYSTEM_PROMPT, ragContext);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Create a detailed audit program with specific procedures for:
1. Revenue recognition
2. Inventory (if applicable)
3. Property, plant & equipment
4. Accounts receivable
5. Related party transactions
6. Going concern assessment

For each area, specify:
- Procedure description
- Timing (interim vs. year-end)
- Sample size/scope
- ISA reference

Industry: ${riskFactors?.industry || 'General'}`,
        },
      ],
      temperature: 0.2,
    });

    const programGuidance = completion.choices[0].message.content || '';

    // Return structured audit program
    // (Simplified - parse programGuidance in production)
    return {
      procedures: [],
      citations: ragContext.citations,
      relevantStandards: [...new Set(ragContext.chunks.map((c) => c.source_name))],
    };
  }
}

/**
 * Example usage:
 * 
 * const agent = new AuditPlanningAgentRAG(process.env.OPENAI_API_KEY);
 * 
 * const materiality = await agent.calculateMateriality({
 *   task: 'calculate_materiality',
 *   parameters: {
 *     financialData: {
 *       revenue: 50000000,
 *       assets: 75000000,
 *       profitBeforeTax: 5000000,
 *     },
 *     riskFactors: {
 *       industry: 'Manufacturing',
 *       firstYear: false,
 *     },
 *     auditScope: {
 *       entityName: 'Acme Corp',
 *       yearEnd: '2024-12-31',
 *       standards: ['IFRS'],
 *     },
 *   },
 * });
 * 
 * console.log(materiality.overallMateriality);
 * console.log(materiality.ragGuidance);
 * console.log(materiality.citations);
 */
