/**
 * Malta Corporate Tax Agent
 * 
 * Autonomous AI agent for Malta corporate income tax and refund calculations.
 * Implements the full imputation system under Income Tax Act (Cap. 123).
 * 
 * Features:
 * - 35% corporate tax calculation
 * - Tax account allocation (MTA, FIA, IPA, FTA, UA)
 * - Shareholder refund system (6/7ths, 5/7ths, 2/3rds)
 * - 2025 FITWI regime (15% final tax)
 * - AI-powered regime suitability analysis
 */

import OpenAI from 'openai';
import type {
    CorporateTaxRequest,
    CorporateTaxResult,
    IncomeBreakdown,
    CompanyProfile,
    TaxAccountAllocation,
    MaltaTaxAccount,
    MaltaTaxAccountType,
    MaltaRefundRateType,
    RefundRateConfig,
    ShareholderRefundCalculation,
    RefundEligibility,
    FITWICalculation,
    FITWISuitabilityAnalysis,
    AccountRefundAnalysis,
    ForeignIncomeItem,
    MALTA_TAX_CONSTANTS,
} from '../../types/malta.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const CORPORATE_TAX_RATE = 35;
const FITWI_RATE = 15;

const REFUND_RATES: Record<MaltaRefundRateType, RefundRateConfig> = {
    six_sevenths: {
        rate: 'six_sevenths',
        numerator: 6,
        denominator: 7,
        decimalValue: 6 / 7,
        effectiveRate: 5, // 35% × (1 - 6/7) = 5%
        applicableTo: ['MTA trading income', 'FIA without DTR', 'IPA property income'],
    },
    five_sevenths: {
        rate: 'five_sevenths',
        numerator: 5,
        denominator: 7,
        decimalValue: 5 / 7,
        effectiveRate: 10, // 35% × (1 - 5/7) = 10%
        applicableTo: ['Passive interest', 'Royalties'],
    },
    two_thirds: {
        rate: 'two_thirds',
        numerator: 2,
        denominator: 3,
        decimalValue: 2 / 3,
        effectiveRate: 11.67, // 35% × (1 - 2/3) ≈ 11.67%
        applicableTo: ['Foreign income with double tax relief claimed'],
    },
    none: {
        rate: 'none',
        numerator: 0,
        denominator: 1,
        decimalValue: 0,
        effectiveRate: 35,
        applicableTo: ['FTA (final tax)', 'UA (untaxed)'],
    },
};

const TAX_ACCOUNT_DESCRIPTIONS: Record<MaltaTaxAccountType, string> = {
    MTA: 'Maltese Taxed Account - Malta-source trading income taxed at 35%',
    FIA: 'Foreign Income Account - Foreign dividends, interest, royalties, capital gains',
    IPA: 'Immovable Property Account - Income from Malta immovable property',
    FTA: 'Final Tax Account - Income already subject to final withholding tax',
    UA: 'Untaxed Account - Tax-exempt income, capital contributions',
};

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export interface MaltaCorporateTaxAgentConfig {
    openaiApiKey?: string;
    organizationId?: string;
    userId?: string;
    enableAIAnalysis?: boolean;
}

// ============================================================================
// MALTA CORPORATE TAX AGENT
// ============================================================================

export class MaltaCorporateTaxAgentV2 {
    public readonly slug = 'malta-corporate-tax-agent';
    public readonly name = 'Malta Corporate Tax Agent';
    public readonly version = '2.0.0';
    public readonly category = 'tax';
    public readonly type = 'autonomous';
    public readonly jurisdiction = 'MT';

    private openaiClient: OpenAI | null = null;
    private config: MaltaCorporateTaxAgentConfig;

    constructor(config: MaltaCorporateTaxAgentConfig = {}) {
        this.config = config;

        try {
            if (config.openaiApiKey) {
                this.openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
            } else if (process.env.OPENAI_API_KEY) {
                this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            }
        } catch (error) {
            // OpenAI client not available (e.g., in test environment)
            this.openaiClient = null;
        }
    }

    /**
     * Get agent capabilities
     */
    getCapabilities(): string[] {
        return [
            'Malta corporate tax calculation (35% statutory rate)',
            'Full imputation system implementation',
            'Tax account allocation (MTA, FIA, IPA, FTA, UA)',
            'Shareholder refund calculations (6/7ths, 5/7ths, 2/3rds)',
            'Effective rate optimization (5% achievable)',
            '2025 FITWI regime (15% final tax)',
            'AI-powered regime suitability analysis',
            'Refund eligibility verification',
            '14-day refund claim deadline enforcement',
        ];
    }

