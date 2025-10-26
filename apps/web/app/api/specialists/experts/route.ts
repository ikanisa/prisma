import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordSpecialistActivity } from '@/lib/supabase/activity';
import { logger } from '@/lib/logger';

type ServiceClient = ReturnType<typeof getSupabaseServiceClient>;

const STANDARD_EXPERT = 'ISA 620';
const ALLOWED_STATUSES = new Set(['draft', 'in_review', 'final']);

function normalizeStandardRefs(input: unknown): string[] {
  const extras = Array.isArray(input)
    ? input
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0)
    : [];
  return Array.from(new Set([STANDARD_EXPERT, ...extras]));
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

type SessionUser = {
  id?: string | null;
  sub?: string | null;
  email?: string | null;
  name?: string | null;
};

async function resolveAuthenticatedUser(client: ServiceClient) {
  let sessionUser: SessionUser | null = null;

  try {
    const session = await auth();
    sessionUser = (session?.user as SessionUser | undefined) ?? null;
  } catch (error) {
    logger.error('specialist_expert.session_resolution_failed', { error });
    throw new HttpError(500, 'Unable to verify authentication');
  }

  if (!sessionUser) {
    throw new HttpError(401, 'Authentication required');
  }

  const directId = sessionUser.id ?? sessionUser.sub;
  if (directId && directId.trim().length > 0) {
    return { userId: directId.trim(), email: sessionUser.email ?? null, name: sessionUser.name ?? null };
  }

  const email = sessionUser.email?.toLowerCase();
  if (email) {
    const { data, error } = await client
      .from('app_users')
      .select('user_id, full_name')
      .eq('email', email)
      .maybeSingle<{ user_id: string; full_name: string | null }>();

    if (error) {
      logger.error('specialist_expert.email_lookup_failed', { error, email });
      throw new HttpError(500, 'Unable to resolve current user');
    }

    if (data) {
      return {
        userId: data.user_id,
        email: sessionUser.email ?? null,
        name: data.full_name ?? sessionUser.name ?? null,
      };
    }
  }

  throw new HttpError(401, 'Authentication required');
}

async function ensureOrgMembership(client: ServiceClient, orgId: string, userId: string) {
  const { data: membership, error: membershipError } = await client
    .from('memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle<{ role: string }>();

  if (membershipError) {
    logger.error('specialist_expert.membership_check_failed', { error: membershipError, orgId, userId });
    throw new HttpError(500, 'Unable to verify organisation membership');
  }

  if (membership) {
    return membership.role;
  }

  const { data: userRow, error: userError } = await client
    .from('users')
    .select('is_system_admin')
    .eq('id', userId)
    .maybeSingle<{ is_system_admin: boolean }>();

  if (userError) {
    logger.error('specialist_expert.privilege_check_failed', { error: userError, userId });
    throw new HttpError(500, 'Unable to verify user privileges');
  }

  if (userRow?.is_system_admin) {
    return 'SYSTEM_ADMIN';
  }

  throw new HttpError(403, 'You do not have access to this organisation');
}

async function ensureEngagementBelongsToOrg(client: ServiceClient, orgId: string, engagementId: string) {
  const { data, error } = await client
    .from('engagements')
    .select('org_id')
    .eq('id', engagementId)
    .maybeSingle<{ org_id: string }>();

  if (error) {
    logger.error('specialist_expert.engagement_check_failed', { error, orgId, engagementId });
    throw new HttpError(500, 'Unable to verify engagement access');
  }

  if (!data) {
    throw new HttpError(404, 'Engagement not found');
  }

  if (data.org_id !== orgId) {
    throw new HttpError(403, 'Engagement does not belong to the specified organisation');
  }
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const orgId = typeof payload.orgId === 'string' ? payload.orgId.trim() : '';
  const engagementId = typeof payload.engagementId === 'string' ? payload.engagementId.trim() : '';
  const area = typeof payload.area === 'string' ? payload.area.trim() : '';
  const specialistName =
    typeof payload.specialistName === 'string' ? payload.specialistName.trim() : '';

  if (!orgId || !engagementId || !area || !specialistName) {
    return NextResponse.json(
      { error: 'orgId, engagementId, area, and specialistName are required' },
      { status: 400 },
    );
  }

  const statusValue =
    typeof payload.status === 'string' && ALLOWED_STATUSES.has(payload.status)
      ? (payload.status as string)
      : 'draft';

  const supabase = getSupabaseServiceClient();
  const supabaseUnsafe = supabase as SupabaseClient;

  let actorId: string;
  try {
    const actor = await resolveAuthenticatedUser(supabase);
    actorId = actor.userId;
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error('specialist_expert.resolve_current_user_unexpected', { error });
    return NextResponse.json({ error: 'Failed to resolve current user' }, { status: 500 });
  }

  try {
    await ensureOrgMembership(supabase, orgId, actorId);
    await ensureEngagementBelongsToOrg(supabase, orgId, engagementId);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error('specialist_expert.authorization_unexpected', { error });
    return NextResponse.json({ error: 'Unable to verify access for this engagement' }, { status: 500 });
  }

  const { data, error } = await supabaseUnsafe
    .from('audit_specialist_experts')
    .insert({
      org_id: orgId,
      engagement_id: engagementId,
      area,
      specialist_name: specialistName,
      specialist_firm:
        typeof payload.specialistFirm === 'string' ? payload.specialistFirm.trim() : null,
      scope_of_work:
        typeof payload.scopeOfWork === 'string' ? payload.scopeOfWork.trim() : null,
      competence_assessment:
        typeof payload.competenceAssessment === 'string'
          ? payload.competenceAssessment.trim()
          : null,
      objectivity_assessment:
        typeof payload.objectivityAssessment === 'string'
          ? payload.objectivityAssessment.trim()
          : null,
      work_performed:
        typeof payload.workPerformed === 'string' ? payload.workPerformed.trim() : null,
      results_summary:
        typeof payload.resultsSummary === 'string' ? payload.resultsSummary.trim() : null,
      conclusion: typeof payload.conclusion === 'string' ? payload.conclusion.trim() : null,
      prepared_by: actorId,
      status: statusValue as typeof statusValue,
      standard_refs: normalizeStandardRefs(payload.standardRefs),
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'An expert evaluation already exists for this engagement' },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordSpecialistActivity(supabase, {
    orgId,
    userId: actorId,
    action: 'EXP_EXPERT_RECORDED',
    entityId: data.id,
    metadata: {
      engagementId,
      status: data.status,
      standards: data.standard_refs,
      type: 'expert',
    },
  });

  return NextResponse.json({ expert: data }, { status: 201 });
}
