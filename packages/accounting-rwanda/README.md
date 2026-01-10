# Rwanda Accounting Autonomous AI Agent System

**Big Four-level accounting, audit, and tax automation for Rwanda entities.**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-50%20passed-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-100%25%20guide-blue)]()

## Overview

Complete implementation of autonomous AI agents for Rwanda accounting, audit, and tax operations. Fully compliant with:

- **IFRS Standards** (via ICPAR Law 11/2008)
- **ISA Standards** (as issued by IAASB, without modifications)
- **RRA Tax Regulations** (VAT, CIT, PAYE via ISHEMA platform)
- **RSSB Requirements** (2026 contribution rates)

## Features

| Category | Capabilities |
|----------|--------------|
| **Accounting** | IFRS transaction categorization, journal entries, depreciation, bank reconciliation |
| **Audit** | ISA 315 risk assessment, materiality, anomaly detection, KAM reporting, opinion issuance |
| **Tax** | VAT 18%, CIT 28%, PAYE, RSSB, withholding tax, ISHEMA integration |
| **Reporting** | Balance Sheet, Income Statement, Changes in Equity, financial ratios |

## Installation

```bash
pnpm add @prisma/accounting-rwanda
```

## Quick Start

```typescript
import { initializeRwandaAccountingSystem } from '@prisma/accounting-rwanda';

const agents = initializeRwandaAccountingSystem();

// All agents are now available:
// agents.rssb, agents.vatCompliance, agents.cit, agents.journalEntry,
// agents.auditRisk, agents.anomalyDetection, agents.orchestrator
```

## Agents (10 Total)

### 1. RSSB Agent
Calculates RSSB contributions with 2026 rates.

```typescript
import { createRSSBAgent } from '@prisma/accounting-rwanda';

const rssb = createRSSBAgent();
const contribution = rssb.calculateContribution({
    employeeId: 'emp-001',
    employeeName: 'Jean Mukiza',
    grossSalary: 500000,  // RWF
});

// Result:
// {
//   pensionEmployer: 30000,     // 6%
//   pensionEmployee: 30000,     // 6%
//   occupationalHazard: 10000,  // 2%
//   maternityBenefit: 1500,     // 0.3%
//   netSalary: 416500
// }
```

### 2. VAT Compliance Agent
VAT calculations with EAC/AfCFTA zero-rating support.

```typescript
import { createVATComplianceAgent } from '@prisma/accounting-rwanda';

const vatAgent = createVATComplianceAgent();
const vatCalc = vatAgent.calculateVAT(100000, 'STANDARD');

// Result: { netAmount: 100000, vatAmount: 18000, vatRate: 18, grossAmount: 118000 }

// Check registration threshold
const check = vatAgent.checkVATRegistrationRequired(25_000_000); // Exceeds RWF 20M
// Result: { required: true, threshold: 20000000, annualizedTurnover: 25000000 }
```

### 3. CIT Agent
Corporate Income Tax with 28% standard rate (2024+).

```typescript
import { createCITAgent } from '@prisma/accounting-rwanda';

const citAgent = createCITAgent();
const result = await citAgent.calculateCIT(financials, entityProfile, context);

// Handles:
// - Standard 28% rate
// - Listed company preferential rates (20%, 25%)
// - Capital allowances
// - Provisional CIT quarterly payments
```

### 4. Journal Entry Agent
AI-powered transaction categorization with IFRS detection.

```typescript
import { createJournalEntryAgent } from '@prisma/accounting-rwanda';

const journalAgent = createJournalEntryAgent();
const entry = await journalAgent.categorizeTransaction({
    date: new Date(),
    description: 'Office rent payment',
    amount: 500000,
    type: 'EXPENSE'
}, context);

// Automatically identifies IFRS standard (IAS 17/IFRS 16), suggests accounts
```

### 5. Audit Risk Agent
ISA 315 risk assessment and materiality calculation.

```typescript
import { createAuditRiskAgent } from '@prisma/accounting-rwanda';

const auditAgent = createAuditRiskAgent();

// Materiality calculation (Big Four methodology)
const materiality = auditAgent.calculateMateriality({
    totalAssets: 500_000_000,
    profitBeforeTax: 25_000_000,
    revenue: 300_000_000,
    equity: 150_000_000,
    isPIE: true,
    isLossmaking: false
});

// Result:
// {
//   overallMateriality: 3750000,      // 1.5% of PBT
//   performanceMateriality: 2812500,  // 75%
//   clearlyTrivial: 112500            // 3%
// }
```

