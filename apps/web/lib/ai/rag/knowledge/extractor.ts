/**
 * Knowledge Factory Extractor
 * 
 * Extracts text from PDFs, DOCX, HTML, TXT with page mapping
 * Supports OCR fallback via Google Document AI
 */

import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';

export interface PageMapping {
    page: number;
    startChar: number;
    endChar: number;
}

export interface ExtractionResult {
    text: string;
    pageMap: PageMapping[];
    charCount: number;
    tokenCount: number;
    extractorName: string;
    extractorVersion: string;
    headings?: HeadingInfo[];
    metadata?: Record<string, unknown>;
    requiresOcr?: boolean;
}

export interface HeadingInfo {
    level: number;
    text: string;
    charStart: number;
    charEnd: number;
}

export type SupportedMimeType =
    | 'application/pdf'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    | 'text/plain'
    | 'text/markdown'
    | 'text/html'
    | 'application/msword';

const EXTRACTOR_VERSION = '1.0.0';

/**
 * Extract text from a buffer based on mime type
 */
export async function extractText(
    buffer: Buffer,
    mimeType: string,
    options: { skipOcr?: boolean } = {}
): Promise<ExtractionResult> {
    const normalizedMime = normalizeMimeType(mimeType);

    switch (normalizedMime) {
        case 'application/pdf':
            return extractPdf(buffer, options);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
            return extractDocx(buffer);
        case 'text/html':
            return extractHtml(buffer);
        case 'text/plain':
        case 'text/markdown':
            return extractPlainText(buffer);
        default:
            throw new Error(`Unsupported mime type: ${mimeType}`);
    }
}

/**
 * PDF extraction with page mapping
 */
async function extractPdf(
    buffer: Buffer,
    options: { skipOcr?: boolean } = {}
): Promise<ExtractionResult> {
    try {
        const data = await pdfParse(buffer, {
            // Custom page renderer to get page boundaries
            pagerender: (pageData: any) => {
                return pageData.getTextContent().then((textContent: any) => {
                    return textContent.items.map((item: any) => item.str).join('');
                });
            },
        });

        // Build page map
        const pageMap: PageMapping[] = [];
        let totalChars = 0;

        if (data.text && data.numpages) {
            // Approximate page boundaries (pdf-parse doesn't provide exact boundaries)
            const avgCharsPerPage = Math.ceil(data.text.length / data.numpages);
            for (let i = 0; i < data.numpages; i++) {
                const startChar = i * avgCharsPerPage;
                const endChar = Math.min((i + 1) * avgCharsPerPage, data.text.length);
                pageMap.push({
                    page: i + 1,
                    startChar,
                    endChar,
                });
            }
            totalChars = data.text.length;
        }

        // Check if OCR is needed (very little text extracted)
        const requiresOcr = totalChars < 100 && data.numpages > 0;

        if (requiresOcr && !options.skipOcr) {
            console.log(JSON.stringify({
                level: 'info',
                msg: 'extractor.ocr_required',
                pages: data.numpages,
                extractedChars: totalChars,
            }));
        }

        return {
            text: data.text || '',
            pageMap,
            charCount: totalChars,
            tokenCount: estimateTokens(data.text || ''),
            extractorName: 'pdf-parse',
            extractorVersion: EXTRACTOR_VERSION,
            metadata: {
                pages: data.numpages,
                info: data.info,
            },
            requiresOcr,
        };
    } catch (error) {
        throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * DOCX extraction with heading detection
 */
async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
    try {
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value;

        // Extract headings from HTML conversion
        const htmlResult = await mammoth.convertToHtml({ buffer });
        const headings = extractHeadingsFromHtml(htmlResult.value, text);

        return {
            text,
            pageMap: [], // DOCX doesn't have reliable page mapping
            charCount: text.length,
            tokenCount: estimateTokens(text),
            extractorName: 'mammoth',
            extractorVersion: EXTRACTOR_VERSION,
            headings,
            metadata: {
                warnings: result.messages,
            },
        };
    } catch (error) {
        throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * HTML extraction
 */
function extractHtml(buffer: Buffer): ExtractionResult {
    const html = buffer.toString('utf-8');
    const $ = cheerio.load(html);

    // Remove scripts and styles
    $('script, style, noscript').remove();

    const text = $('body').text().replace(/\s+/g, ' ').trim();
    const headings = extractHeadingsFromCheerio($, text);

    return {
        text,
        pageMap: [],
        charCount: text.length,
        tokenCount: estimateTokens(text),
        extractorName: 'cheerio',
        extractorVersion: EXTRACTOR_VERSION,
        headings,
    };
}

/**
 * Plain text extraction
 */
function extractPlainText(buffer: Buffer): ExtractionResult {
    const text = buffer.toString('utf-8');

    // Detect markdown headings
    const headings: HeadingInfo[] = [];
    const lines = text.split('\n');
    let charPos = 0;

    for (const line of lines) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
            headings.push({
                level: match[1].length,
                text: match[2].trim(),
                charStart: charPos,
                charEnd: charPos + line.length,
            });
        }
        charPos += line.length + 1; // +1 for newline
    }

    return {
        text,
        pageMap: [],
        charCount: text.length,
        tokenCount: estimateTokens(text),
        extractorName: 'plaintext',
        extractorVersion: EXTRACTOR_VERSION,
        headings,
    };
}

/**
 * Extract headings from HTML
 */
function extractHeadingsFromHtml(html: string, plainText: string): HeadingInfo[] {
    const $ = cheerio.load(html);
    const headings: HeadingInfo[] = [];

    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
        const tagName = $(el).prop('tagName')?.toLowerCase() || 'h1';
        const level = parseInt(tagName.replace('h', ''), 10);
        const text = $(el).text().trim();

        // Find position in plain text
        const charStart = plainText.indexOf(text);
        if (charStart >= 0) {
            headings.push({
                level,
                text,
                charStart,
                charEnd: charStart + text.length,
            });
        }
    });

    return headings;
}

/**
 * Extract headings from Cheerio parsed document
 */
function extractHeadingsFromCheerio($: cheerio.CheerioAPI, plainText: string): HeadingInfo[] {
    return extractHeadingsFromHtml($.html(), plainText);
}

/**
 * Estimate token count (rough estimate: 1 token ≈ 4 chars)
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Normalize mime types
 */
function normalizeMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
        'application/pdf': 'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword': 'application/msword',
        'text/plain': 'text/plain',
        'text/markdown': 'text/markdown',
        'text/x-markdown': 'text/markdown',
        'text/html': 'text/html',
        'application/xhtml+xml': 'text/html',
    };

    return mimeMap[mimeType.toLowerCase()] || mimeType.toLowerCase();
}

/**
 * Check if mime type is supported
 */
export function isSupportedMimeType(mimeType: string): boolean {
    const supported = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'text/markdown',
        'text/x-markdown',
        'text/html',
        'application/xhtml+xml',
    ];
    return supported.includes(mimeType.toLowerCase());
}

/**
 * Generate content hash for idempotency
 */
export function generateContentHash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Find page number for a given character position
 */
export function getPageForPosition(pageMap: PageMapping[], charPos: number): number | null {
    for (const page of pageMap) {
        if (charPos >= page.startChar && charPos < page.endChar) {
            return page.page;
        }
    }
    return null;
}
