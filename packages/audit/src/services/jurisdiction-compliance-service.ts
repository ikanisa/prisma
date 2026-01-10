/**
 * Jurisdiction Compliance Service
 * 
 * Multi-jurisdiction audit compliance checking for Malta, Canada, and Rwanda.
 * Validates auditor qualifications, regulatory requirements, and reporting deadlines.
 */

// ============================================================================
// TYPES
// ============================================================================

export type JurisdictionCode = 'MT' | 'CA' | 'RW';

export interface ComplianceCheck {
    id: string;
    jurisdiction: JurisdictionCode;
    checkType: ComplianceCheckType;
    status: 'pass' | 'fail' | 'warning' | 'pending';
    details: string;
    regulatoryReference?: string;
    remediation?: string;
}

export type ComplianceCheckType =
    | 'auditor_registration'
    | 'independence'
    | 'audit_threshold'
    | 'rotation_requirement'
    | 'filing_deadline'
    | 'documentation'
    | 'tax_compliance'
    | 'aml_compliance'
    | 'report_format';

export interface AuditorCredentials {
    name: string;
    registrationNumber: string;
    jurisdiction: JurisdictionCode;
    registrationDate: Date;
    expiryDate?: Date;
    specializations?: string[];
}

export interface EngagementContext {
    entityName: string;
    entityType: 'private' | 'public' | 'pie' | 'sme' | 'npo';
    turnover: number;
    assets?: number;
    employees?: number;
    yearEnd: Date;
    firstYearAudit?: boolean;
    relatedParties?: string[];
}

export interface ComplianceReport {
    engagementId: string;
    jurisdiction: JurisdictionCode;
    checkedAt: Date;
    overallStatus: 'compliant' | 'non_compliant' | 'needs_review';
    checks: ComplianceCheck[];
    recommendations: string[];
}

// ============================================================================
// JURISDICTION RULES
// ============================================================================

interface JurisdictionRules {
    jurisdiction: JurisdictionCode;
    regulatoryBody: string;
    rotationRequirements: {
        applicable: boolean;
        years?: number;
        entityTypes: string[];
        coolingOffPeriod?: number;
    };
    independenceRules: string[];
    amlRequirements: string[];
    reportingDeadlines: { reportType: string; deadline: string }[];
    auditStandards: string;
}

