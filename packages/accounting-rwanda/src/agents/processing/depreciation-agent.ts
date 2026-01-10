/**
 * Rwanda Depreciation Agent
 * 
 * Calculates depreciation per IAS 16 Property, Plant and Equipment.
 * Supports multiple methods and generates journal entries.
 * 
 * Methods supported:
 * - Straight-line
 * - Reducing balance (declining)
 * - Units of production
 * 
 * Also handles Rwanda capital allowances for tax purposes.
 * 
 * @package @prisma/accounting-rwanda
 */

import type {
    RwandaAccountingAgent,
    AgentType,
    AutonomyLevel,
    AgentContext,
    AgentResponse,
} from '../../core/base-agent.js';
import { determineReviewRequirement } from '../../core/base-agent.js';
import type { RwandaAccountingFramework, JournalLine } from '../../types/index.js';

// ============================================================================
// DEPRECIATION TYPES
// ============================================================================

/**
 * Depreciation methods.
 */
export type DepreciationMethod = 'STRAIGHT_LINE' | 'REDUCING_BALANCE' | 'UNITS_OF_PRODUCTION';

/**
 * Asset category with default rates.
 */
export type AssetCategory =
    | 'BUILDINGS'
    | 'MACHINERY'
    | 'VEHICLES'
    | 'COMPUTERS'
    | 'FURNITURE'
    | 'INTANGIBLES'
    | 'LEASEHOLD_IMPROVEMENTS';

/**
 * Fixed asset record.
 */
export interface FixedAsset {
    assetId: string;
    assetName: string;
    category: AssetCategory;

    // Acquisition
    acquisitionDate: Date;
    acquisitionCost: number;
    residualValue: number;

    // Depreciation
    usefulLifeYears: number;
    depreciationMethod: DepreciationMethod;

    // For reducing balance
    depreciationRate?: number;

    // For units of production
    totalUnits?: number;
    usedUnits?: number;

    // Current state
    accumulatedDepreciation: number;
    netBookValue: number;

    // Status
    isActive: boolean;
    disposalDate?: Date;
    disposalProceeds?: number;
}

/**
 * Depreciation calculation result.
 */
export interface DepreciationResult {
    assetId: string;
    assetName: string;
    periodStart: Date;
    periodEnd: Date;

    openingCost: number;
    openingAccumulatedDepreciation: number;
    openingNetBookValue: number;

    depreciationForPeriod: number;

    closingCost: number;
    closingAccumulatedDepreciation: number;
    closingNetBookValue: number;

    method: DepreciationMethod;
    rateApplied: number;

    // Journal entry
    journalEntry: {
        debitAccount: string;
        creditAccount: string;
        amount: number;
        description: string;
    };

    // Tax (Rwanda capital allowances)
    taxDepreciation?: number;
    temporaryDifference?: number;
}

/**
 * Depreciation schedule for multiple assets.
 */
export interface DepreciationSchedule {
    periodStart: Date;
    periodEnd: Date;
    assetCount: number;

    totalDepreciation: number;
    totalTaxDepreciation?: number;

    byCategory: Record<AssetCategory, {
        count: number;
        openingNBV: number;
        depreciation: number;
        closingNBV: number;
    }>;

    assets: DepreciationResult[];

    journalEntry: {
        date: Date;
        entries: JournalLine[];
        totalDebit: number;
        totalCredit: number;
    };
}

// ============================================================================
// DEFAULT RATES
// ============================================================================

/**
 * Default depreciation rates by category (per Rwanda/IFRS practice).
 */
const DEFAULT_RATES: Record<AssetCategory, { years: number; rate: number }> = {
    BUILDINGS: { years: 20, rate: 5 },           // 5% straight-line
    MACHINERY: { years: 8, rate: 25 },            // 25% reducing balance
    VEHICLES: { years: 5, rate: 25 },             // 25% reducing balance
    COMPUTERS: { years: 3, rate: 50 },            // 50% reducing balance
    FURNITURE: { years: 8, rate: 12.5 },          // 12.5% reducing balance
    INTANGIBLES: { years: 5, rate: 20 },          // 20% straight-line
    LEASEHOLD_IMPROVEMENTS: { years: 10, rate: 10 },
};

/**
 * Rwanda capital allowance rates (for tax).
 */
const CAPITAL_ALLOWANCE_RATES: Record<AssetCategory, number> = {
    BUILDINGS: 5,
    MACHINERY: 25,
    VEHICLES: 25,
    COMPUTERS: 50,
    FURNITURE: 12.5,
    INTANGIBLES: 10,
    LEASEHOLD_IMPROVEMENTS: 10,
};

/**
 * Account mappings by category.
 */
