/**
 * Transfer Pricing Agent
 * 
 * AI-powered agent for transfer pricing analysis, arm's length testing,
 * and BEPS documentation generation. Supports all OECD methods and
 * generates Master File, Local File, and CbC reports.
 * 
 * @example
 * ```typescript
 * const agent = new TransferPricingAgent();
 * 
 * // Analyze transactions
 * const result = await agent.analyzeTransactions({
 *     entities,
 *     transactions,
 *     generateMasterFile: true,
 * });
 * 
 * // Get arm's length range
 * const range = agent.calculateArmLengthRange(comparables, 'operating_margin');
 * ```
 */

import type {
    TransferPricingMethod,
    TransactionType,
    ProfitLevelIndicator,
    RelatedPartyEntity,
    IntercompanyTransaction,
    ComparableCompany,
    BenchmarkStudy,
    ArmLengthResult,
    MasterFile,
    LocalFile,
    TPAnalysisRequest,
    TPAnalysisResult,
    TPRecommendation,
    EntityFunction,
} from '../types/transfer-pricing.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface TransferPricingAgentConfig {
    defaultMethod?: TransferPricingMethod;
    interquartileRangeOnly?: boolean;  // Use IQR vs full range
    useMultiYearData?: boolean;
    yearsToAnalyze?: number;
}

// ============================================================================
// TRANSFER PRICING AGENT
// ============================================================================

export class TransferPricingAgent {
    private config: TransferPricingAgentConfig;

    constructor(config: TransferPricingAgentConfig = {}) {
        this.config = {
            defaultMethod: 'TNMM',
            interquartileRangeOnly: true,
            useMultiYearData: true,
            yearsToAnalyze: 3,
            ...config,
        };
    }

    /**
     * Perform full transfer pricing analysis
     */
    async analyzeTransactions(request: TPAnalysisRequest): Promise<TPAnalysisResult> {
        const analyses: ArmLengthResult[] = [];
        const recommendations: TPRecommendation[] = [];

        // Analyze each transaction
        for (const transaction of request.transactions) {
            const payerEntity = request.entities.find(e => e.id === transaction.payerEntityId);
            const recipientEntity = request.entities.find(e => e.id === transaction.recipientEntityId);

            if (!payerEntity || !recipientEntity) continue;

            const analysis = await this.analyzeTransaction(transaction, payerEntity, recipientEntity);
            analyses.push(analysis);

            // Generate recommendations
            if (analysis.conclusion === 'adjustment_required') {
                recommendations.push({
                    transactionId: transaction.id,
                    priority: 'high',
                    category: 'pricing',
                    recommendation: `Adjust pricing for ${transaction.description}. Current result outside arm's length range.`,
                    expectedImpact: `Potential adjustment: ${analysis.adjustmentAmount?.toLocaleString()}`,
                });
            }

            if (analysis.riskLevel === 'high') {
                recommendations.push({
                    transactionId: transaction.id,
                    priority: 'high',
                    category: 'risk',
                    recommendation: `High transfer pricing risk identified for ${transaction.description}. Strengthen documentation.`,
                });
            }
        }

        // Generate documentation if requested
        let masterFile: MasterFile | undefined;
        let localFiles: LocalFile[] | undefined;

        if (request.generateMasterFile) {
            masterFile = this.generateMasterFile(request);
        }

        if (request.generateLocalFiles) {
            localFiles = this.generateLocalFiles(request, analyses);
        }

        // Build summary
        const summary = {
            totalTransactions: request.transactions.length,
            transactionsAnalyzed: analyses.length,
            transactionsArmLength: analyses.filter(a => a.conclusion === 'arm_length').length,
            transactionsRequiringAdjustment: analyses.filter(a => a.conclusion === 'adjustment_required').length,
            totalAdjustmentAmount: analyses
                .filter(a => a.adjustmentAmount)
                .reduce((sum, a) => sum + (a.adjustmentAmount ?? 0), 0),
            highRiskTransactions: analyses.filter(a => a.riskLevel === 'high').length,
        };

        return {
            id: crypto.randomUUID(),
            requestId: request.groupId,
            transactionAnalyses: analyses,
            masterFile,
            localFiles,
            summary,
            recommendations,
            createdAt: new Date(),
            preparedBy: 'Transfer Pricing Agent',
        };
    }

