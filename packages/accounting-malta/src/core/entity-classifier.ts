/**
 * Malta Entity Classifier
 * 
 * Classifies Malta companies into MICRO, SMALL, MEDIUM, LARGE, or PUBLIC_INTEREST
 * based on Companies Act 1995 (as amended) thresholds.
 * 
 * Classification determines:
 * - Accounting framework (GAPSME vs IFRS)
 * - Audit requirements
 * - Financial statement format
 * - Filing exemptions
 */

import {
    type MaltaEntityClassification,
    type EntityThresholds,
    type YearMetrics,
    type AccountingFrameworkSelection,
    MALTA_THRESHOLDS_2025,
} from '../types/index.js';

// ============================================================================
// ENTITY CLASSIFIER
// ============================================================================

/**
 * Malta Entity Classifier for determining company size classification.
 */
export class MaltaEntityClassifier {
    private thresholds: Record<MaltaEntityClassification, EntityThresholds>;

    constructor(thresholds?: Record<MaltaEntityClassification, EntityThresholds>) {
        this.thresholds = thresholds ?? MALTA_THRESHOLDS_2025;
    }

    /**
     * Classify a Malta entity based on current and prior year metrics.
     * Per Companies Act: Must exceed 2 out of 3 thresholds for 2 consecutive years
     * to move to a higher classification.
     */
    classify(
        currentYear: YearMetrics,
        priorYear: YearMetrics
    ): MaltaEntityClassification {
        // Test from largest to smallest classification
        if (this.testCategory('LARGE', currentYear, priorYear)) {
            return 'LARGE';
        }
        if (this.testCategory('MEDIUM', currentYear, priorYear)) {
            return 'MEDIUM';
        }
        if (this.testCategory('SMALL', currentYear, priorYear)) {
            return 'SMALL';
        }
        return 'MICRO';
    }

    /**
     * Test if entity exceeds a classification threshold for both years.
     */
    private testCategory(
        classification: MaltaEntityClassification,
        currentYear: YearMetrics,
        priorYear: YearMetrics
    ): boolean {
        const thresholds = this.thresholds[classification];
        const currentExceeds = this.exceedsThreshold(currentYear, thresholds);
        const priorExceeds = this.exceedsThreshold(priorYear, thresholds);
        return currentExceeds && priorExceeds;
    }

    /**
     * Check if metrics exceed 2 out of 3 thresholds (qualifies for higher classification).
     */
    private exceedsThreshold(metrics: YearMetrics, thresholds: EntityThresholds): boolean {
        let exceedCount = 0;
        if (metrics.totalAssets > thresholds.totalAssets) exceedCount++;
        if (metrics.turnover > thresholds.turnover) exceedCount++;
        if (metrics.averageEmployees > thresholds.averageEmployees) exceedCount++;
        return exceedCount >= 2;
    }

    /**
     * Get classification description.
     */
    getClassificationDescription(classification: MaltaEntityClassification): string {
        const descriptions: Record<MaltaEntityClassification, string> = {
            MICRO: 'Micro entity - Assets ≤€350K, Turnover ≤€700K, Employees ≤10',
            SMALL: 'Small entity - Assets ≤€4M, Turnover ≤€8M, Employees ≤50',
            MEDIUM: 'Medium entity - Assets ≤€20M, Turnover ≤€40M, Employees ≤250',
            LARGE: 'Large entity - Exceeds medium thresholds',
            PUBLIC_INTEREST: 'Public interest entity - Listed, regulated, or designated',
        };
        return descriptions[classification];
    }

    /**
     * Check how close an entity is to changing classification.
     */
    checkThresholdProximity(
        metrics: YearMetrics,
        currentClassification: MaltaEntityClassification
    ): {
        nearNextLevel: boolean;
        percentage: number;
        warning: string | null;
    } {
        // Find next higher classification
        const classificationOrder: MaltaEntityClassification[] = ['MICRO', 'SMALL', 'MEDIUM', 'LARGE'];
        const currentIndex = classificationOrder.indexOf(currentClassification);

        if (currentIndex === -1 || currentIndex >= classificationOrder.length - 1) {
            return { nearNextLevel: false, percentage: 0, warning: null };
        }

        const nextClassification = classificationOrder[currentIndex + 1];
        const nextThresholds = this.thresholds[nextClassification];

        // Calculate proximity to each threshold
        const assetProximity = metrics.totalAssets / nextThresholds.totalAssets;
        const turnoverProximity = metrics.turnover / nextThresholds.turnover;
        const employeeProximity = metrics.averageEmployees / nextThresholds.averageEmployees;

        const maxProximity = Math.max(assetProximity, turnoverProximity, employeeProximity);
        const nearNextLevel = maxProximity > 0.8;

        return {
            nearNextLevel,
            percentage: maxProximity * 100,
            warning: nearNextLevel
                ? `Entity is at ${(maxProximity * 100).toFixed(1)}% of ${nextClassification} thresholds. Classification may change if thresholds are exceeded for 2 consecutive years.`
                : null,
        };
    }
}

// ============================================================================
// FRAMEWORK SELECTOR
// ============================================================================

/**
 * Select appropriate accounting framework based on entity characteristics.
 */
export function selectAccountingFramework(
    classification: MaltaEntityClassification,
    options: {
        isListed?: boolean;
        isRegulated?: boolean;
        regulatedBy?: string;
        shareholderRequestIFRS?: boolean;
    } = {}
): AccountingFrameworkSelection {
    const { isListed, isRegulated, shareholderRequestIFRS } = options;

    // IFRS Mandatory: Listed entities
    if (isListed) {
        return {
            framework: 'IFRS',
            mandatory: true,
            auditRequired: true,
            simplificationAllowed: false,
            reason: 'IFRS mandatory for listed entities per EU IAS Regulation',
        };
    }

    // IFRS Mandatory: Regulated entities (MFSA, MGA, etc.)
    if (isRegulated) {
        return {
            framework: 'IFRS',
            mandatory: true,
            auditRequired: true,
            simplificationAllowed: false,
            reason: `IFRS mandatory for entities regulated by ${options.regulatedBy || 'financial regulator'}`,
        };
    }

    // IFRS Mandatory: Large entities
    if (classification === 'LARGE') {
        return {
            framework: 'IFRS',
            mandatory: true,
            auditRequired: true,
            simplificationAllowed: false,
            reason: 'IFRS mandatory for large entities per Companies Act',
        };
    }

    // IFRS Mandatory: Shareholder request (20%+ shareholder)
    if (shareholderRequestIFRS) {
        return {
            framework: 'IFRS',
            mandatory: true,
            auditRequired: true,
            simplificationAllowed: false,
            reason: 'IFRS required by qualifying shareholder request',
        };
    }

    // GAPSME Default for SMEs
    const auditRequired = classification !== 'MICRO'; // Micro may be exempt (LN 139/2025)

    return {
        framework: 'GAPSME',
        mandatory: false,
        auditRequired,
        simplificationAllowed: true,
        reason: `GAPSME applicable for ${classification.toLowerCase()} entities. IFRS may be elected.`,
    };
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Malta Entity Classifier instance.
 */
export function createEntityClassifier(
    customThresholds?: Record<MaltaEntityClassification, EntityThresholds>
): MaltaEntityClassifier {
    return new MaltaEntityClassifier(customThresholds);
}

/**
 * Default singleton instance.
 */
let _entityClassifier: MaltaEntityClassifier | null = null;

export const maltaEntityClassifier = {
    instance(): MaltaEntityClassifier {
        if (!_entityClassifier) {
            _entityClassifier = new MaltaEntityClassifier();
        }
        return _entityClassifier;
    },
};
