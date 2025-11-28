/**
 * Rwanda Corporate Tax Specialist Agent (tax-corp-rw-027)
 * 
 * Specialized AI agent for Rwanda corporate tax compliance and advisory.
 * 
 * Jurisdiction: Rwanda (East African Community)
 * Expertise: Rwanda tax law, EAC integration, incentives
 */

import type { TaxJurisdiction, TaxRate } from '../types';

export interface RwandaCorporateTaxAgentConfig {
  organizationId: string;
  userId: string;
}

export class RwandaCorporateTaxAgent {
  public readonly slug = 'tax-corp-rw-027';
  public readonly name = 'Rwanda Corporate Tax Specialist';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  constructor(private config: RwandaCorporateTaxAgentConfig) {}

  async getTaxRates(): Promise<TaxRate[]> {
    return [{
      jurisdiction: { code: 'RW', name: 'Rwanda', region: 'Africa' },
      rateType: 'corporate',
      standardRate: 30,
      reducedRates: [
        { rate: 15, description: 'Manufacturing companies', conditions: ['First 5 years'] },
        { rate: 0, description: 'Export-oriented companies', conditions: ['First 7 years in SEZ'] }
      ],
      effectiveDate: '2024-01-01',
      source: 'https://www.rra.gov.rw/en/taxes-levies/corporate-income-tax'
    }];
  }

  getCapabilities(): string[] {
    return [
      'Rwanda corporate income tax',
      'Special Economic Zone (SEZ) incentives',
      'Investment tax credits',
      'EAC Common Market Protocol',
      'Transfer pricing regulations',
      'WHT on dividends, interest, royalties',
      'Tax treaty application',
      'RRA compliance and filing'
    ];
  }
}
