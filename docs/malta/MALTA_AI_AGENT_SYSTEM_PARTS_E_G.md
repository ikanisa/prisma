# MALTA AUTONOMOUS AI AGENT SYSTEM
## Parts E-G: Complete Agent Implementations

---

## PART E: TAX AGENTS

### 17. CIT REFUND CALCULATION AGENT

#### 17.1 Agent Overview

**Purpose**: Automate calculation and filing of Malta CIT refund claims (6/7ths, 5/7ths, 2/3rds)

**Legal Basis**: Income Tax Act (Cap. 123), Full Imputation System

**Key Features**:
- Automatic profit type classification (trading, passive, foreign with DTT)
- Tax account allocation (MTA, FIA, IPA)
- Refund rate determination
- Refund claim form generation (FS4)
- Deadline tracking and submission automation

#### 17.2 Agent Architecture

```typescript
interface CITRefundAgent {
  calculateRefund(dividendDistribution: DividendDistribution): Promise<RefundCalculation>;
  allocateProfitToTaxAccounts(profit: ProfitAllocation): Promise<TaxAccountAllocation>;
  generateRefundClaim(refundCalc: RefundCalculation): Promise<RefundClaimForm>;
  submitToBAM2(claim: RefundClaimForm): Promise<SubmissionResult>;
  trackRefundStatus(claimReference: string): Promise<RefundStatus>;
}
```

#### 17.3 Refund Calculation Algorithm

**Profit Type Classification**:

```typescript
enum ProfitType {
  TRADING = 'trading',                    // 6/7ths refund (5% effective)
  PASSIVE_INTEREST_ROYALTIES = 'passive', // 5/7ths refund (10% effective)
  FOREIGN_WITH_DTT = 'foreign_dtt',       // 2/3rds refund (11.67% effective)
  PARTICIPATING_HOLDING = 'participating', // Full refund (0% effective)
  IMMOVABLE_PROPERTY = 'property'         // Special IPA rules
}

function classifyProfitType(income: IncomeStream): ProfitType {
  // Trading income: active business operations
  if (income.isActiveBusiness && income.isMaltaSourced) {
    return ProfitType.TRADING;
  }
  
  // Passive income: interest, royalties (non-trading)
  if (income.type === 'interest' || income.type === 'royalty') {
    return ProfitType.PASSIVE_INTEREST_ROYALTIES;
  }
  
  // Foreign income with DTT relief
  if (income.isForeign && income.hasDoubleTaxTreatyRelief) {
    return ProfitType.FOREIGN_WITH_DTT;
  }
  
  // Participating holding (>5% equity, held >183 days)
  if (income.type === 'dividend' && 
      income.shareholdingPercentage >= 5 && 
      income.holdingPeriod >= 183) {
    return ProfitType.PARTICIPATING_HOLDING;
  }
  
  return ProfitType.TRADING; // Default
}
```

**Refund Calculation**:

```typescript
interface RefundCalculation {
  dividendAmount: number;
  sourceAccount: TaxAccountType;
  profitType: ProfitType;
  citPaid: number;
  refundRate: RefundRate;
  refundAmount: number;
  effectiveTax: number;
  effectiveRate: number;
  shareholderNetReceipt: number;
  claimDeadline: Date;
}

const REFUND_RATES: Record<ProfitType, RefundRate> = {
  [ProfitType.TRADING]: {
    numerator: 6,
    denominator: 7,
    decimalValue: 6/7,
    effectiveRate: 5  // 35% × (1 - 6/7) = 5%
  },
  [ProfitType.PASSIVE_INTEREST_ROYALTIES]: {
    numerator: 5,
    denominator: 7,
    decimalValue: 5/7,
    effectiveRate: 10  // 35% × (1 - 5/7) = 10%
  },
  [ProfitType.FOREIGN_WITH_DTT]: {
    numerator: 2,
    denominator: 3,
    decimalValue: 2/3,
    effectiveRate: 11.67  // 35% × (1 - 2/3) ≈ 11.67%
  },
  [ProfitType.PARTICIPATING_HOLDING]: {
    numerator: 7,
    denominator: 7,
    decimalValue: 1.0,
    effectiveRate: 0  // Full refund
  }
};

function calculateRefund(
  dividendAmount: number,
  profitType: ProfitType,
  citPaid: number
): RefundCalculation {
  const refundRate = REFUND_RATES[profitType];
  
  // Calculate refund (capped at CIT paid)
  const refundAmount = Math.min(citPaid * refundRate.decimalValue, citPaid);
  const effectiveTax = citPaid - refundAmount;
  
  // Original profit before tax
  // Dividend = Profit × (1 - 0.35) = Profit × 0.65
  // Therefore: Profit = Dividend / 0.65
  const originalProfit = dividendAmount / (1 - 0.35);
  
  // Effective tax rate
  const effectiveRate = (effectiveTax / originalProfit) * 100;
  
  // Shareholder net receipt = dividend + refund
  const shareholderNetReceipt = dividendAmount + refundAmount;
  
  return {
    dividendAmount,
    sourceAccount: getTaxAccountForProfitType(profitType),
    profitType,
    citPaid,
    refundRate,
    refundAmount: roundCurrency(refundAmount),
    effectiveTax: roundCurrency(effectiveTax),
    effectiveRate: roundDecimal(effectiveRate, 2),
    shareholderNetReceipt: roundCurrency(shareholderNetReceipt),
    claimDeadline: calculateClaimDeadline(new Date())
  };
}
```

#### 17.4 Tax Account Allocation

