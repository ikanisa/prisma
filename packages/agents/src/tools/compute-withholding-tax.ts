/**
 * Compute Withholding Tax Tool (Deterministic)
 *
 * Calculates withholding tax for cross-border payments.
 */

import type { Jurisdiction } from '@prisma/db';

export type WithholdingPaymentType = 'dividends' | 'interest' | 'royalties' | 'services' | 'fees';

export interface WithholdingTaxInput {
    jurisdiction: Jurisdiction;
    paymentType: WithholdingPaymentType;
    grossAmount: number;
    domesticRate?: number;
    treatyRate?: number;
    applyTreaty?: boolean;
    evidenceIds?: string[];
}

export interface WithholdingTaxResult {
    jurisdiction: Jurisdiction;
    paymentType: WithholdingPaymentType;
    grossAmount: number;
    rateApplied: number;
    taxWithheld: number;
    netAmount: number;
    basis: 'domestic' | 'treaty';
    warnings: string[];
}

const DEFAULT_WHT_RATES: Record<Jurisdiction, Partial<Record<WithholdingPaymentType, number>>> = {
    MT: {
        dividends: 0,
        interest: 0,
        royalties: 0,
        services: 0,
        fees: 0,
    },
    RW: {
        dividends: 0.15,
        interest: 0.15,
        royalties: 0.15,
        services: 0.15,
        fees: 0.15,
    },
    CA: {},
};

export function computeWithholdingTax(input: WithholdingTaxInput): WithholdingTaxResult {
    const warnings: string[] = [];

    const domesticRate = resolveDomesticRate(input, warnings);
    const { rateApplied, basis } = resolveAppliedRate(input, domesticRate, warnings);

    const taxWithheld = round(input.grossAmount * rateApplied);
    const netAmount = round(input.grossAmount - taxWithheld);

    if (rateApplied === 0) {
        warnings.push('Applied rate is 0%; confirm exemption or treaty eligibility.');
    }

    return {
        jurisdiction: input.jurisdiction,
        paymentType: input.paymentType,
        grossAmount: round(input.grossAmount),
        rateApplied,
        taxWithheld,
        netAmount,
        basis,
        warnings,
    };
}

function resolveDomesticRate(input: WithholdingTaxInput, warnings: string[]): number {
    if (input.domesticRate !== undefined) {
        return validateRate(input.domesticRate, warnings, 'domestic rate');
    }

    const defaults = DEFAULT_WHT_RATES[input.jurisdiction];
    const defaultRate = defaults?.[input.paymentType];

    if (defaultRate === undefined) {
        throw new Error(`Domestic rate required for ${input.jurisdiction} ${input.paymentType}.`);
    }

    return validateRate(defaultRate, warnings, 'default rate');
}

function resolveAppliedRate(
    input: WithholdingTaxInput,
    domesticRate: number,
    warnings: string[]
): { rateApplied: number; basis: 'domestic' | 'treaty' } {
    if (input.applyTreaty && input.treatyRate !== undefined) {
        const treatyRate = validateRate(input.treatyRate, warnings, 'treaty rate');
        if (treatyRate >= domesticRate) {
            warnings.push('Treaty rate is not lower than domestic rate; domestic rate applied.');
            return { rateApplied: domesticRate, basis: 'domestic' };
        }
        return { rateApplied: treatyRate, basis: 'treaty' };
    }

    if (input.applyTreaty && input.treatyRate === undefined) {
        warnings.push('Treaty rate not provided; domestic rate applied.');
    }

    return { rateApplied: domesticRate, basis: 'domestic' };
}

function validateRate(rate: number, warnings: string[], label: string): number {
    if (rate < 0 || rate > 1) {
        throw new Error(`Invalid ${label}: ${rate}. Provide a decimal between 0 and 1.`);
    }

    if (rate > 0.5) {
        warnings.push('Rate exceeds 50%; confirm the withholding rule.');
    }

    return rate;
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}
