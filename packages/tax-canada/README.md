# @prisma/tax-canada

Canada Tax Autonomous AI Agent System - Complete corporate and personal tax automation.

## Features

- **T2 Corporate Returns**: Federal tax with SBD optimization
- **T1 Personal Returns**: Individual tax with all brackets and credits
- **Provincial Tax**: All 13 jurisdictions (ON, QC, AB, BC, etc.)
- **GST/HST Filing**: Multi-jurisdiction rates with ITC calculation
- **Transfer Pricing**: ITA Section 247 compliance with OECD guidelines
- **Pillar 2 GloBE**: OECD global minimum tax (15%) calculations
- **CRA EFILE Types**: Ready for electronic filing integration

## Installation

```bash
pnpm add @prisma/tax-canada
```

## Quick Start

```typescript
import { initializeCanadaTaxSystem } from '@prisma/tax-canada';

const agents = initializeCanadaTaxSystem();

// T2 Corporate Tax
const t2Result = agents.t2.calculateFederalTax(100_000, context);

// T1 Personal Tax
const t1Return = await agents.t1.prepareT1Return(taxpayerId, income, deductions, 'ON');

// Transfer Pricing Analysis
const tpAnalysis = await agents.transferPricing.analyzeTransaction(transaction);

// Pillar 2 GloBE
const globeCalc = await agents.pillar2.calculateTopUpTax(group, jurisdictionData);
```

## Agents

| Agent | Description |
|-------|-------------|
| `T2TaxAgent` | Corporate T2 returns & CRA filing |
| `T1TaxAgent` | Personal T1 returns with all credits |
| `GSTFilingAgent` | GST/HST/QST return preparation |
| `TransferPricingAgent` | ITA 247 compliance & OECD methods |
| `Pillar2GloBEAgent` | Global minimum tax calculations |

## Transfer Pricing Methods

Supports OECD-approved methods:
- CUP (Comparable Uncontrolled Price)
- Cost Plus
- Resale Minus
- TNMM (Transactional Net Margin Method)
- Profit Split

## Pillar 2 Features

- ETR calculation by jurisdiction
- Top-up tax (15% minimum)
- Income Inclusion Rule (IIR)
- Undertaxed Profits Rule (UTPR)
- Canadian QDMTT support
- Substance-based carve-outs
- GloBE Information Return (GIR)

## License

Private - Prisma Internal Use
