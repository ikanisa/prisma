/**
 * Malta PAYE / Payroll & Social Security Agent (tax-payroll-mt-036)
 *
 * Specialized AI agent for Malta payroll tax and social security compliance.
 *
 * Jurisdiction: Malta (EU member state)
 * Expertise: PAYE computation, FSS/SSC contributions, NI, payroll filings
 */

import type { TaxJurisdiction, TaxRate } from '../types';

export interface MaltaPayrollAgentConfig {
  organizationId: string;
  userId: string;
}

export interface PayrollCalculation {
  grossSalary: number;
  taxableIncome: number;
  paye: number;
  employeeSSC: number;
  employerSSC: number;
  netSalary: number;
  breakdown: {
    component: string;
    amount: number;
    rate?: number;
  }[];
}

export interface SSCRates {
  employeeRate: number;
  employerRate: number;
  weeklyMinimum: number;
  weeklyMaximum: number;
  category: string;
}

export class MaltaPayrollAgent {
  public readonly slug = 'tax-payroll-mt-036';
  public readonly name = 'Malta PAYE & Social Security Specialist';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  constructor(private config: MaltaPayrollAgentConfig) {}

  async getPAYEBrackets(): Promise<TaxRate[]> {
    return [
      {
        jurisdiction: { code: 'MT', name: 'Malta', region: 'EU' },
        rateType: 'personal',
        standardRate: 35,
        reducedRates: [
          { rate: 0, description: 'Up to €9,100 (single)', conditions: ['Annual income'] },
          { rate: 15, description: '€9,101 - €14,500 (single)', conditions: ['Annual income'] },
          { rate: 25, description: '€14,501 - €60,000 (single)', conditions: ['Annual income'] },
          { rate: 35, description: 'Over €60,000', conditions: ['Annual income'] },
        ],
        effectiveDate: '2024-01-01',
        source: 'https://cfr.gov.mt/en/inlandrevenue/taxinfo/Pages/Tax-Rates.aspx',
      },
    ];
  }

  async getSSCRates(): Promise<SSCRates[]> {
    return [
      {
        category: 'Category A - Standard Employee',
        employeeRate: 10,
        employerRate: 10,
        weeklyMinimum: 42.51,
        weeklyMaximum: 57.32,
      },
      {
        category: 'Category B - Self-Employed',
        employeeRate: 15,
        employerRate: 0,
        weeklyMinimum: 35.43,
        weeklyMaximum: 85.98,
      },
      {
        category: 'Category C - Student/Other',
        employeeRate: 10,
        employerRate: 0,
        weeklyMinimum: 21.26,
        weeklyMaximum: 28.66,
      },
    ];
  }

  async calculatePayroll(input: {
    grossSalary: number;
    period: 'weekly' | 'monthly' | 'annual';
    maritalStatus: 'single' | 'married';
    sscCategory?: string;
  }): Promise<PayrollCalculation> {
    const { grossSalary, period, maritalStatus } = input;

    // Convert to annual for calculation
    let annualGross = grossSalary;
    if (period === 'monthly') annualGross = grossSalary * 12;
    if (period === 'weekly') annualGross = grossSalary * 52;

    // Calculate PAYE
    const paye = this.calculatePAYE(annualGross, maritalStatus);

    // Calculate SSC (10% each for employee and employer, capped)
    const monthlyGross = annualGross / 12;
    const weeklyGross = annualGross / 52;
    const cappedWeekly = Math.min(Math.max(weeklyGross, 425.10), 573.20);
    const weeklySSC = cappedWeekly * 0.1;
    const employeeSSC = weeklySSC * 52;
    const employerSSC = weeklySSC * 52;

    // Net calculation
    const netSalary = annualGross - paye - employeeSSC;

    // Convert back to period
    const divisor = period === 'monthly' ? 12 : period === 'weekly' ? 52 : 1;

    return {
      grossSalary,
      taxableIncome: annualGross / divisor,
      paye: paye / divisor,
      employeeSSC: employeeSSC / divisor,
      employerSSC: employerSSC / divisor,
      netSalary: netSalary / divisor,
      breakdown: [
        { component: 'Gross Salary', amount: grossSalary },
        { component: 'PAYE Tax', amount: paye / divisor, rate: (paye / annualGross) * 100 },
        { component: 'Employee SSC', amount: employeeSSC / divisor, rate: 10 },
        { component: 'Employer SSC', amount: employerSSC / divisor, rate: 10 },
        { component: 'Net Salary', amount: netSalary / divisor },
      ],
    };
  }

  private calculatePAYE(annualIncome: number, maritalStatus: string): number {
    // Simplified PAYE calculation for single status
    // Actual computation uses FSS tax tables
    const brackets = maritalStatus === 'single'
      ? [
          { max: 9100, rate: 0 },
          { max: 14500, rate: 0.15 },
          { max: 60000, rate: 0.25 },
          { max: Infinity, rate: 0.35 },
        ]
      : [
          { max: 12700, rate: 0 },
          { max: 21200, rate: 0.15 },
          { max: 60000, rate: 0.25 },
          { max: Infinity, rate: 0.35 },
        ];

    let tax = 0;
    let remaining = annualIncome;
    let prev = 0;

    for (const bracket of brackets) {
      const taxable = Math.min(remaining, bracket.max - prev);
      if (taxable <= 0) break;
      tax += taxable * bracket.rate;
      remaining -= taxable;
      prev = bracket.max;
    }

    return tax;
  }

  async getFilingObligations(): Promise<string[]> {
    return [
      'FS3 - Annual Employer Return (due February 15)',
      'FS5 - Tax Deduction Card (provided to employees)',
      'FS4 - Employee end-of-employment statement',
      'SSC Form - Monthly SSC contributions',
      'Maternity Fund Contribution - Due with SSC',
    ];
  }

  getCapabilities(): string[] {
    return [
      'Malta PAYE calculation and withholding',
      'FSS tax table application',
      'Social Security Contribution (SSC) computation',
      'Employee vs employer contribution breakdown',
      'FS3/FS5 form preparation',
      'Part-time and casual worker compliance',
      'Expatriate payroll considerations',
      'Maternity fund contributions',
      'Fringe benefits taxation',
      'Year-end payroll reconciliation',
    ];
  }
}
