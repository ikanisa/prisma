/**
 * Rwanda Entity Classifier
 * 
 * Classifies entities per ICPAR requirements and determines 
 * applicable accounting framework and audit requirements.
 * 
 * Based on:
 * - ICPAR Law 11/2008
 * - Companies Act 2018
 * - BNR Directives
 * 
 * @package @prisma/accounting-rwanda
 */

import type {
    RwandaEntityType,
    RwandaEntityClassification,
    RwandaAccountingFramework,
    AuditTier,
} from '../types/index.js';
import { PIE_THRESHOLDS } from '../types/index.js';

// ============================================================================
// ENTITY INPUT
// ============================================================================

/**
 * Input for entity classification.
 */
export interface EntityClassificationInput {
    /** Annual turnover in RWF */
    annualTurnover: number;
    /** Total assets in RWF */
    totalAssets: number;
    /** Number of employees */
    employeeCount: number;
    /** Is the entity listed on Rwanda Stock Exchange? */
    isListed: boolean;
    /** Is the entity a bank or financial institution? */
    isBank: boolean;
    /** Is the entity an insurance company? */
    isInsurance: boolean;
    /** Is the entity a government entity? */
    isPublicSector: boolean;
    /** Public shareholding percentage (for listed companies) */
    publicShareholdingPercent?: number;
    /** Is microfinance cooperative? */
    isMicrofinanceCooperative?: boolean;
}

// ============================================================================
// CLASSIFICATION THRESHOLDS
// ============================================================================

/**
 * Rwanda entity classification thresholds.
 */
const CLASSIFICATION_THRESHOLDS = {
    // Large company thresholds
    LARGE_TURNOVER: 500_000_000,    // RWF 500M
    LARGE_ASSETS: 300_000_000,       // RWF 300M
    LARGE_EMPLOYEES: 100,

    // SME thresholds
    SME_TURNOVER: 100_000_000,       // RWF 100M
    SME_ASSETS: 50_000_000,          // RWF 50M
    SME_EMPLOYEES: 30,

    // Small company thresholds (audit exempt)
    SMALL_TURNOVER: 20_000_000,      // RWF 20M
    SMALL_ASSETS: 10_000_000,        // RWF 10M
    SMALL_EMPLOYEES: 10,
} as const;

// ============================================================================
// ENTITY CLASSIFIER
// ============================================================================

/**
 * Rwanda Entity Classifier agent.
 */
export class RwandaEntityClassifier {
    private static instance_: RwandaEntityClassifier | null = null;

    readonly agentId = 'rwanda-entity-classifier';
    readonly name = 'Rwanda Entity Classifier';
    readonly version = '1.0.0';

    private constructor() { }

    /**
     * Get singleton instance.
     */
    static instance(): RwandaEntityClassifier {
        if (!RwandaEntityClassifier.instance_) {
            RwandaEntityClassifier.instance_ = new RwandaEntityClassifier();
        }
        return RwandaEntityClassifier.instance_;
    }

    /**
     * Classify an entity based on Rwanda requirements.
     */
    classify(input: EntityClassificationInput): RwandaEntityClassification {
        const entityType = this.determineEntityType(input);
        const framework = this.determineFramework(entityType, input);
        const auditTier = this.determineAuditTier(entityType);

        return {
            entityType,
            requiredFramework: framework,
            requiredAuditTier: auditTier,
            isPIE: this.isPIE(entityType, input),
            requiresAudit: this.requiresAudit(entityType, input),
            requiresKAM: this.requiresKAM(entityType),
            bnrRegulated: input.isBank,
            thresholds: {
                annualTurnover: input.annualTurnover,
                totalAssets: input.totalAssets,
                employeeCount: input.employeeCount,
            },
        };
    }

    /**
     * Determine entity type.
     */
    private determineEntityType(input: EntityClassificationInput): RwandaEntityType {
        // Regulatory entities first
        if (input.isPublicSector) return 'PUBLIC_SECTOR';
        if (input.isBank) return 'BANK';
        if (input.isInsurance) return 'INSURANCE';
        if (input.isListed) return 'LISTED';

        // PIE threshold
        if (input.annualTurnover >= PIE_THRESHOLDS.ANNUAL_TURNOVER) {
            return 'PIE';
        }

        // Large private company
        if (
            input.annualTurnover >= CLASSIFICATION_THRESHOLDS.LARGE_TURNOVER ||
            input.totalAssets >= CLASSIFICATION_THRESHOLDS.LARGE_ASSETS ||
            input.employeeCount >= CLASSIFICATION_THRESHOLDS.LARGE_EMPLOYEES
        ) {
            return 'LARGE_PRIVATE';
        }

        // SME
        if (
            input.annualTurnover >= CLASSIFICATION_THRESHOLDS.SME_TURNOVER ||
            input.totalAssets >= CLASSIFICATION_THRESHOLDS.SME_ASSETS ||
            input.employeeCount >= CLASSIFICATION_THRESHOLDS.SME_EMPLOYEES
        ) {
            return 'SME';
        }

        // Small private
        return 'SMALL_PRIVATE';
    }

