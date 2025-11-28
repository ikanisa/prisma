/**
 * Canadian Corporate Tax Specialist Agent (tax-corp-ca-025)
 * 
 * Specialized AI agent for Canadian federal and provincial corporate tax
 * compliance, planning, and advisory services.
 * 
 * Jurisdiction Coverage: Federal + all provinces/territories
 * Expertise: Income Tax Act (ITA), provincial taxes, SR&ED, tax treaties
 * 
 * @module tax-corp-ca-025
 */

import type { TaxJurisdiction, TaxRate, ComplianceCheck, FilingDeadline } from '../types';

export interface CanadianCorporateTaxAgentConfig {
  organizationId: string;
  userId: string;
  agentId?: string;
  personaId?: string;
}

export interface CanadianTaxQuery {
  query: string;
  jurisdiction?: TaxJurisdiction;
  taxYear?: number;
  ccpcStatus?: boolean;  // Canadian-Controlled Private Corporation
  context?: Record<string, unknown>;
}

export interface CanadianTaxResponse {
  output: string;
  confidence: number;
  sources?: string[];
  warnings?: string[];
  recommendations?: string[];
}

/**
 * Canadian Corporate Tax Specialist Agent
 * 
 * Provides expert guidance on:
 * - Federal corporate income tax (ITA)
 * - Provincial/territorial corporate taxes
 * - Small business deduction (SBD)
 * - SR&ED tax incentives
 * - Capital Cost Allowance (CCA)
 * - Foreign tax credits
 * - Tax treaties
 * - GST/HST compliance
 */
export class CanadianCorporateTaxAgent {
  private config: CanadianCorporateTaxAgentConfig;
  
  public readonly slug = 'tax-corp-ca-025';
  public readonly name = 'Canadian Corporate Tax Specialist';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  private readonly provinces = [
    'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
  ];

  constructor(config: CanadianCorporateTaxAgentConfig) {
    this.config = config;
  }

  async execute(query: CanadianTaxQuery): Promise<CanadianTaxResponse> {
    const systemPrompt = this.buildSystemPrompt(query);
    const response = await this.executeWithOpenAI(systemPrompt, query.query);

    return {
      output: response,
      confidence: 0.95,
      sources: ['Income Tax Act (ITA)', 'CRA Guidance', 'Provincial Tax Acts'],
      warnings: this.generateWarnings(query),
      recommendations: [
        'File T2 return within 6 months of year-end',
        'Consider SR&ED credit opportunities',
        'Review CCPC status for small business deduction',
        'Monitor provincial rate changes'
      ]
    };
  }

  async getTaxRates(jurisdiction: TaxJurisdiction, isCCPC: boolean = false): Promise<TaxRate[]> {
    // Provincial rates (2024)
    const provincialRates: Record<string, number> = {
      'CA': 15,  // Federal general rate
      'AB': 8, 'BC': 12, 'MB': 12, 'NB': 14, 'NL': 15,
      'NS': 14, 'ON': 11.5, 'PE': 16, 'QC': 11.5, 'SK': 12
    };

    const ccpcSmallBusinessRates: Record<string, number> = {
      'CA': 9,  // Federal small business rate
      'AB': 2, 'BC': 2, 'MB': 0, 'NB': 2.5, 'NL': 3,
      'NS': 2.5, 'ON': 3.2, 'PE': 3, 'QC': 3.2, 'SK': 0
    };

    const rate = isCCPC 
      ? ccpcSmallBusinessRates[jurisdiction.code] || 9
      : provincialRates[jurisdiction.code] || 15;

    return [{
      jurisdiction,
      rateType: 'corporate',
      standardRate: rate,
      effectiveDate: '2024-01-01',
      source: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-tax-rates.html'
    }];
  }

  private buildSystemPrompt(query: CanadianTaxQuery): string {
    const year = query.taxYear || new Date().getFullYear();
    const ccpc = query.ccpcStatus ? 'CCPC' : 'non-CCPC';
    
    return `You are an expert Canadian Corporate Tax Specialist with deep knowledge of:

1. Federal Corporate Income Tax (ITA)
   - General corporate rate: 15% (after federal tax abatement)
   - Small business rate: 9% (for CCPCs on active business income up to $500,000)
   - Manufacturing & processing deduction
   - Federal tax abatement (10%)

2. Provincial/Territorial Corporate Taxes
   - Provincial rates range from 8% to 16%
   - Combined federal+provincial rates
   - Provincial small business deductions
   - Provincial tax credits and incentives

3. SR&ED (Scientific Research & Experimental Development)
   - Federal credit: 15% (non-refundable) or 35% (refundable for CCPCs)
   - Provincial SR&ED credits
   - Eligible expenditures
   - CRA review process

4. Capital Cost Allowance (CCA)
   - Accelerated Investment Incentive (AII)
   - Immediate expensing for eligible property
   - CCA classes and rates
   - Available-for-use rules

5. International Tax
   - Foreign tax credits
   - Foreign accrual property income (FAPI)
   - Transfer pricing
   - Tax treaties

6. CCPC-Specific Rules
   - Small business deduction
   - Refundable dividend tax on hand (RDTOH)
   - Integration rules
   - Passive income rules

Current context:
- Tax year: ${year}
- Corporation type: ${ccpc}
- ITA and provincial law as of ${year}

Always cite specific ITA sections and CRA guidance.`;
  }

  private async executeWithOpenAI(systemPrompt: string, userQuery: string): Promise<string> {
    return `[Canadian Corporate Tax Agent - OpenAI integration pending]\n\n${systemPrompt}\n\nQuery: ${userQuery}`;
  }

  private generateWarnings(query: CanadianTaxQuery): string[] {
    const warnings: string[] = [];
    
    if (!query.ccpcStatus) {
      warnings.push('CCPC status not specified - assuming non-CCPC for tax rate purposes.');
    }
    
    warnings.push('File T2 return within 6 months of fiscal year-end.');
    
    return warnings;
  }

  getCapabilities(): string[] {
    return [
      'Federal corporate income tax (ITA)',
      'Provincial/territorial corporate taxes',
      'Small business deduction for CCPCs',
      'SR&ED tax incentive program',
      'Capital Cost Allowance (CCA)',
      'Foreign tax credits',
      'Transfer pricing',
      'Tax treaty application',
      'GST/HST compliance'
    ];
  }

  getSupportedJurisdictions(): TaxJurisdiction[] {
    return [
      { code: 'CA', name: 'Canada (Federal)', region: 'North America' },
      ...this.provinces.map(code => ({
        code,
        name: this.getProvinceName(code),
        region: 'North America'
      }))
    ];
  }

  private getProvinceName(code: string): string {
    const names: Record<string, string> = {
      'AB': 'Alberta', 'BC': 'British Columbia', 'MB': 'Manitoba',
      'NB': 'New Brunswick', 'NL': 'Newfoundland and Labrador',
      'NS': 'Nova Scotia', 'NT': 'Northwest Territories', 'NU': 'Nunavut',
      'ON': 'Ontario', 'PE': 'Prince Edward Island', 'QC': 'Quebec',
      'SK': 'Saskatchewan', 'YT': 'Yukon'
    };
    return names[code] || code;
  }
}
