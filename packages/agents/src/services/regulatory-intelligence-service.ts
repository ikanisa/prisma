/**
 * Regulatory Intelligence Service
 * 
 * Monitors regulatory changes across Malta, Canada, and Rwanda tax authorities.
 * Provides change detection, impact analysis, and compliance recommendations.
 * 
 * Data Sources:
 * - Malta: CFR (Commissioner for Revenue), MaltaCIA
 * - Canada: CRA (Canada Revenue Agency), Finance Canada
 * - Rwanda: RRA (Rwanda Revenue Authority), ICPAR
 */

// ============================================================================
// TYPES
// ============================================================================

export type JurisdictionCode = 'MT' | 'CA' | 'RW';

export interface RegulatoryUpdate {
    id: string;
    jurisdiction: JurisdictionCode;
    source: RegulatorySource;
    category: RegulatoryCategory;
    title: string;
    summary: string;
    effectiveDate?: Date;
    publishedDate: Date;
    url?: string;
    impactLevel: 'low' | 'medium' | 'high' | 'critical';
    affectedAreas: string[];
    actionRequired?: string;
    status: 'draft' | 'final' | 'enacted';
}

export type RegulatorySource =
    | 'CFR_Malta'
    | 'MaltaCIA'
    | 'EU_Official_Journal'
    | 'CRA_Canada'
    | 'Finance_Canada'
    | 'RRA_Rwanda'
    | 'ICPAR'
    | 'EAC';

export type RegulatoryCategory =
    | 'vat_gst'
    | 'corporate_tax'
    | 'transfer_pricing'
    | 'withholding'
    | 'reporting'
    | 'compliance'
    | 'audit_standards'
    | 'digital_tax'
    | 'invoicing';

export interface RegulatoryAlert {
    id: string;
    updateId: string;
    jurisdiction: JurisdictionCode;
    alertType: 'new_regulation' | 'rate_change' | 'deadline_change' | 'form_update' | 'procedure_change';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    title: string;
    message: string;
    actionItems: string[];
    dueDate?: Date;
    createdAt: Date;
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
}

export interface ComplianceImpactAnalysis {
    updateId: string;
    jurisdiction: JurisdictionCode;
    systemsAffected: string[];
    processesAffected: string[];
    estimatedEffort: 'minimal' | 'moderate' | 'significant' | 'major';
    recommendations: string[];
    timeline: string;
    riskIfNotAddressed: string;
}

// ============================================================================
// REGULATORY KNOWLEDGE BASE
// ============================================================================

interface RegulatoryAuthority {
    jurisdiction: JurisdictionCode;
    name: string;
    code: string;
    website: string;
    updateFrequency: string;
    keyPublications: string[];
}

const REGULATORY_AUTHORITIES: RegulatoryAuthority[] = [
    // Malta
    {
        jurisdiction: 'MT',
        name: 'Commissioner for Revenue',
        code: 'CFR',
        website: 'https://cfr.gov.mt',
        updateFrequency: 'Weekly',
        keyPublications: ['Guidelines', 'Legal Notices', 'Circulars', 'Budget Updates'],
    },
    {
        jurisdiction: 'MT',
        name: 'Malta Institute of Accountants',
        code: 'MIA',
        website: 'https://miamalta.org',
        updateFrequency: 'Monthly',
        keyPublications: ['Technical Releases', 'Practice Notes', 'CPD Updates'],
    },
    // Canada
    {
        jurisdiction: 'CA',
        name: 'Canada Revenue Agency',
        code: 'CRA',
        website: 'https://www.canada.ca/en/revenue-agency.html',
        updateFrequency: 'Continuous',
        keyPublications: ['GST/HST Technical Information', 'Income Tax Information Circulars', 'News Releases'],
    },
    {
        jurisdiction: 'CA',
        name: 'Department of Finance Canada',
        code: 'FIN',
        website: 'https://www.canada.ca/en/department-finance.html',
        updateFrequency: 'As needed',
        keyPublications: ['Budget Documents', 'Economic Updates', 'Tax Policy Consultations'],
    },
    // Rwanda
    {
        jurisdiction: 'RW',
        name: 'Rwanda Revenue Authority',
        code: 'RRA',
        website: 'https://www.rra.gov.rw',
        updateFrequency: 'Monthly',
        keyPublications: ['Tax Updates', 'Ministerial Orders', 'Taxpayer Guidelines', 'EBM Updates'],
    },
    {
        jurisdiction: 'RW',
        name: 'Institute of Certified Public Accountants of Rwanda',
        code: 'ICPAR',
        website: 'https://icparwanda.com',
        updateFrequency: 'Quarterly',
        keyPublications: ['Practice Standards', 'Ethics Updates', 'CPD Requirements'],
    },
];

