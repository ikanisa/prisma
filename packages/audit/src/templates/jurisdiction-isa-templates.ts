/**
 * Jurisdiction-Specific ISA Templates
 * 
 * Provides audit procedure templates aligned with International Standards on Auditing
 * customized for Malta, Canada, and Rwanda regulatory requirements.
 * 
 * Standards Coverage:
 * - Malta: ISA as adopted by MaltaCIA, EU Audit Regulation 537/2014
 * - Canada: CAS (Canadian Auditing Standards), CPA Canada guidance
 * - Rwanda: ISA as adopted by ICPAR, Law No. 07/2021
 */

// ============================================================================
// TYPES
// ============================================================================

export type JurisdictionCode = 'MT' | 'CA' | 'RW';

export interface ISATemplate {
    isaNumber: string;
    title: string;
    jurisdiction: JurisdictionCode;
    localStandard?: string;
    procedures: AuditProcedure[];
    requiredDocumentation: string[];
    regulatoryReferences: RegulatoryReference[];
}

export interface AuditProcedure {
    id: string;
    name: string;
    objective: string;
    steps: string[];
    riskLevel: 'low' | 'moderate' | 'high';
    estimatedHours: number;
    required: boolean;
    jurisdictionNotes?: string;
}

export interface RegulatoryReference {
    authority: string;
    reference: string;
    url?: string;
    effectiveDate?: string;
}

export interface JurisdictionAuditRequirements {
    jurisdiction: JurisdictionCode;
    currency: string;
    auditThresholds: AuditThreshold[];
    mandatoryProcedures: string[];
    filingDeadlines: FilingDeadline[];
    regulatoryBody: string;
    qualificationRequirements: string[];
}

export interface AuditThreshold {
    type: 'statutory_audit' | 'small_company' | 'medium_company' | 'public_interest';
    turnoverLimit?: number;
    assetLimit?: number;
    employeeLimit?: number;
    description: string;
}

export interface FilingDeadline {
    reportType: string;
    deadline: string;
    extensions?: string;
}

// ============================================================================
// MALTA ISA TEMPLATES
// ============================================================================

const MALTA_AUDIT_REQUIREMENTS: JurisdictionAuditRequirements = {
    jurisdiction: 'MT',
    currency: 'EUR',
    auditThresholds: [
        {
            type: 'small_company',
            turnoverLimit: 700_000,
            assetLimit: 350_000,
            employeeLimit: 10,
            description: 'Exempt from statutory audit if 2 of 3 criteria met for 2 consecutive years',
        },
        {
            type: 'medium_company',
            turnoverLimit: 8_800_000,
            assetLimit: 4_400_000,
            employeeLimit: 50,
            description: 'Required statutory audit',
        },
        {
            type: 'public_interest',
            description: 'PIE audits subject to EU Regulation 537/2014',
        },
    ],
    mandatoryProcedures: [
        'Going concern assessment (ISA 570)',
        'Related party transactions review (ISA 550)',
        'Fraud risk assessment (ISA 240)',
        'EU anti-money laundering checks',
    ],
    filingDeadlines: [
        { reportType: 'Annual Return (B1)', deadline: '42 days from AGM' },
        { reportType: 'Financial Statements', deadline: '10 months from year-end' },
        { reportType: 'Audit Report', deadline: 'With financial statements' },
    ],
    regulatoryBody: 'Accountancy Board Malta',
    qualificationRequirements: [
        'Registered with Accountancy Board Malta',
        'Hold practicing certificate',
        'Member of MaltaCIA or ACCA Malta',
    ],
};

