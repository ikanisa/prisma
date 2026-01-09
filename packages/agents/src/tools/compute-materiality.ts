/**
 * Compute Materiality Tool (Deterministic)
 * 
 * Calculates audit materiality based on benchmark and rates.
 * This is a DETERMINISTIC calculation - no LLM involved.
 */

export interface MaterialityInput {
    benchmark: 'revenue' | 'total_assets' | 'profit_before_tax' | 'equity';
    benchmarkAmount: number;
    overallRate?: number;      // Default varies by benchmark
    performanceRate?: number;  // Default: 75% of overall
    trivialRate?: number;      // Default: 5% of overall
}

export interface MaterialityResult {
    benchmark: string;
    benchmarkAmount: number;
    overall: number;
    performance: number;
    trivial: number;
    rates: {
        overallRate: number;
        performanceRate: number;
        trivialRate: number;
    };
    rationale: string;
}

/**
 * Default rates by benchmark (ISA 320 guidance)
 */
const DEFAULT_RATES: Record<string, { min: number; max: number; typical: number }> = {
    revenue: { min: 0.005, max: 0.02, typical: 0.01 },        // 0.5% - 2%, typical 1%
    total_assets: { min: 0.005, max: 0.02, typical: 0.01 },   // 0.5% - 2%, typical 1%
    profit_before_tax: { min: 0.05, max: 0.10, typical: 0.05 }, // 5% - 10%, typical 5%
    equity: { min: 0.01, max: 0.05, typical: 0.02 },           // 1% - 5%, typical 2%
};

/**
 * Compute materiality (deterministic calculation)
 */
export function computeMateriality(input: MaterialityInput): MaterialityResult {
    const { benchmark, benchmarkAmount } = input;

    // Get default rates for the benchmark
    const defaults = DEFAULT_RATES[benchmark];
    if (!defaults) {
        throw new Error(`Unknown benchmark: ${benchmark}. Valid options: revenue, total_assets, profit_before_tax, equity`);
    }

    // Apply rates (use provided or default)
    const overallRate = input.overallRate ?? defaults.typical;
    const performanceRate = input.performanceRate ?? 0.75;  // 75% of overall
    const trivialRate = input.trivialRate ?? 0.05;          // 5% of overall

    // Calculate materiality amounts
    const overall = Math.round(benchmarkAmount * overallRate);
    const performance = Math.round(overall * performanceRate);
    const trivial = Math.round(overall * trivialRate);

    // Generate rationale
    const rationale = generateRationale(benchmark, overallRate, defaults);

    return {
        benchmark,
        benchmarkAmount,
        overall,
        performance,
        trivial,
        rates: {
            overallRate,
            performanceRate,
            trivialRate,
        },
        rationale,
    };
}

function generateRationale(
    benchmark: string,
    rate: number,
    defaults: { min: number; max: number; typical: number }
): string {
    const benchmarkLabel = benchmark.replace(/_/g, ' ');
    const ratePercent = (rate * 100).toFixed(1);
    const minPercent = (defaults.min * 100).toFixed(1);
    const maxPercent = (defaults.max * 100).toFixed(1);

    let ratePosition = 'within the typical range';
    if (rate < defaults.typical) {
        ratePosition = 'at the lower end of the range, reflecting a more conservative approach';
    } else if (rate > defaults.typical) {
        ratePosition = 'at the higher end of the range, appropriate for stable entities';
    }

    return `Materiality is based on ${benchmarkLabel} using a rate of ${ratePercent}%, which is ${ratePosition} of ${minPercent}% to ${maxPercent}% per ISA 320. Performance materiality is set at 75% of overall materiality to allow for aggregation of uncorrected misstatements. The trivial threshold is set at 5% of overall materiality per ISA 450.`;
}

/**
 * Validate materiality looks reasonable
 */
export function validateMateriality(
    result: MaterialityResult,
    entityProfile: { industry?: string; stability?: 'high' | 'medium' | 'low' }
): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check if materiality is too low (may cause inefficiency)
    if (result.overall < 1000) {
        warnings.push('Overall materiality is very low (<1,000). Consider if this creates audit inefficiency.');
    }

    // Check if rate is outside typical range
    const defaults = DEFAULT_RATES[result.benchmark];
    if (result.rates.overallRate < defaults.min) {
        warnings.push(`Rate (${(result.rates.overallRate * 100).toFixed(1)}%) is below typical minimum (${(defaults.min * 100).toFixed(1)}%). Document rationale.`);
    }
    if (result.rates.overallRate > defaults.max) {
        warnings.push(`Rate (${(result.rates.overallRate * 100).toFixed(1)}%) is above typical maximum (${(defaults.max * 100).toFixed(1)}%). Document rationale.`);
    }

    // Check for low stability entities
    if (entityProfile.stability === 'low' && result.rates.overallRate > defaults.typical) {
        warnings.push('Higher rate used for low-stability entity. Consider reducing.');
    }

    return {
        valid: warnings.length === 0,
        warnings,
    };
}
