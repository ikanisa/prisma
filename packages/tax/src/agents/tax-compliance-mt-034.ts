/**
 * Malta Tax Compliance & Filing Agent (tax-compliance-mt-034)
 *
 * Specialized AI agent for Malta tax compliance and filing workflows.
 *
 * Jurisdiction: Malta (EU member state)
 * Scope: End-to-end return preparation & filing workflow, deadlines, penalties, CFR forms
 */

import type { TaxJurisdiction, FilingDeadline } from '../types';

export interface MaltaComplianceAgentConfig {
  organizationId: string;
  userId: string;
}

export interface FilingTask {
  filingType: string;
  taxYear: number;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'accepted' | 'rejected';
  form: string;
  estimatedTax?: number;
}

export class MaltaTaxComplianceAgent {
  public readonly slug = 'tax-compliance-mt-034';
  public readonly name = 'Malta Tax Compliance & Filing Specialist';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  constructor(private config: MaltaComplianceAgentConfig) {}

  async getFilingDeadlines(taxYear: number): Promise<FilingDeadline[]> {
    const baseYear = taxYear;
    return [
      {
        jurisdiction: { code: 'MT', name: 'Malta', region: 'EU' },
        filingType: 'Corporate Tax Return',
        dueDate: `${baseYear + 1}-03-31`,
        frequency: 'annual',
        penalties: 'Late filing penalty of €50 per month or part thereof',
        extensions: { available: true, maxDays: 90, conditions: 'Upon written request to CFR' },
      },
      {
        jurisdiction: { code: 'MT', name: 'Malta', region: 'EU' },
        filingType: 'VAT Return',
        dueDate: 'Quarterly: 15th of 2nd month following period end',
        frequency: 'quarterly',
        penalties: 'Interest at 0.54% per month on unpaid tax',
        extensions: { available: false },
      },
      {
        jurisdiction: { code: 'MT', name: 'Malta', region: 'EU' },
        filingType: 'FS3 (Employee Tax Deduction)',
        dueDate: `${baseYear + 1}-02-15`,
        frequency: 'annual',
        penalties: 'Administrative penalties apply',
      },
      {
        jurisdiction: { code: 'MT', name: 'Malta', region: 'EU' },
        filingType: 'Recapitulative Statement (EC Sales)',
        dueDate: 'Monthly: 15th of following month',
        frequency: 'monthly',
        penalties: 'Administrative penalties for late submission',
      },
    ];
  }

  async getRequiredForms(): Promise<string[]> {
    return [
      'TA1 - Annual Income Tax Return (Companies)',
      'TA2 - Annual Income Tax Return (Partnerships)',
      'TA24 - Personal Income Tax Return',
      'VAT Return - Quarterly VAT declaration',
      'FS3 - Employee Tax Deduction Summary',
      'FS5 - Tax Payment Withholding Declaration',
      'FS7 - Rental Income Withholding',
      'EC Sales List - Recapitulative Statement',
      'Intrastat - Statistical declarations',
    ];
  }

  async initiateFilingWorkflow(filingType: string, taxYear: number): Promise<FilingTask> {
    return {
      filingType,
      taxYear,
      dueDate: await this.calculateDueDate(filingType, taxYear),
      status: 'pending',
      form: this.mapFilingToForm(filingType),
    };
  }

  private async calculateDueDate(filingType: string, taxYear: number): Promise<string> {
    const deadlines: Record<string, string> = {
      'Corporate Tax Return': `${taxYear + 1}-03-31`,
      'Personal Tax Return': `${taxYear + 1}-06-30`,
      'Partnership Tax Return': `${taxYear + 1}-03-31`,
      'VAT Return': 'Quarterly basis',
    };
    return deadlines[filingType] || 'Contact CFR for guidance';
  }

  private mapFilingToForm(filingType: string): string {
    const forms: Record<string, string> = {
      'Corporate Tax Return': 'TA1',
      'Personal Tax Return': 'TA24',
      'Partnership Tax Return': 'TA2',
      'VAT Return': 'VAT Return Form',
    };
    return forms[filingType] || 'Unknown';
  }

  async validateFilingData(data: Record<string, unknown>): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.taxYear) errors.push('Tax year is required');
    if (!data.entityType) errors.push('Entity type is required');
    if (!data.revenue && !data.income) warnings.push('No revenue/income declared');

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getCapabilities(): string[] {
    return [
      'Malta corporate tax return preparation (TA1)',
      'Malta personal tax return preparation (TA24)',
      'VAT return filing and compliance',
      'FS3/FS5 payroll tax declarations',
      'EC Sales List preparation',
      'CFR eFiling portal integration',
      'Filing deadline management',
      'Penalty calculation and avoidance',
      'Extension request preparation',
      'Tax payment scheduling',
    ];
  }
}
