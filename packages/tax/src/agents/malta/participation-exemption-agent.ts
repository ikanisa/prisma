/**
 * Malta Participation Exemption Agent
 * 
 * Autonomous AI agent for participation exemption qualification assessment.
 * Implements Income Tax Act (Cap. 123) participation exemption rules.
 * 
 * Features:
 * - Equity holding test (≥5% + 2/3 rights)
 * - Investment value test (≥€1,164,000 + 183 days)
 * - Anti-abuse tests (Investment, Tax, Active Business)
 * - AI-powered qualification analysis
 */

import OpenAI from 'openai';
import type {
    ParticipationHolding,
    SubsidiaryFinancials,
    ParticipationExemptionResult,
    ParticipationExemptionRoute,
    AntiAbuseTestResults,
    AntiAbuseTestResult,
    MALTA_TAX_CONSTANTS,
} from '../../types/malta.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const PARTICIPATION_THRESHOLDS = {
    MIN_EQUITY_PERCENTAGE: 5,
    MIN_INVESTMENT_EUR: 1164000,
    MIN_HOLDING_DAYS: 183,
    TAX_SAFE_HARBOR_RATE: 15,
    PASSIVE_INCOME_MAX_PERCENT: 50,
    QUALIFYING_ASSETS_MIN_PERCENT: 50,
};

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export interface ParticipationExemptionAgentConfig {
    openaiApiKey?: string;
    organizationId?: string;
    userId?: string;
    enableAIAnalysis?: boolean;
}

// ============================================================================
// PARTICIPATION EXEMPTION AGENT
// ============================================================================

export class MaltaParticipationExemptionAgent {
    public readonly slug = 'malta-participation-exemption-agent';
    public readonly name = 'Malta Participation Exemption Agent';
    public readonly version = '2.0.0';
    public readonly category = 'tax';
    public readonly type = 'autonomous';
    public readonly jurisdiction = 'MT';

    private openaiClient: OpenAI | null = null;
    private config: ParticipationExemptionAgentConfig;

    constructor(config: ParticipationExemptionAgentConfig = {}) {
        this.config = config;

        try {
            if (config.openaiApiKey) {
                this.openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
            } else if (process.env.OPENAI_API_KEY) {
                this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            }
        } catch (error) {
            this.openaiClient = null;
        }
    }

    /**
     * Get agent capabilities
     */
    getCapabilities(): string[] {
        return [
            'Participation exemption qualification assessment',
            'Equity holding test (≥5% + 2/3 rights)',
            'Investment value test (≥€1,164,000 + 183 days)',
            'Anti-abuse test 1: Investment/Portfolio test',
            'Anti-abuse test 2: Subject to tax test',
            'Anti-abuse test 3: Active business test',
            'AI-powered qualification reasoning',
            'Documentation requirements generator',
            'Strategic alternative analysis (exemption vs refund)',
        ];
    }

    // ========================================================================
    // QUALIFICATION ASSESSMENT
    // ========================================================================

    /**
     * Comprehensive participation exemption qualification assessment
     */
    async assessQualification(
        holding: ParticipationHolding,
        incomeType: 'dividend' | 'capital_gain',
        incomeAmount: number,
        subsidiaryFinancials: SubsidiaryFinancials
    ): Promise<ParticipationExemptionResult> {
        // Step 1: Check basic holding conditions
        const basicQualification = this.checkBasicConditions(holding);

        if (!basicQualification.qualifies) {
            return {
                qualifies: false,
                qualificationRoute: null,
                antiAbuseTestsPassed: {
                    investmentTest: { passed: false, reasoning: 'Basic conditions not met' },
                    taxTest: { passed: false, reasoning: 'Basic conditions not met' },
                    activeBusinessTest: { passed: false, reasoning: 'Basic conditions not met' },
                    allPassed: false,
                },
                reasoning: basicQualification.reason,
                recommendedAction: 'Does not meet basic participation exemption criteria. Consider paying 35% tax and claiming 6/7ths shareholder refund (5% effective rate).',
                documentationRequired: [],
            };
        }

        // Step 2: Run anti-abuse tests
        const antiAbuseResults = await this.runAntiAbuseTests(holding, subsidiaryFinancials);

        // Step 3: Generate comprehensive analysis
        const analysis = await this.generateQualificationAnalysis(
            holding,
            incomeType,
            incomeAmount,
            basicQualification,
            antiAbuseResults
        );

        return {
            qualifies: antiAbuseResults.allPassed,
            qualificationRoute: basicQualification.route,
            antiAbuseTestsPassed: antiAbuseResults,
            reasoning: analysis.reasoning,
            recommendedAction: analysis.recommendation,
            documentationRequired: analysis.documentation,
            aiConfidenceScore: analysis.confidence,
        };
    }