// Key regulatory dates and thresholds that may change
const CURRENT_REGULATORY_PARAMETERS: Record<JurisdictionCode, Record<string, unknown>> = {
    MT: {
        vatStandardRate: 18,
        vatReducedRates: [12, 7, 5, 0],
        article10Threshold: 35000,
        article11Threshold: 30000,
        article11AEUWide: 100000,
        intrastatThreshold: 700,
        corporateTaxRate: 35,
        effectiveTaxRate: 5,  // With refund system
        lastUpdated: '2024-01-01',
    },
    CA: {
        gstRate: 5,
        hstRates: { ON: 13, NS: 15, NB: 15, NL: 15, PE: 15 },
        pstRates: { BC: 7, SK: 6, MB: 7 },
        qstRate: 9.975,
        gstRegistrationThreshold: 30000,
        federalCorporateRate: 15,
        smallBusinessDeduction: 9,
        lastUpdated: '2024-01-01',
    },
    RW: {
        vatRate: 18,
        vatRegistrationAnnual: 20000000,
        vatRegistrationQuarterly: 5000000,
        corporateTaxRate: 30,
        withholdingTaxServices: 15,
        digitalServicesTax: 1.5,
        tourismLevy: 3,
        lastUpdated: '2024-01-01',
    },
};

// ============================================================================
// SAMPLE REGULATORY UPDATES (demonstrative)
// ============================================================================

const SAMPLE_UPDATES: RegulatoryUpdate[] = [
    {
        id: 'update-mt-2024-001',
        jurisdiction: 'MT',
        source: 'CFR_Malta',
        category: 'vat_gst',
        title: 'ViDA (VAT in the Digital Age) Implementation Timeline',
        summary: 'EU Commission published updated timeline for ViDA implementation affecting e-invoicing and platform economy reporting',
        effectiveDate: new Date('2028-01-01'),
        publishedDate: new Date('2024-11-15'),
        url: 'https://taxation-customs.ec.europa.eu/vida_en',
        impactLevel: 'high',
        affectedAreas: ['E-invoicing', 'Platform reporting', 'VAT returns'],
        actionRequired: 'Prepare systems for mandatory e-invoicing by 2028',
        status: 'draft',
    },
    {
        id: 'update-ca-2024-001',
        jurisdiction: 'CA',
        source: 'CRA_Canada',
        category: 'digital_tax',
        title: 'Digital Services Tax Update',
        summary: 'Canada DST implementation details for large digital corporations',
        effectiveDate: new Date('2024-01-01'),
        publishedDate: new Date('2024-06-01'),
        impactLevel: 'medium',
        affectedAreas: ['Digital services', 'Online platforms', 'Digital advertising'],
        actionRequired: 'Review DST applicability for annual revenue over $20M CAD',
        status: 'enacted',
    },
    {
        id: 'update-rw-2024-001',
        jurisdiction: 'RW',
        source: 'RRA_Rwanda',
        category: 'invoicing',
        title: 'EBM 2.0 Mandatory Upgrade',
        summary: 'All EBM devices must be upgraded to version 2.0 with enhanced reporting capabilities',
        effectiveDate: new Date('2025-01-01'),
        publishedDate: new Date('2024-07-01'),
        impactLevel: 'critical',
        affectedAreas: ['Point of sale', 'Invoice generation', 'RRA reporting'],
        actionRequired: 'Coordinate EBM device upgrade with RRA-certified vendors',
        status: 'final',
    },
];

