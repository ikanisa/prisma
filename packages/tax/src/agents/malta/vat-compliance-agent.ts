/**
 * Malta VAT Compliance Agent (BAM II)
 *
 * Automates VAT compliance for Malta entities with BAM II integration
 *
 * Legal Basis: Value Added Tax Act (Cap. 406), BAM II Regulations
 *
 * Features:
 * - Real-time VAT classification (18%, 7%, 5%, 0%, exempt)
 * - iGaming B2C zero-rating logic
 * - Monthly VAT return generation (XML format)
 * - BAM II portal submission automation
 * - Deadline tracking (20th of month following reporting period)
 */

// BAM2 Client types (type-only imports to avoid rootDir issues)
type BAM2Client = any;
type VatReturnSubmission = {
  periodStart: Date;
  periodEnd: Date;
  vatNumber: string;
  xmlContent: string;
};
type SubmissionResult = {
  success: boolean;
  reference: string;
  submissionDate: Date;
  status: 'submitted' | 'accepted' | 'rejected' | 'processing';
  confirmationNumber?: string;
  errors?: string[];
  warnings?: string[];
};

// ============================================================================
// TYPES
// ============================================================================

export enum VatRate {
  STANDARD_18 = 0.18,
  REDUCED_7 = 0.07,      // Hotels, catering
  REDUCED_5 = 0.05,      // Books, energy
  ZERO_RATED = 0.00,     // Exports, intra-EU, iGaming B2C
  EXEMPT = -1            // Financial services, insurance (no VAT, no input recovery) - using -1 as sentinel
}

// Helper to check if rate is exempt
export function isExemptRate(rate: number | null): boolean {
  return rate === null || rate === VatRate.EXEMPT;
}

export interface VatClassification {
  rate: number;  // Use -1 for exempt
  rateDescription: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  classification: string;
  justification: string[];
  isExempt: boolean;  // Explicit flag for exempt transactions
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  customerType: 'B2C' | 'B2B';
  customerCountry: string;  // ISO 2-letter code
  supplierMgaLicensed: boolean;
  type: 'sale' | 'purchase';
  date: Date;
}

export interface VatReturnLine {
  rate: number;  // Use -1 for exempt
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  transactionCount: number;
  isExempt: boolean;
}

export interface VatReturn {
  periodStart: Date;
  periodEnd: Date;
  vatNumber: string;

  // Output VAT (Sales)
  sales: {
    standardRate: VatReturnLine;
    reduced7Rate: VatReturnLine;
    reduced5Rate: VatReturnLine;
    zeroRated: VatReturnLine;
    exempt: VatReturnLine;
    intraEUSupplies: VatReturnLine;
    exports: VatReturnLine;
  };

  // Input VAT (Purchases)
  purchases: {
    standardRate: VatReturnLine;
    reduced7Rate: VatReturnLine;
    reduced5Rate: VatReturnLine;
    exempt: VatReturnLine;
    imports: VatReturnLine;
    intraEUAcquisitions: VatReturnLine;
  };

  // Summary
  totalOutputVat: number;
  totalInputVat: number;
  vatPayable: number;  // Output - Input (if positive)
  vatRefundable: number;  // Input - Output (if negative)

  // Deadlines
  filingDeadline: Date;
  paymentDeadline: Date;
}

const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// ============================================================================
// VAT CLASSIFIER
// ============================================================================

