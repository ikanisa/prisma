import type { Tool, ToolExecutionContext, ToolResult } from './types.js';
import { computeWithholdingTax, type WithholdingTaxInput } from './compute-withholding-tax.js';
import { createDeterministicManifest } from './deterministic-manifest.js';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normaliseInput(params: unknown): WithholdingTaxInput | null {
    if (!isRecord(params)) return null;
    if (!params.jurisdiction || !params.paymentType || typeof params.grossAmount !== 'number') {
        return null;
    }

    return params as WithholdingTaxInput;
}

export class ComputeWithholdingTaxTool implements Tool {
    name = 'compute_withholding_tax';
    description = 'Compute withholding tax deterministically and emit a manifest hash.';
    requiresManifest = true;

    async execute(params: unknown, context?: ToolExecutionContext): Promise<ToolResult> {
        const input = normaliseInput(params);
        if (!input) {
            return {
                success: false,
                error: 'Invalid withholding tax payload. Provide jurisdiction, paymentType, and grossAmount.',
            };
        }

        if (context?.jurisdictionCode && context.jurisdictionCode !== input.jurisdiction) {
            return {
                success: false,
                error: 'Jurisdiction mismatch between tool context and payload.',
            };
        }

        try {
            const result = computeWithholdingTax(input);
            const manifest = createDeterministicManifest({
                tool: this.name,
                inputs: input,
                outputs: result,
                evidenceIds: input.evidenceIds ?? [],
            });

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
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Withholding tax computation failed.',
            };
        }
    }
}

export const computeWithholdingTaxTool = new ComputeWithholdingTaxTool();
