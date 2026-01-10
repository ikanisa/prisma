# @prisma/audit-malta

Malta Audit AI Agent System - Big 4-Level ISA Compliant Autonomous Audit Framework

## Overview

This package provides a comprehensive set of autonomous AI agents for Malta statutory audits, implementing Big 4-level standards and full ISA compliance.

### Regulatory Compliance

- **Companies Act (Cap. 386)**: Articles 145, 164, 185, 186
- **Legal Notice 139/2025**: Tiered exemption system
- **International Standards on Auditing (ISAs)**: Full compliance
- **IESBA Code of Ethics**: Independence and objectivity
- **GDPR**: Data protection measures

### Core Agents

| Agent | ISA References | Automation Level | Description |
|-------|----------------|------------------|-------------|
| **Exemption Router** | LN 139/2025 | 95% | Routes engagements to FULL_AUDIT / ISRE_2400_REVIEW / NO_ASSURANCE |
| **Planning Agent** | ISA 300/315/320 | 80% | Materiality calculation, client acceptance, risk profiles |
| **Risk & Control** | ISA 315/240 | 75% | Risk assessment, Benford's Law, fraud detection |
| **Substantive Testing** | ISA 330/500/530 | 85% | Vouching, confirmations, sampling, ERP integration |
| **Going Concern** | ISA 570 | 65% | Liquidity analysis, stress testing, opinion impact |
| **Reporting** | ISA 700/701/705/706 | 50% | Opinion drafting, KAMs, MBR filing |

## Installation

```bash
pnpm add @prisma/audit-malta
```

## Quick Start

```typescript
import { initializeMaltaAuditSystem } from '@prisma/audit-malta';

// Initialize all agents
const audit = initializeMaltaAuditSystem({
  environment: 'sandbox',
});

// Route engagement based on LN 139/2025
const routing = await audit.exemptionRouter.routeEngagement(
  {
    year1: { balanceSheet: 40000, netTurnover: 85000, averageEmployees: 1 },
    year2: { balanceSheet: 45000, netTurnover: 90000, averageEmployees: 2 },
  },
  { mfsaRegulated: false }
);
// Result: { engagementType: 'ISRE_2400_REVIEW', exemptionRule: 'NONE' }

// Calculate materiality
const materiality = await audit.planning.calculateMateriality(
  { profitBeforeTax: 100000, revenue: 500000 },
  { entityType: 'profit_oriented', riskLevel: 'MODERATE' }
);
// Result: { overallMateriality: 5000, performanceMateriality: 3750 }

// Perform Benford's Law analysis
const benfords = await audit.riskControl.performBenfordsLawAnalysis(transactions);
// Result: { anomalyDetected: false, pValue: 0.45 }

// Assess going concern
const goingConcern = await audit.goingConcern.assessGoingConcern(financials);
// Result: { materialUncertainty: false, opinionImpact: 'none' }

// Generate audit opinion
const opinion = await audit.reporting.generateOpinion(context, findings);
// Result: { opinionType: 'unmodified', keyAuditMatters: [...] }
```

## Engagement Routing (LN 139/2025)

The Exemption Router Agent determines engagement type based on Article 185(2) thresholds:

| Criterion | Threshold |
|-----------|-----------|
| Balance sheet total | ≤ €46,600 |
| Net turnover | ≤ €93,000 |
| Average employees | ≤ 2 |

**Routing Logic:**
- Exceeds 2+ thresholds in either of 2 consecutive years → **FULL_AUDIT**
- Exceeds 1 threshold → **ISRE_2400_REVIEW**
- Exceeds 0 thresholds → **NO_ASSURANCE** (micro exemption)

**Exclusions:**
- MFSA regulated entities always require FULL_AUDIT
- Public Interest Entities always require FULL_AUDIT with EQCR

## Human-in-the-Loop Gates

Critical decisions trigger HITL gates for human review:

