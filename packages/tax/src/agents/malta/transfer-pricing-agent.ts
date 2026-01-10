/**
 * Malta Transfer Pricing Agent
 * 
 * Autonomous AI agent for Malta transfer pricing compliance.
 * Implements OECD Guidelines + EU Transfer Pricing Directive.
 * 
 * Features:
 * - Related party transaction assessment
 * - Arm's length principle compliance
 * - OECD pricing methods (CUP, RPM, CPM, TNMM, PSM)
 * - Master File/Local File generation
 * - Documentation adequacy checks
 */

import OpenAI from 'openai';
import type {
    RelatedPartyTransaction,
    TransferPricingAssessment,
    TPRisk,
    TPDocumentation,
    TPMasterFile,
    TPLocalFile,
    CompanyProfile,
} from '../../types/malta.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const TP_THRESHOLDS = {
    DOCUMENTATION_THRESHOLD: 500000, // EUR 500k
    HIGH_RISK_THRESHOLD: 5000000, // EUR 5M
    CBCR_THRESHOLD: 750000000, // EUR 750M consolidated revenue
};

const OECD_METHODS = {
    CUP: 'Comparable Uncontrolled Price',
    RPM: 'Resale Price Method',
    CPM: 'Cost Plus Method',
    TNMM: 'Transactional Net Margin Method',
    PSM: 'Profit Split Method',
} as const;

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export interface TransferPricingAgentConfig {
    openaiApiKey?: string;
    organizationId?: string;
    userId?: string;
    enableAIAnalysis?: boolean;
}

// ============================================================================
// TRANSFER PRICING AGENT
// ============================================================================

export class MaltaTransferPricingAgent {
    public readonly slug = 'malta-transfer-pricing-agent';
    public readonly name = 'Malta Transfer Pricing Agent';
    public readonly version = '2.0.0';
    public readonly category = 'tax';
    public readonly type = 'autonomous';
    public readonly jurisdiction = 'MT';

    private openaiClient: OpenAI | null = null;
    private config: TransferPricingAgentConfig;

