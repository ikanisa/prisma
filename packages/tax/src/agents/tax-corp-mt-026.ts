/**
 * Malta Corporate Tax Specialist Agent (tax-corp-mt-026)
 * 
 * Specialized AI agent for Malta corporate tax compliance and advisory.
 * 
 * Jurisdiction: Malta (EU member state)
 * Expertise: Malta tax system, EU directives, notional interest deduction
 */

import type { TaxJurisdiction, TaxRate } from '../types';

export interface MaltaCorporateTaxAgentConfig {
  organizationId: string;
  userId: string;
}

export class MaltaCorporateTaxAgent {
  public readonly slug = 'tax-corp-mt-026';
  public readonly name = 'Malta Corporate Tax Specialist';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  constructor(private config: MaltaCorporateTaxAgentConfig) {}

  async getTaxRates(): Promise<TaxRate[]> {
    return [{
      jurisdiction: { code: 'MT', name: 'Malta', region: 'EU' },
      rateType: 'corporate',
      standardRate: 35,
      reducedRates: [
        { rate: 5, description: 'Effective rate with full imputation system', conditions: ['After shareholder refunds'] }
      ],
      effectiveDate: '2024-01-01',
      source: 'https://cfr.gov.mt/en/inlandrevenue/taxinfo/Pages/Tax-Information.aspx'
    }];
  }

  getCapabilities(): string[] {
    return [
      'Malta corporate tax (35% statutory, 5% effective)',
      'Full imputation system and refunds',
      'Notional interest deduction',
      'Participation exemption',
      'EU directives compliance',
      'Tax residency and domicile rules',
      'Transfer pricing',
      'Treaty benefits'
    ];
  }
}
