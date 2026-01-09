/**
 * Compute Income Tax Tool (Deterministic)
 *
 * Calculates corporate income tax using jurisdiction-specific base rates.
 * This is a deterministic calculation - no LLM involved.
 */

import type { Jurisdiction } from '@prisma/db';

export interface IncomeTaxAdjustment {
    description: string;
    amount: number;
    type: 'add' | 'deduct';
}

export interface IncomeTaxCredit {
    description: string;
    amount: number;
    refundable?: boolean;
}

export interface IncomeTaxInput {
    jurisdiction: Jurisdiction;
    taxYear: number;
    taxableIncome: number;
    adjustments?: IncomeTaxAdjustment[];
    credits?: IncomeTaxCredit[];
    rateOverride?: number;
    evidenceIds?: string[];
}

export interface IncomeTaxResult {
    jurisdiction: Jurisdiction;
    taxYear: number;
    taxableIncome: number;
    adjustedTaxableIncome: number;
    rate: number;
    grossTax: number;
    credits: {
        total: number;
        refundable: number;
        nonRefundable: number;
    };
    taxDue: number;
    effectiveRate: number;
    adjustments: IncomeTaxAdjustment[];
    warnings: string[];
}

const DEFAULT_CORP_RATES: Record<Jurisdiction, number | null> = {
    RW: 0.30,
    MT: 0.35,
    CA: null,
};

export function computeIncomeTax(input: IncomeTaxInput): IncomeTaxResult {
    const adjustments = input.adjustments ?? [];
    const credits = input.credits ?? [];
    const warnings: string[] = [];

    if (input.taxableIncome < 0) {
        warnings.push('Taxable income is negative; confirm loss treatment.');
    }

    const baseRate = DEFAULT_CORP_RATES[input.jurisdiction];
    const rate = resolveRate(input.rateOverride, baseRate, warnings, input.jurisdiction);

    const adjustedTaxableIncome = round(
        input.taxableIncome +
            adjustments.reduce((sum, item) => sum + (item.type === 'add' ? item.amount : -item.amount), 0)
    );

    const grossTax = round(Math.max(0, adjustedTaxableIncome) * rate);

    const { refundable, nonRefundable } = splitCredits(credits);
    const nonRefundableApplied = Math.min(grossTax, nonRefundable);
    const taxAfterNonRefundable = round(grossTax - nonRefundableApplied);
    const taxDue = round(Math.max(0, taxAfterNonRefundable - refundable));

    const effectiveRate = adjustedTaxableIncome > 0 ? round(taxDue / adjustedTaxableIncome) : 0;

    return {
        jurisdiction: input.jurisdiction,
        taxYear: input.taxYear,
        taxableIncome: round(input.taxableIncome),
        adjustedTaxableIncome,
        rate,
        grossTax,
        credits: {
            total: round(refundable + nonRefundable),
            refundable: round(refundable),
            nonRefundable: round(nonRefundable),
        },
        taxDue,
        effectiveRate,
        adjustments,
        warnings,
    };
}

function resolveRate(
    override: number | undefined,
    baseRate: number | null,
    warnings: string[],
    jurisdiction: Jurisdiction
): number {
    if (override !== undefined) {
        return validateRate(override, warnings, 'override');
    }

    if (baseRate === null) {
        throw new Error(`Rate override required for jurisdiction ${jurisdiction}.`);
    }

    return validateRate(baseRate, warnings, 'default');
}

function validateRate(rate: number, warnings: string[], source: string): number {
    if (rate <= 0 || rate > 1) {
        throw new Error(`Invalid ${source} rate: ${rate}. Provide a decimal between 0 and 1.`);
    }

    if (rate > 0.4) {
        warnings.push('Rate exceeds 40%; confirm jurisdiction settings.');
    }

    return rate;
}

function splitCredits(credits: IncomeTaxCredit[]): { refundable: number; nonRefundable: number } {
    return credits.reduce(
        (acc, credit) => {
            if (credit.refundable) {
                acc.refundable += credit.amount;
            } else {
                acc.nonRefundable += credit.amount;
            }
            return acc;
        },
        { refundable: 0, nonRefundable: 0 }
    );
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}
