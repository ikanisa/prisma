/**
 * Tax Incentives & Investment Regimes Agent (tax-incentives-040)
 *
 * Specialized AI agent for investment incentives, free zones, tax holidays, and special regimes.
 *
 * Scope: Malta refund system, IP regime, shipping; Rwanda SEZ, investment promotion, R&D credits
 */

import type { TaxJurisdiction } from '../types';

export interface TaxIncentivesAgentConfig {
  organizationId: string;
  userId: string;
}

export interface TaxIncentive {
  name: string;
  jurisdiction: string;
  type: 'tax_holiday' | 'reduced_rate' | 'credit' | 'exemption' | 'deduction' | 'refund';
  applicableSectors: string[];
  benefit: string;
  duration?: string;
  conditions: string[];
  applicationProcess: string[];
}

export interface InvestmentRegime {
  name: string;
  jurisdiction: string;
  description: string;
  taxTreatment: string;
  eligibilityCriteria: string[];
  requiredInvestment?: number;
  jobCreationRequirements?: number;
  approvalAuthority: string;
}

export class TaxIncentivesAgent {
  public readonly slug = 'tax-incentives-040';
  public readonly name = 'Tax Incentives & Investment Regimes Specialist';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  constructor(private config: TaxIncentivesAgentConfig) {}

  async getIncentives(jurisdiction: TaxJurisdiction): Promise<TaxIncentive[]> {
    const incentives: Record<string, TaxIncentive[]> = {
      MT: [
        {
          name: 'Full Imputation System (Refund)',
          jurisdiction: 'MT',
          type: 'refund',
          applicableSectors: ['All trading companies'],
          benefit: 'Effective tax rate of 5% after shareholder refunds',
          conditions: ['Non-resident shareholders', 'No Malta real estate', 'No royalty income'],
          applicationProcess: [
            'Distribute dividend from taxed profits',
            'Shareholder claims 6/7 refund (trading income)',
            'Submit refund application to CFR',
          ],
        },
        {
          name: 'Patent Box / IP Regime',
          jurisdiction: 'MT',
          type: 'reduced_rate',
          applicableSectors: ['IP holding', 'Patents', 'Copyrights'],
          benefit: '5% effective rate on qualifying IP income',
          conditions: ['OECD-compliant nexus approach', 'Substantial activity requirement'],
          applicationProcess: [
            'Identify qualifying IP assets',
            'Calculate nexus ratio',
            'Apply deduction for qualifying income',
          ],
        },
        {
          name: 'Tonnage Tax (Shipping)',
          jurisdiction: 'MT',
          type: 'reduced_rate',
          applicableSectors: ['Shipping', 'Maritime'],
          benefit: 'Tax based on tonnage, not profits',
          conditions: ['Qualifying vessels', 'EU flag or strategic flags'],
          applicationProcess: [
            'Apply to Transport Malta',
            'Elect tonnage tax regime',
            'Annual tonnage-based calculation',
          ],
        },
        {
          name: 'Malta Enterprise Incentives',
          jurisdiction: 'MT',
          type: 'credit',
          applicableSectors: ['Manufacturing', 'Innovation', 'SMEs'],
          benefit: 'Tax credits of 15-45% of qualifying expenditure',
          conditions: ['Capital investment', 'Job creation'],
          applicationProcess: ['Apply through Malta Enterprise', 'Submit project proposal'],
        },
      ],
      RW: [
        {
          name: 'Special Economic Zone (SEZ)',
          jurisdiction: 'RW',
          type: 'tax_holiday',
          applicableSectors: ['Manufacturing', 'ICT', 'Logistics'],
          benefit: '0% CIT for up to 10 years, 15% thereafter',
          duration: '5-10 years tax holiday',
          conditions: ['Operate within SEZ', 'Minimum investment USD 500,000', 'Export focus'],
          applicationProcess: [
            'Apply to Special Economic Zones Authority',
            'Submit investment proposal',
            'Obtain developer/operator license',
          ],
        },
        {
          name: 'Pioneer Industry Incentives',
          jurisdiction: 'RW',
          type: 'tax_holiday',
          applicableSectors: ['Priority sectors'],
          benefit: '7 years tax holiday + 5 years at reduced rates',
          duration: '7+5 years',
          conditions: ['New industry in Rwanda', 'Minimum investment'],
          applicationProcess: ['Apply to RDB', 'Demonstrate pioneer status'],
        },
        {
          name: 'Export Promotion',
          jurisdiction: 'RW',
          type: 'reduced_rate',
          applicableSectors: ['Exporters'],
          benefit: '15% CIT rate for qualifying exports',
          conditions: ['Export revenue > 50% of total revenue'],
          applicationProcess: ['Register with RRA as exporter', 'Maintain export documentation'],
        },
        {
          name: 'Investment Tax Allowance',
          jurisdiction: 'RW',
          type: 'deduction',
          applicableSectors: ['Manufacturing', 'Agriculture', 'Tourism'],
          benefit: 'Up to 150% deduction on qualifying assets',
          conditions: ['New or expanded productive capacity', 'Registered investment'],
          applicationProcess: ['Apply through RDB', 'Submit investment plan'],
        },
        {
          name: 'Agricultural Incentives',
          jurisdiction: 'RW',
          type: 'exemption',
          applicableSectors: ['Agriculture', 'Agro-processing'],
          benefit: '0% CIT for agricultural activities',
          conditions: ['Primary agriculture', 'Registered farmer'],
          applicationProcess: ['Register with MINAGRI', 'Maintain proper records'],
        },
      ],
    };

    return incentives[jurisdiction.code] || [];
  }

