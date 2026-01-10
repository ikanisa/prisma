/**
 * Canada Accounting Autonomous AI Agent System
 * 
 * Comprehensive accounting automation for Canadian entities.
 * Supports IFRS, ASPE, ASNFPO, and PSAS frameworks per CPA Canada Handbook.
 * 
 * Key Features:
 * - Dual IFRS/ASPE standards engine with automatic framework selection
 * - Quebec bilingual financial statements (Bill 96/2022 compliant)
 * - Revenue recognition (IFRS 15 / ASPE 3400)
 * - 3-5 day month-end close automation
 * - 14 provincial/territorial tax integration
 * 
 * @package @prisma/accounting-canada
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
    type CanadaAccountingAgent,
    type AgentFactory,
    type ReviewGate,
    AUTONOMY_LEVELS,
    STANDARD_REVIEW_GATES,
    determineReviewRequirement,
    createAgentFactory,
    createSuccessResponse,
    createErrorResponse,
    FRAMEWORK_DESCRIPTIONS,
    FRAMEWORK_REGULATORY_BODIES,
} from './core/base-agent.js';

export {
    // Standards Engine
    AccountingStandardsEngine,
    createStandardsEngine,
    standardsEngine,
    selectAccountingFramework,
    type StandardsEngineConfig,
    type FrameworkDifference,
    type TransitionRequirement,
} from './core/standards-engine.js';

// ============================================================================
// RECOGNITION AGENTS
// ============================================================================

export {
    RevenueRecognitionAgent,
    createRevenueRecognitionAgent,
    revenueRecognitionAgent,
    type RevenueRecognitionAgentConfig,
} from './agents/recognition/revenue-recognition-agent.js';

// ============================================================================
// COMPLIANCE AGENTS
// ============================================================================

export {
    QuebecBilingualAgent,
    createQuebecBilingualAgent,
    quebecBilingualAgent,
    type QuebecBilingualAgentConfig,
} from './agents/compliance/bilingual-agent.js';

// ============================================================================
// PROCESSING AGENTS
// ============================================================================

export {
    MonthEndCloseAgent,
    createMonthEndCloseAgent,
    monthEndCloseAgent,
    type MonthEndCloseAgentConfig,
    type TrialBalanceEntry,
} from './agents/processing/month-end-close-agent.js';

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export {
    CanadaAccountingOrchestrator,
} from './core/orchestrator.js';

// ============================================================================
// SERVICES
// ============================================================================

export {
    CPAHandbookService,
    createCPAHandbookService,
    getCPAHandbookService,
    HANDBOOK_STANDARDS,
    type HandbookPart,
    type StandardType,
    type HandbookStandard,
    type StandardSection,
    type HandbookQuery,
    type HandbookSearchResult,
    type CPAHandbookServiceConfig,
} from './services/cpa-handbook-service.js';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { standardsEngine } from './core/standards-engine.js';
import { revenueRecognitionAgent } from './agents/recognition/revenue-recognition-agent.js';
import { quebecBilingualAgent } from './agents/compliance/bilingual-agent.js';
import { monthEndCloseAgent } from './agents/processing/month-end-close-agent.js';

/**
 * Initialize all Canada accounting agents with shared configuration.
 * 
 * @example
 * ```typescript
 * const agents = initializeCanadaAccountingSystem({
 *     enableAIFeatures: true,
 *     defaultFramework: 'ASPE',
 * });
 * 
 * // Use standards engine to select framework
 * const framework = agents.standardsEngine.selectFramework(entityProfile);
 * 
 * // Process revenue with appropriate framework
 * const result = agents.revenueRecognition.processTransaction(
 *     transaction,
 *     framework.framework,
 *     context
 * );
 * 
 * // Generate bilingual statements for Quebec entities
 * if (framework.bilingualRequired) {
 *     const bilingual = agents.bilingual.generateBilingualFinancials(
 *         financialStatements,
 *         context
 *     );
 * }
 * ```
 */
export function initializeCanadaAccountingSystem(config?: {
    openaiApiKey?: string;
    enableAIFeatures?: boolean;
    defaultFramework?: 'IFRS' | 'ASPE';
    enableBilingualForQuebec?: boolean;
}) {
    const agents = {
        standardsEngine: standardsEngine.instance(),
        revenueRecognition: revenueRecognitionAgent.instance(),
        bilingual: quebecBilingualAgent.instance(),
        monthEndClose: monthEndCloseAgent.instance(),
    };

    return agents;
}

/**
 * Quick framework selection for an entity profile.
 * 
 * @example
 * ```typescript
 * const framework = quickFrameworkSelection({
 *     entityId: 'entity-123',
 *     name: 'Maple Leaf Tech Inc.',
 *     entityType: 'private_enterprise',
 *     incorporationProvince: 'QC',
 *     operatingProvinces: ['QC', 'ON'],
 *     revenue: 15_000_000,
 *     totalAssets: 8_000_000,
 *     employees: 45,
 *     isPubliclyAccountable: false,
 *     hasPEInvestor: false,
 *     isCCPC: true,
 *     fiscalYearEnd: new Date('2025-12-31'),
 *     requiresBilingualFS: true,
 * });
 * 
 * console.log(framework.framework); // 'ASPE'
 * console.log(framework.bilingualRequired); // true
 * ```
 */
export { selectAccountingFramework as quickFrameworkSelection } from './core/standards-engine.js';

// ============================================================================
// VERSION & METADATA
// ============================================================================

export const PACKAGE_INFO = {
    name: '@prisma/accounting-canada',
    version: '1.0.0',
    description: 'Canada Accounting Autonomous AI Agent System',
    frameworks: ['IFRS', 'ASPE', 'ASNFPO', 'PSAS'] as const,
    jurisdictions: [
        'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU',
        'ON', 'PE', 'QC', 'SK', 'YT'
    ] as const,
    features: [
        'Dual IFRS/ASPE standards support',
        'CPA Canada Handbook aligned',
        'Quebec bilingual (Bill 96/2022)',
        'IFRS 15 / ASPE 3400 revenue recognition',
        '3-5 day month-end close',
        'GST/HST integration (14 provinces)',
    ],
    regulatoryBodies: [
        'CPA Canada',
        'Accounting Standards Board (AcSB)',
        'Public Sector Accounting Board (PSAB)',
        'Ordre des CPA du Québec',
        'CRA (Canada Revenue Agency)',
    ],
};
