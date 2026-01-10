/**
 * Malta CIT Refund Calculation Agent
 * 
 * Automates calculation and filing of Malta CIT refund claims (6/7ths, 5/7ths, 2/3rds)
 * 
 * Legal Basis: Income Tax Act (Cap. 123), Full Imputation System
 * 
 * Features:
 * - Automatic profit type classification
 * - Tax account allocation (MTA, FIA, IPA)
 * - Refund rate determination
 * - Refund claim form generation (FS4)
 * - Deadline tracking and submission automation
 */

import { MALTA_TAX_CONSTANTS } from '../../types/malta.js';

// ============================================================================
// TYPES
// ============================================================================

export enum ProfitType {
  TRADING = 'trading',                      // 6/7ths refund (5% effective)
  PASSIVE_INTEREST_ROYALTIES = 'passive',   // 5/7ths refund (10% effective)
  FOREIGN_WITH_DTT = 'foreign_dtt',         // 2/3rds refund (11.67% effective)
  PARTICIPATING_HOLDING = 'participating',  // Full refund (0% effective)
  IMMOVABLE_PROPERTY = 'property'           // Special IPA rules
}

export enum TaxAccountType {
  MTA = 'MTA',  // Maltese Taxed Account
  FIA = 'FIA',  // Foreign Income Account
  IPA = 'IPA'   // Immovable Property Account
}

export interface RefundRate {
  numerator: number;
  denominator: number;
  decimalValue: number;
  effectiveRate: number;  // Effective CIT rate after refund
  description: string;
}

export interface RefundCalculation {
  dividendAmount: number;
  sourceAccount: TaxAccountType;
  profitType: ProfitType;
  citPaid: number;
  refundRate: RefundRate;
  refundAmount: number;
  effectiveTax: number;
  effectiveRate: number;
  shareholderNetReceipt: number;
  originalProfit: number;
  claimDeadline: Date;
}

export interface DividendDistribution {
  entityId: string;
  shareholderId: string;
  dividendDate: Date;
  dividendAmount: number;
  fiscalYear: number;
  sourceIncome: IncomeStream;
}

export interface IncomeStream {
  amount: number;
  type: 'trading' | 'interest' | 'royalty' | 'dividend' | 'rental' | 'other';
  isActiveBusiness: boolean;
  isMaltaSourced: boolean;
  isForeign?: boolean;
  hasDoubleTaxTreatyRelief?: boolean;
  shareholdingPercentage?: number;
  holdingPeriod?: number;  // Days
  isImmovableProperty?: boolean;
}

export interface TaxAccountAllocation {
  entityId: string;
  fiscalYear: number;
  mtaBalance: number;
  fiaBalance: number;
  ipaBalance: number;
  untaxedBalance: number;
}

export interface RefundClaimForm {
  formType: 'FS4';
  entityDetails: {
    registrationNumber: string;
    companyName: string;
    taxId: string;
  };
  shareholderDetails: {
    name: string;
    idCardNumber: string;
    address: string;
    nationality: string;
  };
  dividendDetails: {
    distributionDate: Date;
    dividendAmount: number;
    sourceAccount: TaxAccountType;
    fiscalYear: number;
  };
  refundCalculation: {
    citPaid: number;
    refundRate: string;  // "6/7", "5/7", "2/3"
    refundAmount: number;
    profitType: string;
  };
  supportingDocuments: string[];
  declaration: {
    signedBy: string;
    date: Date;
    signature: string;  // Digital signature placeholder
  };
}