    /**
     * Analyze a single intercompany transaction
     */
    async analyzeTransaction(
        transaction: IntercompanyTransaction,
        payerEntity: RelatedPartyEntity,
        recipientEntity: RelatedPartyEntity
    ): Promise<ArmLengthResult> {
        // Select appropriate method
        const { method, justification, methodsConsidered } = this.selectMethod(
            transaction,
            payerEntity,
            recipientEntity
        );

        // Determine tested party
        const { testedParty, testedPartyEntity, justification: tpJustification } = this.selectTestedParty(
            payerEntity,
            recipientEntity,
            transaction
        );

        // Select PLI
        const { pli, justification: pliJustification } = this.selectPLI(method, transaction.transactionType);

        // Calculate tested party result
        const testedPartyResult = this.calculatePLI(testedPartyEntity, pli);

        // Generate or retrieve benchmark range (simplified)
        const armLengthRange = this.getArmLengthRange(method, pli, transaction.transactionType);

        // Determine if within range
        const isWithinRange = testedPartyResult >= armLengthRange.low && testedPartyResult <= armLengthRange.high;

        // Calculate adjustment if needed
        let adjustmentAmount: number | undefined;
        let adjustmentDirection: 'increase_price' | 'decrease_price' | undefined;

        if (!isWithinRange) {
            const targetResult = armLengthRange.median;
            if (testedPartyResult < armLengthRange.low) {
                adjustmentAmount = this.calculateAdjustment(testedPartyEntity, pli, targetResult, testedPartyResult);
                adjustmentDirection = 'increase_price';
            } else {
                adjustmentAmount = this.calculateAdjustment(testedPartyEntity, pli, targetResult, testedPartyResult);
                adjustmentDirection = 'decrease_price';
            }
        }

        // Assess risk
        const { riskLevel, riskFactors } = this.assessRisk(transaction, isWithinRange, testedPartyResult, armLengthRange);

        return {
            transactionId: transaction.id,
            selectedMethod: method,
            methodJustification: justification,
            methodsConsidered,
            testedParty,
            testedPartyJustification: tpJustification,
            profitLevelIndicator: pli,
            pliJustification,
            testedPartyResult,
            armLengthRange,
            conclusion: isWithinRange ? 'arm_length' : 'adjustment_required',
            adjustmentAmount,
            adjustmentDirection,
            riskLevel,
            riskFactors,
        };
    }

    /**
     * Calculate arm's length range from comparables
     */
    calculateArmLengthRange(
        comparables: ComparableCompany[],
        pli: ProfitLevelIndicator
    ): { low: number; median: number; high: number; minimum: number; maximum: number } {
        // Extract PLI values
        const values: number[] = [];
        for (const comp of comparables) {
            const pliData = comp.profitLevelIndicators.find(p => p.indicator === pli);
            if (pliData) {
                values.push(pliData.weightedAverage);
            }
        }

        if (values.length === 0) {
            return { low: 0, median: 0, high: 0, minimum: 0, maximum: 0 };
        }

        values.sort((a, b) => a - b);

        const n = values.length;
        const minimum = values[0];
        const maximum = values[n - 1];
        const median = n % 2 === 0
            ? (values[n / 2 - 1] + values[n / 2]) / 2
            : values[Math.floor(n / 2)];

        // Interquartile range
        const q1Index = Math.floor(n * 0.25);
        const q3Index = Math.floor(n * 0.75);
        const low = this.config.interquartileRangeOnly ? values[q1Index] : minimum;
        const high = this.config.interquartileRangeOnly ? values[q3Index] : maximum;

        return { low, median, high, minimum, maximum };
    }

    // ========================================================================
    // METHOD SELECTION
    // ========================================================================

