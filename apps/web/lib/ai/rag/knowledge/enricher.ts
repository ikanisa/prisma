/**
 * Knowledge Factory Enricher
 * 
 * Uses Gemini to classify, summarize, and tag documents
 * Outputs structured JSON with validation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface EnrichmentInput {
    text: string;
    fileName: string;
    folderPath?: string;
    mimeType?: string;
    maxInputChars?: number;
}

export interface EnrichmentOutput {
    standard: 'IFRS' | 'ISA' | 'GAAP' | 'TAX' | 'AUDIT_METHODOLOGY' | 'COMPANY_LAW' | 'OTHER';
    jurisdiction: string;
    effectiveDate: string | null;
    docType: 'LAW' | 'REGULATION' | 'STANDARD' | 'GUIDANCE' | 'TEMPLATE' | 'CHECKLIST' | 'CASE' | 'BOOK' | 'MOCK' | 'INTERNAL_POLICY' | 'OTHER';
    confidentiality: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED';
    topics: string[];
    entities: string[];
    summaryShort: string;
    summaryLong: string;
    keyPoints: string[];
    confidence: number;
}

export interface EnrichmentResult {
    output: EnrichmentOutput;
    model: string;
    promptVersion: string;
    tokensUsed?: number;
}

const PROMPT_VERSION = '1.0.0';
const DEFAULT_MODEL = 'gemini-1.5-flash';
const MAX_INPUT_CHARS = 50000; // Limit input to prevent token overflow

/**
 * Enrich a document with classification and summaries
 */
export async function enrichDocument(
    input: EnrichmentInput,
    options: { apiKey?: string; model?: string } = {}
): Promise<EnrichmentResult> {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is required for enrichment');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: options.model || DEFAULT_MODEL,
        generationConfig: {
            responseMimeType: 'application/json',
        },
    });

    // Truncate input if too long
    const maxChars = input.maxInputChars || MAX_INPUT_CHARS;
    const truncatedText = input.text.length > maxChars
        ? input.text.substring(0, maxChars) + '\n[TRUNCATED]'
        : input.text;

    const prompt = buildEnrichmentPrompt(truncatedText, input);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    let parsed: EnrichmentOutput;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        throw new Error(`Failed to parse enrichment response as JSON: ${text.substring(0, 200)}`);
    }

    // Validate output
    const validated = validateEnrichmentOutput(parsed);

    return {
        output: validated,
        model: options.model || DEFAULT_MODEL,
        promptVersion: PROMPT_VERSION,
        tokensUsed: response.usageMetadata?.totalTokenCount,
    };
}

/**
 * Build the enrichment prompt
 */
function buildEnrichmentPrompt(text: string, input: EnrichmentInput): string {
    return `You are a professional accounting and tax document classifier and summarizer.

Analyze the following document and return a JSON object with these fields:

{
  "standard": "IFRS|ISA|GAAP|TAX|AUDIT_METHODOLOGY|COMPANY_LAW|OTHER",
  "jurisdiction": "Country or region code (e.g., 'Malta', 'Rwanda', 'EU', 'US', 'International', 'Unknown')",
  "effectiveDate": "YYYY-MM-DD or null if not applicable",
  "docType": "LAW|REGULATION|STANDARD|GUIDANCE|TEMPLATE|CHECKLIST|CASE|BOOK|MOCK|INTERNAL_POLICY|OTHER",
  "confidentiality": "PUBLIC|INTERNAL|RESTRICTED",
  "topics": ["array of 3-7 relevant topics like 'VAT', 'Revenue Recognition', 'Leases'"],
  "entities": ["array of specific standards/laws referenced like 'IFRS 15', 'IAS 12', 'Section 123'"],
  "summaryShort": "One or two sentence summary",
  "summaryLong": "One to two paragraph detailed summary",
  "keyPoints": ["array of 3-5 key takeaways"],
  "confidence": 0.0 to 1.0 confidence score
}

Rules for classification:
- If the document is a published accounting standard (IFRS, GAAP), mark as PUBLIC
- If the document appears to be a copyrighted book or training material, mark as RESTRICTED
- If the document contains client-specific information, mark as RESTRICTED
- Internal firm policies and templates should be INTERNAL
- Government laws and regulations are PUBLIC
- Do NOT include verbatim long quotes in summaries

Document metadata:
- File name: ${input.fileName}
- Folder path: ${input.folderPath || 'Unknown'}
- MIME type: ${input.mimeType || 'Unknown'}

DOCUMENT TEXT:
${text}

Respond with ONLY the JSON object, no additional text.`;
}

/**
 * Validate enrichment output
 */
function validateEnrichmentOutput(output: unknown): EnrichmentOutput {
    if (!output || typeof output !== 'object') {
        throw new Error('Invalid enrichment output: expected object');
    }

    const obj = output as Record<string, unknown>;

    // Validate standard
    const validStandards = ['IFRS', 'ISA', 'GAAP', 'TAX', 'AUDIT_METHODOLOGY', 'COMPANY_LAW', 'OTHER'];
    const standard = validStandards.includes(obj.standard as string)
        ? (obj.standard as EnrichmentOutput['standard'])
        : 'OTHER';

    // Validate docType
    const validDocTypes = ['LAW', 'REGULATION', 'STANDARD', 'GUIDANCE', 'TEMPLATE', 'CHECKLIST', 'CASE', 'BOOK', 'MOCK', 'INTERNAL_POLICY', 'OTHER'];
    const docType = validDocTypes.includes(obj.docType as string)
        ? (obj.docType as EnrichmentOutput['docType'])
        : 'OTHER';

    // Validate confidentiality
    const validConfidentiality = ['PUBLIC', 'INTERNAL', 'RESTRICTED'];
    let confidentiality = validConfidentiality.includes(obj.confidentiality as string)
        ? (obj.confidentiality as EnrichmentOutput['confidentiality'])
        : 'INTERNAL';

    // Force RESTRICTED for books
    if (docType === 'BOOK') {
        confidentiality = 'RESTRICTED';
    }

    return {
        standard,
        jurisdiction: typeof obj.jurisdiction === 'string' ? obj.jurisdiction : 'Unknown',
        effectiveDate: typeof obj.effectiveDate === 'string' ? obj.effectiveDate : null,
        docType,
        confidentiality,
        topics: Array.isArray(obj.topics) ? obj.topics.filter((t): t is string => typeof t === 'string') : [],
        entities: Array.isArray(obj.entities) ? obj.entities.filter((e): e is string => typeof e === 'string') : [],
        summaryShort: typeof obj.summaryShort === 'string' ? obj.summaryShort : '',
        summaryLong: typeof obj.summaryLong === 'string' ? obj.summaryLong : '',
        keyPoints: Array.isArray(obj.keyPoints) ? obj.keyPoints.filter((k): k is string => typeof k === 'string') : [],
        confidence: typeof obj.confidence === 'number' ? Math.max(0, Math.min(1, obj.confidence)) : 0.5,
    };
}

/**
 * Check if document should be summary-only (copyright protection)
 */
export function isSummaryOnlyDocument(docType: EnrichmentOutput['docType']): boolean {
    return docType === 'BOOK';
}
