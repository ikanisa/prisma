/**
 * Rwanda EBM (Electronic Billing Machine) Service
 * 
 * Integration with Rwanda Revenue Authority (RRA) e-invoicing system
 * 
 * Key Features:
 * - VAT calculation (18% standard rate)
 * - EBM invoice validation and sync
 * - Offline mode with queue
 * - Digital Services Tax (1.5%)
 * - Mobile money reconciliation interfaces
 * 
 * Reference: Tax Procedures Law No. 020/2023
 */

import type {
    RwandaVATCalculation,
    RwandaEBMInvoice,
    RwandaEBMInvoiceItem,
    RwandaVATRegistration,
    RwandaDigitalServicesTax,
} from '../types/jurisdictions.js';
import {
    RWANDA_THRESHOLDS,
    roundForCurrency,
    formatCurrency,
    checkThreshold,
} from '../utils/currency.js';

// ============================================================================
// RWANDA TAX RATES (2024-2025)
// ============================================================================

export const RWANDA_TAX_RATES = {
    VAT_STANDARD: 18,
    CORPORATE_INCOME_TAX: 30,
    WITHHOLDING_TAX_SERVICES: 15,
    WITHHOLDING_TAX_DIVIDENDS: 15,
    WITHHOLDING_TAX_RENT: 15,
    DIGITAL_SERVICES_TAX: 1.5,
    TOURISM_LEVY: 3,
} as const;

// ============================================================================
// RWANDA EBM SERVICE
// ============================================================================

export interface RwandaEBMServiceConfig {
    organizationId?: string;
    userId?: string;
    ebmSerialNumber?: string;
    rraApiEndpoint?: string;  // Production: https://efiling.rra.gov.rw
}

export class RwandaEBMService {
    private config: RwandaEBMServiceConfig;
    private offlineQueue: RwandaEBMInvoice[] = [];
    private isOnline: boolean = true;

    constructor(config: RwandaEBMServiceConfig = {}) {
        this.config = config;
    }

    /**
     * Calculate VAT for Rwanda (18% standard rate)
     */
    calculateVAT(netAmount: number): RwandaVATCalculation {
        const vatAmount = roundForCurrency(netAmount * (RWANDA_TAX_RATES.VAT_STANDARD / 100), 'RWF');
        const grossAmount = roundForCurrency(netAmount + vatAmount, 'RWF');

        return {
            netAmount: roundForCurrency(netAmount, 'RWF'),
            vatAmount,
            vatRate: 18,
            grossAmount,
            currency: 'RWF',
        };
    }

    /**
     * Calculate Digital Services Tax (1.5% on gross revenue)
     */
    calculateDigitalServicesTax(grossRevenue: number): RwandaDigitalServicesTax {
        const dstAmount = roundForCurrency(grossRevenue * (RWANDA_TAX_RATES.DIGITAL_SERVICES_TAX / 100), 'RWF');

        return {
            grossRevenue: roundForCurrency(grossRevenue, 'RWF'),
            dstRate: 1.5,
            dstAmount,
            effectiveDate: '2025-01-01',
        };
    }

    /**
     * Calculate Tourism Levy (3% on accommodation)
     */
    calculateTourismLevy(accommodationAmount: number): { amount: number; levy: number; total: number } {
        const levy = roundForCurrency(accommodationAmount * (RWANDA_TAX_RATES.TOURISM_LEVY / 100), 'RWF');
        return {
            amount: roundForCurrency(accommodationAmount, 'RWF'),
            levy,
            total: roundForCurrency(accommodationAmount + levy, 'RWF'),
        };
    }

