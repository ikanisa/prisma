import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/* =========================================================================
   RECONCILIATION ACTIVITY (in-memory, dev-friendly)
   ========================================================================= */

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

/** Log a reconciliation action to the in-memory store (great for local/dev). */
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

/** Read recon activity in chronological order. */
export function listReconActivity(): ReconActivityEntry[] {
  const store = getLogStore();
  return [...store].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/** Clear the in-memory recon activity log. */
export function clearReconActivity() {
  const store = getLogStore();
  store.length = 0;
}

/* =========================================================================
   GENERAL AUDIT ACTIVITY (Supabase-backed, production)
   ========================================================================= */

type AuditActivityAction =
  | 'CTRL_ADDED'
  | 'CTRL_UPDATED'
  | 'CTRL_WALKTHROUGH_DONE'
  | 'CTRL_TEST_RUN'
  | 'CTRL_DEFICIENCY_RAISED'
  | 'ADA_RUN_STARTED'
  | 'ADA_RUN_COMPLETED'
  | 'ADA_EXCEPTION_ADDED'
  | 'ADA_EXCEPTION_RESOLVED'
  | 'SOC_CREATED'
  | 'SOC_REPORT_ADDED'
  | 'SOC_CUEC_TESTED'
  | 'SOC_EXCEPTION_ESCALATED'
  | 'GRP_COMPONENT_CREATED'
  | 'GRP_INSTRUCTION_SENT'
  | 'GRP_INSTRUCTION_ACKED'
  | 'GRP_INSTRUCTION_COMPLETED'
  | 'GRP_WORKPAPER_RECEIVED'
  | 'GRP_REVIEW_UPDATED'
  | 'EXP_EXPERT_ASSESSED'
  | 'EXP_IA_ASSESSED'
  | 'OI_UPLOADED'
  | 'OI_FLAGGED'
  | 'OI_RESOLVED';

/**
 * Insert a general audit activity row into Supabase (production path).
 */
export async function logAuditActivity(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    userId: string;
    action: AuditActivityAction;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const { orgId, userId, action, entityType, entityId, metadata } = params;
  const { error } = await supabase.from('activity_log').insert({
    org_id: orgId,
    user_id: userId,
    action,
    entity_type: entityType ?? 'AUDIT_CONTROL',
    entity_id: entityId ?? null,
    metadata: metadata ?? null,
  });

  if (error) throw error;
}

/* =========================================================================
   OPTIONAL BRIDGE: persist recon activity to Supabase when desired
   ========================================================================= */

export async function flushReconActivity(
  supabase: SupabaseClient,
  params: { orgId: string; userId: string; entityType?: string | null; entityId?: string | null },
) {
  const entries = listReconActivity();
  if (!entries.length) return;

  const { error } = await supabase.from('activity_log').insert(
    entries.map((entry) => ({
      org_id: params.orgId,
      user_id: params.userId,
      action: entry.action,
      entity_type: params.entityType ?? 'AUDIT_RECON',
      entity_id: params.entityId ?? null,
      metadata: entry.metadata,
    })),
  );

  if (error) throw error;

  clearReconActivity();
}