export class VatClassifier {
  /**
   * Classify transaction for VAT treatment
   */
  classifyTransaction(transaction: Transaction): VatClassification {
    const { description, amount, customerType, customerCountry, supplierMgaLicensed } = transaction;
    const desc = description.toLowerCase();

    // iGaming Special Rules
    if (supplierMgaLicensed && this.isGamingTransaction(desc)) {
      if (customerType === 'B2C') {
        return {
          rate: VatRate.ZERO_RATED,
          rateDescription: 'Zero-rated (B2C iGaming)',
          netAmount: amount,
          vatAmount: 0,
          grossAmount: amount,
        classification: 'B2C Gaming (VAT zero-rated per Gaming Act)',
        justification: [
          'MGA-licensed gaming operator',
          'B2C customer transaction',
          'Gaming duty (5% GGR) applies instead'
        ],
        isExempt: false
        };
      } else {
        // B2B gaming services: standard rate
        return {
          rate: VatRate.STANDARD_18,
          rateDescription: 'Standard 18% (B2B gaming services)',
          netAmount: this.roundCurrency(amount / 1.18),
          vatAmount: this.roundCurrency(amount - (amount / 1.18)),
          grossAmount: amount,
          classification: 'B2B Gaming Services',
          justification: ['White-label platform services to other operators'],
          isExempt: false
        };
      }
    }

    // Exports / Intra-EU Supply
    if (customerCountry !== 'MT') {
      if (this.isEUCountry(customerCountry)) {
        return {
          rate: VatRate.ZERO_RATED,
          rateDescription: 'Zero-rated (Intra-EU supply)',
          netAmount: amount,
          vatAmount: 0,
          grossAmount: amount,
          classification: 'Intra-EU Supply',
          justification: ['Customer in EU member state', 'VAT reverse charge applies'],
          isExempt: false
        };
      } else {
        return {
          rate: VatRate.ZERO_RATED,
          rateDescription: 'Zero-rated (Export)',
          netAmount: amount,
          vatAmount: 0,
          grossAmount: amount,
          classification: 'Export Outside EU',
          justification: ['Export to non-EU country'],
          isExempt: false
        };
      }
    }

    // Hospitality (7%)
    if (this.matchesPattern(desc, ['hotel', 'accommodation', 'catering', 'restaurant'])) {
      return {
        rate: VatRate.REDUCED_7,
        rateDescription: 'Reduced 7% (Hospitality)',
        netAmount: this.roundCurrency(amount / 1.07),
        vatAmount: this.roundCurrency(amount - (amount / 1.07)),
        grossAmount: amount,
        classification: 'Hotel/Catering Services',
        justification: ['Reduced rate per VAT Act Schedule 2'],
        isExempt: false
      };
    }

    // Books, Energy (5%)
    if (this.matchesPattern(desc, ['book', 'newspaper', 'magazine', 'electricity', 'heating'])) {
      return {
        rate: VatRate.REDUCED_5,
        rateDescription: 'Reduced 5% (Essentials)',
        netAmount: this.roundCurrency(amount / 1.05),
        vatAmount: this.roundCurrency(amount - (amount / 1.05)),
        grossAmount: amount,
        classification: 'Books/Energy',
        justification: ['Reduced rate per VAT Act Schedule 3'],
        isExempt: false
      };
    }

    // Financial Services (Exempt)
    if (this.matchesPattern(desc, ['banking', 'insurance', 'loan', 'investment', 'financial'])) {
      return {
        rate: VatRate.EXEMPT,
        rateDescription: 'Exempt (Financial Services)',
        netAmount: amount,
        vatAmount: 0,
        grossAmount: amount,
        classification: 'Exempt Financial Services',
        justification: [
          'No VAT charged',
          'No input VAT recovery allowed',
          'Per VAT Act Schedule 1'
        ],
        isExempt: true
      };
    }

    // Default: Standard 18%
    return {
      rate: VatRate.STANDARD_18,
      rateDescription: 'Standard 18%',
      netAmount: this.roundCurrency(amount / 1.18),
      vatAmount: this.roundCurrency(amount - (amount / 1.18)),
      grossAmount: amount,
      classification: 'Standard Rate Supply',
      justification: ['Default VAT rate per VAT Act'],
      isExempt: false
    };
  }

  private isGamingTransaction(description: string): boolean {
    return this.matchesPattern(description, [
      'gaming', 'casino', 'poker', 'slots', 'betting', 'gambling',
      'lottery', 'bingo', 'sportsbook'
    ]);
  }

