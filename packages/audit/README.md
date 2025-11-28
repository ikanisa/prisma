# @prisma-glow/audit-agents

ISA-compliant AI Audit Specialist Agents for Prisma Glow

## Overview

This package contains 10 specialized AI agents that automate and enhance audit processes in accordance with International Standards on Auditing (ISA). Each agent brings deep expertise in specific audit domains.

## Agents

### Tier 2: Domain Specialists

1. **Audit Planning Agent** (`012-planning`) - ISA 300 audit planning and risk assessment
2. **Risk Assessment Agent** (`013-risk-assessment`) - ISA 315 risk of material misstatement
3. **Substantive Testing Agent** (`014-substantive-testing`) - ISA 330 substantive procedures
4. **Internal Controls Agent** (`015-internal-controls`) - COSO framework and control evaluation
5. **Fraud Risk Agent** (`016-fraud-risk`) - ISA 240 fraud risk assessment and detection
6. **Audit Analytics Agent** (`017-analytics`) - Data analytics and anomaly detection
7. **Group Audit Agent** (`018-group-audit`) - ISA 600 group audit coordination
8. **Audit Completion Agent** (`019-completion`) - ISA 560/570/580 completion procedures
9. **Quality Review Agent** (`020-quality-review`) - ISQM 2 engagement quality review
10. **Audit Report Agent** (`021-report`) - ISA 700-706 audit report preparation

## Usage

```typescript
import { AuditPlanningAgent } from '@prisma-glow/audit-agents/planning';
import { RiskAssessmentAgent } from '@prisma-glow/audit-agents/risk-assessment';

// Initialize audit planning
const planner = new AuditPlanningAgent({
  openai: openaiClient,
  model: 'gpt-4-turbo'
});

const auditPlan = await planner.developAuditPlan({
  entity: entityData,
  financialYear: '2024',
  materiality: 1000000
});

// Perform risk assessment
const riskAssessor = new RiskAssessmentAgent({
  openai: openaiClient
});

const risks = await riskAssessor.assessRisks({
  entity: entityData,
  industry: 'manufacturing'
});
```

## Standards Compliance

- ISA 300 - Planning
- ISA 315 (Revised 2019) - Risk Assessment
- ISA 330 - Audit Procedures
- ISA 240 - Fraud
- ISA 560 - Subsequent Events
- ISA 570 - Going Concern
- ISA 580 - Written Representations
- ISA 600 - Group Audits
- ISA 700-706 - Audit Reporting
- ISQM 2 - Engagement Quality Review
- COSO Framework - Internal Controls

## Features

- ✅ ISA-compliant audit procedures
- ✅ Automated risk assessment
- ✅ Advanced data analytics
- ✅ Fraud detection algorithms
- ✅ Multi-jurisdiction support
- ✅ Real-time quality monitoring
- ✅ Professional skepticism built-in
- ✅ Comprehensive audit trail

## License

Proprietary - Prisma Glow Platform
