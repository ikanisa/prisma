/**
 * Statutory Report Generator Service
 * 
 * Automated generation of regulatory and statutory reports for Malta, Canada, and Rwanda.
 * Produces tax returns, compliance reports, and audit documentation.
 */

// ============================================================================
// TYPES
// ============================================================================

export type JurisdictionCode = 'MT' | 'CA' | 'RW';

export type ReportType =
    | 'vat_return'
    | 'gst_return'
    | 'corporate_tax_return'
    | 'withholding_tax_return'
    | 'payroll_return'
    | 'annual_return'
    | 'audit_report'
    | 'compliance_certificate'
    | 'intrastat_declaration'
    | 'ebm_summary';

export interface ReportTemplate {
    id: string;
    jurisdiction: JurisdictionCode;
    reportType: ReportType;
    name: string;
    description: string;
    requiredFields: FieldDefinition[];
    sections: ReportSection[];
    format: 'pdf' | 'xml' | 'json' | 'csv';
    regulatoryReference: string;
    filingDestination: string;
}

export interface FieldDefinition {
    id: string;
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
    required: boolean;
    validation?: string;
    helpText?: string;
}

export interface ReportSection {
    id: string;
    title: string;
    order: number;
    fields: string[];
    calculations?: { field: string; formula: string }[];
}

