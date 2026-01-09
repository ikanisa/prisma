/**
 * Statistical Analysis Utilities
 * 
 * Advanced statistical methods for audit risk assessment and fraud detection.
 * Includes Benford's Law analysis, Z-score outlier detection, and time-series analysis.
 */

// ============================================================================
// BENFORD'S LAW ANALYSIS
// ============================================================================

/**
 * Expected first-digit distribution according to Benford's Law
 * P(d) = log10(1 + 1/d) for d = 1, 2, ..., 9
 */
export const BENFORD_EXPECTED_DISTRIBUTION: Record<number, number> = {
    1: 0.301,
    2: 0.176,
    3: 0.125,
    4: 0.097,
    5: 0.079,
    6: 0.067,
    7: 0.058,
    8: 0.051,
    9: 0.046,
};

/**
 * Extract first significant digit from a number
 */
export function getFirstDigit(value: number): number | null {
    const absValue = Math.abs(value);
    if (absValue < 1) return null; // Skip small numbers

    const str = absValue.toString();
    for (const char of str) {
        if (char >= '1' && char <= '9') {
            return parseInt(char, 10);
        }
    }
    return null;
}

/**
 * Result of Benford's Law analysis
 */
export interface BenfordAnalysisResult {
    observedDistribution: Record<number, number>;
    expectedDistribution: Record<number, number>;
    chiSquareStatistic: number;
    pValue: number;
    meanAbsoluteDeviation: number;
    suspiciousDigits: number[];
    conclusion: 'conforming' | 'suspicious' | 'non_conforming';
    details: string;
}

/**
 * Perform Benford's Law analysis on a set of values
 * 
 * @param values - Array of numeric values to analyze
 * @param significanceLevel - Statistical significance level (default 0.05)
 */
export function analyzeBenfordDistribution(
    values: number[],
    significanceLevel: number = 0.05
): BenfordAnalysisResult {
    // Extract first digits
    const firstDigits: number[] = [];
    for (const value of values) {
        const digit = getFirstDigit(value);
        if (digit !== null) {
            firstDigits.push(digit);
        }
    }

    if (firstDigits.length < 100) {
        return {
            observedDistribution: {},
            expectedDistribution: BENFORD_EXPECTED_DISTRIBUTION,
            chiSquareStatistic: 0,
            pValue: 1,
            meanAbsoluteDeviation: 0,
            suspiciousDigits: [],
            conclusion: 'conforming',
            details: `Insufficient sample size (${firstDigits.length}). Need at least 100 values for reliable Benford analysis.`,
        };
    }

    // Calculate observed distribution
    const digitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    for (const digit of firstDigits) {
        digitCounts[digit]++;
    }

    const n = firstDigits.length;
    const observedDistribution: Record<number, number> = {};
    for (let d = 1; d <= 9; d++) {
        observedDistribution[d] = digitCounts[d] / n;
    }

    // Calculate Chi-Square statistic
    let chiSquare = 0;
    let totalDeviation = 0;
    const suspiciousDigits: number[] = [];

    for (let d = 1; d <= 9; d++) {
        const observed = digitCounts[d];
        const expected = BENFORD_EXPECTED_DISTRIBUTION[d] * n;

        chiSquare += Math.pow(observed - expected, 2) / expected;

        const deviation = Math.abs(observedDistribution[d] - BENFORD_EXPECTED_DISTRIBUTION[d]);
        totalDeviation += deviation;

        // Flag digits with deviation > 10%
        if (deviation > 0.1) {
            suspiciousDigits.push(d);
        }
    }

    const meanAbsoluteDeviation = totalDeviation / 9;

    // Calculate approximate p-value using chi-square distribution (df = 8)
    // This is a simplified approximation
    const pValue = chiSquarePValue(chiSquare, 8);

    // Determine conclusion
    let conclusion: 'conforming' | 'suspicious' | 'non_conforming';
    let details: string;

    if (pValue >= 0.1) {
        conclusion = 'conforming';
        details = `The distribution conforms to Benford's Law (χ² = ${chiSquare.toFixed(2)}, p = ${pValue.toFixed(3)}). No indication of data manipulation.`;
    } else if (pValue >= significanceLevel) {
        conclusion = 'suspicious';
        details = `The distribution shows some deviation from Benford's Law (χ² = ${chiSquare.toFixed(2)}, p = ${pValue.toFixed(3)}). ${suspiciousDigits.length > 0 ? `Suspicious digits: ${suspiciousDigits.join(', ')}` : ''}`;
    } else {
        conclusion = 'non_conforming';
        details = `The distribution significantly deviates from Benford's Law (χ² = ${chiSquare.toFixed(2)}, p = ${pValue.toFixed(3)}). This may indicate data manipulation or non-natural data generation.`;
    }

    return {
        observedDistribution,
        expectedDistribution: BENFORD_EXPECTED_DISTRIBUTION,
        chiSquareStatistic: chiSquare,
        pValue,
        meanAbsoluteDeviation,
        suspiciousDigits,
        conclusion,
        details,
    };
}

