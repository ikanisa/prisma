# Malta Autonomous Tax Agents

This directory contains Malta-specific autonomous AI tax agents that provide Big-4 level tax automation.

## Overview

Malta's tax system is unique with its full imputation system, shareholder refund mechanisms, and participation exemption regime. These agents automate complex tax calculations and compliance workflows.

## Agents

### 1. VAT Agent (`vat-agent.ts`)

AI-powered Malta VAT calculation and compliance.

**Features:**
- Multi-rate support (18%, 12%, 7%, 5%, 0%, exempt)
- GPT-4 powered rate classification for complex transactions
- B2B intra-EU reverse charge detection
- SME scheme eligibility (Article 11/11A/11B)
- Intrastat threshold monitoring (€700)
- VAT return pre-submission validation

**Usage:**
```typescript
import { MaltaVATAgent } from '@prisma/tax';

const agent = new MaltaVATAgent({ enableAIClassification: true });

const result = await agent.calculateVAT({
  transactionType: 'sale',
  amount: 1000,
  goodsOrServices: 'services',
  description: 'Hotel accommodation',
  customerLocation: 'MT',
  customerType: 'b2c',
});
// Result: 7% rate, €70 VAT
```

---

### 2. Corporate Tax Agent (`corporate-tax-agent.ts`)

Full imputation system with shareholder refunds.

**Features:**
- 35% corporate tax calculation
- Tax account allocation (MTA, FIA, IPA, FTA, UA)
- Shareholder refund calculations:
  - 6/7ths (5% effective) for Malta trading income
  - 5/7ths (10% effective) for passive income
  - 2/3rds with double taxation relief
- 2025 FITWI 15% regime with safeguard test
- AI-powered regime suitability analysis

**Usage:**
```typescript
import { MaltaCorporateTaxAgentV2 } from '@prisma/tax';

const agent = new MaltaCorporateTaxAgentV2();

const result = await agent.calculateCorporateTax({
  chargeableIncome: 100000,
  incomeBreakdown: { maltaTradingIncome: 100000 },
  companyProfile: { name: 'Malta Ltd', isResident: true, isDomiciled: true },
  fiscalYear: 2025,
});
// Result: 35% tax, 6/7ths refund available, 5% effective rate
```

---

### 3. Participation Exemption Agent (`participation-exemption-agent.ts`)

100% exemption on dividends and capital gains from qualifying holdings.

**Features:**
- Equity holding test (≥5% + 2/3 qualifying rights)
- Investment value test (≥€1,164,000 + 183 days)
- Anti-abuse tests:
  - Investment/Portfolio test (>50% qualifying assets)
  - Tax test (15% safe harbor rate)
  - Active business test (<50% passive income)
- AI-powered qualification analysis

**Usage:**
```typescript
import { MaltaParticipationExemptionAgent } from '@prisma/tax';

const agent = new MaltaParticipationExemptionAgent();

const result = await agent.assessQualification(
  holding,        // ParticipationHolding
  'dividend',     // Income type
  100000,         // Amount
  financials      // SubsidiaryFinancials
);
```

---

### 4. Double Tax Relief Agent (`double-tax-relief-agent.ts`)

Optimize foreign income taxation with Malta's relief methods.

**Features:**
- 72+ Double Taxation Agreement database
- Three relief methods compared:
  - Treaty relief (credit for actual foreign tax)
  - Unilateral relief (domestic law credit)
  - FRFTC (25% deemed credit)
- AI-powered optimal method selection
- 2/3rds shareholder refund integration

**Usage:**
```typescript
import { MaltaDoubleTaxReliefAgent } from '@prisma/tax';

const agent = new MaltaDoubleTaxReliefAgent();

const result = await agent.calculateRelief({
  incomeType: 'dividend',
  sourceCountry: 'UK',
  grossAmount: 100000,
  foreignTaxPaid: 15000,
  treatyExists: true,
});
// Recommends optimal method with lowest effective rate
```

