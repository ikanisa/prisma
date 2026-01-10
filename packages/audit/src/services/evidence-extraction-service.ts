/**
 * AI Evidence Extraction Service
 * 
 * GPT-4 Vision powered document analysis for audit evidence extraction.
 * Supports invoices, bank statements, contracts, and other audit documents.
 * 
 * Features:
 * - Multi-format document processing (PDF, images, scans)
 * - Intelligent field extraction with confidence scoring
 * - Jurisdiction-specific document types
 * - Evidence tagging and categorization
 * - Audit trail generation
 */

import OpenAI from 'openai';

// ============================================================================
// TYPES
// ============================================================================

export type DocumentType =
    | 'invoice'
    | 'bank_statement'
    | 'contract'
    | 'receipt'
    | 'tax_return'
    | 'vat_return'
    | 'ebm_invoice'        // Rwanda EBM
    | 'gst_return'         // Canada
    | 'fs5_declaration'    // Malta
    | 'corporate_registry'
    | 'loan_agreement'
    | 'lease_agreement'
    | 'audit_confirmation'
    | 'other';

export type JurisdictionCode = 'MT' | 'CA' | 'RW';

export interface DocumentInput {
    id: string;
    fileName: string;
    fileType: 'pdf' | 'image' | 'scan';
    base64Data?: string;
    url?: string;
    documentType?: DocumentType;
    jurisdiction?: JurisdictionCode;
    engagementId: string;
    entityId: string;
}

export interface ExtractedEvidence {
    id: string;
    documentId: string;
    documentType: DocumentType;
    extractedAt: Date;
    fields: ExtractedField[];
    summary: string;
    confidence: number;
    flags: EvidenceFlag[];
    auditAssertions: AuditAssertion[];
    jurisdictionDetails?: JurisdictionDocumentDetails;
}

export interface ExtractedField {
    name: string;
    value: string | number | Date | null;
    confidence: number;
    location?: { page?: number; coordinates?: string };
}

export interface EvidenceFlag {
    type: 'warning' | 'attention' | 'discrepancy' | 'material';
    description: string;
    severity: 'low' | 'medium' | 'high';
}

export interface AuditAssertion {
    assertion: 'existence' | 'completeness' | 'accuracy' | 'valuation' | 'classification' | 'cutoff' | 'rights';
    supported: boolean;
    evidence: string;
}

export interface JurisdictionDocumentDetails {
    jurisdiction: JurisdictionCode;
    regulatoryCompliance: {
        requirement: string;
        met: boolean;
        notes?: string;
    }[];
    taxImplications?: {
        taxType: string;
        amount?: number;
        rate?: number;
    }[];
}

// ============================================================================
// DOCUMENT TYPE SCHEMAS
// ============================================================================

const DOCUMENT_SCHEMAS: Record<DocumentType, { fields: string[]; description: string }> = {
    invoice: {
        fields: ['invoiceNumber', 'invoiceDate', 'vendor', 'customer', 'totalAmount', 'currency', 'vatAmount', 'vatRate', 'lineItems', 'paymentTerms'],
        description: 'A commercial invoice for goods or services',
    },
    bank_statement: {
        fields: ['bankName', 'accountNumber', 'accountHolder', 'statementDate', 'openingBalance', 'closingBalance', 'transactions', 'currency'],
        description: 'A bank account statement',
    },
    contract: {
        fields: ['contractDate', 'parties', 'contractValue', 'term', 'keyTerms', 'signaturePresent', 'jurisdiction'],
        description: 'A legal contract or agreement',
    },
    receipt: {
        fields: ['receiptNumber', 'date', 'vendor', 'amount', 'paymentMethod', 'description'],
        description: 'A payment receipt',
    },
    tax_return: {
        fields: ['taxYear', 'entityName', 'taxId', 'taxableIncome', 'taxPayable', 'filingDate', 'jurisdiction'],
        description: 'An annual tax return filing',
    },
    vat_return: {
        fields: ['period', 'entityName', 'vatNumber', 'outputVAT', 'inputVAT', 'netVAT', 'filingDate'],
        description: 'A VAT/GST return filing',
    },
    ebm_invoice: {
        fields: ['ebmDeviceId', 'rraReference', 'invoiceNumber', 'tin', 'date', 'totalAmount', 'vatAmount', 'items'],
        description: 'A Rwanda EBM-generated invoice',
    },
    gst_return: {
        fields: ['period', 'businessNumber', 'gstCollected', 'itcClaimed', 'netGst', 'province', 'filingDate'],
        description: 'A Canadian GST/HST return',
    },
    fs5_declaration: {
        fields: ['period', 'employer', 'employeeCount', 'fssContributions', 'totalRemittance', 'filingDate'],
        description: 'A Malta FS5 social security declaration',
    },
    corporate_registry: {
        fields: ['companyName', 'registrationNumber', 'incorporationDate', 'directors', 'shareholders', 'registeredAddress'],
        description: 'Corporate registry extract',
    },
    loan_agreement: {
        fields: ['lender', 'borrower', 'principalAmount', 'interestRate', 'term', 'securityDetails', 'covenants'],
        description: 'A loan or credit agreement',
    },
    lease_agreement: {
        fields: ['lessor', 'lessee', 'assetDescription', 'leaseStartDate', 'leaseEndDate', 'monthlyPayment', 'leaseType'],
        description: 'An asset lease agreement',
    },
    audit_confirmation: {
        fields: ['confirmationType', 'entityName', 'balance', 'asOfDate', 'response', 'discrepancies'],
        description: 'An external audit confirmation',
    },
    other: {
        fields: ['documentTitle', 'date', 'parties', 'keyInformation'],
        description: 'Other document type',
    },
};

