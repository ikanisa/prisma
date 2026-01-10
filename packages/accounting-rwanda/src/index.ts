/**
 * Rwanda Accounting Autonomous AI Agent System
 * 
 * Comprehensive accounting, audit, and tax automation for Rwanda entities.
 * Compliant with IFRS Standards, ISA, and RRA regulations.
 * 
 * Features:
 * - IFRS compliance (Full IFRS / IFRS for SMEs)
 * - ISA-based audit procedures
 * - RRA tax compliance (VAT, CIT, PAYE, RSSB)
 * - ICPAR regulatory requirements
 * - Big Four quality standards
 * 
 * @package @prisma/accounting-rwanda
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
    type RwandaAccountingAgent,
    type AgentContext,
    type AgentResponse,
    type AgentType,
    type AutonomyLevel,
    type AgentConfig,
    type ReviewGate,
    AUTONOMY_LEVELS,
    determineReviewRequirement,
    determineTaxReviewRequirement,
} from './core/base-agent.js';

export {
    // Entity Classifier
    RwandaEntityClassifier,
    createEntityClassifier,
    rwandaEntityClassifier,
    selectAccountingFramework,
    type EntityClassificationInput,
} from './core/entity-classifier.js';

export {
    // Chart of Accounts
    ChartOfAccountsGenerator,
    createChartOfAccountsGenerator,
    chartOfAccountsGenerator,
    RWANDA_CHART_OF_ACCOUNTS,
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
// SERVICES
// ============================================================================

export {
    ISHEMAClient,
    createISHEMAClient,
    createISHEMASandboxClient,
    ISHEMAAPIError,
    ISHEMA_ERROR_CODES,
    type ISHEMAConfig,
} from './services/ishema-client.js';

export {
    RwandaKnowledgeBase,
    createKnowledgeBase,
    RWANDA_DOCUMENT_TEMPLATES,
    type DocumentSourceType,
    type DocumentInput,
    type SearchResult,
    type KnowledgeBaseConfig,
} from './services/knowledge-base.js';


// ============================================================================
// COMPLIANCE AGENTS
// ============================================================================

export {
    RSSBAgent,
    createRSSBAgent,
    rssbAgent,
    type EmployeePayrollInput,
    type PayrollPeriodInput,
} from './agents/compliance/rssb-agent.js';

export {
    VATComplianceAgent,
    createVATComplianceAgent,
    vatComplianceAgent,
} from './agents/compliance/vat-compliance-agent.js';

// ============================================================================
// TAX AGENTS
// ============================================================================

export {
    CITAgent,
    createCITAgent,
    citAgent,
    type CITFinancialData,
    type EntityTaxProfile,
} from './agents/tax/cit-agent.js';

// ============================================================================
// PROCESSING AGENTS
// ============================================================================

export {
    JournalEntryAgent,
    createJournalEntryAgent,
    journalEntryAgent,
} from './agents/processing/journal-entry-agent.js';

export {
    DepreciationAgent,
    createDepreciationAgent,
    depreciationAgent,
    type DepreciationMethod,
    type AssetCategory,
    type FixedAsset,
    type DepreciationResult,
    type DepreciationSchedule,
} from './agents/processing/depreciation-agent.js';

// ============================================================================
// REPORTING AGENTS
// ============================================================================

export {
    FinancialReportingAgent,
    createFinancialReportingAgent,
    financialReportingAgent,
    type TrialBalanceEntry,
    type BalanceSheet,
    type IncomeStatement,
    type ChangesInEquity,
} from './agents/reporting/financial-reporting-agent.js';


// ============================================================================
// AUDIT AGENTS
// ============================================================================

export {
    AuditRiskAgent,
    createAuditRiskAgent,
    auditRiskAgent,
} from './agents/audit/risk-assessment-agent.js';

export {
    AnomalyDetectionAgent,
    createAnomalyDetectionAgent,
    anomalyDetectionAgent,
    type AnomalyDetectionInput,
    type AnomalyDetectionResult,
} from './agents/audit/anomaly-detection-agent.js';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { rssbAgent as _rssbAgent } from './agents/compliance/rssb-agent.js';
import { vatComplianceAgent as _vatComplianceAgent } from './agents/compliance/vat-compliance-agent.js';
import { citAgent as _citAgent } from './agents/tax/cit-agent.js';
import { journalEntryAgent as _journalEntryAgent } from './agents/processing/journal-entry-agent.js';
import { auditRiskAgent as _auditRiskAgent } from './agents/audit/risk-assessment-agent.js';
import { anomalyDetectionAgent as _anomalyDetectionAgent } from './agents/audit/anomaly-detection-agent.js';
import { rwandaEntityClassifier as _entityClassifier } from './core/entity-classifier.js';
import { chartOfAccountsGenerator as _chartOfAccountsGenerator } from './core/chart-of-accounts.js';
import { agentOrchestrator as _agentOrchestrator } from './core/orchestrator.js';

/**
 * Initialize all Rwanda accounting agents with shared configuration.
 */
export function initializeRwandaAccountingSystem(_config?: {
    openaiApiKey?: string;
    enableAIFeatures?: boolean;
    rraApiEndpoint?: string;
}) {
    const agents = {
        // Compliance agents
        rssb: _rssbAgent.instance(),
        vatCompliance: _vatComplianceAgent.instance(),

        // Tax agents
        cit: _citAgent.instance(),

        // Processing agents
        journalEntry: _journalEntryAgent.instance(),

        // Audit agents
        auditRisk: _auditRiskAgent.instance(),
        anomalyDetection: _anomalyDetectionAgent.instance(),

        // Core utilities
        entityClassifier: _entityClassifier.instance(),
        chartOfAccounts: _chartOfAccountsGenerator.instance(),
        orchestrator: _agentOrchestrator.instance(),
    };

    // Register agents with orchestrator
    agents.orchestrator.register(agents.rssb);
    agents.orchestrator.register(agents.vatCompliance);
    agents.orchestrator.register(agents.cit);
    agents.orchestrator.register(agents.journalEntry);
    agents.orchestrator.register(agents.auditRisk);
    agents.orchestrator.register(agents.anomalyDetection);

    return agents;
}

/**
 * Get current Rwanda tax rates (2026).
 */
export function getRwandaTaxRates() {
    return {
        vatStandard: 18,
        citStandard: 28,
        citListed40Pct: 20,
        citListed30Pct: 25,
        withholdingServices: 15,
        withholdingDividends: 15,
        withholdingRent: 15,
        digitalServicesTax: 1.5,
        tourismLevy: 3,
        rssbPension: 12,  // 6% employer + 6% employee
        rssbOccupationalHazard: 2,
        rssbMaternity: 0.3,
    };
}

/**
 * Get VAT filing deadline for a period.
 */
export function getVATFilingDeadline(period: Date): Date {
    const deadline = new Date(period);
    deadline.setMonth(deadline.getMonth() + 1);
    deadline.setDate(15);
    return deadline;
}

/**
 * Get RSSB filing deadline for a period.
 */
export function getRSSBFilingDeadline(period: Date): Date {
    const deadline = new Date(period);
    deadline.setMonth(deadline.getMonth() + 1);
    deadline.setDate(15);
    return deadline;
}

/**
 * Get CIT filing deadline for a fiscal year.
 */
export function getCITFilingDeadline(fiscalYearEnd: Date): Date {
    const deadline = new Date(fiscalYearEnd);
    deadline.setMonth(deadline.getMonth() + 3);
    deadline.setDate(31);
    return deadline;
}
