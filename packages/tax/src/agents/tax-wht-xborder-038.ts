/**
 * Withholding Tax & Cross-Border Payments Agent (tax-wht-xborder-038)
 *
 * Specialized AI agent for withholding tax and cross-border payment compliance.
 *
 * Scope: WHT on dividends, interest, royalties, services; DTA checks; relief at source vs refund claims
 */

import type { TaxJurisdiction, TaxRate } from '../types';

export interface WHTAgentConfig {
  organizationId: string;
  userId: string;
}

export interface WHTRate {
  paymentType: 'dividends' | 'interest' | 'royalties' | 'services' | 'fees';
  domesticRate: number;
  treatyRate?: number;
  treatyCountry?: string;
  conditions?: string[];
}

export interface DTAAnalysis {
  sourceCountry: string;
  residenceCountry: string;
  treatyExists: boolean;
  treatyRates: WHTRate[];
  reliefMethod: 'exemption' | 'credit' | 'deduction';
  procedureType: 'relief_at_source' | 'refund_claim';
  requiredDocuments: string[];
}

export class WithholdingTaxAgent {
  public readonly slug = 'tax-wht-xborder-038';
  public readonly name = 'Withholding Tax & Cross-Border Payments Specialist';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  constructor(private config: WHTAgentConfig) {}

  async getDomesticWHTRates(jurisdiction: TaxJurisdiction): Promise<WHTRate[]> {
    const rates: Record<string, WHTRate[]> = {
      MT: [
        { paymentType: 'dividends', domesticRate: 0, conditions: ['Participation exemption may apply'] },
        { paymentType: 'interest', domesticRate: 0, conditions: ['Generally exempt'] },
        { paymentType: 'royalties', domesticRate: 0, conditions: ['Generally exempt'] },
        { paymentType: 'services', domesticRate: 0, conditions: ['Check for PE issues'] },
      ],
      RW: [
        { paymentType: 'dividends', domesticRate: 15, conditions: ['5% for listed companies'] },
        { paymentType: 'interest', domesticRate: 15 },
        { paymentType: 'royalties', domesticRate: 15 },
        { paymentType: 'services', domesticRate: 15, conditions: ['Technical services to non-residents'] },
        { paymentType: 'fees', domesticRate: 15, conditions: ['Management and professional fees'] },
      ],
      GB: [
        { paymentType: 'dividends', domesticRate: 0 },
        { paymentType: 'interest', domesticRate: 20, conditions: ['Banks may have exemptions'] },
        { paymentType: 'royalties', domesticRate: 20 },
        { paymentType: 'services', domesticRate: 0 },
      ],
    };

    return rates[jurisdiction.code] || [];
  }

  async analyzeDTA(sourceCountry: string, residenceCountry: string): Promise<DTAAnalysis> {
    // Check if treaty exists (simplified)
    const treatyNetwork: Record<string, string[]> = {
      MT: ['GB', 'US', 'DE', 'FR', 'IT', 'NL', 'AE', 'SG', 'HK', 'CY', 'LU'],
      RW: ['BE', 'MU', 'ZA', 'KE', 'UG', 'TZ', 'CN'],
      GB: ['US', 'DE', 'FR', 'IT', 'NL', 'IE', 'AU', 'CA', 'JP', 'CN', 'IN'],
    };

    const treatyExists = treatyNetwork[sourceCountry]?.includes(residenceCountry) || false;

    return {
      sourceCountry,
      residenceCountry,
      treatyExists,
      treatyRates: treatyExists
        ? [
            { paymentType: 'dividends', domesticRate: 15, treatyRate: 5, treatyCountry: residenceCountry },
            { paymentType: 'interest', domesticRate: 15, treatyRate: 10, treatyCountry: residenceCountry },
            { paymentType: 'royalties', domesticRate: 15, treatyRate: 5, treatyCountry: residenceCountry },
          ]
        : [],
      reliefMethod: 'credit',
      procedureType: treatyExists ? 'relief_at_source' : 'refund_claim',
      requiredDocuments: this.getRequiredDocuments(treatyExists),
    };
  }

  private getRequiredDocuments(treatyExists: boolean): string[] {
    const baseDocuments = [
      'Tax residency certificate from residence country',
      'Proof of beneficial ownership',
      'Payment documentation',
    ];

    if (treatyExists) {
      return [
        ...baseDocuments,
        'Treaty benefit claim form',
        'Self-certification of eligibility',
        'Limitation on Benefits (LOB) declaration if applicable',
      ];
    }

    return [
      ...baseDocuments,
      'WHT payment confirmation',
      'Refund claim application',
      'Proof of tax paid',
    ];
  }

  async calculateWHT(input: {
    paymentType: 'dividends' | 'interest' | 'royalties' | 'services';
    grossAmount: number;
    sourceCountry: string;
    residenceCountry: string;
    applyTreaty: boolean;
  }): Promise<{
    grossAmount: number;
    whtRate: number;
    whtAmount: number;
    netAmount: number;
    treatyApplied: boolean;
    notes: string[];
  }> {
    const { paymentType, grossAmount, sourceCountry, residenceCountry, applyTreaty } = input;

    let whtRate = 15; // Default rate
    let treatyApplied = false;
    const notes: string[] = [];

    if (applyTreaty) {
      const dtaAnalysis = await this.analyzeDTA(sourceCountry, residenceCountry);
      if (dtaAnalysis.treatyExists) {
        const treatyRate = dtaAnalysis.treatyRates.find((r) => r.paymentType === paymentType);
        if (treatyRate?.treatyRate !== undefined) {
          whtRate = treatyRate.treatyRate;
          treatyApplied = true;
          notes.push(`Treaty rate applied between ${sourceCountry} and ${residenceCountry}`);
        }
      } else {
        notes.push('No treaty exists - domestic rate applied');
      }
    }

    const whtAmount = grossAmount * (whtRate / 100);
    const netAmount = grossAmount - whtAmount;

    return {
      grossAmount,
      whtRate,
      whtAmount,
      netAmount,
      treatyApplied,
      notes,
    };
  }

  async getReliefProcedures(jurisdiction: string): Promise<{
    reliefAtSource: string[];
    refundClaim: string[];
  }> {
    return {
      reliefAtSource: [
        'Obtain valid tax residency certificate',
        'Submit treaty benefit claim form before payment',
        'Provide beneficial ownership declaration',
        'Apply reduced rate at time of payment',
      ],
      refundClaim: [
        'Pay full domestic WHT at source',
        'Collect all required documentation',
        'File refund claim within statutory deadline',
        'Attach proof of tax residency and payment',
        'Typical processing time: 6-12 months',
      ],
    };
  }

  getCapabilities(): string[] {
    return [
      'Withholding tax rate determination',
      'Double Tax Agreement (DTA) analysis',
      'Treaty benefit eligibility assessment',
      'Relief at source procedures',
      'Refund claim preparation',
      'Cross-border payment structuring',
      'Beneficial ownership verification',
      'LOB clause analysis',
      'PE risk assessment for services',
      'EU Directives compliance (Interest/Royalties)',
    ];
  }
}
