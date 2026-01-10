/**
 * CPA Handbook Reference Service
 * 
 * Provides RAG (Retrieval-Augmented Generation) capabilities for
 * CPA Canada Handbook standards lookup.
 * 
 * Supports:
 * - Part I: IFRS Standards
 * - Part II: ASPE (Accounting Standards for Private Enterprises)
 * - Part III: ASNFPO (Accounting Standards for Not-for-Profit Organizations)
 * - Part IV: PSAS (Public Sector Accounting Standards)
 * - Part V: Pre-changeover Accounting Standards
 * - Canadian Auditing Standards (CAS)
 * 
 * @package @prisma/accounting-canada
 */

// ============================================================================
// HANDBOOK REFERENCE TYPES
// ============================================================================

export type HandbookPart =
    | 'PART_I'      // IFRS
    | 'PART_II'     // ASPE
    | 'PART_III'    // ASNFPO
    | 'PART_IV'     // PSAS
    | 'CAS';        // Canadian Auditing Standards

export type StandardType =
    | 'IFRS'        // International Financial Reporting Standard
    | 'IAS'         // International Accounting Standard
    | 'ASPE'        // ASPE Section
    | 'ASNFPO'      // ASNFPO Section
    | 'PSAS'        // PSAS Section
    | 'CAS';        // Canadian Auditing Standard

export interface HandbookStandard {
    id: string;                     // e.g., "IFRS15", "ASPE3400", "CAS315"
    type: StandardType;
    number: string;                 // e.g., "15", "3400", "315"
    title: string;
    effectiveDate: Date;
    supersedes?: string[];          // IDs of superseded standards
    relatedStandards: string[];     // Cross-references
    lastAmended?: Date;
}

export interface StandardSection {
    standardId: string;
    sectionNumber: string;          // e.g., "15.35", "3400.05"
    title: string;
    content: string;                // Plain text content
    applicationGuidance?: string;
    illustrativeExamples?: string[];
    basisForConclusions?: string;
}

export interface HandbookQuery {
    query: string;
    standardTypes?: StandardType[];
    parts?: HandbookPart[];
    keywords?: string[];
    maxResults?: number;
}

export interface HandbookSearchResult {
    standard: HandbookStandard;
    sections: StandardSection[];
    relevanceScore: number;
    highlightedExcerpts: string[];
}

// ============================================================================
// STANDARD REFERENCE DATABASE
// ============================================================================

/**
 * Core Canadian accounting and auditing standards reference.
 * This serves as a knowledge base for agent context.
 */
export const HANDBOOK_STANDARDS: Record<string, HandbookStandard> = {
    // IFRS Standards (Part I)
    IFRS9: {
        id: 'IFRS9',
        type: 'IFRS',
        number: '9',
        title: 'Financial Instruments',
        effectiveDate: new Date('2018-01-01'),
        supersedes: ['IAS39'],
        relatedStandards: ['IFRS7', 'IFRS13'],
    },
    IFRS15: {
        id: 'IFRS15',
        type: 'IFRS',
        number: '15',
        title: 'Revenue from Contracts with Customers',
        effectiveDate: new Date('2018-01-01'),
        supersedes: ['IAS18', 'IAS11'],
        relatedStandards: ['IFRS9', 'IFRS16'],
    },
    IFRS16: {
        id: 'IFRS16',
        type: 'IFRS',
        number: '16',
        title: 'Leases',
        effectiveDate: new Date('2019-01-01'),
        supersedes: ['IAS17'],
        relatedStandards: ['IFRS15', 'IAS36'],
    },
    IAS36: {
        id: 'IAS36',
        type: 'IAS',
        number: '36',
        title: 'Impairment of Assets',
        effectiveDate: new Date('2004-03-31'),
        relatedStandards: ['IFRS3', 'IAS38'],
    },

    // ASPE Standards (Part II)
    ASPE1000: {
        id: 'ASPE1000',
        type: 'ASPE',
        number: '1000',
        title: 'Financial Statement Concepts',
        effectiveDate: new Date('2010-01-01'),
        relatedStandards: ['ASPE1400', 'ASPE1500'],
    },
    ASPE3400: {
        id: 'ASPE3400',
        type: 'ASPE',
        number: '3400',
        title: 'Revenue',
        effectiveDate: new Date('2010-01-01'),
        relatedStandards: ['ASPE3856', 'ASPE3065'],
    },
    ASPE3856: {
        id: 'ASPE3856',
        type: 'ASPE',
        number: '3856',
        title: 'Financial Instruments',
        effectiveDate: new Date('2010-01-01'),
        relatedStandards: ['ASPE3400', 'ASPE3861'],
    },
    ASPE3065: {
        id: 'ASPE3065',
        type: 'ASPE',
        number: '3065',
        title: 'Leases',
        effectiveDate: new Date('2010-01-01'),
        relatedStandards: ['ASPE3061', 'ASPE3800'],
    },

    // Canadian Auditing Standards
    CAS200: {
        id: 'CAS200',
        type: 'CAS',
        number: '200',
        title: 'Overall Objectives of the Independent Auditor',
        effectiveDate: new Date('2016-12-15'),
        relatedStandards: ['CAS210', 'CAS220'],
    },
    CAS315: {
        id: 'CAS315',
        type: 'CAS',
        number: '315',
        title: 'Identifying and Assessing the Risks of Material Misstatement',
        effectiveDate: new Date('2021-12-15'),
        relatedStandards: ['CAS240', 'CAS330', 'CAS540'],
        lastAmended: new Date('2021-12-15'),
    },
    CAS330: {
        id: 'CAS330',
        type: 'CAS',
        number: '330',
        title: "The Auditor's Responses to Assessed Risks",
        effectiveDate: new Date('2016-12-15'),
        relatedStandards: ['CAS315', 'CAS500'],
    },
    CAS540: {
        id: 'CAS540',
        type: 'CAS',
        number: '540',
        title: 'Auditing Accounting Estimates and Related Disclosures',
        effectiveDate: new Date('2019-12-15'),
        relatedStandards: ['CAS315', 'CAS500', 'CAS580'],
        lastAmended: new Date('2019-12-15'),
    },
    CAS570: {
        id: 'CAS570',
        type: 'CAS',
        number: '570',
        title: 'Going Concern',
        effectiveDate: new Date('2016-12-15'),
        relatedStandards: ['CAS700', 'CAS705', 'CAS706'],
    },
    CAS700: {
        id: 'CAS700',
        type: 'CAS',
        number: '700',
        title: 'Forming an Opinion and Reporting on Financial Statements',
        effectiveDate: new Date('2016-12-15'),
        relatedStandards: ['CAS701', 'CAS705', 'CAS706'],
    },
    CAS701: {
        id: 'CAS701',
        type: 'CAS',
        number: '701',
        title: 'Communicating Key Audit Matters in the Independent Auditor\'s Report',
        effectiveDate: new Date('2016-12-15'),
        relatedStandards: ['CAS700', 'CAS260'],
    },
};

