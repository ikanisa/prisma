/**
 * Malta iGaming Compliance Agent
 * 
 * Autonomous agent for MGA-licensed gaming operators compliance.
 * 
 * Legal Basis:
 * - Gaming Act (Cap. 583)
 * - Gaming Authorisations Regulations (S.L. 583.05)
 * - Gaming Compliance and Enforcement Regulations (S.L. 583.06)
 * - Prevention of Money Laundering Act (Cap. 373)
 * 
 * Features:
 * - GGR (Gross Gaming Revenue) calculation
 * - Player liability reconciliation
 * - Gaming duty computation (5% of GGR)
 * - B2C VAT zero-rating classification
 * - AML transaction monitoring
 * - MGA monthly/annual reporting
 * - Player fund segregation verification
 */

import OpenAI from 'openai';

// ============================================================================
// TYPES
// ============================================================================

export enum GameType {
    SLOTS = 'slots',
    TABLE_GAMES = 'table_games',
    LIVE_CASINO = 'live_casino',
    SPORTS_BETTING = 'sports_betting',
    POKER = 'poker',
    BINGO = 'bingo',
    LOTTERY = 'lottery',
    SKILL_GAMES = 'skill_games',
    VIRTUAL_SPORTS = 'virtual_sports',
    ESPORTS = 'esports',
}

export enum LicenseType {
    TYPE_1 = 'B2C',           // Player-facing gaming services
    TYPE_2 = 'B2B',           // Software/platform providers
    TYPE_3 = 'CRITICAL_B2B',  // Payment processing, identity verification
    TYPE_4 = 'MANAGEMENT',    // Gambling management services
}

export interface GamingTransaction {
    id: string;
    playerId: string;
    gameType: GameType;
    stake: number;
    payout: number;
    bonusPortion: number;
    wageringProgress: number;  // 0-1, bonus wagering completion
    timestamp: Date;
    currency: string;
    countryCode: string;  // Player country
    isB2C: boolean;
    jackpotContribution?: number;
    progressiveJackpotId?: string;
}

export interface GGRCalculation {
    periodStart: Date;
    periodEnd: Date;
    totalStakes: number;
    totalPayouts: number;
    grossGamingRevenue: number;
    bonusDeferred: number;
    jackpotContributions: number;
    netRevenue: number;
    byGameType: Record<GameType, {
        stakes: number;
        payouts: number;
        ggr: number;
    }>;
    transactionCount: number;
}

export interface GamingDutyCalculation {
    periodStart: Date;
    periodEnd: Date;
    grossGamingRevenue: number;
    dutyRate: number;
    dutyAmount: number;
    filingDeadline: Date;
    paymentDeadline: Date;
}

export interface PlayerLiability {
    playerId: string;
    accountBalance: number;
    pendingWithdrawals: number;
    bonusBalance: number;
    bonusWageringRemaining: number;
    totalLiability: number;
    lastActivityDate: Date;
    status: 'active' | 'dormant' | 'excluded' | 'closed';
}

export interface PlayerFundSegregation {
    asOfDate: Date;
    totalPlayerLiabilities: number;
    segregatedFunds: number;
    bankAccountBalance: number;
    shortfall: number;
    coverageRatio: number;
    isCompliant: boolean;
    bankAccounts: {
        accountNumber: string;
        bankName: string;
        balance: number;
        currency: string;
    }[];
}

export interface ProgressiveJackpot {
    jackpotId: string;
    name: string;
    currentValue: number;
    contributionRate: number;  // % of stake going to jackpot
    seedAmount: number;
    lastWonDate?: Date;
    lastWonAmount?: number;
    status: 'active' | 'frozen' | 'won';
}

export interface AMLAlert {
    alertId: string;
    playerId: string;
    alertType: 'large_transaction' | 'unusual_pattern' | 'high_velocity' | 'structuring' | 'multiple_accounts' | 'pep_match';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    transactionIds: string[];
    amount: number;
    timestamp: Date;
    status: 'open' | 'investigating' | 'escalated' | 'closed' | 'sar_filed';
    resolution?: string;
}