const ASSET_ACCOUNTS: Record<AssetCategory, { asset: string; accumDep: string; expense: string }> = {
    BUILDINGS: { asset: '1211', accumDep: '1219', expense: '5420' },
    MACHINERY: { asset: '1213', accumDep: '1219', expense: '5420' },
    VEHICLES: { asset: '1214', accumDep: '1219', expense: '5420' },
    COMPUTERS: { asset: '1215', accumDep: '1219', expense: '5420' },
    FURNITURE: { asset: '1216', accumDep: '1219', expense: '5420' },
    INTANGIBLES: { asset: '1221', accumDep: '1229', expense: '5430' },
    LEASEHOLD_IMPROVEMENTS: { asset: '1212', accumDep: '1219', expense: '5420' },
};

// ============================================================================
// DEPRECIATION AGENT
// ============================================================================

/**
 * Rwanda Depreciation Agent.
 * 
 * Calculates depreciation per IAS 16 and generates journal entries.
 */
export class DepreciationAgent implements RwandaAccountingAgent {
    private static instance_: DepreciationAgent | null = null;

    readonly agentId = 'rwanda-depreciation-agent';
    readonly name = 'Rwanda Depreciation Agent';
    readonly version = '1.0.0';
    readonly agentType: AgentType = 'TRANSACTION_PROCESSING';
    readonly capabilities = [
        'Calculate straight-line depreciation',
        'Calculate reducing balance depreciation',
        'Calculate units of production depreciation',
        'Generate depreciation journal entries',
        'Handle partial-year depreciation',
        'Calculate Rwanda capital allowances',
        'Track deferred tax temporary differences',
    ];
    readonly framework: RwandaAccountingFramework | 'ALL' = 'ALL';
    readonly autonomyLevel: AutonomyLevel = 4;
    readonly supportedCurrencies = ['RWF'];

    private constructor() { }

    /**
     * Get singleton instance.
     */
    static instance(): DepreciationAgent {
        if (!DepreciationAgent.instance_) {
            DepreciationAgent.instance_ = new DepreciationAgent();
        }
        return DepreciationAgent.instance_;
    }

    /**
     * Calculate depreciation for a single asset.
     */
    calculateDepreciation(
        asset: FixedAsset,
        periodStart: Date,
        periodEnd: Date,
        includeTaxDepreciation: boolean = true
    ): DepreciationResult {
        // Skip if not active or already fully depreciated
        if (!asset.isActive || asset.netBookValue <= asset.residualValue) {
            return this.createZeroResult(asset, periodStart, periodEnd);
        }

        // Calculate depreciation based on method
        let depreciation: number;
        let rate: number;

        switch (asset.depreciationMethod) {
            case 'STRAIGHT_LINE':
                ({ depreciation, rate } = this.calculateStraightLine(asset, periodStart, periodEnd));
                break;
            case 'REDUCING_BALANCE':
                ({ depreciation, rate } = this.calculateReducingBalance(asset, periodStart, periodEnd));
                break;
            case 'UNITS_OF_PRODUCTION':
                ({ depreciation, rate } = this.calculateUnitsOfProduction(asset, periodStart, periodEnd));
                break;
            default:
                ({ depreciation, rate } = this.calculateStraightLine(asset, periodStart, periodEnd));
        }

        // Ensure we don't depreciate below residual value
        const maxDepreciation = asset.netBookValue - asset.residualValue;
        depreciation = Math.min(depreciation, maxDepreciation);
        depreciation = Math.max(0, depreciation);

        // Tax depreciation (capital allowances)
        let taxDepreciation: number | undefined;
        let temporaryDifference: number | undefined;

        if (includeTaxDepreciation) {
            taxDepreciation = this.calculateCapitalAllowance(asset, periodStart, periodEnd);
            temporaryDifference = taxDepreciation - depreciation;
        }

        // Get accounts
        const accounts = ASSET_ACCOUNTS[asset.category];

        return {
            assetId: asset.assetId,
            assetName: asset.assetName,
            periodStart,
            periodEnd,
            openingCost: asset.acquisitionCost,
            openingAccumulatedDepreciation: asset.accumulatedDepreciation,
            openingNetBookValue: asset.netBookValue,
            depreciationForPeriod: Math.round(depreciation),
            closingCost: asset.acquisitionCost,
            closingAccumulatedDepreciation: asset.accumulatedDepreciation + Math.round(depreciation),
            closingNetBookValue: asset.netBookValue - Math.round(depreciation),
            method: asset.depreciationMethod,
            rateApplied: rate,
            journalEntry: {
                debitAccount: accounts.expense,
                creditAccount: accounts.accumDep,
                amount: Math.round(depreciation),
                description: `Depreciation: ${asset.assetName} (${asset.depreciationMethod})`,
            },
            taxDepreciation,
            temporaryDifference,
        };
    }

