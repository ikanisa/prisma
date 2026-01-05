/**
 * Database Integration for Tools
 * 
 * Provides database access functions for tools, with proper auth context
 * Uses Supabase client with service role for tool execution
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ToolContext, UserRole } from './types';

/**
 * Get Supabase client with service role
 * This bypasses RLS, so we must enforce permissions in application code
 */
let supabaseServiceClient: SupabaseClient | null = null;

function getSupabaseServiceClient(): SupabaseClient {
  if (supabaseServiceClient) {
    return supabaseServiceClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Supabase service role credentials not configured. ' +
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  supabaseServiceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseServiceClient;
}

/**
 * Get user profile from database
 */
export async function getUserProfile(
  userId: string
): Promise<{ id: string; role: UserRole; organizationId?: string } | null> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, role, organization_id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to get user profile:', error);
    return null;
  }

  return {
    id: data.id,
    role: data.role as UserRole,
    organizationId: data.organization_id || undefined,
  };
}

/**
 * Get user role from database
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const profile = await getUserProfile(userId);
  return profile?.role || 'STAFF';
}

/**
 * Check if user is system admin
 */
export async function isSystemAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'SYSTEM_ADMIN';
}

/**
 * Log tool execution to audit log
 */
export async function logToolExecution(
  auditLog: {
    toolName: string;
    userId: string;
    userRole: UserRole;
    organizationId?: string;
    input: Record<string, unknown>;
    output: unknown;
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    durationMs: number;
    requestId?: string;
  }
): Promise<void> {
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase.from('tool_audit_logs').insert({
    tool_name: auditLog.toolName,
    user_id: auditLog.userId,
    user_role: auditLog.userRole,
    organization_id: auditLog.organizationId || null,
    input: auditLog.input,
    output: auditLog.output,
    success: auditLog.success,
    error_code: auditLog.errorCode || null,
    error_message: auditLog.errorMessage || null,
    duration_ms: auditLog.durationMs,
    request_id: auditLog.requestId || null,
  });

  if (error) {
    console.error('Failed to log tool execution:', error);
    // Don't throw - audit logging failure shouldn't break tool execution
  }
}

/**
 * Get engagements for user (with RLS enforcement via application logic)
 */
export async function getUserEngagements(
  context: ToolContext
): Promise<Array<{ id: string; name: string; status: string }>> {
  const supabase = getSupabaseServiceClient();

  let query = supabase.from('engagements').select('id, name, status');

  // Apply RLS-equivalent filtering
  if (context.userRole === 'STAFF') {
    // Staff can only see engagements assigned to them or in their organization
    if (context.organizationId) {
      query = query.or(
        `assigned_staff_id.eq.${context.userId},organization_id.eq.${context.organizationId}`
      );
    } else {
      query = query.eq('assigned_staff_id', context.userId);
    }
  }
  // SYSTEM_ADMIN can see all (no filter)

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get user engagements:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if user has access to engagement
 */
export async function hasEngagementAccess(
  engagementId: string,
  context: ToolContext
): Promise<boolean> {
  // System admins have access to all
  if (context.userRole === 'SYSTEM_ADMIN') {
    return true;
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('engagements')
    .select('assigned_staff_id, organization_id')
    .eq('id', engagementId)
    .single();

  if (error || !data) {
    return false;
  }

  // Check if engagement is assigned to user
  if (data.assigned_staff_id === context.userId) {
    return true;
  }

  // Check if engagement is in user's organization
  if (context.organizationId && data.organization_id === context.organizationId) {
    return true;
  }

  return false;
}

/**
 * Get engagement by ID (with access check)
 */
export async function getEngagementById(
  engagementId: string,
  context: ToolContext
): Promise<{ id: string; [key: string]: unknown } | null> {
  const hasAccess = await hasEngagementAccess(engagementId, context);
  if (!hasAccess) {
    return null;
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('engagements')
    .select('*')
    .eq('id', engagementId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// Export the service client getter for use in tools
export { getSupabaseServiceClient };