export interface MGAMonthlyReport {
    reportId: string;
    licenseNumber: string;
    periodStart: Date;
    periodEnd: Date;
    ggrCalculation: GGRCalculation;
    gamingDuty: GamingDutyCalculation;
    playerStatistics: {
        activePlayersCount: number;
        newRegistrations: number;
        selfExclusions: number;
        dormantAccounts: number;
    };
    financialSummary: {
        totalDeposits: number;
        totalWithdrawals: number;
        netPlayerFlow: number;
    };
    amlSummary: {
        alertsGenerated: number;
        alertsClosed: number;
        sarsFiles: number;
    };
    submissionDeadline: Date;
    status: 'draft' | 'submitted' | 'accepted';
}

export interface iGamingAgentConfig {
    openaiApiKey?: string;
    mgaLicenseNumber?: string;
    enableAMLMonitoring?: boolean;
    amlThresholds?: {
        singleTransactionLimit: number;
        dailyVolumeLimit: number;
        velocityThreshold: number;
    };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GAMING_DUTY_RATE = 0.05;  // 5% of GGR

const DEFAULT_AML_THRESHOLDS = {
    singleTransactionLimit: 10000,  // €10,000 single transaction
    dailyVolumeLimit: 25000,        // €25,000 daily volume
    velocityThreshold: 5,           // 5 large transactions per hour
};

const PROGRESSIVE_JACKPOT_CONTRIBUTION_RATE = 0.02;  // 2% default

// MGA reporting deadlines
const MGA_MONTHLY_REPORT_DUE_DAY = 15;  // Due by 15th of following month
const MGA_ANNUAL_REPORT_DUE_MONTHS = 3; // 3 months after year-end

// ============================================================================
// iGAMING COMPLIANCE AGENT
// ============================================================================

export class iGamingComplianceAgent {
    public readonly name = 'Malta iGaming Compliance Agent';
    public readonly version = '1.0.0';
    public readonly category = 'tax';
    public readonly type = 'specialist';

    private openai: OpenAI | null = null;
    private config: iGamingAgentConfig;
    private amlThresholds: typeof DEFAULT_AML_THRESHOLDS;

    constructor(config: iGamingAgentConfig = {}) {
        this.config = config;
        this.amlThresholds = {
            ...DEFAULT_AML_THRESHOLDS,
            ...config.amlThresholds,
        };

        const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
        if (apiKey) {
            try {
                this.openai = new OpenAI({ apiKey });
            } catch {
                this.openai = null;
            }
        }
    }

    // ============================================================================
    // GGR CALCULATION
    // ============================================================================

    /**
     * Calculate Gross Gaming Revenue for a period
     * GGR = Total Stakes - Total Payouts
     */
    calculateGGR(transactions: GamingTransaction[], periodStart: Date, periodEnd: Date): GGRCalculation {
        // Filter transactions in period
        const periodTransactions = transactions.filter(
            t => t.timestamp >= periodStart && t.timestamp <= periodEnd
        );

        // Initialize aggregation
        const byGameType: Record<GameType, { stakes: number; payouts: number; ggr: number }> =
            Object.values(GameType).reduce((acc, type) => ({
                ...acc,
                [type]: { stakes: 0, payouts: 0, ggr: 0 },
            }), {} as Record<GameType, { stakes: number; payouts: number; ggr: number }>);

        let totalStakes = 0;
        let totalPayouts = 0;
        let bonusDeferred = 0;
        let jackpotContributions = 0;

        for (const txn of periodTransactions) {
            totalStakes += txn.stake;
            totalPayouts += txn.payout;

            // Track by game type
            if (byGameType[txn.gameType]) {
                byGameType[txn.gameType].stakes += txn.stake;
                byGameType[txn.gameType].payouts += txn.payout;
                byGameType[txn.gameType].ggr += (txn.stake - txn.payout);
            }

            // IFRS 15: Defer bonus portion not yet earned
            if (txn.bonusPortion > 0 && txn.wageringProgress < 1) {
                bonusDeferred += txn.bonusPortion * (1 - txn.wageringProgress);
            }

            // Track jackpot contributions
            if (txn.jackpotContribution) {
                jackpotContributions += txn.jackpotContribution;
            }
        }

        const grossGamingRevenue = totalStakes - totalPayouts;
        const netRevenue = grossGamingRevenue - bonusDeferred - jackpotContributions;

        return {
            periodStart,
            periodEnd,
            totalStakes: this.roundCurrency(totalStakes),
            totalPayouts: this.roundCurrency(totalPayouts),
            grossGamingRevenue: this.roundCurrency(grossGamingRevenue),
            bonusDeferred: this.roundCurrency(bonusDeferred),
            jackpotContributions: this.roundCurrency(jackpotContributions),
            netRevenue: this.roundCurrency(netRevenue),
            byGameType,
            transactionCount: periodTransactions.length,
        };
    }

