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

function getDate(value: unknown, field: string, options?: { required?: boolean }) {
  const parsed = getString(value);
  if (!parsed) {
    if (options?.required) {
      throw new HttpError(400, `${field} is required`);
    }
    return null;
  }

  const timestamp = Date.parse(parsed);
  if (Number.isNaN(timestamp)) {
    throw new HttpError(400, `${field} must be a valid ISO date`);
  }

  return parsed;
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

    const serviceOrgId = requireString((body as Record<string, unknown>).serviceOrgId, 'serviceOrgId');
    const periodStart = getDate((body as Record<string, unknown>).periodStart, 'periodStart', { required: true });
    const periodEnd = getDate((body as Record<string, unknown>).periodEnd, 'periodEnd', { required: true });
    const reportType = getString((body as Record<string, unknown>).reportType) ?? 'Type II';
    const auditor = getString((body as Record<string, unknown>).auditor);
    const issuedAt = getDate((body as Record<string, unknown>).issuedAt, 'issuedAt');
    const coverageSummary = getString((body as Record<string, unknown>).coverageSummary);
    const testingSummary = getString((body as Record<string, unknown>).testingSummary);
    const controlDeficiencies = getString((body as Record<string, unknown>).controlDeficiencies);
    const documentStoragePath = getString((body as Record<string, unknown>).documentStoragePath);

    if (!periodStart || !periodEnd) {
      throw new HttpError(400, 'periodStart and periodEnd are required');
    }

    if (Date.parse(periodEnd) < Date.parse(periodStart)) {
      throw new HttpError(400, 'periodEnd must be on or after periodStart');
    }

    const { userId } = await resolveCurrentUser(request, supabase);
    const serviceOrg = await getServiceOrgOrThrow(supabase, serviceOrgId);
    await ensureOrgAccess(supabase, serviceOrg.org_id, userId, 'MANAGER');

    const { data, error } = await supabase
      .from('soc1_reports')
      .insert({
        service_org_id: serviceOrgId,
        period_start: periodStart,
        period_end: periodEnd,
        report_type: reportType,
        auditor,
        issued_at: issuedAt,
        coverage_summary: coverageSummary,
        testing_summary: testingSummary,
        control_deficiencies: controlDeficiencies,
        document_storage_path: documentStoragePath,
        uploaded_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      throw new HttpError(500, 'Failed to store SOC 1 report metadata');
    }

    await logActivity(supabase, {
      orgId: serviceOrg.org_id,
      userId,
      action: 'soc_report_uploaded',
      entityType: 'soc1_report',
      entityId: data.id,
      metadata: {
        reportType: data.report_type,
        periodStart: data.period_start,
        periodEnd: data.period_end,
        auditor: data.auditor,
      },
    });

    return NextResponse.json({ report: data }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'reports:POST');
  }
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient();

  try {
    const { searchParams } = new URL(request.url);
    const serviceOrgId = searchParams.get('serviceOrgId');

    if (!serviceOrgId) {
      throw new HttpError(400, 'serviceOrgId is required');
    }

    const { userId } = await resolveCurrentUser(request, supabase);
    const serviceOrg = await getServiceOrgOrThrow(supabase, serviceOrgId);
    await ensureOrgAccess(supabase, serviceOrg.org_id, userId, 'EMPLOYEE');

    const { data, error } = await supabase
      .from('soc1_reports')
      .select('*')
      .eq('service_org_id', serviceOrgId)
      .order('period_end', { ascending: false });

    if (error) {
      throw new HttpError(500, 'Failed to load SOC 1 reports');
    }

    return NextResponse.json({ reports: data ?? [] });
  } catch (error) {
    return handleRouteError(error, 'reports:GET');
  }
}
