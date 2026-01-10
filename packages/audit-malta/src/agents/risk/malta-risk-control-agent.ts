/**
 * Malta Risk & Control Agent
 *
 * ISA 315 (Revised 2019) - Identifying and Assessing Risks of Material Misstatement
 * ISA 240 - The Auditor's Responsibilities Relating to Fraud
 *
 * Malta-specific features:
 * - MFSA IT standards for regulated entities
 * - Gaming sector controls (MGA requirements)
 * - Crypto/blockchain transaction flagging
 * - Benford's Law anomaly detection
 * - SOC report parsing
 */

import type {
    MaltaAuditAgent,
    MaltaAgentResponse,
    MaltaRiskAssessment,
    BenfordsLawResult,
    FraudRiskIndicators,
} from '../../types/index.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Benford's Law expected first digit distribution.
 */
export const BENFORDS_EXPECTED = [
    0.301, // 1
    0.176, // 2
    0.125, // 3
    0.097, // 4
    0.079, // 5
    0.067, // 6
    0.058, // 7
    0.051, // 8
    0.046, // 9
] as const;

/**
 * Chi-square critical values for significance testing.
 */
export const CHI_SQUARE_CRITICAL = {
    df8_p05: 15.507,  // 8 degrees of freedom, p=0.05
    df8_p01: 20.090,  // 8 degrees of freedom, p=0.01
} as const;

/**
 * Fraud Triangle risk factors.
 */
export const FRAUD_TRIANGLE_FACTORS = {
    pressure: [
        'Financial targets unmet',
        'Compensation tied to results',
        'Economic downturn',
        'Industry decline',
        'Covenant violations',
        'Going concern issues',
    ],
    opportunity: [
        'Weak internal controls',
        'Management override',
        'Complex transactions',
        'Related party dealings',
        'Unusual journal entries',
        'Inadequate segregation of duties',
    ],
    rationalization: [
        'Aggressive accounting practices',
        'Poor ethical tone at top',
        'Frequent management turnover',
        'Strained auditor relationship',
        'Prior period adjustments',
        'Complaints from employees',
    ],
} as const;

// ============================================================================
// RISK & CONTROL AGENT
// ============================================================================

/**
 * Malta Risk & Control Agent.
 *
 * Performs risk assessment per ISA 315 and fraud detection per ISA 240.
 */
export class MaltaRiskControlAgent implements MaltaAuditAgent {
    public readonly agentId = 'malta-risk-control-001';
    public readonly name = 'Malta Risk & Control Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'RISK_ASSESSMENT' as const;
    public readonly isaReferences = ['ISA 315', 'ISA 240', 'ISA 330'];
    public readonly autonomyLevel = 4 as const;