    /**
     * Create and validate EBM invoice
     */
    createEBMInvoice(
        invoiceData: {
            invoiceNumber: string;
            taxpayerTIN: string;
            customerName: string;
            customerTIN?: string;
            items: Omit<RwandaEBMInvoiceItem, 'vatAmount'>[];
        }
    ): RwandaEBMInvoice {
        // Calculate VAT for each item
        const itemsWithVAT: RwandaEBMInvoiceItem[] = invoiceData.items.map(item => ({
            ...item,
            vatAmount: roundForCurrency(item.totalPrice * (RWANDA_TAX_RATES.VAT_STANDARD / 100), 'RWF'),
        }));

        const taxableAmount = itemsWithVAT.reduce((sum, item) => sum + item.totalPrice, 0);
        const vatAmount = itemsWithVAT.reduce((sum, item) => sum + item.vatAmount, 0);
        const totalAmount = roundForCurrency(taxableAmount + vatAmount, 'RWF');

        return {
            invoiceNumber: invoiceData.invoiceNumber,
            taxpayerTIN: invoiceData.taxpayerTIN,
            issueDate: new Date().toISOString().split('T')[0],
            customerName: invoiceData.customerName,
            customerTIN: invoiceData.customerTIN,
            items: itemsWithVAT,
            taxableAmount: roundForCurrency(taxableAmount, 'RWF'),
            vatAmount: roundForCurrency(vatAmount, 'RWF'),
            totalAmount,
            ebmStatus: 'pending',
        };
    }

    /**
     * Sync invoice to RRA (mock implementation)
     * In production, this would call the actual RRA API
     */
    async syncInvoiceToRRA(invoice: RwandaEBMInvoice): Promise<{
        success: boolean;
        ebmReference?: string;
        rraTimestamp?: string;
        error?: string;
    }> {
        // Validate invoice before sync
        const validation = this.validateEBMInvoice(invoice);
        if (!validation.valid) {
            return {
                success: false,
                error: `Validation failed: ${validation.errors.join(', ')}`,
            };
        }

        // Check if offline
        if (!this.isOnline) {
            this.offlineQueue.push(invoice);
            return {
                success: false,
                error: 'System offline - invoice queued for later sync',
            };
        }

        // Mock RRA API response
        // In production, this would be an actual HTTP request
        try {
            const ebmReference = `RRA-${Date.now()}-${invoice.invoiceNumber}`;
            const rraTimestamp = new Date().toISOString();

            // Update invoice status
            invoice.ebmStatus = 'synced';
            invoice.rraReference = ebmReference;
            invoice.rraTimestamp = rraTimestamp;

            return {
                success: true,
                ebmReference,
                rraTimestamp,
            };
        } catch (error) {
            invoice.ebmStatus = 'failed';
            return {
                success: false,
                error: error instanceof Error ? error.message : 'EBM sync failed',
            };
        }
    }

    /**
     * Validate EBM invoice format
     */
    validateEBMInvoice(invoice: RwandaEBMInvoice): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Required fields check
        if (!invoice.taxpayerTIN) errors.push('Taxpayer TIN is required');
        if (!invoice.invoiceNumber) errors.push('Invoice number is required');
        if (!invoice.issueDate) errors.push('Issue date is required');
        if (!invoice.customerName) errors.push('Customer name is required');
        if (!invoice.items || invoice.items.length === 0) errors.push('At least one item is required');

        // TIN format validation (9 digits for Rwanda)
        if (invoice.taxpayerTIN && !/^\d{9}$/.test(invoice.taxpayerTIN)) {
            errors.push('Invalid TIN format - must be 9 digits');
        }
        if (invoice.customerTIN && !/^\d{9}$/.test(invoice.customerTIN)) {
            warnings.push('Customer TIN format may be incorrect');
        }

