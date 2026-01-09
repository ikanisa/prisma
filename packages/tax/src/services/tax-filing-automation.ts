/**
 * Tax Filing Automation Service
 * 
 * Automated tax filing service for generating forms, calculating liabilities,
 * and submitting returns to tax authorities. Supports US state sales tax,
 * Canadian GST/HST/PST, EU VAT, and other international tax regimes.
 * 
 * @example
 * ```typescript
 * import { taxFilingService } from './tax-filing-automation';
 * 
 * // Generate a filing
 * const filing = await taxFilingService.prepareFiling({
 *   entityId: 'entity-123',
 *   jurisdictionCode: 'US-CA',
 *   period: { year: 2026, quarter: 1 },
 *   transactions: salesData,
 * });
 * 
 * // Validate before submission
 * const validation = await taxFilingService.validateFiling(filing);
 * 
 * // Submit (if e-filing available)
 * if (filing.canEFile) {
 *   const result = await taxFilingService.submitFiling(filing);
 * }
 * ```
 */

import {
    jurisdictionDatabase,
    type Jurisdiction,
    type FilingRules
} from './jurisdiction-database.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FilingRequest {
    /** Entity/company ID */
    entityId: string;
    /** Jurisdiction code (e.g., "US-CA", "DE-VAT") */
    jurisdictionCode: string;
    /** Filing period */
    period: FilingPeriod;
    /** Aggregated transaction data */
    transactions: TransactionSummary;
    /** Tax registrations */
    registrations?: TaxRegistration[];
    /** Optional: Override calculated amounts */
    overrides?: FilingOverrides;
}

export interface FilingPeriod {
    year: number;
    month?: number;
    quarter?: number;
    type: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
}

export interface TransactionSummary {
    /** Gross sales for the period */
    grossSales: number;
    /** Taxable sales (after exemptions) */
    taxableSales: number;
    /** Exempt sales amount */
    exemptSales: number;
    /** Zero-rated sales (for VAT) */
    zeroRatedSales?: number;
    /** Number of transactions */
    transactionCount: number;
    /** Sales by category (for reduced rates) */
    salesByCategory?: Record<string, number>;
    /** Input tax credits (for VAT/GST) */
    inputTaxCredits?: number;
    /** Imports requiring tax */
    imports?: number;
    /** Adjustments from prior periods */
    priorPeriodAdjustments?: number;
}

export interface TaxRegistration {
    jurisdictionCode: string;
    registrationNumber: string;
    registrationDate: Date;
    filingFrequency: 'monthly' | 'quarterly' | 'annual';
    status: 'active' | 'suspended' | 'revoked';
}

export interface FilingOverrides {
    taxRate?: number;
    additionalTax?: number;
    credits?: number;
    penalties?: number;
}

export interface TaxFiling {
    id: string;
    entityId: string;
    jurisdictionCode: string;
    jurisdictionName: string;
    period: FilingPeriod;

    /** Due date for this filing */
    dueDate: Date;

    /** Calculated tax amounts */
    calculation: TaxCalculation;

    /** Generated form data */
    formData: FilingFormData;

    /** Filing status */
    status: FilingStatus;

    /** Validation results */
    validation: ValidationResult;

    /** E-filing eligibility */
    canEFile: boolean;

    /** Timestamps */
    preparedAt: Date;
    submittedAt?: Date;
    confirmedAt?: Date;

    /** Confirmation/tracking number */
    confirmationNumber?: string;
}

export interface TaxCalculation {
    grossSales: number;
    taxableSales: number;
    exemptSales: number;

    /** Tax at standard rate */
    standardRateTax: number;
    /** Tax at reduced rates */
    reducedRateTax: number;
    /** Total output tax (tax collected) */
    outputTax: number;

    /** Input tax credits (VAT/GST only) */
    inputTaxCredits: number;

    /** Net tax due (output - input) */
    netTaxDue: number;

    /** Prior period adjustments */
    adjustments: number;

    /** Penalties (if late filing) */
    penalties: number;

    /** Interest on late payment */
    interest: number;

    /** Total amount due */
    totalDue: number;

    /** Effective tax rate */
    effectiveRate: number;
}

export interface FilingFormData {
    /** Form identifier (e.g., "BOE-401-A", "ST-100") */
    formId: string;
    /** Form name */
    formName: string;
    /** Version/year */
    formVersion: string;
    /** Field values for the form */
    fields: Record<string, string | number | boolean>;
    /** Attachments/schedules */
    schedules?: FilingSchedule[];
}

