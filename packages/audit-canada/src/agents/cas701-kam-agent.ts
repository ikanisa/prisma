/**
 * CAS 701 KAM Agent
 * 
 * Automated Key Audit Matters (KAM) generation for TSX/TSXV listed entities
 * per CAS 701 "Communicating Key Audit Matters in the Independent Auditor's Report".
 * 
 * KAM Criteria (CAS 701.09):
 * - Areas of higher assessed risk of material misstatement (or significant risks)
 * - Significant auditor judgments relating to areas of significant management judgment
 * - Effect of significant events or transactions
 * 
 * @package @prisma/audit-canada
 */

import type {
    KeyAuditMatter,
    RiskAssessment,
    SignificantRisk,
    AuditEngagement,
    AuditContext,
    AuditAgentResponse,
    AuditAgentType,
    AuditOpinion,
} from '../types/index.js';

// ============================================================================
// COMMON CANADIAN KAMS (CPAB ANALYSIS)
// ============================================================================

const COMMON_CANADIAN_KAMS = {
    revenue_recognition: {
        title: 'Revenue Recognition',
        description: 'Revenue recognition requires significant management judgment in areas such as variable consideration, multiple performance obligations, and percentage of completion.',
        auditResponseTemplate: 'Our audit procedures related to revenue recognition included, among others:\n- Testing the design and operating effectiveness of internal controls over revenue recognition;\n- Evaluating management\'s significant judgments regarding [SPECIFIC_AREA];\n- Selecting a sample of revenue transactions and verifying supporting documentation;\n- Analyzing revenue trends and correlations using data analytics.',
    },
    goodwill_impairment: {
        title: 'Impairment of Goodwill and Intangible Assets',
        description: 'The assessment of the recoverable amount of goodwill and intangible assets involves significant management judgment regarding future cash flows, discount rates, and growth rates.',
        auditResponseTemplate: 'Our audit procedures included, among others:\n- Involving our internal valuation specialists to assist in evaluating the discount rates and methodologies used;\n- Testing the mathematical accuracy of the impairment models;\n- Assessing the reasonableness of management\'s key assumptions, including future cash flow projections and growth rates, by comparing them to historical results and external market data.',
    },
    oil_gas_reserves: {
        title: 'Estimation of Oil and Gas Reserves',
        description: 'The estimation of oil and gas reserves involves complex judgments and assumptions by management\'s internal and external reservoir engineers, which significantly impact depletion expense and impairment assessments.',
        auditResponseTemplate: 'Our audit procedures included, among others:\n- assessing the competence, capabilities, and objectivity of management\'s internal and external experts;\n- comparing the reserve report data to the company\'s underlying records;\n- evaluating the significant assumptions used in the reserve estimation, such as commodity prices and future development costs.',
    },
    mining_assets: {
        title: 'Carrying Value of Mining Assets',
        description: 'The assessment of indicators of impairment and the determination of the recoverable amount of mining assets requires significant judgment regarding commodity prices, exchange rates, and life-of-mine plans.',
        auditResponseTemplate: 'Our audit procedures included, among others:\n- evaluating management\'s assessment of impairment indicators;\n- involing valuation specialists to assess key assumptions such as discount rates;\n- verification of mineral resource and reserve estimates by assessing the work of the qualified persons.',
    },
    ecl_provisions: {
        title: 'Expected Credit Loss (ECL) Allowance',
        description: 'The calculation of ECL allowance under IFRS 9 involves complex models and significant judgment regarding probability of default, loss given default, and forward-looking economic information.',
        auditResponseTemplate: 'Our audit procedures included, among others:\n- testing the design and operating effectiveness of controls over the ECL model and data;\n- involving our credit risk specialists to evaluate the methodology and assumptions;\n- testing the completeness and accuracy of data used in the models.',
    },
    business_combinations: {
        title: 'Business Combinations - Purchase Price Allocation',
        description: 'The accounting for business combinations requires significant judgment in identifying and valuing intangible assets and determining the fair value of consideration.',
        auditResponseTemplate: 'Our audit procedures included, among others:\n- reviewing the purchase agreement to understand the transaction terms;\n- involving valuation specialists to evaluate the valuation methodologies and key assumptions for acquired intangible assets;\n- assessing the identification of all assets acquired and liabilities assumed.',
    },
};

// ============================================================================
// CAS 701 KAM AGENT
// ============================================================================

export interface CAS701KAMAgentConfig {
    includeIndustrySpecific: boolean;
    tailoringLevel: 'standard' | 'high';
    organizationId?: string;
    userId?: string;
}

const DEFAULT_CONFIG: CAS701KAMAgentConfig = {
    includeIndustrySpecific: true,
    tailoringLevel: 'standard', // 'high' would use more AI generation
};