    /**
     * Straight-line depreciation.
     */
    private calculateStraightLine(
        asset: FixedAsset,
        periodStart: Date,
        periodEnd: Date
    ): { depreciation: number; rate: number } {
        const depreciableAmount = asset.acquisitionCost - asset.residualValue;
        const annualDepreciation = depreciableAmount / asset.usefulLifeYears;

        const periodFraction = this.calculatePeriodFraction(asset, periodStart, periodEnd);
        const depreciation = annualDepreciation * periodFraction;
        const rate = (1 / asset.usefulLifeYears) * 100;

        return { depreciation, rate };
    }

    /**
     * Reducing balance (declining) depreciation.
     */
    private calculateReducingBalance(
        asset: FixedAsset,
        periodStart: Date,
        periodEnd: Date
    ): { depreciation: number; rate: number } {
        const rate = asset.depreciationRate || DEFAULT_RATES[asset.category].rate;
        const periodFraction = this.calculatePeriodFraction(asset, periodStart, periodEnd);
        const depreciation = asset.netBookValue * (rate / 100) * periodFraction;

        return { depreciation, rate };
    }

    /**
     * Units of production depreciation.
     */
    private calculateUnitsOfProduction(
        asset: FixedAsset,
        _periodStart: Date,
        _periodEnd: Date
    ): { depreciation: number; rate: number } {
        if (!asset.totalUnits || !asset.usedUnits) {
            return { depreciation: 0, rate: 0 };
        }

        const depreciableAmount = asset.acquisitionCost - asset.residualValue;
        const perUnitDepreciation = depreciableAmount / asset.totalUnits;
        const depreciation = perUnitDepreciation * asset.usedUnits;
        const rate = (asset.usedUnits / asset.totalUnits) * 100;

        return { depreciation, rate };
    }

    /**
     * Calculate Rwanda capital allowance (tax depreciation).
     */
    private calculateCapitalAllowance(
        asset: FixedAsset,
        periodStart: Date,
        periodEnd: Date
    ): number {
        const rate = CAPITAL_ALLOWANCE_RATES[asset.category];
        const periodFraction = this.calculatePeriodFraction(asset, periodStart, periodEnd);

        // Capital allowances typically use reducing balance
        return asset.netBookValue * (rate / 100) * periodFraction;
    }

    /**
     * Calculate period fraction (for partial-year depreciation).
     */
    private calculatePeriodFraction(
        asset: FixedAsset,
        periodStart: Date,
        periodEnd: Date
    ): number {
        const periodDays = this.daysBetween(periodStart, periodEnd) + 1;
        const yearDays = 365;

        // If asset acquired during period, prorate
        if (asset.acquisitionDate > periodStart) {
            const daysOwned = this.daysBetween(asset.acquisitionDate, periodEnd) + 1;
            return Math.min(daysOwned, periodDays) / yearDays;
        }

        return periodDays / yearDays;
    }

