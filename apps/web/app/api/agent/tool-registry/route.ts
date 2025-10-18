import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ToolRegistryRow = {
  id: string;
  key: string;
  label: string | null;
  description: string | null;
  min_role: 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN';
  sensitive: boolean;
  enabled: boolean;
  standards_refs: string[] | null;
  metadata: unknown;
  org_id: string | null;
  updated_at: string;
  updated_by_user_id: string | null;
};

type NormalisedTool = {
  id: string;
  key: string;
  label: string | null;
  description: string | null;
  minRole: 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN';
  sensitive: boolean;
  enabled: boolean;
  standardsRefs: string[];
  orgId: string | null;
  updatedAt: string;
  updatedByUserId: string | null;
};

function normaliseTool(row: ToolRegistryRow): NormalisedTool {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    description: row.description,
    minRole: row.min_role as NormalisedTool['minRole'],
    sensitive: row.sensitive,
    enabled: row.enabled,
    standardsRefs: row.standards_refs ?? [],
    orgId: row.org_id,
    updatedAt: row.updated_at,
    updatedByUserId: row.updated_by_user_id,
  };
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  const supabaseUnsafe = supabase as SupabaseClient;
  const orgId = request.nextUrl.searchParams.get('orgId');

  let query = supabaseUnsafe
    .from('tool_registry')
    .select('id, key, label, description, min_role, sensitive, standards_refs, enabled, metadata, org_id, updated_at, updated_by_user_id')
    .order('key', { ascending: true });

  if (orgId) {
    query = query.or(`org_id.is.null,org_id.eq.${orgId}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tools = (data ?? []).map(normaliseTool);
  return NextResponse.json({ tools });
}

export async function PATCH(request: NextRequest) {
  const payload = (await request.json()) as {
    id?: string;
    enabled?: boolean;
    minRole?: string;
    sensitive?: boolean;
    standardsRefs?: string[];
    updatedByUserId?: string | null;
  };

  if (!payload.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const updates: Partial<ToolRegistryRow> = { updated_at: new Date().toISOString() };

  if (typeof payload.enabled === 'boolean') {
    updates.enabled = payload.enabled;
  }
  if (typeof payload.minRole === 'string') {
    updates.min_role = payload.minRole as ToolRegistryRow['min_role'];
  }
  if (typeof payload.sensitive === 'boolean') {
    updates.sensitive = payload.sensitive;
  }
  if (Array.isArray(payload.standardsRefs)) {
    updates.standards_refs = payload.standardsRefs;
  }
  if (payload.updatedByUserId !== undefined) {
    updates.updated_by_user_id = payload.updatedByUserId;
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: 'No valid fields supplied for update' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const supabaseUnsafe = supabase as SupabaseClient;
  const { error } = await supabaseUnsafe
    .from('tool_registry')
    .update(updates)
    .eq('id', payload.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
