/**
 * Canada Audit Autonomous AI Agent System
 * 
 * CAS (Canadian Auditing Standards) compliant audit automation.
 * Features:
 * - CAS 315 Risk Assessment (Revised)
 * - CAS 240 Fraud Risk & Journal Entry Testing
 * - CAS 701 Key Audit Matters (TSX/TSXV)
 * - CAS 540 Accounting Estimates
 * - CPAB Inspection Readiness
 * 
 * @package @prisma/audit-canada
 */

// ============================================================================
// TYPES
// ============================================================================

export * from './types/index.js';

// ============================================================================
// CORE AGENTS
// ============================================================================

export {
    CAS315RiskAssessmentAgent,
    createCAS315RiskAssessmentAgent,
    cas315RiskAssessmentAgent,
    type CAS315RiskAssessmentAgentConfig,
} from './agents/cas315-risk-assessment-agent.js';

export {
    JournalEntryTestingAgent,
    createJournalEntryTestingAgent,
    journalEntryTestingAgent,
    type JournalEntryTestingAgentConfig,
    type JournalEntry,
    type JournalEntryLine,
} from './agents/journal-entry-testing-agent.js';

export {
    CAS701KAMAgent,
    createCAS701KAMAgent,
    cas701KAMAgent,
    type CAS701KAMAgentConfig,
} from './agents/cas701-kam-agent.js';

export {
    CPABReadinessAgent,
    createCPABReadinessAgent,
    cpabReadinessAgent,
    type CPABReadinessAgentConfig,
} from './agents/cpab-readiness-agent.js';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { cas315RiskAssessmentAgent } from './agents/cas315-risk-assessment-agent.js';
import { journalEntryTestingAgent } from './agents/journal-entry-testing-agent.js';
import { cas701KAMAgent } from './agents/cas701-kam-agent.js';
import { cpabReadinessAgent } from './agents/cpab-readiness-agent.js';

/**
 * Initialize all Canada audit agents with shared configuration.
 * 
 * @example
 * ```typescript
 * const auditAgents = initializeCanadaAuditSystem({
 *     organizationId: 'org-123',
 *     enableCPABMode: true,
 * });
 * 
 * // 1. Risk Assessment
 * const risks = auditAgents.riskAssessment.performRiskAssessment(engagement, profile, ...);
 * 
 * // 2. JE Testing
 * const jeResults = auditAgents.jeTesting.analyzeJournalEntries(entries, ...);
 * 
 * // 3. KAM Generation
 * const kams = auditAgents.kam.generateKAMs(engagement, risks.data, ...);
 * 
 * // 4. CPAB Check
 * const readiness = auditAgents.cpab.assessReadiness(engagement, workpapers, ...);
 * ```
 */
export function initializeCanadaAuditSystem(config?: {
    organizationId?: string;
    userId?: string;
    enableCPABMode?: boolean;
}) {
    const agents = {
        riskAssessment: cas315RiskAssessmentAgent.instance(),
        jeTesting: journalEntryTestingAgent.instance(),
        kam: cas701KAMAgent.instance(),
        cpab: cpabReadinessAgent.instance(),
    };

    return agents;
}

// ============================================================================
// METADATA
// ============================================================================

export const PACKAGE_INFO = {
    name: '@prisma/audit-canada',
    version: '1.0.0',
    standards: 'CAS (Canadian Auditing Standards) / CPA Canada Handbook - Assurance',
    regulators: ['CPAB', 'Provincial CPA Institutes'],
    features: [
        'CAS 315 Risk Assessment (Revised)',
        'CAS 240 Fraud Detection (JE Testing)',
        'CAS 701 Key Audit Matters',
        'CPAB Inspection Readiness',
    ],
};