    constructor(config: TransferPricingAgentConfig = {}) {
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
            'Transfer pricing compliance assessment',
            'Arm\'s length principle validation',
            'OECD pricing method selection (CUP, RPM, CPM, TNMM, PSM)',
            'Related party transaction analysis',
            'Master File generation (BEPS Action 13)',
            'Local File generation',
            'Documentation adequacy checks',
            'Risk identification and remediation',
            'AI-powered comparability analysis',
        ];
    }

    // ========================================================================
    // COMPREHENSIVE ASSESSMENT
    // ========================================================================

    /**
     * Comprehensive transfer pricing compliance assessment
     */
    async assessTransferPricing(
        transactions: RelatedPartyTransaction[],
        companyDetails: CompanyProfile,
        fiscalYear: number
    ): Promise<TransferPricingAssessment> {
        // Calculate total related party value
        const totalValue = transactions.reduce((sum, txn) => sum + txn.amount, 0);

        // Assess arm's length principle compliance
        const armLengthAssessment = await this.assessArmsLength(transactions, companyDetails);

        // Check documentation adequacy
        const documentationCheck = this.checkDocumentation(transactions, totalValue);

        // Identify risks
        const risks = await this.identifyRisks(transactions, companyDetails, armLengthAssessment);

        // Generate recommendations
        const recommendations = this.generateRecommendations(transactions, risks, documentationCheck);

        return {
            transactions,
            totalRelatedPartyValue: totalValue,
            armLengthCompliance: armLengthAssessment.compliant,
            documentationAdequate: documentationCheck.adequate,
            risksIdentified: risks,
            recommendations,
            masterFileRequired: documentationCheck.masterFileRequired,
            localFileRequired: documentationCheck.localFileRequired,
        };
    }

    // ========================================================================
    // ARM'S LENGTH ASSESSMENT
    // ========================================================================

    /**
     * AI-powered arm's length principle assessment
     */
    private async assessArmsLength(
        transactions: RelatedPartyTransaction[],
        companyDetails: CompanyProfile
    ): Promise<{
        compliant: boolean;
        transactionResults: Record<string, {
            compliant: boolean;
            methodAppropriate: boolean;
            concerns: string[];
        }>;
    }> {
        if (this.openaiClient && this.config.enableAIAnalysis !== false) {
            try {
                return await this.aiAssessArmsLength(transactions, companyDetails);
            } catch (error) {
                console.warn('AI arm\'s length assessment failed:', error);
            }
        }

        return this.ruleBasedArmsLengthAssessment(transactions);
    }

    /**
     * AI-powered arm's length assessment
     */
    private async aiAssessArmsLength(
        transactions: RelatedPartyTransaction[],
        companyDetails: CompanyProfile
    ): Promise<{
        compliant: boolean;
        transactionResults: Record<string, {
            compliant: boolean;
            methodAppropriate: boolean;
            concerns: string[];
        }>;
    }> {
        const txnSummary = transactions.map(txn =>
            `- ${txn.transactionId}: ${txn.transactionType} with ${txn.counterpartyName} (${txn.counterpartyJurisdiction}): EUR ${txn.amount.toLocaleString()}, Method: ${txn.pricingMethod}`
        ).join('\n');

        const prompt = `Assess whether these related party transactions comply with the arm's length principle:

Transactions:
${txnSummary}

Company Profile:
- Functions: ${companyDetails.functions || 'Unknown'}
- Assets: ${companyDetails.keyAssets || 'Unknown'}
- Risks: ${companyDetails.risksAssumed || 'Unknown'}
- Industry: ${companyDetails.industry || 'Unknown'}

For each transaction:
1. Is the pricing method appropriate for the transaction type?
2. Are comparable uncontrolled transactions likely available?
3. Are there any red flags suggesting non-arm's length pricing?
4. Overall compliance assessment

Return as JSON:
{
  "overall_compliant": true/false,
  "transactions": {
    "transaction_id": {
      "compliant": true/false,
      "method_appropriate": true/false,
      "concerns": ["Concern 1"]
    }
  }
}`;

        const response = await this.openaiClient!.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a transfer pricing expert specializing in OECD Guidelines and Malta/EU requirements. Always respond with valid JSON.',
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
            compliant: result.overall_compliant,
            transactionResults: result.transactions,
        };
    }

    /**
     * Rule-based arm's length assessment
     */
    private ruleBasedArmsLengthAssessment(transactions: RelatedPartyTransaction[]): {
        compliant: boolean;
        transactionResults: Record<string, {
            compliant: boolean;
            methodAppropriate: boolean;
            concerns: string[];
        }>;
    } {
        const transactionResults: Record<string, {
            compliant: boolean;
            methodAppropriate: boolean;
            concerns: string[];
        }> = {};

        let allCompliant = true;

        for (const txn of transactions) {
            const concerns: string[] = [];
            let methodAppropriate = true;

            // Check pricing method appropriateness
            if (txn.transactionType === 'goods' && !['CUP', 'RPM', 'CPM'].includes(txn.pricingMethod)) {
                concerns.push(`${txn.pricingMethod} may not be optimal for goods transactions`);
                methodAppropriate = false;
            }

            if (txn.transactionType === 'services' && !['CUP', 'CPM', 'TNMM'].includes(txn.pricingMethod)) {
                concerns.push(`Consider CUP, CPM, or TNMM for services transactions`);
            }

            if (txn.transactionType === 'financing' && txn.pricingMethod !== 'CUP') {
                concerns.push(`CUP typically preferred for financing transactions`);
            }

            if (txn.transactionType === 'intangibles' && !['CUP', 'PSM'].includes(txn.pricingMethod)) {
                concerns.push(`Intangibles often require CUP or Profit Split Method`);
            }

            // Check documentation
            if (!txn.documentationExists && txn.amount > TP_THRESHOLDS.DOCUMENTATION_THRESHOLD) {
                concerns.push(`Material transaction lacks documentation`);
            }

            // High-risk jurisdictions
            const lowTaxJurisdictions = ['AE', 'BH', 'BM', 'KY', 'JE', 'GG', 'IM', 'VG'];
            if (lowTaxJurisdictions.includes(txn.counterpartyJurisdiction)) {
                concerns.push(`Transaction with low-tax jurisdiction requires enhanced scrutiny`);
            }

            const compliant = concerns.length === 0 || !concerns.some(c =>
                c.includes('lacks documentation') || c.includes('enhanced scrutiny')
            );

            if (!compliant) allCompliant = false;

            transactionResults[txn.transactionId] = {
                compliant,
                methodAppropriate,
                concerns,
            };
        }

        return {
            compliant: allCompliant,
            transactionResults,
        };
    }

    // ========================================================================
    // DOCUMENTATION CHECK
    // ========================================================================

    /**
     * Check if transfer pricing documentation is adequate
     */
    private checkDocumentation(
        transactions: RelatedPartyTransaction[],
        totalValue: number
    ): {
        adequate: boolean;
        masterFileRequired: boolean;
        localFileRequired: boolean;
        issues: TPRisk[];
    } {
        const issues: TPRisk[] = [];

        const masterFileRequired = totalValue > TP_THRESHOLDS.DOCUMENTATION_THRESHOLD;
        const localFileRequired = transactions.some(txn => txn.amount > TP_THRESHOLDS.DOCUMENTATION_THRESHOLD);

        // Check Master File
        if (masterFileRequired) {
            const undocumentedTxns = transactions.filter(txn => !txn.documentationExists);
            if (undocumentedTxns.length > 0) {
                issues.push({
                    type: 'missing_master_file',
                    severity: 'high',
                    message: `${undocumentedTxns.length} transactions lack Master File documentation`,
                    remediation: 'Prepare Master File per OECD BEPS Action 13',
                });
            }
        }

        // Check Local File for material transactions
        for (const txn of transactions) {
            if (txn.amount > TP_THRESHOLDS.DOCUMENTATION_THRESHOLD && !txn.documentationExists) {
                issues.push({
                    type: 'missing_local_file',
                    severity: 'high',
                    transactionId: txn.transactionId,
                    message: `Transaction ${txn.transactionId} (EUR ${txn.amount.toLocaleString()}) lacks Local File`,
                    remediation: 'Prepare transaction-specific Local File documentation',
                });
            }
        }

        // High-risk transaction warnings
        for (const txn of transactions) {
            if (txn.amount > TP_THRESHOLDS.HIGH_RISK_THRESHOLD) {
                issues.push({
                    type: 'high_value_transaction',
                    severity: 'medium',
                    transactionId: txn.transactionId,
                    message: `High-value transaction (EUR ${txn.amount.toLocaleString()}) requires robust documentation`,
                    remediation: 'Consider obtaining contemporaneous documentation and benchmarking study',
                });
            }
        }

        return {
            adequate: issues.filter(i => i.severity === 'high' || i.severity === 'critical').length === 0,
            masterFileRequired,
            localFileRequired,
            issues,
        };
    }

    // ========================================================================
    // RISK IDENTIFICATION
    // ========================================================================

    /**
     * Identify transfer pricing risks
     */
    private async identifyRisks(
        transactions: RelatedPartyTransaction[],
        companyDetails: CompanyProfile,
        armLengthAssessment: { compliant: boolean; transactionResults: Record<string, unknown> }
    ): Promise<TPRisk[]> {
        const risks: TPRisk[] = [];

        // Arm's length compliance risks
        if (!armLengthAssessment.compliant) {
            risks.push({
                type: 'arms_length_non_compliance',
                severity: 'critical',
                message: 'One or more transactions may not comply with arm\'s length principle',
                remediation: 'Conduct benchmarking study and adjust pricing if necessary',
            });
        }

        // Concentration risk
        const byCounterparty = new Map<string, number>();
        for (const txn of transactions) {
            const current = byCounterparty.get(txn.counterpartyName) || 0;
            byCounterparty.set(txn.counterpartyName, current + txn.amount);
        }

        const totalValue = transactions.reduce((sum, txn) => sum + txn.amount, 0);
        for (const [counterparty, value] of byCounterparty) {
            if (value / totalValue > 0.5) {
                risks.push({
                    type: 'concentration_risk',
                    severity: 'medium',
                    message: `${counterparty} represents ${((value / totalValue) * 100).toFixed(1)}% of related party transactions`,
                    remediation: 'Ensure robust documentation for dominant counterparty relationship',
                });
            }
        }

        // Intangibles risk
        const intangiblesTxns = transactions.filter(txn => txn.transactionType === 'intangibles');
        if (intangiblesTxns.length > 0) {
            risks.push({
                type: 'intangibles_risk',
                severity: 'high',
                message: `${intangiblesTxns.length} intangibles transaction(s) require enhanced scrutiny`,
                remediation: 'Apply DEMPE analysis (Development, Enhancement, Maintenance, Protection, Exploitation)',
            });
        }

        // Financing risk
        const financingTxns = transactions.filter(txn => txn.transactionType === 'financing');
        if (financingTxns.length > 0) {
            const financingValue = financingTxns.reduce((sum, txn) => sum + txn.amount, 0);
            risks.push({
                type: 'financing_risk',
                severity: 'medium',
                message: `EUR ${financingValue.toLocaleString()} in intercompany financing transactions`,
                remediation: 'Ensure interest rates are at arm\'s length, consider thin capitalization rules',
            });
        }

        return risks;
    }

    // ========================================================================
    // RECOMMENDATIONS
    // ========================================================================

    /**
     * Generate recommendations based on assessment
     */
    private generateRecommendations(
        transactions: RelatedPartyTransaction[],
        risks: TPRisk[],
        documentationCheck: { adequate: boolean; masterFileRequired: boolean; localFileRequired: boolean }
    ): string[] {
        const recommendations: string[] = [];

        // Documentation recommendations
        if (documentationCheck.masterFileRequired && !documentationCheck.adequate) {
            recommendations.push('Prepare comprehensive Master File covering group structure, business overview, intangibles, and financial activities');
        }

        if (documentationCheck.localFileRequired) {
            recommendations.push('Prepare Local Files for each material transaction with comparability analysis');
        }

        // Risk-based recommendations
        const criticalRisks = risks.filter(r => r.severity === 'critical');
        if (criticalRisks.length > 0) {
            recommendations.push('Address critical risks immediately - conduct benchmarking study');
        }

        // Method-specific recommendations
        const methodCounts = new Map<string, number>();
        for (const txn of transactions) {
            methodCounts.set(txn.pricingMethod, (methodCounts.get(txn.pricingMethod) || 0) + 1);
        }

        if (methodCounts.size === 1) {
            recommendations.push('Consider whether single pricing method is appropriate for all transaction types');
        }

        // Annual review recommendation
        recommendations.push('Conduct annual transfer pricing review to ensure ongoing compliance');

        // CFR advance pricing agreement
        const totalValue = transactions.reduce((sum, txn) => sum + txn.amount, 0);
        if (totalValue > TP_THRESHOLDS.HIGH_RISK_THRESHOLD) {
            recommendations.push('Consider applying for Advance Pricing Agreement (APA) with CFR for major transactions');
        }

        return recommendations;
    }

    // ========================================================================
    // DOCUMENTATION GENERATION
    // ========================================================================

    /**
     * Generate transfer pricing documentation
     */
    async generateDocumentation(
        transactions: RelatedPartyTransaction[],
        companyDetails: CompanyProfile,
        fiscalYear: number
    ): Promise<TPDocumentation> {
        const masterFile = await this.generateMasterFile(companyDetails, fiscalYear);
        const localFile = await this.generateLocalFile(transactions, companyDetails, fiscalYear);

        return {
            masterFile,
            localFile,
            generationDate: new Date().toISOString().slice(0, 10),
            fiscalYear,
        };
    }

    /**
     * Generate Master File outline
     */
    private async generateMasterFile(
        companyDetails: CompanyProfile,
        fiscalYear: number
    ): Promise<TPMasterFile> {
        // Structure per OECD BEPS Action 13
        return {
            organizationalStructure: {
                groupName: companyDetails.name,
                structure: companyDetails.groupStructure || 'To be completed',
                ownership: 'To be completed with ownership chart',
                geographicPresence: 'To be completed with list of jurisdictions',
            },
            businessDescription: {
                principalActivities: companyDetails.industry || 'To be described',
                valueDrivers: 'To be identified',
                supplyChain: 'To be mapped',
                significantServiceArrangements: 'To be documented',
                functionalAnalysis: companyDetails.functions || 'To be completed',
            },
            intangibles: {
                strategy: 'To be described',
                list: 'To be compiled',
                owners: 'To be identified',
                developmentActivities: 'To be documented',
                transferAgreements: 'To be listed',
            },
            intercompanyFinancialActivities: {
                fundingSources: 'To be identified',
                centralFinancing: 'To be described',
                transferPricingPolicies: 'To be documented',
            },
            financialAndTaxPositions: {
                consolidatedStatements: `Fiscal Year ${fiscalYear}`,
                apaList: 'To be listed',
                taxRulings: 'To be listed',
            },
        };
    }

    /**
     * Generate Local File outline
     */
    private async generateLocalFile(
        transactions: RelatedPartyTransaction[],
        companyDetails: CompanyProfile,
        fiscalYear: number
    ): Promise<TPLocalFile> {
        const transactionSummary = transactions.map(txn => ({
            id: txn.transactionId,
            type: txn.transactionType,
            counterparty: txn.counterpartyName,
            jurisdiction: txn.counterpartyJurisdiction,
            amount: txn.amount,
            method: txn.pricingMethod,
            methodDescription: OECD_METHODS[txn.pricingMethod as keyof typeof OECD_METHODS],
        }));

        return {
            localEntityDescription: {
                legalName: companyDetails.name,
                registrationNumber: companyDetails.registrationNumber || 'To be added',
                businessDescription: companyDetails.industry || 'To be described',
                functionsPerformed: companyDetails.functions || 'To be detailed',
                assetsUsed: companyDetails.keyAssets || 'To be listed',
                risksAssumed: companyDetails.risksAssumed || 'To be analyzed',
            },
            controlledTransactions: {
                fiscalYear,
                transactions: transactionSummary,
                aggregateValue: transactions.reduce((sum, txn) => sum + txn.amount, 0),
            },
            financialInformation: {
                period: fiscalYear,
                dataSource: 'Audited financial statements',
                segmentation: 'By transaction type',
            },
            comparabilityAnalysis: {
                methodology: 'To be completed with comparables search',
                comparablesSelection: 'To be documented',
                economicAnalysis: 'To be performed',
                armLengthRange: 'To be determined',
            },
        };
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Get OECD method description
     */
    getMethodDescription(method: keyof typeof OECD_METHODS): string {
        return OECD_METHODS[method];
    }

    /**
     * Get documentation thresholds
     */
    getThresholds(): typeof TP_THRESHOLDS {
        return TP_THRESHOLDS;
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a Malta Transfer Pricing Agent instance
 */
export function createTransferPricingAgent(config?: TransferPricingAgentConfig): MaltaTransferPricingAgent {
    return new MaltaTransferPricingAgent(config);
}

/**
 * Lazy singleton instance
 */
let _maltaTransferPricingAgent: MaltaTransferPricingAgent | null = null;

export const maltaTransferPricingAgent = {
    get instance(): MaltaTransferPricingAgent {
        if (!_maltaTransferPricingAgent) {
            _maltaTransferPricingAgent = new MaltaTransferPricingAgent();
        }
        return _maltaTransferPricingAgent;
    }
};
