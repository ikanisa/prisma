/**
 * Malta Tax Knowledge Base
 * 
 * Vector database service for Malta tax legislation, CFR guidelines, and rulings.
 * Provides semantic search capabilities for AI agents.
 * 
 * Note: Uses ChromaDB for vector storage. In production, could also use
 * pgvector via Supabase for tighter integration.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface KnowledgeDocument {
    id: string;
    text: string;
    metadata: DocumentMetadata;
}

export interface DocumentMetadata {
    type: 'legislation' | 'guidance' | 'ruling' | 'circular' | 'case_law';
    source: string;
    chapter?: string;
    actNumber?: string;
    year?: number;
    lastUpdated: string;
    jurisdiction: 'MT';
    tags?: string[];
}

export interface SearchResult {
    document: string;
    metadata: DocumentMetadata;
    relevanceScore: number;
}

export interface KnowledgeBaseConfig {
    persistDirectory?: string;
    embeddingModel?: string;
}

// ============================================================================
// MALTA TAX LEGISLATION DATABASE
// ============================================================================

/**
 * Core Malta tax legislation documents
 * In production, these would be loaded from the actual legal texts
 */
const MALTA_TAX_LEGISLATION: KnowledgeDocument[] = [
    {
        id: 'income_tax_act_cap123',
        text: `# Income Tax Act (Cap. 123)

The Income Tax Act is the primary legislation governing income taxation in Malta.

## Key Provisions

### Corporate Tax Rate (Article 5)
The standard rate of income tax for companies is 35% of chargeable income.

### Full Imputation System (Article 4)
Malta operates a full imputation system where tax paid by a company is credited
to shareholders. When dividends are distributed, shareholders receive imputation
credits equal to the tax paid by the company.

### Tax Accounts (Article 4)
Companies must allocate income and tax to five tax accounts:
- MTA (Maltese Taxed Account): Malta-source trading income
- FIA (Foreign Income Account): Foreign dividends, interest, royalties, gains
- IPA (Immovable Property Account): Malta property income
- FTA (Final Tax Account): Income subject to final withholding
- UA (Untaxed Account): Exempt income

### Shareholder Refunds (Article 48)
Registered shareholders may claim refunds of tax paid by the company:
- 6/7ths refund: Trading income from MTA (effective 5% rate)
- 5/7ths refund: Passive foreign income (effective 10% rate)
- 2/3rds refund: Income with double taxation relief claimed

### Participation Exemption (Article 12)
Dividends and capital gains from qualifying participating holdings are exempt from tax.
Qualifying conditions:
- Equity holding ≥5% AND 2 of 3 rights (voting, profit, liquidation), OR
- Investment ≥€1,164,000 held for ≥183 days

Anti-abuse tests must be satisfied:
1. Investment test: Mainly qualifying investments
2. Tax test: Subject to comparable tax (15% safe harbor)
3. Active business test: Passive income <50%

### Double Taxation Relief (Articles 74-76)
Relief available through:
- Treaty relief under Malta's 72+ DTAs
- Unilateral relief (domestic law)
- Flat Rate Foreign Tax Credit (25% deemed credit)`,
        metadata: {
            type: 'legislation',
            source: 'Income Tax Act',
            chapter: '123',
            lastUpdated: '2025-01-01',
            jurisdiction: 'MT',
            tags: ['corporate_tax', 'imputation', 'refunds', 'participation_exemption'],
        },
    },
    {
        id: 'vat_act_xxiii_1998',
        text: `# Value Added Tax Act (Act XXIII of 1998)

The VAT Act governs value added tax in Malta, implementing EU VAT Directive 2006/112/EC.

## VAT Rates (2025)

### Standard Rate: 18%
Applies to most goods and services not covered by reduced rates or exemptions.

### Reduced Rate 12% (Schedule 6A)
- Custody and management of securities
- Credit guarantees management
- Pleasure boat hiring (specific conditions)

### Reduced Rate 7% (Schedule 6B)
- Hotel and tourist accommodation
- Sports facilities admission
- Cultural services
- Package travel within Malta

### Reduced Rate 5% (Schedule 6C)
- Electricity supply
- Confectionery
- Books, newspapers, periodicals
- Medical equipment and accessories
- Cultural events admission
- Minor renovation of dwellings

### Zero Rate (Schedule 4)
- Exports to third countries
- Intra-EU supplies (B2B with valid VAT number)
- Medicines for human use
- International transport
- Certain food items

### Exempt (Schedule 5)
- Insurance and reinsurance
- Financial transactions
- Education services
- Medical services
- Social welfare
- Postal services

## Registration Thresholds (Article 10/11)

### Article 10 (Standard Registration)
- Goods: Turnover exceeding €35,000
- Services: Turnover exceeding €30,000

### Article 11 (SME Exemption)
- Domestic turnover below €35,000 (increased from €30,000 in 2025)
- Annual return only, no VAT charged

### Article 11A (EU SME Scheme - 2025)
- EU-wide turnover below €100,000
- Allows cross-border exemption

## Intrastat Thresholds
Malta has the EU's lowest Intrastat thresholds:
- Arrivals: €700/month
- Dispatches: €700/month`,
        metadata: {
            type: 'legislation',
            source: 'VAT Act',
            actNumber: 'XXIII/1998',
            lastUpdated: '2025-01-01',
            jurisdiction: 'MT',
            tags: ['vat', 'rates', 'registration', 'sme'],
        },
    },
    {
        id: 'fitwi_regime_2025',
        text: `# Final Income Tax Without Imputation (FITWI) Regime

Introduced September 2025, the FITWI regime offers an alternative to the standard
full imputation system.

## Key Features

### Tax Rate
15% flat rate on chargeable income

### No Imputation
- No imputation credits generated
- No shareholder refunds available
- Single-tier taxation

### Eligibility
- Companies
- Bodies of persons taxed as companies
- Certain trusts

## Election Process

1. Formal election via board resolution
2. Email notification to [email protected]
3. Minimum 5-year binding period
4. Must stay in standard system 5 years before re-election

## Safeguard Rule

The "higher of" test ensures:
15% tax cannot be less than effective tax under standard system

Formula: Final Tax = MAX(15% × Income, Effective Tax with Refunds)

## Strategic Considerations

### Choose FITWI when:
- Shareholders cannot benefit from refunds
- Pillar Two exposure needs clarity
- Prefer simplified compliance
- Shareholders face high foreign tax on refunds

### Choose Standard System when:
- Shareholders can claim full refunds
- Effective rate below 15% achievable
- Flexibility needed for distributions
- Complex group structures with exemptions`,
        metadata: {
            type: 'guidance',
            source: 'Commissioner for Revenue',
            year: 2025,
            lastUpdated: '2025-09-01',
            jurisdiction: 'MT',
            tags: ['fitwi', 'corporate_tax', 'regime_choice'],
        },
    },
    {
        id: 'cfr_vat_guidance_2025',
        text: `# CFR VAT Guidance Notes 2025

## Filing Deadlines

VAT returns must be submitted by the 15th of the second month following the quarter end:
- Q1 (Jan-Mar): Due 15 May
- Q2 (Apr-Jun): Due 15 Aug
- Q3 (Jul-Sep): Due 15 Nov
- Q4 (Oct-Dec): Due 15 Feb (following year)

## Penalties for Late Filing

- 10% penalty on VAT due
- Interest at 0.54% per month

## Reverse Charge Mechanism

Applies to:
- B2B intra-EU supplies of goods
- B2B cross-border services
- Domestic construction services (specific)

Customer must:
- Account for VAT on acquisition
- May claim input VAT deduction if entitled

## Recapitulative Statement (EC Sales List)

Required for B2B intra-EU supplies
Deadline: 15th of month following supply
Quarterly filing if value < €50,000 per quarter

## E-Invoicing Requirements

From 2025, electronic invoicing encouraged
VIDA initiative will require:
- Structured e-invoices
- Real-time reporting (timeline TBD)`,
        metadata: {
            type: 'guidance',
            source: 'Commissioner for Revenue',
            year: 2025,
            lastUpdated: '2025-01-01',
            jurisdiction: 'MT',
            tags: ['vat', 'filing', 'deadlines', 'reverse_charge'],
        },
    },
];

