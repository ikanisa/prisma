import { randomUUID } from 'crypto';
import type { Decision, ModuleKey, TaxActivity } from './types';

const MAX_ACTIVITY = 200;
const activityLog: TaxActivity[] = [];

interface RecordActivityInput {
  module: ModuleKey;
  scenario: string;
  decision: Decision;
  summary: string;
  metrics: Record<string, number | string>;
  actor?: string;
}

export function recordActivity(input: RecordActivityInput): TaxActivity {
  const entry: TaxActivity = {
    id: randomUUID(),
    module: input.module,
    scenario: input.scenario,
    decision: input.decision,
    summary: input.summary,
    metrics: input.metrics,
    timestamp: new Date().toISOString(),
    actor: input.actor,
  };

  activityLog.unshift(entry);
  if (activityLog.length > MAX_ACTIVITY) {
    activityLog.pop();
  }

  return entry;
}

export function listActivity(module?: ModuleKey): TaxActivity[] {
  if (!module) {
    return [...activityLog];
  }

  return activityLog.filter((entry) => entry.module === module);
}