**Three Statutory Tax Accounts**:

```typescript
enum TaxAccountType {
  MTA = 'MTA',  // Maltese Taxed Account
  FIA = 'FIA',  // Foreign Income Account
  IPA = 'IPA'   // Immovable Property Account
}

interface TaxAccountAllocation {
  entityId: string;
  fiscalYear: number;
  mtaBalance: number;  // Trading income taxed at 35%
  fiaBalance: number;  // Foreign income with DTT
  ipaBalance: number;  // Malta property income
  untaxedBalance: number;  // Tax-exempt income
}

function allocateProfitToTaxAccounts(
  profit: number,
  profitType: ProfitType,
  source: IncomeSource
): TaxAccountAllocation {
  const allocation: TaxAccountAllocation = {
    entityId: source.entityId,
    fiscalYear: source.fiscalYear,
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
```

#### 17.5 Refund Claim Form Generation (FS4)

**BAM II FS4 Form Structure**:

```typescript
interface RefundClaimForm {
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
  supportingDocuments: string[];  // URLs to attached files
  declaration: {
    signedBy: string;
    date: Date;
    signature: string;  // Digital signature
  };
}

function generateFS4Form(refundCalc: RefundCalculation): RefundClaimForm {
  return {
    formType: 'FS4',
    entityDetails: {
      registrationNumber: refundCalc.entity.registrationNumber,
      companyName: refundCalc.entity.legalName,
      taxId: refundCalc.entity.taxId
    },
    shareholderDetails: {
      name: refundCalc.shareholder.fullName,
      idCardNumber: refundCalc.shareholder.idCardNumber,
      address: refundCalc.shareholder.address,
      nationality: refundCalc.shareholder.nationality
    },
    dividendDetails: {
      distributionDate: refundCalc.dividendDate,
      dividendAmount: refundCalc.dividendAmount,
      sourceAccount: refundCalc.sourceAccount,
      fiscalYear: refundCalc.fiscalYear
    },
    refundCalculation: {
      citPaid: refundCalc.citPaid,
      refundRate: `${refundCalc.refundRate.numerator}/${refundCalc.refundRate.denominator}`,
      refundAmount: refundCalc.refundAmount,
      profitType: refundCalc.profitType
    },
    supportingDocuments: [
      `audited_fs_${refundCalc.fiscalYear}.pdf`,
      `dividend_resolution_${refundCalc.dividendDate.toISOString()}.pdf`,
      `tax_account_statement_${refundCalc.fiscalYear}.pdf`
    ],
    declaration: {
      signedBy: refundCalc.shareholder.fullName,
      date: new Date(),
      signature: await generateDigitalSignature(refundCalc)
    }
  };
}
```

---

### 18. VAT COMPLIANCE AGENT (BAM II)

#### 18.1 Agent Overview

**Purpose**: Automate VAT compliance for Malta entities with BAM II integration

**Legal Basis**: Value Added Tax Act (Cap. 406), BAM II Regulations

**Key Features**:
- Real-time VAT classification (18%, 7%, 5%, 0%, exempt)
- iGaming B2C zero-rating logic
- Monthly VAT return generation (XML format)
- BAM II portal submission automation
- Deadline tracking (20th of month following reporting period)

#### 18.2 VAT Classification Engine

```typescript
enum VatRate {
  STANDARD_18 = 0.18,
  REDUCED_7 = 0.07,      // Hotels, catering
  REDUCED_5 = 0.05,      // Books, energy
  ZERO_RATED = 0.00,     // Exports, intra-EU, iGaming B2C
  EXEMPT = null          // Financial services, insurance
}

interface VatClassification {
  rate: VatRate;
  rateDescription: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  classification: string;
  justification: string[];
}

function classifyVatTransaction(transaction: Transaction): VatClassification {
  const { description, amount, customerType, customerCountry, supplierMgaLicensed } = transaction;
  
  // iGaming Special Rules
  if (supplierMgaLicensed && isGamingTransaction(description)) {
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
        ]
      };
    } else {
      // B2B gaming services: standard rate
      return {
        rate: VatRate.STANDARD_18,
        rateDescription: 'Standard 18% (B2B gaming services)',
        netAmount: amount / 1.18,
        vatAmount: amount - (amount / 1.18),
        grossAmount: amount,
        classification: 'B2B Gaming Services',
        justification: ['White-label platform services to other operators']
      };
    }
  }
  
  // Exports / Intra-EU Supply
  if (customerCountry !== 'MT') {
    if (isEUCountry(customerCountry)) {
      return {
        rate: VatRate.ZERO_RATED,
        rateDescription: 'Zero-rated (Intra-EU supply)',
        netAmount: amount,
        vatAmount: 0,
        grossAmount: amount,
        classification: 'Intra-EU Supply',
        justification: ['Customer in EU member state', 'VAT reverse charge applies']
      };
    } else {
      return {
        rate: VatRate.ZERO_RATED,
        rateDescription: 'Zero-rated (Export)',
        netAmount: amount,
        vatAmount: 0,
        grossAmount: amount,
        classification: 'Export Outside EU',
        justification: ['Export to non-EU country']
      };
    }
  }
  
  // Hospitality (7%)
  if (matchesPattern(description, ['hotel', 'accommodation', 'catering', 'restaurant'])) {
    return {
      rate: VatRate.REDUCED_7,
      rateDescription: 'Reduced 7% (Hospitality)',
      netAmount: amount / 1.07,
      vatAmount: amount - (amount / 1.07),
      grossAmount: amount,
      classification: 'Hotel/Catering Services',
      justification: ['Reduced rate per VAT Act Schedule 2']
    };
  }
  
  // Books, Energy (5%)
  if (matchesPattern(description, ['book', 'newspaper', 'magazine', 'electricity', 'heating'])) {
    return {
      rate: VatRate.REDUCED_5,
      rateDescription: 'Reduced 5% (Essentials)',
      netAmount: amount / 1.05,
      vatAmount: amount - (amount / 1.05),
      grossAmount: amount,
      classification: 'Books/Energy',
      justification: ['Reduced rate per VAT Act Schedule 3']
    };
  }
  
  // Financial Services (Exempt)
  if (matchesPattern(description, ['banking', 'insurance', 'loan', 'investment', 'financial'])) {
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
      ]
    };
  }
  
  // Default: Standard 18%
  return {
    rate: VatRate.STANDARD_18,
    rateDescription: 'Standard 18%',
    netAmount: amount / 1.18,
    vatAmount: amount - (amount / 1.18),
    grossAmount: amount,
    classification: 'Standard Rate Supply',
    justification: ['Default VAT rate per VAT Act']
  };
}
```