export interface FilingSchedule {
    scheduleId: string;
    scheduleName: string;
    rows: Record<string, string | number>[];
}

export type FilingStatus =
    | 'draft'
    | 'validated'
    | 'ready_to_file'
    | 'submitted'
    | 'accepted'
    | 'rejected'
    | 'amended';

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    code: string;
    field?: string;
    message: string;
    severity: 'error';
}

export interface ValidationWarning {
    code: string;
    field?: string;
    message: string;
    severity: 'warning';
}

export interface SubmissionResult {
    success: boolean;
    confirmationNumber?: string;
    submittedAt?: Date;
    errors?: string[];
    nextSteps?: string;
}

export interface FilingCalendarEntry {
    jurisdictionCode: string;
    jurisdictionName: string;
    period: FilingPeriod;
    dueDate: Date;
    status: 'upcoming' | 'due_soon' | 'overdue' | 'filed';
    estimatedTax?: number;
    filingId?: string;
}

// ============================================================================
// TAX FILING AUTOMATION SERVICE
// ============================================================================

export class TaxFilingAutomationService {
    private filings: Map<string, TaxFiling> = new Map();

    /**
     * Prepare a tax filing for a jurisdiction
     */
    async prepareFiling(request: FilingRequest): Promise<TaxFiling> {
        const jurisdiction = jurisdictionDatabase.get(request.jurisdictionCode);

        if (!jurisdiction) {
            throw new Error(`Unknown jurisdiction: ${request.jurisdictionCode}`);
        }

        const id = crypto.randomUUID();
        const now = new Date();

        // Calculate tax
        const calculation = this.calculateTax(jurisdiction, request.transactions, request.overrides);

        // Generate form data
        const formData = this.generateFormData(jurisdiction, request, calculation);

        // Validate
        const validation = this.validateFiling(jurisdiction, request, calculation);

        // Calculate due date
        const dueDate = this.calculateDueDate(jurisdiction.filingRules, request.period);

        const filing: TaxFiling = {
            id,
            entityId: request.entityId,
            jurisdictionCode: request.jurisdictionCode,
            jurisdictionName: jurisdiction.name,
            period: request.period,
            dueDate,
            calculation,
            formData,
            status: validation.isValid ? 'validated' : 'draft',
            validation,
            canEFile: jurisdiction.eFilingSupport.available,
            preparedAt: now,
        };

        this.filings.set(id, filing);
        return filing;
    }

    /**
     * Calculate tax for a jurisdiction
     */
    calculateTax(
        jurisdiction: Jurisdiction,
        transactions: TransactionSummary,
        overrides?: FilingOverrides
    ): TaxCalculation {
        const rate = overrides?.taxRate ?? jurisdiction.taxRates.standardRate;

        // Calculate standard rate tax
        let standardRateTax = transactions.taxableSales * rate;

        // Calculate reduced rate taxes
        let reducedRateTax = 0;
        if (transactions.salesByCategory && jurisdiction.taxRates.reducedRates) {
            for (const reduced of jurisdiction.taxRates.reducedRates) {
                const categoryAmount = transactions.salesByCategory[reduced.category] ?? 0;
                reducedRateTax += categoryAmount * reduced.rate;
                // Reduce standard rate tax for items taxed at reduced rate
                standardRateTax -= categoryAmount * rate;
                standardRateTax += categoryAmount * reduced.rate;
            }
        }

        const outputTax = Math.max(0, standardRateTax);
        const inputTaxCredits = transactions.inputTaxCredits ?? 0;
        const netTaxDue = outputTax - inputTaxCredits;

        const adjustments = transactions.priorPeriodAdjustments ?? 0;
        const additionalTax = overrides?.additionalTax ?? 0;
        const credits = overrides?.credits ?? 0;

        // Calculate penalties and interest if late
        const penalties = overrides?.penalties ?? 0;
        const interest = 0; // Would calculate based on days late

        const totalDue = Math.max(0, netTaxDue + adjustments + additionalTax - credits + penalties + interest);

        const effectiveRate = transactions.grossSales > 0
            ? totalDue / transactions.grossSales
            : 0;

        return {
            grossSales: transactions.grossSales,
            taxableSales: transactions.taxableSales,
            exemptSales: transactions.exemptSales,
            standardRateTax,
            reducedRateTax,
            outputTax,
            inputTaxCredits,
            netTaxDue,
            adjustments,
            penalties,
            interest,
            totalDue,
            effectiveRate,
        };
    }