    /**
     * Assess risks of material misstatement per ISA 315.
     */
    async assessRisksOfMaterialMisstatement(
        context: {
            industry: string;
            entitySize: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE';
            mfsaRegulated?: boolean;
            firstYearAudit?: boolean;
            priorYearFindings?: string[];
        },
        financialStatementAreas: string[] = [
            'Revenue',
            'Cash and Bank',
            'Accounts Receivable',
            'Inventory',
            'Fixed Assets',
            'Accounts Payable',
            'Debt and Borrowings',
            'Equity',
        ]
    ): Promise<MaltaAgentResponse<MaltaRiskAssessment[]>> {
        const startTime = Date.now();

        try {
            const risks: MaltaRiskAssessment[] = [];

            for (const area of financialStatementAreas) {
                const risk = this.assessAreaRisk(area, context);
                risks.push(risk);
            }

            // Add Malta-specific risks
            if (context.mfsaRegulated) {
                risks.push(this.createMFSARegulatoryRisk());
            }

            if (context.industry.toLowerCase().includes('gaming') ||
                context.industry.toLowerCase().includes('crypto')) {
                risks.push(this.createHighRiskIndustryRisk(context.industry));
            }

            return {
                success: true,
                data: risks,
                agentId: this.agentId,
                requiresReview: risks.some((r) => r.isSignificantRisk),
                reviewReason: risks.some((r) => r.isSignificantRisk)
                    ? 'Significant risks identified - partner review required'
                    : undefined,
                durationMs: Date.now() - startTime,
                nextSteps: [
                    'Document risk assessment in planning memorandum',
                    'Design audit procedures responsive to assessed risks',
                    'Communicate significant risks to engagement partner',
                ],
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Risk assessment failed',
                agentId: this.agentId,
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Perform Benford's Law analysis on transaction amounts.
     */
    async performBenfordsLawAnalysis(
        amounts: number[],
        options: {
            significanceLevel?: 0.05 | 0.01;
            excludeSmallAmounts?: number;
        } = {}
    ): Promise<MaltaAgentResponse<BenfordsLawResult>> {
        const startTime = Date.now();

        try {
            const significanceLevel = options.significanceLevel ?? 0.05;
            const minAmount = options.excludeSmallAmounts ?? 0;

            // Filter amounts
            const filteredAmounts = amounts.filter(
                (a) => Math.abs(a) >= minAmount && a !== 0
            );

            if (filteredAmounts.length < 100) {
                return {
                    success: false,
                    error: 'Insufficient data for Benford analysis (minimum 100 transactions)',
                    agentId: this.agentId,
                    requiresReview: false,
                    durationMs: Date.now() - startTime,
                };
            }

            // Extract first digits
            const firstDigits = filteredAmounts.map((a) => {
                const str = Math.abs(a).toString().replace(/^0+\.?/, '');
                return parseInt(str[0], 10);
            }).filter((d) => d >= 1 && d <= 9);

            // Calculate observed distribution
            const observedCounts = Array(9).fill(0);
            for (const digit of firstDigits) {
                observedCounts[digit - 1]++;
            }

            const total = firstDigits.length;
            const observedDistribution = observedCounts.map((c) => c / total);

            // Chi-square test
            let chiSquare = 0;
            for (let i = 0; i < 9; i++) {
                const expected = BENFORDS_EXPECTED[i] * total;
                const observed = observedCounts[i];
                chiSquare += Math.pow(observed - expected, 2) / expected;
            }

            // Determine significance
            const criticalValue =
                significanceLevel === 0.01
                    ? CHI_SQUARE_CRITICAL.df8_p01
                    : CHI_SQUARE_CRITICAL.df8_p05;

            const anomalyDetected = chiSquare > criticalValue;

            // Calculate approximate p-value using chi-square distribution
            // This is a simplified approximation
            const pValue = this.approximatePValue(chiSquare, 8);

            // Find flagged digits (deviation > 2 standard deviations)
            const flaggedTransactions: string[] = [];
            for (let i = 0; i < 9; i++) {
                const deviation = Math.abs(observedDistribution[i] - BENFORDS_EXPECTED[i]);
                const expectedStdDev = Math.sqrt(
                    BENFORDS_EXPECTED[i] * (1 - BENFORDS_EXPECTED[i]) / total
                );
                if (deviation > 2 * expectedStdDev) {
                    flaggedTransactions.push(
                        `Digit ${i + 1}: Expected ${(BENFORDS_EXPECTED[i] * 100).toFixed(1)}%, ` +
                        `Observed ${(observedDistribution[i] * 100).toFixed(1)}%`
                    );
                }
            }

            const result: BenfordsLawResult = {
                anomalyDetected,
                pValue,
                chiSquareStatistic: chiSquare,
                observedDistribution,
                expectedDistribution: [...BENFORDS_EXPECTED],
                recommendation: anomalyDetected
                    ? 'Significant deviation from Benford distribution - investigate unusual transactions'
                    : 'Distribution consistent with Benford - no anomaly detected',
                flaggedTransactions: flaggedTransactions.length > 0 ? flaggedTransactions : undefined,
            };

            return {
                success: true,
                data: result,
                agentId: this.agentId,
                requiresReview: anomalyDetected,
                reviewReason: anomalyDetected
                    ? "Benford's Law analysis detected anomalies"
                    : undefined,
                durationMs: Date.now() - startTime,
                nextSteps: anomalyDetected
                    ? [
                        'Investigate transactions starting with flagged digits',
                        'Perform additional analytical procedures',
                        'Consider fraud risk implications',
                        'Document findings for further testing',
                    ]
                    : ['Document analytical procedure results'],
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Benford's Law analysis failed",
                agentId: this.agentId,
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Assess fraud risk indicators per ISA 240.
     */
    async assessFraudRiskIndicators(
        indicators: {
            revenueUnderPressure?: boolean;
            complexTransactions?: boolean;
            relatedPartyTransactions?: boolean;
            unusualJournalEntries?: boolean;
            weakControls?: boolean;
            managementOverride?: boolean;
            aggressiveAccounting?: boolean;
            poorToneAtTop?: boolean;
            frequentManagementTurnover?: boolean;
        }
    ): Promise<MaltaAgentResponse<FraudRiskIndicators>> {
        const startTime = Date.now();

        // Assess fraud triangle components
        let pressureScore = 0;
        let opportunityScore = 0;
        let rationalizationScore = 0;

        if (indicators.revenueUnderPressure) pressureScore += 2;
        if (indicators.complexTransactions) opportunityScore += 1;
        if (indicators.relatedPartyTransactions) opportunityScore += 1;
        if (indicators.unusualJournalEntries) opportunityScore += 2;
        if (indicators.weakControls) opportunityScore += 2;
        if (indicators.managementOverride) opportunityScore += 3;
        if (indicators.aggressiveAccounting) rationalizationScore += 2;
        if (indicators.poorToneAtTop) rationalizationScore += 2;
        if (indicators.frequentManagementTurnover) rationalizationScore += 1;

        const totalScore = pressureScore + opportunityScore + rationalizationScore;
        let fraudTriangleScore: 'LOW' | 'MODERATE' | 'HIGH';

        if (totalScore <= 3) {
            fraudTriangleScore = 'LOW';
        } else if (totalScore <= 7) {
            fraudTriangleScore = 'MODERATE';
        } else {
            fraudTriangleScore = 'HIGH';
        }

        const result: FraudRiskIndicators = {
            revenueRecognitionRisk: true, // Presumed per ISA 240
            managementOverrideRisk: true, // Presumed per ISA 240
            relatedPartyRisk: indicators.relatedPartyTransactions ?? false,
            unusualTransactionsIdentified: indicators.unusualJournalEntries ?? false,
            pressureFactorsPresent: pressureScore > 0,
            opportunityFactorsPresent: opportunityScore > 0,
            rationalizationIndicators: rationalizationScore > 0,
            fraudTriangleScore,
        };

        return {
            success: true,
            data: result,
            agentId: this.agentId,
            requiresReview: fraudTriangleScore === 'HIGH',
            reviewReason: fraudTriangleScore === 'HIGH'
                ? 'High fraud risk indicators - enhanced procedures required'
                : undefined,
            durationMs: Date.now() - startTime,
            nextSteps: [
                'Document fraud risk assessment',
                'Design unpredictable audit procedures',
                'Test journal entries for management override',
                'Perform revenue recognition testing',
                fraudTriangleScore === 'HIGH'
                    ? 'Consider forensic specialist involvement'
                    : 'Standard fraud procedures apply',
            ],
        };
    }

    /**
     * Flag cryptocurrency transactions for blockchain verification.
     */
    async flagCryptoTransactions(
        ledger: Array<{
            transactionId: string;
            description: string;
            amount: number;
            account: string;
        }>
    ): Promise<MaltaAgentResponse<{
        cryptoTransactionsFound: boolean;
        flaggedTransactions: string[];
        verificationRequired: boolean;
    }>> {
        const startTime = Date.now();

        const cryptoKeywords = [
            'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain',
            'wallet', 'token', 'usdt', 'usdc', 'stablecoin', 'defi',
            'nft', 'digital asset', 'virtual financial asset', 'vfa',
        ];

        const flaggedTransactions: string[] = [];

        for (const entry of ledger) {
            const descLower = entry.description.toLowerCase();
            const accountLower = entry.account.toLowerCase();

            if (cryptoKeywords.some((kw) => descLower.includes(kw) || accountLower.includes(kw))) {
                flaggedTransactions.push(entry.transactionId);
            }
        }

        const cryptoTransactionsFound = flaggedTransactions.length > 0;

        return {
            success: true,
            data: {
                cryptoTransactionsFound,
                flaggedTransactions,
                verificationRequired: cryptoTransactionsFound,
            },
            agentId: this.agentId,
            requiresReview: cryptoTransactionsFound,
            reviewReason: cryptoTransactionsFound
                ? 'Crypto transactions identified - blockchain verification required'
                : undefined,
            durationMs: Date.now() - startTime,
            nextSteps: cryptoTransactionsFound
                ? [
                    'Obtain wallet addresses for verification',
                    'Perform blockchain transaction tracing',
                    'Verify custody and control of private keys',
                    'Assess fair value at transaction dates',
                    'Review MFSA VFA compliance',
                ]
                : [],
        };
    }

    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================

    private assessAreaRisk(
        area: string,
        context: {
            industry: string;
            entitySize: string;
            mfsaRegulated?: boolean;
            firstYearAudit?: boolean;
            priorYearFindings?: string[];
        }
    ): MaltaRiskAssessment {
        // Standard risk profiles by area
        const standardProfiles: Record<
            string,
            { inherent: 'low' | 'moderate' | 'significant' | 'high'; isFraud: boolean }
        > = {
            Revenue: { inherent: 'significant', isFraud: true },
            'Cash and Bank': { inherent: 'significant', isFraud: true },
            'Accounts Receivable': { inherent: 'moderate', isFraud: false },
            Inventory: { inherent: 'moderate', isFraud: false },
            'Fixed Assets': { inherent: 'low', isFraud: false },
            'Accounts Payable': { inherent: 'moderate', isFraud: false },
            'Debt and Borrowings': { inherent: 'moderate', isFraud: false },
            Equity: { inherent: 'low', isFraud: false },
        };

        const profile = standardProfiles[area] ?? { inherent: 'moderate', isFraud: false };
        let inherentRisk = profile.inherent;
        let controlRisk: 'low' | 'moderate' | 'significant' | 'high' = 'moderate';

        // Adjust for entity size
        if (context.entitySize === 'MICRO' || context.entitySize === 'SMALL') {
            controlRisk = 'significant'; // Weaker controls typically
        }

        // Adjust for prior findings
        if (context.priorYearFindings?.some((f) => f.toLowerCase().includes(area.toLowerCase()))) {
            inherentRisk = this.increaseRisk(inherentRisk);
        }

        // Determine if significant risk
        const isSignificantRisk =
            inherentRisk === 'significant' ||
            inherentRisk === 'high' ||
            profile.isFraud;

        return {
            accountOrAssertion: area,
            inherentRisk,
            controlRisk,
            combinedRisk: this.combineRisks(inherentRisk, controlRisk),
            isSignificantRisk,
            isFraudRisk: profile.isFraud,
            rationale: this.generateRiskRationale(area, inherentRisk, profile.isFraud),
            responseRequired: isSignificantRisk
                ? ['Substantive procedures only', 'Senior involvement', 'Enhanced documentation']
                : ['Standard substantive procedures'],
            maltaRiskIndicators: context.mfsaRegulated
                ? ['MFSA regulated - enhanced compliance focus']
                : undefined,
        };
    }

    private createMFSARegulatoryRisk(): MaltaRiskAssessment {
        return {
            accountOrAssertion: 'Regulatory Compliance',
            inherentRisk: 'significant',
            controlRisk: 'moderate',
            combinedRisk: 'significant',
            isSignificantRisk: true,
            isFraudRisk: false,
            rationale: 'MFSA regulated entity - regulatory compliance is critical',
            responseRequired: [
                'Verify regulatory capital/solvency calculations',
                'Review compliance with license conditions',
                'Test client money segregation',
                'Assess AML/CFT procedures',
            ],
            mfsaRequirements: [
                'Verify license status with MFSA',
                'Review regulatory correspondence',
                'Check for pending enforcement actions',
            ],
        };
    }

    private createHighRiskIndustryRisk(industry: string): MaltaRiskAssessment {
        return {
            accountOrAssertion: `${industry} Industry Specific Risks`,
            inherentRisk: 'high',
            controlRisk: 'significant',
            combinedRisk: 'high',
            isSignificantRisk: true,
            isFraudRisk: true,
            rationale: `${industry} is classified as high-risk industry in Malta`,
            responseRequired: [
                'Enhanced substantive procedures',
                'Specialist involvement',
                'Regulatory compliance testing',
                'Fraud risk procedures',
            ],
            blockchainVerificationRequired: industry.toLowerCase().includes('crypto'),
        };
    }

    private increaseRisk(
        risk: 'low' | 'moderate' | 'significant' | 'high'
    ): 'low' | 'moderate' | 'significant' | 'high' {
        const levels = ['low', 'moderate', 'significant', 'high'];
        const idx = levels.indexOf(risk);
        return levels[Math.min(idx + 1, 3)] as 'low' | 'moderate' | 'significant' | 'high';
    }

    private combineRisks(
        inherent: 'low' | 'moderate' | 'significant' | 'high',
        control: 'low' | 'moderate' | 'significant' | 'high'
    ): 'low' | 'moderate' | 'significant' | 'high' {
        const levels = { low: 1, moderate: 2, significant: 3, high: 4 };
        const combined = Math.max(levels[inherent], levels[control]);
        const result = Object.entries(levels).find(([, v]) => v === combined)?.[0];
        return (result as 'low' | 'moderate' | 'significant' | 'high') ?? 'moderate';
    }

    private generateRiskRationale(
        area: string,
        risk: string,
        isFraud: boolean
    ): string {
        let rationale = `${area} assessed as ${risk} inherent risk`;
        if (isFraud) {
            rationale += '. Presumed fraud risk per ISA 240 - susceptible to manipulation';
        }
        return rationale;
    }

    private approximatePValue(chiSquare: number, df: number): number {
        // Simplified p-value approximation using Wilson-Hilferty transformation
        const z = Math.pow(chiSquare / df, 1 / 3) - (1 - 2 / (9 * df));
        const se = Math.sqrt(2 / (9 * df));
        const standardZ = z / se;

        // Standard normal CDF approximation
        const t = 1 / (1 + 0.2316419 * Math.abs(standardZ));
        const d = 0.3989423 * Math.exp(-standardZ * standardZ / 2);
        const p =
            d *
            t *
            (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

        return standardZ > 0 ? p : 1 - p;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Malta Risk & Control Agent instance.
 */
export function createMaltaRiskControlAgent(): MaltaRiskControlAgent {
    return new MaltaRiskControlAgent();
}

/**
 * Lazy singleton instance.
 */
let _maltaRiskControlAgent: MaltaRiskControlAgent | null = null;

export const maltaRiskControlAgent = {
    instance(): MaltaRiskControlAgent {
        if (!_maltaRiskControlAgent) {
            _maltaRiskControlAgent = new MaltaRiskControlAgent();
        }
        return _maltaRiskControlAgent;
    },
};