#### 18.3 VAT Return Generation (BAM II XML)

**BAM II XML Schema**:

```typescript
interface VatReturn {
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

function generateVatReturn(
  periodStart: Date,
  periodEnd: Date,
  transactions: Transaction[]
): VatReturn {
  const sales: Record<string, VatReturnLine> = {};
  const purchases: Record<string, VatReturnLine> = {};
  
  // Classify all transactions
  for (const txn of transactions) {
    const classification = classifyVatTransaction(txn);
    
    if (txn.type === 'sale') {
      const rateKey = getRateKey(classification.rate);
      if (!sales[rateKey]) {
        sales[rateKey] = {
          rate: classification.rate,
          netAmount: 0,
          vatAmount: 0,
          grossAmount: 0,
          transactionCount: 0
        };
      }
      sales[rateKey].netAmount += classification.netAmount;
      sales[rateKey].vatAmount += classification.vatAmount;
      sales[rateKey].grossAmount += classification.grossAmount;
      sales[rateKey].transactionCount++;
    } else if (txn.type === 'purchase') {
      // Similar logic for purchases
      const rateKey = getRateKey(classification.rate);
      if (!purchases[rateKey]) {
        purchases[rateKey] = {
          rate: classification.rate,
          netAmount: 0,
          vatAmount: 0,
          grossAmount: 0,
          transactionCount: 0
        };
      }
      purchases[rateKey].netAmount += classification.netAmount;
      purchases[rateKey].vatAmount += classification.vatAmount;
      purchases[rateKey].grossAmount += classification.grossAmount;
      purchases[rateKey].transactionCount++;
    }
  }
  
  // Calculate totals
  const totalOutputVat = Object.values(sales).reduce(
    (sum, line) => sum + line.vatAmount, 0
  );
  const totalInputVat = Object.values(purchases).reduce(
    (sum, line) => sum + line.vatAmount, 0
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
    vatNumber: entity.vatNumber,
    sales: {
      standardRate: sales['standard'] || createEmptyLine(),
      reduced7Rate: sales['reduced7'] || createEmptyLine(),
      reduced5Rate: sales['reduced5'] || createEmptyLine(),
      zeroRated: sales['zero'] || createEmptyLine(),
      exempt: sales['exempt'] || createEmptyLine(),
      intraEUSupplies: sales['intraEU'] || createEmptyLine(),
      exports: sales['export'] || createEmptyLine()
    },
    purchases: {
      standardRate: purchases['standard'] || createEmptyLine(),
      reduced7Rate: purchases['reduced7'] || createEmptyLine(),
      reduced5Rate: purchases['reduced5'] || createEmptyLine(),
      exempt: purchases['exempt'] || createEmptyLine(),
      imports: purchases['import'] || createEmptyLine(),
      intraEUAcquisitions: purchases['intraEU'] || createEmptyLine()
    },
    totalOutputVat: roundCurrency(totalOutputVat),
    totalInputVat: roundCurrency(totalInputVat),
    vatPayable: roundCurrency(vatPayable),
    vatRefundable: roundCurrency(vatRefundable),
    filingDeadline,
    paymentDeadline
  };
}
```

**BAM II XML Generation**:

```typescript
function generateBAM2XML(vatReturn: VatReturn): string {
  // BAM II XML Schema (simplified structure)
  return `<?xml version="1.0" encoding="UTF-8"?>