// ============================================================================
// REGULATORY INTELLIGENCE SERVICE
// ============================================================================

export interface RegulatoryIntelligenceConfig {
    organizationId?: string;
    userId?: string;
    watchJurisdictions?: JurisdictionCode[];
    alertPriorities?: ('low' | 'medium' | 'high' | 'urgent')[];
}

export class RegulatoryIntelligenceService {
    private updates: RegulatoryUpdate[] = [...SAMPLE_UPDATES];
    private alerts: RegulatoryAlert[] = [];

    constructor(private config: RegulatoryIntelligenceConfig = {}) {
        // Initialize with default jurisdictions if not specified
        if (!config.watchJurisdictions) {
            this.config.watchJurisdictions = ['MT', 'CA', 'RW'];
        }
    }

    /**
     * Get all regulatory updates for watched jurisdictions
     */
    getUpdates(options?: {
        jurisdiction?: JurisdictionCode;
        category?: RegulatoryCategory;
        since?: Date;
        impactLevel?: ('low' | 'medium' | 'high' | 'critical')[];
    }): RegulatoryUpdate[] {
        let results = this.updates.filter(u =>
            this.config.watchJurisdictions?.includes(u.jurisdiction)
        );

        if (options?.jurisdiction) {
            results = results.filter(u => u.jurisdiction === options.jurisdiction);
        }
        if (options?.category) {
            results = results.filter(u => u.category === options.category);
        }
        if (options?.since) {
            results = results.filter(u => u.publishedDate >= options.since);
        }
        if (options?.impactLevel) {
            results = results.filter(u => options.impactLevel?.includes(u.impactLevel));
        }

        return results.sort((a, b) => b.publishedDate.getTime() - a.publishedDate.getTime());
    }

    /**
     * Get current regulatory parameters for a jurisdiction
     */
    getCurrentParameters(jurisdiction: JurisdictionCode): Record<string, unknown> {
        return CURRENT_REGULATORY_PARAMETERS[jurisdiction] || {};
    }

    /**
     * Get regulatory authorities for a jurisdiction
     */
    getAuthorities(jurisdiction?: JurisdictionCode): RegulatoryAuthority[] {
        if (jurisdiction) {
            return REGULATORY_AUTHORITIES.filter(a => a.jurisdiction === jurisdiction);
        }
        return REGULATORY_AUTHORITIES;
    }

    /**
     * Analyze impact of a regulatory update
     */
    analyzeImpact(updateId: string): ComplianceImpactAnalysis | null {
        const update = this.updates.find(u => u.id === updateId);
        if (!update) return null;

        // Generate impact analysis based on update characteristics
        const analysis: ComplianceImpactAnalysis = {
            updateId,
            jurisdiction: update.jurisdiction,
            systemsAffected: this.identifyAffectedSystems(update),
            processesAffected: update.affectedAreas,
            estimatedEffort: this.estimateEffort(update),
            recommendations: this.generateRecommendations(update),
            timeline: this.suggestTimeline(update),
            riskIfNotAddressed: this.assessRisk(update),
        };

        return analysis;
    }

    /**
     * Create alert from regulatory update
     */
    createAlert(updateId: string): RegulatoryAlert | null {
        const update = this.updates.find(u => u.id === updateId);
        if (!update) return null;

        const alert: RegulatoryAlert = {
            id: `alert-${Date.now()}`,
            updateId,
            jurisdiction: update.jurisdiction,
            alertType: this.categorizeAlertType(update),
            priority: this.determinePriority(update),
            title: update.title,
            message: update.summary,
            actionItems: update.actionRequired ? [update.actionRequired] : [],
            dueDate: update.effectiveDate,
            createdAt: new Date(),
            acknowledged: false,
        };

        this.alerts.push(alert);
        return alert;
    }

