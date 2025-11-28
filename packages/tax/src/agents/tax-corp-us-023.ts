/**
 * US Corporate Tax Specialist Agent (tax-corp-us-023)
 * 
 * Specialized AI agent for United States federal and state corporate tax
 * compliance, planning, and advisory services.
 * 
 * Jurisdiction Coverage: Federal (IRC) + 50 states
 * Expertise: Federal corporate tax, state taxes, tax credits, international tax
 * 
 * @module tax-corp-us-023
 */

import type { 
  TaxJurisdiction, 
  TaxRate, 
  ComplianceCheck,
  FilingDeadline 
} from '../types';

export interface USCorporateTaxAgentConfig {
  organizationId: string;
  userId: string;
  agentId?: string;
  personaId?: string;
}

export interface USTaxQuery {
  query: string;
  jurisdiction?: TaxJurisdiction;
  taxYear?: number;
  entityType?: 'C-Corp' | 'S-Corp' | 'LLC' | 'Partnership';
  context?: Record<string, unknown>;
}

export interface USTaxResponse {
  output: string;
  confidence: number;
  sources?: string[];
  warnings?: string[];
  recommendations?: string[];
  relatedTopics?: string[];
}

/**
 * US Corporate Tax Specialist Agent
 * 
 * Provides expert guidance on:
 * - Federal corporate income tax (IRC)
 * - State corporate income taxes (all 50 states)
 * - Tax credits (R&D, foreign tax credits, etc.)
 * - International tax (GILTI, FDII, Subpart F)
 * - Tax reform (TCJA implementation)
 * - Consolidated returns
 * - Transfer pricing (US aspects)
 * - BEAT (Base Erosion Anti-Abuse Tax)
 * 
 * @example
 * ```typescript
 * const agent = new USCorporateTaxAgent({
 *   organizationId: 'org-123',
 *   userId: 'user-456'
 * });
 * 
 * const result = await agent.execute({
 *   query: 'What is the federal corporate tax rate for 2024?',
 *   entityType: 'C-Corp',
 *   taxYear: 2024
 * });
 * ```
 */
export class USCorporateTaxAgent {
  private config: USCorporateTaxAgentConfig;
  
  public readonly slug = 'tax-corp-us-023';
  public readonly name = 'US Corporate Tax Specialist';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';
  
  private readonly usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  constructor(config: USCorporateTaxAgentConfig) {
    this.config = config;
  }

  async execute(query: USTaxQuery): Promise<USTaxResponse> {
    if (query.jurisdiction && !this.isUSJurisdiction(query.jurisdiction)) {
      throw new Error(
        `Invalid jurisdiction: ${query.jurisdiction.code}. ` +
        `This agent handles US federal and state tax only.`
      );
    }

    const systemPrompt = this.buildSystemPrompt(query);
    const response = await this.executeWithOpenAI(systemPrompt, query.query);

    return {
      output: response,
      confidence: 0.95,
      sources: [
        'Internal Revenue Code (IRC)',
        'IRS Publications and Guidance',
        'State Department of Revenue Resources'
      ],
      warnings: this.generateWarnings(query),
      recommendations: this.generateRecommendations(query),
      relatedTopics: [
        'TCJA provisions',
        'State nexus considerations',
        'R&D tax credits',
        'International tax (GILTI/FDII)'
      ]
    };
  }