<vatReturn xmlns="http://cfr.gov.mt/bam2/vat">
  <header>
    <vatNumber>${vatReturn.vatNumber}</vatNumber>
    <periodStart>${formatDate(vatReturn.periodStart)}</periodStart>
    <periodEnd>${formatDate(vatReturn.periodEnd)}</periodEnd>
    <filingDate>${formatDate(new Date())}</filingDate>
  </header>
  
  <outputVat>
    <standardRate>
      <netAmount>${vatReturn.sales.standardRate.netAmount}</netAmount>
      <vatAmount>${vatReturn.sales.standardRate.vatAmount}</vatAmount>
    </standardRate>
    <reduced7Rate>
      <netAmount>${vatReturn.sales.reduced7Rate.netAmount}</netAmount>
      <vatAmount>${vatReturn.sales.reduced7Rate.vatAmount}</vatAmount>
    </reduced7Rate>
    <reduced5Rate>
      <netAmount>${vatReturn.sales.reduced5Rate.netAmount}</netAmount>
      <vatAmount>${vatReturn.sales.reduced5Rate.vatAmount}</vatAmount>
    </reduced5Rate>
    <zeroRated>
      <netAmount>${vatReturn.sales.zeroRated.netAmount}</netAmount>
    </zeroRated>
    <exempt>
      <netAmount>${vatReturn.sales.exempt.netAmount}</netAmount>
    </exempt>
    <intraEUSupplies>
      <netAmount>${vatReturn.sales.intraEUSupplies.netAmount}</netAmount>
    </intraEUSupplies>
    <exports>
      <netAmount>${vatReturn.sales.exports.netAmount}</netAmount>
    </exports>
  </outputVat>
  
  <inputVat>
    <standardRate>
      <netAmount>${vatReturn.purchases.standardRate.netAmount}</netAmount>
      <vatAmount>${vatReturn.purchases.standardRate.vatAmount}</vatAmount>
    </standardRate>
    <reduced7Rate>
      <netAmount>${vatReturn.purchases.reduced7Rate.netAmount}</netAmount>
      <vatAmount>${vatReturn.purchases.reduced7Rate.vatAmount}</vatAmount>
    </reduced7Rate>
    <reduced5Rate>
      <netAmount>${vatReturn.purchases.reduced5Rate.netAmount}</netAmount>
      <vatAmount>${vatReturn.purchases.reduced5Rate.vatAmount}</vatAmount>
    </reduced5Rate>
    <exempt>
      <netAmount>${vatReturn.purchases.exempt.netAmount}</netAmount>
    </exempt>
    <imports>
      <netAmount>${vatReturn.purchases.imports.netAmount}</netAmount>
      <vatAmount>${vatReturn.purchases.imports.vatAmount}</vatAmount>
    </imports>
    <intraEUAcquisitions>
      <netAmount>${vatReturn.purchases.intraEUAcquisitions.netAmount}</netAmount>
      <vatAmount>${vatReturn.purchases.intraEUAcquisitions.vatAmount}</vatAmount>
    </intraEUAcquisitions>
  </inputVat>
  
  <summary>
    <totalOutputVat>${vatReturn.totalOutputVat}</totalOutputVat>
    <totalInputVat>${vatReturn.totalInputVat}</totalInputVat>
    <vatPayable>${vatReturn.vatPayable}</vatPayable>
    <vatRefundable>${vatReturn.vatRefundable}</vatRefundable>
  </summary>
  
  <declaration>
    <signedBy>${entity.authorizedSignatory}</signedBy>
    <signature>${digitalSignature}</signature>
    <date>${formatDate(new Date())}</date>
  </declaration>
</vatReturn>`;
}
```

#### 18.4 BAM II API Integration

```typescript
class BAM2Client {
  private baseUrl = 'https://cfr.gov.mt/bam/api/v2';
  private accessToken: string;
  
  async authenticate(credentials: BAM2Credentials): Promise<void> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        scope: 'vat:write cit:write paye:read'
      })
    });
    
    const data = await response.json();
    this.accessToken = data.access_token;
  }
  
  async submitVatReturn(vatReturn: VatReturn, xml: string): Promise<SubmissionResult> {
    const response = await fetch(`${this.baseUrl}/vat/returns`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/xml'
      },
      body: xml
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`BAM II submission failed: ${error.message}`);
    }
    
    const result = await response.json();
    return {
      success: true,
      reference: result.filingReference,
      submissionDate: new Date(result.submittedAt),
      status: 'accepted',
      confirmationNumber: result.confirmationNumber
    };
  }
  
  async getVatReturnStatus(reference: string): Promise<VatReturnStatus> {
    const response = await fetch(`${this.baseUrl}/vat/returns/${reference}`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    
    const data = await response.json();
    return {
      reference: data.reference,
      status: data.status,  // 'submitted', 'processing', 'accepted', 'rejected'
      submittedAt: new Date(data.submittedAt),
      processedAt: data.processedAt ? new Date(data.processedAt) : null,
      errors: data.errors || [],
      paymentStatus: data.paymentStatus
    };
  }
}
```

---

### 19. PAYE & SOCIAL SECURITY AGENT

#### 19.1 Agent Overview

**Purpose**: Real-time PAYE and social security reporting via BAM II

**Legal Basis**: Income Tax Management Act (Cap. 372), Social Security Act (Cap. 318)

**Key Features**:
- Real-time payroll reporting (BAM II)
- NI contribution calculations (10% employee, 10% employer)
- FS3 annual reconciliation
- Progressive tax bracket calculations
- Married/parent allowances (2026 updates)

#### 19.2 PAYE Calculation

