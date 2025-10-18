export type Decision = 'approved' | 'review' | 'refused';

export type ModuleKey =
  | 'tax.mt.cit'
  | 'tax.mt.nid'
  | 'tax.mt.atad_ilr'
  | 'tax.mt.fiscal_unity'
  | 'tax.eu.vat'
  | 'tax.eu.dac6'
  | 'tax.eu.pillar_two'
  | 'tax.intl.treaty'
  | 'tax.us.gilti';

export interface WorkflowSummary {
  decision: Decision;
  reasons: string[];
  approvalsRequired: string[];
  nextSteps: string[];
}

export interface CalculatorResult<TMetrics extends object> {
  module: ModuleKey;
  metrics: TMetrics;
  workflow: WorkflowSummary;
  telemetry: Record<string, number>;
  evidence: Record<string, unknown>;
}

export interface TaxActivity {
  id: string;
  module: ModuleKey;
  scenario: string;
  decision: Decision;
  summary: string;
  metrics: Record<string, number | string>;
  timestamp: string;
  actor?: string;
}