  async getInvestmentRegimes(jurisdiction: TaxJurisdiction): Promise<InvestmentRegime[]> {
    const regimes: Record<string, InvestmentRegime[]> = {
      MT: [
        {
          name: 'Malta Holding Company Regime',
          jurisdiction: 'MT',
          description: 'Participation exemption for qualifying holdings',
          taxTreatment: 'Exempt dividends and capital gains from qualifying participations',
          eligibilityCriteria: [
            'Equity holding with right to 5%+ of equity/votes/profits',
            'OR holding value > €1.164 million',
            'No predominant trading in securities',
          ],
          approvalAuthority: 'Self-assessed, no prior approval required',
        },
        {
          name: 'Notional Interest Deduction',
          jurisdiction: 'MT',
          description: 'Deduction for equity financing costs',
          taxTreatment: 'Deduction equal to risk-free rate on equity',
          eligibilityCriteria: ['Contributed equity capital'],
          approvalAuthority: 'Self-calculated, declared in tax return',
        },
      ],
      RW: [
        {
          name: 'Strategic Investment Certificate',
          jurisdiction: 'RW',
          description: 'Enhanced incentives for large investments',
          taxTreatment: 'Negotiated tax package based on investment size',
          eligibilityCriteria: [
            'Investment > USD 50 million',
            'OR significant job creation',
            'Strategic sector alignment',
          ],
          requiredInvestment: 50000000,
          jobCreationRequirements: 500,
          approvalAuthority: 'Rwanda Development Board',
        },
        {
          name: 'Kigali Innovation City',
          jurisdiction: 'RW',
          description: 'ICT and innovation hub incentives',
          taxTreatment: '0% CIT, VAT exemptions on imports',
          eligibilityCriteria: ['Technology company', 'Locate in KIC'],
          approvalAuthority: 'Kigali Innovation City Authority',
        },
      ],
    };

    return regimes[jurisdiction.code] || [];
  }

  async assessEligibility(
    jurisdiction: string,
    incentiveName: string,
    companyProfile: {
      sector: string;
      investmentAmount?: number;
      employeeCount?: number;
      exportPercentage?: number;
    }
  ): Promise<{
    eligible: boolean;
    reasons: string[];
    nextSteps: string[];
  }> {
    const incentives = await this.getIncentives({ code: jurisdiction, name: jurisdiction });
    const incentive = incentives.find((i) => i.name === incentiveName);

    if (!incentive) {
      return {
        eligible: false,
        reasons: ['Incentive not found for this jurisdiction'],
        nextSteps: ['Review available incentives'],
      };
    }

    const reasons: string[] = [];
    const nextSteps: string[] = [];
    let eligible = true;

    // Check sector eligibility
    if (!incentive.applicableSectors.some((s) => s.toLowerCase().includes(companyProfile.sector.toLowerCase()))) {
      eligible = false;
      reasons.push(`Sector "${companyProfile.sector}" may not qualify`);
    } else {
      reasons.push(`Sector "${companyProfile.sector}" appears eligible`);
    }

    if (eligible) {
      nextSteps.push(...incentive.applicationProcess);
      reasons.push(`Potential benefit: ${incentive.benefit}`);
    }

    return { eligible, reasons, nextSteps };
  }

  getCapabilities(): string[] {
    return [
      'Malta full imputation refund system',
      'Malta IP/Patent Box regime',
      'Malta tonnage tax for shipping',
      'Malta Enterprise investment credits',
      'Rwanda Special Economic Zones',
      'Rwanda pioneer industry incentives',
      'Rwanda export promotion schemes',
      'R&D tax credits and deductions',
      'Investment tax allowances',
      'Free zone administration',
      'Tax holiday structuring',
      'Incentive eligibility assessment',
    ];
  }
}