// ============================================================================
// Z-SCORE OUTLIER DETECTION
// ============================================================================

/**
 * Result of Z-score analysis for a single value
 */
export interface ZScoreResult {
    value: number;
    zScore: number;
    isOutlier: boolean;
    direction: 'high' | 'low' | 'normal';
    severity: 'extreme' | 'significant' | 'moderate' | 'normal';
}

/**
 * Summary statistics for a dataset
 */
export interface DatasetStatistics {
    mean: number;
    median: number;
    stdDev: number;
    variance: number;
    min: number;
    max: number;
    count: number;
    q1: number;
    q3: number;
    iqr: number;
    skewness: number;
    kurtosis: number;
}

/**
 * Calculate comprehensive statistics for a dataset
 */
export function calculateStatistics(values: number[]): DatasetStatistics {
    if (values.length === 0) {
        return {
            mean: 0, median: 0, stdDev: 0, variance: 0,
            min: 0, max: 0, count: 0, q1: 0, q3: 0, iqr: 0,
            skewness: 0, kurtosis: 0,
        };
    }

    const n = values.length;
    const sorted = [...values].sort((a, b) => a - b);

    // Mean
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    // Median
    const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    // Variance and Standard Deviation
    const sumSquaredDiff = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    const variance = sumSquaredDiff / n;
    const stdDev = Math.sqrt(variance);

    // Quartiles
    const q1Idx = Math.floor(n * 0.25);
    const q3Idx = Math.floor(n * 0.75);
    const q1 = sorted[q1Idx];
    const q3 = sorted[q3Idx];
    const iqr = q3 - q1;

    // Skewness (Fisher's)
    const sumCubedDiff = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0);
    const skewness = stdDev > 0 ? sumCubedDiff / n : 0;

    // Kurtosis (excess kurtosis)
    const sumFourthDiff = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0);
    const kurtosis = stdDev > 0 ? (sumFourthDiff / n) - 3 : 0;

    return {
        mean,
        median,
        stdDev,
        variance,
        min: sorted[0],
        max: sorted[n - 1],
        count: n,
        q1,
        q3,
        iqr,
        skewness,
        kurtosis,
    };
}

/**
 * Calculate Z-score for a value given dataset statistics
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
}

/**
 * Detect outliers using Z-score method
 * 
 * @param values - Array of numeric values
 * @param threshold - Z-score threshold for outlier detection (default 3.0)
 * @returns Array of outlier results
 */
export function detectZScoreOutliers(
    values: number[],
    threshold: number = 3.0
): { stats: DatasetStatistics; outliers: ZScoreResult[]; allResults: ZScoreResult[] } {
    const stats = calculateStatistics(values);
    const outliers: ZScoreResult[] = [];
    const allResults: ZScoreResult[] = [];

    for (const value of values) {
        const zScore = calculateZScore(value, stats.mean, stats.stdDev);
        const absZ = Math.abs(zScore);

        let severity: ZScoreResult['severity'];
        if (absZ >= 4) severity = 'extreme';
        else if (absZ >= 3) severity = 'significant';
        else if (absZ >= 2) severity = 'moderate';
        else severity = 'normal';

        const result: ZScoreResult = {
            value,
            zScore,
            isOutlier: absZ >= threshold,
            direction: zScore > threshold ? 'high' : zScore < -threshold ? 'low' : 'normal',
            severity,
        };

        allResults.push(result);
        if (result.isOutlier) {
            outliers.push(result);
        }
    }

    return { stats, outliers, allResults };
}

