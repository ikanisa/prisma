/**
 * Rwanda Tax Compliance & Filing Agent (tax-compliance-rw-035)
 *
 * Specialized AI agent for Rwanda tax compliance and filing workflows.
 *
 * Jurisdiction: Rwanda (East African Community)
 * Scope: End-to-end return preparation & filing workflow, RRA eFiling, deadlines, penalties
 */

import type { TaxJurisdiction, FilingDeadline } from '../types';
import { RwandaEBMService, type RwandaEBMServiceConfig } from '../services/rwanda-ebm-service.js';
import type { RwandaVATCalculation, RwandaEBMInvoice, RwandaEBMInvoiceItem } from '../types/jurisdictions.js';

export interface RwandaComplianceAgentConfig {
  organizationId: string;
  userId: string;
  ebmSerialNumber?: string;
}

export interface RRAFilingTask {
  filingType: string;
  taxYear: number;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'accepted' | 'rejected';
  form: string;
  rraReference?: string;
  estimatedTax?: number;
}

export class RwandaTaxComplianceAgent {
  public readonly slug = 'tax-compliance-rw-035';
  public readonly name = 'Rwanda Tax Compliance & Filing Specialist';
  public readonly version = '2.0.0';  // Upgraded with EBM Service
  public readonly category = 'tax';
  public readonly type = 'specialist';

  private ebmService: RwandaEBMService;

  constructor(private config: RwandaComplianceAgentConfig) {
    this.ebmService = new RwandaEBMService({
      organizationId: config.organizationId,
      userId: config.userId,
      ebmSerialNumber: config.ebmSerialNumber,
    });
  }

  async getFilingDeadlines(taxYear: number): Promise<FilingDeadline[]> {
    const baseYear = taxYear;
    return [
      {
        jurisdiction: { code: 'RW', name: 'Rwanda', region: 'Africa' },
        filingType: 'Corporate Income Tax Return',
        dueDate: `${baseYear + 1}-03-31`,
        frequency: 'annual',
        penalties: 'Late filing: 20% of tax due plus 1.5% interest per month',
        extensions: { available: true, maxDays: 30, conditions: 'Upon written request to RRA' },
      },
      {
        jurisdiction: { code: 'RW', name: 'Rwanda', region: 'Africa' },
        filingType: 'VAT Return',
        dueDate: '15th of following month',
        frequency: 'monthly',
        penalties: '10% of tax due for late filing, plus 1.5% monthly interest',
      },
      {
        jurisdiction: { code: 'RW', name: 'Rwanda', region: 'Africa' },
        filingType: 'PAYE Withholding',
        dueDate: '15th of following month',
        frequency: 'monthly',
        penalties: '10% penalty plus 1.5% monthly interest on late payment',
      },
      {
        jurisdiction: { code: 'RW', name: 'Rwanda', region: 'Africa' },
        filingType: 'Withholding Tax Return',
        dueDate: '15th of following month',
        frequency: 'monthly',
        penalties: 'Standard late filing penalties apply',
      },
      {
        jurisdiction: { code: 'RW', name: 'Rwanda', region: 'Africa' },
        filingType: 'Quarterly CIT Installment',
        dueDate: 'End of each quarter',
        frequency: 'quarterly',
        penalties: '10% penalty on unpaid installments',
      },
    ];
  }

  async getRequiredForms(): Promise<string[]> {
    return [
      'CIT Return - Corporate Income Tax Annual Return',
      'VAT Return - Monthly VAT Declaration',
      'PAYE Return - Monthly Employee Tax Withholding',
      'WHT Return - Withholding Tax Declaration',
      'Trading License Return - Annual business license renewal',
      'Transfer Pricing Documentation - For related party transactions',
      'Quarterly CIT Installment - Provisional tax payment',
    ];
  }

  async initiateFilingWorkflow(filingType: string, taxYear: number): Promise<RRAFilingTask> {
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
      'Corporate Income Tax Return': `${taxYear + 1}-03-31`,
      'VAT Return': '15th of following month',
      'PAYE Return': '15th of following month',
      'WHT Return': '15th of following month',
    };
    return deadlines[filingType] || 'Contact RRA for guidance';
  }

  private mapFilingToForm(filingType: string): string {
    const forms: Record<string, string> = {
      'Corporate Income Tax Return': 'CIT Return',
      'VAT Return': 'VAT Monthly Return',
      'PAYE Return': 'PAYE Monthly Return',
      'WHT Return': 'WHT Declaration',
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
    if (!data.tinNumber) errors.push('TIN (Tax Identification Number) is required');
    if (!data.entityType) errors.push('Entity type is required');
    if (!data.revenue && !data.income) warnings.push('No revenue/income declared');
    if (!data.tradingLicense) warnings.push('Trading license information may be required');

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async getRRAeFilingGuidance(): Promise<string[]> {
    return [
      'Access RRA eFiling portal at https://efiling.rra.gov.rw',
      'Ensure TIN is registered and active',
      'Complete all required fields in the online form',
      'Upload supporting documents where required',
      'Verify calculations before submission',
      'Print and keep acknowledgment receipt',
      'Make payment through approved channels (banks, mobile money)',
    ];
  }

  getCapabilities(): string[] {
    return [
      'Rwanda corporate income tax return preparation',
      'Monthly VAT return filing',
      'PAYE withholding compliance',
      'Withholding tax return preparation',
      'RRA eFiling portal navigation',
      'Quarterly installment calculations',
      'Filing deadline management',
      'Penalty calculation and avoidance',
      'TIN registration assistance',
      'EAC regional compliance considerations',
      'EBM invoice creation and validation',
      'VAT calculation (18% standard rate)',
      'Digital Services Tax (1.5%)',
      'Withholding tax calculations',
    ];
  }

  // =========================================================================
  // EBM SERVICE INTEGRATION
  // =========================================================================

  /**
   * Calculate VAT for a transaction
   */
  calculateVAT(netAmount: number): RwandaVATCalculation {
    return this.ebmService.calculateVAT(netAmount);
  }

  /**
   * Create and validate EBM invoice
   */
  createEBMInvoice(invoiceData: {
    invoiceNumber: string;
    taxpayerTIN: string;
    customerName: string;
    customerTIN?: string;
    items: Omit<RwandaEBMInvoiceItem, 'vatAmount'>[];
  }): RwandaEBMInvoice {
    return this.ebmService.createEBMInvoice(invoiceData);
  }

  /**
   * Validate EBM invoice format
   */
  validateEBMInvoice(invoice: RwandaEBMInvoice) {
    return this.ebmService.validateEBMInvoice(invoice);
  }

  /**
   * Check VAT registration requirements
   */
  checkVATRegistrationRequired(annualTurnover: number, quarterlyTurnover?: number) {
    return this.ebmService.checkVATRegistrationRequired(annualTurnover, quarterlyTurnover);
  }

  /**
   * Calculate Digital Services Tax (1.5%)
   */
  calculateDigitalServicesTax(grossRevenue: number) {
    return this.ebmService.calculateDigitalServicesTax(grossRevenue);
  }

  /**
   * Calculate withholding tax
   */
  calculateWithholdingTax(amount: number, type: 'services' | 'dividends' | 'rent') {
    return this.ebmService.calculateWithholdingTax(amount, type);
  }
}
