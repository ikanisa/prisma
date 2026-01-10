/**
 * Malta VAT Agent
 * 
 * Autonomous AI agent for Malta VAT calculation and compliance.
 * Implements Value Added Tax Act (Act XXIII of 1998) with 2025 updates.
 * 
 * Features:
 * - AI-powered rate classification using OpenAI GPT-4
 * - Multi-rate support (18%, 12%, 7%, 5%, 0%, exempt)
 * - Reverse charge detection for B2B intra-EU
 * - SME scheme eligibility (Article 11/11A/11B)
 * - Intrastat threshold monitoring
 * - VAT return validation
 */

import OpenAI from 'openai';
import type {
    MaltaVATRequest,
    MaltaVATResult,
    VATReturnValidation,
    VATValidationIssue,
    VATTransactionType,
    CustomerType,
    CFRVATReturnRequest,
    CFRResponse,
    EU_COUNTRY_CODES,
    MALTA_TAX_CONSTANTS,
} from '../../types/malta.js';
import {
    MALTA_VAT_RATES,
} from '../../services/malta-vat-engine.js';
import { type MaltaVATRateType } from '../../types/jurisdictions.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const VAT_THRESHOLDS = {
    ARTICLE_10_GOODS: 35000,
    ARTICLE_10_SERVICES: 30000,
    ARTICLE_11_DOMESTIC: 35000,
    ARTICLE_11A_EU_WIDE: 100000,
    INTRASTAT: 700,
    EU_DISTANCE_SELLING: 10000,
};

const EU_COUNTRIES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
];

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export interface MaltaVATAgentConfig {
    openaiApiKey?: string;
    organizationId?: string;
    userId?: string;
    enableAIClassification?: boolean;
}

// ============================================================================
// MALTA VAT AGENT
// ============================================================================

export class MaltaVATAgent {
    public readonly slug = 'malta-vat-agent';
    public readonly name = 'Malta VAT Agent';
    public readonly version = '2.0.0';
    public readonly category = 'tax';
    public readonly type = 'autonomous';
    public readonly jurisdiction = 'MT';

    private openaiClient: OpenAI | null = null;
    private config: MaltaVATAgentConfig;

