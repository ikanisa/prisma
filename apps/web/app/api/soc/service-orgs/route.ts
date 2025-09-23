import { NextRequest, NextResponse } from 'next/server';
import {
  ensureOrgAccess,
  getServiceOrgOrThrow,
  getSupabaseServiceClient,
  handleRouteError,
  HttpError,
  logActivity,
  resolveCurrentUser,
} from '../_common';

function getString(value: unknown, field: string, options?: { required?: boolean }) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (options?.required && !trimmed) {
    throw new HttpError(400, `${field} is required`);
  }

  return trimmed || null;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      throw new HttpError(400, 'Invalid JSON payload');
    }

    if (!body || typeof body !== 'object') {
      throw new HttpError(400, 'Body must be an object');
    }

    const orgId = getString((body as Record<string, unknown>).orgId, 'orgId', { required: true });
    const name = getString((body as Record<string, unknown>).name, 'name', { required: true });
    const description = getString((body as Record<string, unknown>).description, 'description');
    const industry = getString((body as Record<string, unknown>).industry, 'industry');
    const controlOwner = getString((body as Record<string, unknown>).controlOwner, 'controlOwner');
    const contactEmail = getString((body as Record<string, unknown>).contactEmail, 'contactEmail');
    const contactPhone = getString((body as Record<string, unknown>).contactPhone, 'contactPhone');
    const systemScope = getString((body as Record<string, unknown>).systemScope, 'systemScope');
    const oversightNotes = getString((body as Record<string, unknown>).oversightNotes, 'oversightNotes');

    if (!orgId || !name) {
      throw new HttpError(400, 'orgId and name are required');
    }

    const { userId } = await resolveCurrentUser(request, supabase);
    await ensureOrgAccess(supabase, orgId, userId, 'MANAGER');

    const { data, error } = await supabase
      .from('service_orgs')
      .insert({
        org_id: orgId,
        name,
        description,
        industry,
        control_owner: controlOwner,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        system_scope: systemScope,
        oversight_notes: oversightNotes,
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      throw new HttpError(500, 'Failed to register service organization');
    }

    await logActivity(supabase, {
      orgId,
      userId,
      action: 'soc_service_org_registered',
      entityType: 'service_org',
      entityId: data.id,
      metadata: {
        name: data.name,
        industry: data.industry,
      },
    });

    return NextResponse.json({ serviceOrg: data }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'service-orgs:POST');
  }
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient();

  try {
    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('orgId');
    const serviceOrgId = searchParams.get('serviceOrgId');

    const { userId } = await resolveCurrentUser(request, supabase);

    let targetOrgId = orgIdParam;
    if (serviceOrgId) {
      const existing = await getServiceOrgOrThrow(supabase, serviceOrgId);
      targetOrgId = existing.org_id;
    }

    if (!targetOrgId) {
      const { data: membership } = await supabase
        .from('memberships')
        .select('org_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!membership) {
        throw new HttpError(400, 'orgId is required');
      }

      targetOrgId = membership.org_id;
    }

    await ensureOrgAccess(supabase, targetOrgId, userId, 'EMPLOYEE');

    const query = supabase
      .from('service_orgs')
      .select('*')
      .eq('org_id', targetOrgId)
      .order('name', { ascending: true });

    if (serviceOrgId) {
      query.eq('id', serviceOrgId);
    }

    const { data, error } = await query;

    if (error) {
      throw new HttpError(500, 'Failed to load service organizations');
    }

    return NextResponse.json({ serviceOrgs: data ?? [] });
  } catch (error) {
    return handleRouteError(error, 'service-orgs:GET');
  }
}