const MALTA_ISA_TEMPLATES: ISATemplate[] = [
    {
        isaNumber: 'ISA 240',
        title: 'The Auditor\'s Responsibilities Relating to Fraud',
        jurisdiction: 'MT',
        localStandard: 'As adopted by MaltaCIA',
        procedures: [
            {
                id: 'MT-240-01',
                name: 'Fraud Risk Discussion',
                objective: 'Discuss fraud risks among engagement team',
                steps: [
                    'Hold team meeting to discuss fraud susceptibility',
                    'Consider pressure on management for results',
                    'Identify opportunities for fraud',
                    'Document attitudes/rationalizations',
                    'Review Malta-specific fraud indicators (VAT carousel fraud)',
                ],
                riskLevel: 'high',
                estimatedHours: 2,
                required: true,
                jurisdictionNotes: 'Malta PIEs subject to enhanced fraud procedures per EU Regulation',
            },
            {
                id: 'MT-240-02',
                name: 'Revenue Recognition Testing',
                objective: 'Test for revenue fraud',
                steps: [
                    'Perform cut-off testing near period end',
                    'Test unusual revenue transactions',
                    'Verify VAT on sales matches declared VAT',
                    'Compare margins to industry benchmarks',
                    'Test for fictitious customers',
                ],
                riskLevel: 'high',
                estimatedHours: 8,
                required: true,
            },
        ],
        requiredDocumentation: [
            'Fraud risk assessment memorandum',
            'Team discussion minutes',
            'Management representations on fraud',
            'Summary of fraud considerations',
        ],
        regulatoryReferences: [
            { authority: 'MaltaCIA', reference: 'Technical Release TR-008' },
            { authority: 'EU', reference: 'Regulation 537/2014 Article 11', effectiveDate: '2016-06-17' },
        ],
    },
    {
        isaNumber: 'ISA 550',
        title: 'Related Parties',
        jurisdiction: 'MT',
        localStandard: 'As adopted by MaltaCIA',
        procedures: [
            {
                id: 'MT-550-01',
                name: 'Related Party Identification',
                objective: 'Identify all related parties and transactions',
                steps: [
                    'Obtain management list of related parties',
                    'Review company registry for directors\' other interests',
                    'Check beneficial ownership register (MBR)',
                    'Review Malta Business Registry shareholding',
                    'Cross-check with VAT group registrations',
                ],
                riskLevel: 'moderate',
                estimatedHours: 4,
                required: true,
                jurisdictionNotes: 'Malta holding companies may have complex inter-company relationships',
            },
        ],
        requiredDocumentation: [
            'Related party schedule',
            'Management representations',
            'Summary of related party transactions',
        ],
        regulatoryReferences: [
            { authority: 'MaltaCIA', reference: 'Practice Note PN-22' },
        ],
    },
];

// ============================================================================
// CANADA ISA TEMPLATES (CAS)
// ============================================================================

const CANADA_AUDIT_REQUIREMENTS: JurisdictionAuditRequirements = {
    jurisdiction: 'CA',
    currency: 'CAD',
    auditThresholds: [
        {
            type: 'statutory_audit',
            description: 'Federally incorporated companies with securities traded publicly require audit',
        },
        {
            type: 'small_company',
            description: 'Private companies may elect review engagement instead of audit (CSRE 2400)',
        },
    ],
    mandatoryProcedures: [
        'Going concern assessment (CAS 570)',
        'Related party transactions (CAS 550)',
        'Fraud risk assessment (CAS 240)',
        'IT General Controls testing for SEC registrants',
    ],
    filingDeadlines: [
        { reportType: 'Annual Financial Statements', deadline: '90 days from year-end (public)' },
        { reportType: 'Annual Financial Statements', deadline: '180 days from year-end (private)' },
        { reportType: 'GST/HST Filing', deadline: 'Quarterly or annually based on revenue' },
    ],
    regulatoryBody: 'CPA Canada / Provincial bodies',
    qualificationRequirements: [
        'CPA designation (CA, CMA, or CGA unified)',
        'Public accounting license from provincial body',
        'Registered with CPAB for public company audits',
    ],
};

