/**
 * Malta MBR Filing Agent
 * 
 * Agent for Malta Business Registry (MBR) filing operations.
 * 
 * Features:
 * - Annual return preparation (Form BO 6)
 * - Financial statements packaging
 * - Director/shareholder information management
 * - Audit exemption declarations
 * - Filing deadline monitoring
 */

import {
    type MaltaAccountingAgent,
    type AgentResponse,
} from '../../core/base-agent.js';
import type {
    MaltaCompany,
    FinancialStatements,
} from '../../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * MBR filing types.
 */
export type MBRFilingType =
    | 'ANNUAL_RETURN'
    | 'FINANCIAL_STATEMENTS'
    | 'CHANGE_OF_DIRECTORS'
    | 'CHANGE_OF_SHAREHOLDERS'
    | 'CHANGE_OF_REGISTERED_OFFICE'
    | 'SPECIAL_RESOLUTION';

/**
 * Director information.
 */
export interface Director {
    id: string;
    fullName: string;
    idNumber: string;
    nationality: string;
    dateOfBirth: Date;
    residentialAddress: string;
    appointmentDate: Date;
    resignationDate?: Date;
    isActive: boolean;
}

/**
 * Shareholder information.
 */
export interface ShareholderInfo {
    id: string;
    name: string;
    type: 'INDIVIDUAL' | 'CORPORATE';
    idOrRegNumber: string;
    address: string;
    sharesHeld: number;
    shareClass: string;
    percentageOwnership: number;
}

/**
 * Annual return data.
 */
export interface AnnualReturnData {
    company: MaltaCompany;
    directors: Director[];
    shareholders: ShareholderInfo[];
    registeredOffice: string;
    companySecretary?: string;
    authorizedShareCapital: number;
    issuedShareCapital: number;
    lastAGMDate?: Date;
    auditExemptionClaimed: boolean;
    auditExemptionRule?: string;
}

/**
 * MBR filing package.
 */
export interface MBRFilingPackage {
    filing: {
        type: MBRFilingType;
        referenceNumber: string;
        preparedAt: Date;
        deadline: Date;
    };
    annualReturn?: AnnualReturnData;
    financialStatements?: FinancialStatements;
    auditExemptionDeclaration?: string;
    validationErrors: string[];
    validationWarnings: string[];
    ready: boolean;
}

// ============================================================================
// MBR FILING AGENT
// ============================================================================

/**
 * MBR Filing Agent for Malta Business Registry submissions.
 */
export class MBRFilingAgent implements MaltaAccountingAgent {
    public readonly agentId = 'malta-mbr-filing-001';
    public readonly name = 'Malta MBR Filing Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'FILING' as const;
    public readonly capabilities = [
        'annual_return_preparation',
        'financial_statements_packaging',
        'deadline_monitoring',
        'validation',
    ];
    public readonly framework = 'BOTH' as const;
    public readonly autonomyLevel = 3 as const;
    public readonly supportedCurrencies = ['EUR'];

