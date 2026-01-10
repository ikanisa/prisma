/**
 * Malta Financial Analysis Agent
 * 
 * AI-powered financial ratio analysis with insights and recommendations.
 * 
 * Features:
 * - Liquidity ratios (current, quick, cash)
 * - Profitability ratios (gross margin, ROE, ROA)
 * - Efficiency ratios (asset turnover, receivables days)
 * - Solvency ratios (debt/equity, interest coverage)
 * - AI-powered insights using GPT-4
 */

import OpenAI from 'openai';
import {
    type MaltaAccountingAgent,
    type AgentResponse,
    type AgentConfig,
} from '../../core/base-agent.js';
import type {
    BalanceSheet,
    IncomeStatement,
    CashFlowStatement,
} from '../../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Liquidity ratios.
 */
export interface LiquidityRatios {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
}

/**
 * Profitability ratios.
 */
export interface ProfitabilityRatios {
    grossProfitMargin: number;
    operatingProfitMargin: number;
    netProfitMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
}

/**
 * Efficiency ratios.
 */
export interface EfficiencyRatios {
    assetTurnover: number;
    receivablesDays: number;
    payablesDays: number;
    inventoryDays: number;
    cashConversionCycle: number;
}

/**
 * Solvency ratios.
 */
export interface SolvencyRatios {
    debtToEquity: number;
    debtToAssets: number;
    interestCoverage: number;
}

/**
 * Complete ratio analysis result.
 */
export interface RatioAnalysis {
    liquidity: LiquidityRatios;
    profitability: ProfitabilityRatios;
    efficiency: EfficiencyRatios;
    solvency: SolvencyRatios;
    aiInsights?: string[];
    benchmarks?: {
        industry: string;
        comparisons: {
            ratio: string;
            value: number;
            benchmark: number;
            status: 'ABOVE' | 'BELOW' | 'IN_LINE';
        }[];
    };
}

// ============================================================================
// FINANCIAL ANALYSIS AGENT
// ============================================================================

export interface FinancialAnalysisAgentConfig extends AgentConfig {
    /** Enable AI-powered insights */
    enableAIInsights?: boolean;
}

/**
 * Financial Analysis Agent for ratio analysis and AI insights.
 */
export class FinancialAnalysisAgent implements MaltaAccountingAgent {
    public readonly agentId = 'malta-financial-analysis-001';
    public readonly name = 'Malta Financial Analysis Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'ANALYTICS' as const;
    public readonly capabilities = [
        'ratio_analysis',
        'trend_analysis',
        'benchmarking',
        'ai_insights',
    ];
    public readonly framework = 'BOTH' as const;
    public readonly autonomyLevel = 4 as const;
    public readonly supportedCurrencies = ['EUR'];

    private openai: OpenAI | null = null;
    private config: FinancialAnalysisAgentConfig;

    constructor(config: FinancialAnalysisAgentConfig = {}) {
        this.config = {
            enableAIInsights: true,
            ...config,
        };

        try {
            const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
            if (apiKey) {
                this.openai = new OpenAI({ apiKey });
            }
        } catch {
            // OpenAI not available
        }
    }

