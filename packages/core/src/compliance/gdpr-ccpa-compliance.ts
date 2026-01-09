/**
 * GDPR/CCPA Compliance Tools
 * 
 * Privacy compliance framework for GDPR (EU) and CCPA (California).
 * Handles data subject rights, consent management, and privacy assessments.
 * 
 * Features:
 * - Data subject request (DSR) handling
 * - Consent management
 * - Data inventory and mapping
 * - Privacy impact assessments
 * - Breach notification tracking
 * - Cookie consent management
 * 
 * @example
 * ```typescript
 * import { privacyCompliance } from './gdpr-ccpa-compliance';
 * 
 * // Handle data subject access request
 * await privacyCompliance.handleDSR({
 *   type: 'access',
 *   subjectId: 'user-123',
 *   regulation: 'GDPR',
 * });
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export type Regulation = 'GDPR' | 'CCPA' | 'CPRA' | 'VCDPA' | 'CPA' | 'CTDPA';

export type DSRType =
    | 'access'     // Right to access
    | 'rectification' // Right to rectification
    | 'erasure'    // Right to erasure (GDPR) / Right to delete (CCPA)
    | 'portability' // Right to data portability
    | 'restriction' // Right to restrict processing
    | 'objection'  // Right to object
    | 'opt_out'    // Opt-out of sale (CCPA)
    | 'know';      // Right to know (CCPA)

export interface DataSubjectRequest {
    id: string;
    type: DSRType;
    regulation: Regulation;
    subjectId: string;
    subjectEmail?: string;
    subjectName?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'rejected';
    requestDate: Date;
    dueDate: Date;
    completedDate?: Date;
    notes?: string;
    verificationMethod?: string;
    verifiedAt?: Date;
}

export interface ConsentRecord {
    id: string;
    subjectId: string;
    purpose: string;
    granted: boolean;
    timestamp: Date;
    source: string;
    regulation: Regulation;
    expiresAt?: Date;
    withdrawnAt?: Date;
}

export interface DataCategory {
    id: string;
    name: string;
    description: string;
    personalData: boolean;
    sensitiveData: boolean;
    lawfulBasis?: string;
    retentionPeriod?: string;
    thirdPartySharing: boolean;
    crossBorderTransfer: boolean;
}

export interface ProcessingActivity {
    id: string;
    name: string;
    description: string;
    purposes: string[];
    dataCategories: string[];
    dataSubjects: string[];
    lawfulBasis: string;
    recipients?: string[];
    thirdCountryTransfers?: string[];
    retentionPeriod: string;
    securityMeasures: string[];
    dpia?: PrivacyImpactAssessment;
}

export interface PrivacyImpactAssessment {
    id: string;
    processingActivityId: string;
    status: 'draft' | 'in_review' | 'approved' | 'rejected';
    createdAt: Date;
    approvedAt?: Date;
    assessor: string;
    risksIdentified: PrivacyRisk[];
    mitigations: string[];
    decision: string;
}

export interface PrivacyRisk {
    id: string;
    title: string;
    description: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    overallRisk: 'low' | 'medium' | 'high';
    mitigation?: string;
}

export interface DataBreach {
    id: string;
    discoveredAt: Date;
    occurredAt?: Date;
    reportedAt?: Date;
    description: string;
    affectedRecords: number;
    dataCategories: string[];
    causedBy: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    notificationRequired: boolean;
    notifiedAuthority?: boolean;
    notifiedSubjects?: boolean;
    status: 'investigating' | 'contained' | 'remediated' | 'closed';
    remediation?: string;
}

// ============================================================================
// DSR RESPONSE TEMPLATES
// ============================================================================

const DSR_DEADLINES: Record<Regulation, number> = {
    'GDPR': 30,    // 30 days
    'CCPA': 45,    // 45 days
    'CPRA': 45,    // 45 days
    'VCDPA': 45,   // 45 days
    'CPA': 45,     // 45 days
    'CTDPA': 45,   // 45 days
};

const LAWFUL_BASIS_OPTIONS = [
    'consent',
    'contract',
    'legal_obligation',
    'vital_interests',
    'public_task',
    'legitimate_interests',
] as const;

// ============================================================================
// PRIVACY COMPLIANCE SERVICE
// ============================================================================

export class PrivacyComplianceService {
    private dsrRequests: Map<string, DataSubjectRequest> = new Map();
    private consents: Map<string, ConsentRecord[]> = new Map();
    private dataCategories: Map<string, DataCategory> = new Map();
    private processingActivities: Map<string, ProcessingActivity> = new Map();
    private breaches: Map<string, DataBreach> = new Map();

    /**
     * Handle a data subject request
     */
    async handleDSR(request: Omit<DataSubjectRequest, 'id' | 'status' | 'requestDate' | 'dueDate'>): Promise<DataSubjectRequest> {
        const id = crypto.randomUUID();
        const requestDate = new Date();
        const deadlineDays = DSR_DEADLINES[request.regulation];
        const dueDate = new Date(requestDate.getTime() + deadlineDays * 24 * 60 * 60 * 1000);

        const dsr: DataSubjectRequest = {
            id,
            ...request,
            status: 'pending',
            requestDate,
            dueDate,
        };

        this.dsrRequests.set(id, dsr);
        return dsr;
    }

    /**
     * Update DSR status
     */
    async updateDSR(id: string, update: Partial<DataSubjectRequest>): Promise<DataSubjectRequest | undefined> {
        const dsr = this.dsrRequests.get(id);
        if (dsr) {
            Object.assign(dsr, update);
            if (update.status === 'completed') {
                dsr.completedDate = new Date();
            }
        }
        return dsr;
    }

    /**
     * Get DSRs by status
     */
    getDSRs(status?: DataSubjectRequest['status']): DataSubjectRequest[] {
        const all = Array.from(this.dsrRequests.values());
        return status ? all.filter(d => d.status === status) : all;
    }

    /**
     * Get overdue DSRs
     */
    getOverdueDSRs(): DataSubjectRequest[] {
        const now = new Date();
        return Array.from(this.dsrRequests.values())
            .filter(d => d.status !== 'completed' && d.status !== 'rejected' && d.dueDate < now);
    }

    /**
     * Record consent
     */
    async recordConsent(consent: Omit<ConsentRecord, 'id' | 'timestamp'>): Promise<ConsentRecord> {
        const record: ConsentRecord = {
            id: crypto.randomUUID(),
            ...consent,
            timestamp: new Date(),
        };

        const existing = this.consents.get(consent.subjectId) ?? [];
        existing.push(record);
        this.consents.set(consent.subjectId, existing);

        return record;
    }

    /**
     * Withdraw consent
     */
    async withdrawConsent(subjectId: string, purpose: string): Promise<void> {
        const consents = this.consents.get(subjectId) ?? [];
        for (const consent of consents) {
            if (consent.purpose === purpose && consent.granted && !consent.withdrawnAt) {
                consent.withdrawnAt = new Date();
            }
        }
    }

    /**
     * Check consent status
     */
    hasConsent(subjectId: string, purpose: string): boolean {
        const consents = this.consents.get(subjectId) ?? [];
        const latest = consents
            .filter(c => c.purpose === purpose)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

        return !!latest && latest.granted && !latest.withdrawnAt;
    }

    /**
     * Get consent history
     */
    getConsentHistory(subjectId: string): ConsentRecord[] {
        return this.consents.get(subjectId) ?? [];
    }

    /**
     * Register data category
     */
    registerDataCategory(category: Omit<DataCategory, 'id'>): DataCategory {
        const full: DataCategory = {
            id: crypto.randomUUID(),
            ...category,
        };
        this.dataCategories.set(full.id, full);
        return full;
    }

    /**
     * Register processing activity
     */
    registerProcessingActivity(activity: Omit<ProcessingActivity, 'id'>): ProcessingActivity {
        const full: ProcessingActivity = {
            id: crypto.randomUUID(),
            ...activity,
        };
        this.processingActivities.set(full.id, full);
        return full;
    }

    /**
     * Get data inventory
     */
    getDataInventory(): DataCategory[] {
        return Array.from(this.dataCategories.values());
    }

    /**
     * Get processing activities (RoPA)
     */
    getProcessingActivities(): ProcessingActivity[] {
        return Array.from(this.processingActivities.values());
    }

    /**
     * Report a data breach
     */
    async reportBreach(breach: Omit<DataBreach, 'id'>): Promise<DataBreach> {
        const full: DataBreach = {
            id: crypto.randomUUID(),
            ...breach,
        };
        this.breaches.set(full.id, full);
        return full;
    }

    /**
     * Get breach notification deadline (GDPR: 72 hours)
     */
    getBreachNotificationDeadline(breachId: string): Date | undefined {
        const breach = this.breaches.get(breachId);
        if (!breach) return undefined;
        return new Date(breach.discoveredAt.getTime() + 72 * 60 * 60 * 1000);
    }

    /**
     * Generate CCPA disclosure
     */
    generateCCPADisclosure(subjectId: string): {
        categoriesCollected: string[];
        sourcesOfData: string[];
        businessPurposes: string[];
        thirdPartySharing: string[];
        dataRetention: string;
    } {
        const categories = Array.from(this.dataCategories.values())
            .filter(c => c.personalData)
            .map(c => c.name);

        const activities = Array.from(this.processingActivities.values());

        return {
            categoriesCollected: categories,
            sourcesOfData: ['Direct collection', 'Automatic collection', 'Third parties'],
            businessPurposes: [...new Set(activities.flatMap(a => a.purposes))],
            thirdPartySharing: [...new Set(activities.flatMap(a => a.recipients ?? []))],
            dataRetention: 'Data is retained according to our retention policy',
        };
    }

    /**
     * Get compliance dashboard metrics
     */
    getMetrics(): {
        dsrPending: number;
        dsrOverdue: number;
        breachesOpen: number;
        consentRate: number;
    } {
        const dsrs = Array.from(this.dsrRequests.values());
        const overdue = this.getOverdueDSRs();
        const breaches = Array.from(this.breaches.values()).filter(b => b.status !== 'closed');

        const allConsents = Array.from(this.consents.values()).flat();
        const granted = allConsents.filter(c => c.granted && !c.withdrawnAt).length;

        return {
            dsrPending: dsrs.filter(d => d.status === 'pending' || d.status === 'in_progress').length,
            dsrOverdue: overdue.length,
            breachesOpen: breaches.length,
            consentRate: allConsents.length > 0 ? Math.round((granted / allConsents.length) * 100) : 0,
        };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const privacyCompliance = new PrivacyComplianceService();

export function createPrivacyComplianceService(): PrivacyComplianceService {
    return new PrivacyComplianceService();
}