---

### 5. Transfer Pricing Agent (`transfer-pricing-agent.ts`)

OECD-compliant transfer pricing documentation and analysis.

**Features:**
- Related party transaction assessment
- OECD pricing methods (CUP, RPM, CPM, TNMM, PSM)
- Arm's length principle validation
- Master File / Local File generation (BEPS Action 13)
- Risk identification and remediation
- AI-powered comparability analysis

**Usage:**
```typescript
import { MaltaTransferPricingAgent } from '@prisma/tax';

const agent = new MaltaTransferPricingAgent();

const result = await agent.assessTransferPricing(
  transactions,   // RelatedPartyTransaction[]
  companyDetails, // CompanyProfile
  2025            // Fiscal year
);
```

---

## Configuration

All agents support the following configuration:

```typescript
interface AgentConfig {
  openaiApiKey?: string;        // OpenAI API key for AI features
  organizationId?: string;      // OpenAI organization ID
  userId?: string;              // User ID for tracking
  enableAIClassification?: boolean;  // Enable/disable AI features
}
```

Set `OPENAI_API_KEY` environment variable for AI features, or pass it directly.

## Types

Malta-specific types are defined in `packages/tax/src/types/malta.ts`:

- `MaltaTaxAccountType` - Tax account types (MTA, FIA, IPA, FTA, UA)
- `MaltaRefundRateType` - Refund rates (6/7, 5/7, 2/3)
- `CorporateTaxRequest` / `CorporateTaxResult`
- `ParticipationHolding` / `SubsidiaryFinancials`
- `ForeignIncomeForRelief` / `DoubleTaxReliefResult`
- `RelatedPartyTransaction` / `TransferPricingAssessment`

## Tests

Run tests with:

```bash
pnpm --filter @prisma/tax test -- --run src/tests/malta-agents.test.ts
```

---

### 6. CIT Refund Agent (`cit-refund-agent.ts`)

Automates Malta's unique shareholder refund mechanism.

**Features:**
- 6/7ths, 5/7ths, 2/3rds, and full refund calculations
- Tax account allocation (MTA, FIA, IPA)
- FS4 refund claim form generation
- Profit type classification

---

### 7. VAT Compliance Agent (`vat-compliance-agent.ts`)

BAM II integration for VAT filing automation.

**Features:**
- Transaction classification (18%, 7%, 5%, 0%, exempt)
- iGaming B2C zero-rating
- VAT return generation with XML output
- BAM II submission automation

---

### 8. PAYE Agent (`paye-agent.ts`)

Real-time payroll tax compliance.

**Features:**
- Progressive PAYE calculation
- Social security contributions (10% employee + 10% employer)
- FS3 annual reconciliation
- BAM II real-time reporting

---

### 9. DAC6/CRS Agent (`dac6-crs-agent.ts`)

International tax reporting for cross-border arrangements.

**Features:**
- Hallmark detection (A, B, C, D, E categories) with AI classification
- Cross-border arrangement analysis
- CRS financial account reporting (OECD standard)
- 30-day filing deadline tracking
- XML generation for CFR submission
- FATCA interoperability (IGA Model 1)

**Legal Basis:** S.L. 584.23 (DAC6 Malta Implementation)

**Usage:**
```typescript
import { DAC6CRSAgent } from '@prisma/tax';

const agent = new DAC6CRSAgent({ enableAIHallmarkDetection: true });

const result = await agent.analyzeArrangement({
  description: 'Cross-border IP licensing arrangement',
  participants: [...],
  transactionDetails: 'Royalty payments to low-tax jurisdiction',
});
// Result: Hallmarks detected, reporting deadline, recommendations
```

---

### 10. iGaming Compliance Agent (`igaming-compliance-agent.ts`)

MGA-licensed gaming operator compliance.

