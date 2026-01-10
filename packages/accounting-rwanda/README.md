# Rwanda Accounting Autonomous AI Agent System

Big Four-level accounting, audit, and tax automation for Rwanda entities.

## Features

- **IFRS Compliance**: Full IFRS and IFRS for SMEs frameworks
- **ISA-Based Audit**: ISA 315 risk assessment, materiality calculation, KAM reporting
- **RRA Tax Compliance**: VAT, CIT, PAYE, withholding tax
- **RSSB Contributions**: Pension, occupational hazard, maternity calculations
- **ICPAR Regulatory**: Entity classification, tier determination

## Installation

```bash
pnpm add @prisma/accounting-rwanda
```

## Quick Start

```typescript
import { initializeRwandaAccountingSystem } from '@prisma/accounting-rwanda';

const agents = initializeRwandaAccountingSystem();

// Calculate RSSB contributions
const contribution = agents.rssb.calculateContribution({
    employeeId: 'emp-001',
    employeeName: 'John Doe',
    grossSalary: 500000,  // RWF
});
console.log(contribution);
// {
//   pensionEmployer: 30000,    // 6%
//   pensionEmployee: 30000,    // 6%
//   occupationalHazard: 10000, // 2%
//   maternityBenefit: 1500,    // 0.3%
//   netSalary: 416500,
// }

// Categorize transaction for VAT
const vatCalc = agents.vatCompliance.calculateVAT(100000, 'STANDARD');
console.log(vatCalc);
// {
//   netAmount: 100000,
//   vatAmount: 18000,
//   vatRate: 18,
//   grossAmount: 118000,
// }

// Classify entity
const classification = agents.entityClassifier.classify({
    annualTurnover: 1_500_000_000,  // RWF 1.5B
    totalAssets: 800_000_000,
    employeeCount: 120,
    isListed: false,
    isBank: false,
    isInsurance: false,
    isPublicSector: false,
});
console.log(classification);
// {
//   entityType: 'PIE',
//   requiredFramework: 'FULL_IFRS',
//   requiredAuditTier: 'TIER_I',
//   isPIE: true,
//   requiresKAM: true,
// }
```

## Tax Rates (2026)

| Tax | Rate |
|-----|------|
| VAT (Standard) | 18% |
| CIT (Standard) | 28% |
| CIT (Listed 40%+ public) | 20% |
| CIT (Listed 30%+ public) | 25% |
| Withholding (Services) | 15% |
| Digital Services Tax | 1.5% |
| RSSB Pension | 12% (6%+6%) |
| RSSB Occupational Hazard | 2% |
| RSSB Maternity | 0.3% |

## Agents

### Compliance Agents
- **RSSBAgent**: RSSB contribution calculations, PAYE, journal entries
- **VATComplianceAgent**: VAT categorization, returns, EBM validation

### Audit Agents
- **AuditRiskAgent**: ISA 315 risk assessment, materiality, KAM identification

### Core Utilities
- **RwandaEntityClassifier**: PIE/tier/framework determination
- **ChartOfAccountsGenerator**: IFRS-compliant COA with tax mappings
- **AgentOrchestrator**: Multi-agent workflow coordination

## License

MIT