export interface GeneratedReport {
    id: string;
    templateId: string;
    jurisdiction: JurisdictionCode;
    reportType: ReportType;
    period: string;
    generatedAt: Date;
    status: 'draft' | 'validated' | 'submitted' | 'accepted' | 'rejected';
    data: Record<string, unknown>;
    validation: ValidationResult;
    filingReference?: string;
    submittedAt?: Date;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface ValidationWarning {
    field: string;
    message: string;
    suggestion?: string;
}

// ============================================================================
// REPORT TEMPLATES
// ============================================================================

const MALTA_TEMPLATES: ReportTemplate[] = [
    {
        id: 'mt-vat-return',
        jurisdiction: 'MT',
        reportType: 'vat_return',
        name: 'Malta VAT Return',
        description: 'Quarterly/Monthly VAT return for Malta VAT registered businesses',
        requiredFields: [
            { id: 'vatNumber', name: 'VAT Registration Number', type: 'string', required: true },
            { id: 'periodStart', name: 'Period Start Date', type: 'date', required: true },
            { id: 'periodEnd', name: 'Period End Date', type: 'date', required: true },
            { id: 'outputVat18', name: 'Output VAT at 18%', type: 'currency', required: true },
            { id: 'outputVat12', name: 'Output VAT at 12%', type: 'currency', required: false },
            { id: 'outputVat7', name: 'Output VAT at 7%', type: 'currency', required: false },
            { id: 'outputVat5', name: 'Output VAT at 5%', type: 'currency', required: false },
            { id: 'zeroRatedSales', name: 'Zero-rated Sales', type: 'currency', required: false },
            { id: 'exemptSales', name: 'Exempt Sales', type: 'currency', required: false },
            { id: 'inputVat', name: 'Input VAT Claimed', type: 'currency', required: true },
            { id: 'euAcquisitions', name: 'EU Acquisitions', type: 'currency', required: false },
            { id: 'euSupplies', name: 'EU Supplies', type: 'currency', required: false },
        ],
        sections: [
            { id: 'header', title: 'Taxpayer Information', order: 1, fields: ['vatNumber', 'periodStart', 'periodEnd'] },
            { id: 'output', title: 'Output Tax', order: 2, fields: ['outputVat18', 'outputVat12', 'outputVat7', 'outputVat5'] },
            { id: 'sales', title: 'Sales Summary', order: 3, fields: ['zeroRatedSales', 'exemptSales'] },
            { id: 'input', title: 'Input Tax', order: 4, fields: ['inputVat'] },
            { id: 'eu', title: 'EU Trade', order: 5, fields: ['euAcquisitions', 'euSupplies'] },
            {
                id: 'summary',
                title: 'Tax Summary',
                order: 6,
                fields: [],
                calculations: [
                    { field: 'totalOutputVat', formula: 'outputVat18 + outputVat12 + outputVat7 + outputVat5' },
                    { field: 'netVatPayable', formula: 'totalOutputVat - inputVat' },
                ],
            },
        ],
        format: 'xml',
        regulatoryReference: 'VAT Act Chapter 406',
        filingDestination: 'CFR eFiling Portal',
    },
    {
        id: 'mt-corporate-tax',
        jurisdiction: 'MT',
        reportType: 'corporate_tax_return',
        name: 'Malta Corporate Tax Return (TA1)',
        description: 'Annual corporate income tax return for Malta companies',
        requiredFields: [
            { id: 'taxId', name: 'Tax Identification Number', type: 'string', required: true },
            { id: 'companyName', name: 'Company Name', type: 'string', required: true },
            { id: 'yearEnd', name: 'Accounting Year End', type: 'date', required: true },
            { id: 'turnover', name: 'Total Turnover', type: 'currency', required: true },
            { id: 'grossProfit', name: 'Gross Profit', type: 'currency', required: true },
            { id: 'operatingExpenses', name: 'Operating Expenses', type: 'currency', required: true },
            { id: 'taxableIncome', name: 'Taxable Income', type: 'currency', required: true },
            { id: 'taxPayable', name: 'Tax Payable at 35%', type: 'currency', required: true },
            { id: 'refundDue', name: 'Shareholder Refund Due', type: 'currency', required: false },
        ],
        sections: [
            { id: 'identification', title: 'Company Details', order: 1, fields: ['taxId', 'companyName', 'yearEnd'] },
            { id: 'income', title: 'Income Statement', order: 2, fields: ['turnover', 'grossProfit', 'operatingExpenses'] },
            { id: 'tax', title: 'Tax Computation', order: 3, fields: ['taxableIncome', 'taxPayable', 'refundDue'] },
        ],
        format: 'pdf',
        regulatoryReference: 'Income Tax Act Chapter 123',
        filingDestination: 'CFR eFiling Portal',
    },
];

const CANADA_TEMPLATES: ReportTemplate[] = [
    {
        id: 'ca-gst-return',
        jurisdiction: 'CA',
        reportType: 'gst_return',
        name: 'Canada GST/HST Return',
        description: 'GST/HST return for registered businesses in Canada',
        requiredFields: [
            { id: 'businessNumber', name: 'Business Number (BN)', type: 'string', required: true },
            { id: 'reportingPeriod', name: 'Reporting Period', type: 'string', required: true },
            { id: 'totalSales', name: 'Total Sales and Revenues', type: 'currency', required: true },
            { id: 'gstHstCollected', name: 'GST/HST Collected', type: 'currency', required: true },
            { id: 'adjustments', name: 'Adjustments', type: 'currency', required: false },
            { id: 'netTaxCollected', name: 'Net Tax Collected', type: 'currency', required: true },
            { id: 'itcClaimed', name: 'Input Tax Credits (ITCs)', type: 'currency', required: true },
            { id: 'netTaxOwing', name: 'Net Tax Owing or Refund', type: 'currency', required: true },
        ],
        sections: [
            { id: 'business', title: 'Business Information', order: 1, fields: ['businessNumber', 'reportingPeriod'] },
            { id: 'sales', title: 'Sales and Revenues', order: 2, fields: ['totalSales'] },
            { id: 'taxCollected', title: 'GST/HST Collected', order: 3, fields: ['gstHstCollected', 'adjustments', 'netTaxCollected'] },
            { id: 'credits', title: 'Input Tax Credits', order: 4, fields: ['itcClaimed'] },
            {
                id: 'summary',
                title: 'Net Tax',
                order: 5,
                fields: ['netTaxOwing'],
                calculations: [
                    { field: 'netTaxOwing', formula: 'netTaxCollected - itcClaimed' },
                ],
            },
        ],
        format: 'xml',
        regulatoryReference: 'Excise Tax Act',
        filingDestination: 'CRA My Business Account',
    },
    {
        id: 'ca-t2-return',
        jurisdiction: 'CA',
        reportType: 'corporate_tax_return',
        name: 'Canada T2 Corporation Income Tax Return',
        description: 'Annual corporation income tax return for Canadian corporations',
        requiredFields: [
            { id: 'businessNumber', name: 'Business Number', type: 'string', required: true },
            { id: 'corporationName', name: 'Legal Name of Corporation', type: 'string', required: true },
            { id: 'taxYear', name: 'Tax Year End', type: 'date', required: true },
            { id: 'grossRevenue', name: 'Gross Revenue', type: 'currency', required: true },
            { id: 'netIncomeForTax', name: 'Net Income for Tax Purposes', type: 'currency', required: true },
            { id: 'taxableIncome', name: 'Taxable Income', type: 'currency', required: true },
            { id: 'federalTax', name: 'Federal Tax', type: 'currency', required: true },
            { id: 'provincialTax', name: 'Provincial/Territorial Tax', type: 'currency', required: true },
            { id: 'totalTaxPayable', name: 'Total Tax Payable', type: 'currency', required: true },
        ],
        sections: [
            { id: 'identification', title: 'Corporation Identification', order: 1, fields: ['businessNumber', 'corporationName', 'taxYear'] },
            { id: 'income', title: 'Income Information', order: 2, fields: ['grossRevenue', 'netIncomeForTax', 'taxableIncome'] },
            { id: 'tax', title: 'Tax Calculation', order: 3, fields: ['federalTax', 'provincialTax', 'totalTaxPayable'] },
        ],
        format: 'xml',
        regulatoryReference: 'Income Tax Act',
        filingDestination: 'CRA My Business Account',
    },
];

const RWANDA_TEMPLATES: ReportTemplate[] = [
    {
        id: 'rw-vat-return',
        jurisdiction: 'RW',
        reportType: 'vat_return',
        name: 'Rwanda Monthly VAT Return',
        description: 'Monthly VAT return for RRA-registered taxpayers',
        requiredFields: [
            { id: 'tin', name: 'Tax Identification Number (TIN)', type: 'string', required: true, validation: '^\\d{9}$' },
            { id: 'taxpayerName', name: 'Taxpayer Legal Name', type: 'string', required: true },
            { id: 'returnPeriod', name: 'Return Period (Month/Year)', type: 'string', required: true },
            { id: 'totalSales', name: 'Total Sales (RWF)', type: 'currency', required: true },
            { id: 'taxableSales', name: 'Taxable Sales (RWF)', type: 'currency', required: true },
            { id: 'exemptSales', name: 'Exempt Sales (RWF)', type: 'currency', required: false },
            { id: 'zeroRatedSales', name: 'Zero-rated Sales (RWF)', type: 'currency', required: false },
            { id: 'outputVat', name: 'Output VAT (18%)', type: 'currency', required: true },
            { id: 'inputVat', name: 'Input VAT Claimed', type: 'currency', required: true },
            { id: 'ebmInvoiceCount', name: 'Number of EBM Invoices', type: 'number', required: true },
            { id: 'ebmTotalValue', name: 'Total EBM Invoice Value', type: 'currency', required: true },
        ],
        sections: [
            { id: 'taxpayer', title: 'Taxpayer Information', order: 1, fields: ['tin', 'taxpayerName', 'returnPeriod'] },
            { id: 'sales', title: 'Sales Declaration', order: 2, fields: ['totalSales', 'taxableSales', 'exemptSales', 'zeroRatedSales'] },
            { id: 'vat', title: 'VAT Calculation', order: 3, fields: ['outputVat', 'inputVat'] },
            { id: 'ebm', title: 'EBM Reconciliation', order: 4, fields: ['ebmInvoiceCount', 'ebmTotalValue'] },
            {
                id: 'summary',
                title: 'Net VAT',
                order: 5,
                fields: [],
                calculations: [
                    { field: 'netVatPayable', formula: 'outputVat - inputVat' },
                ],
            },
        ],
        format: 'xml',
        regulatoryReference: 'Law No. 37/2012 on VAT',
        filingDestination: 'RRA eFiling Portal',
    },
    {
        id: 'rw-ebm-summary',
        jurisdiction: 'RW',
        reportType: 'ebm_summary',
        name: 'Rwanda EBM Monthly Summary Report',
        description: 'Monthly summary of all EBM-generated invoices for RRA reconciliation',
        requiredFields: [
            { id: 'tin', name: 'Tax Identification Number', type: 'string', required: true },
            { id: 'ebmDeviceId', name: 'EBM Device Serial Number', type: 'string', required: true },
            { id: 'month', name: 'Reporting Month', type: 'string', required: true },
            { id: 'totalInvoices', name: 'Total Invoices Issued', type: 'number', required: true },
            { id: 'totalSalesValue', name: 'Total Sales Value (RWF)', type: 'currency', required: true },
            { id: 'totalVatCollected', name: 'Total VAT Collected', type: 'currency', required: true },
            { id: 'cancelledInvoices', name: 'Cancelled Invoices', type: 'number', required: false },
            { id: 'creditNotes', name: 'Credit Notes Issued', type: 'number', required: false },
            { id: 'offlineInvoices', name: 'Offline Mode Invoices', type: 'number', required: false },
        ],
        sections: [
            { id: 'device', title: 'Device Information', order: 1, fields: ['tin', 'ebmDeviceId', 'month'] },
            { id: 'invoices', title: 'Invoice Summary', order: 2, fields: ['totalInvoices', 'cancelledInvoices', 'creditNotes'] },
            { id: 'values', title: 'Value Summary', order: 3, fields: ['totalSalesValue', 'totalVatCollected'] },
            { id: 'offline', title: 'Offline Transactions', order: 4, fields: ['offlineInvoices'] },
        ],
        format: 'json',
        regulatoryReference: 'Ministerial Order N° 003/19/10/TC',
        filingDestination: 'RRA EBM Portal',
    },
];

// ============================================================================
// STATUTORY REPORT GENERATOR SERVICE
// ============================================================================

export interface StatutoryReportGeneratorConfig {
    organizationId?: string;
    userId?: string;
}

export class StatutoryReportGeneratorService {
    private templates: Map<string, ReportTemplate> = new Map();

