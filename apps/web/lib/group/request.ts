import { auth } from '@/auth';
import type { NextRequest } from 'next/server';
import type { SupabaseServerClient } from '../supabase/server';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

export function toJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function getOrgIdFromRequest(request: NextRequest | Request, candidate?: unknown): string | null {
  const url = new URL(request.url);
  const queryValue = url.searchParams.get('orgId');
  const headerValue = request.headers.get('x-org-id');
  const candidates = [candidate, headerValue, queryValue];
  for (const option of candidates) {
    if (typeof option === 'string' && isUuid(option)) {
      return option.trim();
    }
  }
  return null;
}

export async function resolveUserId(request: NextRequest | Request, candidate?: unknown): Promise<string | null> {
  const headerValue = request.headers.get('x-user-id');
  const staticCandidates = [candidate, headerValue];
  for (const option of staticCandidates) {
    if (typeof option === 'string' && isUuid(option)) {
      return option.trim();
    }
  }

  try {
    const session = await auth();
    const sessionCandidates = [
      (session?.user as { id?: string } | undefined)?.id,
      (session?.user as { sub?: string } | undefined)?.sub,
    ];
    for (const option of sessionCandidates) {
      if (typeof option === 'string' && isUuid(option)) {
        return option.trim();
      }
    }
  } catch (error) {
    console.warn('Unable to resolve session user for group request', error);
  }

  return null;
}

type OrgRole = 'client' | 'staff' | 'manager' | 'admin';

const ROLE_PRIORITY: Record<OrgRole, number> = {
  client: 0,
  staff: 1,
  manager: 2,
  admin: 3,
};

type MembershipResult =
  | { ok: true; role: OrgRole }
  | { ok: false; status: number; error: string };

export async function ensureOrgMembership(
  supabase: SupabaseServerClient,
  orgId: string,
  userId: string,
  minRole: OrgRole = 'staff',
): Promise<MembershipResult> {
  try {
    const { data, error } = await (supabase as unknown as { from: SupabaseServerClient['from'] })
      .from('members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to verify org membership', error);
      return { ok: false, status: 500, error: 'Unable to verify organization membership' };
    }

    if (!data) {
      return { ok: false, status: 403, error: 'User is not a member of this organization' };
    }

    const role = (data as { role?: string }).role?.trim().toLowerCase() as OrgRole | undefined;
    if (!role || !(role in ROLE_PRIORITY)) {
      return { ok: false, status: 403, error: 'User is not authorized for this organization' };
    }

    if (ROLE_PRIORITY[role] < ROLE_PRIORITY[minRole]) {
      return { ok: false, status: 403, error: 'User does not meet the required organization role' };
    }

    return { ok: true, role };
  } catch (error) {
    console.error('Unexpected error verifying org membership', error);
    return { ok: false, status: 500, error: 'Unable to verify organization membership' };
  }
}

type GroupAuthSuccess = {
  ok: true;
  orgId: string;
  userId: string;
  role: OrgRole;
};

type GroupAuthFailure = {
  ok: false;
  status: number;
  error: string;
};

export async function authenticateGroupRequest(options: {
  request: NextRequest | Request;
  supabase: SupabaseServerClient;
  orgIdCandidate?: unknown;
  userIdCandidate?: unknown;
  minRole?: OrgRole;
  userErrorMessage?: string;
}): Promise<GroupAuthSuccess | GroupAuthFailure> {
  const { request, supabase, orgIdCandidate, userIdCandidate, minRole = 'staff', userErrorMessage } = options;

  const orgId = getOrgIdFromRequest(request, orgIdCandidate);
  if (!orgId) {
    return { ok: false, status: 400, error: 'orgId is required' };
  }

  const userId = await resolveUserId(request, userIdCandidate);
  if (!userId) {
    return { ok: false, status: 401, error: userErrorMessage ?? 'userId is required for auditing' };
  }

  const membership = await ensureOrgMembership(supabase, orgId, userId, minRole);
  if (!membership.ok) {
    return membership;
  }

  return { ok: true, orgId, userId, role: membership.role };
}