export class CAS701KAMAgent {
    public readonly slug = 'canada-cas701-kam';
    public readonly name = 'CAS 701 KAM Agent';
    public readonly version = '1.0.0';
    public readonly agentType: AuditAgentType = 'kam_generation';

    private config: CAS701KAMAgentConfig;

    constructor(config: Partial<CAS701KAMAgentConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // =========================================================================
    // MAIN GENERATION
    // =========================================================================

    /**
     * Identify and generate Key Audit Matters per CAS 701
     */
    generateKAMs(
        engagement: AuditEngagement,
        riskAssessment: RiskAssessment,
        findings: any[], // AuditFindings
        context: AuditContext
    ): AuditAgentResponse<KeyAuditMatter[]> {
        const startTime = Date.now();
        const kams: KeyAuditMatter[] = [];

        try {
            // CAS 701 only applies to listed entities (or voluntary adoption)
            if (!this.isKAMRequired(engagement)) {
                return {
                    success: true,
                    data: [], // No KAMs required
                    casReferences: ['CAS_701'],
                    processingTimeMs: Date.now() - startTime,
                    warnings: ['KAMs not required for this entity type (CAS 701.05)'],
                };
            }

            // Step 1: Identify "Matters Communicated with Those Charged with Governance" (CAS 701.09)
            // (Simulated - in practice would come from CAS 260 communication log)

            // Step 2: Determine "Matters that Required Significant Auditor Attention" (CAS 701.09)
            // - Areas of higher assessed risk / significant risks
            // - Significant auditor judgment
            // - Significant events/transactions

            const candidates = this.identifyKAMCandidates(riskAssessment, engagement);

            // Step 3: Determine "Most Significant Matters" (KAMs) (CAS 701.10)
            const selectedMatters = this.selectMostSignificantMatters(candidates);

            // Step 4: Draft KAM descriptions (CAS 701.11-16)
            for (const matter of selectedMatters) {
                kams.push(this.draftKAMContent(matter, engagement));
            }

            return {
                success: true,
                data: kams,
                workpaperRef: `WP-KAM-${engagement.engagementId}`,
                casReferences: ['CAS_701'],
                processingTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                errors: [`KAM generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                casReferences: ['CAS_701'],
                processingTimeMs: Date.now() - startTime,
            };
        }
    }

    // =========================================================================
    // KAM REQUIREMENT CHECK
    // =========================================================================

    private isKAMRequired(engagement: AuditEngagement): boolean {
        // Mandatory for TSX/TSXV listed entities
        if (engagement.entityType === 'public_company') return true;

        // Optional for others
        return false;
    }

    // =========================================================================
    // CANDIDATE IDENTIFICATION (CAS 701.09)
    // =========================================================================

    private identifyKAMCandidates(
        riskAssessment: RiskAssessment,
        engagement: AuditEngagement
    ): KAMCandidate[] {
        const candidates: KAMCandidate[] = [];

        // 1. Significant Risks (CAS 701.09(a))
        for (const risk of riskAssessment.significantRisks) {
            candidates.push({
                source: 'significant_risk',
                riskId: risk.riskId,
                area: risk.description,
                justification: 'Identified as Significant Risk per CAS 315',
                relatedAccounts: risk.accountsAffected,
            });
        }

        // 2. High Judgment Areas (CAS 701.09(b))
        // Typically estimates with high estimation uncertainty
        const highJudgmentRisks = riskAssessment.assertionRisks.filter(r =>
            r.riskLevel === 'significant' || r.riskLevel === 'high'
        );

        for (const risk of highJudgmentRisks) {
            // Avoid duplicates with significant risks
            if (!candidates.some(c => c.area.includes(risk.accountOrClass))) {
                candidates.push({
                    source: 'significant_judgment',
                    riskId: risk.riskId,
                    area: risk.accountOrClass,
                    justification: `High risk assessment in ${risk.assertion} assertion`,
                    relatedAccounts: [risk.accountOrClass],
                });
            }
        }

        // 3. Significant Events (CAS 701.09(c))
        // (Simulated based on engagement data)
        if (engagement.isFirstYearAudit) {
            // Usually not a KAM unless issues, but significant attention
        }

        // Industry-specific common KAMs
        this.addIndustrySpecificCandidates(engagement.industry, candidates);

        return candidates;
    }

    private addIndustrySpecificCandidates(industry: string, candidates: KAMCandidate[]): void {
        // If not already covered by risk assessment, ensure common industry risks are considered
        if (industry === 'MINING' && !candidates.some(c => c.area.includes('Impairment'))) {
            candidates.push({
                source: 'industry_norm',
                riskId: 'IND-MIN-1',
                area: 'Carrying Value of Mining Assets',
                justification: 'Industry norm KAM for mining entities',
                relatedAccounts: ['Mining Assets', 'Impairment Expense'],
            });
        }

        if (industry === 'FINANCIAL_SERVICES' && !candidates.some(c => c.area.includes('ECL'))) {
            candidates.push({
                source: 'industry_norm',
                riskId: 'IND-FS-1',
                area: 'Expected Credit Loss',
                justification: 'Industry norm KAM for financial institutions',
                relatedAccounts: ['Loans Receivable', 'Provision for Credit Losses'],
            });
        }
    }

    // =========================================================================
    // SIGNIFICANCE SELECTION (CAS 701.10)
    // =========================================================================

    private selectMostSignificantMatters(candidates: KAMCandidate[]): KAMCandidate[] {
        // CAS 701 requires selecting the "most" significant matters
        // Typically 2-4 matters for a standard public company

        // Prioritization logic:
        // 1. Matters involving highest estimation uncertainty
        // 2. Matters with most complex auditor judgment
        // 3. Matters with largest financial statement impact

        // Return top 3 for now
        return candidates.slice(0, 3);
    }

    // =========================================================================
    // CONTENT DRAFTING (CAS 701.11-16)
    // =========================================================================

    private draftKAMContent(candidate: KAMCandidate, engagement: AuditEngagement): KeyAuditMatter {
        let title = candidate.area;
        let description = '';
        let auditResponse = '';
        const lowerArea = candidate.area.toLowerCase();

        // Match with template library
        if (lowerArea.includes('revenue')) {
            const template = COMMON_CANADIAN_KAMS.revenue_recognition;
            title = template.title;
            description = template.description;
            auditResponse = template.auditResponseTemplate.replace('[SPECIFIC_AREA]', 'variable consideration relative to [PRODUCT/SERVICE]');
        } else if (lowerArea.includes('goodwill') || lowerArea.includes('intangible')) {
            const template = COMMON_CANADIAN_KAMS.goodwill_impairment;
            title = template.title;
            description = template.description;
            auditResponse = template.auditResponseTemplate;
        } else if ((lowerArea.includes('mining') || lowerArea.includes('mineral')) && engagement.industry === 'MINING') {
            const template = COMMON_CANADIAN_KAMS.mining_assets;
            title = template.title;
            description = template.description;
            auditResponse = template.auditResponseTemplate;
        } else if (lowerArea.includes('oil') || lowerArea.includes('gas') || lowerArea.includes('reserve')) {
            const template = COMMON_CANADIAN_KAMS.oil_gas_reserves;
            title = template.title;
            description = template.description;
            auditResponse = template.auditResponseTemplate;
        } else if (lowerArea.includes('credit') || lowerArea.includes('ecl') || lowerArea.includes('loan')) {
            const template = COMMON_CANADIAN_KAMS.ecl_provisions;
            title = template.title;
            description = template.description;
            auditResponse = template.auditResponseTemplate;
        } else if (lowerArea.includes('acquisition') || lowerArea.includes('business combination')) {
            const template = COMMON_CANADIAN_KAMS.business_combinations;
            title = template.title;
            description = template.description;
            auditResponse = template.auditResponseTemplate;
        } else {
            // Generic fallback
            description = `The ${candidate.area} was determined to be a key audit matter due to the significance of the balance and the judgment required by management.`;
            auditResponse = 'Our audit procedures included evaluating the design and implementation of key controls and performing substantive testing over the account balance.';
        }

        return {
            kamId: `KAM-${engagement.engagementId}-${candidate.riskId}`,
            title,
            description,
            auditResponse,
            noteReference: 'Refer to Note X to the financial statements.', // Validation would constrain this
            casReference: 'CAS_701',
        };
    }

    // =========================================================================
    // CAPABILITIES
    // =========================================================================

    getCapabilities(): string[] {
        return [
            'Automated KAM identification based on risk assessment',
            'Industry-specific KAM templates (Mining, O&G, Banking, Tech)',
            'CAS 701 compliance for listed entities',
            'Drafting of "Why the matter was considered most significant"',
            'Drafting of "How the matter was addressed in the audit"',
        ];
    }
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface KAMCandidate {
    source: 'significant_risk' | 'significant_judgment' | 'significant_event' | 'industry_norm';
    riskId: string;
    area: string;
    justification: string;
    relatedAccounts: string[];
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

export const cas701KAMAgentFactory = {
    create: (config?: Partial<CAS701KAMAgentConfig>) =>
        new CAS701KAMAgent(config),
    instance: () => new CAS701KAMAgent(),
};

export const createCAS701KAMAgent = cas701KAMAgentFactory.create;
export const cas701KAMAgent = cas701KAMAgentFactory;