    // ========================================================================
    // CORPORATE TAX CALCULATION
    // ========================================================================

    /**
     * Calculate Malta corporate tax with full imputation
     */
    async calculateCorporateTax(request: CorporateTaxRequest): Promise<CorporateTaxResult | FITWICalculation> {
        if (request.fitwiElected) {
            return this.calculateFITWI(request);
        }
        return this.calculateStandardTax(request);
    }

    /**
     * Standard 35% system with full imputation
     */
    private async calculateStandardTax(request: CorporateTaxRequest): Promise<CorporateTaxResult> {
        const { chargeableIncome, incomeBreakdown, companyProfile } = request;

        // Base tax calculation
        const taxAt35Percent = this.roundCurrency(chargeableIncome * (CORPORATE_TAX_RATE / 100));

        // Allocate income to tax accounts
        const taxAccounts = this.allocateToTaxAccounts(incomeBreakdown, taxAt35Percent);

        // Calculate available refunds per account
        const refundAnalysis = this.calculateRefundsPerAccount(taxAccounts);

        return {
            chargeableIncome,
            corporateTaxRate: CORPORATE_TAX_RATE,
            corporateTaxPayable: taxAt35Percent,
            taxAccounts,
            refundAnalysis,
            regime: 'standard_imputation',
        };
    }

    /**
     * Allocate income to Malta's tax accounts
     */
    private allocateToTaxAccounts(
        incomeBreakdown: IncomeBreakdown,
        totalTax: number
    ): TaxAccountAllocation {
        const accounts: Record<MaltaTaxAccountType, MaltaTaxAccount> = {
            MTA: this.createEmptyAccount('MTA', 'six_sevenths'),
            FIA: this.createEmptyAccount('FIA', 'six_sevenths'),
            IPA: this.createEmptyAccount('IPA', 'six_sevenths'),
            FTA: this.createEmptyAccount('FTA', 'none'),
            UA: this.createEmptyAccount('UA', 'none'),
        };

        let totalIncome = 0;
        let totalTaxPaid = 0;

        // Malta trading income → MTA
        if (incomeBreakdown.maltaTradingIncome && incomeBreakdown.maltaTradingIncome > 0) {
            const income = incomeBreakdown.maltaTradingIncome;
            const tax = this.roundCurrency(income * (CORPORATE_TAX_RATE / 100));
            accounts.MTA = this.calculateAccountWithRefund('MTA', income, tax, 'six_sevenths');
            totalIncome += income;
            totalTaxPaid += tax;
        }

        // Foreign income → FIA
        if (incomeBreakdown.foreignIncome && incomeBreakdown.foreignIncome.length > 0) {
            let fiaIncome = 0;
            let fiaTax = 0;
            let refundRate: MaltaRefundRateType = 'six_sevenths';

            for (const item of incomeBreakdown.foreignIncome) {
                fiaIncome += item.amount;
                fiaTax += this.roundCurrency(item.amount * (CORPORATE_TAX_RATE / 100));

                // Determine refund rate based on income type
                if (item.doubleTaxReliefClaimed) {
                    refundRate = 'two_thirds';
                } else if (item.type === 'interest' || item.type === 'royalty') {
                    refundRate = 'five_sevenths';
                }
            }

            accounts.FIA = this.calculateAccountWithRefund('FIA', fiaIncome, fiaTax, refundRate);
            totalIncome += fiaIncome;
            totalTaxPaid += fiaTax;
        }

        // Malta immovable property → IPA
        if (incomeBreakdown.maltaPropertyIncome && incomeBreakdown.maltaPropertyIncome > 0) {
            const income = incomeBreakdown.maltaPropertyIncome;
            const tax = this.roundCurrency(income * (CORPORATE_TAX_RATE / 100));
            accounts.IPA = this.calculateAccountWithRefund('IPA', income, tax, 'six_sevenths');
            totalIncome += income;
            totalTaxPaid += tax;
        }

        // Final withholding tax income → FTA (no refund)
        if (incomeBreakdown.finalTaxIncome && incomeBreakdown.finalTaxIncome > 0) {
            const income = incomeBreakdown.finalTaxIncome;
            const tax = this.roundCurrency(income * (CORPORATE_TAX_RATE / 100));
            accounts.FTA = this.calculateAccountWithRefund('FTA', income, tax, 'none');
            totalIncome += income;
            totalTaxPaid += tax;
        }

        // Exempt/untaxed income → UA (no refund)
        if (incomeBreakdown.exemptIncome && incomeBreakdown.exemptIncome > 0) {
            accounts.UA = this.calculateAccountWithRefund('UA', incomeBreakdown.exemptIncome, 0, 'none');
            totalIncome += incomeBreakdown.exemptIncome;
        }

        // Calculate totals
        const totalRefundAvailable = Object.values(accounts).reduce((sum, acc) => sum + acc.refundAmount, 0);
        const netEffectiveTax = totalTaxPaid - totalRefundAvailable;
        const overallEffectiveRate = totalIncome > 0
            ? this.roundCurrency((netEffectiveTax / totalIncome) * 100)
            : 0;

        return {
            accounts,
            totalIncome,
            totalTaxPaid,
            totalRefundAvailable,
            netEffectiveTax,
            overallEffectiveRate,
        };
    }