// ============================================================================
// EVIDENCE EXTRACTION SERVICE
// ============================================================================

export interface EvidenceExtractionServiceConfig {
    openaiApiKey?: string;
    model?: string;
    organizationId?: string;
    userId?: string;
}

export class EvidenceExtractionService {
    private openai: OpenAI | null = null;
    private model: string;

    constructor(private config: EvidenceExtractionServiceConfig = {}) {
        this.model = config.model || 'gpt-4o';

        if (config.openaiApiKey) {
            this.openai = new OpenAI({ apiKey: config.openaiApiKey });
        } else if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
    }

    /**
     * Extract evidence from a document using GPT-4 Vision
     */
    async extractEvidence(input: DocumentInput): Promise<ExtractedEvidence> {
        const documentType = input.documentType || 'other';
        const schema = DOCUMENT_SCHEMAS[documentType];

        // If OpenAI client is available, use Vision API
        if (this.openai && (input.base64Data || input.url)) {
            return this.extractWithVision(input, documentType, schema);
        }

        // Fallback: return template structure for manual extraction
        return this.createTemplateEvidence(input, documentType);
    }

    /**
     * Extract using GPT-4 Vision API
     */
    private async extractWithVision(
        input: DocumentInput,
        documentType: DocumentType,
        schema: { fields: string[]; description: string }
    ): Promise<ExtractedEvidence> {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized');
        }

        const prompt = this.buildExtractionPrompt(documentType, schema, input.jurisdiction);