    // ============================================================================
    // GAMING DUTY CALCULATION
    // ============================================================================

    /**
     * Calculate gaming duty (5% of GGR)
     */
    calculateGamingDuty(ggrCalculation: GGRCalculation): GamingDutyCalculation {
        const dutyAmount = ggrCalculation.grossGamingRevenue * GAMING_DUTY_RATE;

        // Filing deadline: 15th of following month
        const filingDeadline = new Date(ggrCalculation.periodEnd);
        filingDeadline.setMonth(filingDeadline.getMonth() + 1);
        filingDeadline.setDate(MGA_MONTHLY_REPORT_DUE_DAY);

        // Payment deadline: same as filing
        const paymentDeadline = new Date(filingDeadline);

        return {
            periodStart: ggrCalculation.periodStart,
            periodEnd: ggrCalculation.periodEnd,
            grossGamingRevenue: ggrCalculation.grossGamingRevenue,
            dutyRate: GAMING_DUTY_RATE,
            dutyAmount: this.roundCurrency(dutyAmount),
            filingDeadline,
            paymentDeadline,
        };
    }

    // ============================================================================
    // PLAYER LIABILITY RECONCILIATION
    // ============================================================================

    /**
     * Calculate total player liabilities
     */
    calculatePlayerLiabilities(players: PlayerLiability[]): {
        totalAccountBalance: number;
        totalPendingWithdrawals: number;
        totalBonusBalance: number;
        grandTotalLiability: number;
        activePlayerCount: number;
        dormantPlayerCount: number;
    } {
        const activePlayers = players.filter(p => p.status === 'active');
        const dormantPlayers = players.filter(p => p.status === 'dormant');

        const totalAccountBalance = players.reduce((sum, p) => sum + p.accountBalance, 0);
        const totalPendingWithdrawals = players.reduce((sum, p) => sum + p.pendingWithdrawals, 0);
        const totalBonusBalance = players.reduce((sum, p) => sum + p.bonusBalance, 0);
        const grandTotalLiability = players.reduce((sum, p) => sum + p.totalLiability, 0);

        return {
            totalAccountBalance: this.roundCurrency(totalAccountBalance),
            totalPendingWithdrawals: this.roundCurrency(totalPendingWithdrawals),
            totalBonusBalance: this.roundCurrency(totalBonusBalance),
            grandTotalLiability: this.roundCurrency(grandTotalLiability),
            activePlayerCount: activePlayers.length,
            dormantPlayerCount: dormantPlayers.length,
        };
    }

    /**
     * Verify player fund segregation compliance
     */
    verifyFundSegregation(
        playerLiabilities: PlayerLiability[],
        bankAccounts: { accountNumber: string; bankName: string; balance: number; currency: string }[]
    ): PlayerFundSegregation {
        const liabilities = this.calculatePlayerLiabilities(playerLiabilities);
        const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

        const shortfall = Math.max(0, liabilities.grandTotalLiability - totalBankBalance);
        const coverageRatio = liabilities.grandTotalLiability > 0
            ? totalBankBalance / liabilities.grandTotalLiability
            : 1;

        return {
            asOfDate: new Date(),
            totalPlayerLiabilities: liabilities.grandTotalLiability,
            segregatedFunds: totalBankBalance,
            bankAccountBalance: this.roundCurrency(totalBankBalance),
            shortfall: this.roundCurrency(shortfall),
            coverageRatio: Math.round(coverageRatio * 10000) / 100,  // e.g., 105.50%
            isCompliant: coverageRatio >= 1,  // Must cover 100% of liabilities
            bankAccounts,
        };
    }