```typescript
interface PayeCalculation {
  employeeId: string;
  payPeriod: PayPeriod;
  grossSalary: number;
  taxableIncome: number;
  incomeTax: number;
  socialSecurity: number;
  netPay: number;
  employerNI: number;
  totalCost: number;
}

// Malta Tax Brackets (2026)
const TAX_BRACKETS = [
  { min: 0, max: 9100, rate: 0 },           // 0%
  { min: 9101, max: 14500, rate: 0.15 },    // 15%
  { min: 14501, max: 19500, rate: 0.25 },   // 25%
  { min: 19501, max: Infinity, rate: 0.35 } // 35%
];

// Allowances (2026)
const ALLOWANCES = {
  SINGLE: 9100,
  MARRIED: 12300,           // Enhanced 2026
  PARENT: 12300,            // Enhanced 2026 (per child)
  DISABILITY: 2100
};

function calculatePAYE(
  employee: Employee,
  grossSalary: number,
  payPeriod: PayPeriod
): PayeCalculation {
  // Annualize salary for bracket calculation
  const annualSalary = grossSalary * getPayPeriodsPerYear(payPeriod);
  
  // Apply allowances
  let taxableIncome = annualSalary;
  
  if (employee.maritalStatus === 'married') {
    taxableIncome -= ALLOWANCES.MARRIED;
  } else {
    taxableIncome -= ALLOWANCES.SINGLE;
  }
  
  if (employee.hasChildren) {
    taxableIncome -= ALLOWANCES.PARENT * employee.numberOfChildren;
  }
  
  if (employee.hasDisability) {
    taxableIncome -= ALLOWANCES.DISABILITY;
  }
  
  // Calculate progressive tax
  let incomeTax = 0;
  for (const bracket of TAX_BRACKETS) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      incomeTax += taxableInBracket * bracket.rate;
    }
  }
  
  // Convert back to pay period
  const payPeriodTax = incomeTax / getPayPeriodsPerYear(payPeriod);
  
  // Social Security (10% on all income, no cap)
  const socialSecurity = grossSalary * 0.10;
  const employerNI = grossSalary * 0.10;
  
  // Net pay
  const netPay = grossSalary - payPeriodTax - socialSecurity;
  const totalCost = grossSalary + employerNI;
  
  return {
    employeeId: employee.id,
    payPeriod,
    grossSalary: roundCurrency(grossSalary),
    taxableIncome: roundCurrency(taxableIncome / getPayPeriodsPerYear(payPeriod)),
    incomeTax: roundCurrency(payPeriodTax),
    socialSecurity: roundCurrency(socialSecurity),
    netPay: roundCurrency(netPay),
    employerNI: roundCurrency(employerNI),
    totalCost: roundCurrency(totalCost)
  };
}
```

#### 19.3 Real-Time BAM II Reporting

```typescript
interface BAM2PayrollSubmission {
  entityId: string;
  vatNumber: string;
  payPeriod: PayPeriod;
  employees: PayrollRecord[];
  submissionTimestamp: Date;
}

interface PayrollRecord {
  employeeId: string;
  idCardNumber: string;
  grossPay: number;
  incomeTax: number;
  socialSecurity: number;
  netPay: number;
  paymentDate: Date;
}

async function submitRealTimePayroll(
  payroll: PayrollRecord[]
): Promise<SubmissionResult> {
  const submission: BAM2PayrollSubmission = {
    entityId: entity.id,
    vatNumber: entity.vatNumber,
    payPeriod: payroll[0].payPeriod,
    employees: payroll,
    submissionTimestamp: new Date()
  };
  
  // Submit via BAM II API
  const response = await bam2Client.submitPayroll(submission);
  
  return {
    success: true,
    reference: response.reference,
    submissionDate: response.timestamp,
    recordsProcessed: payroll.length
  };
}
```

---

### 20. INTERNATIONAL TAX AGENT (DAC6/CRS)

#### 20.1 Agent Overview

**Purpose**: Automated compliance with DAC6 and CRS reporting requirements

**Legal Basis**: S.L. 584.23 (DAC6), CRS Implementation

**Key Features**:
- DAC6 hallmark detection
- CRS financial account reporting
- FATCA compliance
- Cross-border arrangement monitoring

#### 20.2 DAC6 Hallmark Detection

```typescript
enum DAC6Hallmark {
  // Category A: Generic Hallmarks
  A1_CONFIDENTIALITY = 'A1',  // Confidentiality clause
  A2_FEES = 'A2',              // Contingent fees
  A3_STANDARDISED = 'A3',      // Standardized documentation
  // Category B: Specific Hallmarks
  B1_CONVERSION = 'B1',        // Conversion of income
  B2_RECOUPMENT = 'B2',        // Income recoupment
  B3_DEDUCTIONS = 'B3',        // Deductions without corresponding inclusion
  // Category C: Cross-border transactions
  C1_CRYPTO = 'C1',            // Crypto-asset transactions
  C2_TRANSFER = 'C2',          // Transfer of assets
  // Category D: Transfer pricing
  D1_TP_BENEFITS = 'D1',       // TP arrangements with hard-to-value intangibles
  // Category E: Automatic exchange benefits
  E1_CRS_AVOIDANCE = 'E1',     // CRS avoidance arrangements
  E2_TRUSTS = 'E2'             // Opaque ownership structures
}

interface DAC6Arrangement {
  arrangementId: string;
  participants: Participant[];
  intermediaries: Intermediary[];
  hallmarks: DAC6Hallmark[];
  isReportable: boolean;
  reportDeadline: Date;
  reportStatus: 'not_reported' | 'reported' | 'late' | 'exempt';
}

function detectDAC6Hallmarks(transaction: CrossBorderTransaction): DAC6Hallmark[] {
  const hallmarks: DAC6Hallmark[] = [];
  
  // A1: Confidentiality clause
  if (transaction.hasConfidentialityClause) {
    hallmarks.push(DAC6Hallmark.A1_CONFIDENTIALITY);
  }
  
  // A2: Contingent fees
  if (transaction.feesAreContingentOnTaxBenefit) {
    hallmarks.push(DAC6Hallmark.A2_FEES);
  }
  
  // B1: Conversion of income
  if (transaction.convertsIncomeToLowerTaxCategory) {
    hallmarks.push(DAC6Hallmark.B1_CONVERSION);
  }
  
  // E1: CRS avoidance
  if (transaction.appearsToAvoidCRSReporting) {
    hallmarks.push(DAC6Hallmark.E1_CRS_AVOIDANCE);
  }
  
  return hallmarks;
}

function isReportableArrangement(hallmarks: DAC6Hallmark[]): boolean {
  // At least one hallmark from Category A, B, C, D, or E
  return hallmarks.length > 0;
}

function calculateReportDeadline(triggerDate: Date): Date {
  // 30 days after hallmark triggered
  const deadline = new Date(triggerDate);
  deadline.setDate(deadline.getDate() + 30);
  return deadline;
}
```

