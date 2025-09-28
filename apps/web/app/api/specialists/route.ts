import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServiceClient } from '../../../lib/supabase/server';

const STANDARD_EXPERT = 'ISA 620';
const STANDARD_INTERNAL = 'ISA 610';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  const engagementId = url.searchParams.get('engagementId');

  if (!orgId) {
    return NextResponse.json({ error: 'orgId query parameter is required' }, { status: 400 });
  }

  const expertsQuery = supabase
    .from('audit_specialist_experts')
    .select('*')
    .eq('org_id', orgId);

  if (engagementId) {
    expertsQuery.eq('engagement_id', engagementId);
  }

  const internalQuery = supabase
    .from('audit_specialist_internal')
    .select('*')
    .eq('org_id', orgId);

  if (engagementId) {
    internalQuery.eq('engagement_id', engagementId);
  }

  const evidenceQuery = supabase
    .from('audit_specialist_evidence')
    .select('*')
    .eq('org_id', orgId);

  if (engagementId) {
    evidenceQuery.eq('engagement_id', engagementId);
  }

  const [expertsResult, internalResult, evidenceResult] = await Promise.all([
    expertsQuery,
    internalQuery,
    evidenceQuery,
  ]);

  if (expertsResult.error) {
    return NextResponse.json({ error: expertsResult.error.message }, { status: 500 });
  }

  if (internalResult.error) {
    return NextResponse.json({ error: internalResult.error.message }, { status: 500 });
  }

  if (evidenceResult.error) {
    return NextResponse.json({ error: evidenceResult.error.message }, { status: 500 });
  }

  const evidenceRows = evidenceResult.data ?? [];
  const expertEvidence = new Map<string, typeof evidenceRows>();
  const internalEvidence = new Map<string, typeof evidenceRows>();

  evidenceRows.forEach((item) => {
    if (item.expert_assessment_id) {
      const existing = expertEvidence.get(item.expert_assessment_id) ?? [];
      expertEvidence.set(item.expert_assessment_id, [...existing, item]);
    }
    if (item.internal_assessment_id) {
      const existing = internalEvidence.get(item.internal_assessment_id) ?? [];
      internalEvidence.set(item.internal_assessment_id, [...existing, item]);
    }
  });

  const expertsWithEvidence = (expertsResult.data ?? []).map((entry) => ({
    ...entry,
    standard_refs: Array.from(new Set([STANDARD_EXPERT, ...(entry.standard_refs ?? [])])),
    evidence: expertEvidence.get(entry.id) ?? [],
  }));

  const internalWithEvidence = (internalResult.data ?? []).map((entry) => ({
    ...entry,
    standard_refs: Array.from(new Set([STANDARD_INTERNAL, ...(entry.standard_refs ?? [])])),
    evidence: internalEvidence.get(entry.id) ?? [],
  }));

  return NextResponse.json({
    experts: expertsWithEvidence,
    internal: internalWithEvidence,
  });
}