    /**
     * Generate form data based on jurisdiction requirements
     */
    generateFormData(
        jurisdiction: Jurisdiction,
        request: FilingRequest,
        calculation: TaxCalculation
    ): FilingFormData {
        const forms = jurisdiction.filingRules.forms;
        const formId = forms[0] || 'GENERIC';

        // Generate jurisdiction-specific form fields
        const fields: Record<string, string | number | boolean> = {
            // Common fields
            'entityId': request.entityId,
            'taxPeriodStart': this.getPeriodStartDate(request.period).toISOString(),
            'taxPeriodEnd': this.getPeriodEndDate(request.period).toISOString(),
            'grossSales': calculation.grossSales,
            'taxableSales': calculation.taxableSales,
            'exemptSales': calculation.exemptSales,
            'taxRate': jurisdiction.taxRates.standardRate,
            'taxDue': calculation.outputTax,
        };

        // Add VAT/GST-specific fields
        if (['VAT', 'GST', 'HST'].includes(jurisdiction.taxType)) {
            fields['inputTax'] = calculation.inputTaxCredits;
            fields['netTax'] = calculation.netTaxDue;
        }

        // Add adjustments
        if (calculation.adjustments !== 0) {
            fields['adjustments'] = calculation.adjustments;
        }

        // Total due
        fields['totalAmountDue'] = calculation.totalDue;

        return {
            formId,
            formName: this.getFormName(jurisdiction),
            formVersion: new Date().getFullYear().toString(),
            fields,
        };
    }

    /**
     * Validate a filing before submission
     */
    validateFiling(
        jurisdiction: Jurisdiction,
        request: FilingRequest,
        calculation: TaxCalculation
    ): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // Check for required registration
        if (jurisdiction.filingRules.forms.length > 0) {
            const hasRegistration = request.registrations?.some(
                r => r.jurisdictionCode === request.jurisdictionCode && r.status === 'active'
            );
            if (!hasRegistration) {
                warnings.push({
                    code: 'NO_REGISTRATION',
                    message: `No active registration found for ${jurisdiction.name}`,
                    severity: 'warning',
                });
            }
        }

        // Validate amounts
        if (calculation.taxableSales < 0) {
            errors.push({
                code: 'NEGATIVE_TAXABLE_SALES',
                field: 'taxableSales',
                message: 'Taxable sales cannot be negative',
                severity: 'error',
            });
        }

        if (calculation.taxableSales > calculation.grossSales) {
            errors.push({
                code: 'TAXABLE_EXCEEDS_GROSS',
                field: 'taxableSales',
                message: 'Taxable sales cannot exceed gross sales',
                severity: 'error',
            });
        }

        // VAT-specific validations
        if (calculation.inputTaxCredits > calculation.outputTax * 2) {
            warnings.push({
                code: 'HIGH_INPUT_CREDITS',
                field: 'inputTaxCredits',
                message: 'Input tax credits are unusually high relative to output tax',
                severity: 'warning',
            });
        }