// ============================================================================
// CPA HANDBOOK REFERENCE SERVICE
// ============================================================================

export interface CPAHandbookServiceConfig {
    enableVectorSearch: boolean;
    embeddingModel?: string;
    maxContextLength: number;
}

const DEFAULT_CONFIG: CPAHandbookServiceConfig = {
    enableVectorSearch: false,
    embeddingModel: undefined,
    maxContextLength: 4000,
};

export class CPAHandbookService {
    private config: CPAHandbookServiceConfig;

    constructor(config: Partial<CPAHandbookServiceConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Get standard by ID
     */
    getStandard(standardId: string): HandbookStandard | undefined {
        return HANDBOOK_STANDARDS[standardId];
    }

    /**
     * Search standards by keyword
     */
    searchStandards(query: HandbookQuery): HandbookSearchResult[] {
        const results: HandbookSearchResult[] = [];
        const queryLower = query.query.toLowerCase();
        const keywords = query.keywords?.map(k => k.toLowerCase()) || [];

        for (const [id, standard] of Object.entries(HANDBOOK_STANDARDS)) {
            // Filter by type if specified
            if (query.standardTypes && !query.standardTypes.includes(standard.type)) {
                continue;
            }

            // Simple keyword matching (would be replaced by vector search in production)
            const titleLower = standard.title.toLowerCase();
            let score = 0;

            if (titleLower.includes(queryLower)) {
                score += 1.0;
            }

            for (const keyword of keywords) {
                if (titleLower.includes(keyword)) {
                    score += 0.5;
                }
            }

            if (score > 0) {
                results.push({
                    standard,
                    sections: [], // Would be populated from vector DB in production
                    relevanceScore: score,
                    highlightedExcerpts: [standard.title],
                });
            }
        }

        // Sort by relevance
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);

        // Limit results
        return results.slice(0, query.maxResults || 10);
    }

    /**
     * Get related standards for a given standard
     */
    getRelatedStandards(standardId: string): HandbookStandard[] {
        const standard = this.getStandard(standardId);
        if (!standard) return [];

        return standard.relatedStandards
            .map(id => this.getStandard(id))
            .filter((s): s is HandbookStandard => s !== undefined);
    }

    /**
     * Get applicable framework for revenue recognition
     */
    getRevenueStandard(framework: 'IFRS' | 'ASPE'): HandbookStandard | undefined {
        return framework === 'IFRS'
            ? this.getStandard('IFRS15')
            : this.getStandard('ASPE3400');
    }

    /**
     * Get applicable financial instruments standard
     */
    getFinancialInstrumentsStandard(framework: 'IFRS' | 'ASPE'): HandbookStandard | undefined {
        return framework === 'IFRS'
            ? this.getStandard('IFRS9')
            : this.getStandard('ASPE3856');
    }

    /**
     * Get CAS standard for risk assessment
     */
    getRiskAssessmentStandard(): HandbookStandard | undefined {
        return this.getStandard('CAS315');
    }

    /**
     * Format standard reference for documentation
     */
    formatReference(standardId: string): string {
        const standard = this.getStandard(standardId);
        if (!standard) return standardId;

        return `${standard.type} ${standard.number} - ${standard.title}`;
    }

    /**
     * Get all standards of a specific type
     */
    getStandardsByType(type: StandardType): HandbookStandard[] {
        return Object.values(HANDBOOK_STANDARDS)
            .filter(s => s.type === type);
    }
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

let serviceInstance: CPAHandbookService | null = null;

export const cpaHandbookServiceFactory = {
    create: (config?: Partial<CPAHandbookServiceConfig>) =>
        new CPAHandbookService(config),
    instance: () => {
        if (!serviceInstance) {
            serviceInstance = new CPAHandbookService();
        }
        return serviceInstance;
    },
};

export const createCPAHandbookService = cpaHandbookServiceFactory.create;
export const getCPAHandbookService = cpaHandbookServiceFactory.instance;