    // ============================================================================
    // PROGRESSIVE JACKPOT MANAGEMENT
    // ============================================================================

    /**
     * Calculate progressive jackpot liability (IFRS 15)
     */
    calculateJackpotLiability(jackpots: ProgressiveJackpot[]): {
        totalJackpotLiability: number;
        activeJackpots: number;
        largestJackpot: { name: string; value: number } | null;
        jackpots: ProgressiveJackpot[];
    } {
        const activeJackpots = jackpots.filter(j => j.status === 'active');
        const totalLiability = activeJackpots.reduce((sum, j) => sum + j.currentValue, 0);

        const sorted = [...activeJackpots].sort((a, b) => b.currentValue - a.currentValue);
        const largest = sorted[0] ? { name: sorted[0].name, value: sorted[0].currentValue } : null;

        return {
            totalJackpotLiability: this.roundCurrency(totalLiability),
            activeJackpots: activeJackpots.length,
            largestJackpot: largest,
            jackpots,
        };
    }

    /**
     * Process jackpot contribution from transaction
     */
    processJackpotContribution(
        transaction: GamingTransaction,
        jackpot: ProgressiveJackpot
    ): { jackpotContribution: number; updatedJackpotValue: number } {
        const contributionRate = jackpot.contributionRate || PROGRESSIVE_JACKPOT_CONTRIBUTION_RATE;
        const contribution = transaction.stake * contributionRate;

        return {
            jackpotContribution: this.roundCurrency(contribution),
            updatedJackpotValue: this.roundCurrency(jackpot.currentValue + contribution),
        };
    }

    // ============================================================================
    // B2C VAT ZERO-RATING
    // ============================================================================

    /**
     * Classify transaction for VAT treatment
     * B2C gaming services are zero-rated in Malta
     */
    classifyVATTreatment(transaction: GamingTransaction): {
        vatRate: number;
        classification: string;
        reasoning: string;
    } {
        // B2C gaming (consumer) = zero-rated
        if (transaction.isB2C) {
            return {
                vatRate: 0,
                classification: 'Zero-rated (B2C Gaming)',
                reasoning: 'Gaming services to consumers are zero-rated per Gaming Act Cap. 583 to avoid double taxation with gaming duty',
            };
        }

        // B2B gaming services = standard 18% VAT
        return {
            vatRate: 0.18,
            classification: 'Standard 18% (B2B Services)',
            reasoning: 'B2B gaming platform/software services are subject to standard VAT rate',
        };
    }

    // ============================================================================
    // AML TRANSACTION MONITORING
    // ============================================================================