const CANADA_ISA_TEMPLATES: ISATemplate[] = [
    {
        isaNumber: 'CAS 240',
        title: 'The Auditor\'s Responsibilities Relating to Fraud',
        jurisdiction: 'CA',
        localStandard: 'Canadian Auditing Standard 240',
        procedures: [
            {
                id: 'CA-240-01',
                name: 'Fraud Risk Assessment',
                objective: 'Assess and respond to fraud risks per CAS 240',
                steps: [
                    'Conduct engagement team discussion on fraud susceptibility',
                    'Inquire of management about fraud risk',
                    'Consider industry-specific fraud risks (mining, cannabis, crypto)',
                    'Assess override of controls risk',
                    'Review prior period adjustments for fraud indicators',
                ],
                riskLevel: 'high',
                estimatedHours: 3,
                required: true,
                jurisdictionNotes: 'CPAB focus area - enhanced documentation required for public companies',
            },
            {
                id: 'CA-240-02',
                name: 'Journal Entry Testing',
                objective: 'Test journal entries for fraud indicators',
                steps: [
                    'Identify unusual journal entries',
                    'Test entries made at period end',
                    'Review entries with unusual account combinations',
                    'Test round-dollar entries over materiality',
                    'Trace entries to supporting documentation',
                ],
                riskLevel: 'high',
                estimatedHours: 8,
                required: true,
            },
        ],
        requiredDocumentation: [
            'CAS 240 fraud risk assessment form',
            'Journal entry testing selection criteria',
            'Management inquiry documentation',
            'Team discussion summary',
        ],
        regulatoryReferences: [
            { authority: 'CPA Canada', reference: 'CAS 240' },
            { authority: 'CPAB', reference: 'Inspection Finding 2024-01', effectiveDate: '2024-04-01' },
        ],
    },
    {
        isaNumber: 'CAS 330',
        title: 'The Auditor\'s Responses to Assessed Risks',
        jurisdiction: 'CA',
        localStandard: 'Canadian Auditing Standard 330',
        procedures: [
            {
                id: 'CA-330-01',
                name: 'GST/HST Compliance Testing',
                objective: 'Test GST/HST compliance across provinces',
                steps: [
                    'Verify GST/HST registration in applicable provinces',
                    'Test input tax credits claimed',
                    'Verify HST rates applied correctly by province',
                    'Test QST compliance for Quebec transactions',
                    'Review PST treatment in BC, SK, MB',
                ],
                riskLevel: 'moderate',
                estimatedHours: 6,
                required: true,
                jurisdictionNotes: 'Multi-province operations require comprehensive GST/HST/PST testing',
            },
        ],
        requiredDocumentation: [
            'GST/HST compliance checklist',
            'ITC testing summary',
            'Provincial tax rate verification',
        ],
        regulatoryReferences: [
            { authority: 'CPA Canada', reference: 'CAS 330' },
        ],
    },
];

// ============================================================================
// RWANDA ISA TEMPLATES
// ============================================================================

const RWANDA_AUDIT_REQUIREMENTS: JurisdictionAuditRequirements = {
    jurisdiction: 'RW',
    currency: 'RWF',
    auditThresholds: [
        {
            type: 'statutory_audit',
            turnoverLimit: 50_000_000,
            description: 'Companies with turnover above RWF 50M require audit',
        },
        {
            type: 'public_interest',
            description: 'Banks, insurance, listed companies - mandatory audit',
        },
    ],
    mandatoryProcedures: [
        'Going concern assessment (ISA 570)',
        'Related party transactions (ISA 550)',
        'EBM (Electronic Billing Machine) reconciliation',
        'RRA tax compliance verification',
        'Withholding tax testing',
    ],
    filingDeadlines: [
        { reportType: 'Annual Financial Statements', deadline: '3 months from year-end' },
        { reportType: 'Tax Declaration', deadline: '31 March following year-end' },
        { reportType: 'EBM Monthly Reports', deadline: '5th of following month' },
    ],
    regulatoryBody: 'ICPAR (Institute of Certified Public Accountants of Rwanda)',
    qualificationRequirements: [
        'Member of ICPAR with valid practicing license',
        'Registered with Rwanda Development Board',
        'Compliance with Law No. 07/2021',
    ],
};

