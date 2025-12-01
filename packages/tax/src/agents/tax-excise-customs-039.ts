/**
 * Excise, Customs & Indirect Levies Agent (tax-excise-customs-039)
 *
 * Specialized AI agent for excise duties, customs, and indirect levies.
 *
 * Scope: Excise computation, customs duties, EAC regional considerations, interaction with VAT
 */

import type { TaxJurisdiction } from '../types';

export interface ExciseCustomsAgentConfig {
  organizationId: string;
  userId: string;
}

export interface ExciseDuty {
  product: string;
  category: string;
  rate: number;
  rateType: 'specific' | 'ad_valorem' | 'mixed';
  unit?: string;
  jurisdiction: string;
}

export interface CustomsDuty {
  hsCode: string;
  description: string;
  dutyRate: number;
  preferentialRates?: {
    agreement: string;
    rate: number;
  }[];
  restrictions?: string[];
}

export interface IndirectTaxCalculation {
  importValue: number;
  customsDuty: number;
  exciseDuty: number;
  vat: number;
  otherLevies: number;
  totalDutyPayable: number;
  breakdown: { component: string; amount: number }[];
}

export class ExciseCustomsAgent {
  public readonly slug = 'tax-excise-customs-039';
  public readonly name = 'Excise, Customs & Indirect Levies Specialist';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  constructor(private config: ExciseCustomsAgentConfig) {}

  async getExciseDuties(jurisdiction: TaxJurisdiction): Promise<ExciseDuty[]> {
    const duties: Record<string, ExciseDuty[]> = {
      MT: [
        { product: 'Petrol', category: 'Fuel', rate: 0.509, rateType: 'specific', unit: 'per litre', jurisdiction: 'MT' },
        { product: 'Diesel', category: 'Fuel', rate: 0.372, rateType: 'specific', unit: 'per litre', jurisdiction: 'MT' },
        { product: 'Beer', category: 'Alcohol', rate: 0.047, rateType: 'specific', unit: 'per litre per degree', jurisdiction: 'MT' },
        { product: 'Wine', category: 'Alcohol', rate: 0, rateType: 'specific', jurisdiction: 'MT' },
        { product: 'Spirits', category: 'Alcohol', rate: 14.00, rateType: 'specific', unit: 'per litre pure alcohol', jurisdiction: 'MT' },
        { product: 'Cigarettes', category: 'Tobacco', rate: 237.50, rateType: 'mixed', unit: 'per 1000 + 24% ad valorem', jurisdiction: 'MT' },
      ],
      RW: [
        { product: 'Petrol', category: 'Fuel', rate: 183, rateType: 'specific', unit: 'RWF per litre', jurisdiction: 'RW' },
        { product: 'Diesel', category: 'Fuel', rate: 150, rateType: 'specific', unit: 'RWF per litre', jurisdiction: 'RW' },
        { product: 'Beer (local)', category: 'Alcohol', rate: 30, rateType: 'ad_valorem', jurisdiction: 'RW' },
        { product: 'Beer (imported)', category: 'Alcohol', rate: 60, rateType: 'ad_valorem', jurisdiction: 'RW' },
        { product: 'Spirits', category: 'Alcohol', rate: 70, rateType: 'ad_valorem', jurisdiction: 'RW' },
        { product: 'Cigarettes', category: 'Tobacco', rate: 36, rateType: 'ad_valorem', jurisdiction: 'RW' },
        { product: 'Soft drinks', category: 'Beverages', rate: 39, rateType: 'ad_valorem', jurisdiction: 'RW' },
      ],
    };

    return duties[jurisdiction.code] || [];
  }