    /**
     * Monitor transactions for AML suspicious activity
     */
    monitorTransactions(transactions: GamingTransaction[]): AMLAlert[] {
        const alerts: AMLAlert[] = [];

        // Group transactions by player
        const byPlayer = new Map<string, GamingTransaction[]>();
        for (const txn of transactions) {
            const existing = byPlayer.get(txn.playerId) || [];
            existing.push(txn);
            byPlayer.set(txn.playerId, existing);
        }

        // Check each player's transactions
        for (const [playerId, playerTxns] of byPlayer) {
            // Rule 1: Single large transaction
            const largeTxns = playerTxns.filter(t => t.stake >= this.amlThresholds.singleTransactionLimit);
            for (const txn of largeTxns) {
                alerts.push({
                    alertId: this.generateAlertId(),
                    playerId,
                    alertType: 'large_transaction',
                    severity: txn.stake >= 15000 ? 'high' : 'medium',
                    description: `Large single transaction: €${txn.stake.toFixed(2)}`,
                    transactionIds: [txn.id],
                    amount: txn.stake,
                    timestamp: new Date(),
                    status: 'open',
                });
            }

            // Rule 2: High daily volume
            const dailyVolume = this.calculateDailyVolume(playerTxns);
            for (const [date, volume] of dailyVolume) {
                if (volume >= this.amlThresholds.dailyVolumeLimit) {
                    const dayTxns = playerTxns.filter(t =>
                        t.timestamp.toISOString().split('T')[0] === date
                    );
                    alerts.push({
                        alertId: this.generateAlertId(),
                        playerId,
                        alertType: 'high_velocity',
                        severity: volume >= 50000 ? 'critical' : 'high',
                        description: `High daily volume: €${volume.toFixed(2)} on ${date}`,
                        transactionIds: dayTxns.map(t => t.id),
                        amount: volume,
                        timestamp: new Date(),
                        status: 'open',
                    });
                }
            }

            // Rule 3: Unusual patterns (stakes just below threshold)
            const structuringTransactions = playerTxns.filter(t =>
                t.stake >= (this.amlThresholds.singleTransactionLimit * 0.8) &&
                t.stake < this.amlThresholds.singleTransactionLimit
            );
            if (structuringTransactions.length >= 3) {
                alerts.push({
                    alertId: this.generateAlertId(),
                    playerId,
                    alertType: 'structuring',
                    severity: 'high',
                    description: `Potential structuring: ${structuringTransactions.length} transactions just below threshold`,
                    transactionIds: structuringTransactions.map(t => t.id),
                    amount: structuringTransactions.reduce((sum, t) => sum + t.stake, 0),
                    timestamp: new Date(),
                    status: 'open',
                });
            }
        }

        return alerts;
    }

    private calculateDailyVolume(transactions: GamingTransaction[]): Map<string, number> {
        const daily = new Map<string, number>();
        for (const txn of transactions) {
            const date = txn.timestamp.toISOString().split('T')[0];
            const current = daily.get(date) || 0;
            daily.set(date, current + txn.stake);
        }
        return daily;
    }

    // ============================================================================
    // MGA MONTHLY REPORTING
    // ============================================================================

    /**
     * Generate MGA monthly compliance report
     */
    generateMonthlyReport(
        licenseNumber: string,
        periodStart: Date,
        periodEnd: Date,
        transactions: GamingTransaction[],
        players: PlayerLiability[],
        amlAlerts: AMLAlert[]
    ): MGAMonthlyReport {
        const ggrCalculation = this.calculateGGR(transactions, periodStart, periodEnd);
        const gamingDuty = this.calculateGamingDuty(ggrCalculation);
        const liabilities = this.calculatePlayerLiabilities(players);

        // Calculate player statistics
        const newPlayers = players.filter(p => {
            const activities = transactions.filter(t => t.playerId === p.playerId);
            const firstActivity = activities.length > 0 ? activities.reduce((min, t) =>
                t.timestamp < min ? t.timestamp : min, activities[0].timestamp) : null;
            return firstActivity && firstActivity >= periodStart && firstActivity <= periodEnd;
        });

        const selfExclusions = players.filter(p => p.status === 'excluded');

        // Calculate financial summary
        const deposits = transactions.filter(t => t.stake > 0).reduce((sum, t) => sum + t.stake, 0);
        const withdrawals = transactions.filter(t => t.payout > 0).reduce((sum, t) => sum + t.payout, 0);

        // AML summary
        const periodAlerts = amlAlerts.filter(a =>
            a.timestamp >= periodStart && a.timestamp <= periodEnd
        );
        const closedAlerts = periodAlerts.filter(a => a.status === 'closed');
        const sarsFiles = periodAlerts.filter(a => a.status === 'sar_filed');

        // Filing deadline: 15th of following month
        const submissionDeadline = new Date(periodEnd);
        submissionDeadline.setMonth(submissionDeadline.getMonth() + 1);
        submissionDeadline.setDate(MGA_MONTHLY_REPORT_DUE_DAY);

        return {
            reportId: this.generateReportId(licenseNumber, periodEnd),
            licenseNumber,
            periodStart,
            periodEnd,
            ggrCalculation,
            gamingDuty,
            playerStatistics: {
                activePlayersCount: liabilities.activePlayerCount,
                newRegistrations: newPlayers.length,
                selfExclusions: selfExclusions.length,
                dormantAccounts: liabilities.dormantPlayerCount,
            },
            financialSummary: {
                totalDeposits: this.roundCurrency(deposits),
                totalWithdrawals: this.roundCurrency(withdrawals),
                netPlayerFlow: this.roundCurrency(deposits - withdrawals),
            },
            amlSummary: {
                alertsGenerated: periodAlerts.length,
                alertsClosed: closedAlerts.length,
                sarsFiles: sarsFiles.length,
            },
            submissionDeadline,
            status: 'draft',
        };
    }

