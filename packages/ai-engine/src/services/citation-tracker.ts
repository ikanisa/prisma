/**
 * Citation Tracker
 * 
 * Tracks citations and provenance for RAG responses.
 * Extracts source references, formats inline citations,
 * and maintains audit trail of all retrieved sources.
 * 
 * @example
 * ```typescript
 * const tracker = new CitationTracker();
 * 
 * // Track sources used in response
 * const citations = tracker.extractCitations(searchResults);
 * 
 * // Format response with inline citations
 * const formatted = tracker.formatWithCitations(response, citations);
 * ```
 */

import type { SearchResult, SearchMetadata } from './hybrid-search.js';

// ============================================================================
// TYPES
// ============================================================================

export interface Citation {
    id: string;
    index: number;                // [1], [2], etc.
    source: CitationSource;
    relevanceScore: number;
    usedInResponse: boolean;
    extractedQuote?: string;
    pageReference?: string;
}

export interface CitationSource {
    type: 'standard' | 'regulation' | 'guidance' | 'internal' | 'workpaper';
    name: string;                  // e.g., "ISA 315", "IRC Section 482"
    section?: string;              // e.g., "Paragraph 12"
    title?: string;                // Full title
    url?: string;                  // Link to source
    jurisdiction?: string;
    effectiveDate?: Date;
    issuer?: string;               // e.g., "IAASB", "IRS"
}

export interface CitationSummary {
    totalCitations: number;
    byType: Record<string, number>;
    bySource: { name: string; count: number }[];
    primarySources: Citation[];
    citations: Citation[];
}

export interface FormattedResponse {
    text: string;
    textWithCitations: string;
    citations: Citation[];
    citationFootnotes: string[];
}

// ============================================================================
// SOURCE PATTERNS
// ============================================================================

const SOURCE_PATTERNS = {
    // ISA (International Standards on Auditing)
    isa: {
        pattern: /\bISA\s*(\d+)(?:\.(\d+))?(?:\s*\(Revised\s*(\d{4})\))?/gi,
        type: 'standard' as const,
        issuer: 'IAASB',
        formatName: (match: RegExpMatchArray) => `ISA ${match[1]}${match[2] ? `.${match[2]}` : ''}`,
    },

    // IFRS (International Financial Reporting Standards)
    ifrs: {
        pattern: /\bIFRS\s*(\d+)(?:\.(\d+))?/gi,
        type: 'standard' as const,
        issuer: 'IASB',
        formatName: (match: RegExpMatchArray) => `IFRS ${match[1]}${match[2] ? `.${match[2]}` : ''}`,
    },

    // IAS (International Accounting Standards)
    ias: {
        pattern: /\bIAS\s*(\d+)(?:\.(\d+))?/gi,
        type: 'standard' as const,
        issuer: 'IASB',
        formatName: (match: RegExpMatchArray) => `IAS ${match[1]}${match[2] ? `.${match[2]}` : ''}`,
    },

    // US GAAP / ASC
    asc: {
        pattern: /\bASC\s*(\d{3})(?:-(\d+))?(?:-(\d+))?/gi,
        type: 'standard' as const,
        issuer: 'FASB',
        formatName: (match: RegExpMatchArray) => `ASC ${match[1]}${match[2] ? `-${match[2]}` : ''}${match[3] ? `-${match[3]}` : ''}`,
    },

    // IRC (Internal Revenue Code)
    irc: {
        pattern: /\b(?:IRC|I\.R\.C\.)\s*(?:Section|§|Sec\.?)?\s*(\d+)(?:\(([a-z])\))?/gi,
        type: 'regulation' as const,
        issuer: 'IRS',
        jurisdiction: 'US',
        formatName: (match: RegExpMatchArray) => `IRC §${match[1]}${match[2] ? `(${match[2]})` : ''}`,
    },

    // Treasury Regulations
    treasReg: {
        pattern: /\b(?:Treas\.?\s*Reg\.?|Treasury\s*Regulation)\s*(?:Section|§)?\s*(\d+\.\d+)/gi,
        type: 'regulation' as const,
        issuer: 'Treasury',
        jurisdiction: 'US',
        formatName: (match: RegExpMatchArray) => `Treas. Reg. §${match[1]}`,
    },

    // PCAOB Standards
    pcaob: {
        pattern: /\bPCAOB\s*(?:AS|Standard)\s*(\d+)/gi,
        type: 'guidance' as const,
        issuer: 'PCAOB',
        jurisdiction: 'US',
        formatName: (match: RegExpMatchArray) => `PCAOB AS ${match[1]}`,
    },

    // SEC Rules
    sec: {
        pattern: /\bSEC\s*(?:Rule|Regulation)\s*([A-Z]?-?\d+[A-Za-z]*)/gi,
        type: 'guidance' as const,
        issuer: 'SEC',
        jurisdiction: 'US',
        formatName: (match: RegExpMatchArray) => `SEC Rule ${match[1]}`,
    },
};