/**
 * Detect outliers using IQR (Tukey's fences) method
 * More robust to extreme values than Z-score
 */
export function detectIQROutliers(
    values: number[],
    multiplier: number = 1.5
): { stats: DatasetStatistics; outliers: { value: number; type: 'mild' | 'extreme' }[]; bounds: { lower: number; upper: number; lowerExtreme: number; upperExtreme: number } } {
    const stats = calculateStatistics(values);

    const bounds = {
        lower: stats.q1 - multiplier * stats.iqr,
        upper: stats.q3 + multiplier * stats.iqr,
        lowerExtreme: stats.q1 - 3 * stats.iqr,
        upperExtreme: stats.q3 + 3 * stats.iqr,
    };

    const outliers: { value: number; type: 'mild' | 'extreme' }[] = [];

    for (const value of values) {
        if (value < bounds.lowerExtreme || value > bounds.upperExtreme) {
            outliers.push({ value, type: 'extreme' });
        } else if (value < bounds.lower || value > bounds.upper) {
            outliers.push({ value, type: 'mild' });
        }
    }

    return { stats, outliers, bounds };
}

// ============================================================================
// TIME SERIES ANALYSIS
// ============================================================================

/**
 * Trend analysis result
 */
export interface TrendAnalysisResult {
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    slope: number;
    intercept: number;
    rSquared: number;
    percentChange: number;
    seasonalPattern: boolean;
    anomalies: { index: number; value: number; expected: number; deviation: number }[];
}

/**
 * Perform simple linear regression on time series data
 */
export function linearRegression(values: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = values.length;
    if (n < 2) {
        return { slope: 0, intercept: values[0] ?? 0, rSquared: 0 };
    }

    // Using index as x values (0, 1, 2, ...)
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let ssXY = 0;
    let ssXX = 0;
    let ssTot = 0;

    for (let i = 0; i < n; i++) {
        ssXY += (i - xMean) * (values[i] - yMean);
        ssXX += (i - xMean) ** 2;
        ssTot += (values[i] - yMean) ** 2;
    }

    const slope = ssXX !== 0 ? ssXY / ssXX : 0;
    const intercept = yMean - slope * xMean;

    // Calculate R-squared
    let ssRes = 0;
    for (let i = 0; i < n; i++) {
        const predicted = intercept + slope * i;
        ssRes += (values[i] - predicted) ** 2;
    }
    const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, rSquared };
}

/**
 * Analyze time series for trends and anomalies
 */
