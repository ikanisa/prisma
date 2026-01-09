/**
 * Compute VAT Return Tool (Deterministic)
 * 
 * Calculates VAT/GST return based on sales and purchases.
 * This is a DETERMINISTIC calculation - no LLM involved.
 */

import type { Jurisdiction } from '@prisma/db';

export interface VatInput {
    jurisdiction: Jurisdiction;
    period: {
        start: string;
        end: string;
    };
    sales: Array<{
        description: string;
        grossAmount: number;
        vatRate: number;  // e.g., 0.18 for 18%
        isExempt?: boolean;
    }>;
    purchases: Array<{
        description: string;
        grossAmount: number;
        vatRate: number;
        isDeductible?: boolean;
    }>;
    adjustments?: Array<{
        type: 'credit_note' | 'bad_debt' | 'correction';
        amount: number;
        isOutput: boolean;  // true = affects output VAT, false = input VAT
    }>;
}

export interface VatResult {
    jurisdiction: Jurisdiction;
    period: { start: string; end: string };

    // Output VAT (collected from customers)
    outputVat: {
        taxableSales: number;
        exemptSales: number;
        totalSales: number;
        vatCollected: number;
        adjustments: number;
        netOutputVat: number;
    };

    // Input VAT (paid to suppliers)
    inputVat: {
        taxablePurchases: number;
        nonDeductiblePurchases: number;
        totalPurchases: number;
        vatPaid: number;
        adjustments: number;
        netInputVat: number;
    };

    // Net position
    netPayable: number;  // Positive = pay to authority, Negative = refund

    // Summary by rate
    summaryByRate: Array<{
        rate: number;
        outputVat: number;
        inputVat: number;
        net: number;
    }>;
}

/**
 * Standard VAT rates by jurisdiction
 */
const VAT_RATES: Record<Jurisdiction, { standard: number; reduced?: number[]; name: string }> = {
    RW: { standard: 0.18, name: 'VAT' },
    MT: { standard: 0.18, reduced: [0.07, 0.05, 0], name: 'VAT' },
    CA: { standard: 0.05, name: 'GST' },  // Federal only, HST varies by province
};

/**
 * Compute VAT/GST return (deterministic calculation)
 */
export function computeVatReturn(input: VatInput): VatResult {
    const { jurisdiction, period, sales, purchases, adjustments = [] } = input;
    const vatInfo = VAT_RATES[jurisdiction];

    // Calculate output VAT from sales
    let taxableSales = 0;
    let exemptSales = 0;
    let vatCollected = 0;
    const outputByRate = new Map<number, number>();

    for (const sale of sales) {
        if (sale.isExempt) {
            exemptSales += sale.grossAmount;
        } else {
            const netAmount = sale.grossAmount / (1 + sale.vatRate);
            const vat = sale.grossAmount - netAmount;
            taxableSales += netAmount;
            vatCollected += vat;

            outputByRate.set(
                sale.vatRate,
                (outputByRate.get(sale.vatRate) || 0) + vat
            );
        }
    }

    // Calculate input VAT from purchases
    let taxablePurchases = 0;
    let nonDeductiblePurchases = 0;
    let vatPaid = 0;
    const inputByRate = new Map<number, number>();

    for (const purchase of purchases) {
        const netAmount = purchase.grossAmount / (1 + purchase.vatRate);
        const vat = purchase.grossAmount - netAmount;

        if (purchase.isDeductible === false) {
            nonDeductiblePurchases += netAmount;
        } else {
            taxablePurchases += netAmount;
            vatPaid += vat;

            inputByRate.set(
                purchase.vatRate,
                (inputByRate.get(purchase.vatRate) || 0) + vat
            );
        }
    }

    // Apply adjustments
    let outputAdjustments = 0;
    let inputAdjustments = 0;

    for (const adj of adjustments) {
        if (adj.isOutput) {
            outputAdjustments += adj.amount;
        } else {
            inputAdjustments += adj.amount;
        }
    }

    // Calculate net amounts
    const netOutputVat = vatCollected + outputAdjustments;
    const netInputVat = vatPaid + inputAdjustments;
    const netPayable = netOutputVat - netInputVat;

    // Build summary by rate
    const allRates = new Set([...outputByRate.keys(), ...inputByRate.keys()]);
    const summaryByRate = Array.from(allRates).map(rate => ({
        rate,
        outputVat: round(outputByRate.get(rate) || 0),
        inputVat: round(inputByRate.get(rate) || 0),
        net: round((outputByRate.get(rate) || 0) - (inputByRate.get(rate) || 0)),
    })).sort((a, b) => b.rate - a.rate);

    return {
        jurisdiction,
        period,
        outputVat: {
            taxableSales: round(taxableSales),
            exemptSales: round(exemptSales),
            totalSales: round(taxableSales + exemptSales),
            vatCollected: round(vatCollected),
            adjustments: round(outputAdjustments),
            netOutputVat: round(netOutputVat),
        },
        inputVat: {
            taxablePurchases: round(taxablePurchases),
            nonDeductiblePurchases: round(nonDeductiblePurchases),
            totalPurchases: round(taxablePurchases + nonDeductiblePurchases),
            vatPaid: round(vatPaid),
            adjustments: round(inputAdjustments),
            netInputVat: round(netInputVat),
        },
        netPayable: round(netPayable),
        summaryByRate,
    };
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

/**
 * Get VAT rate info for a jurisdiction
 */
export function getVatRateInfo(jurisdiction: Jurisdiction): typeof VAT_RATES[Jurisdiction] {
    return VAT_RATES[jurisdiction];
}
