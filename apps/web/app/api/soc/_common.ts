import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import type { Database } from '../../../../../src/integrations/supabase/types';

type RoleLevel = Database['public']['Enums']['role_level'];

type ServiceOrgRow = Database['public']['Tables']['service_orgs']['Row'];
type CuecRow = Database['public']['Tables']['soc1_cuecs']['Row'];

type ActivityInput = {
  orgId: string;
  userId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
};

let cachedClient: SupabaseClient<Database> | null = null;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export function getSupabaseServiceClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service credentials are not configured');
  }

  cachedClient = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}

const ROLE_WEIGHT: Record<RoleLevel, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  SYSTEM_ADMIN: 3,
};

function hasRequiredRole(actual: RoleLevel, minimum: RoleLevel) {
  return ROLE_WEIGHT[actual] >= ROLE_WEIGHT[minimum];
}

export async function resolveCurrentUser(
  request: NextRequest,
  client: SupabaseClient<Database>,
): Promise<{ userId: string; email?: string | null; name?: string | null }> {
  const session = await auth();
  const headerUserId = request.headers.get('x-user-id');

  if (session?.user) {
    const maybeId = (session.user as { id?: string }).id;
    if (maybeId) {
      return { userId: maybeId, email: session.user.email ?? null, name: session.user.name ?? null };
    }

    if (session.user.email) {
      const email = session.user.email.toLowerCase();
      const { data, error } = await client
        .from('app_users')
        .select('user_id, full_name')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        throw new HttpError(500, 'Failed to resolve current user');
      }

      if (data) {
        return {
          userId: data.user_id,
          email: session.user.email,
          name: data.full_name ?? session.user.name ?? null,
        };
      }
    }
  }

  if (headerUserId) {
    return { userId: headerUserId };
  }

  throw new HttpError(401, 'Authentication required');
}

export async function ensureOrgAccess(
  client: SupabaseClient<Database>,
  orgId: string,
  userId: string,
  minimum: RoleLevel = 'EMPLOYEE',
): Promise<RoleLevel> {
  const { data: membership, error: membershipError } = await client
    .from('memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError) {
    throw new HttpError(500, 'Unable to verify organization membership');
  }

  if (membership) {
    if (!hasRequiredRole(membership.role, minimum)) {
      throw new HttpError(403, 'Insufficient role for this operation');
    }
    return membership.role;
  }

  const { data: userRow, error: userError } = await client
    .from('users')
    .select('is_system_admin')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    throw new HttpError(500, 'Unable to verify user privileges');
  }

  if (userRow?.is_system_admin) {
    return 'SYSTEM_ADMIN';
  }

  throw new HttpError(403, 'You do not have access to this organization');
}

export async function getServiceOrgOrThrow(
  client: SupabaseClient<Database>,
  serviceOrgId: string,
): Promise<ServiceOrgRow> {
  const { data, error } = await client
    .from('service_orgs')
    .select('*')
    .eq('id', serviceOrgId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, 'Failed to load service organization');
  }

  if (!data) {
    throw new HttpError(404, 'Service organization not found');
  }

  return data;
}

export async function getCuecOrThrow(
  client: SupabaseClient<Database>,
  cuecId: string,
): Promise<CuecRow> {
  const { data, error } = await client
    .from('soc1_cuecs')
    .select('*')
    .eq('id', cuecId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, 'Failed to load CUEC');
  }

  if (!data) {
    throw new HttpError(404, 'CUEC not found');
  }

  return data;
}

export async function logActivity(
  client: SupabaseClient<Database>,
  input: ActivityInput,
): Promise<void> {
  const { error } = await client.from('activity_log').insert({
    org_id: input.orgId,
    user_id: input.userId,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) {
    // We do not fail the entire request on log errors, but surface details for troubleshooting.
    console.error('Failed to record activity log entry', { error, action: input.action });
  }
}

export function handleRouteError(error: unknown, context: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(`[soc-api] ${context}`, error);
  return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
}
