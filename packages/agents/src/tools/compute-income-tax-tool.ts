import type { Tool, ToolExecutionContext, ToolResult } from './types.js';
import { computeIncomeTax, type IncomeTaxInput } from './compute-income-tax.js';
import { createDeterministicManifest } from './deterministic-manifest.js';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normaliseInput(params: unknown): IncomeTaxInput | null {
    if (!isRecord(params)) return null;
    if (!params.jurisdiction || typeof params.taxYear !== 'number' || typeof params.taxableIncome !== 'number') {
        return null;
    }

    return params as IncomeTaxInput;
}

export class ComputeIncomeTaxTool implements Tool {
    name = 'compute_income_tax';
    description = 'Compute corporate income tax deterministically and emit a manifest hash.';
    requiresManifest = true;

    async execute(params: unknown, context?: ToolExecutionContext): Promise<ToolResult> {
        const input = normaliseInput(params);
        if (!input) {
            return {
                success: false,
                error: 'Invalid income tax payload. Provide jurisdiction, taxYear, and taxableIncome.',
            };
        }

        if (context?.jurisdictionCode && context.jurisdictionCode !== input.jurisdiction) {
            return {
                success: false,
                error: 'Jurisdiction mismatch between tool context and payload.',
            };
        }

        try {
            const result = computeIncomeTax(input);
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
                error: error instanceof Error ? error.message : 'Income tax computation failed.',
            };
        }
    }
}

export const computeIncomeTaxTool = new ComputeIncomeTaxTool();
