/**
 * Rwanda Tax Agents Index
 * 
 * Exports all Rwanda-specific autonomous tax agents.
 * RRA-compliant with ISHEMA integration support.
 */

// VAT Agent
export {
    RwandaVATAgent,
    createRwandaVATAgent,
    rwandaVATAgent,
    type VATCategory,
    type VATCalculation,
    type TransactionInput as VATTransactionInput,
    type VATReturn,
    type RwandaVATAgentConfig,
} from './vat-agent.js';

// Corporate Income Tax Agent
export {
    RwandaCITAgent,
    createRwandaCITAgent,
    rwandaCITAgent,
    type EntityTaxType,
    type CITCalculation,
    type QuarterlyProvisional,
    type CITReturn,
    type CITAdjustment,
    type RwandaCITAgentConfig,
} from './cit-agent.js';

// PAYE Agent
export {
    RwandaPAYEAgent,
    createRwandaPAYEAgent,
    rwandaPAYEAgent,
    type PAYECalculation,
    type PAYEBracket,
    type EmployeePayroll,
    type PayrollDeclaration,
    type RwandaPAYEAgentConfig,
} from './paye-agent.js';

// Withholding Tax Agent
export {
    RwandaWHTAgent,
    createRwandaWHTAgent,
    rwandaWHTAgent,
    type WHTType,
    type RecipientType,
    type WHTCalculation,
    type WHTPayment,
    type WHTDeclaration,
    type RwandaWHTAgentConfig,
} from './withholding-agent.js';
