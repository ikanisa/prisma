/**
 * Workpaper Automation Agent
 * 
 * Template-driven workpaper generation with dynamic content population,
 * evidence linking, review workflow integration, and formatted exports.
 * 
 * @example
 * ```typescript
 * const agent = new WorkpaperAutomationAgent();
 * 
 * // Generate workpaper
 * const workpaper = await agent.generateWorkpaper({
 *     templateId: 'materiality-calculation',
 *     engagementId: 'eng-123',
 *     data: { revenue: 10000000, assets: 5000000 },
 * });
 * 
 * // Export to PDF
 * const pdf = await agent.exportToPDF(workpaper);
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WorkpaperTemplate {
    id: string;
    name: string;
    category: WorkpaperCategory;
    type: WorkpaperType;
    version: string;

    // Template structure
    sections: TemplateSection[];

    // Required data fields
    requiredFields: TemplateField[];
    optionalFields: TemplateField[];

    // Configuration
    defaultRef?: string;  // e.g., 'A-1' for asset section
    reviewRequired: boolean;
    approvalLevels: ('preparer' | 'reviewer' | 'manager' | 'partner')[];

    // Metadata
    jurisdiction?: string;
    engagementTypes: ('accounting' | 'audit' | 'tax')[];
    createdAt: Date;
    updatedAt: Date;
}

export type WorkpaperCategory =
    | 'planning'
    | 'risk_assessment'
    | 'internal_control'
    | 'substantive'
    | 'completion'
    | 'reporting';

export type WorkpaperType =
    | 'materiality'
    | 'risk_assessment'
    | 'control_testing'
    | 'substantive_testing'
    | 'analytical_review'
    | 'lead_schedule'
    | 'reconciliation'
    | 'confirmation'
    | 'memo'
    | 'checklist'
    | 'other';

export interface TemplateSection {
    id: string;
    title: string;
    order: number;

    // Content
    contentType: 'text' | 'table' | 'calculation' | 'checklist' | 'narrative' | 'evidence_list';
    template: string;  // Handlebars-style template

    // Configuration
    required: boolean;
    conditional?: { field: string; operator: string; value: unknown };
}

export interface TemplateField {
    name: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
    validation?: {
        required?: boolean;
        min?: number;
        max?: number;
        pattern?: string;
    };
    defaultValue?: unknown;
    source?: 'manual' | 'engagement' | 'trial_balance' | 'prior_period' | 'calculated';
    calculation?: string;  // Formula for calculated fields
}

export interface GeneratedWorkpaper {
    id: string;
    templateId: string;
    templateName: string;

    // Engagement context
    engagementId: string;
    clientName?: string;
    periodEnd?: Date;

    // Workpaper info
    ref: string;
    title: string;
    category: WorkpaperCategory;

    // Content
    sections: GeneratedSection[];

    // Data snapshot
    dataSnapshot: Record<string, unknown>;

    // Evidence
    linkedEvidence: EvidenceLink[];
    citations: Citation[];

    // Workflow
    status: 'draft' | 'in_review' | 'reviewed' | 'approved' | 'rejected';
    preparedBy: string;
    preparedAt: Date;
    reviewedBy?: string;
    reviewedAt?: Date;
    reviewNotes?: string;
    approvedBy?: string;
    approvedAt?: Date;

    // Version control
    version: number;
    previousVersionId?: string;
    changeLog: { version: number; date: Date; user: string; changes: string }[];
}

export interface GeneratedSection {
    id: string;
    sectionId: string;
    title: string;
    order: number;
    contentType: TemplateSection['contentType'];
    content: string;  // Rendered content
    isComplete: boolean;
    notes?: string;
}

export interface EvidenceLink {
    evidenceId: string;
    evidenceType: 'document' | 'extraction' | 'confirmation' | 'observation';
    description: string;
    linkedAt: Date;
    linkedBy: string;
}

export interface Citation {
    id: string;
    source: string;
    reference: string;
    text: string;
    pageNumber?: string;
}

export interface GenerationRequest {
    templateId: string;
    engagementId: string;
    data: Record<string, unknown>;
    preparedBy: string;
    ref?: string;
    linkedEvidence?: EvidenceLink[];
    priorPeriodWorkpaperId?: string;
}

export interface ExportOptions {
    format: 'pdf' | 'excel' | 'word' | 'html';
    includeEvidence?: boolean;
    includeVersionHistory?: boolean;
    watermark?: string;
    headerFooter?: { header?: string; footer?: string };
}

// ============================================================================
// WORKPAPER TEMPLATES
// ============================================================================

const BUILT_IN_TEMPLATES: WorkpaperTemplate[] = [
    {
        id: 'tpl-materiality',
        name: 'Materiality Calculation',
        category: 'planning',
        type: 'materiality',
        version: '1.0',
        sections: [
            {
                id: 'sec-1',
                title: 'Objective',
                order: 1,
                contentType: 'text',
                template: 'To determine planning materiality, performance materiality, and trivial threshold for the audit of {{clientName}} for the period ended {{periodEnd}}.',
                required: true,
            },
            {
                id: 'sec-2',
                title: 'Materiality Calculation',
                order: 2,
                contentType: 'calculation',
                template: `
## Overall Materiality

| Benchmark | Amount | Percentage | Materiality |
|-----------|--------|------------|-------------|
| Revenue | {{formatCurrency revenue}} | {{revenuePercent}}% | {{formatCurrency overallMateriality}} |
| Total Assets | {{formatCurrency totalAssets}} | {{assetPercent}}% | {{formatCurrency assetMateriality}} |
| Pre-tax Income | {{formatCurrency preTaxIncome}} | {{incomePercent}}% | {{formatCurrency incomeMateriality}} |

**Selected Benchmark**: {{selectedBenchmark}}
**Overall Materiality**: {{formatCurrency overallMateriality}}

## Performance Materiality
Performance Materiality ({{pmPercent}}% of Overall): {{formatCurrency performanceMateriality}}

## Trivial Threshold
Trivial Threshold ({{trivialPercent}}% of Overall): {{formatCurrency trivialThreshold}}
`,
                required: true,
            },
            {
                id: 'sec-3',
                title: 'Conclusion',
                order: 3,
                contentType: 'narrative',
                template: 'Based on the above analysis, the following materiality levels have been determined:\n\n- **Overall Materiality**: {{formatCurrency overallMateriality}}\n- **Performance Materiality**: {{formatCurrency performanceMateriality}}\n- **Trivial Threshold**: {{formatCurrency trivialThreshold}}\n\nThese amounts are considered appropriate for the audit and are consistent with ISA 320.',
                required: true,
            },
        ],
        requiredFields: [
            { name: 'clientName', label: 'Client Name', type: 'string', validation: { required: true } },
            { name: 'periodEnd', label: 'Period End Date', type: 'date', validation: { required: true } },
            { name: 'revenue', label: 'Revenue', type: 'number', validation: { required: true, min: 0 } },
            { name: 'totalAssets', label: 'Total Assets', type: 'number', validation: { required: true, min: 0 } },
        ],
        optionalFields: [
            { name: 'preTaxIncome', label: 'Pre-tax Income', type: 'number' },
            { name: 'selectedBenchmark', label: 'Selected Benchmark', type: 'string', defaultValue: 'Revenue' },
        ],
        reviewRequired: true,
        approvalLevels: ['preparer', 'manager'],
        engagementTypes: ['audit'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    },
    {
        id: 'tpl-risk-assessment',
        name: 'Risk Assessment Summary',
        category: 'risk_assessment',
        type: 'risk_assessment',
        version: '1.0',
        sections: [
            {
                id: 'sec-1',
                title: 'Objective',
                order: 1,
                contentType: 'text',
                template: 'To identify and assess the risks of material misstatement in accordance with ISA 315 for the audit of {{clientName}}.',
                required: true,
            },
            {
                id: 'sec-2',
                title: 'Entity-Level Risks',
                order: 2,
                contentType: 'table',
                template: `
| Risk | Description | Likelihood | Impact | Overall Assessment |
|------|-------------|------------|--------|---------------------|
{{#each entityRisks}}
| {{name}} | {{description}} | {{likelihood}} | {{impact}} | {{assessment}} |
{{/each}}
`,
                required: true,
            },
            {
                id: 'sec-3',
                title: 'Account-Level Risks',
                order: 3,
                contentType: 'table',
                template: `
| Account | Assertion | Risk Description | Inherent Risk | Control Risk | Risk of Material Misstatement |
|---------|-----------|------------------|---------------|--------------|-------------------------------|
{{#each accountRisks}}
| {{account}} | {{assertion}} | {{description}} | {{inherentRisk}} | {{controlRisk}} | {{rmmLevel}} |
{{/each}}
`,
                required: true,
            },
            {
                id: 'sec-4',
                title: 'Significant Risks',
                order: 4,
                contentType: 'narrative',
                template: `
## Identified Significant Risks

{{#each significantRisks}}
### {{name}}

**Description**: {{description}}

**Response**: {{response}}

**Related Assertions**: {{assertions}}

---
{{/each}}
`,
                required: true,
            },
        ],
        requiredFields: [
            { name: 'clientName', label: 'Client Name', type: 'string', validation: { required: true } },
            { name: 'entityRisks', label: 'Entity-Level Risks', type: 'array', validation: { required: true } },
            { name: 'accountRisks', label: 'Account-Level Risks', type: 'array', validation: { required: true } },
        ],
        optionalFields: [
            { name: 'significantRisks', label: 'Significant Risks', type: 'array' },
        ],
        reviewRequired: true,
        approvalLevels: ['preparer', 'manager', 'partner'],
        engagementTypes: ['audit'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    },
    {
        id: 'tpl-analytical-review',
        name: 'Analytical Review',
        category: 'substantive',
        type: 'analytical_review',
        version: '1.0',
        sections: [
            {
                id: 'sec-1',
                title: 'Objective',
                order: 1,
                contentType: 'text',
                template: 'To perform substantive analytical procedures on {{accountName}} for the period ended {{periodEnd}}.',
                required: true,
            },
            {
                id: 'sec-2',
                title: 'Year-over-Year Comparison',
                order: 2,
                contentType: 'table',
                template: `
| Account | Current Year | Prior Year | Variance | Variance % |
|---------|-------------|------------|----------|------------|
{{#each accountBalances}}
| {{name}} | {{formatCurrency currentYear}} | {{formatCurrency priorYear}} | {{formatCurrency variance}} | {{variancePercent}}% |
{{/each}}
`,
                required: true,
            },
            {
                id: 'sec-3',
                title: 'Explanation of Significant Variances',
                order: 3,
                contentType: 'narrative',
                template: `
{{#each significantVariances}}
### {{accountName}} ({{variancePercent}}% variance)

**Explanation**: {{explanation}}

**Corroborating Evidence**: {{evidence}}

**Conclusion**: {{conclusion}}

---
{{/each}}
`,
                required: true,
            },
        ],
        requiredFields: [
            { name: 'accountName', label: 'Account Name', type: 'string', validation: { required: true } },
            { name: 'periodEnd', label: 'Period End', type: 'date', validation: { required: true } },
            { name: 'accountBalances', label: 'Account Balances', type: 'array', validation: { required: true } },
        ],
        optionalFields: [
            { name: 'significantVariances', label: 'Significant Variances', type: 'array' },
        ],
        reviewRequired: true,
        approvalLevels: ['preparer', 'reviewer'],
        engagementTypes: ['audit'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    },
];

// ============================================================================
// WORKPAPER AUTOMATION AGENT
// ============================================================================

export interface WorkpaperAutomationConfig {
    customTemplates?: WorkpaperTemplate[];
    defaultCurrency?: string;
    dateFormat?: string;
}

export class WorkpaperAutomationAgent {
    private config: WorkpaperAutomationConfig;
    private templates: Map<string, WorkpaperTemplate> = new Map();
    private workpapers: Map<string, GeneratedWorkpaper> = new Map();

    constructor(config: WorkpaperAutomationConfig = {}) {
        this.config = {
            defaultCurrency: 'USD',
            dateFormat: 'YYYY-MM-DD',
            ...config,
        };

        // Load built-in templates
        for (const template of BUILT_IN_TEMPLATES) {
            this.templates.set(template.id, template);
        }

        // Load custom templates
        if (config.customTemplates) {
            for (const template of config.customTemplates) {
                this.templates.set(template.id, template);
            }
        }
    }

    /**
     * Generate workpaper from template
     */
    async generateWorkpaper(request: GenerationRequest): Promise<GeneratedWorkpaper> {
        const template = this.templates.get(request.templateId);
        if (!template) {
            throw new Error(`Template not found: ${request.templateId}`);
        }

        // Validate required fields
        this.validateFields(template, request.data);

        // Calculate derived fields
        const enrichedData = this.enrichData(template, request.data);

        // Generate sections
        const sections = this.generateSections(template, enrichedData);

        // Create workpaper
        const workpaper: GeneratedWorkpaper = {
            id: crypto.randomUUID(),
            templateId: template.id,
            templateName: template.name,
            engagementId: request.engagementId,
            clientName: request.data.clientName as string,
            periodEnd: request.data.periodEnd as Date,
            ref: request.ref ?? template.defaultRef ?? this.generateRef(template.category),
            title: template.name,
            category: template.category,
            sections,
            dataSnapshot: enrichedData,
            linkedEvidence: request.linkedEvidence ?? [],
            citations: [],
            status: 'draft',
            preparedBy: request.preparedBy,
            preparedAt: new Date(),
            version: 1,
            changeLog: [{
                version: 1,
                date: new Date(),
                user: request.preparedBy,
                changes: 'Initial creation',
            }],
        };

        // Store workpaper
        this.workpapers.set(workpaper.id, workpaper);

        return workpaper;
    }

    /**
     * Update workpaper content
     */
    updateWorkpaper(
        workpaperId: string,
        updates: Partial<Pick<GeneratedWorkpaper, 'sections' | 'linkedEvidence' | 'citations'>>,
        userId: string
    ): GeneratedWorkpaper {
        const workpaper = this.workpapers.get(workpaperId);
        if (!workpaper) {
            throw new Error(`Workpaper not found: ${workpaperId}`);
        }

        // Create new version
        workpaper.version++;
        workpaper.changeLog.push({
            version: workpaper.version,
            date: new Date(),
            user: userId,
            changes: 'Content updated',
        });

        // Apply updates
        if (updates.sections) {
            workpaper.sections = updates.sections;
        }
        if (updates.linkedEvidence) {
            workpaper.linkedEvidence = updates.linkedEvidence;
        }
        if (updates.citations) {
            workpaper.citations = updates.citations;
        }

        return workpaper;
    }

    /**
     * Submit workpaper for review
     */
    submitForReview(workpaperId: string): GeneratedWorkpaper {
        const workpaper = this.workpapers.get(workpaperId);
        if (!workpaper) {
            throw new Error(`Workpaper not found: ${workpaperId}`);
        }

        workpaper.status = 'in_review';
        return workpaper;
    }

    /**
     * Review workpaper
     */
    reviewWorkpaper(
        workpaperId: string,
        reviewerId: string,
        decision: 'approve' | 'reject',
        notes?: string
    ): GeneratedWorkpaper {
        const workpaper = this.workpapers.get(workpaperId);
        if (!workpaper) {
            throw new Error(`Workpaper not found: ${workpaperId}`);
        }

        workpaper.reviewedBy = reviewerId;
        workpaper.reviewedAt = new Date();
        workpaper.reviewNotes = notes;

        if (decision === 'approve') {
            workpaper.status = 'reviewed';
        } else {
            workpaper.status = 'rejected';
        }

        workpaper.changeLog.push({
            version: workpaper.version,
            date: new Date(),
            user: reviewerId,
            changes: decision === 'approve' ? 'Reviewed and approved' : `Rejected: ${notes}`,
        });

        return workpaper;
    }

    /**
     * Approve workpaper (final)
     */
    approveWorkpaper(workpaperId: string, approverId: string): GeneratedWorkpaper {
        const workpaper = this.workpapers.get(workpaperId);
        if (!workpaper) {
            throw new Error(`Workpaper not found: ${workpaperId}`);
        }

        workpaper.approvedBy = approverId;
        workpaper.approvedAt = new Date();
        workpaper.status = 'approved';

        workpaper.changeLog.push({
            version: workpaper.version,
            date: new Date(),
            user: approverId,
            changes: 'Final approval',
        });

        return workpaper;
    }

    /**
     * Link evidence to workpaper
     */
    linkEvidence(workpaperId: string, evidence: EvidenceLink): GeneratedWorkpaper {
        const workpaper = this.workpapers.get(workpaperId);
        if (!workpaper) {
            throw new Error(`Workpaper not found: ${workpaperId}`);
        }

        workpaper.linkedEvidence.push(evidence);
        return workpaper;
    }

    /**
     * Export workpaper to specified format
     */
    async exportWorkpaper(workpaperId: string, options: ExportOptions): Promise<{ content: string; mimeType: string; filename: string }> {
        const workpaper = this.workpapers.get(workpaperId);
        if (!workpaper) {
            throw new Error(`Workpaper not found: ${workpaperId}`);
        }

        switch (options.format) {
            case 'html':
                return this.exportToHTML(workpaper, options);
            case 'pdf':
                return this.exportToPDF(workpaper, options);
            case 'excel':
                return this.exportToExcel(workpaper, options);
            case 'word':
                return this.exportToWord(workpaper, options);
            default:
                throw new Error(`Unsupported format: ${options.format}`);
        }
    }

    /**
     * Get available templates
     */
    getTemplates(filter?: { category?: WorkpaperCategory; type?: WorkpaperType }): WorkpaperTemplate[] {
        let templates = Array.from(this.templates.values());

        if (filter?.category) {
            templates = templates.filter(t => t.category === filter.category);
        }
        if (filter?.type) {
            templates = templates.filter(t => t.type === filter.type);
        }

        return templates;
    }

    /**
     * Get workpaper by ID
     */
    getWorkpaper(workpaperId: string): GeneratedWorkpaper | undefined {
        return this.workpapers.get(workpaperId);
    }

    /**
     * Get workpapers for engagement
     */
    getEngagementWorkpapers(engagementId: string): GeneratedWorkpaper[] {
        return Array.from(this.workpapers.values())
            .filter(w => w.engagementId === engagementId);
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private validateFields(template: WorkpaperTemplate, data: Record<string, unknown>): void {
        for (const field of template.requiredFields) {
            if (field.validation?.required && (data[field.name] === undefined || data[field.name] === null)) {
                throw new Error(`Required field missing: ${field.name}`);
            }
        }
    }

    private enrichData(template: WorkpaperTemplate, data: Record<string, unknown>): Record<string, unknown> {
        const enriched = { ...data };

        // Add helper functions
        enriched.formatCurrency = (value: number) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: this.config.defaultCurrency,
            }).format(value);
        };

        enriched.formatDate = (date: Date) => {
            return date instanceof Date ? date.toISOString().split('T')[0] : date;
        };

        enriched.formatPercent = (value: number) => {
            return `${value.toFixed(1)}%`;
        };

        // Calculate materiality if applicable
        if (template.id === 'tpl-materiality') {
            const revenue = data.revenue as number ?? 0;
            const totalAssets = data.totalAssets as number ?? 0;
            const preTaxIncome = data.preTaxIncome as number ?? 0;

            enriched.revenuePercent = 0.5;
            enriched.assetPercent = 1.0;
            enriched.incomePercent = 5.0;

            enriched.overallMateriality = Math.round(revenue * 0.005);
            enriched.assetMateriality = Math.round(totalAssets * 0.01);
            enriched.incomeMateriality = preTaxIncome > 0 ? Math.round(preTaxIncome * 0.05) : undefined;

            enriched.pmPercent = 75;
            enriched.trivialPercent = 5;
            enriched.performanceMateriality = Math.round((enriched.overallMateriality as number) * 0.75);
            enriched.trivialThreshold = Math.round((enriched.overallMateriality as number) * 0.05);
        }

        return enriched;
    }

    private generateSections(template: WorkpaperTemplate, data: Record<string, unknown>): GeneratedSection[] {
        const sections: GeneratedSection[] = [];

        for (const section of template.sections) {
            // Check conditional
            if (section.conditional) {
                const fieldValue = data[section.conditional.field];
                // Simplified condition check
                if (fieldValue === undefined) {
                    continue;
                }
            }

            // Render template (simplified - in production would use Handlebars)
            const content = this.renderTemplate(section.template, data);

            sections.push({
                id: crypto.randomUUID(),
                sectionId: section.id,
                title: section.title,
                order: section.order,
                contentType: section.contentType,
                content,
                isComplete: content.length > 50,
            });
        }

        return sections;
    }

    private renderTemplate(template: string, data: Record<string, unknown>): string {
        let result = template;

        // Simple variable replacement ({{variable}})
        result = result.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const trimmedKey = key.trim();

            // Check for helper functions
            if (trimmedKey.startsWith('formatCurrency ')) {
                const varName = trimmedKey.replace('formatCurrency ', '');
                const value = data[varName];
                return typeof value === 'number'
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
                    : String(value ?? '');
            }

            // Check for #each loops (simplified)
            if (trimmedKey.startsWith('#each ')) {
                return match;  // Leave for second pass
            }

            const value = data[trimmedKey];
            return value !== undefined ? String(value) : match;
        });

        // Handle #each blocks (simplified)
        result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, template) => {
            const array = data[arrayName] as unknown[];
            if (!Array.isArray(array)) return '';

            return array.map(item => {
                let itemResult = template;
                if (typeof item === 'object' && item !== null) {
                    for (const [key, value] of Object.entries(item)) {
                        itemResult = itemResult.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
                    }
                }
                return itemResult;
            }).join('');
        });

        return result;
    }

    private generateRef(category: WorkpaperCategory): string {
        const prefixes: Record<WorkpaperCategory, string> = {
            planning: 'P',
            risk_assessment: 'R',
            internal_control: 'C',
            substantive: 'S',
            completion: 'CL',
            reporting: 'RP',
        };
        const prefix = prefixes[category] ?? 'W';
        const num = Math.floor(Math.random() * 900) + 100;
        return `${prefix}-${num}`;
    }

    private async exportToHTML(workpaper: GeneratedWorkpaper, options: ExportOptions): Promise<{ content: string; mimeType: string; filename: string }> {
        const sections = workpaper.sections.map(s => `
            <section class="wp-section">
                <h2>${s.title}</h2>
                <div class="content">${s.content}</div>
            </section>
        `).join('\n');

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${workpaper.title} - ${workpaper.ref}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; border-bottom: 2px solid #333; }
        h2 { color: #555; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .meta { color: #666; font-size: 0.9em; }
        .signature { margin-top: 40px; display: flex; gap: 40px; }
        .signature-block { border-top: 1px solid #333; padding-top: 5px; width: 200px; }
    </style>
</head>
<body>
    <header>
        <h1>${workpaper.title}</h1>
        <p class="meta">Reference: ${workpaper.ref} | Client: ${workpaper.clientName} | Period: ${workpaper.periodEnd}</p>
    </header>
    
    ${sections}
    
    <footer class="signature">
        <div class="signature-block">
            <p>Prepared by: ${workpaper.preparedBy}</p>
            <p>Date: ${workpaper.preparedAt.toISOString().split('T')[0]}</p>
        </div>
        ${workpaper.reviewedBy ? `
        <div class="signature-block">
            <p>Reviewed by: ${workpaper.reviewedBy}</p>
            <p>Date: ${workpaper.reviewedAt?.toISOString().split('T')[0]}</p>
        </div>
        ` : ''}
    </footer>
</body>
</html>
        `;

        return {
            content: html,
            mimeType: 'text/html',
            filename: `${workpaper.ref}-${workpaper.title.replace(/\s+/g, '-')}.html`,
        };
    }

    private async exportToPDF(workpaper: GeneratedWorkpaper, options: ExportOptions): Promise<{ content: string; mimeType: string; filename: string }> {
        // In production, would use puppeteer or similar to convert HTML to PDF
        const html = await this.exportToHTML(workpaper, options);
        return {
            content: html.content,  // Would be PDF binary
            mimeType: 'application/pdf',
            filename: `${workpaper.ref}-${workpaper.title.replace(/\s+/g, '-')}.pdf`,
        };
    }

    private async exportToExcel(workpaper: GeneratedWorkpaper, options: ExportOptions): Promise<{ content: string; mimeType: string; filename: string }> {
        // In production, would use exceljs or similar
        return {
            content: JSON.stringify(workpaper.dataSnapshot),
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename: `${workpaper.ref}-${workpaper.title.replace(/\s+/g, '-')}.xlsx`,
        };
    }

    private async exportToWord(workpaper: GeneratedWorkpaper, options: ExportOptions): Promise<{ content: string; mimeType: string; filename: string }> {
        // In production, would use docx or similar
        const html = await this.exportToHTML(workpaper, options);
        return {
            content: html.content,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            filename: `${workpaper.ref}-${workpaper.title.replace(/\s+/g, '-')}.docx`,
        };
    }
}

// Export singleton
export const workpaperAutomationAgent = new WorkpaperAutomationAgent();