    // ========================================================================
    // BASIC CONDITIONS
    // ========================================================================

    /**
     * Check if holding meets basic participation exemption criteria
     * Route 1: ≥5% equity + 2/3 rights
     * Route 2: ≥€1,164,000 investment + ≥183 days holding
     */
    private checkBasicConditions(holding: ParticipationHolding): {
        qualifies: boolean;
        route: ParticipationExemptionRoute | null;
        reason: string;
    } {
        // Route 1: Equity holding test
        if (holding.equityPercentage >= PARTICIPATION_THRESHOLDS.MIN_EQUITY_PERCENTAGE) {
            // Check 2/3 rights requirement
            const rightsCount = this.countQualifyingRights(holding);

            if (rightsCount >= 2) {
                return {
                    qualifies: true,
                    route: 'equity_holding',
                    reason: `${holding.equityPercentage}% equity with ${rightsCount}/3 qualifying rights meets equity holding test`,
                };
            }
        }

        // Route 2: Investment value test
        if (holding.acquisitionCost >= PARTICIPATION_THRESHOLDS.MIN_INVESTMENT_EUR) {
            const holdingDays = this.calculateHoldingDays(holding.acquisitionDate);

            if (holdingDays >= PARTICIPATION_THRESHOLDS.MIN_HOLDING_DAYS) {
                return {
                    qualifies: true,
                    route: 'investment_value',
                    reason: `EUR ${holding.acquisitionCost.toLocaleString()} investment held for ${holdingDays} days meets investment value test`,
                };
            } else {
                return {
                    qualifies: false,
                    route: null,
                    reason: `Holding period ${holdingDays} days is less than required ${PARTICIPATION_THRESHOLDS.MIN_HOLDING_DAYS} days. Wait ${PARTICIPATION_THRESHOLDS.MIN_HOLDING_DAYS - holdingDays} more days.`,
                };
            }
        }

        return {
            qualifies: false,
            route: null,
            reason: `Neither equity holding test (requires ≥${PARTICIPATION_THRESHOLDS.MIN_EQUITY_PERCENTAGE}% + 2/3 rights) nor investment value test (requires ≥EUR ${PARTICIPATION_THRESHOLDS.MIN_INVESTMENT_EUR.toLocaleString()}) is met`,
        };
    }

    /**
     * Count qualifying rights (voting, profit, liquidation)
     */
    private countQualifyingRights(holding: ParticipationHolding): number {
        const minPercentage = PARTICIPATION_THRESHOLDS.MIN_EQUITY_PERCENTAGE;
        let count = 0;

        if (holding.votingRightsPercentage && holding.votingRightsPercentage >= minPercentage) {
            count++;
        }
        if (holding.profitRightsPercentage && holding.profitRightsPercentage >= minPercentage) {
            count++;
        }
        if (holding.liquidationRightsPercentage && holding.liquidationRightsPercentage >= minPercentage) {
            count++;
        }

        return count;
    }

    /**
     * Calculate holding period in days
     */
    private calculateHoldingDays(acquisitionDate: string): number {
        const acquisition = new Date(acquisitionDate);
        const today = new Date();
        return Math.floor((today.getTime() - acquisition.getTime()) / (1000 * 60 * 60 * 24));
    }

