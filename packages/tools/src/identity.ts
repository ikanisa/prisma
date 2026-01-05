/**
 * Identity & Access Tools
 * 
 * Tools for user identity and access management
 */

import type { ToolDefinition, ToolHandler, ToolContext, ToolResult } from './types';
import { UserRole } from './types';
import { getSupabaseServiceClient, getUserProfile } from './database';

/**
 * whoami - Get current user information
 */
export const whoamiDefinition: ToolDefinition = {
  name: 'whoami',
  description: 'Get current user information',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  idempotent: true,
};

export const whoami: ToolHandler = async (input, context) => {
  // Fetch full profile from database
  const profile = await getUserProfile(context.userId);
  
  if (!profile) {
    return {
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User profile not found',
      },
    };
  }

  return {
    success: true,
    data: {
      userId: profile.id,
      role: profile.role,
      organizationId: profile.organizationId,
    },
  };
};

/**
 * list_staff - List all staff members (admin only)
 */
export const listStaffDefinition: ToolDefinition = {
  name: 'list_staff',
  description: 'List all staff members in the organization',
  inputSchema: {
    type: 'object',
    properties: {
      organizationId: {
        type: 'string',
        description: 'Organization ID to list staff for',
      },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
        description: 'Filter by status',
      },
    },
    required: [],
  },
  requiredRole: UserRole.SYSTEM_ADMIN,
  idempotent: true,
};

export const listStaff: ToolHandler = async (input, context) => {
  const { organizationId: inputOrgId, status } = input;
  const orgId = inputOrgId || context.organizationId;

  if (!orgId) {
    return {
      success: false,
      error: {
        code: 'MISSING_ORGANIZATION_ID',
        message: 'Organization ID is required',
      },
    };
  }

  const supabase = getSupabaseServiceClient();

  let query = supabase
    .from('user_profiles')
    .select('id, email, full_name, role, status, job_title, department', { count: 'exact' })
    .eq('organization_id', orgId);

  // Apply status filter if provided
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Failed to list staff: ${error.message}`,
        details: error,
      },
    };
  }

  return {
    success: true,
    data: {
      staff: data || [],
      total: count || 0,
      organizationId: orgId,
      filters: { status },
    },
  };
};

/**
 * set_staff_role_permissions - Set staff role and permissions (admin only)
 */
export const setStaffRolePermissionsDefinition: ToolDefinition = {
  name: 'set_staff_role_permissions',
  description: 'Set staff role and permissions (admin only)',
  inputSchema: {
    type: 'object',
    properties: {
      staffId: {
        type: 'string',
        description: 'Staff member user ID',
      },
      role: {
        type: 'string',
        enum: ['SYSTEM_ADMIN', 'STAFF'],
        description: 'New role for the staff member',
      },
      permissions: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'List of permission strings (optional, role-based by default)',
      },
    },
    required: ['staffId', 'role'],
  },
  requiredRole: UserRole.SYSTEM_ADMIN,
  idempotent: false,
};

export const setStaffRolePermissions: ToolHandler = async (input, context) => {
  const { staffId, role, permissions } = input;

  if (!staffId || !role) {
    return {
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'staffId and role are required',
      },
    };
  }

  // Validate role
  if (role !== 'SYSTEM_ADMIN' && role !== 'STAFF') {
    return {
      success: false,
      error: {
        code: 'INVALID_ROLE',
        message: 'Role must be SYSTEM_ADMIN or STAFF',
      },
    };
  }

  // Prevent self-demotion
  if (staffId === context.userId && role !== UserRole.SYSTEM_ADMIN) {
    return {
      success: false,
      error: {
        code: 'SELF_DEMOTION_NOT_ALLOWED',
        message: 'Cannot demote yourself from SYSTEM_ADMIN',
      },
    };
  }

  const supabase = getSupabaseServiceClient();

  // Update user profile
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      role: role as UserRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', staffId)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Failed to update staff role: ${error.message}`,
        details: error,
      },
    };
  }

  // Note: permissions array is stored separately if needed
  // For now, permissions are role-based (SYSTEM_ADMIN has all, STAFF has limited)

  return {
    success: true,
    data: {
      staffId: data.id,
      role: data.role,
      permissions: permissions || [], // Stored for future use
      updatedBy: context.userId,
      updatedAt: data.updated_at,
    },
  };
};

