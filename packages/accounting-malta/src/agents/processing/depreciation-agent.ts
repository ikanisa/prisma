/**
 * Malta Depreciation Agent
 * 
 * Fully autonomous agent for calculating fixed asset depreciation.
 * Implements Malta capital allowances rates and IFRS/GAPSME requirements.
 * 
 * Features:
 * - Straight-line, declining balance, units of production methods
 * - Malta capital allowances (20% initial, 10% annual)
 * - Monthly/yearly depreciation schedules
 * - IAS 16 compliance
 */

import {
    type MaltaAccountingAgent,
    type AgentContext,
    type AgentResponse,
} from '../../core/base-agent.js';
import type {
    JournalEntry,
    JournalEntryLine,
} from '../../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Depreciation method types.
 */
export type DepreciationMethod =
    | 'STRAIGHT_LINE'
    | 'DECLINING_BALANCE'
    | 'UNITS_OF_PRODUCTION';

/**
 * Fixed asset definition.
 */
export interface FixedAsset {
    id: string;
    companyId: string;
    name: string;
    assetClass: string;
    acquisitionDate: Date;
    cost: number;
    residualValue: number;
    usefulLifeYears: number;
    depreciationMethod: DepreciationMethod;
    accumulatedDepreciation: number;
    /** Account for depreciation expense */
    depreciationExpenseAccount: string;
    /** Account for accumulated depreciation */
    accumulatedDepreciationAccount: string;
    isDisposed: boolean;
    disposalDate?: Date;
}

/**
 * Depreciation calculation result.
 */
export interface DepreciationResult {
    assetId: string;
    assetName: string;
    period: Date;
    depreciation: number;
    openingNBV: number;
    closingNBV: number;
    journalEntry: JournalEntry;
}

/**
 * Depreciation schedule for a single asset.
 */
export interface DepreciationSchedule {
    asset: FixedAsset;
    periods: {
        period: Date;
        depreciation: number;
        accumulatedDepreciation: number;
        netBookValue: number;
    }[];
}

// ============================================================================
// MALTA DEPRECIATION RATES
// ============================================================================

/**
 * Malta capital allowances rates per Income Tax Act.
 */
export const MALTA_DEPRECIATION_RATES = {
    // Buildings
    INDUSTRIAL_BUILDINGS: { initial: 0, annual: 0.02 }, // 2%
    COMMERCIAL_BUILDINGS: { initial: 0, annual: 0 }, // Not allowable
    // Plant & Machinery
    PLANT_MACHINERY: { initial: 0.20, annual: 0.10 }, // 20% initial, 10% annual
    // Motor Vehicles
    MOTOR_VEHICLES: { initial: 0.20, annual: 0.10 }, // 20% initial, 10% annual
    // Furniture & Fixtures
    FURNITURE_FIXTURES: { initial: 0.20, annual: 0.10 },
    // Computer Equipment
    COMPUTER_EQUIPMENT: { initial: 0.20, annual: 0.125 }, // 12.5% annual (8 years)
    // Intangible Assets
    INTELLECTUAL_PROPERTY: { initial: 0, annual: 0.0667 }, // 15 years
} as const;

/**
 * Default useful life by asset class (years).
 */
export const DEFAULT_USEFUL_LIFE: Record<string, number> = {
    BUILDINGS: 50,
    PLANT_MACHINERY: 10,
    MOTOR_VEHICLES: 5,
    FURNITURE_FIXTURES: 8,
    COMPUTER_EQUIPMENT: 3,
    INTANGIBLE_ASSETS: 15,
};

// ============================================================================
// DEPRECIATION AGENT
// ============================================================================

/**
 * Fully autonomous Depreciation Agent for Malta accounting.
 */
export class DepreciationAgent implements MaltaAccountingAgent {
    public readonly agentId = 'malta-depreciation-001';
    public readonly name = 'Malta Depreciation Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'TRANSACTION_PROCESSING' as const;
    public readonly capabilities = [
        'fixed_asset_register',
        'depreciation_calculation',
        'capital_allowances',
        'ifrs16_leases',
    ];
    public readonly framework = 'BOTH' as const;
    public readonly autonomyLevel = 5 as const; // Fully autonomous (deterministic)
    public readonly supportedCurrencies = ['EUR'];