    constructor(config: MaltaVATAgentConfig = {}) {
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
            'Malta VAT calculation (18% standard, reduced rates)',
            'AI-powered rate classification',
            '2025 VAT rate structure (12%, 7%, 5%, zero, exempt)',
            'Article 10/11/11A/11B registration assessment',
            'B2B intra-EU reverse charge detection',
            'Intrastat reporting threshold monitoring',
            'Recapitulative statement generation',
            'VAT return pre-submission validation',
            'VIDA initiative support framework',
        ];
    }

    // ========================================================================
    // CORE VAT CALCULATION
    // ========================================================================

    /**
     * Calculate VAT for a transaction with AI-powered rate classification
     */
    async calculateVAT(request: MaltaVATRequest): Promise<MaltaVATResult> {
        // Step 1: Determine place of supply
        const placeOfSupply = this.determinePlaceOfSupply(request);

        // Step 2: Check if Malta VAT applies
        if (placeOfSupply !== 'MT') {
            return this.handleNonMaltaSupply(request, placeOfSupply);
        }

        // Step 3: Check for reverse charge
        const reverseCharge = this.isReverseChargeApplicable(request);

        // Step 4: Classify VAT rate (AI-powered if available)
        const rateClassification = await this.classifyVATRate(request);

        // Step 5: Calculate VAT
        const rate = MALTA_VAT_RATES[rateClassification.rateType];

        if (reverseCharge) {
            return {
                vatRate: rate.rate,
                vatAmount: 0,
                totalAmount: request.amount,
                rateClassification: rateClassification.rateType,
                reverseChargeApplicable: true,
                placeOfSupply,
                reasoning: `Reverse charge applicable - ${rateClassification.reasoning}`,
                confidenceScore: rateClassification.confidence,
                applicableArticles: ['VAT Act Article 21'],
                cfrGuidanceReferences: ['Reverse charge for B2B intra-EU supplies'],
            };
        }

        const vatAmount = this.roundCurrency(request.amount * (rate.rate / 100));
        const totalAmount = this.roundCurrency(request.amount + vatAmount);

        return {
            vatRate: rate.rate,
            vatAmount,
            totalAmount,
            rateClassification: rateClassification.rateType,
            reverseChargeApplicable: false,
            placeOfSupply,
            reasoning: rateClassification.reasoning,
            confidenceScore: rateClassification.confidence,
            applicableArticles: rateClassification.articles,
            cfrGuidanceReferences: rateClassification.guidance,
        };
    }

    /**
     * AI-powered VAT rate classification
     */
    private async classifyVATRate(request: MaltaVATRequest): Promise<{
        rateType: MaltaVATRateType;
        reasoning: string;
        confidence: number;
        articles: string[];
        guidance: string[];
    }> {
        // If AI is available and enabled, use GPT-4 for classification
        if (this.openaiClient && this.config.enableAIClassification !== false) {
            try {
                return await this.aiClassifyRate(request);
            } catch (error) {
                console.warn('AI classification failed, falling back to rule-based:', error);
            }
        }

        // Fallback to rule-based classification
        return this.ruleBasedClassification(request);
    }

    /**
     * GPT-4 powered rate classification
     */
    private async aiClassifyRate(request: MaltaVATRequest): Promise<{
        rateType: MaltaVATRateType;
        reasoning: string;
        confidence: number;
        articles: string[];
        guidance: string[];
    }> {
        const prompt = `You are a Malta VAT expert. Classify the following transaction to the correct VAT rate.

Transaction Details:
- Description: ${request.description}
- Type: ${request.goodsOrServices}
- Amount: EUR ${request.amount}
- Customer Type: ${request.customerType}
- Customer Location: ${request.customerLocation}

Malta VAT Rates (2025):
- Standard (18%): Most goods and services
- Reduced 12%: Custody/management of securities, credit guarantees, pleasure boat hiring (conditions)
- Reduced 7%: Hotel accommodation, tourist accommodation, sports facilities
- Reduced 5%: Electricity, books, medical equipment, pharma, confectionery, cultural events
- Zero (0%): Exports, food for human consumption, specific pharma/medical
- Exempt: Insurance, financial transactions, education, medical services

Provide your response as JSON with:
{
  "rate_type": "standard|reduced_12|reduced_7|reduced_5|zero|exempt",
  "confidence": 0.0-1.0,
  "reasoning": "Explanation of classification",
  "vat_act_articles": ["List of applicable VAT Act articles"],
  "cfr_guidance": ["Any relevant CFR guidance references"]
}`;

        const response = await this.openaiClient!.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a Malta VAT classification expert with deep knowledge of the VAT Act (XXIII/1998) and all CFR guidelines. Always respond with valid JSON.',
                },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        const result = JSON.parse(content);

        // Flag for human review if confidence is low
        if (result.confidence < 0.85) {
            console.warn(`Low confidence VAT classification (${result.confidence}): ${request.description}`);
        }

        return {
            rateType: result.rate_type as MaltaVATRateType,
            reasoning: result.reasoning,
            confidence: result.confidence,
            articles: result.vat_act_articles || [],
            guidance: result.cfr_guidance || [],
        };
    }

    /**
     * Rule-based rate classification (fallback)
     */
    private ruleBasedClassification(request: MaltaVATRequest): {
        rateType: MaltaVATRateType;
        reasoning: string;
        confidence: number;
        articles: string[];
        guidance: string[];
    } {
        const description = request.description.toLowerCase();

        // Zero-rated (exports)
        if (request.transactionType === 'export') {
            return {
                rateType: 'zero',
                reasoning: 'Export to third country - zero rated',
                confidence: 0.95,
                articles: ['VAT Act Schedule 4'],
                guidance: [],
            };
        }

        // Reduced 5%
        const reduced5Keywords = [
            'electricity', 'book', 'newspaper', 'periodical', 'medical equipment',
            'pharmaceutical', 'confectionery', 'cultural event', 'theatre', 'concert',
        ];
        if (reduced5Keywords.some(kw => description.includes(kw))) {
            return {
                rateType: 'reduced_5',
                reasoning: `Reduced 5% rate - ${request.description} matches Schedule 6C categories`,
                confidence: 0.85,
                articles: ['VAT Act Schedule 6C'],
                guidance: [],
            };
        }

        // Reduced 7%
        const reduced7Keywords = ['hotel', 'accommodation', 'sports facility', 'tourism'];
        if (reduced7Keywords.some(kw => description.includes(kw))) {
            return {
                rateType: 'reduced_7',
                reasoning: `Reduced 7% rate - ${request.description} matches Schedule 6B categories`,
                confidence: 0.85,
                articles: ['VAT Act Schedule 6B'],
                guidance: [],
            };
        }

        // Reduced 12%
        const reduced12Keywords = ['securities', 'custody', 'credit guarantee', 'boat hire'];
        if (reduced12Keywords.some(kw => description.includes(kw))) {
            return {
                rateType: 'reduced_12',
                reasoning: `Reduced 12% rate - ${request.description} matches Schedule 6A categories`,
                confidence: 0.80,
                articles: ['VAT Act Schedule 6A'],
                guidance: [],
            };
        }

        // Exempt
        const exemptKeywords = ['insurance', 'education', 'medical service', 'postal'];
        if (exemptKeywords.some(kw => description.includes(kw))) {
            return {
                rateType: 'exempt',
                reasoning: `Exempt supply - ${request.description} matches Schedule 5 categories`,
                confidence: 0.80,
                articles: ['VAT Act Schedule 5'],
                guidance: [],
            };
        }

        // Default to standard
        return {
            rateType: 'standard',
            reasoning: 'Standard 18% rate applies - no reduced rate category identified',
            confidence: 0.90,
            articles: ['VAT Act Article 12(1)'],
            guidance: [],
        };
    }

    // ========================================================================
    // PLACE OF SUPPLY & REVERSE CHARGE
    // ========================================================================

    /**
     * Determine place of supply under EU VAT rules
     */
    private determinePlaceOfSupply(request: MaltaVATRequest): string {
        if (request.goodsOrServices === 'goods') {
            if (request.transactionType === 'export') {
                return request.customerLocation;
            }
            if (request.transactionType === 'import') {
                return 'MT';
            }
            // Domestic or intra-EU goods
            return request.customerLocation === 'MT' ? 'MT' : request.customerLocation;
        }

        // Services
        if (request.customerType === 'b2b') {
            // B2B services: customer location (reverse charge)
            return request.customerLocation;
        }

        // B2C services: supplier location (Malta)
        return 'MT';
    }

    /**
     * Check if reverse charge applies
     */
    private isReverseChargeApplicable(request: MaltaVATRequest): boolean {
        // B2B intra-EU supply with valid VAT number
        const isEU = EU_COUNTRIES.includes(request.customerLocation);
        const hasVATNumber = !!request.customerVATNumber;
        const isB2B = request.customerType === 'b2b';
        const isNotDomestic = request.customerLocation !== 'MT';

        return isEU && hasVATNumber && isB2B && isNotDomestic;
    }

    /**
     * Handle non-Malta supply
     */
    private handleNonMaltaSupply(request: MaltaVATRequest, placeOfSupply: string): MaltaVATResult {
        return {
            vatRate: 0,
            vatAmount: 0,
            totalAmount: request.amount,
            rateClassification: 'zero',
            reverseChargeApplicable: placeOfSupply !== 'MT',
            placeOfSupply,
            reasoning: `Place of supply is ${placeOfSupply}, not Malta - Malta VAT does not apply`,
            confidenceScore: 0.95,
            applicableArticles: ['VAT Act Articles 11-14 (Place of Supply)'],
            cfrGuidanceReferences: [],
        };
    }

    // ========================================================================
    // SME SCHEME ELIGIBILITY
    // ========================================================================

    /**
     * Check SME scheme eligibility (Article 11/11A/11B)
     */
    checkSMEEligibility(
        domesticTurnover: number,
        euWideTurnover: number = 0
    ): {
        article11Eligible: boolean;
        article11AEligible: boolean;
        recommendation: string;
        nextAction: string;
    } {
        const article11Eligible = domesticTurnover < VAT_THRESHOLDS.ARTICLE_11_DOMESTIC;
        const article11AEligible = euWideTurnover < VAT_THRESHOLDS.ARTICLE_11A_EU_WIDE;

        let recommendation: string;
        let nextAction: string;

        if (!article11Eligible && !article11AEligible) {
            recommendation = 'Standard VAT registration required - both thresholds exceeded';
            nextAction = 'REGISTER_ARTICLE_10';
        } else if (article11Eligible && article11AEligible) {
            recommendation = 'Eligible for SME domestic exemption and EU cross-border exemption';
            nextAction = 'EVALUATE_ARTICLE_11A';
        } else if (article11Eligible && !article11AEligible) {
            recommendation = 'Eligible for domestic exemption only - EU threshold exceeded';
            nextAction = 'REGISTER_FOR_EU_SALES';
        } else {
            recommendation = 'Consider EU SME scheme for cross-border exemption';
            nextAction = 'REGISTER_ARTICLE_11A';
        }

        return {
            article11Eligible,
            article11AEligible,
            recommendation,
            nextAction,
        };
    }

    /**
     * Check Intrastat reporting requirement
     */
    checkIntrastatRequired(euTradeVolume: number): {
        required: boolean;
        threshold: number;
        currentVolume: number;
        action: string;
    } {
        const required = euTradeVolume > VAT_THRESHOLDS.INTRASTAT;

        return {
            required,
            threshold: VAT_THRESHOLDS.INTRASTAT,
            currentVolume: euTradeVolume,
            action: required
                ? 'Submit Intrastat declaration by 10th of each month'
                : 'No Intrastat required - below €700 monthly threshold',
        };
    }

    // ========================================================================
    // VAT RETURN VALIDATION
    // ========================================================================

    /**
     * Validate VAT return before CFR submission
     */
    async validateVATReturn(returnData: CFRVATReturnRequest): Promise<VATReturnValidation> {
        const errors: VATValidationIssue[] = [];
        const warnings: VATValidationIssue[] = [];

        // 1. Check filing deadline
        const periodEnd = new Date(returnData.periodEnd);
        const now = new Date();
        const filingDeadline = new Date(periodEnd);
        filingDeadline.setMonth(filingDeadline.getMonth() + 2);
        filingDeadline.setDate(15);

        if (now > filingDeadline) {
            errors.push({
                code: 'LATE_FILING',
                severity: 'error',
                message: `Filing deadline ${filingDeadline.toISOString().slice(0, 10)} exceeded`,
                action: 'Submit immediately - daily fines and interest apply',
                penalty: 'Penalty of 10% of VAT due plus interest at 0.54% per month',
            });
        }

        // 2. Validate net VAT calculation
        const expectedNetVAT = returnData.box1OutputVAT - returnData.box2InputVAT;
        if (Math.abs(expectedNetVAT - returnData.box3NetVAT) > 0.01) {
            errors.push({
                code: 'NET_VAT_MISMATCH',
                severity: 'error',
                message: `Net VAT (${returnData.box3NetVAT}) does not match Output (${returnData.box1OutputVAT}) - Input (${returnData.box2InputVAT})`,
                action: 'Correct the calculation before submission',
            });
        }

        // 3. Check Intrastat requirements
        const intraEUValue = (returnData.intraEUSupplies || []).reduce((sum, s) => sum + s.value, 0);
        if (intraEUValue > VAT_THRESHOLDS.INTRASTAT) {
            warnings.push({
                code: 'INTRASTAT_REQUIRED',
                severity: 'warning',
                message: `Intra-EU supplies €${intraEUValue} exceed €700 threshold`,
                action: 'Submit Intrastat declaration by 10th of month',
            });
        }

        // 4. Check recapitulative statement
        if ((returnData.intraEUSupplies || []).length > 0) {
            warnings.push({
                code: 'RECAP_REMINDER',
                severity: 'warning',
                message: 'Recapitulative statement (EC Sales List) required for intra-EU B2B supplies',
                action: 'Submit by 15th of following month',
            });
        }

        // 5. Validate VAT number format
        for (const supply of returnData.intraEUSupplies || []) {
            if (!this.isValidEUVATNumber(supply.customerVATNumber)) {
                warnings.push({
                    code: 'INVALID_VAT_NUMBER',
                    severity: 'warning',
                    message: `Customer VAT number ${supply.customerVATNumber} format may be invalid`,
                    action: 'Verify VAT number via VIES before submission',
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            submissionReady: errors.length === 0,
        };
    }

    /**
     * Validate EU VAT number format
     */
    private isValidEUVATNumber(vatNumber?: string): boolean {
        if (!vatNumber) return false;

        // Basic format: 2-letter country code + 2-12 characters
        const pattern = /^[A-Z]{2}[A-Z0-9]{2,12}$/;
        return pattern.test(vatNumber.toUpperCase());
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Round to 2 decimal places for EUR
     */
    private roundCurrency(amount: number): number {
        return Math.round(amount * 100) / 100;
    }

    /**
     * Get all available VAT rates
     */
    getAllRates(): typeof MALTA_VAT_RATES {
        return MALTA_VAT_RATES;
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a Malta VAT Agent instance
 */
export function createMaltaVATAgent(config?: MaltaVATAgentConfig): MaltaVATAgent {
    return new MaltaVATAgent(config);
}

/**
 * Lazy singleton instance
 */
let _maltaVATAgent: MaltaVATAgent | null = null;

export const maltaVATAgent = {
    get instance(): MaltaVATAgent {
        if (!_maltaVATAgent) {
            _maltaVATAgent = new MaltaVATAgent();
        }
        return _maltaVATAgent;
    }
};
