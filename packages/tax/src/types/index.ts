/**
 * Tax Agent Type Definitions
 */

export interface TaxJurisdiction {
  code: string;  // ISO 3166-1 alpha-2 or EU
  name: string;
  region?: string;  // e.g., 'EU', 'North America', 'Africa'
}

export interface TaxRate {
  jurisdiction: TaxJurisdiction;
  rateType: 'corporate' | 'vat' | 'personal' | 'withholding';
  standardRate: number;
  reducedRates?: Array<{
    rate: number;
    description: string;
    conditions: string[];
  }>;
  effectiveDate: string;  // ISO 8601 date
  source: string;  // Official source URL
}

export interface TaxCalculationRequest {
  jurisdiction: TaxJurisdiction;
  taxYear: number;
  income: number;
  deductions?: number;
  credits?: number;
  additionalContext?: Record<string, unknown>;
}

export interface TaxCalculationResult {
  taxableIncome: number;
  taxDue: number;
  effectiveRate: number;
  breakdown: Array<{
    component: string;
    amount: number;
    rate?: number;
  }>;
  warnings?: string[];
}

export interface ComplianceCheck {
  jurisdiction: TaxJurisdiction;
  complianceType: string;  // e.g., 'ATAD', 'BEPS', 'DAC6'
  status: 'compliant' | 'non-compliant' | 'review-required';
  issues?: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
  lastChecked: string;  // ISO 8601 datetime
}

export interface FilingDeadline {
  jurisdiction: TaxJurisdiction;
  filingType: string;  // e.g., 'Corporate Tax Return', 'VAT Return'
  dueDate: string;  // ISO 8601 date
  frequency: 'annual' | 'quarterly' | 'monthly';
  penalties?: string;
  extensions?: {
    available: boolean;
    maxDays?: number;
    conditions?: string;
  };
}

export interface TransferPricingAnalysis {
  method: 'CUP' | 'RPM' | 'CPM' | 'TNMM' | 'PSM';  // OECD methods
  armLengthRange: {
    min: number;
    max: number;
    median: number;
  };
  comparables: Array<{
    company: string;
    metric: number;
    source: string;
  }>;
  documentation: {
    masterFile: boolean;
    localFile: boolean;
    cbcr: boolean;  // Country-by-Country Reporting
  };
}