---

## PART F: SPECIALIZED AGENTS

### 21. IGAMING COMPLIANCE AGENT

#### 21.1 Agent Overview

**Purpose**: Comprehensive compliance for MGA-licensed iGaming operators

**Legal Basis**: Gaming Act (Cap. 583), MGA Regulations

**Key Features**:
- GGR calculation (revenue - player winnings)
- Gaming duty computation (5% GGR)
- Player liability reconciliation
- B2C VAT zero-rating automation
- AML transaction monitoring
- Player fund segregation

#### 21.2 GGR Calculation

```typescript
interface GamingRevenueCalculation {
  period: DateRange;
  totalStakes: number;
  totalPayouts: number;
  grossGamingRevenue: number;  // Stakes - Payouts
  bonuses: number;
  promotionalOffers: number;
  netGamingRevenue: number;
  gamingDuty: number;  // 5% of GGR
}

function calculateGGR(transactions: GamingTransaction[]): GamingRevenueCalculation {
  let totalStakes = 0;
  let totalPayouts = 0;
  let totalBonuses = 0;
  let totalPromotionalOffers = 0;
  
  for (const txn of transactions) {
    totalStakes += txn.stake;
    totalPayouts += txn.payout;
    
    if (txn.bonusAmount) {
      totalBonuses += txn.bonusAmount;
    }
    
    if (txn.promotionalOfferAmount) {
      totalPromotionalOffers += txn.promotionalOfferAmount;
    }
  }
  
  // GGR = Total Stakes - Total Payouts
  const grossGamingRevenue = totalStakes - totalPayouts;
  
  // Net GGR = GGR - Bonuses - Promotional Offers
  const netGamingRevenue = grossGamingRevenue - totalBonuses - totalPromotionalOffers;
  
  // Gaming Duty = 5% of GGR
  const gamingDuty = grossGamingRevenue * 0.05;
  
  return {
    period: getPeriodFromTransactions(transactions),
    totalStakes: roundCurrency(totalStakes),
    totalPayouts: roundCurrency(totalPayouts),
    grossGamingRevenue: roundCurrency(grossGamingRevenue),
    bonuses: roundCurrency(totalBonuses),
    promotionalOffers: roundCurrency(totalPromotionalOffers),
    netGamingRevenue: roundCurrency(netGamingRevenue),
    gamingDuty: roundCurrency(gamingDuty)
  };
}
```

#### 21.3 Player Liability Reconciliation

```typescript
interface PlayerLiabilityReconciliation {
  playerAccountBalance: number;  // Total player deposits + winnings - withdrawals
  segregatedBankAccount: number;  // Amount in segregated account
  variance: number;
  isReconciled: boolean;
  lastReconciliationDate: Date;
}

async function reconcilePlayerLiabilities(): Promise<PlayerLiabilityReconciliation> {
  // Sum all player account balances
  const playerAccountBalance = await db.query(`
    SELECT SUM(balance) as total
    FROM player_accounts
    WHERE status = 'active'
  `);
  
  // Get segregated bank account balance
  const segregatedAccountBalance = await bankApi.getAccountBalance(
    entity.segregatedAccountNumber
  );
  
  const variance = playerAccountBalance - segregatedAccountBalance;
  const tolerance = 100;  // €100 tolerance
  
  return {
    playerAccountBalance,
    segregatedBankAccount: segregatedAccountBalance,
    variance,
    isReconciled: Math.abs(variance) <= tolerance,
    lastReconciliationDate: new Date()
  };
}
```

---

### 22. MFSA PILLAR 3 REPORTING AGENT

#### 22.1 Agent Overview

**Purpose**: Generate Pillar 3 disclosures for MFSA-regulated entities

**Legal Basis**: Investment Services Act (Cap. 370), Basel III, AIFMD

**Key Features**:
- Capital adequacy calculations
- Risk-weighted assets (RWA) computation
- Liquidity coverage ratio (LCR)
- Leverage ratio
- Public disclosure generation

#### 22.2 Pillar 3 Disclosure Generation

