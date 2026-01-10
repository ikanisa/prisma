/**
 * Malta Tax Agents Index
 * 
 * Exports all Malta-specific autonomous tax agents.
 */

// VAT Agent
export {
    MaltaVATAgent,
    createMaltaVATAgent,
    maltaVATAgent,
    type MaltaVATAgentConfig,
} from './vat-agent.js';

// Corporate Tax Agent (V2 - with full imputation)
export {
    MaltaCorporateTaxAgentV2,
    createMaltaCorporateTaxAgentV2,
    maltaCorporateTaxAgentV2,
    type MaltaCorporateTaxAgentConfig as MaltaCorporateTaxV2Config,
} from './corporate-tax-agent.js';

// Participation Exemption Agent
export {
    MaltaParticipationExemptionAgent,
    createParticipationExemptionAgent,
    maltaParticipationExemptionAgent,
    type ParticipationExemptionAgentConfig,
} from './participation-exemption-agent.js';

// Double Tax Relief Agent
export {
    MaltaDoubleTaxReliefAgent,
    createDoubleTaxReliefAgent,
    maltaDoubleTaxReliefAgent,
    type DoubleTaxReliefAgentConfig,
} from './double-tax-relief-agent.js';

// Transfer Pricing Agent (Malta-specific)
export {
    MaltaTransferPricingAgent,
    createTransferPricingAgent,
    maltaTransferPricingAgent,
    type TransferPricingAgentConfig as MaltaTPAgentConfig,
} from './transfer-pricing-agent.js';

// CIT Refund Calculation Agent
export {
    CITRefundCalculationAgent,
    default as citRefundAgent,
    type ProfitType,
    type TaxAccountType,
    type RefundRate,
    type RefundCalculation,
    type DividendDistribution,
    type IncomeStream,
    type TaxAccountAllocation,
    type RefundClaimForm,
    type SubmissionResult,
} from './cit-refund-agent.js';