    constructor(private config: StatutoryReportGeneratorConfig = {}) {
        // Load all templates
        [...MALTA_TEMPLATES, ...CANADA_TEMPLATES, ...RWANDA_TEMPLATES].forEach(t => {
            this.templates.set(t.id, t);
        });
    }

    /**
     * Get all templates for a jurisdiction
     */
    getTemplates(jurisdiction: JurisdictionCode): ReportTemplate[] {
        return Array.from(this.templates.values()).filter(t => t.jurisdiction === jurisdiction);
    }

    /**
     * Get specific template
     */
    getTemplate(templateId: string): ReportTemplate | undefined {
        return this.templates.get(templateId);
    }

    /**
     * Generate a report from template and data
     */
    generateReport(
        templateId: string,
        data: Record<string, unknown>,
        options?: { period?: string }
    ): GeneratedReport {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        // Validate data
        const validation = this.validateData(template, data);

        // Run calculations
        const calculatedData = this.runCalculations(template, data);

        return {
            id: `report-${Date.now()}`,
            templateId,
            jurisdiction: template.jurisdiction,
            reportType: template.reportType,
            period: options?.period || this.getCurrentPeriod(template.reportType),
            generatedAt: new Date(),
            status: validation.isValid ? 'validated' : 'draft',
            data: { ...data, ...calculatedData },
            validation,
        };
    }

