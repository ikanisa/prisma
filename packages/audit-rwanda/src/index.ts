/**
 * @prisma/audit-rwanda
 *
 * Rwanda Audit AI Agent System
 * ISA Compliant Autonomous Audit Framework
 *
 * Jurisdiction: Rwanda
 * Standards: ISA Compliant (ISA 200 - ISA 810)
 * Regulations: ICPAR Requirements, Companies Act 2018
 */

// ============================================================================
// TYPES
// ============================================================================

export * from './types/index.js';

// ============================================================================
// AGENTS
// ============================================================================

// Planning Agent - ISA 300/315/320
export {
    RwandaPlanningAgent,
    createRwandaPlanningAgent,
    rwandaPlanningAgent,
    type EngagementPlan,
    type AuditStrategy,
    type AuditTimeline,
    type TeamMember,
    type ClientAcceptanceCheck,
} from './agents/planning/rwanda-planning-agent.js';

// Risk Assessment Agent - ISA 315/240
export {
    RwandaRiskAssessmentAgent,
    createRwandaRiskAssessmentAgent,
    rwandaRiskAssessmentAgent,
} from './agents/risk/risk-assessment-agent.js';

// Going Concern Agent - ISA 570
export {
    RwandaGoingConcernAgent,
    createRwandaGoingConcernAgent,
    rwandaGoingConcernAgent,
    type GoingConcernInput,
    type GoingConcernResult,
} from './agents/going-concern/rwanda-going-concern-agent.js';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { rwandaPlanningAgent } from './agents/planning/rwanda-planning-agent.js';
import { rwandaRiskAssessmentAgent } from './agents/risk/risk-assessment-agent.js';
import { rwandaGoingConcernAgent } from './agents/going-concern/rwanda-going-concern-agent.js';

/**
 * Initialize all Rwanda Audit agents.
 */
export function initializeRwandaAuditSystem(_options?: {
    openaiApiKey?: string;
    environment?: 'production' | 'sandbox';
}) {
    return {
        planning: rwandaPlanningAgent.instance(),
        riskAssessment: rwandaRiskAssessmentAgent.instance(),
        goingConcern: rwandaGoingConcernAgent.instance(),
    };
}

/**
 * Rwanda Audit Agent System version.
 */
export const VERSION = '1.0.0';

/**
 * Supported jurisdictions.
 */
export const SUPPORTED_JURISDICTIONS = ['RWANDA'] as const;

/**
 * ISA Standards implemented.
 */
export const IMPLEMENTED_ISA_STANDARDS = [
    'ISA 200 - Overall Objectives',
    'ISA 240 - Fraud',
    'ISA 300 - Planning',
    'ISA 315 - Risk Assessment',
    'ISA 320 - Materiality',
    'ISA 330 - Audit Procedures',
    'ISA 500 - Audit Evidence',
    'ISA 540 - Accounting Estimates',
    'ISA 570 - Going Concern',
    'ISA 700 - Forming Opinion',
    'ISA 701 - Key Audit Matters',
    'ISA 705 - Modifications',
    'ISA 706 - Emphasis of Matter',
] as const;

/**
 * Rwanda regulatory bodies.
 */
export const RWANDA_AUDIT_REGULATORS = {
    ICPAR: 'Institute of Certified Public Accountants of Rwanda',
    BNR: 'National Bank of Rwanda',
    RSE: 'Rwanda Stock Exchange',
    RDB: 'Rwanda Development Board',
};