    /**
     * Get active alerts
     */
    getAlerts(jurisdiction?: JurisdictionCode): RegulatoryAlert[] {
        let results = this.alerts;
        if (jurisdiction) {
            results = results.filter(a => a.jurisdiction === jurisdiction);
        }
        return results.sort((a, b) => {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string, userId: string): boolean {
        const alert = this.alerts.find(a => a.id === alertId);
        if (!alert) return false;

        alert.acknowledged = true;
        alert.acknowledgedBy = userId;
        alert.acknowledgedAt = new Date();
        return true;
    }

    /**
     * Check for upcoming deadlines
     */
    getUpcomingDeadlines(daysAhead: number = 30): { update: RegulatoryUpdate; daysUntil: number }[] {
        const now = new Date();
        const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

        return this.updates
            .filter(u => u.effectiveDate && u.effectiveDate > now && u.effectiveDate <= cutoff)
            .map(u => ({
                update: u,
                daysUntil: Math.ceil((u.effectiveDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            }))
            .sort((a, b) => a.daysUntil - b.daysUntil);
    }

    /**
     * Generate jurisdiction-specific compliance checklist
     */
    generateComplianceChecklist(jurisdiction: JurisdictionCode): {
        category: string;
        items: { item: string; frequency: string; lastUpdate: string }[];
    }[] {
        const checklists: Record<JurisdictionCode, { category: string; items: { item: string; frequency: string; lastUpdate: string }[] }[]> = {
            MT: [
                {
                    category: 'VAT Compliance',
                    items: [
                        { item: 'VAT return filing', frequency: 'Quarterly', lastUpdate: 'By 15th of 2nd month after quarter' },
                        { item: 'EC Sales List', frequency: 'Monthly/Quarterly', lastUpdate: 'Monthly for >€50K quarterly threshold' },
                        { item: 'Intrastat Declaration', frequency: 'Monthly', lastUpdate: 'If EU trade exceeds €700' },
                        { item: 'Article 11 threshold check', frequency: 'Ongoing', lastUpdate: 'Monitor €30K domestic threshold' },
                    ],
                },
                {
                    category: 'Corporate Tax',
                    items: [
                        { item: 'Annual tax return', frequency: 'Annual', lastUpdate: '31 March following year-end' },
                        { item: 'Provisional tax payments', frequency: 'Quarterly', lastUpdate: '30 Apr, 31 Aug, 21 Dec' },
                        { item: 'Group consolidation review', frequency: 'Annual', lastUpdate: 'Before year-end' },
                    ],
                },
            ],
            CA: [
                {
                    category: 'GST/HST Compliance',
                    items: [
                        { item: 'GST/HST return', frequency: 'Annual/Quarterly/Monthly', lastUpdate: 'Based on revenue thresholds' },
                        { item: 'ITC documentation review', frequency: 'Ongoing', lastUpdate: 'Ensure complete documentation' },
                        { item: 'Provincial nexus assessment', frequency: 'Quarterly', lastUpdate: 'Review new province activity' },
                        { item: 'Indigenous exemption tracking', frequency: 'Ongoing', lastUpdate: 'Document all exempt sales' },
                    ],
                },
                {
                    category: 'Corporate Tax',
                    items: [
                        { item: 'T2 Corporate return', frequency: 'Annual', lastUpdate: '6 months after year-end' },
                        { item: 'Installment payments', frequency: 'Monthly/Quarterly', lastUpdate: 'Based on prior year tax' },
                        { item: 'SR&ED claim preparation', frequency: 'Annual', lastUpdate: '18 months after year-end' },
                    ],
                },
            ],
            RW: [
                {
                    category: 'VAT Compliance',
                    items: [
                        { item: 'Monthly VAT return', frequency: 'Monthly', lastUpdate: 'By 15th of following month' },
                        { item: 'EBM reconciliation', frequency: 'Daily', lastUpdate: 'Sync all invoices to RRA' },
                        { item: 'EBM device maintenance', frequency: 'Ongoing', lastUpdate: 'Ensure device connectivity' },
                        { item: 'Withholding tax remittance', frequency: 'Monthly', lastUpdate: 'By 15th of following month' },
                    ],
                },
                {
                    category: 'Corporate Tax',
                    items: [
                        { item: 'Annual CIT return', frequency: 'Annual', lastUpdate: '31 March following year-end' },
                        { item: 'Quarterly installments', frequency: 'Quarterly', lastUpdate: '25% of prior year tax each quarter' },
                        { item: 'PAYE remittance', frequency: 'Monthly', lastUpdate: 'By 15th of following month' },
                    ],
                },
            ],
        };

        return checklists[jurisdiction] || [];
    }

    // Helper methods
    private identifyAffectedSystems(update: RegulatoryUpdate): string[] {
        const systemMap: Record<RegulatoryCategory, string[]> = {
            vat_gst: ['Tax engine', 'Invoice system', 'Reporting module'],
            corporate_tax: ['Tax calculation', 'Financial reporting'],
            transfer_pricing: ['Intercompany transactions', 'Documentation system'],
            withholding: ['Payment processing', 'Tax withholding module'],
            reporting: ['Reporting module', 'Data warehouse'],
            compliance: ['Compliance monitoring', 'Alert system'],
            audit_standards: ['Audit workpapers', 'Quality control'],
            digital_tax: ['E-commerce platform', 'Tax engine'],
            invoicing: ['Invoice system', 'EBM integration'],
        };
        return systemMap[update.category] || ['General systems'];
    }

    private estimateEffort(update: RegulatoryUpdate): ComplianceImpactAnalysis['estimatedEffort'] {
        if (update.impactLevel === 'critical') return 'major';
        if (update.impactLevel === 'high') return 'significant';
        if (update.impactLevel === 'medium') return 'moderate';
        return 'minimal';
    }

    private generateRecommendations(update: RegulatoryUpdate): string[] {
        const recommendations: string[] = [];

        recommendations.push(`Review ${update.title} details on ${update.source} website`);

        if (update.effectiveDate) {
            recommendations.push(`Plan implementation before ${update.effectiveDate.toISOString().split('T')[0]}`);
        }

        if (update.actionRequired) {
            recommendations.push(update.actionRequired);
        }

        recommendations.push('Update relevant internal procedures and documentation');
        recommendations.push('Communicate changes to affected team members');

        return recommendations;
    }

    private suggestTimeline(update: RegulatoryUpdate): string {
        if (!update.effectiveDate) return 'Review and assess as soon as practical';

        const now = new Date();
        const daysUntil = Math.ceil((update.effectiveDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        if (daysUntil < 30) return 'Immediate action required - less than 30 days';
        if (daysUntil < 90) return 'Short-term planning needed - within 90 days';
        if (daysUntil < 180) return 'Medium-term implementation - within 6 months';
        return 'Long-term preparation - plan over next 12+ months';
    }

    private assessRisk(update: RegulatoryUpdate): string {
        const risks: Record<string, string> = {
            critical: 'Non-compliance may result in significant penalties, license revocation, or legal action',
            high: 'May result in substantial fines, increased audit scrutiny, or reputational damage',
            medium: 'Could lead to minor penalties or additional compliance burden',
            low: 'Minimal risk - primarily administrative adjustments required',
        };
        return risks[update.impactLevel];
    }

    private categorizeAlertType(update: RegulatoryUpdate): RegulatoryAlert['alertType'] {
        if (update.category === 'vat_gst' && update.summary.toLowerCase().includes('rate')) {
            return 'rate_change';
        }
        if (update.category === 'reporting') {
            return 'deadline_change';
        }
        if (update.category === 'invoicing') {
            return 'form_update';
        }
        if (update.status === 'enacted') {
            return 'new_regulation';
        }
        return 'procedure_change';
    }

    private determinePriority(update: RegulatoryUpdate): RegulatoryAlert['priority'] {
        if (update.impactLevel === 'critical') return 'urgent';
        if (update.impactLevel === 'high') return 'high';
        if (update.impactLevel === 'medium') return 'medium';
        return 'low';
    }
}

// Factory function
export function createRegulatoryIntelligenceService(
    config?: RegulatoryIntelligenceConfig
): RegulatoryIntelligenceService {
    return new RegulatoryIntelligenceService(config);
}
