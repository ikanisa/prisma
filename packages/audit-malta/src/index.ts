/**
 * @prisma/audit-malta
 *
 * Malta Audit AI Agent System
 * Big 4-Level ISA Compliant Autonomous Audit Framework
 *
 * Jurisdiction: Malta
 * Standards: ISA Compliant (ISA 200, 240, 315, 320, 330, 500, 530, 540, 570, 700)
 * Regulations: Companies Act (Cap. 386), LN 139/2025, IESBA Code, GDPR
 */

// ============================================================================
// TYPES
// ============================================================================

export * from './types/index.js';

// ============================================================================
// AGENTS
// ============================================================================

// Routing Agent - LN 139/2025 exemption routing
export {
    ExemptionRouterAgent,
    createExemptionRouterAgent,
    exemptionRouterAgent,
    ARTICLE_185_THRESHOLDS,
    STARTUP_INCENTIVE_THRESHOLDS,
} from './agents/routing/exemption-router-agent.js';

// Planning Agent - ISA 300/315/320
export {
    MaltaPlanningAgent,
    createMaltaPlanningAgent,
    maltaPlanningAgent,
    MATERIALITY_BENCHMARKS,
    PERFORMANCE_MATERIALITY_FACTORS,
    MALTA_INDUSTRY_PROFILES,
} from './agents/planning/malta-planning-agent.js';

// Risk & Control Agent - ISA 315/240
export {
    MaltaRiskControlAgent,
    createMaltaRiskControlAgent,
    maltaRiskControlAgent,
    BENFORDS_EXPECTED,
    CHI_SQUARE_CRITICAL,
    FRAUD_TRIANGLE_FACTORS,
} from './agents/risk/malta-risk-control-agent.js';

// Substantive Testing Agent - ISA 330/500/530
export {
    MaltaSubstantiveAgent,
    createMaltaSubstantiveAgent,
    maltaSubstantiveAgent,
    SAMPLING_FACTORS,
    SUPPORTED_ERP_SYSTEMS,
} from './agents/testing/malta-substantive-agent.js';

// Going Concern Agent - ISA 570
export {
    MaltaGoingConcernAgent,
    createMaltaGoingConcernAgent,
    maltaGoingConcernAgent,
    GC_TRIGGERS,
    STRESS_SCENARIOS,
} from './agents/going-concern/malta-going-concern-agent.js';

// Reporting Agent - ISA 700/701/705/706
export {
    MaltaReportingAgent,
    createMaltaReportingAgent,
    maltaReportingAgent,
    OPINION_TYPES,
    MALTA_REPORT_SECTIONS,
} from './agents/reporting/malta-reporting-agent.js';

// ============================================================================
// GATES
// ============================================================================

export {
    HITLGateManager,
    createHITLGateManager,
    hitlGateManager,
    MALTA_AUDIT_GATES,
} from './gates/hitl-gates.js';

// ============================================================================
// INTEGRATIONS
// ============================================================================

export {
    MFSARegistryClient,
    createMFSAClient,
    mfsaClient,
    type MFSARegulatedStatus,
    type MFSAApprovedAuditor,
    type MFSAClientConfig,
} from './integrations/mfsa-registry-client.js';

export {
    MBRClient,
    createMBRClient,
    mbrClient,
    type MBRCompanyDetails,
    type MBRFilingData,
    type MBRSubmissionReceipt,
    type MBRClientConfig,
} from './integrations/mbr-client.js';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { exemptionRouterAgent } from './agents/routing/exemption-router-agent.js';
import { maltaPlanningAgent } from './agents/planning/malta-planning-agent.js';
import { maltaRiskControlAgent } from './agents/risk/malta-risk-control-agent.js';
import { maltaSubstantiveAgent } from './agents/testing/malta-substantive-agent.js';
import { maltaGoingConcernAgent } from './agents/going-concern/malta-going-concern-agent.js';
import { maltaReportingAgent } from './agents/reporting/malta-reporting-agent.js';
import { hitlGateManager } from './gates/hitl-gates.js';
import { mfsaClient } from './integrations/mfsa-registry-client.js';
import { mbrClient } from './integrations/mbr-client.js';

/**
 * Initialize all Malta Audit agents.
 */
export function initializeMaltaAuditSystem(options?: {
    openaiApiKey?: string;
    mfsaApiKey?: string;
    mbrApiKey?: string;
    environment?: 'production' | 'sandbox';
}) {
    const env = options?.environment ?? 'sandbox';

    return {
        // Core agents
        exemptionRouter: exemptionRouterAgent.instance(),
        planning: maltaPlanningAgent.instance(),
        riskControl: maltaRiskControlAgent.instance(),
        substantive: maltaSubstantiveAgent.instance(),
        goingConcern: maltaGoingConcernAgent.instance(),
        reporting: maltaReportingAgent.instance(),

        // Infrastructure
        hitlGates: hitlGateManager.instance(),
        mfsa: mfsaClient.instance({ apiKey: options?.mfsaApiKey, environment: env }),
        mbr: mbrClient.instance({ apiKey: options?.mbrApiKey, environment: env }),
    };
}

/**
 * Malta Audit Agent System version.
 */
export const VERSION = '1.0.0';

/**
 * Supported jurisdictions.
 */
export const SUPPORTED_JURISDICTIONS = ['MALTA'] as const;

/**
 * ISA Standards implemented.
 */
export const IMPLEMENTED_ISA_STANDARDS = [
    'ISA 200 - Overall Objectives',
    'ISA 240 - Fraud',
    'ISA 315 - Risk Assessment',
    'ISA 320 - Materiality',
    'ISA 330 - Audit Procedures',
    'ISA 500 - Audit Evidence',
    'ISA 505 - External Confirmations',
    'ISA 530 - Audit Sampling',
    'ISA 540 - Accounting Estimates',
    'ISA 560 - Subsequent Events',
    'ISA 570 - Going Concern',
    'ISA 700 - Forming Opinion',
    'ISA 701 - Key Audit Matters',
    'ISA 705 - Modifications',
    'ISA 706 - Emphasis of Matter',
] as const;