    /**
     * Determine accounting framework.
     */
    private determineFramework(
        entityType: RwandaEntityType,
        input: EntityClassificationInput
    ): RwandaAccountingFramework {
        // Public sector uses IPSAS
        if (entityType === 'PUBLIC_SECTOR') {
            return 'IPSAS';
        }

        // PIEs, banks, insurance, listed companies use Full IFRS
        if (['PIE', 'BANK', 'INSURANCE', 'LISTED', 'LARGE_PRIVATE'].includes(entityType)) {
            return 'FULL_IFRS';
        }

        // SMEs can use IFRS for SMEs
        return 'IFRS_FOR_SMES';
    }

    /**
     * Determine required audit tier.
     */
    private determineAuditTier(entityType: RwandaEntityType): AuditTier {
        // Tier I: Banks, listed companies, PIEs
        if (['BANK', 'INSURANCE', 'LISTED', 'PIE'].includes(entityType)) {
            return 'TIER_I';
        }

        // Tier II: Large private, SMEs requiring audit
        if (['LARGE_PRIVATE', 'SME'].includes(entityType)) {
            return 'TIER_II';
        }

        // Tier III: Small companies (if audit required)
        return 'TIER_III';
    }

    /**
     * Check if entity is a Public Interest Entity.
     */
    private isPIE(entityType: RwandaEntityType, input: EntityClassificationInput): boolean {
        return (
            entityType === 'PIE' ||
            entityType === 'BANK' ||
            entityType === 'INSURANCE' ||
            entityType === 'LISTED' ||
            input.annualTurnover >= PIE_THRESHOLDS.ANNUAL_TURNOVER
        );
    }

    /**
     * Check if entity requires statutory audit.
     */
    private requiresAudit(entityType: RwandaEntityType, input: EntityClassificationInput): boolean {
        // All PIEs, banks, insurance, listed companies require audit
        if (['PIE', 'BANK', 'INSURANCE', 'LISTED', 'PUBLIC_SECTOR'].includes(entityType)) {
            return true;
        }

        // Large private companies require audit
        if (entityType === 'LARGE_PRIVATE') {
            return true;
        }

        // SMEs require audit unless small enough
        if (entityType === 'SME') {
            return true;
        }

        // Small private companies may be exempt
        if (entityType === 'SMALL_PRIVATE') {
            return (
                input.annualTurnover > CLASSIFICATION_THRESHOLDS.SMALL_TURNOVER ||
                input.totalAssets > CLASSIFICATION_THRESHOLDS.SMALL_ASSETS ||
                input.employeeCount > CLASSIFICATION_THRESHOLDS.SMALL_EMPLOYEES
            );
        }

        return false;
    }

    /**
     * Check if entity requires Key Audit Matters reporting (ISA 701).
     */
    private requiresKAM(entityType: RwandaEntityType): boolean {
        // KAM required for all PIEs per ICPAR Circular 2019
        return ['PIE', 'BANK', 'INSURANCE', 'LISTED'].includes(entityType);
    }

    /**
     * Get CIT rate for entity.
     */
    getCITRate(input: EntityClassificationInput): number {
        // Microfinance cooperatives: 0% for 5 years
        if (input.isMicrofinanceCooperative) {
            return 0;
        }

        // Listed companies with public shareholding
        if (input.isListed && input.publicShareholdingPercent) {
            if (input.publicShareholdingPercent >= 40) {
                return 20;
            }
            if (input.publicShareholdingPercent >= 30) {
                return 25;
            }
        }

        // Standard rate
        return 28;
    }
}

/**
 * Factory function to create entity classifier.
 */
export function createEntityClassifier(): RwandaEntityClassifier {
    return RwandaEntityClassifier.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const rwandaEntityClassifier = {
    instance: () => RwandaEntityClassifier.instance(),
};

/**
 * Convenience function to select accounting framework.
 */
export function selectAccountingFramework(input: EntityClassificationInput): RwandaAccountingFramework {
    const classifier = RwandaEntityClassifier.instance();
    const classification = classifier.classify(input);
    return classification.requiredFramework;
}
