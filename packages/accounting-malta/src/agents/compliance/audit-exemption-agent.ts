/**
 * Malta Audit Exemption Agent
 * 
 * Monitors and determines audit exemption eligibility under LN 139/2025.
 * 
 * Key Exemption Rules:
 * - Rule 6: New company exemption (first 2 accounting periods)
 * - Rule 7: Micro-entity exemption (Article 185(2))
 * - Rule 8: Small group exemption
 * - Rule 9: Merchant shipping exemption
 */

import {
    type MaltaAccountingAgent,
    type AgentResponse,
} from '../../core/base-agent.js';
import type {
    MaltaEntityClassification,
    MaltaCompany,
} from '../../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Shareholder information for exemption determination.
 */
export interface Shareholder {
    id: string;
    name: string;
    type: 'INDIVIDUAL' | 'CORPORATE';
    /** Malta Qualifications Framework level (1-8) */
    mqfLevel?: number;
    /** Whether registered within 3 years of obtaining qualifications */
    registeredWithinThreeYears?: boolean;
    ownershipPercentage: number;
    taxResidency: string;
}

/**
 * Audit exemption status.
 */
export interface AuditExemptionStatus {
    /** Whether entity is exempt from audit */
    exempt: boolean;
    /** Reason for exemption or non-exemption */
    reason: string;
    /** Specific rule applied (LN 139/2025) */
    ruleApplied?: string;
    /** Audit type required if not exempt */
    auditType?: 'FULL_STATUTORY_AUDIT' | 'COMPILATION' | 'REVIEW' | 'EXEMPT';
    /** Validity period for exemption */
    validUntil?: Date;
    /** Conditions to maintain exemption */
    conditions?: string[];
    /** Actions required */
    actions?: string[];
    /** Deadline for audit filing if required */
    deadline?: Date;
}

/**
 * Exemption eligibility check result.
 */
export interface EligibilityCheck {
    rule: string;
    eligible: boolean;
    reason: string;
    details?: Record<string, unknown>;
}

// ============================================================================
// AUDIT EXEMPTION AGENT
// ============================================================================

/**
 * Audit Exemption Agent for Malta LN 139/2025 compliance.
 */
export class AuditExemptionAgent implements MaltaAccountingAgent {
    public readonly agentId = 'malta-audit-exemption-001';
    public readonly name = 'Malta Audit Exemption Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'COMPLIANCE_MONITORING' as const;
    public readonly capabilities = [
        'exemption_eligibility',
        'continuous_monitoring',
        'alert_generation',
        'ln_139_2025_compliance',
    ];
    public readonly framework = 'BOTH' as const;
    public readonly autonomyLevel = 4 as const;
    public readonly supportedCurrencies = ['EUR'];