    // ============================================================================
    // BONUS DEFERRAL (IFRS 15)
    // ============================================================================

    /**
     * Calculate bonus deferral per IFRS 15
     * Bonuses with wagering requirements are deferred until requirements met
     */
    calculateBonusDeferral(transactions: GamingTransaction[]): {
        totalBonusIssued: number;
        totalBonusEarned: number;
        deferredRevenue: number;
        byPlayer: { playerId: string; bonusIssued: number; bonusEarned: number; deferred: number }[];
    } {
        const byPlayer = new Map<string, { issued: number; earned: number }>();

        for (const txn of transactions) {
            if (txn.bonusPortion > 0) {
                const existing = byPlayer.get(txn.playerId) || { issued: 0, earned: 0 };
                existing.issued += txn.bonusPortion;
                existing.earned += txn.bonusPortion * txn.wageringProgress;
                byPlayer.set(txn.playerId, existing);
            }
        }

        let totalIssued = 0;
        let totalEarned = 0;
        const playerDetails: { playerId: string; bonusIssued: number; bonusEarned: number; deferred: number }[] = [];

        for (const [playerId, data] of byPlayer) {
            totalIssued += data.issued;
            totalEarned += data.earned;
            playerDetails.push({
                playerId,
                bonusIssued: this.roundCurrency(data.issued),
                bonusEarned: this.roundCurrency(data.earned),
                deferred: this.roundCurrency(data.issued - data.earned),
            });
        }

        return {
            totalBonusIssued: this.roundCurrency(totalIssued),
            totalBonusEarned: this.roundCurrency(totalEarned),
            deferredRevenue: this.roundCurrency(totalIssued - totalEarned),
            byPlayer: playerDetails,
        };
    }

    // ============================================================================
    // UTILITIES
    // ============================================================================

    private generateAlertId(): string {
        return `AML-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    private generateReportId(licenseNumber: string, periodEnd: Date): string {
        const year = periodEnd.getFullYear();
        const month = String(periodEnd.getMonth() + 1).padStart(2, '0');
        return `MGA-${licenseNumber}-${year}${month}`;
    }

    private roundCurrency(value: number): number {
        return Math.round(value * 100) / 100;
    }

    /**
     * Get agent capabilities
     */
    getCapabilities(): string[] {
        return [
            'GGR (Gross Gaming Revenue) calculation',
            'Gaming duty computation (5% of GGR)',
            'Player liability reconciliation',
            'Player fund segregation verification',
            'Progressive jackpot liability tracking (IFRS 15)',
            'B2C VAT zero-rating classification',
            'AML transaction monitoring',
            'Suspicious activity detection',
            'MGA monthly reporting',
            'Bonus deferral calculation (IFRS 15)',
        ];
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createiGamingComplianceAgent(config?: iGamingAgentConfig): iGamingComplianceAgent {
    return new iGamingComplianceAgent(config);
}

// Lazy singleton
let _igamingAgent: iGamingComplianceAgent | null = null;

export const igamingComplianceAgent = {
    instance(config?: iGamingAgentConfig): iGamingComplianceAgent {
        if (!_igamingAgent) {
            _igamingAgent = new iGamingComplianceAgent(config);
        }
        return _igamingAgent;
    },
};

export default iGamingComplianceAgent;