    /**
     * Validate data against template requirements
     */
    private validateData(template: ReportTemplate, data: Record<string, unknown>): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        for (const field of template.requiredFields) {
            const value = data[field.id];

            // Check required fields
            if (field.required && (value === undefined || value === null || value === '')) {
                errors.push({
                    field: field.id,
                    message: `${field.name} is required`,
                    code: 'REQUIRED_FIELD_MISSING',
                });
                continue;
            }

            // Type validation
            if (value !== undefined && value !== null) {
                if (field.type === 'number' && typeof value !== 'number') {
                    errors.push({
                        field: field.id,
                        message: `${field.name} must be a number`,
                        code: 'INVALID_TYPE',
                    });
                }

                if (field.type === 'currency' && (typeof value !== 'number' || value < 0)) {
                    if (typeof value !== 'number') {
                        errors.push({
                            field: field.id,
                            message: `${field.name} must be a valid amount`,
                            code: 'INVALID_CURRENCY',
                        });
                    } else if (value < 0) {
                        warnings.push({
                            field: field.id,
                            message: `${field.name} is negative`,
                            suggestion: 'Verify this is intentional (e.g., credit)',
                        });
                    }
                }

                // Custom validation regex
                if (field.validation && typeof value === 'string') {
                    const regex = new RegExp(field.validation);
                    if (!regex.test(value)) {
                        errors.push({
                            field: field.id,
                            message: `${field.name} format is invalid`,
                            code: 'INVALID_FORMAT',
                        });
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Run section calculations
     */
    private runCalculations(template: ReportTemplate, data: Record<string, unknown>): Record<string, number> {
        const calculated: Record<string, number> = {};

        for (const section of template.sections) {
            if (section.calculations) {
                for (const calc of section.calculations) {
                    try {
                        // Simple expression evaluation (for demo - production would use proper parser)
                        let formula = calc.formula;

                        // Replace field names with values
                        for (const [key, value] of Object.entries(data)) {
                            if (typeof value === 'number') {
                                formula = formula.replace(new RegExp(key, 'g'), value.toString());
                            }
                        }
                        for (const [key, value] of Object.entries(calculated)) {
                            formula = formula.replace(new RegExp(key, 'g'), value.toString());
                        }

                        // Replace any remaining field references with 0
                        formula = formula.replace(/[a-zA-Z]+/g, '0');

                        // Evaluate (simple arithmetic only)
                        // eslint-disable-next-line no-eval
                        calculated[calc.field] = eval(formula) || 0;
                    } catch {
                        calculated[calc.field] = 0;
                    }
                }
            }
        }

        return calculated;
    }

    /**
     * Get current period based on report type
     */
    private getCurrentPeriod(reportType: ReportType): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const quarter = Math.ceil(month / 3);

        switch (reportType) {
            case 'vat_return':
            case 'gst_return':
            case 'payroll_return':
            case 'ebm_summary':
                return `${year}-${String(month - 1 || 12).padStart(2, '0')}`; // Previous month
            case 'corporate_tax_return':
            case 'annual_return':
                return (year - 1).toString();
            default:
                return `${year}-Q${quarter}`;
        }
    }

    /**
     * Export report to specified format
     */
    exportReport(report: GeneratedReport, format?: 'pdf' | 'xml' | 'json' | 'csv'): {
        content: string;
        mimeType: string;
        filename: string;
    } {
        const template = this.templates.get(report.templateId);
        const outputFormat = format || template?.format || 'json';

        let content: string;
        let mimeType: string;

        switch (outputFormat) {
            case 'xml':
                content = this.toXML(report);
                mimeType = 'application/xml';
                break;
            case 'csv':
                content = this.toCSV(report);
                mimeType = 'text/csv';
                break;
            case 'pdf':
                // For PDF, return placeholder (actual PDF generation would need additional library)
                content = JSON.stringify(report.data, null, 2);
                mimeType = 'application/pdf';
                break;
            default:
                content = JSON.stringify(report, null, 2);
                mimeType = 'application/json';
        }

        return {
            content,
            mimeType,
            filename: `${report.reportType}-${report.jurisdiction}-${report.period}.${outputFormat}`,
        };
    }

    /**
     * Convert report to XML
     */
    private toXML(report: GeneratedReport): string {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += `<${report.reportType}>\n`;
        xml += `  <jurisdiction>${report.jurisdiction}</jurisdiction>\n`;
        xml += `  <period>${report.period}</period>\n`;
        xml += `  <generatedAt>${report.generatedAt.toISOString()}</generatedAt>\n`;
        xml += `  <data>\n`;

        for (const [key, value] of Object.entries(report.data)) {
            xml += `    <${key}>${value}</${key}>\n`;
        }

        xml += `  </data>\n`;
        xml += `</${report.reportType}>`;
        return xml;
    }

    /**
     * Convert report to CSV
     */
    private toCSV(report: GeneratedReport): string {
        const headers = Object.keys(report.data).join(',');
        const values = Object.values(report.data).join(',');
        return `${headers}\n${values}`;
    }

    /**
     * Get filing deadlines for jurisdiction
     */
    getFilingDeadlines(jurisdiction: JurisdictionCode): { reportType: ReportType; deadline: string; frequency: string }[] {
        const deadlines: Record<JurisdictionCode, { reportType: ReportType; deadline: string; frequency: string }[]> = {
            MT: [
                { reportType: 'vat_return', deadline: '15th of 2nd month after quarter end', frequency: 'Quarterly' },
                { reportType: 'corporate_tax_return', deadline: '31 March following year-end', frequency: 'Annual' },
                { reportType: 'intrastat_declaration', deadline: '10th of following month', frequency: 'Monthly' },
            ],
            CA: [
                { reportType: 'gst_return', deadline: 'Varies by filing frequency', frequency: 'Annual/Quarterly/Monthly' },
                { reportType: 'corporate_tax_return', deadline: '6 months after year-end', frequency: 'Annual' },
                { reportType: 'payroll_return', deadline: '15th of following month', frequency: 'Monthly' },
            ],
            RW: [
                { reportType: 'vat_return', deadline: '15th of following month', frequency: 'Monthly' },
                { reportType: 'corporate_tax_return', deadline: '31 March following year-end', frequency: 'Annual' },
                { reportType: 'ebm_summary', deadline: '5th of following month', frequency: 'Monthly' },
                { reportType: 'withholding_tax_return', deadline: '15th of following month', frequency: 'Monthly' },
            ],
        };

        return deadlines[jurisdiction] || [];
    }
}

// Factory function
export function createStatutoryReportGeneratorService(
    config?: StatutoryReportGeneratorConfig
): StatutoryReportGeneratorService {
    return new StatutoryReportGeneratorService(config);
}
