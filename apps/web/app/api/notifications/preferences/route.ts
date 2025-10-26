import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { Database } from '@prisma-glow/platform/supabase/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;

type PreferenceRow = {
  email_enabled: boolean;
  email_override: string | null;
  sms_enabled: boolean;
  sms_number: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type AppUserRow = {
  email: string | null;
  full_name: string | null;
};

function getActorId(request: NextRequest): string | null {
  const header = request.headers.get('x-user-id');
  if (!header) return null;
  const trimmed = header.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getOrgId(request: NextRequest): string | null {
  const orgId = request.nextUrl.searchParams.get('orgId');
  if (!orgId) return null;
  const trimmed = orgId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

function normalisePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

type SupabaseService = SupabaseClient<Database>;

export async function GET(request: NextRequest) {
  const actorId = getActorId(request);
  if (!actorId) {
    return NextResponse.json({ error: 'x-user-id header required' }, { status: 401 });
  }

  const orgId = getOrgId(request);
  if (!orgId) {
    return NextResponse.json({ error: 'orgId query parameter required' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const supabaseUnsafe = supabase as SupabaseService;

  const [{ data: preferenceData, error: preferenceError }, { data: userData, error: userError }] = await Promise.all([
    supabaseUnsafe
      .from('user_notification_preferences')
      .select('email_enabled, email_override, sms_enabled, sms_number, updated_at, created_at')
      .eq('user_id', actorId)
      .eq('org_id', orgId)
      .maybeSingle(),
    supabaseUnsafe.from('app_users').select('email, full_name').eq('user_id', actorId).maybeSingle(),
  ]);

  const preference = (preferenceData ?? null) as PreferenceRow | null;
  const user = (userData ?? null) as AppUserRow | null;

  if (preferenceError) {
    return NextResponse.json({ error: preferenceError.message }, { status: 500 });
  }

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const resolvedEmail = preference?.email_override ?? user?.email ?? null;

  return NextResponse.json({
    preference: {
      orgId,
      userId: actorId,
      emailEnabled: preference?.email_enabled ?? true,
      emailOverride: preference?.email_override ?? null,
      smsEnabled: preference?.sms_enabled ?? false,
      smsNumber: preference?.sms_number ?? null,
      updatedAt: preference?.updated_at ?? preference?.created_at ?? null,
      resolvedEmail,
    },
    defaults: {
      email: user?.email ?? null,
      fullName: user?.full_name ?? null,
    },
  });
}

export async function PUT(request: NextRequest) {
  const actorId = getActorId(request);
  if (!actorId) {
    return NextResponse.json({ error: 'x-user-id header required' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const orgIdRaw = typeof payload.orgId === 'string' ? payload.orgId : null;
  const orgId = orgIdRaw?.trim() ?? '';
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  const emailEnabled = typeof payload.emailEnabled === 'boolean' ? payload.emailEnabled : true;
  const smsEnabled = typeof payload.smsEnabled === 'boolean' ? payload.smsEnabled : false;

  const emailOverride = normaliseEmail(payload.emailOverride);
  if (emailOverride && !EMAIL_REGEX.test(emailOverride)) {
    return NextResponse.json({ error: 'emailOverride must be a valid email address' }, { status: 400 });
  }

  const smsNumber = normalisePhone(payload.smsNumber);
  if (smsEnabled && !smsNumber) {
    return NextResponse.json({ error: 'smsNumber is required when smsEnabled is true' }, { status: 400 });
  }

  if (smsNumber && !PHONE_REGEX.test(smsNumber)) {
    return NextResponse.json({ error: 'smsNumber must be a valid phone number' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const supabaseUnsafe = supabase as SupabaseService;

  const { data, error } = await supabaseUnsafe
    .from('user_notification_preferences')
    .upsert(
      {
        user_id: actorId,
        org_id: orgId,
        email_enabled: emailEnabled,
        email_override: emailOverride,
        sms_enabled: smsEnabled,
        sms_number: smsNumber,
      },
      { onConflict: 'user_id,org_id' },
    )
    .select('email_enabled, email_override, sms_enabled, sms_number, updated_at, created_at')
    .maybeSingle();

  const row = (data ?? null) as PreferenceRow | null;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resolvedEmail = row?.email_override ?? null;

  return NextResponse.json({
    preference: {
      orgId,
      userId: actorId,
      emailEnabled: row?.email_enabled ?? emailEnabled,
      emailOverride: row?.email_override ?? null,
      smsEnabled: row?.sms_enabled ?? smsEnabled,
      smsNumber: row?.sms_number ?? null,
      updatedAt: row?.updated_at ?? row?.created_at ?? new Date().toISOString(),
      resolvedEmail,
    },
  });
}