        // Zero filing warning
        if (calculation.totalDue === 0 && calculation.grossSales > 0) {
            warnings.push({
                code: 'ZERO_TAX_DUE',
                message: 'Filing shows zero tax due despite having sales',
                severity: 'warning',
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Submit filing to tax authority (stub for API integration)
     */
    async submitFiling(filingId: string): Promise<SubmissionResult> {
        const filing = this.filings.get(filingId);

        if (!filing) {
            return {
                success: false,
                errors: ['Filing not found'],
            };
        }

        if (!filing.canEFile) {
            return {
                success: false,
                errors: ['E-filing not available for this jurisdiction'],
                nextSteps: 'Please file manually via the jurisdiction portal',
            };
        }

        if (!filing.validation.isValid) {
            return {
                success: false,
                errors: ['Filing has validation errors'],
            };
        }

        // In a real implementation, this would call the jurisdiction's API
        // For now, simulate successful submission
        const confirmationNumber = `${filing.jurisdictionCode}-${Date.now()}`;
        const submittedAt = new Date();

        filing.status = 'submitted';
        filing.submittedAt = submittedAt;
        filing.confirmationNumber = confirmationNumber;

        return {
            success: true,
            confirmationNumber,
            submittedAt,
            nextSteps: 'Confirmation will be sent within 24-48 hours',
        };
    }

    /**
     * Generate filing calendar for an entity
     */
    generateFilingCalendar(
        entityId: string,
        registrations: TaxRegistration[],
        months: number = 12
    ): FilingCalendarEntry[] {
        const calendar: FilingCalendarEntry[] = [];
        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth() + months, 0);

        for (const registration of registrations) {
            if (registration.status !== 'active') continue;

            const jurisdiction = jurisdictionDatabase.get(registration.jurisdictionCode);
            if (!jurisdiction) continue;

            // Generate entries based on filing frequency
            const periods = this.generatePeriods(
                registration.filingFrequency,
                now,
                endDate
            );

            for (const period of periods) {
                const dueDate = this.calculateDueDate(jurisdiction.filingRules, period);

                let status: FilingCalendarEntry['status'] = 'upcoming';
                if (dueDate < now) {
                    status = 'overdue';
                } else if (dueDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
                    status = 'due_soon';
                }

                calendar.push({
                    jurisdictionCode: registration.jurisdictionCode,
                    jurisdictionName: jurisdiction.name,
                    period,
                    dueDate,
                    status,
                });
            }
        }

        // Sort by due date
        return calendar.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }

    /**
     * Get filing by ID
     */
    getFiling(filingId: string): TaxFiling | undefined {
        return this.filings.get(filingId);
    }

    /**
     * Get all filings for an entity
     */
    getFilingsForEntity(entityId: string): TaxFiling[] {
        return Array.from(this.filings.values())
            .filter(f => f.entityId === entityId)
            .sort((a, b) => b.preparedAt.getTime() - a.preparedAt.getTime());
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private calculateDueDate(rules: FilingRules, period: FilingPeriod): Date {
        const periodEnd = this.getPeriodEndDate(period);
        return new Date(
            periodEnd.getFullYear(),
            periodEnd.getMonth(),
            periodEnd.getDate() + rules.dueDateOffset
        );
    }

    private getPeriodStartDate(period: FilingPeriod): Date {
        if (period.month !== undefined) {
            return new Date(period.year, period.month - 1, 1);
        }
        if (period.quarter !== undefined) {
            return new Date(period.year, (period.quarter - 1) * 3, 1);
        }
        return new Date(period.year, 0, 1);
    }

    private getPeriodEndDate(period: FilingPeriod): Date {
        if (period.month !== undefined) {
            return new Date(period.year, period.month, 0);
        }
        if (period.quarter !== undefined) {
            return new Date(period.year, period.quarter * 3, 0);
        }
        return new Date(period.year, 11, 31);
    }

    private getFormName(jurisdiction: Jurisdiction): string {
        const formNames: Record<string, string> = {
            'US-CA': 'California Sales and Use Tax Return',
            'US-NY': 'New York Sales Tax Return',
            'US-TX': 'Texas Sales and Use Tax Return',
            'GB-VAT': 'UK VAT Return',
            'DE-VAT': 'German VAT Advance Return (USt-Voranmeldung)',
            'AU-GST': 'Business Activity Statement (BAS)',
            'CA-GST': 'GST/HST Return',
        };
        return formNames[jurisdiction.code] || `${jurisdiction.name} Tax Return`;
    }

    private generatePeriods(
        frequency: 'monthly' | 'quarterly' | 'annual',
        startDate: Date,
        endDate: Date
    ): FilingPeriod[] {
        const periods: FilingPeriod[] = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            switch (frequency) {
                case 'monthly':
                    periods.push({
                        year: current.getFullYear(),
                        month: current.getMonth() + 1,
                        type: 'monthly',
                    });
                    current.setMonth(current.getMonth() + 1);
                    break;
                case 'quarterly':
                    periods.push({
                        year: current.getFullYear(),
                        quarter: Math.floor(current.getMonth() / 3) + 1,
                        type: 'quarterly',
                    });
                    current.setMonth(current.getMonth() + 3);
                    break;
                case 'annual':
                    periods.push({
                        year: current.getFullYear(),
                        type: 'annual',
                    });
                    current.setFullYear(current.getFullYear() + 1);
                    break;
            }
        }

        return periods;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

/** Singleton instance */
export const taxFilingService = new TaxFilingAutomationService();