    /**
     * Perform comprehensive ratio analysis.
     */
    async performRatioAnalysis(
        balanceSheet: BalanceSheet,
        incomeStatement: IncomeStatement,
        cashFlowStatement?: CashFlowStatement
    ): Promise<AgentResponse<RatioAnalysis>> {
        const startTime = Date.now();

        try {
            // Calculate all ratio categories
            const liquidity = this.calculateLiquidityRatios(balanceSheet);
            const profitability = this.calculateProfitabilityRatios(balanceSheet, incomeStatement);
            const efficiency = this.calculateEfficiencyRatios(balanceSheet, incomeStatement);
            const solvency = this.calculateSolvencyRatios(balanceSheet, incomeStatement);

            const analysis: RatioAnalysis = {
                liquidity,
                profitability,
                efficiency,
                solvency,
            };

            // Generate AI insights if enabled
            if (this.config.enableAIInsights && this.openai) {
                analysis.aiInsights = await this.generateAIInsights(analysis);
            }

            return {
                success: true,
                data: analysis,
                confidenceScore: 1.0,
                requiresReview: false,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Ratio analysis failed',
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Calculate liquidity ratios.
     */
    calculateLiquidityRatios(bs: BalanceSheet): LiquidityRatios {
        const currentAssets = bs.currentAssets.total;
        const currentLiabilities = bs.currentLiabilities.total || 1;
        const inventories = bs.currentAssets.inventories;
        const cash = bs.currentAssets.cashAndCashEquivalents;

        return {
            currentRatio: currentAssets / currentLiabilities,
            quickRatio: (currentAssets - inventories) / currentLiabilities,
            cashRatio: cash / currentLiabilities,
        };
    }

    /**
     * Calculate profitability ratios.
     */
    calculateProfitabilityRatios(bs: BalanceSheet, is: IncomeStatement): ProfitabilityRatios {
        const revenue = is.revenue || 1;
        const totalAssets = bs.totalAssets || 1;
        const equity = bs.equity.total || 1;

        return {
            grossProfitMargin: (is.grossProfit / revenue) * 100,
            operatingProfitMargin: (is.operatingProfit / revenue) * 100,
            netProfitMargin: (is.profitForTheYear / revenue) * 100,
            returnOnAssets: (is.profitForTheYear / totalAssets) * 100,
            returnOnEquity: (is.profitForTheYear / equity) * 100,
        };
    }

    /**
     * Calculate efficiency ratios.
     */
    calculateEfficiencyRatios(bs: BalanceSheet, is: IncomeStatement): EfficiencyRatios {
        const revenue = is.revenue || 1;
        const costOfSales = is.costOfSales || 1;
        const totalAssets = bs.totalAssets || 1;
        const tradeReceivables = bs.currentAssets.tradeReceivables;
        const tradePayables = bs.currentLiabilities.tradePayables;
        const inventories = bs.currentAssets.inventories;

        const receivablesDays = (tradeReceivables / revenue) * 365;
        const payablesDays = (tradePayables / costOfSales) * 365;
        const inventoryDays = (inventories / costOfSales) * 365;

        return {
            assetTurnover: revenue / totalAssets,
            receivablesDays,
            payablesDays,
            inventoryDays,
            cashConversionCycle: inventoryDays + receivablesDays - payablesDays,
        };
    }

    /**
     * Calculate solvency ratios.
     */
    calculateSolvencyRatios(bs: BalanceSheet, is: IncomeStatement): SolvencyRatios {
        const totalDebt = bs.totalLiabilities;
        const equity = bs.equity.total || 1;
        const totalAssets = bs.totalAssets || 1;
        const operatingProfit = is.operatingProfit;
        const financeCosts = is.financeCosts || 1;

        return {
            debtToEquity: totalDebt / equity,
            debtToAssets: totalDebt / totalAssets,
            interestCoverage: operatingProfit / financeCosts,
        };
    }

    /**
     * Generate AI-powered insights.
     */
    private async generateAIInsights(analysis: RatioAnalysis): Promise<string[]> {
        if (!this.openai) return [];

        try {
            const prompt = `You are a Malta-based financial analyst reviewing these financial ratios for a Malta SME:

LIQUIDITY RATIOS:
- Current Ratio: ${analysis.liquidity.currentRatio.toFixed(2)}
- Quick Ratio: ${analysis.liquidity.quickRatio.toFixed(2)}
- Cash Ratio: ${analysis.liquidity.cashRatio.toFixed(2)}

PROFITABILITY RATIOS:
- Gross Profit Margin: ${analysis.profitability.grossProfitMargin.toFixed(1)}%
- Operating Profit Margin: ${analysis.profitability.operatingProfitMargin.toFixed(1)}%
- Net Profit Margin: ${analysis.profitability.netProfitMargin.toFixed(1)}%
- Return on Assets: ${analysis.profitability.returnOnAssets.toFixed(1)}%
- Return on Equity: ${analysis.profitability.returnOnEquity.toFixed(1)}%

EFFICIENCY RATIOS:
- Asset Turnover: ${analysis.efficiency.assetTurnover.toFixed(2)}
- Receivables Days: ${analysis.efficiency.receivablesDays.toFixed(0)}
- Payables Days: ${analysis.efficiency.payablesDays.toFixed(0)}
- Inventory Days: ${analysis.efficiency.inventoryDays.toFixed(0)}
- Cash Conversion Cycle: ${analysis.efficiency.cashConversionCycle.toFixed(0)} days

SOLVENCY RATIOS:
- Debt/Equity: ${analysis.solvency.debtToEquity.toFixed(2)}
- Debt/Assets: ${(analysis.solvency.debtToAssets * 100).toFixed(1)}%
- Interest Coverage: ${analysis.solvency.interestCoverage.toFixed(2)}x

Provide 3-5 key insights and actionable recommendations specific to Malta SME context.
Focus on practical, actionable advice. Format as bullet points starting with "-".`;

            const response = await this.openai.chat.completions.create({
                model: this.config.model || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            });

            const content = response.choices[0]?.message?.content?.trim() || '';
            return content
                .split('\n')
                .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
                .map(line => line.replace(/^[-•]\s*/, '').trim())
                .filter(line => line.length > 0);
        } catch (error) {
            console.warn('[FinancialAnalysisAgent] AI insights generation failed:', error);
            return this.generateRuleBasedInsights(analysis);
        }
    }

    /**
     * Generate rule-based insights (fallback).
     */
    private generateRuleBasedInsights(analysis: RatioAnalysis): string[] {
        const insights: string[] = [];

        // Liquidity insights
        if (analysis.liquidity.currentRatio < 1.0) {
            insights.push('Current ratio below 1.0 indicates potential liquidity concerns. Consider improving working capital management.');
        } else if (analysis.liquidity.currentRatio > 3.0) {
            insights.push('High current ratio may indicate inefficient use of working capital. Consider investing excess cash.');
        }

        // Profitability insights
        if (analysis.profitability.netProfitMargin < 5) {
            insights.push('Net profit margin below 5% is low for most industries. Review cost structure and pricing strategy.');
        }

        if (analysis.profitability.returnOnEquity < 15) {
            insights.push('Return on Equity below 15% may be below investor expectations. Focus on improving profitability or efficiency.');
        }

        // Efficiency insights
        if (analysis.efficiency.receivablesDays > 60) {
            insights.push(`Receivables days of ${analysis.efficiency.receivablesDays.toFixed(0)} is high. Consider stricter credit policies and collection procedures.`);
        }

        if (analysis.efficiency.cashConversionCycle > 90) {
            insights.push(`Cash conversion cycle of ${analysis.efficiency.cashConversionCycle.toFixed(0)} days is long. Optimize inventory and collection processes.`);
        }

        // Solvency insights
        if (analysis.solvency.debtToEquity > 2.0) {
            insights.push('High debt-to-equity ratio indicates significant leverage. Ensure adequate cash flow for debt servicing.');
        }

        if (analysis.solvency.interestCoverage < 3.0) {
            insights.push('Interest coverage below 3x may be concerning to lenders. Focus on increasing operating profit or reducing debt.');
        }

        return insights;
    }

    /**
     * Format analysis as text report.
     */
    formatAnalysisReport(analysis: RatioAnalysis): string {
        const lines: string[] = [];
        const fmt = (n: number, decimals = 2) => n.toFixed(decimals);

        lines.push('═══════════════════════════════════════════════');
        lines.push('           FINANCIAL RATIO ANALYSIS');
        lines.push('═══════════════════════════════════════════════');
        lines.push('');

        lines.push('LIQUIDITY RATIOS');
        lines.push(`  Current Ratio:         ${fmt(analysis.liquidity.currentRatio)}`);
        lines.push(`  Quick Ratio:           ${fmt(analysis.liquidity.quickRatio)}`);
        lines.push(`  Cash Ratio:            ${fmt(analysis.liquidity.cashRatio)}`);
        lines.push('');

        lines.push('PROFITABILITY RATIOS');
        lines.push(`  Gross Profit Margin:   ${fmt(analysis.profitability.grossProfitMargin, 1)}%`);
        lines.push(`  Operating Margin:      ${fmt(analysis.profitability.operatingProfitMargin, 1)}%`);
        lines.push(`  Net Profit Margin:     ${fmt(analysis.profitability.netProfitMargin, 1)}%`);
        lines.push(`  Return on Assets:      ${fmt(analysis.profitability.returnOnAssets, 1)}%`);
        lines.push(`  Return on Equity:      ${fmt(analysis.profitability.returnOnEquity, 1)}%`);
        lines.push('');

        lines.push('EFFICIENCY RATIOS');
        lines.push(`  Asset Turnover:        ${fmt(analysis.efficiency.assetTurnover)}x`);
        lines.push(`  Receivables Days:      ${fmt(analysis.efficiency.receivablesDays, 0)} days`);
        lines.push(`  Payables Days:         ${fmt(analysis.efficiency.payablesDays, 0)} days`);
        lines.push(`  Inventory Days:        ${fmt(analysis.efficiency.inventoryDays, 0)} days`);
        lines.push(`  Cash Conversion Cycle: ${fmt(analysis.efficiency.cashConversionCycle, 0)} days`);
        lines.push('');

        lines.push('SOLVENCY RATIOS');
        lines.push(`  Debt/Equity:           ${fmt(analysis.solvency.debtToEquity)}`);
        lines.push(`  Debt/Assets:           ${fmt(analysis.solvency.debtToAssets * 100, 1)}%`);
        lines.push(`  Interest Coverage:     ${fmt(analysis.solvency.interestCoverage)}x`);
        lines.push('');

        if (analysis.aiInsights && analysis.aiInsights.length > 0) {
            lines.push('═══════════════════════════════════════════════');
            lines.push('           KEY INSIGHTS & RECOMMENDATIONS');
            lines.push('═══════════════════════════════════════════════');
            lines.push('');
            analysis.aiInsights.forEach((insight, i) => {
                lines.push(`${i + 1}. ${insight}`);
            });
        }

        return lines.join('\n');
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Financial Analysis Agent instance.
 */
export function createFinancialAnalysisAgent(config?: FinancialAnalysisAgentConfig): FinancialAnalysisAgent {
    return new FinancialAnalysisAgent(config);
}

/**
 * Lazy singleton instance.
 */
let _financialAnalysisAgent: FinancialAnalysisAgent | null = null;

export const financialAnalysisAgent = {
    instance(): FinancialAnalysisAgent {
        if (!_financialAnalysisAgent) {
            _financialAnalysisAgent = new FinancialAnalysisAgent();
        }
        return _financialAnalysisAgent;
    },
};