| Gate | Trigger | Reviewer | Timeout |
|------|---------|----------|---------|
| GATE_001 | New client acceptance | Partner | 48h |
| GATE_002 | Audit plan approval | Manager | 72h |
| GATE_003 | Sample size < 30 | Senior | 24h |
| GATE_004 | Materiality > 10% of benchmark | Partner | 24h |
| GATE_005 | Modified opinion | Partner + EQCR | 48h |
| GATE_006 | Going concern issue | Partner | 48h |

```typescript
// Check if engagement can proceed
const { canProceed, blockedBy } = audit.hitlGates.canProceed(engagementId);

// Record decision
await audit.hitlGates.recordDecision(
  engagementId,
  'GATE_005',
  reviewerId,
  'PARTNER',
  'APPROVED',
  'Opinion adequately supported by evidence'
);
```

## Malta Industry Risk Profiles

Pre-configured risk profiles for Malta sectors:

```typescript
const profile = await audit.planning.getIndustryRiskProfile('remote_gaming');
// Result: {
//   industry: 'Remote Gaming',
//   inherentRiskLevel: 'VERY_HIGH',
//   regulatoryBody: 'Malta Gaming Authority (MGA)',
//   specificRisks: ['Revenue manipulation', 'AML/CFT exposure', ...],
//   requiredProcedures: ['IT general controls', 'Revenue reconciliation', ...]
// }
```

**High-Risk Industries:**
- Remote Gaming (MGA)
- Crypto/VFA (MFSA)
- Shipping (Transport Malta)
- Financial Services (MFSA)

## Integrations

### MFSA Registry

```typescript
const status = await audit.mfsa.checkRegulatedStatus('C-12345');
// Result: { regulated: true, category: 'MIFID', licenseStatus: 'ACTIVE' }
```

### Malta Business Registry

```typescript
const company = await audit.mbr.getCompanyDetails('C-12345');
const filing = await audit.mbr.submitAnnualReturn(filingData);
```

## Database Schema

Run the migration to add Malta audit tables:

```bash
pnpm db:migrate -- --file migrations/20260110100000_malta_audit_schema.sql
```

Tables created:
- `malta_audit_engagements` - Engagement tracking with ISA compliance
- `malta_audit_hitl_gates` - HITL gate decisions
- `malta_audit_trail` - Immutable audit trail (7-year retention)
- `malta_audit_risk_assessments` - ISA 315 risk assessments
- `malta_audit_test_results` - Substantive test results

## Agent Autonomy Levels

Each agent operates at a specific autonomy level:

- **Level 5** (Deterministic): Exemption Router - pure threshold calculations
- **Level 4** (High): Planning, Risk, Substantive - AI-assisted with validation
- **Level 3** (Moderate): Going Concern - requires significant human judgment
- **Level 2** (Low): Reporting - human sign-off always required

## ISAs Implemented

| ISA | Title | Coverage |
|-----|-------|----------|
| 200 | Overall Objectives | Orchestrator |
| 240 | Fraud | Risk Agent |
| 315 | Risk Assessment | Risk Agent |
| 320 | Materiality | Planning Agent |
| 330 | Audit Procedures | Substantive Agent |
| 500 | Audit Evidence | Substantive Agent |
| 505 | Confirmations | Substantive Agent |
| 530 | Audit Sampling | Substantive Agent |
| 540 | Estimates | Going Concern Agent |
| 560 | Subsequent Events | Completion |
| 570 | Going Concern | Going Concern Agent |
| 700 | Forming Opinion | Reporting Agent |
| 701 | Key Audit Matters | Reporting Agent |
| 705 | Modifications | Reporting Agent |
| 706 | Emphasis of Matter | Reporting Agent |

## Security & Compliance

- **Encryption**: AES-256 at rest (planned)
- **Access Control**: RBAC with HITL gates
- **Data Retention**: 7 years per Companies Act
- **Audit Trail**: Immutable logging of all agent actions
- **GDPR**: PII pseudonymization in vector stores

## License

MIT