    /**
     * Create empty tax account
     */
    private createEmptyAccount(type: MaltaTaxAccountType, refundRate: MaltaRefundRateType): MaltaTaxAccount {
        return {
            type,
            description: TAX_ACCOUNT_DESCRIPTIONS[type],
            income: 0,
            taxPaid: 0,
            refundRate,
            refundAmount: 0,
            netTaxCost: 0,
            effectiveRate: 0,
        };
    }

    /**
     * Calculate account with refund
     */
    private calculateAccountWithRefund(
        type: MaltaTaxAccountType,
        income: number,
        taxPaid: number,
        refundRateType: MaltaRefundRateType
    ): MaltaTaxAccount {
        const refundConfig = REFUND_RATES[refundRateType];
        const refundAmount = taxPaid > 0
            ? this.roundCurrency(taxPaid * refundConfig.decimalValue)
            : 0;
        const netTaxCost = taxPaid - refundAmount;
        const effectiveRate = income > 0
            ? this.roundCurrency((netTaxCost / income) * 100)
            : 0;

        return {
            type,
            description: TAX_ACCOUNT_DESCRIPTIONS[type],
            income,
            taxPaid,
            refundRate: refundRateType,
            refundAmount,
            netTaxCost,
            effectiveRate,
        };
    }

    /**
     * Calculate refunds per account
     */
    private calculateRefundsPerAccount(
        taxAccounts: TaxAccountAllocation
    ): Record<MaltaTaxAccountType, AccountRefundAnalysis> {
        const analysis: Record<MaltaTaxAccountType, AccountRefundAnalysis> = {} as Record<MaltaTaxAccountType, AccountRefundAnalysis>;

        for (const [accountType, account] of Object.entries(taxAccounts.accounts)) {
            const refundConfig = REFUND_RATES[account.refundRate];

            analysis[accountType as MaltaTaxAccountType] = {
                grossIncome: account.income,
                taxAt35Percent: account.taxPaid,
                refundRate: refundConfig.decimalValue,
                refundAmount: account.refundAmount,
                netTaxCost: account.netTaxCost,
                effectiveRatePercent: account.effectiveRate,
                refundAvailable: account.refundRate !== 'none' && account.taxPaid > 0,
                reason: account.refundRate === 'none'
                    ? (accountType === 'FTA' ? 'Final tax account' : 'Untaxed account')
                    : undefined,
            };
        }

        return analysis;
    }

    // ========================================================================
    // FITWI REGIME (2025)
    // ========================================================================

    /**
     * Calculate FITWI (15% Final Income Tax Without Imputation)
     */
    private async calculateFITWI(request: CorporateTaxRequest): Promise<FITWICalculation> {
        const { chargeableIncome, incomeBreakdown, companyProfile } = request;

        // Calculate 15% FITWI tax
        const fitwiTax = this.roundCurrency(chargeableIncome * (FITWI_RATE / 100));

        // Calculate what standard system would yield (with refunds)
        const standardCalculation = await this.calculateStandardTax(request);
        const estimatedEffectiveStandard = standardCalculation.taxAccounts.netEffectiveTax;

        // Apply safeguard: higher of 15% or effective standard
        const safeguardTriggered = fitwiTax < estimatedEffectiveStandard;
        const finalTaxPayable = Math.max(fitwiTax, estimatedEffectiveStandard);

        // AI analysis for FITWI suitability
        let suitabilityAnalysis: FITWISuitabilityAnalysis | undefined;
        if (this.openaiClient && this.config.enableAIAnalysis !== false) {
            try {
                suitabilityAnalysis = await this.analyzeFITWISuitability(
                    chargeableIncome,
                    incomeBreakdown,
                    companyProfile,
                    fitwiTax,
                    estimatedEffectiveStandard
                );
            } catch (error) {
                console.warn('AI FITWI analysis failed:', error);
            }
        }

        return {
            chargeableIncome,
            fitwiTaxRate: FITWI_RATE,
            fitwiTax,
            estimatedEffectiveStandard,
            safeguardTriggered,
            finalTaxPayable,
            regime: 'fitwi_15_percent',
            bindingPeriod: '5 years minimum',
            canRevertAfter: '5 years in standard system',
            suitabilityAnalysis,
        };
    }