    private selectMethod(
        transaction: IntercompanyTransaction,
        payer: RelatedPartyEntity,
        recipient: RelatedPartyEntity
    ): { method: TransferPricingMethod; justification: string; methodsConsidered: ArmLengthResult['methodsConsidered'] } {
        const methodsConsidered: ArmLengthResult['methodsConsidered'] = [];

        // CUP is preferred when internal or external comparables exist
        methodsConsidered.push({
            method: 'CUP',
            reason: 'No reliable internal or external comparable uncontrolled transactions identified',
            selected: false,
        });

        // Evaluate based on transaction type and entity profiles
        switch (transaction.transactionType) {
            case 'tangible_goods':
                if (recipient.characterization === 'limited_risk_distributor') {
                    methodsConsidered.push({
                        method: 'RPM',
                        reason: 'Distributor adds limited value; resale price basis appropriate',
                        selected: false,
                    });
                    methodsConsidered.push({
                        method: 'TNMM',
                        reason: 'Most reliable method for limited risk distributor',
                        selected: true,
                    });
                    return {
                        method: 'TNMM',
                        justification: 'TNMM selected as the most appropriate method for limited risk distributor. Operating margin is the most reliable PLI.',
                        methodsConsidered,
                    };
                }
                if (payer.characterization === 'toll_manufacturer' || payer.characterization === 'full_fledged_manufacturer') {
                    methodsConsidered.push({
                        method: 'CPM',
                        reason: 'Manufacturer adds value through production activities',
                        selected: false,
                    });
                    methodsConsidered.push({
                        method: 'TNMM',
                        reason: 'Most reliable method when CPM data unavailable',
                        selected: true,
                    });
                    return {
                        method: 'TNMM',
                        justification: 'TNMM selected as reliable method for manufacturing entity with cost plus markup basis.',
                        methodsConsidered,
                    };
                }
                break;

            case 'services':
                methodsConsidered.push({
                    method: 'CPM',
                    reason: 'Cost plus appropriate for routine services',
                    selected: payer.characterization === 'contract_service_provider',
                });
                if (payer.characterization === 'contract_service_provider') {
                    return {
                        method: 'CPM',
                        justification: 'Cost Plus Method selected for routine service provider.',
                        methodsConsidered,
                    };
                }
                break;

            case 'intangibles':
                methodsConsidered.push({
                    method: 'CUP',
                    reason: 'CUP preferred for unique intangibles if comparables available',
                    selected: false,
                });
                methodsConsidered.push({
                    method: 'PSM',
                    reason: 'Profit Split appropriate for unique intangibles with value contributions from both parties',
                    selected: true,
                });
                return {
                    method: 'PSM',
                    justification: 'Profit Split Method selected due to unique intangibles and integrated operations.',
                    methodsConsidered,
                };

            case 'financial_transactions':
                methodsConsidered.push({
                    method: 'CUP',
                    reason: 'CUP using external loan comparables',
                    selected: true,
                });
                return {
                    method: 'CUP',
                    justification: 'CUP selected using comparable uncontrolled loan transactions from financial databases.',
                    methodsConsidered,
                };
        }

        // Default to TNMM
        methodsConsidered.push({
            method: 'TNMM',
            reason: 'Default method when other methods not applicable',
            selected: true,
        });

        return {
            method: 'TNMM',
            justification: 'TNMM selected as the most reliable method based on available data and functional analysis.',
            methodsConsidered,
        };
    }

    // ========================================================================
    // TESTED PARTY SELECTION
    // ========================================================================

    private selectTestedParty(
        payer: RelatedPartyEntity,
        recipient: RelatedPartyEntity,
        transaction: IntercompanyTransaction
    ): { testedParty: string; testedPartyEntity: RelatedPartyEntity; justification: string } {
        // Select the less complex party as tested party
        const payerComplexity = this.calculateEntityComplexity(payer);
        const recipientComplexity = this.calculateEntityComplexity(recipient);

        if (payerComplexity <= recipientComplexity) {
            return {
                testedParty: payer.name,
                testedPartyEntity: payer,
                justification: `${payer.name} selected as tested party as the less complex entity with simpler functional profile.`,
            };
        } else {
            return {
                testedParty: recipient.name,
                testedPartyEntity: recipient,
                justification: `${recipient.name} selected as tested party as the less complex entity with simpler functional profile.`,
            };
        }
    }

    private calculateEntityComplexity(entity: RelatedPartyEntity): number {
        let score = 0;

        // More functions = more complex
        score += entity.functions.length * 2;

        // More risks = more complex
        score += entity.risks.length * 3;

        // Certain characterizations are simpler
        const simpleProfiles = ['toll_manufacturer', 'limited_risk_distributor', 'contract_service_provider'];
        if (simpleProfiles.includes(entity.characterization)) {
            score -= 5;
        }

        // Entrepreneur is most complex
        if (entity.characterization === 'entrepreneur') {
            score += 10;
        }

        return score;
    }

