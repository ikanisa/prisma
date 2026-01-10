/**
 * Tax Services
 * Core services for tax agents including nexus tracking, jurisdiction database, and transfer pricing.
 */

export { NexusRulesEngine, nexusRulesEngine } from './nexus-rules-engine.js';
export { NexusMonitoringAgent, nexusMonitoringAgent, type NexusMonitoringConfig, type NexusStudyRequest } from '../agents/nexus-monitoring-agent.js';
export { TransferPricingAgent, transferPricingAgent, type TransferPricingAgentConfig } from '../agents/transfer-pricing-agent.js';

// Jurisdiction Database (200+ global jurisdictions)
export {
    JurisdictionDatabase,
    jurisdictionDatabase,
    getJurisdiction,
    getJurisdictionsByRegion,
    checkNexusExposure,
    type Jurisdiction,
    type JurisdictionRegion,
    type TaxType,
    type EconomicNexusThreshold,
    type PhysicalNexusRules,
    type TaxRateSchedule,
    type FilingRules,
    type EFilingSupport,
} from './jurisdiction-database.js';

// Tax Filing Automation
export {
    TaxFilingAutomationService,
    taxFilingService,
    type FilingRequest,
    type FilingPeriod,
    type TransactionSummary,
    type TaxRegistration,
    type TaxFiling,
    type TaxCalculation,
    type FilingFormData,
    type FilingStatus,
    type ValidationResult,
    type SubmissionResult,
    type FilingCalendarEntry,
} from './tax-filing-automation.js';

// Malta VAT Engine
export {
    MaltaVATEngine,
    createMaltaVATEngine,
    MALTA_VAT_RATES,
    type MaltaVATEngineConfig,
} from './malta-vat-engine.js';

// Canada GST/HST Engine
export {
    CanadaGSTEngine,
    createCanadaGSTEngine,
    CANADA_PROVINCIAL_RATES,
    HST_PROVINCES,
    PST_PROVINCES,
    GST_ONLY_PROVINCES,
    type CanadaGSTEngineConfig,
} from './canada-gst-engine.js';

// Rwanda EBM Service
export {
    RwandaEBMService,
    createRwandaEBMService,
    RWANDA_TAX_RATES,
    type RwandaEBMServiceConfig,
} from './rwanda-ebm-service.js';