// ============================================================================
// CITATION TRACKER
// ============================================================================

export class CitationTracker {
    private citations: Map<string, Citation> = new Map();
    private citationCounter: number = 0;

    /**
     * Extract citations from search results
     */
    extractCitations(results: SearchResult[]): Citation[] {
        const citations: Citation[] = [];

        for (const result of results) {
            const citation = this.createCitation(result);
            citations.push(citation);
            this.citations.set(citation.id, citation);
        }

        return citations;
    }

    /**
     * Extract standard/regulation references from text
     */
    extractReferencesFromText(text: string): CitationSource[] {
        const sources: CitationSource[] = [];
        const seen = new Set<string>();

        for (const [key, config] of Object.entries(SOURCE_PATTERNS)) {
            const matches = text.matchAll(config.pattern);

            for (const match of matches) {
                const name = config.formatName(match);
                if (seen.has(name)) continue;
                seen.add(name);

                sources.push({
                    type: config.type,
                    name,
                    issuer: config.issuer,
                    jurisdiction: 'jurisdiction' in config ? config.jurisdiction : undefined,
                });
            }
        }

        return sources;
    }

    /**
     * Format response with inline citations
     */
    formatWithCitations(
        response: string,
        citations: Citation[],
        style: 'inline' | 'footnote' | 'endnote' = 'inline'
    ): FormattedResponse {
        let textWithCitations = response;
        const usedCitations: Citation[] = [];
        const footnotes: string[] = [];

        // Find and mark citations based on content overlap
        for (const citation of citations) {
            const sourceRefs = this.findSourceReferences(response, citation);

            if (sourceRefs.length > 0) {
                citation.usedInResponse = true;
                usedCitations.push(citation);

                if (style === 'inline') {
                    // Add [n] after relevant sentences
                    for (const ref of sourceRefs) {
                        textWithCitations = textWithCitations.replace(
                            ref,
                            `${ref} [${citation.index}]`
                        );
                    }
                }

                footnotes.push(this.formatFootnote(citation));
            }
        }

        return {
            text: response,
            textWithCitations,
            citations: usedCitations,
            citationFootnotes: footnotes,
        };
    }

    /**
     * Get citation summary
     */
    getSummary(citations: Citation[]): CitationSummary {
        const byType: Record<string, number> = {};
        const sourceCount = new Map<string, number>();

        for (const citation of citations) {
            byType[citation.source.type] = (byType[citation.source.type] ?? 0) + 1;
            const sourceName = citation.source.name;
            sourceCount.set(sourceName, (sourceCount.get(sourceName) ?? 0) + 1);
        }

        const bySource = Array.from(sourceCount.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const primarySources = citations
            .filter(c => c.usedInResponse)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 5);

        return {
            totalCitations: citations.length,
            byType,
            bySource,
            primarySources,
            citations,
        };
    }

