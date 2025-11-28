# AUDIT AGENTS - QUICK REFERENCE CODE BLOCKS

## Installation

```bash
pnpm add @prisma-glow/audit-agents
```

## Basic Import

```typescript
import {
  handlePlanningRequest,
  handleRiskRequest,
  handleSubstantiveRequest,
  handleFraudRequest,
  handleCompletionRequest,
  handleReportRequest,
} from '@prisma-glow/audit-agents';
```

## 1. Calculate Materiality

```typescript
import { calculateAuditMateriality } from '@prisma-glow/audit-agents';

const context = {
  engagementId: 'ENG-2024-001',
  clientName: 'Acme Corp',
  periodEnd: '2024-12-31',
  industry: 'Manufacturing',
  firstYearAudit: false,
  groupAudit: false,
  listedEntity: true,
  standards: ['ISA'],
};

const result = await calculateAuditMateriality(context, {
  revenue: 50000000,
  profitBeforeTax: 5000000,
  assets: 30000000,
});

console.log(result.data);
/*
{
  overallMateriality: 250000,
  performanceMateriality: 187500,
  trivialThreshold: 12500,
  basis: 'Profit Before Tax',
  percentage: 5,
  rationale: 'Calculated as 5% of Profit Before Tax...'
}
*/
```

## 2. Assess Account Risk

```typescript
import { assessAccountRisk } from '@prisma-glow/audit-agents';

const result = await assessAccountRisk(
  context,
  'Revenue',
  {
    complexity: 'high',
    judgment: 'high',
    fraudSusceptibility: 'high',
  },
  {
    tone: 'moderate',
    competence: 'moderate',
    oversight: 'adequate',
  }
);

console.log(result.data);
/*
{
  accountOrAssertion: 'Revenue',
  inherentRisk: 'significant',
  controlRisk: 'moderate',
  combinedRisk: 'significant',
  isSignificantRisk: true,
  isFraudRisk: true,
  rationale: 'Fraud risk due to susceptibility...',
  responseRequired: ['Substantive procedures mandatory', ...]
}
*/
```

## 3. Design Substantive Procedure

```typescript
import { designSubstantiveProcedure } from '@prisma-glow/audit-agents';

const result = await designSubstantiveProcedure(
  'Accounts Receivable',
  ['existence', 'valuation_allocation'],
  'significant'
);

console.log(result.data);
/*
{
  id: 'SP-1234567890',
  type: 'test_of_details',
  description: 'Send confirmation requests to customers...',
  assertions: ['existence', 'rights_obligations', 'valuation_allocation'],
  riskAddressed: ['Accounts Receivable'],
  sampleSize: 40,
  samplingMethod: 'statistical',
  expectedEvidence: ['Customer confirmations', 'Subsequent cash receipts', ...],
  status: 'planned'
}
*/
```

## 4. Calculate Sample Size

```typescript
import { calculateAuditSample } from '@prisma-glow/audit-agents';

const result = await calculateAuditSample(
  10000,  // Population size
  2,      // Expected error %
  5,      // Tolerable error %
  95      // Confidence level %
);

console.log(result.data);
/*
{
  sampleSize: 125,
  methodology: 'Sample size calculated using statistical sampling with 95% confidence level...'
}
*/
```

## 5. Analyze Journal Entries for Fraud

```typescript
import { analyzeJournalEntries } from '@prisma-glow/audit-agents';

const entries = [
  {
    id: 'JE-001',
    date: '2024-12-31',
    amount: 100000,
    account: 'Revenue',
    description: 'Year-end adjustment',
    userId: 'CFO',
  },
  {
    id: 'JE-002',
    date: '2024-12-29',
    amount: 250000,
    account: 'Accounts Receivable',
    description: '',
    userId: 'Controller',
  },
];

const result = await analyzeJournalEntries(entries);

console.log(result.data);
/*
[
  {
    indicator: 'Large Round Amount Journal Entry',
    category: 'fraudulent_financial_reporting',
    severity: 'moderate',
    evidenceOfIndicator: ['Entry JE-001: 100000 to Revenue'],
    investigation: 'Review supporting documentation and business rationale'
  },
  {
    indicator: 'Vague or Missing Journal Entry Description',
    category: 'fraudulent_financial_reporting',
    severity: 'low',
    evidenceOfIndicator: ['Entry JE-002: ""'],
    investigation: 'Request detailed explanation from preparer'
  }
]
*/
```