const JURISDICTION_RULES: Record<JurisdictionCode, JurisdictionRules> = {
    MT: {
        jurisdiction: 'MT',
        regulatoryBody: 'Accountancy Board Malta',
        rotationRequirements: {
            applicable: true,
            years: 10,
            entityTypes: ['pie'],
            coolingOffPeriod: 4,
        },
        independenceRules: [
            'No financial interest in audit client',
            'No employment relationship within prior 2 years',
            'No provision of prohibited non-audit services',
            'Fee dependency check (< 15% of total fees for PIEs)',
            'Partner rotation every 10 years for PIEs',
        ],
        amlRequirements: [
            'Customer Due Diligence (CDD) required',
            'Enhanced Due Diligence for high-risk customers',
            'Suspicious Transaction Report (STR) obligations',
            'Annual FIAU compliance return',
        ],
        reportingDeadlines: [
            { reportType: 'Audit Report', deadline: 'With financial statements filing' },
            { reportType: 'Additional PIE Report', deadline: 'Within 2 months of signing' },
            { reportType: 'Transparency Report', deadline: '4 months after year-end (for PIE auditors)' },
        ],
        auditStandards: 'International Standards on Auditing (ISA) as adopted in Malta',
    },
    CA: {
        jurisdiction: 'CA',
        regulatoryBody: 'CPA Canada / Provincial Regulatory Bodies',
        rotationRequirements: {
            applicable: true,
            years: 7,
            entityTypes: ['public'],
            coolingOffPeriod: 5,
        },
        independenceRules: [
            'Independence per CPA Canada rules',
            'No financial interest in audit client',
            'Partner rotation every 7 years for reporting issuers',
            'CPAB inspection compliance for public companies',
            'No contingent fee arrangements',
        ],
        amlRequirements: [
            'FINTRAC reporting obligations if applicable',
            'Large cash transaction reporting',
            'Suspicious transaction reporting',
        ],
        reportingDeadlines: [
            { reportType: 'Audit Report (Public)', deadline: '90 days after year-end' },
            { reportType: 'Audit Report (Private)', deadline: '180 days after year-end' },
            { reportType: 'CPAB Annual Report', deadline: 'As per CPAB schedule' },
        ],
        auditStandards: 'Canadian Auditing Standards (CAS)',
    },
    RW: {
        jurisdiction: 'RW',
        regulatoryBody: 'ICPAR (Institute of Certified Public Accountants of Rwanda)',
        rotationRequirements: {
            applicable: true,
            years: 5,
            entityTypes: ['public', 'pie'],
            coolingOffPeriod: 2,
        },
        independenceRules: [
            'Independence per ICPAR Code of Ethics',
            'No financial interest in audit client',
            'No employment relationship within prior 1 year',
            'Partner rotation every 5 years for banks and insurers',
        ],
        amlRequirements: [
            'Know Your Customer (KYC) requirements',
            'Suspicious activity reporting to FIU Rwanda',
            'Enhanced due diligence for PEPs',
        ],
        reportingDeadlines: [
            { reportType: 'Audit Report', deadline: '3 months after year-end' },
            { reportType: 'Management Letter', deadline: 'With audit report' },
            { reportType: 'ICPAR Annual Return', deadline: '31 March annually' },
        ],
        auditStandards: 'International Standards on Auditing (ISA)',
    },
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export interface JurisdictionComplianceServiceConfig {
    organizationId?: string;
    userId?: string;
}

export class JurisdictionComplianceService {
    constructor(private config: JurisdictionComplianceServiceConfig = {}) { }

    /**
     * Run full compliance check for an engagement
     */
    runComplianceCheck(
        engagementId: string,
        jurisdiction: JurisdictionCode,
        context: EngagementContext,
        auditor?: AuditorCredentials
    ): ComplianceReport {
        const checks: ComplianceCheck[] = [];
        const rules = JURISDICTION_RULES[jurisdiction];

        // Auditor registration check
        if (auditor) {
            checks.push(this.checkAuditorRegistration(auditor, rules));
        }

        // Audit threshold check
        checks.push(this.checkAuditThreshold(jurisdiction, context));

        // Independence checks
        checks.push(...this.checkIndependence(jurisdiction, context, auditor));

        // AML compliance check
        checks.push(this.checkAMLCompliance(jurisdiction, context));

        // Filing deadline check
        checks.push(this.checkFilingDeadlines(jurisdiction, context.yearEnd));

        // Determine overall status
        const failCount = checks.filter(c => c.status === 'fail').length;
        const warningCount = checks.filter(c => c.status === 'warning').length;

        let overallStatus: ComplianceReport['overallStatus'];
        if (failCount > 0) {
            overallStatus = 'non_compliant';
        } else if (warningCount > 0) {
            overallStatus = 'needs_review';
        } else {
            overallStatus = 'compliant';
        }

        return {
            engagementId,
            jurisdiction,
            checkedAt: new Date(),
            overallStatus,
            checks,
            recommendations: this.generateRecommendations(checks, rules),
        };
    }

    /**
     * Check auditor registration validity
     */
    private checkAuditorRegistration(
        auditor: AuditorCredentials,
        rules: JurisdictionRules
    ): ComplianceCheck {
        const now = new Date();

        if (auditor.expiryDate && auditor.expiryDate < now) {
            return {
                id: 'check-auditor-reg',
                jurisdiction: rules.jurisdiction,
                checkType: 'auditor_registration',
                status: 'fail',
                details: `Auditor registration expired on ${auditor.expiryDate.toISOString().split('T')[0]}`,
                remediation: 'Renew registration with ' + rules.regulatoryBody,
            };
        }

        return {
            id: 'check-auditor-reg',
            jurisdiction: rules.jurisdiction,
            checkType: 'auditor_registration',
            status: 'pass',
            details: `Auditor ${auditor.name} is registered with ${rules.regulatoryBody}`,
        };
    }

    /**
     * Check if statutory audit is required
     */
    private checkAuditThreshold(
        jurisdiction: JurisdictionCode,
        context: EngagementContext
    ): ComplianceCheck {
        // Simplified threshold checks per jurisdiction
        let required = false;
        let reason = '';

        switch (jurisdiction) {
            case 'MT':
                // Malta: 2 of 3 criteria must be exceeded
                const criteria = [
                    context.turnover > 700_000,
                    (context.assets || 0) > 350_000,
                    (context.employees || 0) > 10,
                ].filter(Boolean).length;
                required = criteria >= 2;
                reason = required
                    ? 'Exceeds Malta small company thresholds (2 of 3 criteria)'
                    : 'Below Malta small company thresholds';
                break;
            case 'CA':
                // Canada: Generally required for public companies
                required = context.entityType === 'public';
                reason = context.entityType === 'public'
                    ? 'Public company requires statutory audit'
                    : 'Private company - may elect review engagement';
                break;
            case 'RW':
                // Rwanda: Companies with turnover > RWF 50M
                required = context.turnover > 50_000_000;
                reason = required
                    ? 'Turnover exceeds RWF 50M threshold'
                    : 'Below RWF 50M statutory audit threshold';
                break;
        }

        return {
            id: 'check-audit-threshold',
            jurisdiction,
            checkType: 'audit_threshold',
            status: required ? 'pass' : 'warning',
            details: reason,
            regulatoryReference: jurisdiction === 'MT' ? 'Companies Act Chapter 386' : undefined,
        };
    }

    /**
     * Check independence requirements
     */
    private checkIndependence(
        jurisdiction: JurisdictionCode,
        context: EngagementContext,
        auditor?: AuditorCredentials
    ): ComplianceCheck[] {
        const rules = JURISDICTION_RULES[jurisdiction];
        const checks: ComplianceCheck[] = [];

        // Rotation check for applicable entities
        if (rules.rotationRequirements.applicable) {
            if (rules.rotationRequirements.entityTypes.includes(context.entityType)) {
                checks.push({
                    id: 'check-rotation',
                    jurisdiction,
                    checkType: 'rotation_requirement',
                    status: 'warning',
                    details: `Partner rotation required every ${rules.rotationRequirements.years} years for ${context.entityType} entities`,
                    regulatoryReference: jurisdiction === 'MT' ? 'EU Regulation 537/2014' : undefined,
                });
            }
        }

        // General independence check
        checks.push({
            id: 'check-independence',
            jurisdiction,
            checkType: 'independence',
            status: 'pending',
            details: 'Independence declaration required: ' + rules.independenceRules[0],
        });

        return checks;
    }

    /**
     * Check AML compliance
     */
    private checkAMLCompliance(
        jurisdiction: JurisdictionCode,
        context: EngagementContext
    ): ComplianceCheck {
        const rules = JURISDICTION_RULES[jurisdiction];

        return {
            id: 'check-aml',
            jurisdiction,
            checkType: 'aml_compliance',
            status: 'pending',
            details: 'AML checks required: ' + rules.amlRequirements.join(', '),
            regulatoryReference: jurisdiction === 'MT' ? 'Prevention of Money Laundering Act' : undefined,
        };
    }

    /**
     * Check filing deadlines
     */
    private checkFilingDeadlines(
        jurisdiction: JurisdictionCode,
        yearEnd: Date
    ): ComplianceCheck {
        const rules = JURISDICTION_RULES[jurisdiction];
        const primaryDeadline = rules.reportingDeadlines[0];

        return {
            id: 'check-deadline',
            jurisdiction,
            checkType: 'filing_deadline',
            status: 'pass',
            details: `${primaryDeadline.reportType}: ${primaryDeadline.deadline} (year-end: ${yearEnd.toISOString().split('T')[0]})`,
        };
    }

    /**
     * Generate recommendations based on checks
     */
    private generateRecommendations(
        checks: ComplianceCheck[],
        rules: JurisdictionRules
    ): string[] {
        const recommendations: string[] = [];

        for (const check of checks) {
            if (check.status === 'fail' && check.remediation) {
                recommendations.push(check.remediation);
            }
            if (check.status === 'warning') {
                recommendations.push(`Review: ${check.details}`);
            }
            if (check.status === 'pending') {
                recommendations.push(`Complete: ${check.details}`);
            }
        }

        // Add general jurisdiction recommendations
        recommendations.push(`Ensure compliance with ${rules.auditStandards}`);

        return recommendations;
    }

    /**
     * Get jurisdiction rules
     */
    getJurisdictionRules(jurisdiction: JurisdictionCode): JurisdictionRules {
        return JURISDICTION_RULES[jurisdiction];
    }

    /**
     * Get all supported jurisdictions
     */
    getSupportedJurisdictions(): JurisdictionCode[] {
        return ['MT', 'CA', 'RW'];
    }
}

// Factory function
export function createJurisdictionComplianceService(
    config?: JurisdictionComplianceServiceConfig
): JurisdictionComplianceService {
    return new JurisdictionComplianceService(config);
}
