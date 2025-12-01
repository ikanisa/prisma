/**
 * Rwanda PAYE / Payroll & Social Security Agent (tax-payroll-rw-037)
 *
 * Specialized AI agent for Rwanda payroll tax and social security compliance.
 *
 * Jurisdiction: Rwanda (East African Community)
 * Expertise: PAYE computation, RSSB contributions, pension schemes, monthly filings
 */

import type { TaxJurisdiction, TaxRate } from '../types';

export interface RwandaPayrollAgentConfig {
  organizationId: string;
  userId: string;
}

export interface RwandaPayrollCalculation {
  grossSalary: number;
  taxableIncome: number;
  paye: number;
  employeePension: number;
  employerPension: number;
  maternityLevy: number;
  cbhi: number;
  netSalary: number;
  breakdown: {
    component: string;
    amount: number;
    rate?: number;
  }[];
}

export interface RSSBRates {
  pensionEmployeeRate: number;
  pensionEmployerRate: number;
  maternityRate: number;
  cbhiRate: number;
  occupationalHazardsRate: number;
}

export class RwandaPayrollAgent {
  public readonly slug = 'tax-payroll-rw-037';
  public readonly name = 'Rwanda PAYE & Social Security Specialist';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  constructor(private config: RwandaPayrollAgentConfig) {}

  async getPAYEBrackets(): Promise<TaxRate[]> {
    return [
      {
        jurisdiction: { code: 'RW', name: 'Rwanda', region: 'Africa' },
        rateType: 'personal',
        standardRate: 30,
        reducedRates: [
          { rate: 0, description: 'Up to RWF 60,000 monthly', conditions: ['Monthly income'] },
          { rate: 20, description: 'RWF 60,001 - 100,000 monthly', conditions: ['Monthly income'] },
          { rate: 30, description: 'Over RWF 100,000 monthly', conditions: ['Monthly income'] },
        ],
        effectiveDate: '2024-01-01',
        source: 'https://www.rra.gov.rw/en/taxes-levies/pay-as-you-earn-paye',
      },
    ];
  }

  async getRSSBRates(): Promise<RSSBRates> {
    return {
      pensionEmployeeRate: 3,
      pensionEmployerRate: 5,
      maternityRate: 0.3, // Employer only
      cbhiRate: 0.5, // Community-Based Health Insurance
      occupationalHazardsRate: 2, // Employer only
    };
  }

  async calculatePayroll(input: {
    grossSalary: number;
    period: 'monthly' | 'annual';
    allowances?: number;
    deductions?: number;
  }): Promise<RwandaPayrollCalculation> {
    const { grossSalary, period, allowances = 0, deductions = 0 } = input;

    // Convert to monthly for calculation
    const monthlyGross = period === 'annual' ? grossSalary / 12 : grossSalary;

    // Taxable income (gross + taxable allowances - exempt deductions)
    const taxableIncome = monthlyGross + allowances - deductions;

    // Calculate PAYE using progressive rates
    const paye = this.calculatePAYE(taxableIncome);

    // RSSB Contributions (3% employee, 5% employer for pension)
    const employeePension = monthlyGross * 0.03;
    const employerPension = monthlyGross * 0.05;

    // Maternity Levy (0.3% employer only)
    const maternityLevy = monthlyGross * 0.003;

    // CBHI (0.5% of gross, typically employee portion)
    const cbhi = monthlyGross * 0.005;

    // Net salary calculation
    const netSalary = monthlyGross - paye - employeePension - cbhi;

    // Convert back to period if annual
    const multiplier = period === 'annual' ? 12 : 1;

    return {
      grossSalary,
      taxableIncome: taxableIncome * multiplier,
      paye: paye * multiplier,
      employeePension: employeePension * multiplier,
      employerPension: employerPension * multiplier,
      maternityLevy: maternityLevy * multiplier,
      cbhi: cbhi * multiplier,
      netSalary: netSalary * multiplier,
      breakdown: [
        { component: 'Gross Salary', amount: grossSalary },
        { component: 'PAYE Tax', amount: paye * multiplier, rate: (paye / monthlyGross) * 100 },
        { component: 'Employee Pension (RSSB)', amount: employeePension * multiplier, rate: 3 },
        { component: 'Employer Pension (RSSB)', amount: employerPension * multiplier, rate: 5 },
        { component: 'Maternity Levy', amount: maternityLevy * multiplier, rate: 0.3 },
        { component: 'CBHI', amount: cbhi * multiplier, rate: 0.5 },
        { component: 'Net Salary', amount: netSalary * multiplier },
      ],
    };
  }

  private calculatePAYE(monthlyTaxable: number): number {
    // Rwanda PAYE brackets (monthly)
    if (monthlyTaxable <= 60000) {
      return 0;
    } else if (monthlyTaxable <= 100000) {
      return (monthlyTaxable - 60000) * 0.20;
    } else {
      return (100000 - 60000) * 0.20 + (monthlyTaxable - 100000) * 0.30;
    }
  }

  async getFilingObligations(): Promise<string[]> {
    return [
      'PAYE Monthly Return - Due by 15th of following month',
      'RSSB Contribution Return - Monthly pension and social security',
      'Annual Employer Declaration - End of tax year summary',
      'Employee P10 Certificates - Annual tax certificates for employees',
      'Casual Worker Returns - For temporary/casual employees',
    ];
  }

  async getRSSBBenefits(): Promise<string[]> {
    return [
      'Old Age Pension - After age 60 with 15+ years contributions',
      'Invalidity Pension - For permanent disability',
      'Survivors Pension - For dependents of deceased contributors',
      'Maternity Benefits - 12 weeks paid leave',
      'Occupational Hazards - Work-related injury compensation',
      'CBHI Coverage - Basic health insurance',
    ];
  }

  getCapabilities(): string[] {
    return [
      'Rwanda PAYE calculation and withholding',
      'RSSB pension contribution computation',
      'Maternity levy calculation',
      'Community-Based Health Insurance (CBHI)',
      'Monthly filing preparation for RRA',
      'Employee P10 certificate generation',
      'Expatriate payroll considerations',
      'Casual worker tax treatment',
      'Benefits-in-kind taxation',
      'Year-end payroll reconciliation',
    ];
  }
}
