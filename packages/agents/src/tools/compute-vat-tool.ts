import type { Tool, ToolExecutionContext, ToolResult } from './types.js';
import { computeVatReturnWithManifest, type VatInput } from './compute-vat.js';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
    return typeof value === 'string' && /\d{4}-\d{2}-\d{2}/.test(value);
}

function normaliseVatInput(params: unknown): VatInput | null {
    if (!isRecord(params)) return null;
    const jurisdiction = params.jurisdiction as VatInput['jurisdiction'];
    const period = params.period as VatInput['period'];
    const sales = params.sales as VatInput['sales'];
    const purchases = params.purchases as VatInput['purchases'];

    if (!jurisdiction || !period || !isIsoDate(period.start) || !isIsoDate(period.end)) {
        return null;
    }

    if (!Array.isArray(sales) || !Array.isArray(purchases)) {
        return null;
    }

    return params as VatInput;
}

export class ComputeVatReturnTool implements Tool {
    name = 'compute_vat_return';
    description = 'Compute VAT/GST return deterministically and emit a manifest hash.';
    requiresManifest = true;

    async execute(params: unknown, context?: ToolExecutionContext): Promise<ToolResult> {
        const input = normaliseVatInput(params);
        if (!input) {
            return {
                success: false,
                error: 'Invalid VAT input payload. Provide jurisdiction, period, sales, and purchases.',
            };
        }

        if (context?.jurisdictionCode && context.jurisdictionCode !== input.jurisdiction) {
            return {
                success: false,
                error: 'Jurisdiction mismatch between tool context and payload.',
            };
        }

        const { result, manifest } = computeVatReturnWithManifest(input);

        return {
            success: true,
            data: result,
            metadata: {
                deterministic: true,
                manifest,
                manifestHash: manifest.hash,
                manifestAlgorithm: manifest.algorithm,
            },
        };
    }
}

export const computeVatReturnTool = new ComputeVatReturnTool();
