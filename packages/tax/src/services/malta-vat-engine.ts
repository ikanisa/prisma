/**
 * Malta VAT Engine
 * 
 * Full VAT calculation engine for Malta compliant with Value Added Tax Act (XXIII/1998)
 * 
 * Rate Structure:
 * - Standard: 18%
 * - Reduced 12%: Financial services, health services
 * - Reduced 7%: Hotel accommodation, sports facilities
 * - Reduced 5%: Electricity, books, medical equipment, cultural events
 * - Zero: Exports, medicines, international transport
 * - Exempt: Insurance, financial transactions, education
 */

import type {
    MaltaVATCalculation,
    MaltaVATRateType,
    MaltaVATRate,
    MaltaSMESchemeCheck,
    MaltaVATRegistration,
} from '../types/jurisdictions.js';
import {
    MALTA_THRESHOLDS,
    roundForCurrency,
    formatCurrency,
    checkThreshold,
} from '../utils/currency.js';

// ============================================================================
// MALTA VAT RATES (2024-2025)
// ============================================================================

export const MALTA_VAT_RATES: Record<MaltaVATRateType, MaltaVATRate> = {
    standard: {
        type: 'standard',
        rate: 18,
        categories: ['General goods and services', 'Professional services'],
        legalReference: 'VAT Act Article 12(1)',
    },
    reduced_12: {
        type: 'reduced_12',
        rate: 12,
        categories: [
            'Financial services (non-exempt)',
            'Health services (non-exempt)',
            'Private health insurance',
        ],
        legalReference: 'VAT Act Schedule 6A',
    },
    reduced_7: {
        type: 'reduced_7',
        rate: 7,
        categories: [
            'Hotel accommodation',
            'Sports facilities',
            'Cultural services',
            'Package travel (within Malta)',
        ],
        legalReference: 'VAT Act Schedule 6B',
    },
    reduced_5: {
        type: 'reduced_5',
        rate: 5,
        categories: [
            'Electricity supply',
            'Confectionery',
            'Books and periodicals',
            'Medical accessories and equipment',
            'Minor renovation of private dwellings',
            'Cultural events (admission)',
            'Sanitary goods',
        ],
        legalReference: 'VAT Act Schedule 6C',
    },
    zero: {
        type: 'zero',
        rate: 0,
        categories: [
            'Export of goods to third countries',
            'Intra-EU supplies (with valid VAT number)',
            'Medicine for human use',
            'International passenger transport',
            'International freight transport',
            'Certain food items',
        ],
        legalReference: 'VAT Act Schedule 4',
    },
    exempt: {
        type: 'exempt',
        rate: 0,
        categories: [
            'Insurance and reinsurance',
            'Financial transactions',
            'Education services',
            'Medical services',
            'Social welfare',
            'Postal services',
            'Betting and lottery',
        ],
        legalReference: 'VAT Act Schedule 5',
    },
};

// ============================================================================
// MALTA VAT ENGINE
// ============================================================================

export interface MaltaVATEngineConfig {
    organizationId?: string;
    userId?: string;
}

export class MaltaVATEngine {
    constructor(private config: MaltaVATEngineConfig = {}) { }

    /**
     * Calculate VAT for a transaction
     */
    calculateVAT(
        netAmount: number,
        rateType: MaltaVATRateType = 'standard',
        options?: {
            customerVATNumber?: string;
            customerCountry?: string;
            isB2B?: boolean;
        }
    ): MaltaVATCalculation {
        const rate = MALTA_VAT_RATES[rateType];

        // Check for reverse charge (B2B intra-EU)
        if (this.isReverseChargeApplicable(options)) {
            return {
                netAmount: roundForCurrency(netAmount, 'EUR'),
                vatAmount: 0,
                vatRate: 0,
                grossAmount: roundForCurrency(netAmount, 'EUR'),
                rateType: 'zero',
                reverseCharge: true,
                currency: 'EUR',
                rationale: 'Reverse charge applicable - Intra-EU B2B supply',
            };
        }

        const vatAmount = roundForCurrency(netAmount * (rate.rate / 100), 'EUR');
        const grossAmount = roundForCurrency(netAmount + vatAmount, 'EUR');

        return {
            netAmount: roundForCurrency(netAmount, 'EUR'),
            vatAmount,
            vatRate: rate.rate,
            grossAmount,
            rateType,
            reverseCharge: false,
            currency: 'EUR',
            rationale: `${rate.type} rate (${rate.rate}%) applied - ${rate.legalReference}`,
        };
    }

