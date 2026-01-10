/**
 * Canada GST/HST Engine
 * 
 * Multi-provincial tax engine for Canadian GST, HST, PST, and QST
 * 
 * Tax Structure:
 * - Federal GST: 5% (applies nationwide)
 * - HST Provinces: ON (13%), NS (15%), NB (15%), NL (15%), PE (15%)
 * - GST + PST: BC (5%+7%), SK (5%+6%), MB (5%+7%)
 * - GST + QST: QC (5%+9.975%)
 * - GST Only: AB, NT, NU, YT
 */

import type {
    CanadaGSTHSTCalculation,
    CanadaTaxMethod,
    CanadianProvince,
    CanadaProvincialRates,
    CanadaITC,
    CanadaNexusStatus,
} from '../types/jurisdictions.js';
import {
    CANADA_THRESHOLDS,
    roundForCurrency,
    formatCurrency,
    checkThreshold,
} from '../utils/currency.js';

// ============================================================================
// PROVINCIAL TAX RATES (2024-2025)
// ============================================================================

export const CANADA_PROVINCIAL_RATES: Record<CanadianProvince, CanadaProvincialRates> = {
    // HST Provinces (combined rate)
    ON: { province: 'ON', method: 'HST', gst: 0, hst: 13, pst: 0, qst: 0, combined: 13 },
    NS: { province: 'NS', method: 'HST', gst: 0, hst: 15, pst: 0, qst: 0, combined: 15 },  // Reduced to 14% April 2025
    NB: { province: 'NB', method: 'HST', gst: 0, hst: 15, pst: 0, qst: 0, combined: 15 },
    NL: { province: 'NL', method: 'HST', gst: 0, hst: 15, pst: 0, qst: 0, combined: 15 },
    PE: { province: 'PE', method: 'HST', gst: 0, hst: 15, pst: 0, qst: 0, combined: 15 },

    // GST + PST Provinces
    BC: { province: 'BC', method: 'GST_PST', gst: 5, hst: 0, pst: 7, qst: 0, combined: 12 },
    SK: { province: 'SK', method: 'GST_PST', gst: 5, hst: 0, pst: 6, qst: 0, combined: 11 },
    MB: { province: 'MB', method: 'GST_PST', gst: 5, hst: 0, pst: 7, qst: 0, combined: 12 },

    // GST + QST (Quebec)
    QC: { province: 'QC', method: 'GST_QST', gst: 5, hst: 0, pst: 0, qst: 9.975, combined: 14.975 },

    // GST Only (Alberta + Territories)
    AB: { province: 'AB', method: 'GST_ONLY', gst: 5, hst: 0, pst: 0, qst: 0, combined: 5 },
    NT: { province: 'NT', method: 'GST_ONLY', gst: 5, hst: 0, pst: 0, qst: 0, combined: 5 },
    NU: { province: 'NU', method: 'GST_ONLY', gst: 5, hst: 0, pst: 0, qst: 0, combined: 5 },
    YT: { province: 'YT', method: 'GST_ONLY', gst: 5, hst: 0, pst: 0, qst: 0, combined: 5 },
};

// Provinces with HST (for quick lookup)
export const HST_PROVINCES: CanadianProvince[] = ['ON', 'NS', 'NB', 'NL', 'PE'];
export const PST_PROVINCES: CanadianProvince[] = ['BC', 'SK', 'MB'];
export const GST_ONLY_PROVINCES: CanadianProvince[] = ['AB', 'NT', 'NU', 'YT'];

// ============================================================================
// CANADA GST/HST ENGINE
// ============================================================================

export interface CanadaGSTEngineConfig {
    organizationId?: string;
    userId?: string;
}

export class CanadaGSTEngine {
    constructor(private config: CanadaGSTEngineConfig = {}) { }

    /**
     * Calculate GST/HST/PST for a transaction
     */
    calculateTax(
        netAmount: number,
        province: CanadianProvince,
        options?: {
            supplyType?: 'taxable' | 'zero_rated' | 'exempt';
            indigenousExempt?: boolean;
        }
    ): CanadaGSTHSTCalculation {
        const rates = CANADA_PROVINCIAL_RATES[province];

        // Zero-rated or exempt supplies
        if (options?.supplyType === 'zero_rated' || options?.supplyType === 'exempt') {
            return this.createZeroRatedResult(netAmount, province, rates.method);
        }

        // Indigenous exemption (Status card)
        if (options?.indigenousExempt) {
            return this.createExemptResult(netAmount, province, rates.method);
        }

        // Calculate based on province method
        switch (rates.method) {
            case 'HST':
                return this.calculateHST(netAmount, province, rates);
            case 'GST_PST':
                return this.calculateGSTPlusPST(netAmount, province, rates);
            case 'GST_QST':
                return this.calculateGSTPlusQST(netAmount, province, rates);
            case 'GST_ONLY':
            default:
                return this.calculateGSTOnly(netAmount, province, rates);
        }
    }