    // ========================================================================
    // ANTI-ABUSE TESTS
    // ========================================================================

    /**
     * Run all three anti-abuse tests
     */
    private async runAntiAbuseTests(
        holding: ParticipationHolding,
        subsidiaryFinancials: SubsidiaryFinancials
    ): Promise<AntiAbuseTestResults> {
        const investmentTest = this.runInvestmentTest(subsidiaryFinancials);
        const taxTest = await this.runTaxTest(holding.jurisdiction, subsidiaryFinancials);
        const activeBusinessTest = this.runActiveBusinessTest(subsidiaryFinancials);

        return {
            investmentTest,
            taxTest,
            activeBusinessTest,
            allPassed: investmentTest.passed && taxTest.passed && activeBusinessTest.passed,
        };
    }

    /**
     * Test 1: Investment Test (Portfolio Test)
     * Subsidiary must hold mainly qualifying investments
     */
    private runInvestmentTest(subsidiaryFinancials: SubsidiaryFinancials): AntiAbuseTestResult {
        const qualifying = subsidiaryFinancials.qualifyingInvestments || {};
        const totalAssets = subsidiaryFinancials.totalAssets;

        const qualifyingTotal =
            (qualifying.equityHoldingsInOtherCompanies || 0) +
            (qualifying.immovablePropertyForOwnBusiness || 0) +
            (qualifying.intellectualPropertyRights || 0);

        const qualifyingPercentage = totalAssets > 0
            ? (qualifyingTotal / totalAssets) * 100
            : 0;

        const passed = qualifyingPercentage > PARTICIPATION_THRESHOLDS.QUALIFYING_ASSETS_MIN_PERCENT;

        return {
            passed,
            percentage: Math.round(qualifyingPercentage * 100) / 100,
            threshold: PARTICIPATION_THRESHOLDS.QUALIFYING_ASSETS_MIN_PERCENT,
            reasoning: `Qualifying investments: ${qualifyingPercentage.toFixed(2)}% of total assets (threshold: >${PARTICIPATION_THRESHOLDS.QUALIFYING_ASSETS_MIN_PERCENT}%)`,
        };
    }

    /**
     * Test 2: Tax Test (Subject to Tax Test)
     * Subsidiary must be subject to comparable tax
     */
    private async runTaxTest(
        jurisdiction: string,
        subsidiaryFinancials: SubsidiaryFinancials
    ): Promise<AntiAbuseTestResult> {
        // Get statutory tax rate for jurisdiction
        const statutoryRate = subsidiaryFinancials.statutoryTaxRate ?? this.getStatutoryRate(jurisdiction);
        const safeHarbor = PARTICIPATION_THRESHOLDS.TAX_SAFE_HARBOR_RATE;

        // Malta accepts 15% as safe harbor (Pillar Two alignment)
        const passed = statutoryRate >= safeHarbor;

        return {
            passed,
            jurisdiction,
            statutoryRate,
            safeHarborRate: safeHarbor,
            reasoning: passed
                ? `${jurisdiction} statutory rate ${statutoryRate}% >= ${safeHarbor}% safe harbor`
                : `${jurisdiction} statutory rate ${statutoryRate}% < ${safeHarbor}% safe harbor - requires detailed comparability analysis`,
        };
    }

    /**
     * Get statutory tax rate for jurisdiction
     */
    private getStatutoryRate(jurisdiction: string): number {
        const rates: Record<string, number> = {
            'US': 21, 'UK': 25, 'DE': 30, 'FR': 25, 'IT': 24,
            'NL': 25.8, 'IE': 12.5, 'LU': 24.94, 'SG': 17,
            'HK': 16.5, 'CH': 21, 'AE': 9, 'MT': 35,
            'CY': 12.5, 'BG': 10, 'HU': 9,
        };
        return rates[jurisdiction] ?? 0;
    }

