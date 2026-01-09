/**
 * Knowledge Factory Chunker
 * 
 * Splits documents into chunks with heading paths and page ranges
 * Target: 800-1200 tokens with 100-200 overlap
 */

import * as crypto from 'crypto';
import { encode, decode } from 'gpt-tokenizer';
import type { HeadingInfo, PageMapping } from './extractor.js';

export interface ChunkConfig {
    targetTokens: number;      // Default: 1000
    minTokens: number;         // Default: 800
    maxTokens: number;         // Default: 1200
    overlapTokens: number;     // Default: 150
    respectHeadings: boolean;  // Default: true
}

export interface Chunk {
    index: number;
    content: string;
    tokenCount: number;
    contentHash: string;
    headingPath: string | null;
    pageStart: number | null;
    pageEnd: number | null;
    charStart: number;
    charEnd: number;
}

export interface ChunkResult {
    chunks: Chunk[];
    totalTokens: number;
    config: ChunkConfig;
}

const DEFAULT_CONFIG: ChunkConfig = {
    targetTokens: 1000,
    minTokens: 800,
    maxTokens: 1200,
    overlapTokens: 150,
    respectHeadings: true,
};

/**
 * Chunk a document into overlapping segments
 */
export function chunkDocument(
    text: string,
    options: {
        config?: Partial<ChunkConfig>;
        headings?: HeadingInfo[];
        pageMap?: PageMapping[];
    } = {}
): ChunkResult {
    const config: ChunkConfig = { ...DEFAULT_CONFIG, ...options.config };
    const headings = options.headings || [];
    const pageMap = options.pageMap || [];

    // Tokenize entire text
    const tokens = encode(text);

    if (tokens.length <= config.maxTokens) {
        // Document fits in single chunk
        const content = text;
        return {
            chunks: [{
                index: 0,
                content,
                tokenCount: tokens.length,
                contentHash: hashContent(content),
                headingPath: buildHeadingPath(headings, 0),
                pageStart: getPageForChar(pageMap, 0),
                pageEnd: getPageForChar(pageMap, text.length - 1),
                charStart: 0,
                charEnd: text.length,
            }],
            totalTokens: tokens.length,
            config,
        };
    }

    const chunks: Chunk[] = [];
    let tokenIndex = 0;
    const stepSize = config.targetTokens - config.overlapTokens;

    while (tokenIndex < tokens.length) {
        let endTokenIndex = Math.min(tokenIndex + config.targetTokens, tokens.length);

        // Try to find a good break point (heading or paragraph boundary)
        if (config.respectHeadings && endTokenIndex < tokens.length) {
            endTokenIndex = findBreakPoint(tokens, tokenIndex, endTokenIndex, text, headings);
        }

        const chunkTokens = tokens.slice(tokenIndex, endTokenIndex);
        const content = decode(chunkTokens);

        // Calculate character positions
        const charStart = decode(tokens.slice(0, tokenIndex)).length;
        const charEnd = decode(tokens.slice(0, endTokenIndex)).length;

        chunks.push({
            index: chunks.length,
            content,
            tokenCount: chunkTokens.length,
            contentHash: hashContent(content),
            headingPath: buildHeadingPath(headings, charStart),
            pageStart: getPageForChar(pageMap, charStart),
            pageEnd: getPageForChar(pageMap, charEnd - 1),
            charStart,
            charEnd,
        });

        tokenIndex += stepSize;

        // Ensure we don't create tiny last chunk
        if (tokens.length - tokenIndex < config.minTokens && tokenIndex < tokens.length) {
            // Extend current chunk to end
            break;
        }
    }

    // Handle remaining content if any
    if (tokenIndex < tokens.length && chunks.length > 0) {
        const lastChunk = chunks[chunks.length - 1];
        const remainingTokens = tokens.slice(tokenIndex);
        const additionalContent = decode(remainingTokens);

        // If remaining is small, merge with last chunk
        if (remainingTokens.length < config.minTokens) {
            lastChunk.content += additionalContent;
            lastChunk.tokenCount += remainingTokens.length;
            lastChunk.charEnd = text.length;
            lastChunk.pageEnd = getPageForChar(pageMap, text.length - 1);
            lastChunk.contentHash = hashContent(lastChunk.content);
        } else {
            // Create new chunk
            const charStart = decode(tokens.slice(0, tokenIndex)).length;
            chunks.push({
                index: chunks.length,
                content: additionalContent,
                tokenCount: remainingTokens.length,
                contentHash: hashContent(additionalContent),
                headingPath: buildHeadingPath(headings, charStart),
                pageStart: getPageForChar(pageMap, charStart),
                pageEnd: getPageForChar(pageMap, text.length - 1),
                charStart,
                charEnd: text.length,
            });
        }
    }

    return {
        chunks,
        totalTokens: tokens.length,
        config,
    };
}

/**
 * Find a good break point near the target token index
 */
function findBreakPoint(
    tokens: number[],
    startIndex: number,
    targetIndex: number,
    text: string,
    headings: HeadingInfo[]
): number {
    // Look for heading boundaries within 20% of target
    const searchWindow = Math.floor((targetIndex - startIndex) * 0.2);
    const minIndex = targetIndex - searchWindow;
    const maxIndex = Math.min(targetIndex + searchWindow, tokens.length);

    // Get character positions
    const minChar = decode(tokens.slice(0, minIndex)).length;
    const maxChar = decode(tokens.slice(0, maxIndex)).length;

    // Check for heading starts in this range
    for (const heading of headings) {
        if (heading.charStart > minChar && heading.charStart < maxChar) {
            // Found a heading, break just before it
            const breakChar = heading.charStart;
            // Convert back to token index (approximate)
            const textBeforeBreak = text.substring(0, breakChar);
            return encode(textBeforeBreak).length;
        }
    }

    // Look for paragraph breaks
    const targetChar = decode(tokens.slice(0, targetIndex)).length;
    const textNearTarget = text.substring(minChar, maxChar);
    const doubleNewline = textNearTarget.lastIndexOf('\n\n');

    if (doubleNewline >= 0) {
        const breakChar = minChar + doubleNewline + 2;
        return encode(text.substring(0, breakChar)).length;
    }

    // Fall back to target
    return targetIndex;
}

/**
 * Build heading path for a character position
 */
function buildHeadingPath(headings: HeadingInfo[], charPos: number): string | null {
    if (!headings.length) return null;

    // Find all headings that come before this position
    const relevantHeadings = headings
        .filter(h => h.charStart <= charPos)
        .sort((a, b) => a.charStart - b.charStart);

    if (!relevantHeadings.length) return null;

    // Build hierarchical path
    const path: string[] = [];
    let currentLevel = 0;

    for (const heading of relevantHeadings) {
        if (heading.level <= currentLevel && path.length > 0) {
            // New heading at same or higher level, trim path
            while (path.length > 0 && heading.level <= currentLevel) {
                path.pop();
                currentLevel--;
            }
        }
        path.push(heading.text);
        currentLevel = heading.level;
    }

    return path.join(' > ') || null;
}

/**
 * Get page number for a character position
 */
function getPageForChar(pageMap: PageMapping[], charPos: number): number | null {
    for (const page of pageMap) {
        if (charPos >= page.startChar && charPos < page.endChar) {
            return page.page;
        }
    }
    return pageMap.length > 0 ? pageMap[pageMap.length - 1].page : null;
}

/**
 * Generate SHA256 hash of content
 */
function hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Count tokens in text
 */
export function countTokens(text: string): number {
    return encode(text).length;
}