    /**
     * Calculate Input Tax Credits (ITCs)
     */
    calculateITC(
        expenses: { amount: number; gstHstPaid: number; documentation: 'complete' | 'incomplete' | 'missing' }[],
        claimPeriod: string
    ): CanadaITC {
        // ITCs can only be claimed with complete documentation
        const eligibleExpenses = expenses.filter(e => e.documentation === 'complete');

        const totalEligible = eligibleExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalITC = eligibleExpenses.reduce((sum, e) => sum + e.gstHstPaid, 0);

        const hasIncomplete = expenses.some(e =>
            e.documentation === 'incomplete' || e.documentation === 'missing'
        );

        return {
            eligibleExpenses: roundForCurrency(totalEligible, 'CAD'),
            itcAmount: roundForCurrency(totalITC, 'CAD'),
            documentation: hasIncomplete
                ? (expenses.some(e => e.documentation === 'missing') ? 'missing' : 'incomplete')
                : 'complete',
            claimPeriod,
        };
    }

    /**
     * Check filing frequency based on annual revenue
     */
    getFilingFrequency(annualRevenue: number): 'annual' | 'quarterly' | 'monthly' {
        if (annualRevenue > CANADA_THRESHOLDS.QUARTERLY_FILER_MAX) {
            return 'monthly';
        } else if (annualRevenue > CANADA_THRESHOLDS.ANNUAL_FILER_MAX) {
            return 'quarterly';
        }
        return 'annual';
    }

    /**
     * Check GST/HST registration requirement
     */
    checkRegistrationRequired(trailing4QuarterRevenue: number): {
        required: boolean;
        threshold: number;
        currentRevenue: number;
        percentageOfThreshold: number;
    } {
        const check = checkThreshold(trailing4QuarterRevenue, CANADA_THRESHOLDS.GST_REGISTRATION, 'CAD');
        return {
            required: check.exceeded,
            threshold: check.threshold,
            currentRevenue: check.currentAmount,
            percentageOfThreshold: check.percentageOfThreshold,
        };
    }

    /**
     * Check economic nexus across provinces
     */
    checkNexusStatus(
        physicalPresenceProvinces: CanadianProvince[],
        revenueByProvince: Record<CanadianProvince, number>
    ): CanadaNexusStatus {
        const totalRevenue = Object.values(revenueByProvince).reduce((sum, r) => sum + r, 0);
        const hasEconomicNexus = totalRevenue >= CANADA_THRESHOLDS.GST_REGISTRATION;

        // Provinces where registration is required
        const registrationProvinces = new Set<CanadianProvince>();

        // Physical presence always creates nexus
        physicalPresenceProvinces.forEach(p => registrationProvinces.add(p));

        // PST provinces have separate registration requirements
        for (const [province, revenue] of Object.entries(revenueByProvince)) {
            if (PST_PROVINCES.includes(province as CanadianProvince) && revenue > 0) {
                registrationProvinces.add(province as CanadianProvince);
            }
        }

        return {
            hasPhysicalPresence: physicalPresenceProvinces.length > 0,
            hasEconomicNexus,
            trailing12MonthRevenue: totalRevenue,
            registrationRequired: hasEconomicNexus || physicalPresenceProvinces.length > 0,
            provinces: Array.from(registrationProvinces),
        };
    }

    /**
     * Get rates for a specific province
     */
    getProvincialRates(province: CanadianProvince): CanadaProvincialRates {
        return CANADA_PROVINCIAL_RATES[province];
    }

    /**
     * Get all provincial rates
     */
    getAllProvincialRates(): CanadaProvincialRates[] {
        return Object.values(CANADA_PROVINCIAL_RATES);
    }

    /**
     * Format amount for Canada
     */
    formatAmount(amount: number): string {
        return formatCurrency(amount, 'CAD');
    }

    // Private calculation methods

