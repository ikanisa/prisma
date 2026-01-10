// Tax package public API exports

// Agent exports - Technical Tax Agents (existing)
export * from './agents/tax-corp-eu-022';
export * from './agents/tax-corp-us-023';
export * from './agents/tax-corp-uk-024';
export * from './agents/tax-corp-ca-025';
export * from './agents/tax-corp-mt-026';
export * from './agents/tax-corp-rw-027';
export * from './agents/tax-vat-028';
export * from './agents/tax-tp-029';
export * from './agents/tax-personal-030';
export * from './agents/tax-provision-031';
export * from './agents/tax-contro-032';
export * from './agents/tax-research-033';

// Agent exports - Operational Tax Agents (new)
export * from './agents/tax-compliance-mt-034';
export * from './agents/tax-compliance-rw-035';
export * from './agents/tax-payroll-mt-036';
export * from './agents/tax-payroll-rw-037';
export * from './agents/tax-wht-xborder-038';
export * from './agents/tax-excise-customs-039';
export * from './agents/tax-incentives-040';
export * from './agents/tax-risk-governance-041';
export * from './agents/tax-tech-data-042';

// Phase 2 Core Agents
export { NexusMonitoringAgent, nexusMonitoringAgent, type NexusMonitoringConfig, type NexusStudyRequest } from './agents/nexus-monitoring-agent';
export {
    TransferPricingAgent as TPAgent,
    transferPricingAgent as tpAgent,
    type TransferPricingAgentConfig as TPAgentConfig
} from './agents/transfer-pricing-agent';

// Service exports
export { NexusRulesEngine, nexusRulesEngine } from './services/nexus-rules-engine';

// Malta Autonomous Tax Agents
export * from './agents/malta/index.js';

// Malta Tax Knowledge Base
export {
    MaltaTaxKnowledgeBase,
    createMaltaTaxKnowledgeBase,
    maltaTaxKnowledgeBase,
    type KnowledgeDocument,
    type DocumentMetadata,
    type SearchResult,
    type KnowledgeBaseConfig,
} from './services/malta-knowledge-base.js';

// Type exports
export * from './types';

// Malta-specific types
export * from './types/malta.js';

// Utility exports
export * from './utils';
