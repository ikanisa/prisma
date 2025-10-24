export async function aggregateRiskSignals(supabase: any, context: { orgId: string; engagementId: string }) {
  const { data: signals, error } = await supabase
    .from('audit_risk_signals')
    .select('id, source, kind, payload, created_at')
    .eq('org_id', context.orgId)
    .eq('engagement_id', context.engagementId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }
  return signals ?? [];
}