export interface SubmissionResult {
  success: boolean;
  reference?: string;
  submissionDate: Date;
  status: 'submitted' | 'accepted' | 'rejected' | 'processing';
  errors?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CORPORATE_TAX_RATE = MALTA_TAX_CONSTANTS.CORPORATE_TAX_RATE; // 35%

const REFUND_RATES: Record<ProfitType, RefundRate> = {
  [ProfitType.TRADING]: {
    numerator: 6,
    denominator: 7,
    decimalValue: 6 / 7,
    effectiveRate: 5,  // 35% × (1 - 6/7) = 5%
    description: 'Trading income (6/7ths refund)'
  },
  [ProfitType.PASSIVE_INTEREST_ROYALTIES]: {
    numerator: 5,
    denominator: 7,
    decimalValue: 5 / 7,
    effectiveRate: 10,  // 35% × (1 - 5/7) = 10%
    description: 'Passive interest/royalties (5/7ths refund)'
  },
  [ProfitType.FOREIGN_WITH_DTT]: {
    numerator: 2,
    denominator: 3,
    decimalValue: 2 / 3,
    effectiveRate: 11.67,  // 35% × (1 - 2/3) ≈ 11.67%
    description: 'Foreign income with DTT relief (2/3rds refund)'
  },
  [ProfitType.PARTICIPATING_HOLDING]: {
    numerator: 7,
    denominator: 7,
    decimalValue: 1.0,
    effectiveRate: 0,  // Full refund
    description: 'Participating holding (full refund, 0% effective)'
  },
  [ProfitType.IMMOVABLE_PROPERTY]: {
    numerator: 6,
    denominator: 7,
    decimalValue: 6 / 7,
    effectiveRate: 5,  // Same as trading for IPA
    description: 'Immovable property income (IPA, 6/7ths refund)'
  }
};

const PARTICIPATING_HOLDING_THRESHOLDS = {
  MIN_EQUITY_PERCENTAGE: 5,
  MIN_HOLDING_DAYS: 183
};

// ============================================================================
// AGENT IMPLEMENTATION
// ============================================================================

export class CITRefundCalculationAgent {
  public readonly name = 'Malta CIT Refund Calculation Agent';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  /**
   * Classify profit type based on income stream characteristics
   */
  classifyProfitType(income: IncomeStream): ProfitType {
    // Participating holding exemption (>5% equity, held >183 days)
    if (
      income.type === 'dividend' &&
      income.shareholdingPercentage !== undefined &&
      income.shareholdingPercentage >= PARTICIPATING_HOLDING_THRESHOLDS.MIN_EQUITY_PERCENTAGE &&
      income.holdingPeriod !== undefined &&
      income.holdingPeriod >= PARTICIPATING_HOLDING_THRESHOLDS.MIN_HOLDING_DAYS
    ) {
      return ProfitType.PARTICIPATING_HOLDING;
    }

    // Immovable property income
    if (income.isImmovableProperty) {
      return ProfitType.IMMOVABLE_PROPERTY;
    }

    // Foreign income with DTT relief
    if (income.isForeign && income.hasDoubleTaxTreatyRelief) {
      return ProfitType.FOREIGN_WITH_DTT;
    }

    // Passive income: interest, royalties (non-trading)
    if (income.type === 'interest' || income.type === 'royalty') {
      return ProfitType.PASSIVE_INTEREST_ROYALTIES;
    }

    // Default: Trading income (active business operations, Malta-sourced)
    return ProfitType.TRADING;
  }

  /**
   * Calculate refund based on profit type and CIT paid
   */
  calculateRefund(
    dividendAmount: number,
    profitType: ProfitType,
    citPaid: number
  ): RefundCalculation {
    const refundRate = REFUND_RATES[profitType];

    // Calculate refund (capped at CIT paid)
    const refundAmount = Math.min(citPaid * refundRate.decimalValue, citPaid);

    // Effective tax retained by Malta
    const effectiveTax = citPaid - refundAmount;

    // Original profit before tax
    // Dividend = Profit × (1 - 0.35) = Profit × 0.65
    // Therefore: Profit = Dividend / 0.65
    const originalProfit = dividendAmount / (1 - CORPORATE_TAX_RATE / 100);

    // Effective tax rate
    const effectiveRate = originalProfit > 0
      ? (effectiveTax / originalProfit) * 100
      : 0;

    // Shareholder net receipt = dividend + refund
    const shareholderNetReceipt = dividendAmount + refundAmount;

    // Source account based on profit type
    const sourceAccount = this.getTaxAccountForProfitType(profitType);

    // Claim deadline: 14 days after dividend (per MALTA_TAX_CONSTANTS)
    const claimDeadline = new Date();
    claimDeadline.setDate(claimDeadline.getDate() + MALTA_TAX_CONSTANTS.REFUND_CLAIM_DAYS);

    return {
      dividendAmount: this.roundCurrency(dividendAmount),
      sourceAccount,
      profitType,
      citPaid: this.roundCurrency(citPaid),
      refundRate,
      refundAmount: this.roundCurrency(refundAmount),
      effectiveTax: this.roundCurrency(effectiveTax),
      effectiveRate: this.roundDecimal(effectiveRate, 2),
      shareholderNetReceipt: this.roundCurrency(shareholderNetReceipt),
      originalProfit: this.roundCurrency(originalProfit),
      claimDeadline
    };
  }

  /**
   * Allocate profits to statutory tax accounts (MTA, FIA, IPA)
   */
  allocateProfitToTaxAccounts(
    profit: number,
    profitType: ProfitType,
    entityId: string,
    fiscalYear: number
  ): TaxAccountAllocation {
    const allocation: TaxAccountAllocation = {
      entityId,
      fiscalYear,
      mtaBalance: 0,
      fiaBalance: 0,
      ipaBalance: 0,
      untaxedBalance: 0
    };

    switch (profitType) {
      case ProfitType.TRADING:
      case ProfitType.PASSIVE_INTEREST_ROYALTIES:
        allocation.mtaBalance = profit;
        break;

      case ProfitType.FOREIGN_WITH_DTT:
        allocation.fiaBalance = profit;
        break;

      case ProfitType.IMMOVABLE_PROPERTY:
        allocation.ipaBalance = profit;
        break;

      case ProfitType.PARTICIPATING_HOLDING:
        allocation.untaxedBalance = profit;  // Exempt from tax
        break;
    }

    return allocation;
  }

