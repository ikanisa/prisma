import { NextRequest, NextResponse } from 'next/server';
import {
  ensureOrgAccess,
  getServiceOrgOrThrow,
  getSupabaseServiceClient,
  handleRouteError,
  HttpError,
  resolveCurrentUser,
} from '../_common';
import type { Database } from '../../../../../src/integrations/supabase/types';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient();

  try {
    const { searchParams } = new URL(request.url);
    const serviceOrgIdParam = searchParams.get('serviceOrgId');
    let orgIdParam = searchParams.get('orgId');

    const { userId } = await resolveCurrentUser(request, supabase);

    let selectedServiceOrg: Database['public']['Tables']['service_orgs']['Row'] | null = null;

    if (serviceOrgIdParam) {
      selectedServiceOrg = await getServiceOrgOrThrow(supabase, serviceOrgIdParam);
      orgIdParam = selectedServiceOrg.org_id;
    }

    if (!orgIdParam) {
      const { data: membership } = await supabase
        .from('memberships')
        .select('org_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!membership) {
        throw new HttpError(400, 'orgId is required for users without memberships');
      }

      orgIdParam = membership.org_id;
    }

    if (!orgIdParam) {
      throw new HttpError(500, 'orgId could not be resolved');
    }

    const resolvedOrgId = orgIdParam;

    const accessRole = await ensureOrgAccess(supabase, resolvedOrgId, userId, 'EMPLOYEE');

    const { data: serviceOrgs, error: serviceOrgError } = await supabase
      .from('service_orgs')
      .select('*')
      .eq('org_id', resolvedOrgId)
      .order('name', { ascending: true });

    if (serviceOrgError) {
      throw new HttpError(500, 'Failed to load service organizations');
    }

    if (!selectedServiceOrg && serviceOrgIdParam) {
      selectedServiceOrg = serviceOrgs?.find((entry) => entry.id === serviceOrgIdParam) ?? null;
      if (!selectedServiceOrg) {
        throw new HttpError(404, 'Service organization not found');
      }
    }

    if (!selectedServiceOrg) {
      selectedServiceOrg = serviceOrgs?.[0] ?? null;
    }

    let reports: Database['public']['Tables']['soc1_reports']['Row'][] = [];
    let cuecs: Database['public']['Tables']['soc1_cuecs']['Row'][] = [];
    let residualRiskNotes: Database['public']['Tables']['soc1_residual_risk_notes']['Row'][] = [];

    if (selectedServiceOrg) {
      const [{ data: reportRows, error: reportError }, { data: cuecRows, error: cuecError }, { data: noteRows, error: noteError }]
        = await Promise.all([
          supabase
            .from('soc1_reports')
            .select('*')
            .eq('service_org_id', selectedServiceOrg.id)
            .order('period_end', { ascending: false }),
          supabase
            .from('soc1_cuecs')
            .select('*')
            .eq('service_org_id', selectedServiceOrg.id)
            .order('control_objective', { ascending: true }),
          supabase
            .from('soc1_residual_risk_notes')
            .select('*')
            .eq('service_org_id', selectedServiceOrg.id)
            .order('created_at', { ascending: false }),
        ]);

      if (reportError || cuecError || noteError) {
        throw new HttpError(500, 'Failed to load SOC 1 data for the selected service organization');
      }

      reports = reportRows ?? [];
      cuecs = cuecRows ?? [];
      residualRiskNotes = noteRows ?? [];
    }

    return NextResponse.json({
      orgId: resolvedOrgId,
      accessRole,
      serviceOrgs: serviceOrgs ?? [],
      serviceOrg: selectedServiceOrg,
      reports,
      cuecs,
      residualRiskNotes,
    });
  } catch (error) {
    return handleRouteError(error, 'overview:GET');
  }
}
