/**
 * Canada Accounting Standards Engine
 * 
 * Determines applicable accounting framework (IFRS/ASPE/ASNFPO/PSAS)
 * based on entity characteristics per CPA Canada Handbook Part I-IV.
 * 
 * Decision Logic:
 * - Public accountability → IFRS (Part I)
 * - Private enterprise (no public accountability) → ASPE (Part II) or IFRS election
 * - Not-for-profit → ASNFPO (Part III)
 * - Government/Crown → PSAS (Part IV)
 * - Quebec entities → Additional bilingual requirements
 * 
 * @package @prisma/accounting-canada
 */

import type {
    AccountingFramework,
    CanadianEntityProfile,
    CanadianProvince,
    FrameworkSelection,
    EntityType,
} from '../types/index.js';

import {
    type CanadaAccountingAgent,
    createAgentFactory,
} from './base-agent.js';

// ============================================================================
// FRAMEWORK SELECTION RULES
// ============================================================================

/**
 * Public accountability indicators per CPA Handbook
 * An entity has public accountability if:
 * 1. Its debt or equity instruments are traded in a public market
 * 2. It holds assets in a fiduciary capacity for a broad group
 */
const PUBLIC_ACCOUNTABILITY_CRITERIA = [
    'Listed on TSX, TSXV, CSE, or other Canadian exchange',
    'Securities registered with provincial securities commission',
    'Holds assets for depositors, policyholders, or unit holders',
    'Bank, credit union, insurance company, or investment fund',
];

/**
 * Revenue threshold for IFRS consideration (guidance, not mandatory)
 * PE-backed companies often choose IFRS for consistency with investors
 */
const IFRS_RECOMMENDED_REVENUE_THRESHOLD = 20_000_000; // CAD

// ============================================================================
// STANDARDS ENGINE
// ============================================================================

export interface StandardsEngineConfig {
    defaultPrivateFramework: 'IFRS' | 'ASPE';
    enableBilingualForQuebec: boolean;
    organizationId?: string;
    userId?: string;
}

const DEFAULT_CONFIG: StandardsEngineConfig = {
    defaultPrivateFramework: 'ASPE',
    enableBilingualForQuebec: true,
};

export class AccountingStandardsEngine implements CanadaAccountingAgent {
    public readonly slug = 'canada-standards-engine';
    public readonly name = 'Canada Accounting Standards Engine';
    public readonly version = '1.0.0';
    public readonly agentType = 'standards_engine' as const;

    private config: StandardsEngineConfig;