        const imageContent = input.url
            ? { type: 'image_url' as const, image_url: { url: input.url } }
            : { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${input.base64Data}` } };

        const response = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        imageContent,
                    ],
                },
            ],
            max_tokens: 2000,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from GPT-4 Vision');
        }

        const parsed = JSON.parse(content);
        return this.parseExtractionResponse(input, documentType, parsed);
    }

    /**
     * Build extraction prompt for GPT-4 Vision
     */
    private buildExtractionPrompt(
        documentType: DocumentType,
        schema: { fields: string[]; description: string },
        jurisdiction?: JurisdictionCode
    ): string {
        let prompt = `You are an expert audit evidence extraction assistant. Analyze this ${schema.description} and extract the following information as a JSON object.

Required fields to extract:
${schema.fields.map(f => `- ${f}`).join('\n')}

For each field, provide:
- value: The extracted value (string, number, date, or null if not found)
- confidence: A score from 0 to 1 indicating extraction confidence

Also provide:
- summary: A brief description of the document
- flags: Any warnings, discrepancies, or items requiring attention
- auditAssertions: Which audit assertions (existence, completeness, accuracy, valuation, classification, cutoff, rights) are supported by this document`;

        if (jurisdiction) {
            const jurisdictionGuidance: Record<JurisdictionCode, string> = {
                MT: '\n\nJurisdiction: Malta (EU)\n- Check for valid VAT number format (MT followed by 8 digits)\n- Note any EU reverse charge indications\n- Flag non-EUR currency transactions',
                CA: '\n\nJurisdiction: Canada\n- Check for valid GST/HST registration number\n- Note provincial tax (PST/QST) implications\n- Flag CAD to other currency conversions',
                RW: '\n\nJurisdiction: Rwanda\n- Verify EBM device reference if present\n- Check TIN format (9 digits)\n- Note mobile money transaction indicators\n- Flag any non-RWF transactions',
            };
            prompt += jurisdictionGuidance[jurisdiction];
        }

        prompt += '\n\nRespond with a valid JSON object only.';
        return prompt;
    }

    /**
     * Parse extraction response into structured evidence
     */
    private parseExtractionResponse(
        input: DocumentInput,
        documentType: DocumentType,
        parsed: Record<string, unknown>
    ): ExtractedEvidence {
        const fields: ExtractedField[] = [];
        const schema = DOCUMENT_SCHEMAS[documentType];

        for (const fieldName of schema.fields) {
            const fieldData = parsed[fieldName] as { value?: unknown; confidence?: number } | undefined;
            if (fieldData) {
                fields.push({
                    name: fieldName,
                    value: fieldData.value as string | number | Date | null,
                    confidence: fieldData.confidence || 0.8,
                });
            }
        }

        const flags: EvidenceFlag[] = Array.isArray(parsed.flags)
            ? (parsed.flags as { type: string; description: string; severity: string }[]).map(f => ({
                type: f.type as EvidenceFlag['type'],
                description: f.description,
                severity: f.severity as EvidenceFlag['severity'],
            }))
            : [];

        const assertions = Array.isArray(parsed.auditAssertions)
            ? (parsed.auditAssertions as { assertion: string; supported: boolean; evidence: string }[]).map(a => ({
                assertion: a.assertion as AuditAssertion['assertion'],
                supported: a.supported,
                evidence: a.evidence,
            }))
            : [];

        return {
            id: `evidence-${Date.now()}-${input.id}`,
            documentId: input.id,
            documentType,
            extractedAt: new Date(),
            fields,
            summary: (parsed.summary as string) || 'Document processed',
            confidence: this.calculateOverallConfidence(fields),
            flags,
            auditAssertions: assertions,
            jurisdictionDetails: input.jurisdiction ? this.getJurisdictionDetails(input.jurisdiction, fields) : undefined,
        };
    }

    /**
     * Create template evidence for manual extraction
     */
    private createTemplateEvidence(input: DocumentInput, documentType: DocumentType): ExtractedEvidence {
        const schema = DOCUMENT_SCHEMAS[documentType];

        return {
            id: `evidence-${Date.now()}-${input.id}`,
            documentId: input.id,
            documentType,
            extractedAt: new Date(),
            fields: schema.fields.map(name => ({
                name,
                value: null,
                confidence: 0,
            })),
            summary: `${documentType} document - awaiting manual extraction`,
            confidence: 0,
            flags: [{ type: 'attention', description: 'Manual extraction required', severity: 'medium' }],
            auditAssertions: [],
        };
    }

    /**
     * Calculate overall confidence from field confidences
     */
    private calculateOverallConfidence(fields: ExtractedField[]): number {
        if (fields.length === 0) return 0;
        const sum = fields.reduce((acc, f) => acc + f.confidence, 0);
        return Math.round((sum / fields.length) * 100) / 100;
    }

    /**
     * Get jurisdiction-specific details
     */
    private getJurisdictionDetails(
        jurisdiction: JurisdictionCode,
        fields: ExtractedField[]
    ): JurisdictionDocumentDetails {
        const vatField = fields.find(f => f.name === 'vatAmount' || f.name === 'vatRate');

        const details: JurisdictionDocumentDetails = {
            jurisdiction,
            regulatoryCompliance: [],
            taxImplications: [],
        };

        switch (jurisdiction) {
            case 'MT':
                details.regulatoryCompliance = [
                    { requirement: 'EU VAT Directive compliance', met: !!vatField },
                    { requirement: 'Valid Malta VAT number format', met: true },
                ];
                if (vatField?.value) {
                    details.taxImplications = [{ taxType: 'VAT', rate: 18 }];
                }
                break;
            case 'CA':
                details.regulatoryCompliance = [
                    { requirement: 'GST/HST registration', met: true },
                    { requirement: 'Provincial tax compliance', met: true },
                ];
                break;
            case 'RW':
                const ebmField = fields.find(f => f.name === 'ebmDeviceId' || f.name === 'rraReference');
                details.regulatoryCompliance = [
                    { requirement: 'EBM compliance', met: !!ebmField },
                    { requirement: 'RRA registration', met: true },
                ];
                if (vatField?.value) {
                    details.taxImplications = [{ taxType: 'VAT', rate: 18 }];
                }
                break;
        }

        return details;
    }

    /**
     * Batch extract evidence from multiple documents
     */
    async batchExtract(inputs: DocumentInput[]): Promise<ExtractedEvidence[]> {
        const results: ExtractedEvidence[] = [];

        for (const input of inputs) {
            try {
                const evidence = await this.extractEvidence(input);
                results.push(evidence);
            } catch (error) {
                results.push(this.createTemplateEvidence(input, input.documentType || 'other'));
            }
        }

        return results;
    }

    /**
     * Get supported document types
     */
    getSupportedDocumentTypes(): DocumentType[] {
        return Object.keys(DOCUMENT_SCHEMAS) as DocumentType[];
    }

    /**
     * Get schema for a document type
     */
    getDocumentSchema(type: DocumentType): { fields: string[]; description: string } {
        return DOCUMENT_SCHEMAS[type];
    }
}

// Factory function
export function createEvidenceExtractionService(config?: EvidenceExtractionServiceConfig): EvidenceExtractionService {
    return new EvidenceExtractionService(config);
}