        // VAT calculation validation
        const expectedVAT = invoice.taxableAmount * (RWANDA_TAX_RATES.VAT_STANDARD / 100);
        const vatDifference = Math.abs(invoice.vatAmount - expectedVAT);
        if (vatDifference > 1) { // Allow 1 RWF tolerance
            errors.push(`VAT calculation mismatch: expected ${expectedVAT}, got ${invoice.vatAmount}`);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Check VAT registration requirement
     */
    checkVATRegistrationRequired(
        annualTurnover: number,
        quarterlyTurnover?: number
    ): {
        required: boolean;
        reason: string;
        thresholdType: 'annual' | 'quarterly';
        deadline?: string;
    } {
        // Check quarterly threshold first
        if (quarterlyTurnover && quarterlyTurnover >= RWANDA_THRESHOLDS.VAT_QUARTERLY) {
            return {
                required: true,
                reason: `Quarterly turnover (${this.formatAmount(quarterlyTurnover)}) exceeds threshold (${this.formatAmount(RWANDA_THRESHOLDS.VAT_QUARTERLY)})`,
                thresholdType: 'quarterly',
                deadline: '7 days from exceeding threshold',
            };
        }

        // Check annual threshold
        if (annualTurnover >= RWANDA_THRESHOLDS.VAT_ANNUAL) {
            return {
                required: true,
                reason: `Annual turnover (${this.formatAmount(annualTurnover)}) exceeds threshold (${this.formatAmount(RWANDA_THRESHOLDS.VAT_ANNUAL)})`,
                thresholdType: 'annual',
                deadline: '7 days from exceeding threshold',
            };
        }

        return {
            required: false,
            reason: 'Turnover below VAT registration thresholds',
            thresholdType: 'annual',
        };
    }

    /**
     * Get VAT registration status
     */
    getRegistrationStatus(
        turnover: number,
        isRegistered: boolean
    ): RwandaVATRegistration & { complianceStatus: 'compliant' | 'non_compliant' | 'warning' } {
        const registrationCheck = this.checkVATRegistrationRequired(turnover);

        let complianceStatus: 'compliant' | 'non_compliant' | 'warning' = 'compliant';
        if (registrationCheck.required && !isRegistered) {
            complianceStatus = 'non_compliant';
        } else if (!registrationCheck.required && isRegistered) {
            complianceStatus = 'warning'; // Registered but not required
        }

        return {
            tin: '',
            vatRegistered: isRegistered,
            ebmSerialNumber: this.config.ebmSerialNumber || '',
            ebmStatus: 'active',
            annualThreshold: 20_000_000,
            quarterlyThreshold: 5_000_000,
            complianceStatus,
        };
    }

    /**
     * Get offline queue for sync
     */
    getOfflineQueue(): RwandaEBMInvoice[] {
        return [...this.offlineQueue];
    }

    /**
     * Set online status
     */
    setOnlineStatus(isOnline: boolean): void {
        this.isOnline = isOnline;
    }

    /**
     * Process offline queue when back online
     */
    async processOfflineQueue(): Promise<{
        processed: number;
        failed: number;
        results: Array<{ invoice: string; success: boolean; error?: string }>;
    }> {
        if (!this.isOnline || this.offlineQueue.length === 0) {
            return { processed: 0, failed: 0, results: [] };
        }

        const results: Array<{ invoice: string; success: boolean; error?: string }> = [];
        let processed = 0;
        let failed = 0;

        for (const invoice of this.offlineQueue) {
            const result = await this.syncInvoiceToRRA(invoice);
            results.push({
                invoice: invoice.invoiceNumber,
                success: result.success,
                error: result.error,
            });

            if (result.success) {
                processed++;
            } else {
                failed++;
            }
        }

        // Clear processed invoices from queue
        this.offlineQueue = this.offlineQueue.filter(inv => inv.ebmStatus !== 'synced');

        return { processed, failed, results };
    }

    /**
     * Calculate withholding tax
     */
    calculateWithholdingTax(
        amount: number,
        type: 'services' | 'dividends' | 'rent'
    ): { amount: number; rate: number; withholdingAmount: number } {
        const rates: Record<typeof type, number> = {
            services: RWANDA_TAX_RATES.WITHHOLDING_TAX_SERVICES,
            dividends: RWANDA_TAX_RATES.WITHHOLDING_TAX_DIVIDENDS,
            rent: RWANDA_TAX_RATES.WITHHOLDING_TAX_RENT,
        };

        const rate = rates[type];
        const withholdingAmount = roundForCurrency(amount * (rate / 100), 'RWF');

        return {
            amount: roundForCurrency(amount, 'RWF'),
            rate,
            withholdingAmount,
        };
    }

    /**
     * Format amount for Rwanda
     */
    formatAmount(amount: number): string {
        return formatCurrency(amount, 'RWF');
    }

    /**
     * Get RRA eFiling guidance
     */
    getRRAeFilingGuidance(): string[] {
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
}

// Factory function
export function createRwandaEBMService(config?: RwandaEBMServiceConfig): RwandaEBMService {
    return new RwandaEBMService(config);
}
