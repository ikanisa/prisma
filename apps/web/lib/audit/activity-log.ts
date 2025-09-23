import { randomUUID } from 'crypto';

export type ReconActivityAction =
  | 'RECON_CREATED'
  | 'RECON_STATEMENT_IMPORTED'
  | 'RECON_AUTOMATCH_COMPLETED'
  | 'RECON_ITEM_RESOLVED'
  | 'RECON_CLOSED';

export interface ReconActivityEntry {
  id: string;
  timestamp: string;
  action: ReconActivityAction;
  metadata: Record<string, unknown>;
}

const GLOBAL_KEY = Symbol.for('audit.reconciliation.activityLog');

type ReconGlobal = typeof globalThis & {
  [GLOBAL_KEY]?: ReconActivityEntry[];
};

function getLogStore(): ReconActivityEntry[] {
  const globalObject = globalThis as ReconGlobal;
  if (!globalObject[GLOBAL_KEY]) {
    globalObject[GLOBAL_KEY] = [];
  }
  return globalObject[GLOBAL_KEY]!;
}

export function logReconAction(action: ReconActivityAction, metadata: Record<string, unknown>) {
  const entry: ReconActivityEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    metadata,
  };
  const store = getLogStore();
  store.push(entry);
}

export function listReconActivity(): ReconActivityEntry[] {
  const store = getLogStore();
  return [...store].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function clearReconActivity() {
  const store = getLogStore();
  store.length = 0;
}
