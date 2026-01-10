# @prisma/accounting-malta

Malta Accounting Autonomous AI Agent System - GAPSME/IFRS compliant accounting automation.

## Overview

This package provides a comprehensive set of autonomous AI agents for Malta accounting operations, supporting:

- **GAPSME** (General Accounting Principles for Small and Medium-Sized Entities)
- **IFRS** (International Financial Reporting Standards as adopted by EU)
- **Companies Act 1995** entity classification and thresholds
- **LN 139/2025** audit exemption rules

## Features

### Transaction Processing Agents
- **JournalEntryAgent** - AI-powered journal entry generation from natural language
- **DepreciationAgent** - Automated depreciation calculations with Malta capital allowances
- **YearEndCloseAgent** - Complete year-end close automation

### Compliance Monitoring
- **AuditExemptionAgent** - LN 139/2025 audit exemption eligibility (Rules 6-9)

### Financial Reporting
- **BalanceSheetAgent** - GAPSME/IFRS balance sheet generation
- **IncomeStatementAgent** - Profit & Loss statement generation

### Filing
- **MBRFilingAgent** - Malta Business Registry annual return preparation

### Analytics
- **FinancialAnalysisAgent** - Ratio analysis with AI-powered insights

### Core Infrastructure
- **EntityClassifier** - MICRO/SMALL/MEDIUM/LARGE classification
- **ChartOfAccountsGenerator** - Dynamic COA with GAPSME/IFRS mappings
- **AgentOrchestrator** - Multi-agent workflow coordination

## Installation

```bash
pnpm add @prisma/accounting-malta
```

## Quick Start

```typescript
import { initializeMaltaAccountingSystem } from '@prisma/accounting-malta';

// Initialize all agents
const agents = initializeMaltaAccountingSystem({
  openaiApiKey: process.env.OPENAI_API_KEY,
  enableAIFeatures: true,
});

// Use individual agents
const journalResult = await agents.journalEntry.processTransaction({
  description: 'Purchased office equipment',
  amount: 5000,
  date: new Date(),
  framework: 'GAPSME',
});

// Check audit exemption
const exemptionResult = await agents.auditExemption.checkAuditExemption(
  company,
  shareholders,
  { currentYearTurnover: 50000 }
);
```

## Entity Classification

Malta entities are classified based on Companies Act 1995 thresholds:

| Classification | Assets | Turnover | Employees |
|----------------|--------|----------|-----------|
| MICRO | ≤€350K | ≤€700K | ≤10 |
| SMALL | ≤€4M | ≤€8M | ≤50 |
| MEDIUM | ≤€20M | ≤€40M | ≤250 |
| LARGE | >€20M | >€40M | >250 |

Classification changes require exceeding 2 of 3 thresholds for 2 consecutive years.

## Agent Autonomy Levels

Each agent has an autonomy level (0-5):

- **Level 5** (Fully Autonomous): DepreciationAgent - deterministic calculations
- **Level 4** (High): JournalEntryAgent, BalanceSheetAgent - AI-assisted with validation
- **Level 3** (Moderate): YearEndCloseAgent, MBRFilingAgent - requires accountant review

## API Reference

### JournalEntryAgent

```typescript
const entry = await journalEntryAgent.instance().processTransaction({
  description: 'Payment received from customer',
  amount: 1000,
  date: new Date(),
  framework: 'GAPSME',
}, chartOfAccounts);
```

### DepreciationAgent

```typescript
const results = await depreciationAgent.instance().calculateMonthlyDepreciation(
  assets,
  new Date('2025-12-31')
);
```

### AuditExemptionAgent

```typescript
const status = await auditExemptionAgent.instance().checkAuditExemption(
  company,
  shareholders,
  { currentYearTurnover: 75000 }
);
// Returns: { exempt: true, ruleApplied: 'LN 139/2025 Rule 6', ... }
```

### FinancialAnalysisAgent

```typescript
const analysis = await financialAnalysisAgent.instance().performRatioAnalysis(
  balanceSheet,
  incomeStatement
);
// Returns liquidity, profitability, efficiency, and solvency ratios with AI insights
```

## Database Schema

Run the migration to add Malta accounting tables:

```bash
pnpm db:migrate -- --file migrations/20260110000000_malta_accounting_schema.sql
```

Tables created:
- `malta_companies` - Company information with accounting configuration
- `malta_accounts` - Chart of Accounts with GAPSME/IFRS mappings
- `malta_journal_entries` - Journal entries with AI metadata
- `malta_fixed_assets` - Fixed asset register
- `malta_financial_statements` - Generated statements for MBR filing
- `malta_directors` - Director information
- `malta_shareholders` - Shareholder register
- `malta_year_metrics` - Historical metrics for classification

## License

MIT
