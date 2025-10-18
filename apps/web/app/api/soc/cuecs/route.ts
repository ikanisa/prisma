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

const ALLOWED_STATUSES = new Set(['not_started', 'in_progress', 'effective', 'deficient']);

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

function getStatus(value: unknown) {
  const parsed = getString(value);
  if (!parsed) {
    return undefined;
  }

  if (!ALLOWED_STATUSES.has(parsed)) {
    throw new HttpError(400, `status must be one of ${Array.from(ALLOWED_STATUSES).join(', ')}`);
  }

  return parsed;
}

function getDate(value: unknown, field: string) {
  const parsed = getString(value);
  if (!parsed) {
    return undefined;
  }
  const timestamp = Date.parse(parsed);
  if (Number.isNaN(timestamp)) {
    throw new HttpError(400, `${field} must be a valid ISO date`);
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

    const serviceOrgId = requireString((body as Record<string, unknown>).serviceOrgId, 'serviceOrgId');
    const controlObjective = requireString((body as Record<string, unknown>).controlObjective, 'controlObjective');
    const controlReference = getString((body as Record<string, unknown>).controlReference);
    const description = getString((body as Record<string, unknown>).description);
    const controlOwner = getString((body as Record<string, unknown>).controlOwner);
    const frequency = getString((body as Record<string, unknown>).frequency);
    const status = getStatus((body as Record<string, unknown>).status) ?? 'not_started';
    const testingNotes = getString((body as Record<string, unknown>).testingNotes);
    const reportId = getString((body as Record<string, unknown>).reportId);
    const residualRisk = getString((body as Record<string, unknown>).residualRisk);

    const { userId } = await resolveCurrentUser(request, supabase);
    const serviceOrg = await getServiceOrgOrThrow(supabase, serviceOrgId);
    await ensureOrgAccess(supabase, serviceOrg.org_id, userId, 'MANAGER');

    const insertPayload = {
      service_org_id: serviceOrgId,
      control_objective: controlObjective,
      control_reference: controlReference,
      description,
      control_owner: controlOwner,
      frequency,
      status,
      testing_notes: testingNotes,
      report_id: reportId,
      residual_risk: residualRisk,
    } satisfies {
      service_org_id: string;
      control_objective: string;
      control_reference: string | null;
      description: string | null;
      control_owner: string | null;
      frequency: string | null;
      status: string;
      testing_notes: string | null;
      report_id: string | null;
      residual_risk: string | null;
    };

    const { data, error } = await supabaseUnsafe
      .from('soc1_cuecs')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      throw new HttpError(500, 'Failed to create CUEC entry');
    }

    await logActivity(supabase, {
      orgId: serviceOrg.org_id,
      userId,
      action: 'soc_cuec_created',
      entityType: 'soc1_cuec',
      entityId: data.id,
      metadata: {
        status: data.status,
        controlObjective: data.control_objective,
      },
    });

    return NextResponse.json({ cuec: data }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'cuecs:POST');
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseServiceClient();

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

    const cuecId = requireString((body as Record<string, unknown>).id, 'id');
    const payload = body as Record<string, unknown>;
    const status = getStatus(payload.status);
    const testedByRaw = payload.testedBy;

    const cuec = await getCuecOrThrow(supabase, cuecId);
    const { userId } = await resolveCurrentUser(request, supabase);
    await ensureOrgAccess(supabase, cuec.service_org_id, userId, 'MANAGER');

    const updates: Record<string, unknown> = {};
    if (status) {
      updates.status = status;
    }
    if ('controlOwner' in payload) {
      updates.control_owner = getString(payload.controlOwner);
    }
    if ('frequency' in payload) {
      updates.frequency = getString(payload.frequency);
    }
    if ('testingNotes' in payload) {
      updates.testing_notes = getString(payload.testingNotes);
    }
    if ('exceptionSummary' in payload) {
      updates.exception_summary = getString(payload.exceptionSummary);
    }
    if ('remediationPlan' in payload) {
      updates.remediation_plan = getString(payload.remediationPlan);
    }
    if ('residualRisk' in payload) {
      updates.residual_risk = getString(payload.residualRisk);
    }
    if ('lastTestedAt' in payload) {
      updates.last_tested_at = getDate(payload.lastTestedAt, 'lastTestedAt');
    }

    if (testedByRaw !== undefined) {
      if (testedByRaw === 'self') {
        updates.tested_by = userId;
      } else {
        updates.tested_by = getString(testedByRaw);
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, 'No updatable fields were provided');
    }

    const { data, error } = await (supabase as SupabaseClient)
      .from('soc1_cuecs')
      .update(updates)
      .eq('id', cuecId)
      .select('*')
      .single();

    if (error) {
      throw new HttpError(500, 'Failed to update CUEC entry');
    }

    await logActivity(supabase, {
      orgId: cuec.service_org_id,
      userId,
      action: 'soc_cuec_updated',
      entityType: 'soc1_cuec',
      entityId: cuecId,
      metadata: {
        status: data.status,
        lastTestedAt: data.last_tested_at,
      },
    });

    return NextResponse.json({ cuec: data });
  } catch (error) {
    return handleRouteError(error, 'cuecs:PATCH');
  }
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient();

  try {
    const { searchParams } = new URL(request.url);
    const serviceOrgId = searchParams.get('serviceOrgId');
    const statusFilter = searchParams.get('status');

    if (!serviceOrgId) {
      throw new HttpError(400, 'serviceOrgId is required');
    }

    const { userId } = await resolveCurrentUser(request, supabase);
    const serviceOrg = await getServiceOrgOrThrow(supabase, serviceOrgId);
    await ensureOrgAccess(supabase, serviceOrg.org_id, userId, 'EMPLOYEE');

    const query = supabase
      .from('soc1_cuecs')
      .select('*')
      .eq('service_org_id', serviceOrgId)
      .order('control_objective', { ascending: true });

    if (statusFilter) {
      if (!ALLOWED_STATUSES.has(statusFilter)) {
        throw new HttpError(400, `status must be one of ${Array.from(ALLOWED_STATUSES).join(', ')}`);
      }
      query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      throw new HttpError(500, 'Failed to load CUEC entries');
    }

    return NextResponse.json({ cuecs: data ?? [] });
  } catch (error) {
    return handleRouteError(error, 'cuecs:GET');
  }
}