  async getTaxRates(jurisdiction: TaxJurisdiction): Promise<TaxRate[]> {
    if (!this.isUSJurisdiction(jurisdiction)) {
      throw new Error(`Not a US jurisdiction: ${jurisdiction.code}`);
    }

    // State corporate tax rates (2024)
    const stateRates: Record<string, number> = {
      'US': 21,  // Federal rate
      'AL': 6.5, 'AK': 9.4, 'AZ': 4.9, 'AR': 5.3, 'CA': 8.84,
      'CO': 4.55, 'CT': 7.5, 'DE': 8.7, 'FL': 5.5, 'GA': 5.75,
      'HI': 6.4, 'ID': 5.8, 'IL': 9.5, 'IN': 4.9, 'IA': 5.5,
      'KS': 4, 'KY': 4.5, 'LA': 7.5, 'ME': 8.93, 'MD': 8.25,
      'MA': 8, 'MI': 6, 'MN': 9.8, 'MS': 4.5, 'MO': 4,
      'MT': 6.75, 'NE': 5.58, 'NV': 0, 'NH': 7.5, 'NJ': 9,
      'NM': 5.9, 'NY': 6.5, 'NC': 2.5, 'ND': 4.31, 'OH': 0,
      'OK': 4, 'OR': 6.6, 'PA': 8.99, 'RI': 7, 'SC': 5,
      'SD': 0, 'TN': 6.5, 'TX': 0, 'UT': 4.85, 'VT': 8.5,
      'VA': 6, 'WA': 0, 'WV': 6.5, 'WI': 7.9, 'WY': 0
    };

    return [{
      jurisdiction,
      rateType: 'corporate',
      standardRate: stateRates[jurisdiction.code] || 0,
      effectiveDate: '2024-01-01',
      source: jurisdiction.code === 'US' 
        ? 'https://www.irs.gov/pub/irs-pdf/p542.pdf'
        : `https://www.taxadmin.org/state-tax-rates`
    }];
  }

  async checkTCJACompliance(
    companyData: Record<string, unknown>
  ): Promise<ComplianceCheck> {
    return {
      jurisdiction: { code: 'US', name: 'United States', region: 'North America' },
      complianceType: 'TCJA',
      status: 'review-required',
      issues: [
        {
          severity: 'high',
          description: 'Section 163(j) interest limitation requires review',
          recommendation: 'Calculate 30% EBITDA limitation on interest deductions'
        },
        {
          severity: 'medium',
          description: 'GILTI inclusion and Section 250 deduction calculation needed',
          recommendation: 'Review controlled foreign corporation income'
        },
        {
          severity: 'medium',
          description: 'BEAT applicability threshold check required',
          recommendation: 'Verify if average annual gross receipts exceed $500M'
        }
      ],
      lastChecked: new Date().toISOString()
    };
  }

  async getFilingDeadlines(
    jurisdiction: TaxJurisdiction,
    entityType: string = 'C-Corp'
  ): Promise<FilingDeadline[]> {
    const deadlines: FilingDeadline[] = [];

    if (jurisdiction.code === 'US') {
      // Federal deadlines
      const dueMonth = entityType === 'C-Corp' ? 4 : 3;
      const dueDay = entityType === 'C-Corp' ? 15 : 15;
      
      deadlines.push({
        jurisdiction,
        filingType: `Form 1120${entityType === 'S-Corp' ? 'S' : ''}`,
        dueDate: `${new Date().getFullYear()}-${dueMonth.toString().padStart(2, '0')}-${dueDay}`,
        frequency: 'annual',
        penalties: 'Failure to file: $205/month per shareholder (S-Corp) or $205/month (C-Corp)',
        extensions: {
          available: true,
          maxDays: 180,
          conditions: 'File Form 7004 by original due date'
        }
      });
    }

    return deadlines;
  }

  private isUSJurisdiction(jurisdiction: TaxJurisdiction): boolean {
    return jurisdiction.code === 'US' || this.usStates.includes(jurisdiction.code);
  }