// ============================================================================
// MALTA TAX KNOWLEDGE BASE
// ============================================================================

export class MaltaTaxKnowledgeBase {
    private documents: Map<string, KnowledgeDocument>;
    private config: KnowledgeBaseConfig;

    constructor(config: KnowledgeBaseConfig = {}) {
        this.config = config;
        this.documents = new Map();

        // Load core legislation
        this.loadCoreLegislation();
    }

    /**
     * Load core Malta tax legislation
     */
    private loadCoreLegislation(): void {
        for (const doc of MALTA_TAX_LEGISLATION) {
            this.documents.set(doc.id, doc);
        }
    }

    /**
     * Add document to knowledge base
     */
    addDocument(document: KnowledgeDocument): void {
        this.documents.set(document.id, document);
    }

    /**
     * Add multiple documents
     */
    addDocuments(documents: KnowledgeDocument[]): void {
        for (const doc of documents) {
            this.addDocument(doc);
        }
    }

    /**
     * Search knowledge base
     * 
     * Note: In production, this would use vector similarity search.
     * Current implementation uses keyword matching.
     */
    search(query: string, limit: number = 5): SearchResult[] {
        const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        const results: Array<{ doc: KnowledgeDocument; score: number }> = [];

        for (const doc of this.documents.values()) {
            let score = 0;
            const textLower = doc.text.toLowerCase();
            const tags = doc.metadata.tags || [];

            // Score based on term matches
            for (const term of queryTerms) {
                // Text matches
                const textMatches = (textLower.match(new RegExp(term, 'g')) || []).length;
                score += textMatches * 1;

                // Tag matches (higher weight)
                if (tags.some(tag => tag.includes(term))) {
                    score += 5;
                }

                // Source matches
                if (doc.metadata.source.toLowerCase().includes(term)) {
                    score += 3;
                }
            }

            if (score > 0) {
                results.push({ doc, score });
            }
        }

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);