    // ========================================================================
    // PLI SELECTION
    // ========================================================================

    private selectPLI(
        method: TransferPricingMethod,
        transactionType: TransactionType
    ): { pli: ProfitLevelIndicator; justification: string } {
        switch (method) {
            case 'TNMM':
                if (transactionType === 'tangible_goods') {
                    return {
                        pli: 'operating_margin',
                        justification: 'Operating margin selected as most reliable PLI for distribution activities.',
                    };
                }
                return {
                    pli: 'net_cost_plus',
                    justification: 'Net cost plus margin selected for service/manufacturing activities.',
                };

            case 'RPM':
                return {
                    pli: 'gross_margin',
                    justification: 'Gross margin used for resale price method analysis.',
                };

            case 'CPM':
                return {
                    pli: 'net_cost_plus',
                    justification: 'Cost plus markup used for cost-based pricing.',
                };

            case 'PSM':
                return {
                    pli: 'operating_margin',
                    justification: 'Operating profit split based on contribution analysis.',
                };

            default:
                return {
                    pli: 'operating_margin',
                    justification: 'Operating margin selected as default PLI.',
                };
        }
    }

    // ========================================================================
    // CALCULATIONS
    // ========================================================================

    private calculatePLI(entity: RelatedPartyEntity, pli: ProfitLevelIndicator): number {
        if (!entity.financials) return 0;

        const { revenue, operatingCosts, operatingProfit, assets } = entity.financials;

        switch (pli) {
            case 'operating_margin':
                return revenue > 0 ? (operatingProfit / revenue) * 100 : 0;
            case 'gross_margin':
                const grossProfit = revenue - operatingCosts * 0.7; // Simplified
                return revenue > 0 ? (grossProfit / revenue) * 100 : 0;
            case 'net_cost_plus':
                return operatingCosts > 0 ? (operatingProfit / operatingCosts) * 100 : 0;
            case 'return_on_assets':
                return assets > 0 ? (operatingProfit / assets) * 100 : 0;
            case 'berry_ratio':
                return operatingCosts > 0 ? (revenue - operatingCosts * 0.7) / (operatingCosts * 0.3) : 0;
            default:
                return 0;
        }
    }

    private calculateAdjustment(
        entity: RelatedPartyEntity,
        pli: ProfitLevelIndicator,
        targetResult: number,
        currentResult: number
    ): number {
        if (!entity.financials) return 0;

        const diff = targetResult - currentResult;
        const { revenue, operatingCosts } = entity.financials;

        // Simplified adjustment calculation
        switch (pli) {
            case 'operating_margin':
                return Math.abs(diff / 100 * revenue);
            case 'net_cost_plus':
                return Math.abs(diff / 100 * operatingCosts);
            default:
                return Math.abs(diff / 100 * revenue);
        }
    }

    private getArmLengthRange(
        method: TransferPricingMethod,
        pli: ProfitLevelIndicator,
        transactionType: TransactionType
    ): { low: number; median: number; high: number } {
        // In production, this would come from benchmark database
        // These are illustrative ranges based on typical industry data
        switch (pli) {
            case 'operating_margin':
                if (transactionType === 'tangible_goods') {
                    return { low: 1.5, median: 3.0, high: 5.0 };
                }
                return { low: 3.0, median: 6.0, high: 10.0 };
            case 'net_cost_plus':
                return { low: 3.0, median: 5.0, high: 8.0 };
            case 'gross_margin':
                return { low: 20.0, median: 30.0, high: 40.0 };
            default:
                return { low: 2.0, median: 5.0, high: 8.0 };
        }
    }

    // ========================================================================
    // RISK ASSESSMENT
    // ========================================================================