    /**
     * Check audit exemption eligibility.
     */
    async checkAuditExemption(
        company: MaltaCompany,
        shareholders: Shareholder[],
        metrics: {
            currentYearTurnover: number;
            domesticTurnover?: number;
            isPartOfGroup?: boolean;
            isGroupSmall?: boolean;
            registeredUnder?: string;
        }
    ): Promise<AgentResponse<AuditExemptionStatus>> {
        const startTime = Date.now();

        try {
            const checks: EligibilityCheck[] = [];

            // Rule 6: Newly incorporated companies (first 2 periods)
            const newCompanyCheck = this.checkNewCompanyExemption(company, shareholders, metrics.currentYearTurnover);
            checks.push(newCompanyCheck);
            if (newCompanyCheck.eligible) {
                return {
                    success: true,
                    data: {
                        exempt: true,
                        reason: newCompanyCheck.reason,
                        ruleApplied: 'LN 139/2025 Rule 6',
                        auditType: 'EXEMPT',
                        validUntil: this.calculateExemptionExpiry(company.incorporationDate, 2),
                        conditions: [
                            'Must prepare financial statements (GAPSME)',
                            'Director declaration required',
                            'Exemption valid for first 2 periods only',
                        ],
                    },
                    requiresReview: false,
                    durationMs: Date.now() - startTime,
                };
            }

            // Rule 7: Micro-entity exemption
            const microCheck = this.checkMicroEntityExemption(company);
            checks.push(microCheck);
            if (microCheck.eligible) {
                return {
                    success: true,
                    data: {
                        exempt: true,
                        reason: microCheck.reason,
                        ruleApplied: 'LN 139/2025 Rule 7 (Article 185(2) Companies Act)',
                        auditType: 'EXEMPT',
                        conditions: [
                            'Must remain classified as MICRO entity',
                            'Must file annual returns with MBR',
                            'Shareholders can still request an audit',
                        ],
                    },
                    requiresReview: false,
                    durationMs: Date.now() - startTime,
                };
            }

            // Rule 8: Small group exemption
            if (metrics.isPartOfGroup) {
                const smallGroupCheck = this.checkSmallGroupExemption(metrics.isGroupSmall ?? false);
                checks.push(smallGroupCheck);
                if (smallGroupCheck.eligible) {
                    return {
                        success: true,
                        data: {
                            exempt: true,
                            reason: smallGroupCheck.reason,
                            ruleApplied: 'LN 139/2025 Rule 8',
                            auditType: 'EXEMPT',
                            conditions: [
                                'Group must qualify as small',
                                'All group companies must claim exemption',
                            ],
                        },
                        requiresReview: false,
                        durationMs: Date.now() - startTime,
                    };
                }
            }

            // Rule 9: Merchant shipping exemption
            if (metrics.registeredUnder === 'MERCHANT_SHIPPING_ACT') {
                const shippingCheck = this.checkShippingExemption();
                checks.push(shippingCheck);
                if (shippingCheck.eligible) {
                    return {
                        success: true,
                        data: {
                            exempt: true,
                            reason: shippingCheck.reason,
                            ruleApplied: 'LN 139/2025 Rule 9',
                            auditType: 'EXEMPT',
                        },
                        requiresReview: false,
                        durationMs: Date.now() - startTime,
                    };
                }
            }

            // No exemption applies
            return {
                success: true,
                data: {
                    exempt: false,
                    reason: this.summarizeFailedChecks(checks),
                    auditType: 'FULL_STATUTORY_AUDIT',
                    deadline: this.calculateAuditDeadline(company.yearEndMonth, company.yearEndDay),
                    actions: [
                        'Engage registered auditor',
                        'Prepare audit-ready financial statements',
                        'Schedule audit fieldwork',
                    ],
                },
                requiresReview: false,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Exemption check failed',
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Rule 6: Check new company exemption eligibility.
     */
    private checkNewCompanyExemption(
        company: MaltaCompany,
        shareholders: Shareholder[],
        turnover: number
    ): EligibilityCheck {
        const now = new Date();
        const incorporationDate = new Date(company.incorporationDate);
        const yearsIncorporated = (now.getTime() - incorporationDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

        // Must be within first 2 accounting periods
        if (yearsIncorporated > 2) {
            return {
                rule: 'Rule 6 - New Company',
                eligible: false,
                reason: 'Company is beyond first 2 accounting periods',
            };
        }

        // All shareholders must be individuals
        const allIndividuals = shareholders.every(sh => sh.type === 'INDIVIDUAL');
        if (!allIndividuals) {
            return {
                rule: 'Rule 6 - New Company',
                eligible: false,
                reason: 'Corporate shareholders present',
            };
        }

        // Shareholders must have MQF Level 3+ qualifications
        const allQualified = shareholders.every(sh => (sh.mqfLevel ?? 0) >= 3);
        if (!allQualified) {
            return {
                rule: 'Rule 6 - New Company',
                eligible: false,
                reason: 'Not all shareholders have MQF Level 3+ qualifications',
            };
        }

        // Shareholders must be registered within 3 years of obtaining qualifications
        const allRecentlyRegistered = shareholders.every(sh => sh.registeredWithinThreeYears !== false);
        if (!allRecentlyRegistered) {
            return {
                rule: 'Rule 6 - New Company',
                eligible: false,
                reason: 'Shareholders not registered within 3 years of qualification',
            };
        }

        // Turnover must not exceed €80,000 (pro-rated)
        const maxTurnover = 80000;
        if (turnover > maxTurnover) {
            return {
                rule: 'Rule 6 - New Company',
                eligible: false,
                reason: `Turnover €${turnover.toLocaleString()} exceeds €80,000 threshold`,
            };
        }

        return {
            rule: 'Rule 6 - New Company',
            eligible: true,
            reason: 'Eligible for new company exemption (first 2 periods)',
            details: {
                yearsIncorporated: yearsIncorporated.toFixed(1),
                turnover,
                shareholderCount: shareholders.length,
            },
        };
    }

    /**
     * Rule 7: Check micro-entity exemption.
     */
    private checkMicroEntityExemption(company: MaltaCompany): EligibilityCheck {
        if (company.classification !== 'MICRO') {
            return {
                rule: 'Rule 7 - Micro Entity',
                eligible: false,
                reason: `Company classified as ${company.classification}, not MICRO`,
            };
        }

        if (company.isRegulated) {
            return {
                rule: 'Rule 7 - Micro Entity',
                eligible: false,
                reason: `Regulated entities (${company.regulatedBy}) cannot claim micro exemption`,
            };
        }

        return {
            rule: 'Rule 7 - Micro Entity',
            eligible: true,
            reason: 'Micro entity exempt under Article 185(2) Companies Act',
        };
    }

    /**
     * Rule 8: Check small group exemption.
     */
    private checkSmallGroupExemption(isGroupSmall: boolean): EligibilityCheck {
        if (!isGroupSmall) {
            return {
                rule: 'Rule 8 - Small Group',
                eligible: false,
                reason: 'Group does not qualify as small',
            };
        }

        return {
            rule: 'Rule 8 - Small Group',
            eligible: true,
            reason: 'Eligible for small group exemption',
        };
    }

    /**
     * Rule 9: Check merchant shipping exemption.
     */
    private checkShippingExemption(): EligibilityCheck {
        return {
            rule: 'Rule 9 - Merchant Shipping',
            eligible: true,
            reason: 'Eligible for merchant shipping exemption',
        };
    }

    /**
     * Calculate when exemption expires.
     */
    private calculateExemptionExpiry(incorporationDate: Date, periods: number): Date {
        const expiry = new Date(incorporationDate);
        expiry.setFullYear(expiry.getFullYear() + periods);
        return expiry;
    }

    /**
     * Calculate audit filing deadline.
     */
    private calculateAuditDeadline(yearEndMonth: number, yearEndDay: number): Date {
        const currentYear = new Date().getFullYear();
        const yearEnd = new Date(currentYear, yearEndMonth - 1, yearEndDay);

        // 10 months + 42 days from year end
        const deadline = new Date(yearEnd);
        deadline.setMonth(deadline.getMonth() + 10);
        deadline.setDate(deadline.getDate() + 42);

        return deadline;
    }

    /**
     * Summarize why exemption checks failed.
     */
    private summarizeFailedChecks(checks: EligibilityCheck[]): string {
        const failed = checks.filter(c => !c.eligible);
        if (failed.length === 0) return 'No exemption criteria met';
        return failed.map(c => c.reason).join('; ');
    }

    /**
     * Monitor exemption status changes.
     */
    async monitorExemptionStatus(
        company: MaltaCompany,
        previousStatus: AuditExemptionStatus,
        shareholders: Shareholder[],
        currentMetrics: { turnover: number }
    ): Promise<AgentResponse<{
        changed: boolean;
        previousStatus: AuditExemptionStatus;
        currentStatus: AuditExemptionStatus;
        alerts: string[];
    }>> {
        const currentResult = await this.checkAuditExemption(company, shareholders, {
            currentYearTurnover: currentMetrics.turnover,
        });

        if (!currentResult.success || !currentResult.data) {
            return {
                success: false,
                error: 'Failed to check current exemption status',
                requiresReview: true,
            };
        }

        const currentStatus = currentResult.data;
        const alerts: string[] = [];

        // Check if status changed
        const changed = previousStatus.exempt !== currentStatus.exempt;

        if (changed) {
            if (previousStatus.exempt && !currentStatus.exempt) {
                alerts.push('ALERT: Audit exemption lost. Statutory audit now required.');
            } else if (!previousStatus.exempt && currentStatus.exempt) {
                alerts.push('INFO: Now eligible for audit exemption.');
            }
        }

        // Check if approaching threshold
        if (currentStatus.exempt && currentMetrics.turnover > 70000) {
            alerts.push('WARNING: Turnover approaching €80,000 exemption threshold.');
        }

        return {
            success: true,
            data: {
                changed,
                previousStatus,
                currentStatus,
                alerts,
            },
            requiresReview: changed,
            reviewReason: changed ? 'Exemption status changed' : undefined,
        };
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create an Audit Exemption Agent instance.
 */
export function createAuditExemptionAgent(): AuditExemptionAgent {
    return new AuditExemptionAgent();
}

/**
 * Lazy singleton instance.
 */
let _auditExemptionAgent: AuditExemptionAgent | null = null;

export const auditExemptionAgent = {
    instance(): AuditExemptionAgent {
        if (!_auditExemptionAgent) {
            _auditExemptionAgent = new AuditExemptionAgent();
        }
        return _auditExemptionAgent;
    },
};