```typescript
interface Pillar3Disclosure {
  entityId: string;
  reportingDate: Date;
  capitalAdequacy: {
    commonEquityTier1: number;
    additionalTier1: number;
    tier2: number;
    totalCapital: number;
    riskWeightedAssets: number;
    capitalAdequacyRatio: number;  // Total Capital / RWA (minimum 8%)
    cet1Ratio: number;  // CET1 / RWA (minimum 4.5%)
  };
  leverageRatio: number;  // Tier 1 Capital / Total Exposure (minimum 3%)
  liquidityCoverageRatio: number;  // HQLA / Net Cash Outflows (minimum 100%)
  riskDisclosures: {
    creditRisk: CreditRiskDisclosure;
    marketRisk: MarketRiskDisclosure;
    operationalRisk: OperationalRiskDisclosure;
  };
}

function calculateCapitalAdequacy(entity: MFSARegulatedEntity): CapitalAdequacy {
  // Common Equity Tier 1 (CET1)
  const cet1 = entity.shareCapital + entity.sharePremium + 
               entity.retainedEarnings - entity.intangibleAssets;
  
  // Risk-Weighted Assets
  const rwa = calculateRWA(entity.assets);
  
  // Capital Adequacy Ratio = Total Capital / RWA
  const totalCapital = cet1;  // Simplified (add AT1 and T2 if applicable)
  const car = (totalCapital / rwa) * 100;
  const cet1Ratio = (cet1 / rwa) * 100;
  
  return {
    commonEquityTier1: cet1,
    totalCapital,
    riskWeightedAssets: rwa,
    capitalAdequacyRatio: roundDecimal(car, 2),
    cet1Ratio: roundDecimal(cet1Ratio, 2),
    isCompliant: car >= 8 && cet1Ratio >= 4.5
  };
}

function calculateRWA(assets: Asset[]): number {
  // Risk weights per Basel III
  const RISK_WEIGHTS = {
    GOVERNMENT_BONDS: 0,        // 0%
    RESIDENTIAL_MORTGAGES: 0.35, // 35%
    CORPORATE_LOANS: 1.0,       // 100%
    RETAIL_LOANS: 0.75,         // 75%
    EQUITY: 1.0                 // 100%
  };
  
  let rwa = 0;
  for (const asset of assets) {
    const riskWeight = RISK_WEIGHTS[asset.category] || 1.0;
    rwa += asset.value * riskWeight;
  }
  
  return rwa;
}
```

---

### 23. TRANSFER PRICING AGENT

#### 23.1 Agent Overview

**Purpose**: Ensure arm's length pricing for intra-group transactions

**Legal Basis**: Income Tax Act (Cap. 123), OECD Transfer Pricing Guidelines

**Key Features**:
- Master File and Local File generation
- Comparable uncontrolled price (CUP) analysis
- Transactional net margin method (TNMM)
- Advanced Pricing Agreement (APA) support

#### 23.2 Transfer Pricing Documentation

```typescript
interface TransferPricingDocumentation {
  masterFile: MasterFile;
  localFile: LocalFile;
  countryByCountry: CountryByCountryReport;
}

interface LocalFile {
  entityId: string;
  fiscalYear: number;
  relatedPartyTransactions: RelatedPartyTransaction[];
  comparabilityAnalysis: ComparabilityAnalysis;
  transferPricingMethod: TransferPricingMethod;
  armLengthRange: PriceRange;
}

function generateLocalFile(entity: Entity, transactions: Transaction[]): LocalFile {
  // Identify related party transactions
  const rptTransactions = transactions.filter(t => t.isRelatedParty);
  
  // Group by transaction type
  const transactionsByType = groupBy(rptTransactions, 'type');
  
  // Apply transfer pricing method
  const tpMethod = determineBestMethod(transactionsByType);
  const armLengthRange = calculateArmLengthRange(tpMethod, transactionsByType);
  
  return {
    entityId: entity.id,
    fiscalYear: entity.fiscalYear,
    relatedPartyTransactions: rptTransactions,
    comparabilityAnalysis: performComparabilityAnalysis(transactionsByType),
    transferPricingMethod: tpMethod,
    armLengthRange
  };
}
```

---

## PART G: DEPLOYMENT & OPERATIONS

### 24. IMPLEMENTATION ROADMAP

#### 24.1 Phase 1: Foundation (Months 1-3)

**Objectives**:
- Set up core infrastructure
- Implement basic data models
- Build foundational agents

**Deliverables**:
- ✅ Supabase database schema (Malta-specific tables)
- ✅ Base agent framework
- ✅ Entity classification engine
- ✅ Tax account allocation system

**Success Criteria**:
- Entity classification accuracy: >95%
- Tax account allocation accuracy: 100%

#### 24.2 Phase 2: Accounting Agents (Months 4-6)

**Objectives**:
- IFRS financial statement generation
- GAPSME compliance
- MBR filing automation

**Deliverables**:
- IFRS Statement Agent
- GAPSME Compliance Agent
- MBR Filing Agent

**Success Criteria**:
- Financial statement generation time: <2 hours (vs. 8 hours manual)
- MBR filing success rate: >99%

#### 24.3 Phase 3: Audit Agents (Months 7-9)

**Objectives**:
- ISA audit workflow automation
- ISRE 2400 review automation
- Audit exemption validation

**Deliverables**:
- ISA Statutory Audit Agent
- ISRE 2400 Review Agent
- Micro-Entity Exemption Agent

**Success Criteria**:
- Audit planning time: <4 hours (vs. 16 hours manual)
- Risk assessment coverage: 100% of FS areas

#### 24.4 Phase 4: Tax Agents (Months 10-12)

**Objectives**:
- CIT refund automation
- VAT BAM II integration
- PAYE real-time reporting

**Deliverables**:
- CIT Refund Calculation Agent
- VAT Compliance Agent (BAM II)
- PAYE & Social Security Agent
- International Tax Agent (DAC6/CRS)

**Success Criteria**:
- Refund calculation accuracy: >99%
- VAT filing automation: 100%
- BAM II submission success rate: >99%

#### 24.5 Phase 5: Specialized Agents (Months 13-15)

**Objectives**:
- iGaming compliance automation
- MFSA Pillar 3 reporting
- Transfer pricing documentation

**Deliverables**:
- iGaming Compliance Agent
- MFSA Pillar 3 Reporting Agent
- Transfer Pricing Agent

**Success Criteria**:
- GGR calculation accuracy: >99.9%
- Pillar 3 disclosure generation time: <1 day (vs. 1 week manual)

---