const RWANDA_ISA_TEMPLATES: ISATemplate[] = [
    {
        isaNumber: 'ISA 240',
        title: 'The Auditor\'s Responsibilities Relating to Fraud',
        jurisdiction: 'RW',
        localStandard: 'As adopted by ICPAR',
        procedures: [
            {
                id: 'RW-240-01',
                name: 'Fraud Risk Assessment',
                objective: 'Assess fraud risks with focus on local factors',
                steps: [
                    'Conduct team discussion on fraud susceptibility',
                    'Consider cash economy fraud risks',
                    'Review mobile money transaction integrity',
                    'Assess EBM bypass risks',
                    'Consider related party transaction risks in family businesses',
                ],
                riskLevel: 'high',
                estimatedHours: 3,
                required: true,
                jurisdictionNotes: 'Focus on cash/mobile money and EBM compliance',
            },
            {
                id: 'RW-240-02',
                name: 'EBM Revenue Verification',
                objective: 'Verify EBM-reported revenue matches books',
                steps: [
                    'Obtain RRA EBM summary reports',
                    'Reconcile total EBM invoices to revenue',
                    'Test sample of EBM invoices to bank receipts',
                    'Verify EBM device registration and authorization',
                    'Check for possible offline sales not captured',
                ],
                riskLevel: 'high',
                estimatedHours: 6,
                required: true,
                jurisdictionNotes: 'Critical control - RRA reliance on EBM for VAT verification',
            },
        ],
        requiredDocumentation: [
            'Fraud risk assessment form',
            'EBM reconciliation workpaper',
            'Mobile money reconciliation',
            'Team discussion minutes',
        ],
        regulatoryReferences: [
            { authority: 'ICPAR', reference: 'Practice Guidance PG-2023-01' },
            { authority: 'RRA', reference: 'Ministerial Order N° 003/19/10/TC' },
        ],
    },
    {
        isaNumber: 'ISA 500',
        title: 'Audit Evidence',
        jurisdiction: 'RW',
        localStandard: 'As adopted by ICPAR',
        procedures: [
            {
                id: 'RW-500-01',
                name: 'Tax Compliance Verification',
                objective: 'Verify tax compliance with RRA requirements',
                steps: [
                    'Obtain tax clearance certificate from RRA',
                    'Verify withholding tax remittances (15% on services)',
                    'Test PAYE calculations and remittances',
                    'Verify VAT monthly filings against EBM data',
                    'Check corporate income tax installments',
                ],
                riskLevel: 'high',
                estimatedHours: 8,
                required: true,
                jurisdictionNotes: 'Tax compliance is high-risk area due to RRA enforcement',
            },
            {
                id: 'RW-500-02',
                name: 'Mobile Money Procedures',
                objective: 'Audit mobile money transactions',
                steps: [
                    'Obtain MTN MoMo and Airtel Money statements',
                    'Reconcile mobile money to bank transfers',
                    'Test sample of receipts to sales invoices',
                    'Verify float account balances',
                    'Test agent commission calculations',
                ],
                riskLevel: 'moderate',
                estimatedHours: 4,
                required: false,
                jurisdictionNotes: 'Applicable for businesses with significant mobile money transactions',
            },
        ],
        requiredDocumentation: [
            'Tax compliance testing summary',
            'Mobile money reconciliation',
            'RRA correspondence and clearances',
        ],
        regulatoryReferences: [
            { authority: 'ICPAR', reference: 'Audit Practice Guidance' },
            { authority: 'RRA', reference: 'Law No. 016/2018 on Tax Procedures' },
        ],
    },
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

export interface JurisdictionISAServiceConfig {
    organizationId?: string;
    userId?: string;
}

export class JurisdictionISAService {
    private config: JurisdictionISAServiceConfig;

    constructor(config: JurisdictionISAServiceConfig = {}) {
        this.config = config;
    }

    /**
     * Get all ISA templates for a jurisdiction
     */
    getTemplates(jurisdiction: JurisdictionCode): ISATemplate[] {
        switch (jurisdiction) {
            case 'MT': return MALTA_ISA_TEMPLATES;
            case 'CA': return CANADA_ISA_TEMPLATES;
            case 'RW': return RWANDA_ISA_TEMPLATES;
            default: return [];
        }
    }

    /**
     * Get audit requirements for a jurisdiction
     */
    getAuditRequirements(jurisdiction: JurisdictionCode): JurisdictionAuditRequirements {
        switch (jurisdiction) {
            case 'MT': return MALTA_AUDIT_REQUIREMENTS;
            case 'CA': return CANADA_AUDIT_REQUIREMENTS;
            case 'RW': return RWANDA_AUDIT_REQUIREMENTS;
            default: throw new Error(`Unknown jurisdiction: ${jurisdiction}`);
        }
    }

    /**
     * Get specific ISA template by number
     */
    getTemplate(jurisdiction: JurisdictionCode, isaNumber: string): ISATemplate | undefined {
        return this.getTemplates(jurisdiction).find(t => t.isaNumber === isaNumber);
    }

    /**
     * Get mandatory procedures for a jurisdiction
     */
    getMandatoryProcedures(jurisdiction: JurisdictionCode): string[] {
        return this.getAuditRequirements(jurisdiction).mandatoryProcedures;
    }

    /**
     * Check if statutory audit is required
     */
    isStatutoryAuditRequired(
        jurisdiction: JurisdictionCode,
        turnover: number,
        assets?: number,
        employees?: number
    ): { required: boolean; reason: string } {
        const requirements = this.getAuditRequirements(jurisdiction);

        for (const threshold of requirements.auditThresholds) {
            if (threshold.type === 'small_company') {
                const criteriaExceeded = [];
                if (threshold.turnoverLimit && turnover > threshold.turnoverLimit) {
                    criteriaExceeded.push('turnover');
                }
                if (threshold.assetLimit && assets && assets > threshold.assetLimit) {
                    criteriaExceeded.push('assets');
                }
                if (threshold.employeeLimit && employees && employees > threshold.employeeLimit) {
                    criteriaExceeded.push('employees');
                }

                if (criteriaExceeded.length >= 2) {
                    return { required: true, reason: `Exceeds ${criteriaExceeded.join(' and ')} thresholds` };
                }
            } else if (threshold.type === 'statutory_audit') {
                if (threshold.turnoverLimit && turnover > threshold.turnoverLimit) {
                    return { required: true, reason: threshold.description };
                }
            }
        }

        return { required: false, reason: 'Below statutory audit thresholds' };
    }

    /**
     * Generate audit plan based on jurisdiction
     */
    generateAuditPlan(
        jurisdiction: JurisdictionCode,
        riskLevel: 'low' | 'moderate' | 'high'
    ): AuditProcedure[] {
        const templates = this.getTemplates(jurisdiction);
        const procedures: AuditProcedure[] = [];

        for (const template of templates) {
            for (const procedure of template.procedures) {
                if (procedure.required || procedure.riskLevel === riskLevel || procedure.riskLevel === 'high') {
                    procedures.push(procedure);
                }
            }
        }

        return procedures;
    }

    /**
     * Estimate total audit hours for a jurisdiction engagement
     */
    estimateAuditHours(
        jurisdiction: JurisdictionCode,
        complexity: 'simple' | 'moderate' | 'complex' = 'moderate'
    ): number {
        const procedures = this.generateAuditPlan(jurisdiction, complexity === 'simple' ? 'low' : 'high');
        const baseHours = procedures.reduce((sum, p) => sum + p.estimatedHours, 0);

        const complexityMultiplier = { simple: 0.8, moderate: 1.0, complex: 1.5 }[complexity];
        return Math.round(baseHours * complexityMultiplier);
    }
}

// Factory function
export function createJurisdictionISAService(config?: JurisdictionISAServiceConfig): JurisdictionISAService {
    return new JurisdictionISAService(config);
}
