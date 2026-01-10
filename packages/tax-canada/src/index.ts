/**
 * Canada Tax Autonomous AI Agent System
 * 
 * T2 Corporate Tax and GST/HST automation for Canadian entities.
 * Features:
 * - T2 Corporate Tax Return (Federal + Provincial)
 * - GST/HST/QST Filing (GST34)
 * - Small Business Deduction (SBD) optimization
 * - 13-province jurisdiction support
 * 
 * @package @prisma/tax-canada
 */

// ============================================================================
// TYPES
// ============================================================================

export * from './types/index.js';

// ============================================================================
// TAX AGENTS
// ============================================================================

export {
    T2TaxAgent,
    createT2TaxAgent,
    t2TaxAgent,
    type T2TaxAgentConfig,
} from './agents/t2-tax-agent.js';

export {
    GSTFilingAgent,
    createGSTFilingAgent,
    gstFilingAgent,
    type GSTFilingAgentConfig,
} from './agents/gst-hst-agent.js';

export {
    T1TaxAgent,
    createT1TaxAgent,
    t1TaxAgent,
    type T1TaxAgentConfig,
    type T1Return,
    type T1Income,
    type T1Deductions,
} from './agents/t1-tax-agent.js';

export {
    TransferPricingAgent,
    createTransferPricingAgent,
    transferPricingAgent,
    type TransferPricingAgentConfig,
    type ControlledTransaction,
    type TransferPricingAnalysis,
    type RelatedParty,
} from './agents/transfer-pricing-agent.js';

export {
    Pillar2GloBEAgent,
    createPillar2GloBEAgent,
    pillar2GloBEAgent,
    type GloBEAgentConfig,
    type GloBEGroup,
    type GloBECalculation,
    type JurisdictionData,
    GLOBE_MINIMUM_RATE,
} from './agents/pillar2-globe-agent.js';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { t2TaxAgent } from './agents/t2-tax-agent.js';
import { gstFilingAgent } from './agents/gst-hst-agent.js';
import { t1TaxAgent } from './agents/t1-tax-agent.js';
import { transferPricingAgent } from './agents/transfer-pricing-agent.js';
import { pillar2GloBEAgent } from './agents/pillar2-globe-agent.js';

/**
 * Initialize all Canada tax agents
 */
export function initializeCanadaTaxSystem(config?: {
    organizationId?: string;
    userId?: string;
}) {
    const agents = {
        t2: t2TaxAgent.instance(),
        t1: t1TaxAgent.instance(),
        gst: gstFilingAgent.instance(),
        transferPricing: transferPricingAgent.instance(),
        pillar2: pillar2GloBEAgent.instance(),
    };

    return agents;
}

// ============================================================================
// METADATA
// ============================================================================

export const PACKAGE_INFO = {
    name: '@prisma/tax-canada',
    version: '1.0.0',
    jurisdictions: ['CRA', 'Revenu Quebec', 'Alberta TRA'] as const,
    forms: ['T2', 'T1', 'GST34', 'CO-17', 'AT1'],
    agents: ['T2TaxAgent', 'T1TaxAgent', 'GSTFilingAgent', 'TransferPricingAgent', 'Pillar2GloBEAgent'],
};