    constructor(config: Partial<StandardsEngineConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // =========================================================================
    // AGENT INTERFACE
    // =========================================================================

    getCapabilities(): string[] {
        return [
            'IFRS/ASPE/ASNFPO/PSAS framework selection',
            'Public accountability determination (CBCA S.155)',
            'Quebec bilingual requirement detection',
            'PE-backed entity IFRS recommendation',
            'Framework transition guidance',
        ];
    }

    supportsFramework(framework: AccountingFramework): boolean {
        return ['IFRS', 'ASPE', 'ASNFPO', 'PSAS'].includes(framework);
    }

    getSupportedFrameworks(): AccountingFramework[] {
        return ['IFRS', 'ASPE', 'ASNFPO', 'PSAS'];
    }

    // =========================================================================
    // FRAMEWORK SELECTION
    // =========================================================================

    /**
     * Select the appropriate accounting framework for an entity
     */
    selectFramework(entityProfile: CanadianEntityProfile): FrameworkSelection {
        // Step 1: Check for public accountability
        if (this.isPubliclyAccountable(entityProfile)) {
            return {
                framework: 'IFRS',
                reason: 'Entity has public accountability - IFRS required per CPA Handbook',
                alternativeAllowed: false,
                bilingualRequired: this.requiresBilingual(entityProfile),
                regulatoryReferences: [
                    'CPA Canada Handbook Part I',
                    'CBCA s. 155',
                    'Provincial Securities Acts',
                ],
            };
        }

        // Step 2: Check entity type
        if (entityProfile.entityType === 'not_for_profit') {
            return {
                framework: 'ASNFPO',
                reason: 'Not-for-profit entity - ASNFPO (Part III) applies',
                alternativeAllowed: true, // Can elect IFRS
                bilingualRequired: this.requiresBilingual(entityProfile),
                regulatoryReferences: [
                    'CPA Canada Handbook Part III',
                    'CRA T3010 Registered Charity Information Return',
                ],
            };
        }

        if (entityProfile.entityType === 'public_sector') {
            return {
                framework: 'PSAS',
                reason: 'Public sector entity - PSAS (Part IV) applies',
                alternativeAllowed: false,
                bilingualRequired: this.requiresBilingual(entityProfile),
                regulatoryReferences: [
                    'CPA Canada Handbook Part IV',
                    'PSAB Handbook',
                ],
            };
        }

        // Step 3: Private enterprise - ASPE or IFRS election
        return this.selectPrivateEnterpriseFramework(entityProfile);
    }

    /**
     * Determine if entity has public accountability
     */
    isPubliclyAccountable(entityProfile: CanadianEntityProfile): boolean {
        // Explicit flag
        if (entityProfile.isPubliclyAccountable) {
            return true;
        }

        // Public company type
        if (entityProfile.entityType === 'public_company') {
            return true;
        }

        // Note: Additional checks would typically include:
        // - Stock exchange listing verification
        // - Securities commission registration
        // - Fiduciary capacity (financial institutions)
        // These would be implemented with external API integrations

        return false;
    }

    /**
     * Select framework for private enterprises
     */
    private selectPrivateEnterpriseFramework(
        entityProfile: CanadianEntityProfile
    ): FrameworkSelection {
        const recommendations: string[] = [];
        let suggestIFRS = false;

        // PE investor typically requires IFRS for comparability
        if (entityProfile.hasPEInvestor) {
            recommendations.push('PE investor - IFRS recommended for investor comparability');
            suggestIFRS = true;
        }

        // Large private company may benefit from IFRS
        if (entityProfile.revenue > IFRS_RECOMMENDED_REVENUE_THRESHOLD) {
            recommendations.push(
                `Revenue exceeds $${IFRS_RECOMMENDED_REVENUE_THRESHOLD.toLocaleString()} - consider IFRS for stakeholder reporting`
            );
            suggestIFRS = true;
        }

        // Planning for IPO or sale
        // (Would need additional data point for this)

        const framework = suggestIFRS
            ? 'IFRS'
            : this.config.defaultPrivateFramework;

        return {
            framework,
            reason: suggestIFRS
                ? `Private enterprise with ${recommendations.join('; ')}`
                : 'Private enterprise without public accountability - ASPE permitted',
            alternativeAllowed: true, // Private entities can elect IFRS
            bilingualRequired: this.requiresBilingual(entityProfile),
            regulatoryReferences: [
                framework === 'IFRS'
                    ? 'CPA Canada Handbook Part I'
                    : 'CPA Canada Handbook Part II',
                'Provincial Business Corporations Acts',
            ],
        };
    }

    /**
     * Check if bilingual financial statements are required (Quebec)
     */
    requiresBilingual(entityProfile: CanadianEntityProfile): boolean {
        if (!this.config.enableBilingualForQuebec) {
            return false;
        }

        // Explicit requirement
        if (entityProfile.requiresBilingualFS) {
            return true;
        }

        // Incorporated in Quebec
        if (entityProfile.incorporationProvince === 'QC') {
            return true;
        }

        // Significant operations in Quebec
        if (entityProfile.operatingProvinces.includes('QC')) {
            // Apply Bill 96/2022 requirements
            // Companies with >= certain employees in Quebec must provide French
            return entityProfile.employees >= 25;
        }

        return false;
    }

    // =========================================================================
    // FRAMEWORK COMPARISON
    // =========================================================================

    /**
     * Get key differences between IFRS and ASPE
     */
    getFrameworkDifferences(): FrameworkDifference[] {
        return [
            {
                area: 'Revenue Recognition',
                ifrs: 'IFRS 15 - 5-step model with performance obligations',
                aspe: 'ASPE 3400 - Persuasive evidence, delivery, fixed price, collection',
                significance: 'high',
            },
            {
                area: 'Leases',
                ifrs: 'IFRS 16 - Single lessee model, all leases on balance sheet',
                aspe: 'ASPE 3065 - Operating/finance lease distinction',
                significance: 'high',
            },
            {
                area: 'Financial Instruments',
                ifrs: 'IFRS 9 - Business model + SPPI test, ECL',
                aspe: 'ASPE 3856 - Cost/FV categories, incurred loss',
                significance: 'high',
            },
            {
                area: 'Goodwill',
                ifrs: 'IAS 36 - Annual impairment test, no amortization',
                aspe: 'ASPE 3064 - Amortization over useful life (≤10 years)',
                significance: 'medium',
            },
            {
                area: 'Development Costs',
                ifrs: 'IAS 38 - Capitalize if criteria met',
                aspe: 'ASPE 3064 - Policy choice to expense or capitalize',
                significance: 'medium',
            },
            {
                area: 'Comprehensive Income',
                ifrs: 'Required - OCI for certain items',
                aspe: 'Not applicable - All changes through retained earnings',
                significance: 'medium',
            },
            {
                area: 'Related Party Transactions',
                ifrs: 'IAS 24 - Detailed disclosure required',
                aspe: 'ASPE 3840 - Measure at exchange amount or carrying amount',
                significance: 'medium',
            },
        ];
    }

    /**
     * Get transition requirements from ASPE to IFRS
     */
    getTransitionRequirements(): TransitionRequirement[] {
        return [
            {
                requirement: 'Opening IFRS Balance Sheet',
                description: 'Prepare at date of transition (beginning of earliest comparative)',
                mandatory: true,
                reference: 'IFRS 1.6',
            },
            {
                requirement: 'Reconciliations',
                description: 'Equity and total comprehensive income reconciliation',
                mandatory: true,
                reference: 'IFRS 1.24',
            },
            {
                requirement: 'Optional Exemptions',
                description: 'Business combinations, fair value as deemed cost, etc.',
                mandatory: false,
                reference: 'IFRS 1 Appendix D',
            },
            {
                requirement: 'Mandatory Exceptions',
                description: 'Estimates, derecognition, hedge accounting, NCI',
                mandatory: true,
                reference: 'IFRS 1 Appendix B',
            },
            {
                requirement: 'Comparative Information',
                description: 'At least one year of IFRS comparatives',
                mandatory: true,
                reference: 'IFRS 1.21',
            },
        ];
    }
}

// ============================================================================
// TYPES
// ============================================================================

export interface FrameworkDifference {
    area: string;
    ifrs: string;
    aspe: string;
    significance: 'high' | 'medium' | 'low';
}

export interface TransitionRequirement {
    requirement: string;
    description: string;
    mandatory: boolean;
    reference: string;
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

export const standardsEngineFactory = createAgentFactory(
    (config?: any) => new AccountingStandardsEngine(config)
);

export const createStandardsEngine = standardsEngineFactory.create;
export const standardsEngine = standardsEngineFactory;

/**
 * Convenience function for framework selection
 */
export function selectAccountingFramework(
    entityProfile: CanadianEntityProfile
): FrameworkSelection {
    return standardsEngineFactory.instance().selectFramework(entityProfile);
}