  private buildSystemPrompt(query: USTaxQuery): string {
    const year = query.taxYear || new Date().getFullYear();
    const entity = query.entityType || 'C-Corp';
    const jurisdiction = query.jurisdiction 
      ? query.jurisdiction.code === 'US' ? 'federal' : `${query.jurisdiction.name} state`
      : 'federal and state';

    return `You are an expert US Corporate Tax Specialist with deep knowledge of:

1. Federal Corporate Income Tax (IRC)
   - Current 21% flat rate (post-TCJA)
   - Alternative minimum tax (repealed for corporations)
   - Tax credits (R&D, foreign tax credits, energy credits)
   - Net operating losses (80% limitation)

2. Tax Cuts and Jobs Act (TCJA) Provisions
   - Section 163(j) interest limitation
   - Section 250 FDII/GILTI deductions
   - BEAT (Base Erosion Anti-Abuse Tax)
   - Section 174 R&D capitalization (post-2021)
   - 100% bonus depreciation (phasing out)

3. International Tax
   - GILTI (Global Intangible Low-Taxed Income)
   - FDII (Foreign-Derived Intangible Income)
   - Subpart F income
   - Section 965 transition tax
   - Transfer pricing

4. State Corporate Income Taxes (all 50 states)
   - Apportionment formulas
   - Nexus requirements (economic and physical)
   - State tax credits and incentives
   - Combined/consolidated returns

5. Entity-Specific Rules
   - C-Corporation taxation
   - S-Corporation pass-through
   - LLC classification elections
   - Consolidated returns (Section 1501-1505)

Current context:
- Tax year: ${year}
- Entity type: ${entity}
- Jurisdiction: ${jurisdiction}
- Tax law as of ${year}

Provide accurate, actionable tax guidance. Always:
- Cite specific IRC sections
- Note TCJA changes and effective dates
- Consider state tax implications
- Address international tax when relevant
- Reference IRS guidance and regulations

Be precise with rates, credits, and filing requirements.`;
  }

  private async executeWithOpenAI(
    systemPrompt: string, 
    userQuery: string
  ): Promise<string> {
    return `[Agent Response - OpenAI integration pending]

Based on your US corporate tax query, here's the guidance:

The response would include:
1. Direct answer citing IRC sections
2. Federal and applicable state tax rates
3. TCJA implications
4. Available tax credits
5. Filing requirements and deadlines
6. International tax considerations (if applicable)

System Prompt: ${systemPrompt}
User Query: ${userQuery}

Note: Full OpenAI integration coming in next phase.`;
  }

  private generateWarnings(query: USTaxQuery): string[] {
    const warnings: string[] = [];
    
    if (!query.taxYear) {
      warnings.push('No tax year specified - using current year.');
    }
    
    if (!query.entityType) {
      warnings.push('Entity type not specified - assuming C-Corporation.');
    }

    if (query.taxYear && query.taxYear >= 2022) {
      warnings.push('Section 174 R&D capitalization applies (effective 2022+).');
    }

    if (query.taxYear && query.taxYear >= 2023) {
      warnings.push('Bonus depreciation reduced to 80% for property placed in service in 2023.');
    }

    return warnings;
  }

  private generateRecommendations(query: USTaxQuery): string[] {
    return [
      'Consult with qualified CPA or tax attorney for specific situations',
      'Review state nexus in all jurisdictions where business operates',
      'Consider R&D tax credit opportunities',
      'Evaluate international tax provisions (GILTI/FDII) if applicable',
      'Monitor IRS guidance on TCJA implementation',
      'Document transfer pricing policies'
    ];
  }

  getCapabilities(): string[] {
    return [
      'Federal corporate income tax (IRC)',
      'State corporate taxes (all 50 states)',
      'TCJA compliance and planning',
      'International tax (GILTI, FDII, Subpart F)',
      'Tax credits (R&D, foreign, energy)',
      'Transfer pricing (US aspects)',
      'BEAT analysis and planning',
      'Consolidated return rules',
      'State nexus analysis',
      'Entity classification planning'
    ];
  }

  getSupportedJurisdictions(): TaxJurisdiction[] {
    return [
      { code: 'US', name: 'United States (Federal)', region: 'North America' },
      ...this.usStates.map(code => ({
        code,
        name: this.getStateName(code),
        region: 'North America'
      }))
    ];
  }

  private getStateName(code: string): string {
    const names: Record<string, string> = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
      'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
      'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
      'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
      'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
      'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
      'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
      'WI': 'Wisconsin', 'WY': 'Wyoming'
    };
    return names[code] || code;
  }
}