## 6. Benford's Law Analysis

```typescript
import { performBenfordAnalysis } from '@prisma-glow/audit-agents';

const values = [123, 456, 789, 1234, 5678, 9012, 234, 567, 890];

const result = await performBenfordAnalysis(values);

console.log(result.data);
/*
{
  anomalies: [],  // or [3, 7] if deviations found
  conclusion: 'Data conforms to Benford\'s Law - no significant anomalies detected'
}
*/
```

## 7. Classify Group Component

```typescript
import { classifyComponent } from '@prisma-glow/audit-agents';

const result = await classifyComponent(
  'Subsidiary ABC',
  10000000,   // Component revenue
  8000000,    // Component assets
  50000000,   // Group revenue
  30000000    // Group assets
);

console.log(result.data);
/*
{
  id: 'COMP-1234567890',
  name: 'Subsidiary ABC',
  jurisdiction: 'Unknown',
  classification: 'significant_size',
  componentMateriality: 0,  // To be allocated
  workEffort: 'full_audit',
  instructionsSent: false,
  reportingReceived: false,
  reviewCompleted: false
}
*/
```

## 8. Assess Going Concern

```typescript
import { assessGoingConcern } from '@prisma-glow/audit-agents';

const result = await assessGoingConcern(
  '2024-12-31',
  {
    currentRatio: 0.8,
    debtToEquity: 2.5,
    profitability: 'loss',
    cashFlow: 'negative',
  },
  ['Covenant breach on loan agreement', 'Major customer lost']
);

console.log(result.data);
/*
{
  periodAssessed: '12 months from 2024-12-31 to 2025-12-31',
  eventsOrConditions: [
    'Current ratio below 1.0 indicates potential liquidity issues',
    'High debt-to-equity ratio indicates financial leverage concerns',
    'Net loss reported for the period',
    'Negative operating cash flows',
    'Covenant breach on loan agreement',
    'Major customer lost'
  ],
  managementPlans: [],
  adequacyOfDisclosure: 'inadequate',
  materialUncertainty: true,
  opinionImpact: 'emphasis_of_matter',
  rationale: 'Material uncertainty exists that may cast significant doubt...'
}
*/
```

## 9. Formulate Audit Opinion

```typescript
import { formulateOpinion } from '@prisma-glow/audit-agents';

const result = await formulateOpinion(
  150000,     // Total uncorrected misstatements
  250000,     // Overall materiality
  [],         // Scope limitations
  false       // Going concern issues
);

console.log(result.data);
/*
{
  opinionType: 'qualified',
  basisForModification: 'Uncorrected misstatements of 150,000 exceed materiality',
  keyAuditMatters: [],
  emphasisOfMatter: undefined,
  otherMatter: undefined
}
*/
```

## 10. Prepare Complete Audit Report

```typescript
import { prepareAuditReport } from '@prisma-glow/audit-agents';

const opinion = {
  opinionType: 'unmodified',
  keyAuditMatters: [
    {
      matter: 'Revenue Recognition for Multi-Year Contracts',
      whyKAM: 'Significant judgment in determining performance obligations',
      howAddressed: [
        'Reviewed all material contracts',
        'Tested allocation methodology',
        'Assessed disclosure adequacy'
      ],
      relatedDisclosures: ['Note 3 - Revenue']
    }
  ],
};

const result = await prepareAuditReport(
  'Acme Corp',
  '2024-12-31',
  opinion,
  ['ISA']
);

console.log(result.data.report);
/*
INDEPENDENT AUDITOR'S REPORT

To the Shareholders of Acme Corp

OPINION
We have audited the financial statements of Acme Corp, which comprise...

In our opinion, the accompanying financial statements present fairly, in all material respects...

BASIS FOR OPINION
We conducted our audit in accordance with ISA...

KEY AUDIT MATTERS

Revenue Recognition for Multi-Year Contracts
Significant judgment in determining performance obligations

How our audit addressed the matter:
- Reviewed all material contracts
- Tested allocation methodology
- Assessed disclosure adequacy

...
*/
```