        // Return top results
        return results.slice(0, limit).map(r => ({
            document: r.doc.text,
            metadata: r.doc.metadata,
            relevanceScore: r.score / (queryTerms.length * 10), // Normalize
        }));
    }

    /**
     * Get document by ID
     */
    getDocument(id: string): KnowledgeDocument | undefined {
        return this.documents.get(id);
    }

    /**
     * Get all documents by type
     */
    getDocumentsByType(type: DocumentMetadata['type']): KnowledgeDocument[] {
        return Array.from(this.documents.values()).filter(
            doc => doc.metadata.type === type
        );
    }

    /**
     * Get all documents with tag
     */
    getDocumentsByTag(tag: string): KnowledgeDocument[] {
        return Array.from(this.documents.values()).filter(
            doc => doc.metadata.tags?.includes(tag)
        );
    }

    /**
     * Query specific topic
     */
    queryTopic(topic: string): string | null {
        const results = this.search(topic, 1);
        return results.length > 0 ? results[0].document : null;
    }

    /**
     * Get VAT rate information
     */
    getVATRates(): string {
        return this.queryTopic('vat rates 2025') || 'VAT rate information not available';
    }

    /**
     * Get corporate tax information
     */
    getCorporateTaxRules(): string {
        return this.queryTopic('corporate tax rate imputation') || 'Corporate tax information not available';
    }

    /**
     * Get refund system information
     */
    getRefundSystem(): string {
        return this.queryTopic('shareholder refunds 6/7') || 'Refund system information not available';
    }

    /**
     * Get participation exemption rules
     */
    getParticipationExemption(): string {
        return this.queryTopic('participation exemption anti-abuse') || 'Participation exemption information not available';
    }

    /**
     * Get document count
     */
    getDocumentCount(): number {
        return this.documents.size;
    }

    /**
     * Get all document IDs
     */
    getDocumentIds(): string[] {
        return Array.from(this.documents.keys());
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create Malta Tax Knowledge Base
 */
export function createMaltaTaxKnowledgeBase(config?: KnowledgeBaseConfig): MaltaTaxKnowledgeBase {
    return new MaltaTaxKnowledgeBase(config);
}

/**
 * Singleton instance
 */
export const maltaTaxKnowledgeBase = new MaltaTaxKnowledgeBase();
