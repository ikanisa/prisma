import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseServerClient } from '../supabase/server';
import { getSupabaseServerClient } from '../supabase/server';
import { logger } from '@/lib/logger';

type ActivityMetadata = Record<string, unknown>;

export type GroupActivityAction =
  | 'GRP_COMPONENT_CREATED'
  | 'GRP_COMPONENT_UPDATED'
  | 'GRP_COMPONENT_DELETED'
  | 'GRP_INSTRUCTION_SENT'
  | 'GRP_INSTRUCTION_ACK'
  | 'GRP_WORKPAPER_INGESTED'
  | 'GRP_REVIEW_ASSIGNED'
  | 'GRP_REVIEW_SIGNOFF';

export interface GroupActivityParams {
  action: GroupActivityAction;
  orgId: string;
  userId: string;
  entityId?: string | null;
  entityType?: string | null;
  metadata?: ActivityMetadata | null;
  supabase?: SupabaseServerClient;
}

function sanitizeMetadata(metadata?: ActivityMetadata | null): ActivityMetadata | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  try {
    JSON.stringify(metadata);
    return metadata;
  } catch (error) {
    logger.warn('group.activity_metadata_serialisation_failed', { error });
    return null;
  }
}

export async function logGroupActivity(params: GroupActivityParams) {
  const { action, orgId, userId, entityId, entityType } = params;
  const metadata = sanitizeMetadata(params.metadata);

  if (!orgId || !userId) {
    return;
  }

  const supabase = params.supabase ?? getSupabaseServerClient();
  const supabaseUnsafe = supabase as SupabaseClient;
  const payload = {
    action,
    org_id: orgId,
    user_id: userId,
    entity_id: entityId ?? null,
    entity_type: entityType ?? null,
    metadata: metadata ?? null,
  };

  try {
    await supabaseUnsafe.from('activity_log').insert(payload);
  } catch (error) {
    logger.error('group.activity_persist_failed', {
      error,
      orgId,
      userId,
      action,
    });
  }
}