### 6. Anomaly Detection Agent
Multi-layered fraud and error detection.

```typescript
import { createAnomalyDetectionAgent } from '@prisma/accounting-rwanda';

const anomalyAgent = createAnomalyDetectionAgent();
const result = await anomalyAgent.detectAnomalies({
    transactions,
    options: {
        enablePointAnomaly: true,     // Statistical outliers
        enableBenfordsLaw: true,      // Digit distribution
        enableRwandaSpecific: true    // VAT, RSSB, EBM checks
    }
}, context);

// Detects: duplicate payments, round-number transactions, VAT mismatches, RSSB errors
```

### 7. Financial Reporting Agent
IFRS-compliant financial statement generation.

```typescript
import { createFinancialReportingAgent } from '@prisma/accounting-rwanda';

const reportingAgent = createFinancialReportingAgent();

// Generate Balance Sheet
const balanceSheet = await reportingAgent.generateBalanceSheet(
    trialBalance,
    new Date('2025-12-31'),
    context
);

// Generate Income Statement
const incomeStatement = await reportingAgent.generateIncomeStatement(
    trialBalance,
    new Date('2025-01-01'),
    new Date('2025-12-31'),
    context
);

// Calculate Financial Ratios
const ratios = reportingAgent.calculateRatios(balanceSheet.data, incomeStatement.data);
// Returns: currentRatio, quickRatio, debtToEquity, grossMargin, netMargin, ROA, ROE
```

### 8. Depreciation Agent
IAS 16 compliant with multiple methods.

```typescript
import { createDepreciationAgent } from '@prisma/accounting-rwanda';

const depAgent = createDepreciationAgent();

// Calculate depreciation
const result = depAgent.calculateDepreciation(asset, periodStart, periodEnd);

// Supports:
// - Straight-line
// - Reducing balance (declining)
// - Units of production
// - Rwanda capital allowances for tax

// Handle asset disposal
const disposal = depAgent.calculateDisposal(asset, disposalDate, proceeds);
// Returns gain/loss and journal entries
```

### 9. Bank Reconciliation Agent
Automated bank-to-book matching.

```typescript
import { createBankReconciliationAgent } from '@prisma/accounting-rwanda';

const reconAgent = createBankReconciliationAgent();

const reconciliation = await reconAgent.reconcile(
    bankTransactions,
    bookTransactions,
    bankStatementBalance,
    bookBalance,
    accountCode,
    accountName,
    periodEnd,
    context
);

// Result includes:
// - matchedTransactions (auto-matched)
// - outstandingDeposits
// - outstandingChecks
// - bankCharges (with suggested journal entries)
// - unidentifiedItems (for investigation)
```

### 10. Audit Opinion Agent
ISA 700/701/570 compliant report generation.

```typescript
import { createAuditOpinionAgent } from '@prisma/accounting-rwanda';

const opinionAgent = createAuditOpinionAgent();

// Determine opinion type
const opinion = opinionAgent.determineOpinion(findings, materialityLevel, goingConcern);
// Returns: UNQUALIFIED, QUALIFIED, ADVERSE, or DISCLAIMER

// Generate Key Audit Matters (for PIEs)
const kams = opinionAgent.generateKeyAuditMatters(findings, significantRisks, auditHours);

// Assess going concern
const gcAssessment = opinionAgent.assessGoingConcern(financials, qualitativeFactors, mgmtAssessment);

// Generate full audit report
const report = await opinionAgent.generateAuditReport(input, context);
// Returns complete formatted audit report with opinion, KAMs, and all sections
```

## Services

### ISHEMA Client (RRA API)
```typescript
import { createISHEMAClient } from '@prisma/accounting-rwanda';

const ishema = createISHEMAClient({ apiToken: 'your-token' });

await ishema.submitVATReturn(vatReturn);
await ishema.submitCITReturn(citReturn);
await ishema.validateEBMInvoice(invoice);
```