    /**
     * Calculate VAT from gross amount (reverse calculation)
     */
    calculateVATFromGross(
        grossAmount: number,
        rateType: MaltaVATRateType = 'standard'
    ): MaltaVATCalculation {
        const rate = MALTA_VAT_RATES[rateType];

        const netAmount = roundForCurrency(grossAmount / (1 + rate.rate / 100), 'EUR');
        const vatAmount = roundForCurrency(grossAmount - netAmount, 'EUR');

        return {
            netAmount,
            vatAmount,
            vatRate: rate.rate,
            grossAmount: roundForCurrency(grossAmount, 'EUR'),
            rateType,
            reverseCharge: false,
            currency: 'EUR',
        };
    }

    /**
     * Check SME scheme eligibility (Article 11/11A/11B)
     */
    checkSMESchemeEligibility(
        domesticTurnover: number,
        euWideTurnover: number = 0
    ): MaltaSMESchemeCheck {
        const article11Eligible = domesticTurnover < MALTA_THRESHOLDS.ARTICLE_11_DOMESTIC;
        const article11AEligible = euWideTurnover < MALTA_THRESHOLDS.ARTICLE_11A_EU_WIDE;

        let recommendation: string;
        let nextAction: string;

        if (!article11Eligible && !article11AEligible) {
            recommendation = 'Standard VAT registration required - both domestic and EU thresholds exceeded';
            nextAction = 'REGISTER_ARTICLE_10';
        } else if (article11Eligible && article11AEligible) {
            recommendation = 'Eligible for SME domestic exemption and EU cross-border exemption';
            nextAction = 'EVALUATE_ARTICLE_11A';
        } else if (article11Eligible && !article11AEligible) {
            recommendation = 'Eligible for domestic exemption only - EU threshold exceeded';
            nextAction = 'REGISTER_FOR_EU_SALES';
        } else {
            recommendation = 'Consider EU SME scheme for cross-border exemption';
            nextAction = 'REGISTER_ARTICLE_11A';
        }

        return {
            domesticTurnover,
            euWideTurnover,
            article11Eligible,
            article11AEligible,
            article11BEligible: false, // For foreign SMEs - requires additional checks
            recommendation,
            nextAction,
        };
    }

    /**
     * Check VAT registration requirements
     */
    checkRegistrationRequired(
        turnover: number,
        supplyType: 'goods' | 'services' = 'services'
    ): MaltaVATRegistration {
        const threshold = supplyType === 'goods'
            ? MALTA_THRESHOLDS.ARTICLE_10_GOODS
            : MALTA_THRESHOLDS.ARTICLE_10_SERVICES;

        const thresholdCheck = checkThreshold(turnover, threshold, 'EUR');

        return {
            type: thresholdCheck.exceeded ? 'Article10' : 'Article11',
            threshold,
            thresholdExceeded: thresholdCheck.exceeded,
            registrationRequired: thresholdCheck.exceeded,
            crossBorderEnabled: false,
        };
    }

    /**
     * Check if Intrastat reporting required
     */
    checkIntrastatRequired(euTradVolume: number): {
        required: boolean;
        threshold: number;
        currentVolume: number;
    } {
        return {
            required: euTradVolume > MALTA_THRESHOLDS.INTRASTAT,
            threshold: MALTA_THRESHOLDS.INTRASTAT,
            currentVolume: euTradVolume,
        };
    }

    /**
     * Get applicable VAT rate for a category
     */
    getRateForCategory(category: string): MaltaVATRate | null {
        const normalizedCategory = category.toLowerCase();

        for (const [, rate] of Object.entries(MALTA_VAT_RATES)) {
            if (rate.categories.some(c => c.toLowerCase().includes(normalizedCategory))) {
                return rate;
            }
        }

        return MALTA_VAT_RATES.standard; // Default to standard rate
    }

    /**
     * Get all available rates
     */
    getAllRates(): MaltaVATRate[] {
        return Object.values(MALTA_VAT_RATES);
    }

    /**
     * Format amount for Malta
     */
    formatAmount(amount: number): string {
        return formatCurrency(amount, 'EUR');
    }

    /**
     * Check if reverse charge applies
     */
    private isReverseChargeApplicable(options?: {
        customerVATNumber?: string;
        customerCountry?: string;
        isB2B?: boolean;
    }): boolean {
        if (!options) return false;

        // B2B intra-EU supply with valid VAT number
        const isEU = this.isEUCountry(options.customerCountry);
        const hasVATNumber = !!options.customerVATNumber;
        const isB2B = options.isB2B === true;

        return isEU && hasVATNumber && isB2B && options.customerCountry !== 'MT';
    }

    /**
     * Check if country is in EU
     */
    private isEUCountry(countryCode?: string): boolean {
        const euCountries = [
            'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
            'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
            'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
        ];
        return !!countryCode && euCountries.includes(countryCode.toUpperCase());
    }
}

// Factory function
export function createMaltaVATEngine(config?: MaltaVATEngineConfig): MaltaVATEngine {
    return new MaltaVATEngine(config);
}