    private calculateHST(
        netAmount: number,
        province: CanadianProvince,
        rates: CanadaProvincialRates
    ): CanadaGSTHSTCalculation {
        const hstAmount = roundForCurrency(netAmount * (rates.hst / 100), 'CAD');
        const grossAmount = roundForCurrency(netAmount + hstAmount, 'CAD');

        return {
            netAmount: roundForCurrency(netAmount, 'CAD'),
            grossAmount,
            province,
            method: 'HST',
            gstAmount: 0,
            hstAmount,
            pstAmount: 0,
            qstAmount: 0,
            totalTax: hstAmount,
            currency: 'CAD',
            breakdown: [
                { component: 'HST', rate: rates.hst, amount: hstAmount },
            ],
        };
    }

    private calculateGSTPlusPST(
        netAmount: number,
        province: CanadianProvince,
        rates: CanadaProvincialRates
    ): CanadaGSTHSTCalculation {
        const gstAmount = roundForCurrency(netAmount * (rates.gst / 100), 'CAD');
        const pstAmount = roundForCurrency(netAmount * (rates.pst / 100), 'CAD');
        const totalTax = roundForCurrency(gstAmount + pstAmount, 'CAD');
        const grossAmount = roundForCurrency(netAmount + totalTax, 'CAD');

        return {
            netAmount: roundForCurrency(netAmount, 'CAD'),
            grossAmount,
            province,
            method: 'GST_PST',
            gstAmount,
            hstAmount: 0,
            pstAmount,
            qstAmount: 0,
            totalTax,
            currency: 'CAD',
            breakdown: [
                { component: 'GST', rate: rates.gst, amount: gstAmount },
                { component: 'PST', rate: rates.pst, amount: pstAmount },
            ],
        };
    }

    private calculateGSTPlusQST(
        netAmount: number,
        province: CanadianProvince,
        rates: CanadaProvincialRates
    ): CanadaGSTHSTCalculation {
        const gstAmount = roundForCurrency(netAmount * (rates.gst / 100), 'CAD');
        // QST is calculated on net amount (not on GST-inclusive amount since 2013)
        const qstAmount = roundForCurrency(netAmount * (rates.qst / 100), 'CAD');
        const totalTax = roundForCurrency(gstAmount + qstAmount, 'CAD');
        const grossAmount = roundForCurrency(netAmount + totalTax, 'CAD');

        return {
            netAmount: roundForCurrency(netAmount, 'CAD'),
            grossAmount,
            province,
            method: 'GST_QST',
            gstAmount,
            hstAmount: 0,
            pstAmount: 0,
            qstAmount,
            totalTax,
            currency: 'CAD',
            breakdown: [
                { component: 'GST', rate: rates.gst, amount: gstAmount },
                { component: 'QST', rate: rates.qst, amount: qstAmount },
            ],
        };
    }

    private calculateGSTOnly(
        netAmount: number,
        province: CanadianProvince,
        rates: CanadaProvincialRates
    ): CanadaGSTHSTCalculation {
        const gstAmount = roundForCurrency(netAmount * (rates.gst / 100), 'CAD');
        const grossAmount = roundForCurrency(netAmount + gstAmount, 'CAD');

        return {
            netAmount: roundForCurrency(netAmount, 'CAD'),
            grossAmount,
            province,
            method: 'GST_ONLY',
            gstAmount,
            hstAmount: 0,
            pstAmount: 0,
            qstAmount: 0,
            totalTax: gstAmount,
            currency: 'CAD',
            breakdown: [
                { component: 'GST', rate: rates.gst, amount: gstAmount },
            ],
        };
    }

    private createZeroRatedResult(
        netAmount: number,
        province: CanadianProvince,
        method: CanadaTaxMethod
    ): CanadaGSTHSTCalculation {
        return {
            netAmount: roundForCurrency(netAmount, 'CAD'),
            grossAmount: roundForCurrency(netAmount, 'CAD'),
            province,
            method,
            gstAmount: 0,
            hstAmount: 0,
            pstAmount: 0,
            qstAmount: 0,
            totalTax: 0,
            currency: 'CAD',
            breakdown: [],
        };
    }

    private createExemptResult(
        netAmount: number,
        province: CanadianProvince,
        method: CanadaTaxMethod
    ): CanadaGSTHSTCalculation {
        return {
            netAmount: roundForCurrency(netAmount, 'CAD'),
            grossAmount: roundForCurrency(netAmount, 'CAD'),
            province,
            method,
            gstAmount: 0,
            hstAmount: 0,
            pstAmount: 0,
            qstAmount: 0,
            totalTax: 0,
            currency: 'CAD',
            breakdown: [{ component: 'Indigenous Exemption', rate: 0, amount: 0 }],
        };
    }
}

// Factory function
export function createCanadaGSTEngine(config?: CanadaGSTEngineConfig): CanadaGSTEngine {
    return new CanadaGSTEngine(config);
}