export function analyzeTimeSeries(
    values: number[],
    deviationThreshold: number = 2.0
): TrendAnalysisResult {
    const { slope, intercept, rSquared } = linearRegression(values);

    const n = values.length;
    const firstValue = values[0] ?? 0;
    const lastValue = values[n - 1] ?? 0;
    const percentChange = firstValue !== 0
        ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100
        : 0;

    // Determine trend
    let trend: TrendAnalysisResult['trend'];
    const normalizedSlope = slope / (Math.abs(values.reduce((a, b) => a + b, 0) / n) || 1);

    if (rSquared < 0.3) {
        trend = 'volatile';
    } else if (normalizedSlope > 0.02) {
        trend = 'increasing';
    } else if (normalizedSlope < -0.02) {
        trend = 'decreasing';
    } else {
        trend = 'stable';
    }

    // Detect anomalies (points far from trend line)
    const anomalies: TrendAnalysisResult['anomalies'] = [];
    const residuals = values.map((v, i) => v - (intercept + slope * i));
    const residualStats = calculateStatistics(residuals);

    for (let i = 0; i < n; i++) {
        const expected = intercept + slope * i;
        const deviation = Math.abs(residuals[i]) / (residualStats.stdDev || 1);

        if (deviation > deviationThreshold) {
            anomalies.push({
                index: i,
                value: values[i],
                expected,
                deviation,
            });
        }
    }

    // Simple seasonality detection (check if every Nth value is similar)
    let seasonalPattern = false;
    if (n >= 12) {
        // Check for monthly seasonality in yearly data
        const monthlyDiffs: number[] = [];
        for (let i = 12; i < n; i++) {
            monthlyDiffs.push(Math.abs(values[i] - values[i - 12]));
        }
        const avgMonthlyDiff = monthlyDiffs.reduce((a, b) => a + b, 0) / monthlyDiffs.length;
        const avgValue = Math.abs(values.reduce((a, b) => a + b, 0) / n);
        seasonalPattern = avgMonthlyDiff < avgValue * 0.1; // Less than 10% variation
    }

    return {
        trend,
        slope,
        intercept,
        rSquared,
        percentChange,
        seasonalPattern,
        anomalies,
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Approximate chi-square p-value using Gamma function approximation
 * This is a simplified approximation for common use cases
 */
function chiSquarePValue(chiSquare: number, degreesOfFreedom: number): number {
    // Simple approximation using Wilson-Hilferty transformation
    const k = degreesOfFreedom;
    const z = Math.pow(chiSquare / k, 1 / 3) - (1 - 2 / (9 * k));
    const standardized = z / Math.sqrt(2 / (9 * k));

    // Approximate standard normal CDF using error function approximation
    const pValue = 1 - normalCDF(standardized);
    return Math.max(0, Math.min(1, pValue));
}

/**
 * Approximate standard normal CDF
 */
function normalCDF(z: number): number {
    // Abramowitz and Stegun approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1.0 + sign * y);
}

/**
 * Calculate Modified Z-score using median absolute deviation (MAD)
 * More robust than standard Z-score for non-normal distributions
 */
export function calculateModifiedZScore(value: number, median: number, mad: number): number {
    if (mad === 0) return 0;
    return 0.6745 * (value - median) / mad;
}

/**
 * Calculate Median Absolute Deviation
 */
export function calculateMAD(values: number[]): { median: number; mad: number } {
    if (values.length === 0) {
        return { median: 0, mad: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    const deviations = values.map(v => Math.abs(v - median));
    const sortedDeviations = deviations.sort((a, b) => a - b);

    const mad = n % 2 === 0
        ? (sortedDeviations[n / 2 - 1] + sortedDeviations[n / 2]) / 2
        : sortedDeviations[Math.floor(n / 2)];

    return { median, mad };
}

// ============================================================================
// COMPREHENSIVE RISK SCORING
// ============================================================================

/**
 * Multi-factor risk score result
 */
export interface RiskScoreResult {
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: {
        name: string;
        score: number;
        weight: number;
        contribution: number;
        indicators: string[];
    }[];
    recommendations: string[];
}

/**
 * Calculate multi-factor risk score for an account or transaction set
 */
export function calculateMultiFactorRiskScore(params: {
    transactionVolatility: number;  // 0-100: Standard deviation relative to mean
    amountOutlierRatio: number;     // 0-100: Percentage of outlier amounts
    benfordDeviation: number;       // 0-100: Deviation from Benford's Law
    timingAnomalyRatio: number;     // 0-100: Percentage with timing anomalies
    vendorConcentration: number;    // 0-100: Top vendor percentage
    priorFindingsCount: number;     // 0-10: Number of prior audit findings
    controlEffectiveness: number;   // 0-100: Control test pass rate (inverse)
    materialityPercentage: number;  // 0-100+: Account balance as % of materiality
}): RiskScoreResult {
    // Factor weights (sum to 1.0)
    const weights = {
        transactionVolatility: 0.15,
        amountOutlierRatio: 0.15,
        benfordDeviation: 0.15,
        timingAnomalyRatio: 0.10,
        vendorConcentration: 0.10,
        priorFindingsCount: 0.15,
        controlEffectiveness: 0.10,
        materialityPercentage: 0.10,
    };

    const factors: RiskScoreResult['factors'] = [];

    // Transaction Volatility
    const volatilityScore = Math.min(100, params.transactionVolatility);
    factors.push({
        name: 'Transaction Volatility',
        score: volatilityScore,
        weight: weights.transactionVolatility,
        contribution: volatilityScore * weights.transactionVolatility,
        indicators: volatilityScore > 50 ? ['High variation in transaction amounts'] : [],
    });

    // Amount Outliers
    const outlierScore = Math.min(100, params.amountOutlierRatio * 2);
    factors.push({
        name: 'Amount Outliers',
        score: outlierScore,
        weight: weights.amountOutlierRatio,
        contribution: outlierScore * weights.amountOutlierRatio,
        indicators: outlierScore > 50 ? ['Significant number of unusual amounts detected'] : [],
    });

    // Benford's Law Deviation
    const benfordScore = Math.min(100, params.benfordDeviation * 10);
    factors.push({
        name: 'Benford\'s Law Conformity',
        score: benfordScore,
        weight: weights.benfordDeviation,
        contribution: benfordScore * weights.benfordDeviation,
        indicators: benfordScore > 50 ? ['Distribution deviates from expected pattern'] : [],
    });

    // Timing Anomalies
    const timingScore = Math.min(100, params.timingAnomalyRatio * 2);
    factors.push({
        name: 'Timing Anomalies',
        score: timingScore,
        weight: weights.timingAnomalyRatio,
        contribution: timingScore * weights.timingAnomalyRatio,
        indicators: timingScore > 50 ? ['Unusual timing patterns in transactions'] : [],
    });

    // Vendor Concentration
    const concentrationScore = Math.min(100, params.vendorConcentration);
    factors.push({
        name: 'Vendor Concentration',
        score: concentrationScore,
        weight: weights.vendorConcentration,
        contribution: concentrationScore * weights.vendorConcentration,
        indicators: concentrationScore > 70 ? ['High concentration with single vendor'] : [],
    });

    // Prior Findings
    const priorScore = Math.min(100, params.priorFindingsCount * 10);
    factors.push({
        name: 'Prior Audit Findings',
        score: priorScore,
        weight: weights.priorFindingsCount,
        contribution: priorScore * weights.priorFindingsCount,
        indicators: priorScore > 20 ? ['History of audit issues'] : [],
    });

    // Control Effectiveness (inverted - lower pass rate = higher risk)
    const controlScore = Math.min(100, 100 - params.controlEffectiveness);
    factors.push({
        name: 'Control Effectiveness',
        score: controlScore,
        weight: weights.controlEffectiveness,
        contribution: controlScore * weights.controlEffectiveness,
        indicators: controlScore > 50 ? ['Weak control environment'] : [],
    });

    // Materiality Impact
    const materialityScore = Math.min(100, params.materialityPercentage);
    factors.push({
        name: 'Materiality Impact',
        score: materialityScore,
        weight: weights.materialityPercentage,
        contribution: materialityScore * weights.materialityPercentage,
        indicators: materialityScore > 75 ? ['High materiality impact'] : [],
    });

    // Calculate overall score
    const overallScore = factors.reduce((sum, f) => sum + f.contribution, 0);

    // Determine risk level
    let riskLevel: RiskScoreResult['riskLevel'];
    if (overallScore >= 75) riskLevel = 'critical';
    else if (overallScore >= 50) riskLevel = 'high';
    else if (overallScore >= 25) riskLevel = 'medium';
    else riskLevel = 'low';

    // Generate recommendations
    const recommendations: string[] = [];
    const highRiskFactors = factors.filter(f => f.score > 50).sort((a, b) => b.contribution - a.contribution);

    for (const factor of highRiskFactors.slice(0, 3)) {
        switch (factor.name) {
            case 'Transaction Volatility':
                recommendations.push('Increase sample size and perform detailed variance analysis');
                break;
            case 'Amount Outliers':
                recommendations.push('Investigate outlier transactions with supporting documentation');
                break;
            case 'Benford\'s Law Conformity':
                recommendations.push('Perform detailed fraud risk assessment on this population');
                break;
            case 'Prior Audit Findings':
                recommendations.push('Review remediation of prior findings and test corrective actions');
                break;
            case 'Control Effectiveness':
                recommendations.push('Consider controls deficiency and increase substantive testing');
                break;
            case 'Materiality Impact':
                recommendations.push('Ensure sufficient coverage through testing procedures');
                break;
        }
    }

    if (recommendations.length === 0) {
        recommendations.push('Standard audit procedures are appropriate for this risk level');
    }

    return {
        overallScore,
        riskLevel,
        factors,
        recommendations,
    };
}
