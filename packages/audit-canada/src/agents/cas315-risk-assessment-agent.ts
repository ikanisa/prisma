/**
 * CAS 315 Risk Assessment Agent
 * 
 * Automated risk assessment per Canadian Auditing Standard 315 (Revised):
 * "Identifying and Assessing the Risks of Material Misstatement"
 * 
 * Key Requirements:
 * - Understand entity and its environment (CAS 315.11)
 * - Understand internal controls (CAS 315.12-14)
 * - Identify and assess risks of material misstatement (CAS 315.25-27)
 * - Significant risks requiring special audit consideration (CAS 315.28)
 * 
 * Integrates with CPAB inspection requirements for enhanced documentation.
 * 
 * @package @prisma/audit-canada
 */

import type {
    RiskAssessment,
    EntityRisk,
    ControlRisk,
    AssertionRisk,
    FraudRisk,
    SignificantRisk,
    MaterialityThresholds,
    ClientProfile,
    AuditEngagement,
    AuditProcedure,
    RiskLevel,
    Assertion,
    CASStandard,
    AuditContext,
    AuditAgentResponse,
    AuditAgentType,
} from '../types/index.js';

// ============================================================================
// CPAB DEFICIENCY PATTERNS (2024-2025 DATA)
// ============================================================================

/**
 * Common CPAB deficiency areas from inspection reports.
 * Used to enhance risk assessment focus.
 */
const CPAB_DEFICIENCY_PATTERNS = {
    revenue_recognition: {
        frequency: 0.28, // 28% of Big Four audit files
        commonIssues: [
            'Insufficient testing of revenue cutoff',
            'Inadequate assessment of variable consideration',
            'Failure to identify all performance obligations',
            'Insufficient audit evidence for contract modifications',
        ],
        casReferences: ['CAS_315', 'CAS_540'] as CASStandard[],
    },
    accounting_estimates: {
        frequency: 0.22, // 22%
        commonIssues: [
            'Insufficient testing of management assumptions',
            'Inadequate independent estimate development',
            'Failure to assess estimation uncertainty',
            'Insufficient sensitivity analysis',
        ],
        casReferences: ['CAS_540'] as CASStandard[],
    },
    group_audits: {
        frequency: 0.18, // 18%
        commonIssues: [
            'Insufficient direction and supervision of component auditors',
            'Inadequate evaluation of component auditor work',
            'Failure to communicate significant matters',
        ],
        casReferences: ['CAS_600'] as CASStandard[],
    },
    internal_controls: {
        frequency: 0.15, // 15%
        commonIssues: [
            'Insufficient understanding of IT general controls',
            'Inadequate testing of control design and implementation',
            'Failure to evaluate control deficiencies',
        ],
        casReferences: ['CAS_315', 'CAS_330'] as CASStandard[],
    },
};

// ============================================================================
// INDUSTRY RISK PROFILES
// ============================================================================

const INDUSTRY_RISK_PROFILES: Record<string, {
    inherentRisks: string[];
    keyAssertions: Assertion[];
    typicalSignificantRisks: string[];
}> = {
    TECHNOLOGY: {
        inherentRisks: [
            'Complex revenue arrangements with multiple performance obligations',
            'Capitalized software development costs valuation',
            'Rapid technological obsolescence affecting inventory/assets',
        ],
        keyAssertions: ['occurrence', 'cutoff', 'valuation_and_allocation'],
        typicalSignificantRisks: [
            'Revenue recognition (IFRS 15 multi-element)',
            'Intangible asset impairment',
        ],
    },
    MINING: {
        inherentRisks: [
            'Exploration and evaluation asset capitalization',
            'Mine closure and environmental provisions',
            'Commodity price volatility affecting asset impairment',
        ],
        keyAssertions: ['existence', 'valuation_and_allocation', 'completeness'],
        typicalSignificantRisks: [
            'Asset impairment (IAS 36)',
            'Provision estimates (IAS 37)',
        ],
    },
    CANNABIS: {
        inherentRisks: [
            'Biological asset fair value measurement',
            'Inventory valuation and obsolescence',
            'Regulatory compliance affecting going concern',
        ],
        keyAssertions: ['valuation_and_allocation', 'existence', 'accuracy'],
        typicalSignificantRisks: [
            'Biological asset valuation (IAS 41)',
            'Going concern assessment',
        ],
    },
    REAL_ESTATE: {
        inherentRisks: [
            'Investment property fair value',
            'Construction revenue recognition',
            'Related party transactions',
        ],
        keyAssertions: ['valuation_and_allocation', 'occurrence', 'completeness_disclosure'],
        typicalSignificantRisks: [
            'Investment property valuation (IAS 40)',
            'Revenue recognition timing',
        ],
    },
    FINANCIAL_SERVICES: {
        inherentRisks: [
            'Expected credit loss estimation',
            'Complex financial instrument valuation',
            'Regulatory capital requirements',
        ],
        keyAssertions: ['valuation_and_allocation', 'completeness', 'accuracy'],
        typicalSignificantRisks: [
            'ECL provision (IFRS 9)',
            'Fair value hierarchy (IFRS 13)',
        ],
    },
    DEFAULT: {
        inherentRisks: [
            'Revenue recognition timing and cutoff',
            'Management override of controls',
            'Related party transaction disclosure',
        ],
        keyAssertions: ['occurrence', 'cutoff', 'completeness'],
        typicalSignificantRisks: [
            'Revenue recognition',
            'Management override of controls',
        ],
    },
};