  private isEUCountry(countryCode: string): boolean {
    return EU_COUNTRIES.includes(countryCode.toUpperCase());
  }

  private matchesPattern(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

// ============================================================================
// VAT RETURN GENERATOR
// ============================================================================

function createEmptyVatLine(rate: number = 0, isExempt: boolean = false): VatReturnLine {
  return {
    rate,
    netAmount: 0,
    vatAmount: 0,
    grossAmount: 0,
    transactionCount: 0,
    isExempt
  };
}

export class VatReturnGenerator {
  private classifier: VatClassifier;

  constructor() {
    this.classifier = new VatClassifier();
  }

  /**
   * Generate VAT return from transactions
   */
  generateVatReturn(
    periodStart: Date,
    periodEnd: Date,
    vatNumber: string,
    transactions: Transaction[]
  ): VatReturn {
    const sales: Record<string, VatReturnLine> = {};
    const purchases: Record<string, VatReturnLine> = {};

    // Classify all transactions
    for (const txn of transactions) {
      const classification = this.classifier.classifyTransaction(txn);
      const rateKey = this.getRateKey(classification.rate);

      if (txn.type === 'sale') {
        if (!sales[rateKey]) {
          sales[rateKey] = createEmptyVatLine(classification.rate, classification.isExempt);
        }
        sales[rateKey].netAmount += classification.netAmount;
        sales[rateKey].vatAmount += classification.vatAmount || 0;
        sales[rateKey].grossAmount += classification.grossAmount;
        sales[rateKey].transactionCount++;
      } else if (txn.type === 'purchase') {
        if (!purchases[rateKey]) {
          purchases[rateKey] = createEmptyVatLine(classification.rate, classification.isExempt);
        }
        purchases[rateKey].netAmount += classification.netAmount;
        purchases[rateKey].vatAmount += classification.vatAmount || 0;
        purchases[rateKey].grossAmount += classification.grossAmount;
        purchases[rateKey].transactionCount++;
      }
    }

    // Calculate totals
    const totalOutputVat = Object.values(sales).reduce(
      (sum, line) => sum + (line.isExempt ? 0 : line.vatAmount), 0
    );
    const totalInputVat = Object.values(purchases).reduce(
      (sum, line) => sum + (line.isExempt ? 0 : line.vatAmount), 0
    );

    const vatPayable = Math.max(0, totalOutputVat - totalInputVat);
    const vatRefundable = Math.max(0, totalInputVat - totalOutputVat);

    // Filing deadline: 20th of month following period end
    const filingDeadline = new Date(periodEnd);
    filingDeadline.setMonth(filingDeadline.getMonth() + 1);
    filingDeadline.setDate(20);

    // Payment deadline: Same as filing (for monthly returns)
    const paymentDeadline = new Date(filingDeadline);

    return {
      periodStart,
      periodEnd,
      vatNumber,
      sales: {
        standardRate: sales['standard'] || createEmptyVatLine(VatRate.STANDARD_18),
        reduced7Rate: sales['reduced7'] || createEmptyVatLine(VatRate.REDUCED_7),
        reduced5Rate: sales['reduced5'] || createEmptyVatLine(VatRate.REDUCED_5),
        zeroRated: sales['zero'] || createEmptyVatLine(VatRate.ZERO_RATED),
        exempt: sales['exempt'] || createEmptyVatLine(VatRate.EXEMPT, true),
        intraEUSupplies: sales['intraEU'] || createEmptyVatLine(VatRate.ZERO_RATED),
        exports: sales['export'] || createEmptyVatLine(VatRate.ZERO_RATED)
      },
      purchases: {
        standardRate: purchases['standard'] || createEmptyVatLine(VatRate.STANDARD_18),
        reduced7Rate: purchases['reduced7'] || createEmptyVatLine(VatRate.REDUCED_7),
        reduced5Rate: purchases['reduced5'] || createEmptyVatLine(VatRate.REDUCED_5),
        exempt: purchases['exempt'] || createEmptyVatLine(VatRate.EXEMPT, true),
        imports: purchases['import'] || createEmptyVatLine(VatRate.STANDARD_18),
        intraEUAcquisitions: purchases['intraEU'] || createEmptyVatLine(VatRate.STANDARD_18)
      },
      totalOutputVat: this.roundCurrency(totalOutputVat),
      totalInputVat: this.roundCurrency(totalInputVat),
      vatPayable: this.roundCurrency(vatPayable),
      vatRefundable: this.roundCurrency(vatRefundable),
      filingDeadline,
      paymentDeadline
    };
  }

  private getRateKey(rate: number): string {
    if (rate === VatRate.EXEMPT) return 'exempt';
    if (rate === VatRate.STANDARD_18) return 'standard';
    if (rate === VatRate.REDUCED_7) return 'reduced7';
    if (rate === VatRate.REDUCED_5) return 'reduced5';
    if (rate === VatRate.ZERO_RATED) return 'zero';
    return 'other';
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

// ============================================================================
// BAM II XML GENERATOR
// ============================================================================

export class BAM2XMLGenerator {
  /**
   * Generate BAM II XML for VAT return
   */
  generateXML(vatReturn: VatReturn, entityName: string, signatory: string): string {
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const formatCurrency = (value: number) => value.toFixed(2);

    return `<?xml version="1.0" encoding="UTF-8"?>
<vatReturn xmlns="http://cfr.gov.mt/bam2/vat">
  <header>
    <vatNumber>${vatReturn.vatNumber}</vatNumber>
    <entityName>${this.escapeXml(entityName)}</entityName>
    <periodStart>${formatDate(vatReturn.periodStart)}</periodStart>
    <periodEnd>${formatDate(vatReturn.periodEnd)}</periodEnd>
    <filingDate>${formatDate(new Date())}</filingDate>
  </header>

  <outputVat>
    <standardRate>
      <netAmount>${formatCurrency(vatReturn.sales.standardRate.netAmount)}</netAmount>
      <vatAmount>${formatCurrency(vatReturn.sales.standardRate.vatAmount || 0)}</vatAmount>
    </standardRate>
    <reduced7Rate>
      <netAmount>${formatCurrency(vatReturn.sales.reduced7Rate.netAmount)}</netAmount>
      <vatAmount>${formatCurrency(vatReturn.sales.reduced7Rate.vatAmount || 0)}</vatAmount>
    </reduced7Rate>
    <reduced5Rate>
      <netAmount>${formatCurrency(vatReturn.sales.reduced5Rate.netAmount)}</netAmount>
      <vatAmount>${formatCurrency(vatReturn.sales.reduced5Rate.vatAmount || 0)}</vatAmount>
    </reduced5Rate>
    <zeroRated>
      <netAmount>${formatCurrency(vatReturn.sales.zeroRated.netAmount)}</netAmount>
    </zeroRated>
    <exempt>
      <netAmount>${formatCurrency(vatReturn.sales.exempt.netAmount)}</netAmount>
    </exempt>
    <intraEUSupplies>
      <netAmount>${formatCurrency(vatReturn.sales.intraEUSupplies.netAmount)}</netAmount>
    </intraEUSupplies>
    <exports>
      <netAmount>${formatCurrency(vatReturn.sales.exports.netAmount)}</netAmount>
    </exports>
  </outputVat>

  <inputVat>
    <standardRate>
      <netAmount>${formatCurrency(vatReturn.purchases.standardRate.netAmount)}</netAmount>
      <vatAmount>${formatCurrency(vatReturn.purchases.standardRate.vatAmount || 0)}</vatAmount>
    </standardRate>
    <reduced7Rate>
      <netAmount>${formatCurrency(vatReturn.purchases.reduced7Rate.netAmount)}</netAmount>
      <vatAmount>${formatCurrency(vatReturn.purchases.reduced7Rate.vatAmount || 0)}</vatAmount>
    </reduced7Rate>
    <reduced5Rate>
      <netAmount>${formatCurrency(vatReturn.purchases.reduced5Rate.netAmount)}</netAmount>
      <vatAmount>${formatCurrency(vatReturn.purchases.reduced5Rate.vatAmount || 0)}</vatAmount>
    </reduced5Rate>
    <exempt>
      <netAmount>${formatCurrency(vatReturn.purchases.exempt.netAmount)}</netAmount>
    </exempt>
    <imports>
      <netAmount>${formatCurrency(vatReturn.purchases.imports.netAmount)}</netAmount>
      <vatAmount>${formatCurrency(vatReturn.purchases.imports.vatAmount || 0)}</vatAmount>
    </imports>
    <intraEUAcquisitions>
      <netAmount>${formatCurrency(vatReturn.purchases.intraEUAcquisitions.netAmount)}</netAmount>
      <vatAmount>${formatCurrency(vatReturn.purchases.intraEUAcquisitions.vatAmount || 0)}</vatAmount>
    </intraEUAcquisitions>
  </inputVat>

  <summary>
    <totalOutputVat>${formatCurrency(vatReturn.totalOutputVat)}</totalOutputVat>
    <totalInputVat>${formatCurrency(vatReturn.totalInputVat)}</totalInputVat>
    <vatPayable>${formatCurrency(vatReturn.vatPayable)}</vatPayable>
    <vatRefundable>${formatCurrency(vatReturn.vatRefundable)}</vatRefundable>
  </summary>

  <declaration>
    <signedBy>${this.escapeXml(signatory)}</signedBy>
    <date>${formatDate(new Date())}</date>
  </declaration>
</vatReturn>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// ============================================================================
// VAT COMPLIANCE AGENT
// ============================================================================

export class VATComplianceAgent {
  private bam2Client: BAM2Client | null = null;
  private returnGenerator: VatReturnGenerator;
  private xmlGenerator: BAM2XMLGenerator;

  constructor(bam2Client?: BAM2Client) {
    // Optional BAM2 client - can be injected or created externally
    this.bam2Client = bam2Client || null;
    this.returnGenerator = new VatReturnGenerator();
    this.xmlGenerator = new BAM2XMLGenerator();
  }

  /**
   * Set BAM2 client (for dependency injection)
   */
  setBAM2Client(client: BAM2Client): void {
    this.bam2Client = client;
  }

  /**
   * Execute complete VAT compliance workflow
   */
  async executeVatWorkflow(
    periodStart: Date,
    periodEnd: Date,
    vatNumber: string,
    entityName: string,
    transactions: Transaction[],
    signatory: string
  ): Promise<{
    vatReturn: VatReturn;
    xmlContent: string;
    submissionResult?: SubmissionResult;
  }> {
    // Step 1: Generate VAT return
    const vatReturn = this.returnGenerator.generateVatReturn(
      periodStart,
      periodEnd,
      vatNumber,
      transactions
    );

    // Step 2: Generate BAM II XML
    const xmlContent = this.xmlGenerator.generateXML(vatReturn, entityName, signatory);

    // Step 3: Submit to BAM II (optional - requires BAM2 client)
    let submissionResult: SubmissionResult | undefined;
    if (this.bam2Client) {
      try {
        submissionResult = await this.bam2Client.submitVatReturn({
          periodStart,
          periodEnd,
          vatNumber,
          xmlContent
        });
      } catch (error) {
        // Log error but don't fail - submission can be retried
        console.error('BAM II submission failed:', error);
      }
    }

    return {
      vatReturn,
      xmlContent,
      submissionResult
    };
  }

  /**
   * Check filing deadline
   */
  checkDeadline(periodEnd: Date): {
    isOverdue: boolean;
    daysRemaining: number;
    deadline: Date;
  } {
    const deadline = new Date(periodEnd);
    deadline.setMonth(deadline.getMonth() + 1);
    deadline.setDate(20);

    const now = new Date();
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isOverdue: daysRemaining < 0,
      daysRemaining,
      deadline
    };
  }
}

export default VATComplianceAgent;
