/**
 * UK Corporate Tax Specialist Agent (tax-corp-uk-024)
 * 
 * Specialized AI agent for United Kingdom corporation tax compliance,
 * planning, and advisory services.
 * 
 * Jurisdiction Coverage: UK (England, Scotland, Wales, Northern Ireland)
 * Expertise: Corporation Tax, CT600, R&D tax credits, capital allowances
 * 
 * @module tax-corp-uk-024
 */

import type { TaxJurisdiction, TaxRate, ComplianceCheck, FilingDeadline } from '../types';

export interface UKCorporateTaxAgentConfig {
  organizationId: string;
  userId: string;
  agentId?: string;
  personaId?: string;
}

export interface UKTaxQuery {
  query: string;
  accountingPeriod?: string;
  taxYear?: number;
  context?: Record<string, unknown>;
}

export interface UKTaxResponse {
  output: string;
  confidence: number;
  sources?: string[];
  warnings?: string[];
  recommendations?: string[];
}

/**
 * UK Corporate Tax Specialist Agent
 * 
 * Provides expert guidance on:
 * - Corporation Tax (19-25% main rate)
 * - CT600 return filing
 * - R&D tax credits (SME and RDEC schemes)
 * - Capital allowances (AIA, FYA, writing down allowances)
 * - Patent Box regime
 * - Diverted Profits Tax
 * - Intangible fixed assets regime
 * - Controlled Foreign Company (CFC) rules
 */
export class UKCorporateTaxAgent {
  private config: UKCorporateTaxAgentConfig;
  
  public readonly slug = 'tax-corp-uk-024';
  public readonly name = 'UK Corporate Tax Specialist';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  constructor(config: UKCorporateTaxAgentConfig) {
    this.config = config;
  }

  async execute(query: UKTaxQuery): Promise<UKTaxResponse> {
    const systemPrompt = this.buildSystemPrompt(query);
    const response = await this.executeWithOpenAI(systemPrompt, query.query);

    return {
      output: response,
      confidence: 0.95,
      sources: ['HMRC Guidance', 'Corporation Tax Act 2009/2010', 'Finance Acts'],
      warnings: this.generateWarnings(query),
      recommendations: [
        'File CT600 within 12 months of accounting period end',
        'Consider R&D tax credit eligibility',
        'Review capital allowances claims',
        'Monitor Making Tax Digital requirements'
      ]
    };
  }

  async getTaxRates(taxYear: number = new Date().getFullYear()): Promise<TaxRate[]> {
    // UK tax rates post-April 2023
    const mainRate = taxYear >= 2023 ? 25 : 19;
    const smallProfitsRate = 19;
    
    return [{
      jurisdiction: { code: 'GB', name: 'United Kingdom', region: 'Europe' },
      rateType: 'corporate',
      standardRate: mainRate,
      reducedRates: [{
        rate: smallProfitsRate,
        description: 'Small profits rate',
        conditions: ['Profits £50,000 or less']
      }],
      effectiveDate: `${taxYear}-04-01`,
      source: 'https://www.gov.uk/government/publications/corporation-tax-rates-and-reliefs'
    }];
  }

  private buildSystemPrompt(query: UKTaxQuery): string {
    const year = query.taxYear || new Date().getFullYear();
    
    return `You are an expert UK Corporation Tax Specialist with deep knowledge of:

1. Corporation Tax
   - Main rate: 25% (for profits over £250,000)
   - Small profits rate: 19% (profits up to £50,000)
   - Marginal relief (profits £50,000-£250,000)
   - CT600 return filing

2. R&D Tax Credits
   - SME scheme (up to 230% deduction or 10% credit for loss-making)
   - RDEC scheme (20% credit above the line)
   - Qualifying expenditure categories
   - HMRC compliance and enquiries

3. Capital Allowances
   - Annual Investment Allowance (AIA) - currently £1 million
   - Full expensing for main rate assets (130%)
   - 50% first-year allowance for special rate assets
   - Writing down allowances (18% main, 6% special rate)

4. Other Reliefs
   - Patent Box (10% effective rate on qualifying IP)
   - Creative industries tax reliefs
   - Land remediation relief
   - Intangible fixed assets regime

5. Anti-Avoidance
   - Diverted Profits Tax (25%)
   - Transfer pricing rules
   - CFC (Controlled Foreign Company) rules
   - GAAR (General Anti-Abuse Rule)

Current context:
- Tax year: ${year}/${year + 1}
- UK tax law as of ${year}
- Finance Act ${year} provisions

Always cite relevant legislation and HMRC guidance.`;
  }

  private async executeWithOpenAI(systemPrompt: string, userQuery: string): Promise<string> {
    return `[UK Corporate Tax Agent - OpenAI integration pending]\n\n${systemPrompt}\n\nQuery: ${userQuery}`;
  }

  private generateWarnings(query: UKTaxQuery): string[] {
    const warnings: string[] = [];
    const year = query.taxYear || new Date().getFullYear();
    
    if (year >= 2023) {
      warnings.push('Main corporation tax rate is 25% for profits over £250,000.');
    }
    
    warnings.push('Ensure CT600 filed within 12 months of period end.');
    
    return warnings;
  }

  getCapabilities(): string[] {
    return [
      'Corporation Tax compliance',
      'CT600 return preparation',
      'R&D tax credits (SME and RDEC)',
      'Capital allowances optimization',
      'Patent Box planning',
      'Transfer pricing',
      'CFC rules application',
      'Making Tax Digital compliance'
    ];
  }
}