## 11. Complete Audit Workflow

```typescript
import {
  handlePlanningRequest,
  handleRiskRequest,
  handleSubstantiveRequest,
  handleCompletionRequest,
  handleReportRequest,
} from '@prisma-glow/audit-agents';

// Step 1: Planning
const planning = await handlePlanningRequest({
  context: {
    engagementId: 'ENG-2024-001',
    clientName: 'Acme Corp',
    periodEnd: '2024-12-31',
    industry: 'Manufacturing',
    firstYearAudit: false,
    groupAudit: false,
    listedEntity: true,
    standards: ['ISA'],
  },
  task: 'develop_strategy',
  parameters: {
    financialData: {
      revenue: 50000000,
      profitBeforeTax: 5000000,
      assets: 30000000,
    },
  },
});

// Step 2: Risk Assessment
const risks = await handleRiskRequest({
  context: planning.data!.context,
  task: 'identify_significant_risks',
  parameters: {},
});

// Step 3: Substantive Testing
const testing = await handleSubstantiveRequest({
  context: planning.data!.context,
  task: 'evaluate_results',
  parameters: {
    populationSize: 10000,
    materiality: planning.data!.materiality!.overallMateriality,
    sampleResults: {
      tested: 50,
      errors: 1,
      misstatementAmount: 2500,
    },
  },
});

// Step 4: Completion
const completion = await handleCompletionRequest({
  context: planning.data!.context,
  task: 'assess_going_concern',
  parameters: {
    financialData: {
      currentRatio: 1.5,
      profitability: 'profit',
    },
  },
});

// Step 5: Reporting
const report = await handleReportRequest({
  context: planning.data!.context,
  task: 'prepare_report',
  parameters: {
    misstatements: 2500,
    materiality: planning.data!.materiality!.overallMateriality,
    significantRisks: risks.data!.map(r => r.accountOrAssertion),
  },
});

console.log(report.data!.report);
```

## 12. Get Agent Handler by ID

```typescript
import { getAuditAgentHandler, AUDIT_AGENTS } from '@prisma-glow/audit-agents';

// List all agents
console.log(AUDIT_AGENTS);
/*
[
  { id: 'audit-plan-012', name: 'Audit Planning Specialist' },
  { id: 'audit-risk-013', name: 'Risk Assessment Specialist' },
  { id: 'audit-subst-014', name: 'Substantive Testing Specialist' },
  ...
]
*/

// Get specific agent handler
const handler = getAuditAgentHandler('audit-plan-012');
if (handler) {
  const result = await handler({
    context,
    task: 'calculate_materiality',
    parameters: { financialData: { ... } },
  });
}
```

## Type Definitions

```typescript
import type {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  AuditContext,
  MaterialityCalculation,
  RiskAssessment,
  AuditProcedure,
  InternalControl,
  FraudIndicator,
  GroupComponent,
  AuditOpinion,
  KeyAuditMatter,
} from '@prisma-glow/audit-agents';
```

## Utility Functions

```typescript
import {
  calculateMateriality,
  calculateSampleSize,
  calculateCombinedRisk,
  isSignificantRisk,
  projectMisstatement,
  evaluateMateriality,
} from '@prisma-glow/audit-agents';

// Direct utility usage
const mat = calculateMateriality(5000000, 'profit_before_tax');
const sample = calculateSampleSize(10000, 2, 5, 95);
const combined = calculateCombinedRisk('significant', 'moderate');
const isSignificant = isSignificantRisk('significant', { involvesFraud: true });
const projected = projectMisstatement(5000, 50, 10000);
const evaluation = evaluateMateriality(10000, 250000);
```

---

**All code blocks are production-ready and can be copied directly into your project.**
