import { AccountingModuleDefinition } from './types';

export const ACCOUNTING_MODULES: AccountingModuleDefinition[] = [
  {
    key: 'consolidation',
    title: 'Group Consolidation',
    description:
      'Pre-close control checks, eliminations and minority interest calculations for multi-entity groups.',
    acceptanceCriteria: [
      'Controller reviews intercompany eliminations and minority allocations',
      'CFO signs-off on consolidated statements and audit trail',
      'Traceability log stored against the consolidation run',
    ],
    defaultPayload: {
      period: '2024-Q4',
      entities: ['ParentCo', 'SubsidiaryA', 'SubsidiaryB'],
      eliminations: 6,
      adjustments: 3,
    },
  },
  {
    key: 'revenue',
    title: 'Revenue Contracts',
    description:
      'Manages IFRS 15 five-step model for bundled arrangements, SSP allocations and release schedules.',
    acceptanceCriteria: [
      'Revenue operations confirm performance obligations and SSP',
      'Finance business partner approves contract assumptions',
      'Contract schedules surfaced in disclosure workspace',
    ],
    defaultPayload: {
      contractCode: 'REV-204',
      customer: 'Global Enterprises',
      performanceObligations: [
        { name: 'Software licence', allocation: 0.6 },
        { name: 'Implementation services', allocation: 0.4 },
      ],
      transactionPrice: 120000,
    },
  },
  {
    key: 'leases',
    title: 'Lease Measurements',
    description:
      'Supports IFRS 16 lease classification, ROU asset measurement and amortisation schedule governance.',
    acceptanceCriteria: [
      'Real estate team validates lease terms and inputs',
      'Corporate finance approves discount rate methodology',
      'ROU asset roll-forward exported to cash flow builder',
    ],
    defaultPayload: {
      leases: [
        { code: 'LEASE-001', termMonths: 36, payments: 1500 },
        { code: 'LEASE-002', termMonths: 60, payments: 3200 },
      ],
      discountRate: 0.035,
      commencement: '2025-01-01',
    },
  },
  {
    key: 'ecl',
    title: 'Financial Instruments & ECL',
    description:
      'Calculates IFRS 9 staging, PD/LGD matrices and macro overlays for treasury portfolios.',
    acceptanceCriteria: [
      'Risk team reviews staging and exposure inputs',
      'Treasury approves macro overlay assumptions',
      'ECL output reconciles to general ledger control totals',
    ],
    defaultPayload: {
      portfolio: 'Trade receivables',
      exposureAtDefault: 540000,
      probabilityOfDefault: 0.025,
      lossGivenDefault: 0.45,
    },
  },
  {
    key: 'impairment',
    title: 'Impairment Testing',
    description:
      'Runs IAS 36 headroom analysis, VIU fair-value cross-checks and scenario overlays.',
    acceptanceCriteria: [
      'FP&A validates CGU cash flow forecasts',
      'Valuations lead approves discount and growth rates',
      'Board pack includes impairment narrative and trace',
    ],
    defaultPayload: {
      cgu: 'EMEA SaaS',
      carryingAmount: 3200000,
      recoverableAmount: 3550000,
      growthRate: 0.04,
    },
  },
  {
    key: 'tax',
    title: 'Income Tax Packs',
    description:
      'Automates IAS 12 current/deferred tax computations with jurisdictional review workflows.',
    acceptanceCriteria: [
      'Local controllers confirm taxable profit bridges',
      'Group tax signs-off on effective tax rate drivers',
      'Supporting workpapers linked to disclosure composer',
    ],
    defaultPayload: {
      jurisdictions: [
        { name: 'UK', taxableProfit: 250000, currentTax: 47500 },
        { name: 'DE', taxableProfit: 180000, currentTax: 43200 },
      ],
      deferredAdjustments: 12500,
    },
  },
  {
    key: 'cashflow',
    title: 'Cash Flow Builder',
    description:
      'Builds IAS 7 statements with automated mapping, covenant metrics and scenario overlays.',
    acceptanceCriteria: [
      'Treasury confirms liquidity movements',
      'Financial controller reviews indirect/direct method outputs',
      'Variance analysis tagged for management reporting',
    ],
    defaultPayload: {
      method: 'indirect',
      operatingActivities: { netIncome: 420000, depreciation: 85000 },
      investingActivities: { capex: -120000 },
      financingActivities: { debtIssued: 200000, dividends: -50000 },
    },
  },
  {
    key: 'disclosures',
    title: 'Disclosure Composer',
    description:
      'Governed templates for IFRS note drafting, linking source data and narrative approvals.',
    acceptanceCriteria: [
      'Note owners provide commentary and context',
      'Technical accounting reviews compliance wording',
      'Disclosure sign-off references authoritative sources',
    ],
    defaultPayload: {
      note: 'IFRS 15 Revenue',
      highlights: ['Performance obligations satisfied over time', 'Contract asset roll-forward'],
      reviewers: ['Group Reporting', 'Technical Accounting'],
    },
  },
  {
    key: 'esef',
    title: 'ESEF / iXBRL Exporter',
    description:
      'Manages tagging coverage, validation and regulator submission artefacts for ESEF filings.',
    acceptanceCriteria: [
      'Tagging coverage meets regulator thresholds',
      'Validation warnings addressed with commentary',
      'Export bundle includes viewer and taxonomy package',
    ],
    defaultPayload: {
      taxonomy: 'ESEF-2024',
      documentType: 'Annual report',
      newConcepts: 4,
    },
  },
  {
    key: 'gapsme',
    title: 'Basis Switcher (GAPSME)',
    description:
      'Translates IFRS ledgers into GAPSME presentation with delta tracking and disclosure impacts.',
    acceptanceCriteria: [
      'Local GAAP adjustments reviewed and signed-off',
      'Impact analysis shared with statutory owners',
      'Switch trace stored for regulator review',
    ],
    defaultPayload: {
      sourceFramework: 'IFRS',
      targetFramework: 'GAPSME',
      adjustments: [
        { area: 'Revenue recognition', impact: -15000 },
        { area: 'Lease presentation', impact: 22000 },
      ],
    },
  },
  {
    key: 'industry',
    title: 'Industry Toggles',
    description:
      'Controls activation of industry-specific accounting policies, KPIs and disclosure templates.',
    acceptanceCriteria: [
      'Engagement lead confirms applicable industry overlays',
      'Risk and compliance approve toggle activation',
      'Toggle log links to specialised pack adoption metrics',
    ],
    defaultPayload: {
      industries: ['FinTech', 'Manufacturing'],
      toggles: [
        { name: 'Payments compliance', enabled: true },
        { name: 'Operational resilience', enabled: false },
      ],
    },
  },
  {
    key: 'specialised',
    title: 'Specialised Industry Packs',
    description:
      'Delivers templates for industry-specific disclosures and KPI tracking.',
    acceptanceCriteria: [
      'Industry SME validates metric definitions',
      'Engagement lead approves pack distribution',
      'Telemetry confirms usage and completion',
    ],
    defaultPayload: {
      industry: 'FinTech',
      metrics: ['Customer acquisition cost', 'Monthly active users'],
      questionnaire: ['Regulatory sandbox status', 'Capital adequacy commentary'],
    },
  },
  {
    key: 'telemetry',
    title: 'Governance Telemetry',
    description:
      'Feeds live status signals, control breaches and approval KPIs into operations dashboards.',
    acceptanceCriteria: [
      'Signals categorised by severity and module',
      'Control room acknowledges high severity alerts',
      'Telemetry retained with audit references',
    ],
    defaultPayload: {
      module: 'consolidation',
      severity: 'warning',
      message: 'Pending controller approval beyond SLA',
    },
  },
];

export const ACCOUNTING_MODULE_KEYS = ACCOUNTING_MODULES.map((module) => module.key);