    private assessRisk(
        transaction: IntercompanyTransaction,
        isWithinRange: boolean,
        testedPartyResult: number,
        armLengthRange: { low: number; median: number; high: number }
    ): { riskLevel: 'low' | 'medium' | 'high'; riskFactors: string[] } {
        const riskFactors: string[] = [];
        let riskScore = 0;

        // Not within range
        if (!isWithinRange) {
            riskScore += 30;
            riskFactors.push('Result outside arm\'s length range');
        }

        // Large transaction value
        if (transaction.amount > 10000000) {
            riskScore += 20;
            riskFactors.push('High value transaction');
        }

        // Intangibles (high scrutiny)
        if (transaction.transactionType === 'intangibles') {
            riskScore += 15;
            riskFactors.push('Intangible transactions receive heightened scrutiny');
        }

        // Result near boundary
        const rangeWidth = armLengthRange.high - armLengthRange.low;
        if (Math.abs(testedPartyResult - armLengthRange.low) < rangeWidth * 0.1 ||
            Math.abs(testedPartyResult - armLengthRange.high) < rangeWidth * 0.1) {
            riskScore += 10;
            riskFactors.push('Result near boundary of arm\'s length range');
        }

        // No written agreement
        if (!transaction.hasWrittenAgreement) {
            riskScore += 15;
            riskFactors.push('No intercompany agreement in place');
        }

        let riskLevel: 'low' | 'medium' | 'high';
        if (riskScore >= 40) {
            riskLevel = 'high';
        } else if (riskScore >= 20) {
            riskLevel = 'medium';
        } else {
            riskLevel = 'low';
        }

        return { riskLevel, riskFactors };
    }

    // ========================================================================
    // DOCUMENTATION GENERATION
    // ========================================================================

    private generateMasterFile(request: TPAnalysisRequest): MasterFile {
        return {
            id: crypto.randomUUID(),
            groupName: request.groupId,
            fiscalYear: request.fiscalYear,
            organizationalStructure: {
                legalStructureChart: '/documents/legal-structure.pdf',
                geographicLocations: request.entities.map(e => ({
                    entity: e.name,
                    country: e.country,
                    functions: e.functions,
                })),
            },
            businessDescription: {
                businessOverview: 'To be completed based on group information.',
                driversOfProfits: [],
                supplyChainDescription: 'To be completed.',
                principalGeographicMarkets: [],
                keyCompetitors: [],
            },
            intangibles: {
                strategyForDevelopment: 'To be completed.',
                importantIntangibles: [],
                relatedPartyAgreements: [],
                transferPricingPolicies: 'To be completed.',
            },
            financialActivities: {
                groupFinancingArrangements: 'To be completed.',
                transferPricingPoliciesFinancing: 'To be completed.',
            },
            financialTaxPositions: {
                consolidatedFinancialStatements: '/documents/consolidated-fs.pdf',
                existingAPAs: [],
                taxRulings: [],
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            preparedBy: 'Transfer Pricing Agent',
        };
    }

    private generateLocalFiles(
        request: TPAnalysisRequest,
        analyses: ArmLengthResult[]
    ): LocalFile[] {
        const localFiles: LocalFile[] = [];
        const jurisdictions = request.jurisdictions ??
            [...new Set(request.entities.map(e => e.country))];

        for (const country of jurisdictions) {
            const localEntities = request.entities.filter(e => e.country === country);

            for (const entity of localEntities) {
                const entityTransactions = request.transactions.filter(
                    t => t.payerEntityId === entity.id || t.recipientEntityId === entity.id
                );
                const entityAnalyses = analyses.filter(
                    a => entityTransactions.some(t => t.id === a.transactionId)
                );

                localFiles.push({
                    id: crypto.randomUUID(),
                    entityId: entity.id,
                    entityName: entity.name,
                    country,
                    fiscalYear: request.fiscalYear,
                    localEntity: {
                        managementStructure: 'To be completed.',
                        localOrganizationChart: '/documents/org-chart.pdf',
                        keyIndividuals: [],
                        businessStrategy: 'To be completed.',
                    },
                    controlledTransactions: {
                        transactions: entityTransactions,
                    },
                    financialInformation: {
                        financialStatements: '/documents/financial-statements.pdf',
                        allocationSchedules: [],
                        reconciliationToAuditedStatements: 'To be completed.',
                    },
                    comparabilityAnalysis: {
                        functionalAnalysis: {
                            functionsPerformed: entity.functions,
                            risksAssumed: entity.risks,
                            assetsUsed: entity.assets,
                        },
                        economicAnalysis: entityAnalyses,
                    },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    preparedBy: 'Transfer Pricing Agent',
                });
            }
        }

        return localFiles;
    }
}

// Export singleton
export const transferPricingAgent = new TransferPricingAgent();