    /**
     * Test 3: Active Business Test
     * Subsidiary must conduct active business (not passive holding)
     */
    private runActiveBusinessTest(subsidiaryFinancials: SubsidiaryFinancials): AntiAbuseTestResult {
        const totalIncome = subsidiaryFinancials.totalIncome;
        const passive = subsidiaryFinancials.passiveIncome || {};

        const passiveTotal =
            (passive.interest || 0) +
            (passive.dividends || 0) +
            (passive.royalties || 0) +
            (passive.rentalIncome || 0);

        const passivePercentage = totalIncome > 0
            ? (passiveTotal / totalIncome) * 100
            : 100;

        const passed = passivePercentage < PARTICIPATION_THRESHOLDS.PASSIVE_INCOME_MAX_PERCENT;

        return {
            passed,
            percentage: Math.round(passivePercentage * 100) / 100,
            threshold: PARTICIPATION_THRESHOLDS.PASSIVE_INCOME_MAX_PERCENT,
            reasoning: `Passive income: ${passivePercentage.toFixed(2)}% of total income (must be <${PARTICIPATION_THRESHOLDS.PASSIVE_INCOME_MAX_PERCENT}%)`,
        };
    }

    // ========================================================================
    // QUALIFICATION ANALYSIS
    // ========================================================================

    /**
     * Generate comprehensive qualification analysis
     */
    private async generateQualificationAnalysis(
        holding: ParticipationHolding,
        incomeType: 'dividend' | 'capital_gain',
        incomeAmount: number,
        basicQualification: { qualifies: boolean; route: ParticipationExemptionRoute | null; reason: string },
        antiAbuseResults: AntiAbuseTestResults
    ): Promise<{
        reasoning: string;
        recommendation: string;
        documentation: string[];
        confidence: number;
    }> {
        // If AI available, use for comprehensive analysis
        if (this.openaiClient && this.config.enableAIAnalysis !== false && antiAbuseResults.allPassed) {
            try {
                return await this.aiQualificationAnalysis(
                    holding, incomeType, incomeAmount, basicQualification, antiAbuseResults
                );
            } catch (error) {
                console.warn('AI qualification analysis failed:', error);
            }
        }

        // Fallback to rule-based analysis
        return this.ruleBasedAnalysis(holding, incomeType, incomeAmount, basicQualification, antiAbuseResults);
    }

    /**
     * AI-powered qualification analysis
     */
    private async aiQualificationAnalysis(
        holding: ParticipationHolding,
        incomeType: string,
        incomeAmount: number,
        basicQualification: { qualifies: boolean; route: ParticipationExemptionRoute | null; reason: string },
        antiAbuseResults: AntiAbuseTestResults
    ): Promise<{
        reasoning: string;
        recommendation: string;
        documentation: string[];
        confidence: number;
    }> {
        const prompt = `Analyze Malta participation exemption qualification for this holding:

Holding Details:
- Subsidiary: ${holding.subsidiaryName} (${holding.jurisdiction})
- Equity: ${holding.equityPercentage}%
- Investment: EUR ${holding.acquisitionCost.toLocaleString()}
- Holding Period: ${this.calculateHoldingDays(holding.acquisitionDate)} days

Income:
- Type: ${incomeType}
- Amount: EUR ${incomeAmount.toLocaleString()}

Basic Qualification: ${basicQualification.qualifies ? 'PASSED' : 'FAILED'}
- Route: ${basicQualification.route || 'None'}
- Reason: ${basicQualification.reason}

Anti-Abuse Tests:
- Investment Test: ${antiAbuseResults.investmentTest.passed ? 'PASSED' : 'FAILED'} - ${antiAbuseResults.investmentTest.reasoning}
- Tax Test: ${antiAbuseResults.taxTest.passed ? 'PASSED' : 'FAILED'} - ${antiAbuseResults.taxTest.reasoning}
- Active Business Test: ${antiAbuseResults.activeBusinessTest.passed ? 'PASSED' : 'FAILED'} - ${antiAbuseResults.activeBusinessTest.reasoning}
- All Passed: ${antiAbuseResults.allPassed}

Determine:
1. Does this qualify for participation exemption (100% exemption)?
2. If not fully qualified, what's missing?
3. Alternative: Should company pay 35% tax and allow shareholder to claim 6/7ths refund (5% effective)?
4. Required documentation
5. Strategic recommendation

Response as JSON:
{
  "qualifies": true/false,
  "reasoning": "Comprehensive explanation",
  "recommendation": "Strategic recommendation",
  "documentation": ["Doc 1", "Doc 2"],
  "confidence": 0.0-1.0,
  "alternative_consideration": "If exemption not optimal"
}`;

        const response = await this.openaiClient!.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a Malta tax expert specializing in participation exemption and corporate tax optimization. Always respond with valid JSON.',
                },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        const result = JSON.parse(content);