**Features:**
- GGR (Gross Gaming Revenue) calculation: Stakes - Payouts
- Gaming duty computation (5% of GGR)
- Player liability reconciliation
- Player fund segregation verification
- Progressive jackpot liability tracking (IFRS 15)
- B2C VAT zero-rating classification
- AML transaction monitoring
- MGA monthly reporting automation

**Legal Basis:** Gaming Act (Cap. 583), Gaming Authorisations Regulations (S.L. 583.05)

**Usage:**
```typescript
import { iGamingComplianceAgent } from '@prisma/tax';

const agent = new iGamingComplianceAgent({ mgaLicenseNumber: 'MGA/B2C/123' });

// Calculate GGR
const ggr = agent.calculateGGR(transactions, periodStart, periodEnd);

// Calculate gaming duty
const duty = agent.calculateGamingDuty(ggr);
// Result: 5% of GGR

// Monitor for AML
const alerts = agent.monitorTransactions(transactions);
```

---

### 11. MFSA Pillar 3 Agent (`mfsa-pillar3-agent.ts`)

Basel III regulatory disclosures for MFSA-regulated entities.

**Features:**
- Capital adequacy ratios (CET1, Tier 1, Total Capital)
- Risk-weighted asset calculations (credit, market, operational)
- Liquidity Coverage Ratio (LCR) calculation
- Net Stable Funding Ratio (NSFR) calculation
- Leverage ratio monitoring
- AIFMD risk disclosures for alternative investment funds
- Pillar 3 disclosure document generation

**Legal Basis:** Investment Services Act (Cap. 370), EU Regulation 575/2013 (CRR)

**Usage:**
```typescript
import { MFSAPillar3Agent } from '@prisma/tax';

const agent = new MFSAPillar3Agent();

// Generate full Pillar 3 disclosure
const disclosure = agent.generatePillar3Disclosure(
  'Malta Investment Ltd',
  'INVESTMENT_FIRM_CLASS_2',
  new Date(),
  capitalComponents,
  exposures,
  liquidityData,
  totalExposure
);

// Generate document
const document = agent.generateDisclosureDocument(disclosure);
```

---

## Configuration

All agents support the following configuration:

```typescript
interface AgentConfig {
  openaiApiKey?: string;        // OpenAI API key for AI features
  organizationId?: string;      // OpenAI organization ID
  userId?: string;              // User ID for tracking
  enableAIClassification?: boolean;  // Enable/disable AI features
}
```

Set `OPENAI_API_KEY` environment variable for AI features, or pass it directly.

## Types

Malta-specific types are defined in `packages/tax/src/types/malta.ts`:

- `MaltaTaxAccountType` - Tax account types (MTA, FIA, IPA, FTA, UA)
- `MaltaRefundRateType` - Refund rates (6/7, 5/7, 2/3)
- `CorporateTaxRequest` / `CorporateTaxResult`
- `ParticipationHolding` / `SubsidiaryFinancials`
- `ForeignIncomeForRelief` / `DoubleTaxReliefResult`
- `RelatedPartyTransaction` / `TransferPricingAssessment`
- `HallmarkCategory` / `CrossBorderArrangement` - DAC6 types
- `GamingTransaction` / `GGRCalculation` - iGaming types
- `CapitalRatios` / `LiquidityMetrics` - Pillar 3 types

## Tests

Run tests with:

```bash
pnpm --filter @prisma/tax test -- --run src/tests/malta-agents.test.ts
```

## Legal References

- Income Tax Act (Cap. 123)
- VAT Act (Act XXIII of 1998)
- Income Tax Management Act (Cap. 372)
- Gaming Act (Cap. 583)
- Investment Services Act (Cap. 370)
- S.L. 584.23 - DAC6 Implementation
- EU Regulation 575/2013 (CRR)
- OECD CRS Standard
- CFR Guidelines and Rulings

## Support

For questions about Malta tax legislation, consult the Commissioner for Revenue (CFR) guidelines or a qualified Malta tax advisor.