    /**
     * Prepare annual return filing package.
     */
    async prepareAnnualReturn(
        company: MaltaCompany,
        directors: Director[],
        shareholders: ShareholderInfo[],
        financialStatements: FinancialStatements,
        options: {
            registeredOffice: string;
            companySecretary?: string;
            authorizedShareCapital: number;
            issuedShareCapital: number;
            lastAGMDate?: Date;
        }
    ): Promise<AgentResponse<MBRFilingPackage>> {
        const startTime = Date.now();

        try {
            const deadline = this.calculateFilingDeadline(company.yearEndMonth, company.yearEndDay);

            // Build annual return data
            const annualReturn: AnnualReturnData = {
                company,
                directors: directors.filter(d => d.isActive),
                shareholders,
                registeredOffice: options.registeredOffice,
                companySecretary: options.companySecretary,
                authorizedShareCapital: options.authorizedShareCapital,
                issuedShareCapital: options.issuedShareCapital,
                lastAGMDate: options.lastAGMDate,
                auditExemptionClaimed: !company.auditRequired,
                auditExemptionRule: company.auditExemptionReason,
            };

            // Create filing package
            const filingPackage: MBRFilingPackage = {
                filing: {
                    type: 'ANNUAL_RETURN',
                    referenceNumber: this.generateFilingReference(company.registrationNumber),
                    preparedAt: new Date(),
                    deadline,
                },
                annualReturn,
                financialStatements,
                auditExemptionDeclaration: this.generateAuditExemptionDeclaration(annualReturn),
                validationErrors: [],
                validationWarnings: [],
                ready: false,
            };

            // Validate package
            const validation = this.validateFilingPackage(filingPackage);
            filingPackage.validationErrors = validation.errors;
            filingPackage.validationWarnings = validation.warnings;
            filingPackage.ready = validation.errors.length === 0;

            return {
                success: true,
                data: filingPackage,
                requiresReview: true,
                reviewReason: 'Annual return requires director approval before submission',
                warnings: validation.warnings,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Annual return preparation failed',
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Calculate filing deadline.
     * Per Companies Act: 10 months + 42 days from financial year end.
     */
    calculateFilingDeadline(yearEndMonth: number, yearEndDay: number): Date {
        const currentYear = new Date().getFullYear();
        const yearEnd = new Date(currentYear, yearEndMonth - 1, yearEndDay);

        // If year end is in the future, use last year's year end
        if (yearEnd > new Date()) {
            yearEnd.setFullYear(yearEnd.getFullYear() - 1);
        }

        // Add 10 months and 42 days
        const deadline = new Date(yearEnd);
        deadline.setMonth(deadline.getMonth() + 10);
        deadline.setDate(deadline.getDate() + 42);

        return deadline;
    }

    /**
     * Check if filing is overdue.
     */
    isFilingOverdue(yearEndMonth: number, yearEndDay: number): boolean {
        const deadline = this.calculateFilingDeadline(yearEndMonth, yearEndDay);
        return new Date() > deadline;
    }

    /**
     * Calculate days until deadline.
     */
    getDaysUntilDeadline(yearEndMonth: number, yearEndDay: number): number {
        const deadline = this.calculateFilingDeadline(yearEndMonth, yearEndDay);
        const now = new Date();
        const diffMs = deadline.getTime() - now.getTime();
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    /**
     * Generate a unique filing reference.
     */
    private generateFilingReference(registrationNumber: string): string {
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `MBR-${registrationNumber}-${year}-${random}`;
    }

    /**
     * Generate audit exemption declaration text.
     */
    private generateAuditExemptionDeclaration(annualReturn: AnnualReturnData): string | undefined {
        if (!annualReturn.auditExemptionClaimed) return undefined;

        return `AUDIT EXEMPTION DECLARATION

The directors of ${annualReturn.company.name} (Registration Number: ${annualReturn.company.registrationNumber}) hereby declare that:

1. The company qualifies for exemption from the statutory audit requirement under ${annualReturn.auditExemptionRule || 'the Companies Act 1995'}.

2. The financial statements for the period ended ${annualReturn.company.yearEndDay}/${annualReturn.company.yearEndMonth}/${new Date().getFullYear()} have been prepared in accordance with ${annualReturn.company.accountingFramework === 'GAPSME' ? 'General Accounting Principles for Small and Medium-Sized Entities (GAPSME)' : 'International Financial Reporting Standards (IFRS)'}.

3. The company's members have not required an audit pursuant to article 185 of the Companies Act 1995.

Signed on behalf of the Board of Directors:

Director: ____________________
Date: ${new Date().toLocaleDateString('en-GB')}`;
    }

    /**
     * Validate filing package.
     */
    private validateFilingPackage(pkg: MBRFilingPackage): {
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate annual return data
        if (pkg.annualReturn) {
            const ar = pkg.annualReturn;

            // Must have at least one active director
            if (ar.directors.length === 0) {
                errors.push('At least one active director is required');
            }

            // Must have at least one shareholder
            if (ar.shareholders.length === 0) {
                errors.push('At least one shareholder is required');
            }

            // Validate shareholder percentages sum to 100%
            const totalPercentage = ar.shareholders.reduce((sum, sh) => sum + sh.percentageOwnership, 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                errors.push(`Shareholder percentages sum to ${totalPercentage.toFixed(2)}%, should be 100%`);
            }

            // Validate issued capital doesn't exceed authorized
            if (ar.issuedShareCapital > ar.authorizedShareCapital) {
                errors.push('Issued share capital exceeds authorized share capital');
            }

            // Registration number format
            if (!ar.company.registrationNumber.match(/^C\s*\d+$/)) {
                warnings.push('Registration number should be in format C XXXXX');
            }
        }

        // Validate financial statements
        if (pkg.financialStatements) {
            const fs = pkg.financialStatements;

            // Balance sheet must balance
            const bs = fs.balanceSheet;
            if (Math.abs(bs.totalAssets - bs.totalEquityAndLiabilities) > 0.01) {
                errors.push('Balance sheet does not balance');
            }

            // Must have at least balance sheet and P&L for MICRO
            if (!fs.balanceSheet || !fs.incomeStatement) {
                errors.push('Balance sheet and income statement are required');
            }
        } else {
            errors.push('Financial statements are required for annual return');
        }

        // Check deadline
        if (pkg.filing.deadline < new Date()) {
            errors.push(`Filing deadline has passed (${pkg.filing.deadline.toLocaleDateString('en-GB')})`);
        } else {
            const daysRemaining = Math.ceil((pkg.filing.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            if (daysRemaining < 14) {
                warnings.push(`Filing deadline is in ${daysRemaining} days`);
            }
        }

        return { errors, warnings };
    }

    /**
     * Get filing requirements based on company classification.
     */
    getFilingRequirements(company: MaltaCompany): {
        requiredDocuments: string[];
        optionalDocuments: string[];
        exemptions: string[];
    } {
        const requiredDocuments = ['Annual Return (Form BO 6)'];
        const optionalDocuments: string[] = [];
        const exemptions: string[] = [];

        switch (company.classification) {
            case 'MICRO':
                requiredDocuments.push('Abridged Balance Sheet');
                requiredDocuments.push('Abridged Income Statement');
                optionalDocuments.push('Full Financial Statements');
                exemptions.push('Audit exemption available');
                exemptions.push("Directors' Report not required");
                break;
            case 'SMALL':
                requiredDocuments.push('Balance Sheet');
                requiredDocuments.push('Income Statement');
                requiredDocuments.push("Directors' Report");
                if (!company.auditRequired) {
                    exemptions.push('Audit exemption claimed');
                } else {
                    requiredDocuments.push("Auditors' Report");
                }
                break;
            case 'MEDIUM':
            case 'LARGE':
            case 'PUBLIC_INTEREST':
                requiredDocuments.push('Full Financial Statements');
                requiredDocuments.push('Cash Flow Statement');
                requiredDocuments.push('Statement of Changes in Equity');
                requiredDocuments.push('Notes to Financial Statements');
                requiredDocuments.push("Directors' Report");
                requiredDocuments.push("Auditors' Report");
                break;
        }

        return { requiredDocuments, optionalDocuments, exemptions };
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create an MBR Filing Agent instance.
 */
export function createMBRFilingAgent(): MBRFilingAgent {
    return new MBRFilingAgent();
}

/**
 * Lazy singleton instance.
 */
let _mbrFilingAgent: MBRFilingAgent | null = null;

export const mbrFilingAgent = {
    instance(): MBRFilingAgent {
        if (!_mbrFilingAgent) {
            _mbrFilingAgent = new MBRFilingAgent();
        }
        return _mbrFilingAgent;
    },
};