    /**
     * AI-powered FITWI suitability analysis
     */
    private async analyzeFITWISuitability(
        chargeableIncome: number,
        incomeBreakdown: IncomeBreakdown,
        companyProfile: CompanyProfile,
        fitwiTax: number,
        standardEffective: number
    ): Promise<FITWISuitabilityAnalysis> {
        const prompt = `Analyze whether this Malta company should elect the 2025 FITWI (15% Final Income Tax Without Imputation) regime.

Company Profile:
- Chargeable Income: EUR ${chargeableIncome}
- Shareholder Structure: ${companyProfile.shareholderStructure || 'Not specified'}
- Foreign Shareholders: ${companyProfile.foreignShareholders || 'Unknown'}
- Pillar Two Subject: ${companyProfile.pillarTwoSubject || 'Unknown'}
- Refunds Claimable: ${companyProfile.refundsClaimable ?? true}

Income Sources:
- Malta Trading: EUR ${incomeBreakdown.maltaTradingIncome || 0}
- Malta Property: EUR ${incomeBreakdown.maltaPropertyIncome || 0}
- Foreign Income Items: ${incomeBreakdown.foreignIncome?.length || 0}
- Exempt Income: EUR ${incomeBreakdown.exemptIncome || 0}

Tax Comparison:
- FITWI Tax (15%): EUR ${fitwiTax}
- Standard System Effective (with refunds): EUR ${standardEffective}
- Tax Saving with FITWI: EUR ${standardEffective - fitwiTax}

Consider:
1. Are shareholders able to claim and benefit from Malta tax refunds?
2. Is the company subject to Pillar Two (15% minimum tax)?
3. Does the company value simplicity over maximum tax efficiency?
4. Can shareholders utilize foreign tax credits in their jurisdictions?
5. Is the 5-year binding period acceptable?

Provide your response as JSON:
{
  "recommendation": "elect_fitwi|stay_standard|case_by_case",
  "reasoning": "Main reason for recommendation",
  "key_factors": ["Factor 1", "Factor 2"],
  "shareholder_impact": "Impact on shareholders",
  "long_term_considerations": ["Consideration 1"],
  "pillar_two_implications": "If applicable"
}`;

        const response = await this.openaiClient!.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a Malta tax expert specializing in the full imputation system and FITWI regime. Always respond with valid JSON.',
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
            recommendation: result.recommendation,
            reasoning: result.reasoning,
            keyFactors: result.key_factors || [],
            shareholderImpact: result.shareholder_impact,
            longTermConsiderations: result.long_term_considerations || [],
            pillarTwoImplications: result.pillar_two_implications,
        };
    }

    // ========================================================================
    // SHAREHOLDER REFUND CALCULATIONS
    // ========================================================================

    /**
     * Calculate shareholder refund claim
     */
    async calculateShareholderRefund(
        dividendAmount: number,
        sourceAccount: MaltaTaxAccountType,
        shareholderDetails: {
            shareholderId: string;
            isDirectShareholder: boolean;
            beneficialOwnersDisclosed: boolean;
            dividendDate: Date;
            taxExempt?: boolean;
            exemptionAllowsRefund?: boolean;
        }
    ): Promise<ShareholderRefundCalculation> {
        // Verify eligibility
        const eligibility = this.verifyRefundEligibility(shareholderDetails);
        if (!eligibility.eligible) {
            throw new Error(`Shareholder ineligible for refund: ${eligibility.errors.join(', ')}`);
        }

        // Get refund rate for account
        const refundRateType = this.getRefundRateForAccount(sourceAccount);
        const refundConfig = REFUND_RATES[refundRateType];

        if (refundConfig.rate === 'none') {
            return {
                dividendAmount,
                sourceAccount,
                grossIncome: dividendAmount,
                taxPaidOnIncome: 0,
                refundRate: refundConfig,
                refundAmount: 0,
                netTaxCost: 0,
                effectiveTaxRate: 0,
                shareholderNetReceipt: dividendAmount,
                claimDeadline: this.calculateClaimDeadline(shareholderDetails.dividendDate),
            };
        }

        // Calculate gross income from net dividend
        // Dividend = Income - Tax = Income - (Income × 0.35) = Income × 0.65
        // Therefore: Income = Dividend / 0.65
        const grossIncome = this.roundCurrency(dividendAmount / (1 - CORPORATE_TAX_RATE / 100));
        const taxPaid = this.roundCurrency(grossIncome * (CORPORATE_TAX_RATE / 100));

        // Calculate refund
        const refundAmount = this.roundCurrency(taxPaid * refundConfig.decimalValue);
        const netTaxCost = taxPaid - refundAmount;
        const effectiveTaxRate = this.roundCurrency((netTaxCost / grossIncome) * 100);

        // Shareholder receives: Dividend + Refund
        const shareholderNetReceipt = this.roundCurrency(dividendAmount + refundAmount);

        return {
            dividendAmount,
            sourceAccount,
            grossIncome,
            taxPaidOnIncome: taxPaid,
            refundRate: refundConfig,
            refundAmount,
            netTaxCost,
            effectiveTaxRate,
            shareholderNetReceipt,
            claimDeadline: this.calculateClaimDeadline(shareholderDetails.dividendDate),
        };
    }

    /**
     * Verify shareholder eligibility for refund
     */
    private verifyRefundEligibility(shareholderDetails: {
        shareholderId: string;
        isDirectShareholder: boolean;
        beneficialOwnersDisclosed: boolean;
        dividendDate: Date;
        taxExempt?: boolean;
        exemptionAllowsRefund?: boolean;
    }): RefundEligibility {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Must be direct shareholder
        if (!shareholderDetails.isDirectShareholder) {
            errors.push('Only direct shareholders can claim refunds');
        }

        // Beneficial ownership disclosure required
        if (!shareholderDetails.beneficialOwnersDisclosed) {
            errors.push('Ultimate beneficial owners must be disclosed');
        }

        // Claim must be within 14 days
        const daysSinceDividend = Math.floor(
            (new Date().getTime() - shareholderDetails.dividendDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const withinClaimPeriod = daysSinceDividend <= 14;

        if (!withinClaimPeriod) {
            errors.push(`Refund claim exceeds 14-day deadline (day ${daysSinceDividend})`);
        }

        // Tax-exempt entities
        if (shareholderDetails.taxExempt && !shareholderDetails.exemptionAllowsRefund) {
            errors.push('Tax-exempt entities cannot claim refunds unless specific rules apply');
        }

        return {
            eligible: errors.length === 0,
            shareholderId: shareholderDetails.shareholderId,
            isDirectShareholder: shareholderDetails.isDirectShareholder,
            beneficialOwnersDisclosed: shareholderDetails.beneficialOwnersDisclosed,
            withinClaimPeriod,
            errors,
            warnings,
        };
    }

    /**
     * Get refund rate for tax account
     */
    private getRefundRateForAccount(account: MaltaTaxAccountType): MaltaRefundRateType {
        switch (account) {
            case 'MTA':
            case 'IPA':
                return 'six_sevenths';
            case 'FIA':
                return 'six_sevenths'; // May vary - simplified
            case 'FTA':
            case 'UA':
                return 'none';
            default:
                return 'none';
        }
    }

    /**
     * Calculate claim deadline (14 days from dividend)
     */
    private calculateClaimDeadline(dividendDate: Date): string {
        const deadline = new Date(dividendDate);
        deadline.setDate(deadline.getDate() + 14);
        return deadline.toISOString().slice(0, 10);
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Round to 2 decimal places
     */
    private roundCurrency(amount: number): number {
        return Math.round(amount * 100) / 100;
    }

    /**
     * Get refund rate configurations
     */
    getRefundRates(): typeof REFUND_RATES {
        return REFUND_RATES;
    }

    /**
     * Get tax account descriptions
     */
    getTaxAccountDescriptions(): typeof TAX_ACCOUNT_DESCRIPTIONS {
        return TAX_ACCOUNT_DESCRIPTIONS;
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a Malta Corporate Tax Agent instance
 */
export function createMaltaCorporateTaxAgentV2(config?: MaltaCorporateTaxAgentConfig): MaltaCorporateTaxAgentV2 {
    return new MaltaCorporateTaxAgentV2(config);
}

/**
 * Lazy singleton instance
 */
let _maltaCorporateTaxAgentV2: MaltaCorporateTaxAgentV2 | null = null;

export const maltaCorporateTaxAgentV2 = {
    get instance(): MaltaCorporateTaxAgentV2 {
        if (!_maltaCorporateTaxAgentV2) {
            _maltaCorporateTaxAgentV2 = new MaltaCorporateTaxAgentV2();
        }
        return _maltaCorporateTaxAgentV2;
    }
};