  async getCustomsDuties(hsCode: string, jurisdiction: TaxJurisdiction): Promise<CustomsDuty | null> {
    // Simplified HS code lookup
    const dutyRates: Record<string, CustomsDuty> = {
      '8703': {
        hsCode: '8703',
        description: 'Motor vehicles for transport of persons',
        dutyRate: 25,
        preferentialRates: [
          { agreement: 'EAC', rate: 0 },
          { agreement: 'COMESA', rate: 10 },
        ],
      },
      '2203': {
        hsCode: '2203',
        description: 'Beer made from malt',
        dutyRate: 25,
        preferentialRates: [{ agreement: 'EAC', rate: 0 }],
      },
      '2204': {
        hsCode: '2204',
        description: 'Wine of fresh grapes',
        dutyRate: 25,
        preferentialRates: [],
      },
    };

    return dutyRates[hsCode.substring(0, 4)] || null;
  }

  async calculateImportDuties(input: {
    cifValue: number;
    hsCode: string;
    jurisdiction: TaxJurisdiction;
    originCountry: string;
    exciseApplicable: boolean;
  }): Promise<IndirectTaxCalculation> {
    const { cifValue, hsCode, jurisdiction, originCountry, exciseApplicable } = input;

    // Get customs duty
    const customsInfo = await this.getCustomsDuties(hsCode, jurisdiction);
    let customsRate = customsInfo?.dutyRate || 25;

    // Check for preferential rates
    if (originCountry === 'EAC' && jurisdiction.code === 'RW') {
      customsRate = 0;
    }

    const customsDuty = cifValue * (customsRate / 100);

    // Calculate excise if applicable
    let exciseDuty = 0;
    if (exciseApplicable) {
      // Simplified - would need product-specific rates
      exciseDuty = cifValue * 0.3;
    }

    // Calculate VAT (18% for Rwanda, various for Malta)
    const vatBase = cifValue + customsDuty + exciseDuty;
    const vatRate = jurisdiction.code === 'RW' ? 18 : 18;
    const vat = vatBase * (vatRate / 100);

    // Other levies (infrastructure levy, etc.)
    const otherLevies = jurisdiction.code === 'RW' ? cifValue * 0.015 : 0;

    const totalDutyPayable = customsDuty + exciseDuty + vat + otherLevies;

    return {
      importValue: cifValue,
      customsDuty,
      exciseDuty,
      vat,
      otherLevies,
      totalDutyPayable,
      breakdown: [
        { component: 'CIF Value', amount: cifValue },
        { component: 'Customs Duty', amount: customsDuty },
        { component: 'Excise Duty', amount: exciseDuty },
        { component: 'VAT', amount: vat },
        { component: 'Other Levies', amount: otherLevies },
        { component: 'Total Payable', amount: totalDutyPayable },
      ],
    };
  }

  async getEACCommonExternalTariff(): Promise<{
    categories: { band: string; rate: number; description: string }[];
    sensitiveLists: string[];
  }> {
    return {
      categories: [
        { band: '0', rate: 0, description: 'Raw materials, capital goods, certain agricultural inputs' },
        { band: '10', rate: 10, description: 'Semi-processed goods' },
        { band: '25', rate: 25, description: 'Finished goods' },
        { band: '35', rate: 35, description: 'Sensitive items (special protection)' },
        { band: '50-100', rate: 50, description: 'Sugar, rice - additional protection' },
      ],
      sensitiveLists: [
        'Sugar and sugar confectionery',
        'Milk and dairy products',
        'Wheat and wheat flour',
        'Maize and maize flour',
        'Rice',
        'Textiles and clothing',
        'Used clothing and footwear',
      ],
    };
  }

  getCapabilities(): string[] {
    return [
      'Excise duty computation by product category',
      'Customs tariff classification (HS codes)',
      'Import duty calculation',
      'EAC Common External Tariff application',
      'COMESA preferential treatment',
      'VAT on imports calculation',
      'Excise warehouse procedures',
      'Duty suspension arrangements',
      'Rules of origin verification',
      'Customs valuation methods',
      'Transit and bonded movement',
      'Exemption application procedures',
    ];
  }
}