        return {
            reasoning: result.reasoning,
            recommendation: result.recommendation,
            documentation: result.documentation || [],
            confidence: result.confidence,
        };
    }

    /**
     * Rule-based qualification analysis
     */
    private ruleBasedAnalysis(
        holding: ParticipationHolding,
        incomeType: string,
        incomeAmount: number,
        basicQualification: { qualifies: boolean; route: ParticipationExemptionRoute | null; reason: string },
        antiAbuseResults: AntiAbuseTestResults
    ): {
        reasoning: string;
        recommendation: string;
        documentation: string[];
        confidence: number;
    } {
        const allTestsPassed = basicQualification.qualifies && antiAbuseResults.allPassed;

        if (allTestsPassed) {
            return {
                reasoning: `Participation exemption applies. ${basicQualification.reason}. All anti-abuse tests passed.`,
                recommendation: `Claim 100% exemption on ${incomeType} of EUR ${incomeAmount.toLocaleString()}. No Malta tax payable.`,
                documentation: [
                    'Certificate of incorporation of subsidiary',
                    'Share register showing equity holding',
                    'Financial statements of subsidiary',
                    'Board resolution electing exemption',
                    'Supporting documentation for anti-abuse tests',
                ],
                confidence: 0.90,
            };
        }

        // Build failure reasoning
        const failedTests: string[] = [];
        if (!basicQualification.qualifies) {
            failedTests.push(`Basic conditions: ${basicQualification.reason}`);
        }
        if (!antiAbuseResults.investmentTest.passed) {
            failedTests.push(`Investment test: ${antiAbuseResults.investmentTest.reasoning}`);
        }
        if (!antiAbuseResults.taxTest.passed) {
            failedTests.push(`Tax test: ${antiAbuseResults.taxTest.reasoning}`);
        }
        if (!antiAbuseResults.activeBusinessTest.passed) {
            failedTests.push(`Active business test: ${antiAbuseResults.activeBusinessTest.reasoning}`);
        }

        return {
            reasoning: `Participation exemption NOT available. Failed: ${failedTests.join('; ')}`,
            recommendation: `Pay 35% Malta corporate tax on ${incomeType} of EUR ${incomeAmount.toLocaleString()}. Shareholder can claim 6/7ths refund for effective 5% rate.`,
            documentation: [],
            confidence: 0.85,
        };
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a Malta Participation Exemption Agent instance
 */
export function createParticipationExemptionAgent(
    config?: ParticipationExemptionAgentConfig
): MaltaParticipationExemptionAgent {
    return new MaltaParticipationExemptionAgent(config);
}

/**
 * Lazy singleton instance
 */
let _maltaParticipationExemptionAgent: MaltaParticipationExemptionAgent | null = null;

export const maltaParticipationExemptionAgent = {
    get instance(): MaltaParticipationExemptionAgent {
        if (!_maltaParticipationExemptionAgent) {
            _maltaParticipationExemptionAgent = new MaltaParticipationExemptionAgent();
        }
        return _maltaParticipationExemptionAgent;
    }
};
