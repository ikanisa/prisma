# @prisma/audit-canada

Canada Audit Autonomous AI Agent System - CAS-based audit automation with CPAB alignment.

## Features

- **CAS 315 Risk Assessment**: Entity-level and assertion-level risk identification
- **Journal Entry Testing**: 100% population analysis (CAS 240.32(a))
- **CAS 701 KAM Generator**: Key Audit Matters for TSX/TSXV entities
- **CPAB Readiness**: Inspection preparation aligned with CPAB focus areas
- **Materiality Calculator**: CAS 320 compliant

## Installation

```bash
pnpm add @prisma/audit-canada
```

## Quick Start

```typescript
import { CAS315RiskAssessmentAgent } from '@prisma/audit-canada';

const agent = new CAS315RiskAssessmentAgent({ enableCPABMode: true });

const result = agent.performRiskAssessment(
    engagement,
    clientProfile,
    priorYearFindings,
    context
);

console.log(result.data?.materiality.overallMateriality);
console.log(result.data?.significantRisks);
```

## Agents

| Agent | CAS Reference | Description |
|-------|--------------|-------------|
| `CAS315RiskAssessmentAgent` | CAS 315 | Risk identification & materiality |
| `JournalEntryTestingAgent` | CAS 240 | 100% JE population analysis |
| `CAS701KAMAgent` | CAS 701 | Key Audit Matters generation |
| `CPABReadinessAgent` | CPAB | Inspection readiness scoring |

## CPAB Focus Areas

The agents incorporate 2024-2025 CPAB deficiency patterns:
- Revenue Recognition (28%)
- Accounting Estimates (22%)
- Group Audits (18%)
- Internal Controls (15%)

## License

Private - Prisma Internal Use
