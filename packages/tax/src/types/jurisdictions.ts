/**
 * Multi-Jurisdiction VAT/GST Types
 * 
 * Type definitions for Malta, Canada, and Rwanda tax compliance
 */

import type { TaxJurisdiction } from './index.js';

// ============================================================================
// JURISDICTION CODES
// ============================================================================

export type TargetCountryCode = 'MT' | 'CA' | 'RW';


export type CanadianProvince =
    | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU'
    | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

export type TaxType = 'VAT' | 'GST' | 'HST' | 'PST' | 'QST';

// ============================================================================
// MALTA VAT TYPES
// ============================================================================

export type MaltaVATRateType = 'standard' | 'reduced_12' | 'reduced_7' | 'reduced_5' | 'zero' | 'exempt';

export interface MaltaVATRate {
    type: MaltaVATRateType;
    rate: number;
    categories: string[];
    legalReference: string;
}

export interface MaltaVATCalculation {
    grossAmount: number;
    netAmount: number;
    vatAmount: number;
    vatRate: number;
    rateType: MaltaVATRateType;
    reverseCharge: boolean;
    currency: 'EUR';
    rationale?: string;
}

export interface MaltaVATRegistration {
    type: 'Article10' | 'Article11' | 'Article11A' | 'Article11B';
    threshold: number;
    thresholdExceeded: boolean;
    registrationRequired: boolean;
    crossBorderEnabled: boolean;
}

export interface MaltaSMESchemeCheck {
    domesticTurnover: number;
    euWideTurnover: number;
    article11Eligible: boolean;    // €35,000 domestic
    article11AEligible: boolean;   // €100,000 EU-wide
    article11BEligible: boolean;   // Foreign SME in Malta
    recommendation: string;
    nextAction: string;
}

// ============================================================================
// CANADA GST/HST TYPES
// ============================================================================

export type CanadaTaxMethod = 'HST' | 'GST_PST' | 'GST_QST' | 'GST_ONLY';

export interface CanadaProvincialRates {
    province: CanadianProvince;
    method: CanadaTaxMethod;
    gst: number;
    hst: number;
    pst: number;
    qst: number;
    combined: number;
}

export interface CanadaGSTHSTCalculation {
    grossAmount: number;
    netAmount: number;
    province: CanadianProvince;
    method: CanadaTaxMethod;
    gstAmount: number;
    hstAmount: number;
    pstAmount: number;
    qstAmount: number;
    totalTax: number;
    currency: 'CAD';
    breakdown: {
        component: string;
        rate: number;
        amount: number;
    }[];
}

export interface CanadaITC {
    eligibleExpenses: number;
    itcAmount: number;
    documentation: 'complete' | 'incomplete' | 'missing';
    claimPeriod: string;
}

export interface CanadaNexusStatus {
    hasPhysicalPresence: boolean;
    hasEconomicNexus: boolean;
    trailing12MonthRevenue: number;
    registrationRequired: boolean;
    provinces: CanadianProvince[];
}

// ============================================================================
// RWANDA TAX TYPES
// ============================================================================

export interface RwandaVATCalculation {
    grossAmount: number;
    netAmount: number;
    vatAmount: number;
    vatRate: 18;
    currency: 'RWF';
    ebmReference?: string;
}

export interface RwandaEBMInvoice {
    invoiceNumber: string;
    taxpayerTIN: string;
    issueDate: string;
    customerName: string;
    customerTIN?: string;
    items: RwandaEBMInvoiceItem[];
    taxableAmount: number;
    vatAmount: number;
    totalAmount: number;
    ebmStatus: 'pending' | 'synced' | 'failed' | 'offline';
    rraReference?: string;
    rraTimestamp?: string;
}

export interface RwandaEBMInvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    vatAmount: number;
}

export interface RwandaVATRegistration {
    tin: string;
    vatRegistered: boolean;
    ebmSerialNumber: string;
    ebmStatus: 'active' | 'suspended' | 'inactive';
    annualThreshold: 20_000_000;  // RWF
    quarterlyThreshold: 5_000_000;  // RWF
}

export interface RwandaDigitalServicesTax {
    grossRevenue: number;
    dstRate: 1.5;
    dstAmount: number;
    effectiveDate: '2025-01-01';
}

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface MultiCurrencyAmount {
    amount: number;
    currency: 'EUR' | 'CAD' | 'RWF' | 'USD';
    exchangeRate?: number;
    baseAmount?: number;
    baseCurrency?: 'USD';
}

export interface TaxFilingResult {
    jurisdiction: TaxJurisdiction;
    filingType: string;
    filingReference: string;
    submissionDate: string;
    status: 'submitted' | 'accepted' | 'rejected' | 'pending';
    amountPayable: number;
    currency: 'EUR' | 'CAD' | 'RWF';
    deadline: string;
    penalties?: string;
}

export interface ComplianceAlert {
    jurisdiction: TargetCountryCode;
    alertType: 'threshold_breach' | 'registration_required' | 'filing_due' | 'penalty_risk';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    action: string;
    deadline?: string;
}
