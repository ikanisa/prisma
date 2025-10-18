import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ensureOrgAccess,
  getCuecOrThrow,
  getServiceOrgOrThrow,
  getSupabaseServiceClient,
  handleRouteError,
  HttpError,
  logActivity,
  resolveCurrentUser,
} from '../_common';

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() || null : null;
}

function requireString(value: unknown, field: string) {
  const parsed = getString(value);
  if (!parsed) {
    throw new HttpError(400, `${field} is required`);
  }
  return parsed;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  const supabaseUnsafe = supabase as SupabaseClient;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, 'Invalid JSON payload');
    }

    if (!body || typeof body !== 'object') {
      throw new HttpError(400, 'Body must be an object');
    }

    const payload = body as Record<string, unknown>;
    const cuecId = getString(payload.cuecId);
    let serviceOrgId = getString(payload.serviceOrgId);
    const note = requireString(payload.note, 'note');
    const riskRating = getString(payload.riskRating);
    const followUpOwner = getString(payload.followUpOwner);

    const { userId } = await resolveCurrentUser(request, supabase);

    if (!cuecId && !serviceOrgId) {
      throw new HttpError(400, 'serviceOrgId or cuecId must be provided');
    }

    if (cuecId) {
      const cuec = await getCuecOrThrow(supabase, cuecId);
      serviceOrgId = serviceOrgId ?? cuec.service_org_id;
      if (serviceOrgId !== cuec.service_org_id) {
        throw new HttpError(400, 'serviceOrgId does not match the CUEC');
      }
    }

    if (!serviceOrgId) {
      throw new HttpError(400, 'serviceOrgId could not be resolved');
    }

    const serviceOrg = await getServiceOrgOrThrow(supabase, serviceOrgId);
    await ensureOrgAccess(supabase, serviceOrg.org_id, userId, 'EMPLOYEE');

    const insertPayload = {
      service_org_id: serviceOrgId,
      cuec_id: cuecId,
      note,
      risk_rating: riskRating,
      follow_up_owner: followUpOwner,
      logged_by: userId,
    } satisfies {
      service_org_id: string;
      cuec_id: string | null;
      note: string;
      risk_rating: string | null;
      follow_up_owner: string | null;
      logged_by: string;
    };

    const { data, error } = await supabaseUnsafe
      .from('soc1_residual_risk_notes')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      throw new HttpError(500, 'Failed to record residual risk note');
    }

    await logActivity(supabase, {
      orgId: serviceOrg.org_id,
      userId,
      action: 'soc_residual_risk_logged',
      entityType: cuecId ? 'soc1_cuec' : 'service_org',
      entityId: cuecId ?? serviceOrgId,
      metadata: {
        riskRating: data.risk_rating,
        cuecId: data.cuec_id,
      },
    });

    return NextResponse.json({ note: data }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'residual-risk:POST');
  }
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  const supabaseUnsafe = supabase as SupabaseClient;

  try {
    const { searchParams } = new URL(request.url);
    const cuecId = searchParams.get('cuecId');
    let serviceOrgId = searchParams.get('serviceOrgId');

    if (!cuecId && !serviceOrgId) {
      throw new HttpError(400, 'serviceOrgId or cuecId is required');
    }

    if (cuecId) {
      const cuec = await getCuecOrThrow(supabase, cuecId);
      serviceOrgId = serviceOrgId ?? cuec.service_org_id;
      if (serviceOrgId !== cuec.service_org_id) {
        throw new HttpError(400, 'serviceOrgId does not match the CUEC');
      }
    }

    if (!serviceOrgId) {
      throw new HttpError(400, 'serviceOrgId could not be resolved');
    }

    const { userId } = await resolveCurrentUser(request, supabase);
    const serviceOrg = await getServiceOrgOrThrow(supabase, serviceOrgId);
    await ensureOrgAccess(supabase, serviceOrg.org_id, userId, 'EMPLOYEE');

    const query = supabaseUnsafe
      .from('soc1_residual_risk_notes')
      .select('*')
      .eq('service_org_id', serviceOrgId)
      .order('created_at', { ascending: false });

    if (cuecId) {
      query.eq('cuec_id', cuecId);
    }

    const { data, error } = await query;

    if (error) {
      throw new HttpError(500, 'Failed to load residual risk notes');
    }

    return NextResponse.json({ notes: (data ?? []) as Array<Record<string, unknown>> });
  } catch (error) {
    return handleRouteError(error, 'residual-risk:GET');
  }
}