### 25. TESTING & VALIDATION

#### 25.1 Unit Testing

```typescript
describe('CIT Refund Calculation', () => {
  it('should calculate 6/7ths refund correctly', () => {
    const result = calculateRefund(65000, ProfitType.TRADING, 35000);
    expect(result.refundAmount).toBe(30000);
    expect(result.effectiveRate).toBe(5.0);
  });
  
  it('should calculate 5/7ths refund correctly', () => {
    const result = calculateRefund(65000, ProfitType.PASSIVE_INTEREST_ROYALTIES, 35000);
    expect(result.refundAmount).toBe(25000);
    expect(result.effectiveRate).toBe(10.0);
  });
});
```

#### 25.2 Integration Testing

```typescript
describe('BAM II Integration', () => {
  it('should submit VAT return successfully', async () => {
    const vatReturn = generateVatReturn(periodStart, periodEnd, transactions);
    const xml = generateBAM2XML(vatReturn);
    const result = await bam2Client.submitVatReturn(vatReturn, xml);
    
    expect(result.success).toBe(true);
    expect(result.reference).toBeDefined();
  });
});
```

#### 25.3 Validation with Real Data

**Test Cases**:
1. **Big-4 Benchmarking**: Compare agent outputs to PwC Malta/Deloitte Malta manual calculations
2. **Historical Data Validation**: Run agents on prior-year data and compare to filed returns
3. **Edge Case Testing**: Test boundary conditions (€46,600 threshold, startup exemptions, etc.)

---

### 26. ONGOING MAINTENANCE

#### 26.1 Regulatory Update Monitoring

```typescript
class RegulatoryUpdateMonitor {
  async checkForUpdates(): Promise<RegulatoryUpdate[]> {
    // Monitor sources:
    // 1. MIA Technical E-News (monthly)
    // 2. CFR Practice Notes
    // 3. MFSA Circulars
    // 4. Legal Notice publications
    
    const updates = await Promise.all([
      this.scrapeMIAWebsite(),
      this.checkCFRNotices(),
      this.checkMFSACirculars(),
      this.checkLegalNotices()
    ]);
    
    return updates.flat();
  }
  
  async applyUpdate(update: RegulatoryUpdate): Promise<void> {
    // Update agent logic
    // Update tax rates/thresholds
    // Update validation rules
    // Regenerate test cases
  }
}
```

#### 26.2 Performance Monitoring

**Key Metrics**:
- Agent execution time (target: <5 minutes per agent)
- API response times (BAM II, MBR)
- Error rates (<0.1%)
- User satisfaction scores (>4.5/5)

#### 26.3 Continuous Improvement

**Feedback Loop**:
1. Collect user feedback on agent outputs
2. Analyze accuracy metrics
3. Identify improvement opportunities
4. Update agent logic
5. Re-test and deploy

---

### 27. SUCCESS METRICS & KPIs

#### 27.1 Efficiency Metrics

| Metric | Baseline (Manual) | Target (AI-Automated) | Improvement |
|--------|-------------------|----------------------|-------------|
| **Financial Statement Preparation** | 8 hours | 2 hours | 75% reduction |
| **VAT Return Preparation** | 2 hours | 15 minutes | 87.5% reduction |
| **CIT Refund Calculation** | 1 hour | 5 minutes | 91.7% reduction |
| **Audit Planning** | 16 hours | 4 hours | 75% reduction |
| **MBR Filing** | 30 minutes | 5 minutes | 83.3% reduction |

#### 27.2 Accuracy Metrics

| Metric | Target | Current (if applicable) |
|--------|--------|------------------------|
| **Refund Calculation Accuracy** | >99% | TBD |
| **VAT Classification Accuracy** | >98% | TBD |
| **Entity Classification Accuracy** | >95% | TBD |
| **FS Generation Accuracy** | >99% | TBD |

#### 27.3 Compliance Metrics

| Metric | Target |
|--------|--------|
| **Regulatory Filing Success Rate** | >99% |
| **Deadline Compliance** | 100% |
| **Penalty Avoidance** | 100% |
| **Audit Finding Reduction** | 50% reduction in material findings |

#### 27.4 ROI Calculation

**Cost Savings Per Entity Per Year**:
- Accounting: €2,000 (40 hours × €50/hour)
- Audit: €3,000 (60 hours × €50/hour)
- Tax: €1,500 (30 hours × €50/hour)
- **Total: €6,500 per entity**

**For 100 entities**: €650,000 annual savings

**Platform Costs** (estimated):
- Infrastructure: €50,000/year
- Maintenance: €100,000/year
- **Total: €150,000/year**

**Net ROI**: €500,000/year (333% ROI)

---

## CONCLUSION

This comprehensive guide provides the technical foundation for implementing Big-4 quality autonomous AI agents for Malta accounting, audit, and tax compliance. The system leverages:

- **Malta's digital-first infrastructure** (BAM II, MBR portals)
- **Clear regulatory framework** (100% IFRS, tiered audit regime)
- **Unique tax features** (full imputation system, refund mechanism)
- **Specialized sectors** (iGaming, financial services)

**Expected Outcomes**:
- 70% reduction in compliance time
- 90% accuracy in refund calculations
- 100% regulatory adherence
- €500K+ annual ROI for 100 entities

**Next Steps**:
1. Review and approve implementation roadmap
2. Allocate development resources
3. Begin Phase 1 implementation
4. Establish testing protocols
5. Deploy to pilot clients

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-09  
**Author**: Prisma Core AI Agent System Team  
**Status**: Implementation Ready