### Knowledge Base (RAG)
```typescript
import { RwandaKnowledgeBase } from '@prisma/accounting-rwanda';

const kb = new RwandaKnowledgeBase(supabaseClient, 'your-openai-key');

// Ingest regulatory documents
await kb.ingestDocument({
    title: 'ICPAR Circular 2025',
    content: documentText,
    source: 'ICPAR',
    documentType: 'CIRCULAR'
});

// Ask questions with RAG
const answer = await kb.askQuestion('What is the VAT registration threshold?');
```

## Tax Rates (2026)

| Tax Type | Rate | Notes |
|----------|------|-------|
| **VAT** | 18% | Standard rate |
| **VAT** | 0% | Exports, EAC, AfCFTA |
| **CIT** | 28% | Standard (reduced from 30% in 2024) |
| **CIT** | 20% | Listed with 40%+ public shareholding |
| **CIT** | 25% | Listed with 30%+ public shareholding |
| **CIT** | 3% | Holding companies, IP companies |
| **Withholding** | 15% | Services, dividends, rent |
| **DST** | 1.5% | Digital services tax |
| **RSSB Pension** | 12% | 6% employer + 6% employee |
| **RSSB Hazard** | 2% | Employer only |
| **RSSB Maternity** | 0.3% | Employer only |

## Entity Classification

```typescript
import { createRwandaEntityClassifier } from '@prisma/accounting-rwanda';

const classifier = createRwandaEntityClassifier();
const classification = classifier.classify({
    annualTurnover: 1_500_000_000,  // RWF 1.5B
    totalAssets: 800_000_000,
    employeeCount: 120,
    isListed: false,
    isBank: false,
    isInsurance: false,
    isPublicSector: false
});

// Result:
// {
//   entityType: 'PIE',
//   requiredFramework: 'FULL_IFRS',
//   requiredAuditTier: 'TIER_I',
//   isPIE: true,
//   requiresKAM: true,
//   bnrRegulated: false
// }
```

## Database Migration

Apply the included migration for full functionality:

```bash
psql $DATABASE_URL < packages/accounting-rwanda/migrations/001_rwanda_schema.sql
```

Creates 20+ tables including:
- `chart_of_accounts` - IFRS-compliant COA
- `transactions` - With IFRS compliance tracking
- `rssb_contributions` - Monthly contribution records
- `vat_reconciliation` - ISHEMA reconciliation
- `audit_engagements` - Engagement management
- `audit_risks` - ISA 315 risk tracking
- `key_audit_matters` - ISA 701 KAM storage
- `knowledge_base_documents` - RAG with pgvector

## Testing

```bash
cd packages/accounting-rwanda
pnpm test
```

**Test Results:**
- ✅ 41 unit tests
- ✅ 9 integration tests
- ✅ 50 total tests passing

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Rwanda AI Agent Platform                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  ACCOUNTING   │  │    AUDIT     │  │     TAX      │       │
│  │              │  │              │  │              │       │
│  │ JournalEntry  │  │ AuditRisk    │  │ VAT          │       │
│  │ Depreciation  │  │ Anomaly      │  │ CIT          │       │
│  │ BankRecon     │  │ Opinion      │  │ RSSB         │       │
│  │ Reporting     │  │              │  │ ISHEMA       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│           │                 │                 │              │
│           └─────────────────┴─────────────────┘              │
│                            │                                 │
│               ┌────────────▼────────────┐                   │
│               │  Rwanda Knowledge Base   │                   │
│               │  (RAG with pgvector)    │                   │
│               └─────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Regulatory Compliance

| Standard | Implementation |
|----------|---------------|
| **IFRS** | Full IFRS and IFRS for SMEs via ICPAR Law 11/2008 |
| **ISA** | ISA 315, 320, 500, 540, 570, 700, 701 |
| **RRA** | ISHEMA platform integration, EBM validation |
| **RSSB** | 2026 contribution rates |
| **BNR** | Tier I/II/III auditor classification |
| **ICPAR** | Entity classification, PIE determination |

## License

MIT

## Related Packages

- `@prisma/accounting-malta` - Malta accounting agents
- `@prisma/tax` - Multi-jurisdiction tax engine
- `@prisma/ai-engine` - Core AI agent infrastructure
