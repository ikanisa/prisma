# @prisma/accounting-canada

Canada Accounting Autonomous AI Agent System - IFRS/ASPE dual standards automation.

## Features

- **Dual Framework Support**: IFRS, ASPE, ASNFPO, PSAS
- **Automatic Framework Selection**: Based on entity profile per CPA Canada Handbook
- **Quebec Bilingual**: Bill 96/2022 compliant French financial statements
- **Revenue Recognition**: IFRS 15 (5-step) and ASPE 3400
- **Month-End Close**: 3-5 day target automation

## Installation

```bash
pnpm add @prisma/accounting-canada
```

## Quick Start

```typescript
import { 
    initializeCanadaAccountingSystem,
    selectAccountingFramework 
} from '@prisma/accounting-canada';

// Initialize all agents
const agents = initializeCanadaAccountingSystem();

// Select framework for entity
const framework = selectAccountingFramework({
    entityType: 'private_enterprise',
    incorporationProvince: 'QC',
    isPubliclyAccountable: false,
    // ...
});

console.log(framework.framework); // 'ASPE'
console.log(framework.bilingualRequired); // true
```

## Agents

| Agent | Description |
|-------|-------------|
| `AccountingStandardsEngine` | Framework selection (IFRS/ASPE/ASNFPO/PSAS) |
| `RevenueRecognitionAgent` | IFRS 15 / ASPE 3400 processing |
| `QuebecBilingualAgent` | French FS generation |
| `MonthEndCloseAgent` | Automated close cycle |

## Standards Reference

Uses `CPAHandbookService` for standards lookup:

```typescript
import { getCPAHandbookService } from '@prisma/accounting-canada';

const handbook = getCPAHandbookService();
const standard = handbook.getStandard('IFRS15');
console.log(standard?.title); // 'Revenue from Contracts with Customers'
```

## License

Private - Prisma Internal Use
