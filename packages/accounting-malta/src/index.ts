/**
 * Malta Accounting Autonomous AI Agent System
 * 
 * Comprehensive accounting automation for Malta entities.
 * Supports GAPSME and IFRS frameworks per Companies Act 1995.
 * 
 * @package @prisma/accounting-malta
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export * from './types/index.js';

// ============================================================================
// CORE
// ============================================================================

export {
    // Base Agent
    type MaltaAccountingAgent,
    type AgentContext,
    type AgentResponse,
    type AgentType,
    type AutonomyLevel,
    type AgentConfig,
    type ReviewGate,
    AUTONOMY_LEVELS,
    determineReviewRequirement,
} from './core/base-agent.js';

export {
    // Entity Classifier
    MaltaEntityClassifier,
    createEntityClassifier,
    maltaEntityClassifier,
    selectAccountingFramework,
} from './core/entity-classifier.js';

export {
    // Chart of Accounts
    ChartOfAccountsGenerator,
    createChartOfAccountsGenerator,
    chartOfAccountsGenerator,
} from './core/chart-of-accounts.js';

export {
    // Orchestrator
    AgentOrchestrator,
    createOrchestrator,
    agentOrchestrator,
    type AccountingTaskType,
    type AccountingTask,
    type TaskResult,
    type WorkflowResult,
} from './core/orchestrator.js';

// ============================================================================
// TRANSACTION PROCESSING AGENTS
// ============================================================================

export {
    JournalEntryAgent,
    createJournalEntryAgent,
    journalEntryAgent,
    type JournalEntryAgentConfig,
} from './agents/processing/journal-entry-agent.js';

export {
    DepreciationAgent,
    createDepreciationAgent,
    depreciationAgent,
    type FixedAsset,
    type DepreciationMethod,
    type DepreciationResult,
    type DepreciationSchedule,
    MALTA_DEPRECIATION_RATES,
    DEFAULT_USEFUL_LIFE,
} from './agents/processing/depreciation-agent.js';

export {
    YearEndCloseAgent,
    createYearEndCloseAgent,
    yearEndCloseAgent,
    type CloseStep,
    type YearEndCheck,
    type YearEndCloseResult,
    type AccrualPrepayment,
} from './agents/processing/year-end-close-agent.js';

// ============================================================================
// COMPLIANCE MONITORING AGENTS
// ============================================================================

export {
    AuditExemptionAgent,
    createAuditExemptionAgent,
    auditExemptionAgent,
    type AuditExemptionStatus,
    type Shareholder,
    type EligibilityCheck,
} from './agents/compliance/audit-exemption-agent.js';

// ============================================================================
// FINANCIAL REPORTING AGENTS
// ============================================================================

export {
    BalanceSheetAgent,
    createBalanceSheetAgent,
    balanceSheetAgent,
} from './agents/reporting/balance-sheet-agent.js';

export {
    IncomeStatementAgent,
    createIncomeStatementAgent,
    incomeStatementAgent,
} from './agents/reporting/income-statement-agent.js';

// ============================================================================
// FILING AGENTS
// ============================================================================

export {
    MBRFilingAgent,
    createMBRFilingAgent,
    mbrFilingAgent,
    type MBRFilingType,
    type Director,
    type ShareholderInfo,
    type AnnualReturnData,
    type MBRFilingPackage,
} from './agents/filing/mbr-filing-agent.js';

// ============================================================================
// ANALYTICS AGENTS
// ============================================================================

export {
    FinancialAnalysisAgent,
    createFinancialAnalysisAgent,
    financialAnalysisAgent,
    type LiquidityRatios,
    type ProfitabilityRatios,
    type EfficiencyRatios,
    type SolvencyRatios,
    type RatioAnalysis,
    type FinancialAnalysisAgentConfig,
} from './agents/analytics/financial-analysis-agent.js';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

// Import singletons for convenience function
import { journalEntryAgent as _journalEntryAgent } from './agents/processing/journal-entry-agent.js';
import { depreciationAgent as _depreciationAgent } from './agents/processing/depreciation-agent.js';
import { yearEndCloseAgent as _yearEndCloseAgent } from './agents/processing/year-end-close-agent.js';
import { auditExemptionAgent as _auditExemptionAgent } from './agents/compliance/audit-exemption-agent.js';
import { balanceSheetAgent as _balanceSheetAgent } from './agents/reporting/balance-sheet-agent.js';
import { incomeStatementAgent as _incomeStatementAgent } from './agents/reporting/income-statement-agent.js';
import { mbrFilingAgent as _mbrFilingAgent } from './agents/filing/mbr-filing-agent.js';
import { financialAnalysisAgent as _financialAnalysisAgent } from './agents/analytics/financial-analysis-agent.js';
import { maltaEntityClassifier as _maltaEntityClassifier } from './core/entity-classifier.js';
import { chartOfAccountsGenerator as _chartOfAccountsGenerator } from './core/chart-of-accounts.js';
import { agentOrchestrator as _agentOrchestrator } from './core/orchestrator.js';

/**
 * Initialize all Malta accounting agents with shared configuration.
 */
export function initializeMaltaAccountingSystem(_config?: {
    openaiApiKey?: string;
    enableAIFeatures?: boolean;
}) {
    const agents = {
        journalEntry: _journalEntryAgent.instance(),
        depreciation: _depreciationAgent.instance(),
        yearEndClose: _yearEndCloseAgent.instance(),
        auditExemption: _auditExemptionAgent.instance(),
        balanceSheet: _balanceSheetAgent.instance(),
        incomeStatement: _incomeStatementAgent.instance(),
        mbrFiling: _mbrFilingAgent.instance(),
        financialAnalysis: _financialAnalysisAgent.instance(),
        entityClassifier: _maltaEntityClassifier.instance(),
        chartOfAccounts: _chartOfAccountsGenerator.instance(),
        orchestrator: _agentOrchestrator.instance(),
    };

    // Register agents with orchestrator
    agents.orchestrator.register(agents.journalEntry);
    agents.orchestrator.register(agents.depreciation);
    agents.orchestrator.register(agents.yearEndClose);
    agents.orchestrator.register(agents.auditExemption);
    agents.orchestrator.register(agents.balanceSheet);
    agents.orchestrator.register(agents.incomeStatement);
    agents.orchestrator.register(agents.mbrFiling);
    agents.orchestrator.register(agents.financialAnalysis);

    return agents;
}