    /**
     * Calculate depreciation schedule for multiple assets.
     */
    async calculateDepreciationSchedule(
        assets: FixedAsset[],
        periodStart: Date,
        periodEnd: Date,
        context: AgentContext
    ): Promise<AgentResponse<DepreciationSchedule>> {
        const startTime = Date.now();

        try {
            const activeAssets = assets.filter(a => a.isActive);
            const results: DepreciationResult[] = [];

            // Calculate depreciation for each asset
            for (const asset of activeAssets) {
                const result = this.calculateDepreciation(asset, periodStart, periodEnd);
                if (result.depreciationForPeriod > 0) {
                    results.push(result);
                }
            }

            // Aggregate by category
            const byCategory: Record<AssetCategory, { count: number; openingNBV: number; depreciation: number; closingNBV: number }> = {
                BUILDINGS: { count: 0, openingNBV: 0, depreciation: 0, closingNBV: 0 },
                MACHINERY: { count: 0, openingNBV: 0, depreciation: 0, closingNBV: 0 },
                VEHICLES: { count: 0, openingNBV: 0, depreciation: 0, closingNBV: 0 },
                COMPUTERS: { count: 0, openingNBV: 0, depreciation: 0, closingNBV: 0 },
                FURNITURE: { count: 0, openingNBV: 0, depreciation: 0, closingNBV: 0 },
                INTANGIBLES: { count: 0, openingNBV: 0, depreciation: 0, closingNBV: 0 },
                LEASEHOLD_IMPROVEMENTS: { count: 0, openingNBV: 0, depreciation: 0, closingNBV: 0 },
            };

            for (const asset of activeAssets) {
                const result = results.find(r => r.assetId === asset.assetId);
                const cat = byCategory[asset.category];
                cat.count++;
                cat.openingNBV += asset.netBookValue;
                cat.depreciation += result?.depreciationForPeriod || 0;
                cat.closingNBV += result?.closingNetBookValue || asset.netBookValue;
            }

            // Build consolidated journal entry
            const totalDepreciation = results.reduce((sum, r) => sum + r.depreciationForPeriod, 0);
            const totalTaxDepreciation = results.reduce((sum, r) => sum + (r.taxDepreciation || 0), 0);

            const journalEntries: JournalLine[] = [
                {
                    accountCode: '5420',
                    accountName: 'Depreciation Expense',
                    debit: totalDepreciation,
                    description: `Monthly depreciation for ${results.length} assets`,
                },
                {
                    accountCode: '1219',
                    accountName: 'Accumulated Depreciation',
                    credit: totalDepreciation,
                    description: `Monthly depreciation for ${results.length} assets`,
                },
            ];

            const schedule: DepreciationSchedule = {
                periodStart,
                periodEnd,
                assetCount: results.length,
                totalDepreciation,
                totalTaxDepreciation,
                byCategory,
                assets: results,
                journalEntry: {
                    date: periodEnd,
                    entries: journalEntries,
                    totalDebit: totalDepreciation,
                    totalCredit: totalDepreciation,
                },
            };

            const reviewGate = determineReviewRequirement(0.95, totalDepreciation);

            return {
                success: true,
                data: schedule,
                confidenceScore: 0.95,
                requiresReview: reviewGate.required,
                reviewReason: reviewGate.reason,
                ifrsStandard: 'IAS 16',
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to calculate depreciation',
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Handle asset disposal.
     */
    calculateDisposal(
        asset: FixedAsset,
        disposalDate: Date,
        disposalProceeds: number
    ): {
        gainOrLoss: number;
        isGain: boolean;
        journalEntries: JournalLine[];
    } {
        const netBookValue = asset.netBookValue;
        const gainOrLoss = disposalProceeds - netBookValue;
        const isGain = gainOrLoss > 0;

        const accounts = ASSET_ACCOUNTS[asset.category];

        const journalEntries: JournalLine[] = [
            // Remove accumulated depreciation
            {
                accountCode: accounts.accumDep,
                accountName: 'Accumulated Depreciation',
                debit: asset.accumulatedDepreciation,
                description: `Disposal of ${asset.assetName}`,
            },
            // Record proceeds
            {
                accountCode: '1111',
                accountName: 'Cash',
                debit: disposalProceeds,
                description: `Proceeds from disposal of ${asset.assetName}`,
            },
            // Remove asset cost
            {
                accountCode: accounts.asset,
                accountName: 'Asset',
                credit: asset.acquisitionCost,
                description: `Disposal of ${asset.assetName}`,
            },
        ];

        // Record gain or loss
        if (isGain) {
            journalEntries.push({
                accountCode: '4920',
                accountName: 'Gain on Disposal of Assets',
                credit: gainOrLoss,
                description: `Gain on disposal of ${asset.assetName}`,
            });
        } else {
            journalEntries.push({
                accountCode: '5910',
                accountName: 'Loss on Disposal of Assets',
                debit: Math.abs(gainOrLoss),
                description: `Loss on disposal of ${asset.assetName}`,
            });
        }

        return { gainOrLoss, isGain, journalEntries };
    }

    /**
     * Get default rate for asset category.
     */
    getDefaultRate(category: AssetCategory): { years: number; rate: number } {
        return DEFAULT_RATES[category];
    }

    /**
     * Get capital allowance rate.
     */
    getCapitalAllowanceRate(category: AssetCategory): number {
        return CAPITAL_ALLOWANCE_RATES[category];
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private createZeroResult(
        asset: FixedAsset,
        periodStart: Date,
        periodEnd: Date
    ): DepreciationResult {
        const accounts = ASSET_ACCOUNTS[asset.category];
        return {
            assetId: asset.assetId,
            assetName: asset.assetName,
            periodStart,
            periodEnd,
            openingCost: asset.acquisitionCost,
            openingAccumulatedDepreciation: asset.accumulatedDepreciation,
            openingNetBookValue: asset.netBookValue,
            depreciationForPeriod: 0,
            closingCost: asset.acquisitionCost,
            closingAccumulatedDepreciation: asset.accumulatedDepreciation,
            closingNetBookValue: asset.netBookValue,
            method: asset.depreciationMethod,
            rateApplied: 0,
            journalEntry: {
                debitAccount: accounts.expense,
                creditAccount: accounts.accumDep,
                amount: 0,
                description: `No depreciation: ${asset.assetName}`,
            },
        };
    }

    private daysBetween(start: Date, end: Date): number {
        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
    }
}

/**
 * Factory function.
 */
export function createDepreciationAgent(): DepreciationAgent {
    return DepreciationAgent.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const depreciationAgent = {
    instance: () => DepreciationAgent.instance(),
};