    /**
     * Generate bibliography/references section
     */
    generateBibliography(citations: Citation[]): string {
        const sorted = [...citations]
            .filter(c => c.usedInResponse)
            .sort((a, b) => a.index - b.index);

        const lines: string[] = ['## References', ''];

        for (const citation of sorted) {
            const source = citation.source;
            let entry = `[${citation.index}] `;

            if (source.issuer) {
                entry += `${source.issuer}. `;
            }

            entry += `*${source.name}*`;

            if (source.title) {
                entry += `: ${source.title}`;
            }

            if (source.section) {
                entry += `, ${source.section}`;
            }

            if (source.jurisdiction) {
                entry += ` (${source.jurisdiction})`;
            }

            if (source.url) {
                entry += `. Available at: ${source.url}`;
            }

            lines.push(entry);
        }

        return lines.join('\n');
    }

    /**
     * Reset citation counter
     */
    reset(): void {
        this.citations.clear();
        this.citationCounter = 0;
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private createCitation(result: SearchResult): Citation {
        this.citationCounter++;

        const source = this.extractSource(result.metadata);

        return {
            id: result.id,
            index: this.citationCounter,
            source,
            relevanceScore: result.score,
            usedInResponse: false,
            extractedQuote: this.extractBestQuote(result.content),
            pageReference: result.metadata.paragraph,
        };
    }

    private extractSource(metadata: SearchMetadata): CitationSource {
        // Try to parse structured source info
        const source: CitationSource = {
            type: this.mapSourceType(metadata.sourceType),
            name: metadata.title ?? metadata.source,
            section: metadata.section ?? metadata.paragraph,
            title: metadata.title,
            url: metadata.url,
            jurisdiction: metadata.jurisdiction,
        };

        // Try to identify issuer from source name
        if (source.name) {
            if (source.name.includes('ISA')) source.issuer = 'IAASB';
            else if (source.name.includes('IFRS') || source.name.includes('IAS')) source.issuer = 'IASB';
            else if (source.name.includes('ASC')) source.issuer = 'FASB';
            else if (source.name.includes('IRC')) source.issuer = 'IRS';
            else if (source.name.includes('PCAOB')) source.issuer = 'PCAOB';
        }

        return source;
    }

    private mapSourceType(type: SearchMetadata['sourceType']): CitationSource['type'] {
        switch (type) {
            case 'standard': return 'standard';
            case 'tax_code': return 'regulation';
            case 'guidance': return 'guidance';
            case 'workpaper': return 'workpaper';
            default: return 'internal';
        }
    }

    private extractBestQuote(content: string, maxLength: number = 200): string {
        // Get first substantial sentence
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
        if (sentences.length === 0) return content.slice(0, maxLength);

        const quote = sentences[0].trim();
        return quote.length > maxLength ? quote.slice(0, maxLength) + '...' : quote;
    }

    private findSourceReferences(response: string, citation: Citation): string[] {
        const refs: string[] = [];
        const source = citation.source;

        // Look for explicit mentions of the source
        const patterns = [
            new RegExp(`\\b${this.escapeRegex(source.name)}\\b`, 'gi'),
        ];

        if (source.issuer) {
            patterns.push(new RegExp(`\\b${this.escapeRegex(source.issuer)}\\b`, 'gi'));
        }

        // Find sentences containing references
        const sentences = response.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
            for (const pattern of patterns) {
                if (pattern.test(sentence) && !refs.includes(sentence)) {
                    refs.push(sentence.trim());
                    break;
                }
            }
        }

        return refs.slice(0, 3);
    }

    private formatFootnote(citation: Citation): string {
        const source = citation.source;
        let footnote = `[${citation.index}] ${source.name}`;

        if (source.section) {
            footnote += `, ${source.section}`;
        }

        if (source.issuer) {
            footnote += ` (${source.issuer})`;
        }

        return footnote;
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Export singleton
export const citationTracker = new CitationTracker();