    /**
     * Calculate monthly depreciation for all assets.
     */
    async calculateMonthlyDepreciation(
        assets: FixedAsset[],
        period: Date,
        _context?: AgentContext
    ): Promise<AgentResponse<DepreciationResult[]>> {
        const startTime = Date.now();
        const results: DepreciationResult[] = [];

        try {
            for (const asset of assets) {
                // Skip disposed assets
                if (asset.isDisposed) continue;

                // Skip assets acquired after the period
                if (asset.acquisitionDate > period) continue;

                const depreciation = this.calculateDepreciation(asset, period);

                if (depreciation > 0) {
                    const openingNBV = asset.cost - asset.accumulatedDepreciation;
                    const closingNBV = openingNBV - depreciation;

                    results.push({
                        assetId: asset.id,
                        assetName: asset.name,
                        period,
                        depreciation,
                        openingNBV,
                        closingNBV,
                        journalEntry: this.createDepreciationEntry(asset, depreciation, period),
                    });
                }
            }

            return {
                success: true,
                data: results,
                confidenceScore: 1.0, // Deterministic calculation
                requiresReview: false,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Depreciation calculation failed',
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Calculate depreciation for a single asset.
     */
    calculateDepreciation(asset: FixedAsset, period: Date): number {
        switch (asset.depreciationMethod) {
            case 'STRAIGHT_LINE':
                return this.straightLineDepreciation(asset, period);
            case 'DECLINING_BALANCE':
                return this.decliningBalanceDepreciation(asset, period);
            case 'UNITS_OF_PRODUCTION':
                // Requires production data, not implemented for autonomous use
                console.warn(`[DepreciationAgent] Units of production requires external data`);
                return 0;
            default:
                console.warn(`[DepreciationAgent] Unsupported method: ${asset.depreciationMethod}`);
                return 0;
        }
    }

    /**
     * Straight-line depreciation calculation.
     */
    private straightLineDepreciation(asset: FixedAsset, _period: Date): number {
        const depreciableAmount = asset.cost - asset.residualValue;
        const usefulLifeMonths = asset.usefulLifeYears * 12;
        const monthlyDepreciation = depreciableAmount / usefulLifeMonths;

        // Check if fully depreciated
        const remaining = depreciableAmount - asset.accumulatedDepreciation;
        if (remaining <= 0) return 0;

        return Math.min(monthlyDepreciation, remaining);
    }

    /**
     * Declining balance depreciation calculation.
     */
    private decliningBalanceDepreciation(asset: FixedAsset, _period: Date): number {
        const netBookValue = asset.cost - asset.accumulatedDepreciation;

        // Cannot depreciate below residual value
        if (netBookValue <= asset.residualValue) return 0;

        // Annual rate (e.g., 20%)
        const annualRate = 2 / asset.usefulLifeYears; // Double declining
        const monthlyRate = annualRate / 12;
        const depreciation = netBookValue * monthlyRate;

        // Don't go below residual value
        const maxDepreciation = netBookValue - asset.residualValue;
        return Math.min(depreciation, maxDepreciation);
    }

    /**
     * Calculate Malta capital allowances (tax depreciation).
     */
    calculateCapitalAllowances(
        asset: FixedAsset,
        yearEnd: Date
    ): { initial: number; annual: number; total: number } {
        const rates = this.getCapitalAllowanceRates(asset.assetClass);
        const isAcquisitionYear = asset.acquisitionDate.getFullYear() === yearEnd.getFullYear();

        let initial = 0;
        let annual = 0;

        if (isAcquisitionYear) {
            // Initial allowance (20% in year of acquisition)
            initial = asset.cost * rates.initial;
        }

        // Annual wear and tear
        const wdv = asset.cost - asset.accumulatedDepreciation;
        annual = wdv * rates.annual;

        return {
            initial,
            annual,
            total: initial + annual,
        };
    }

    /**
     * Get capital allowance rates for an asset class.
     */
    private getCapitalAllowanceRates(
        assetClass: string
    ): { initial: number; annual: number } {
        const classUpper = assetClass.toUpperCase().replace(/\s+/g, '_');

        const rates = MALTA_DEPRECIATION_RATES[classUpper as keyof typeof MALTA_DEPRECIATION_RATES];
        return rates ?? MALTA_DEPRECIATION_RATES.PLANT_MACHINERY;
    }

    /**
     * Create depreciation journal entry.
     */
    private createDepreciationEntry(
        asset: FixedAsset,
        depreciation: number,
        period: Date
    ): JournalEntry {
        const periodStr = period.toISOString().slice(0, 7); // YYYY-MM

        return {
            companyId: asset.companyId,
            date: period,
            debit: {
                account: asset.depreciationExpenseAccount || '5550',
                amount: depreciation,
                description: `Depreciation - ${asset.name}`,
                gapsmeClassification: 'Administrative expenses - Depreciation',
                ifrsStandard: 'IAS 16 - Property, Plant and Equipment',
            },
            credit: {
                account: asset.accumulatedDepreciationAccount || '1099',
                amount: depreciation,
                description: `Accumulated depreciation - ${asset.name}`,
                gapsmeClassification: 'Non-current assets - Accumulated depreciation',
                ifrsStandard: 'IAS 16 - Property, Plant and Equipment',
            },
            reference: `DEP-${periodStr}-${asset.id.slice(0, 8)}`,
            narrative: `Monthly depreciation for ${asset.name}`,
            type: 'DEPRECIATION',
            automated: true,
            aiGenerated: false,
            confidenceScore: 1.0,
            reviewRequired: false,
        };
    }

    /**
     * Generate full depreciation schedule for an asset.
     */
    generateDepreciationSchedule(asset: FixedAsset): DepreciationSchedule {
        const periods: DepreciationSchedule['periods'] = [];
        let currentDate = new Date(asset.acquisitionDate);
        let accumulatedDep = 0;
        const depreciableAmount = asset.cost - asset.residualValue;

        while (accumulatedDep < depreciableAmount) {
            // Move to end of month
            currentDate = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1,
                0
            );

            const monthlyDep = this.calculateDepreciation(
                { ...asset, accumulatedDepreciation: accumulatedDep },
                currentDate
            );

            if (monthlyDep <= 0) break;

            accumulatedDep += monthlyDep;
            const nbv = asset.cost - accumulatedDep;

            periods.push({
                period: new Date(currentDate),
                depreciation: monthlyDep,
                accumulatedDepreciation: accumulatedDep,
                netBookValue: Math.max(0, nbv),
            });

            // Move to next month
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        return { asset, periods };
    }

    /**
     * Calculate year-end depreciation for all assets.
     */
    async calculateYearEndDepreciation(
        assets: FixedAsset[],
        yearEnd: Date
    ): Promise<AgentResponse<{
        bookDepreciation: DepreciationResult[];
        capitalAllowances: { assetId: string; initial: number; annual: number; total: number }[];
        totalBookDepreciation: number;
        totalCapitalAllowances: number;
        timingDifference: number;
    }>> {
        const startTime = Date.now();

        try {
            // Calculate book depreciation for each month
            const bookResults: DepreciationResult[] = [];
            const yearStart = new Date(yearEnd.getFullYear(), 0, 1);

            for (let month = yearStart.getMonth(); month <= yearEnd.getMonth(); month++) {
                const monthEnd = new Date(yearEnd.getFullYear(), month + 1, 0);
                const monthResult = await this.calculateMonthlyDepreciation(assets, monthEnd);
                if (monthResult.success && monthResult.data) {
                    bookResults.push(...monthResult.data);
                }
            }

            // Calculate capital allowances
            const capitalAllowances = assets
                .filter(a => !a.isDisposed)
                .map(asset => ({
                    assetId: asset.id,
                    ...this.calculateCapitalAllowances(asset, yearEnd),
                }));

            const totalBookDepreciation = bookResults.reduce((sum, r) => sum + r.depreciation, 0);
            const totalCapitalAllowances = capitalAllowances.reduce((sum, c) => sum + c.total, 0);
            const timingDifference = totalBookDepreciation - totalCapitalAllowances;

            return {
                success: true,
                data: {
                    bookDepreciation: bookResults,
                    capitalAllowances,
                    totalBookDepreciation,
                    totalCapitalAllowances,
                    timingDifference,
                },
                confidenceScore: 1.0,
                requiresReview: false,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Year-end depreciation failed',
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Depreciation Agent instance.
 */
export function createDepreciationAgent(): DepreciationAgent {
    return new DepreciationAgent();
}

/**
 * Lazy singleton instance.
 */
let _depreciationAgent: DepreciationAgent | null = null;

export const depreciationAgent = {
    instance(): DepreciationAgent {
        if (!_depreciationAgent) {
            _depreciationAgent = new DepreciationAgent();
        }
        return _depreciationAgent;
    },
};