  /**
   * Generate FS4 refund claim form
   */
  async generateRefundClaimForm(
    refundCalc: RefundCalculation,
    entity: { registrationNumber: string; legalName: string; taxId: string },
    shareholder: { fullName: string; idCardNumber: string; address: string; nationality: string },
    dividendDate: Date,
    fiscalYear: number
  ): Promise<RefundClaimForm> {
    const refundRateString = `${refundCalc.refundRate.numerator}/${refundCalc.refundRate.denominator}`;

    return {
      formType: 'FS4',
      entityDetails: {
        registrationNumber: entity.registrationNumber,
        companyName: entity.legalName,
        taxId: entity.taxId
      },
      shareholderDetails: {
        name: shareholder.fullName,
        idCardNumber: shareholder.idCardNumber,
        address: shareholder.address,
        nationality: shareholder.nationality
      },
      dividendDetails: {
        distributionDate: dividendDate,
        dividendAmount: refundCalc.dividendAmount,
        sourceAccount: refundCalc.sourceAccount,
        fiscalYear
      },
      refundCalculation: {
        citPaid: refundCalc.citPaid,
        refundRate: refundRateString,
        refundAmount: refundCalc.refundAmount,
        profitType: refundCalc.profitType
      },
      supportingDocuments: [
        `audited_fs_${fiscalYear}.pdf`,
        `dividend_resolution_${dividendDate.toISOString().split('T')[0]}.pdf`,
        `tax_account_statement_${fiscalYear}.pdf`
      ],
      declaration: {
        signedBy: shareholder.fullName,
        date: new Date(),
        signature: await this.generateDigitalSignature(refundCalc, shareholder)
      }
    };
  }

  /**
   * Get tax account type for profit type
   */
  private getTaxAccountForProfitType(profitType: ProfitType): TaxAccountType {
    switch (profitType) {
      case ProfitType.TRADING:
      case ProfitType.PASSIVE_INTEREST_ROYALTIES:
        return TaxAccountType.MTA;

      case ProfitType.FOREIGN_WITH_DTT:
        return TaxAccountType.FIA;

      case ProfitType.IMMOVABLE_PROPERTY:
        return TaxAccountType.IPA;

      case ProfitType.PARTICIPATING_HOLDING:
        return TaxAccountType.MTA;  // Still tracked in MTA but exempt

      default:
        return TaxAccountType.MTA;
    }
  }

  /**
   * Generate digital signature (placeholder - integrate with eIDAS in production)
   */
  private async generateDigitalSignature(
    refundCalc: RefundCalculation,
    shareholder: { fullName: string; idCardNumber: string }
  ): Promise<string> {
    // TODO: Integrate with eIDAS-compliant digital signature service
    // For now, return a placeholder hash
    const signatureData = JSON.stringify({
      shareholder: shareholder.idCardNumber,
      refundAmount: refundCalc.refundAmount,
      date: new Date().toISOString()
    });

    // In production, use proper cryptographic signing
    return Buffer.from(signatureData).toString('base64');
  }

  /**
   * Round to 2 decimal places for currency
   */
  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Round to specified decimal places
   */
  private roundDecimal(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Execute refund calculation workflow
   */
  async executeRefundWorkflow(
    dividendDistribution: DividendDistribution,
    entity: { registrationNumber: string; legalName: string; taxId: string },
    shareholder: { fullName: string; idCardNumber: string; address: string; nationality: string }
  ): Promise<{
    calculation: RefundCalculation;
    allocation: TaxAccountAllocation;
    claimForm: RefundClaimForm;
  }> {
    // Step 1: Classify profit type
    const profitType = this.classifyProfitType(dividendDistribution.sourceIncome);

    // Step 2: Calculate original profit and CIT paid
    const originalProfit = dividendDistribution.dividendAmount / (1 - CORPORATE_TAX_RATE / 100);
    const citPaid = originalProfit * (CORPORATE_TAX_RATE / 100);

    // Step 3: Calculate refund
    const calculation = this.calculateRefund(
      dividendDistribution.dividendAmount,
      profitType,
      citPaid
    );

    // Step 4: Allocate to tax accounts
    const allocation = this.allocateProfitToTaxAccounts(
      originalProfit,
      profitType,
      dividendDistribution.entityId,
      dividendDistribution.fiscalYear
    );

    // Step 5: Generate claim form
    const claimForm = await this.generateRefundClaimForm(
      calculation,
      entity,
      shareholder,
      dividendDistribution.dividendDate,
      dividendDistribution.fiscalYear
    );

    return {
      calculation,
      allocation,
      claimForm
    };
  }

  /**
   * Verify refund eligibility
   */
  verifyRefundEligibility(shareholder: {
    isDirectShareholder: boolean;
    beneficialOwnersDisclosed: boolean;
    taxExempt?: boolean;
    exemptionAllowsRefund?: boolean;
  }): { eligible: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!shareholder.isDirectShareholder) {
      errors.push('Shareholder must be a direct shareholder (not indirect)');
    }

    if (!shareholder.beneficialOwnersDisclosed) {
      errors.push('Beneficial owners must be disclosed to CFR');
    }

    if (shareholder.taxExempt && !shareholder.exemptionAllowsRefund) {
      errors.push('Tax-exempt shareholder may not be eligible for refund');
    }

    return {
      eligible: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CITRefundCalculationAgent;