// ============================================================================
// CAS 315 RISK ASSESSMENT AGENT
// ============================================================================

export interface CAS315RiskAssessmentAgentConfig {
    enableCPABMode: boolean;
    materialityBenchmark: 'revenue' | 'assets' | 'income_before_tax' | 'equity';
    materialityPercentage: number;
    organizationId?: string;
    userId?: string;
}

const DEFAULT_CONFIG: CAS315RiskAssessmentAgentConfig = {
    enableCPABMode: true,
    materialityBenchmark: 'revenue',
    materialityPercentage: 0.005, // 0.5% of revenue
};

export class CAS315RiskAssessmentAgent {
    public readonly slug = 'canada-cas315-risk-assessment';
    public readonly name = 'CAS 315 Risk Assessment Agent';
    public readonly version = '1.0.0';
    public readonly agentType: AuditAgentType = 'risk_assessment';

    private config: CAS315RiskAssessmentAgentConfig;

    constructor(config: Partial<CAS315RiskAssessmentAgentConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // =========================================================================
    // MAIN RISK ASSESSMENT
    // =========================================================================

    /**
     * Perform comprehensive risk assessment per CAS 315
     */
    performRiskAssessment(
        engagement: AuditEngagement,
        clientProfile: ClientProfile,
        priorYearFindings: EntityRisk[],
        context: AuditContext
    ): AuditAgentResponse<RiskAssessment> {
        const startTime = Date.now();

        try {
            // Step 1: Assess entity-level risks (CAS 315.11)
            const entityRisks = this.assessEntityLevelRisks(clientProfile, engagement);

            // Step 2: Evaluate internal controls (CAS 315.12-14)
            const controlRisks = this.evaluateInternalControls(clientProfile, engagement);

            // Step 3: Assess fraud risks (CAS 240)
            const fraudRisks = this.assessFraudRisks(clientProfile);

            // Step 4: Identify assertion-level risks (CAS 315.25-27)
            const assertionRisks = this.identifyAssertionRisks(
                clientProfile,
                entityRisks,
                controlRisks
            );

            // Step 5: Identify significant risks (CAS 315.28)
            const significantRisks = this.identifySignificantRisks(
                clientProfile,
                assertionRisks,
                fraudRisks
            );

            // Step 6: Calculate materiality (CAS 320)
            const materiality = this.calculateMateriality(clientProfile);

            // Step 7: Determine overall risk level
            const overallRiskLevel = this.determineOverallRiskLevel(
                entityRisks,
                controlRisks,
                significantRisks
            );

            // Step 8: Incorporate prior year findings
            const enhancedEntityRisks = this.incorporatePriorFindings(
                entityRisks,
                priorYearFindings
            );

            const riskAssessment: RiskAssessment = {
                engagementId: engagement.engagementId,
                assessmentDate: new Date(),
                entityRisks: enhancedEntityRisks,
                controlRisks,
                assertionRisks,
                fraudRisks,
                significantRisks,
                materiality,
                overallRiskLevel,
            };

            return {
                success: true,
                data: riskAssessment,
                workpaperRef: `WP-RA-${engagement.engagementId}`,
                casReferences: ['CAS_315', 'CAS_240', 'CAS_320'],
                processingTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                errors: [`Risk assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                casReferences: ['CAS_315'],
                processingTimeMs: Date.now() - startTime,
            };
        }
    }

    // =========================================================================
    // ENTITY-LEVEL RISK ASSESSMENT (CAS 315.11)
    // =========================================================================

    /**
     * Assess entity-level risks per CAS 315.A1
     * Factors:
     * - Industry/regulatory/external factors
     * - Nature of entity, ownership, governance
     * - Accounting policies & financial reporting
     * - Objectives, strategies, business risks
     * - Measurement/review of financial performance
     */
    private assessEntityLevelRisks(
        client: ClientProfile,
        engagement: AuditEngagement
    ): EntityRisk[] {
        const risks: EntityRisk[] = [];
        const industryProfile = INDUSTRY_RISK_PROFILES[client.industry] || INDUSTRY_RISK_PROFILES.DEFAULT;

        // Industry-specific risks
        for (const inherentRisk of industryProfile.inherentRisks) {
            risks.push({
                riskId: `ER-${risks.length + 1}`,
                area: 'Industry Risk',
                description: inherentRisk,
                likelihood: 'moderate',
                impact: 'high',
                overallLevel: 'moderate',
                casReference: 'CAS_315',
                auditResponse: ['Design substantive procedures responsive to identified risk'],
            });
        }

        // CPAB deficiency patterns - enhance focus areas
        if (this.config.enableCPABMode && client.isPubliclyTraded) {
            const revenuePattern = CPAB_DEFICIENCY_PATTERNS.revenue_recognition;
            risks.push({
                riskId: `ER-CPAB-REV`,
                area: 'Revenue Recognition',
                description: `CPAB focus area - ${revenuePattern.frequency * 100}% of inspection findings relate to revenue recognition`,
                likelihood: 'high',
                impact: 'high',
                overallLevel: 'high',
                casReference: 'CAS_315',
                cpabReference: 'CPAB 2024 Inspection Report',
                auditResponse: revenuePattern.commonIssues.map(issue =>
                    `Address: ${issue}`
                ),
            });
        }

        // Going concern risk (CAS 570)
        if (client.debtToEquity > 3.0) {
            risks.push({
                riskId: `ER-GC-1`,
                area: 'Going Concern',
                description: `High leverage ratio (${client.debtToEquity.toFixed(2)}x) triggers CAS 570 assessment`,
                likelihood: 'moderate',
                impact: 'high',
                overallLevel: 'significant',
                casReference: 'CAS_315',
                auditResponse: [
                    'Obtain and analyze cash flow forecasts',
                    'Review debt covenant compliance',
                    'Assess availability of financing',
                    'Evaluate management plans to mitigate',
                ],
            });
        }

        // Related party transactions (CAS 550)
        if (client.hasRelatedPartyTransactions) {
            risks.push({
                riskId: `ER-RPT-1`,
                area: 'Related Party Transactions',
                description: 'Entity has related party transactions requiring enhanced scrutiny per CAS 550',
                likelihood: 'moderate',
                impact: 'moderate',
                overallLevel: 'moderate',
                casReference: 'CAS_315',
                auditResponse: [
                    'Obtain complete list of related parties',
                    'Test transactions for arm\'s length terms',
                    'Verify disclosure completeness',
                ],
            });
        }

        // Foreign operations (CAS 600)
        if (client.hasForeignOperations) {
            risks.push({
                riskId: `ER-FO-1`,
                area: 'Group Audit',
                description: 'Foreign operations require component auditor considerations per CAS 600',
                likelihood: 'moderate',
                impact: 'moderate',
                overallLevel: 'moderate',
                casReference: 'CAS_315',
                auditResponse: [
                    'Determine significance of components',
                    'Establish communication with component auditors',
                    'Plan supervision and review procedures',
                ],
            });
        }

        // First-year audit risk
        if (engagement.isFirstYearAudit) {
            risks.push({
                riskId: `ER-FY-1`,
                area: 'First-Year Audit',
                description: 'First-year engagement increases inherent risk due to limited entity knowledge',
                likelihood: 'moderate',
                impact: 'moderate',
                overallLevel: 'moderate',
                casReference: 'CAS_315',
                auditResponse: [
                    'Extend understanding procedures',
                    'Communicate with predecessor auditor (if applicable)',
                    'Perform additional opening balance procedures',
                ],
            });
        }

        return risks;
    }

    // =========================================================================
    // INTERNAL CONTROL EVALUATION (CAS 315.12-14)
    // =========================================================================

    private evaluateInternalControls(
        client: ClientProfile,
        engagement: AuditEngagement
    ): ControlRisk[] {
        const controlRisks: ControlRisk[] = [];

        // Control environment assessment
        const controlEnvironmentRisks = this.assessControlEnvironment(client);
        controlRisks.push(...controlEnvironmentRisks);

        // IT General Controls (ITGC)
        const itgcRisks = this.assessITGC(client);
        controlRisks.push(...itgcRisks);

        // Process-level controls
        const processControlRisks = this.assessProcessControls(client);
        controlRisks.push(...processControlRisks);

        return controlRisks;
    }

    private assessControlEnvironment(client: ClientProfile): ControlRisk[] {
        const risks: ControlRisk[] = [];

        // Size-based control considerations
        if (client.employeeCount < 50) {
            risks.push({
                riskId: 'CR-ENV-1',
                process: 'Control Environment',
                controlDescription: 'Segregation of duties',
                designEffectiveness: 'ineffective',
                operatingEffectiveness: 'not_tested',
                deficiencyLevel: 'significant',
                remediation: 'May be mitigated by management oversight - document compensating controls',
            });
        }

        return risks;
    }

    private assessITGC(client: ClientProfile): ControlRisk[] {
        const risks: ControlRisk[] = [];

        // Standard ITGC categories
        const itgcCategories = [
            { id: 'ITGC-AC', control: 'Access Controls', desc: 'User access management and authentication' },
            { id: 'ITGC-CM', control: 'Change Management', desc: 'Program change controls and testing' },
            { id: 'ITGC-OP', control: 'IT Operations', desc: 'Backup, recovery, and job scheduling' },
            { id: 'ITGC-PD', control: 'Program Development', desc: 'System development lifecycle controls' },
        ];

        for (const category of itgcCategories) {
            risks.push({
                riskId: category.id,
                process: 'IT General Controls',
                controlDescription: `${category.control}: ${category.desc}`,
                designEffectiveness: 'not_tested', // To be tested during audit
                operatingEffectiveness: 'not_tested',
            });
        }

        return risks;
    }

    private assessProcessControls(client: ClientProfile): ControlRisk[] {
        const risks: ControlRisk[] = [];

        const processes = ['Revenue', 'Procurement', 'Payroll', 'Treasury', 'Financial Reporting'];

        for (const process of processes) {
            risks.push({
                riskId: `CR-${process.toUpperCase().slice(0, 3)}-1`,
                process,
                controlDescription: `Key controls over ${process.toLowerCase()} process`,
                designEffectiveness: 'not_tested',
                operatingEffectiveness: 'not_tested',
            });
        }

        return risks;
    }

    // =========================================================================
    // FRAUD RISK ASSESSMENT (CAS 240)
    // =========================================================================

    private assessFraudRisks(client: ClientProfile): FraudRisk[] {
        const fraudRisks: FraudRisk[] = [];

        // Presumed fraud risk: Revenue recognition (CAS 240.26)
        fraudRisks.push({
            riskId: 'FR-REV-1',
            fraudType: 'revenue_recognition',
            description: 'Presumed fraud risk in revenue recognition per CAS 240.26',
            riskLevel: 'high',
            fraudTriangleFactors: {
                pressure: [
                    'Market expectations for growth',
                    'Debt covenants tied to financial metrics',
                    'Performance-based compensation',
                ],
                opportunity: [
                    'Complex revenue arrangements',
                    'Multiple performance obligations',
                    'Significant estimates in variable consideration',
                ],
                rationalization: [
                    'Industry practice',
                    'Temporary adjustment to be corrected next period',
                ],
            },
            auditResponse: [
                'Test revenue cutoff at period end',
                'Verify existence of significant new customers',
                'Analyze unusual revenue transactions',
                'Test credit notes and returns post period end',
            ],
            casReference: 'CAS_240',
        });

        // Presumed fraud risk: Management override of controls (CAS 240.31)
        fraudRisks.push({
            riskId: 'FR-MOC-1',
            fraudType: 'override_of_controls',
            description: 'Presumed fraud risk of management override of controls per CAS 240.31',
            riskLevel: 'high',
            fraudTriangleFactors: {
                pressure: ['Financial targets', 'Compensation incentives'],
                opportunity: ['Management authority to override controls'],
                rationalization: ['Company benefit justification'],
            },
            auditResponse: [
                'Test appropriateness of journal entries (100% population analysis)',
                'Review accounting estimates for bias',
                'Evaluate business rationale for significant unusual transactions',
            ],
            casReference: 'CAS_240',
        });

        return fraudRisks;
    }

    // =========================================================================
    // ASSERTION-LEVEL RISK IDENTIFICATION (CAS 315.25-27)
    // =========================================================================

    private identifyAssertionRisks(
        client: ClientProfile,
        entityRisks: EntityRisk[],
        controlRisks: ControlRisk[]
    ): AssertionRisk[] {
        const assertionRisks: AssertionRisk[] = [];
        const industryProfile = INDUSTRY_RISK_PROFILES[client.industry] || INDUSTRY_RISK_PROFILES.DEFAULT;

        // Map entity risks to assertion-level risks
        for (const entityRisk of entityRisks) {
            for (const assertion of industryProfile.keyAssertions) {
                assertionRisks.push({
                    riskId: `AR-${assertionRisks.length + 1}`,
                    accountOrClass: entityRisk.area,
                    assertion,
                    riskLevel: entityRisk.overallLevel,
                    isSignificantRisk: entityRisk.overallLevel === 'high' || entityRisk.overallLevel === 'significant',
                    auditProcedures: entityRisk.auditResponse,
                });
            }
        }

        // Standard assertion risks by financial statement area
        const standardAssertionRisks: { account: string; assertion: Assertion; risk: RiskLevel }[] = [
            { account: 'Revenue', assertion: 'occurrence', risk: 'high' },
            { account: 'Revenue', assertion: 'cutoff', risk: 'high' },
            { account: 'Receivables', assertion: 'existence', risk: 'moderate' },
            { account: 'Receivables', assertion: 'valuation_and_allocation', risk: 'moderate' },
            { account: 'Inventory', assertion: 'existence', risk: 'moderate' },
            { account: 'Inventory', assertion: 'valuation_and_allocation', risk: 'moderate' },
            { account: 'Fixed Assets', assertion: 'existence', risk: 'low' },
            { account: 'Payables', assertion: 'completeness', risk: 'moderate' },
            { account: 'Provisions', assertion: 'completeness', risk: 'moderate' },
            { account: 'Provisions', assertion: 'valuation_and_allocation', risk: 'high' },
        ];

        for (const sar of standardAssertionRisks) {
            assertionRisks.push({
                riskId: `AR-STD-${assertionRisks.length + 1}`,
                accountOrClass: sar.account,
                assertion: sar.assertion,
                riskLevel: sar.risk,
                isSignificantRisk: sar.risk === 'high',
                auditProcedures: this.getProceduresForAssertion(sar.account, sar.assertion),
            });
        }

        return assertionRisks;
    }

    private getProceduresForAssertion(account: string, assertion: Assertion): string[] {
        const procedureMap: Record<Assertion, string[]> = {
            occurrence: ['Vouch sample of transactions to source documents'],
            completeness: ['Perform search for unrecorded liabilities', 'Analytical procedures'],
            accuracy: ['Recalculate sample of transactions'],
            cutoff: ['Test transactions before and after period end'],
            classification: ['Review account coding for appropriateness'],
            existence: ['Physical inspection or confirmation'],
            rights_and_obligations: ['Review contracts and legal documents'],
            valuation_and_allocation: ['Test valuation methodology and assumptions'],
            occurrence_and_rights: ['Examine supporting documentation'],
            completeness_disclosure: ['Checklist review against standard requirements'],
            classification_and_understandability: ['Review presentation against IFRS/ASPE'],
            accuracy_and_valuation: ['Recalculate and agree to source'],
        };

        return procedureMap[assertion] || ['Design appropriate substantive procedures'];
    }

    // =========================================================================
    // SIGNIFICANT RISK IDENTIFICATION (CAS 315.28)
    // =========================================================================

    private identifySignificantRisks(
        client: ClientProfile,
        assertionRisks: AssertionRisk[],
        fraudRisks: FraudRisk[]
    ): SignificantRisk[] {
        const significantRisks: SignificantRisk[] = [];

        // Fraud risks are always significant
        for (const fraudRisk of fraudRisks) {
            significantRisks.push({
                riskId: `SR-${fraudRisk.riskId}`,
                description: fraudRisk.description,
                relatedAssertion: 'occurrence',
                accountsAffected: ['Revenue', 'All accounts (management override)'],
                requiresSpecialProcedures: true,
                procedures: fraudRisk.auditResponse,
                casReference: 'CAS_315',
            });
        }

        // High-risk assertions are significant risks
        const highRiskAssertions = assertionRisks.filter(ar => ar.isSignificantRisk);
        for (const assertion of highRiskAssertions) {
            if (!significantRisks.some(sr => sr.description.includes(assertion.accountOrClass))) {
                significantRisks.push({
                    riskId: `SR-${significantRisks.length + 1}`,
                    description: `Significant risk in ${assertion.accountOrClass} - ${assertion.assertion}`,
                    relatedAssertion: assertion.assertion,
                    accountsAffected: [assertion.accountOrClass],
                    requiresSpecialProcedures: true,
                    procedures: assertion.auditProcedures,
                    casReference: 'CAS_315',
                });
            }
        }

        return significantRisks;
    }

    // =========================================================================
    // MATERIALITY CALCULATION (CAS 320)
    // =========================================================================

    calculateMateriality(client: ClientProfile): MaterialityThresholds {
        let benchmark: number;
        let benchmarkName: string;

        switch (this.config.materialityBenchmark) {
            case 'revenue':
                benchmark = client.revenueCAD;
                benchmarkName = 'Revenue';
                break;
            case 'assets':
                benchmark = client.totalAssetsCAD;
                benchmarkName = 'Total Assets';
                break;
            case 'income_before_tax':
                benchmark = client.revenueCAD * 0.05; // Estimate 5% margin
                benchmarkName = 'Income Before Tax (estimated)';
                break;
            case 'equity':
                benchmark = client.totalAssetsCAD / (1 + client.debtToEquity);
                benchmarkName = 'Equity';
                break;
            default:
                benchmark = client.revenueCAD;
                benchmarkName = 'Revenue';
        }

        const overallMateriality = benchmark * this.config.materialityPercentage;
        const performanceMateriality = overallMateriality * 0.75; // 75% of overall
        const trivialThreshold = overallMateriality * 0.05; // 5% of overall

        return {
            overallMateriality,
            performanceMateriality,
            trivialThreshold,
            benchmark: benchmarkName,
            benchmarkPercentage: this.config.materialityPercentage,
            calculationBasis: `${(this.config.materialityPercentage * 100).toFixed(1)}% of ${benchmarkName} (${benchmark.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })})`,
        };
    }

    // =========================================================================
    // OVERALL RISK DETERMINATION
    // =========================================================================

    private determineOverallRiskLevel(
        entityRisks: EntityRisk[],
        controlRisks: ControlRisk[],
        significantRisks: SignificantRisk[]
    ): RiskLevel {
        // Count high/significant risks
        const highEntityRisks = entityRisks.filter(r =>
            r.overallLevel === 'high' || r.overallLevel === 'significant'
        ).length;

        const significantControlDeficiencies = controlRisks.filter(r =>
            r.deficiencyLevel === 'significant' || r.deficiencyLevel === 'material_weakness'
        ).length;

        const totalSignificantRisks = significantRisks.length;

        // Scoring
        const riskScore =
            highEntityRisks * 2 +
            significantControlDeficiencies * 3 +
            totalSignificantRisks;

        if (riskScore >= 10) return 'significant';
        if (riskScore >= 6) return 'high';
        if (riskScore >= 3) return 'moderate';
        return 'low';
    }

    // =========================================================================
    // PRIOR YEAR FINDINGS INCORPORATION
    // =========================================================================

    private incorporatePriorFindings(
        currentRisks: EntityRisk[],
        priorFindings: EntityRisk[]
    ): EntityRisk[] {
        // Mark risks that were also present in prior year
        for (const risk of currentRisks) {
            const priorFinding = priorFindings.find(pf => pf.area === risk.area);
            if (priorFinding) {
                risk.description += ' (Recurring from prior year)';
                // Elevate risk level for recurring issues
                if (risk.overallLevel === 'low') risk.overallLevel = 'moderate';
                else if (risk.overallLevel === 'moderate') risk.overallLevel = 'high';
            }
        }

        return currentRisks;
    }

    // =========================================================================
    // AUDIT PROGRAM DESIGN
    // =========================================================================

    /**
     * Design audit program responsive to assessed risks per CAS 330
     */
    designAuditProgram(riskAssessment: RiskAssessment): AuditProcedure[] {
        const procedures: AuditProcedure[] = [];

        // Significant risks require substantive procedures at period end
        for (const sigRisk of riskAssessment.significantRisks) {
            procedures.push({
                procedureId: `PROC-${procedures.length + 1}`,
                name: `Substantive procedures for ${sigRisk.description}`,
                objective: `Address significant risk: ${sigRisk.description}`,
                casReference: 'CAS_330',
                phase: 'substantive_testing',
                nature: 'test_of_details',
                timing: 'year_end',
                extent: 'Extended sample due to significant risk',
                steps: sigRisk.procedures,
                estimatedHours: 8,
                riskLevel: 'high',
                required: true,
                jurisdictionNotes: sigRisk.requiresSpecialProcedures
                    ? 'Special procedures required per CAS 330.21'
                    : undefined,
            });
        }

        // High/moderate assertion risks
        for (const assertionRisk of riskAssessment.assertionRisks) {
            if (assertionRisk.riskLevel !== 'low' && !assertionRisk.isSignificantRisk) {
                procedures.push({
                    procedureId: `PROC-${procedures.length + 1}`,
                    name: `${assertionRisk.accountOrClass} - ${assertionRisk.assertion}`,
                    objective: `Test ${assertionRisk.assertion} assertion for ${assertionRisk.accountOrClass}`,
                    casReference: 'CAS_330',
                    phase: 'substantive_testing',
                    nature: assertionRisk.riskLevel === 'high' ? 'test_of_details' : 'substantive_analytical',
                    timing: assertionRisk.riskLevel === 'high' ? 'year_end' : 'interim',
                    extent: `Sample size based on ${assertionRisk.riskLevel} risk`,
                    steps: assertionRisk.auditProcedures,
                    estimatedHours: assertionRisk.riskLevel === 'high' ? 6 : 3,
                    riskLevel: assertionRisk.riskLevel,
                    required: true,
                });
            }
        }

        return procedures;
    }

    // =========================================================================
    // CAPABILITIES
    // =========================================================================

    getCapabilities(): string[] {
        return [
            'CAS 315 entity-level risk assessment',
            'Internal control evaluation (ITGC, process controls)',
            'CAS 240 fraud risk assessment',
            'Assertion-level risk identification',
            'Significant risk determination',
            'CAS 320 materiality calculation',
            'CPAB deficiency pattern integration',
            'Industry-specific risk profiling',
            'Prior year findings incorporation',
            'CAS 330 audit program design',
        ];
    }
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

let instance: CAS315RiskAssessmentAgent | null = null;

export const cas315RiskAssessmentAgentFactory = {
    create: (config?: Partial<CAS315RiskAssessmentAgentConfig>) =>
        new CAS315RiskAssessmentAgent(config),
    instance: () => {
        if (!instance) {
            instance = new CAS315RiskAssessmentAgent();
        }
        return instance;
    },
};

export const createCAS315RiskAssessmentAgent = cas315RiskAssessmentAgentFactory.create;
export const cas315RiskAssessmentAgent = cas315RiskAssessmentAgentFactory;
