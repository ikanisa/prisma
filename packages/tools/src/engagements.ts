/**
 * Case / Engagement Management Tools
 * 
 * Tools for managing audit/tax engagements
 */

import type { ToolDefinition, ToolHandler, ToolContext, ToolResult } from './types';
import { getSupabaseServiceClient, hasEngagementAccess, getEngagementById } from './database';

/**
 * create_engagement - Create a new engagement
 */
export const createEngagementDefinition: ToolDefinition = {
  name: 'create_engagement',
  description: 'Create a new audit or tax engagement',
  inputSchema: {
    type: 'object',
    properties: {
      clientId: {
        type: 'string',
        description: 'Client ID for the engagement',
      },
      type: {
        type: 'string',
        enum: ['AUDIT', 'TAX', 'REVIEW', 'COMPILATION'],
        description: 'Type of engagement',
      },
      period: {
        type: 'string',
        description: 'Period covered (e.g., "2024-01-01 to 2024-12-31")',
      },
      scope: {
        type: 'string',
        description: 'Scope of the engagement',
      },
      assignedStaffId: {
        type: 'string',
        description: 'Staff member to assign the engagement to',
      },
    },
    required: ['clientId', 'type', 'period'],
  },
  idempotent: false,
};

export const createEngagement: ToolHandler = async (input, context) => {
  const { clientId, type, period, scope, assignedStaffId } = input;

  if (!clientId || !type || !period) {
    return {
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'clientId, type, and period are required',
      },
    };
  }

  const supabase = getSupabaseServiceClient();

  // Create engagement in database
  const { data, error } = await supabase
    .from('engagements')
    .insert({
      client_id: clientId,
      type,
      period,
      scope: scope || null,
      assigned_staff_id: assignedStaffId || context.userId,
      status: 'DRAFT',
      organization_id: context.organizationId || null,
      created_by: context.userId,
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Failed to create engagement: ${error.message}`,
        details: error,
      },
    };
  }

  return {
    success: true,
    data: {
      engagementId: data.id,
      clientId: data.client_id,
      type: data.type,
      period: data.period,
      scope: data.scope,
      assignedStaffId: data.assigned_staff_id,
      status: data.status,
      createdAt: data.created_at,
    },
  };
};

/**
 * get_engagement - Get engagement details
 */
export const getEngagementDefinition: ToolDefinition = {
  name: 'get_engagement',
  description: 'Get details of a specific engagement',
  inputSchema: {
    type: 'object',
    properties: {
      engagementId: {
        type: 'string',
        description: 'Engagement ID',
      },
    },
    required: ['engagementId'],
  },
  idempotent: true,
};

export const getEngagement: ToolHandler = async (input, context) => {
  const { engagementId } = input;

  if (!engagementId) {
    return {
      success: false,
      error: {
        code: 'MISSING_ENGAGEMENT_ID',
        message: 'engagementId is required',
      },
    };
  }

  // Check access first
  const hasAccess = await hasEngagementAccess(engagementId, context);
  if (!hasAccess) {
    return {
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'You do not have access to this engagement',
      },
    };
  }

  // Fetch engagement
  const engagement = await getEngagementById(engagementId, context);
  if (!engagement) {
    return {
      success: false,
      error: {
        code: 'ENGAGEMENT_NOT_FOUND',
        message: 'Engagement not found',
      },
    };
  }

  return {
    success: true,
    data: engagement,
  };
};

/**
 * list_engagements - List engagements with filters
 */
export const listEngagementsDefinition: ToolDefinition = {
  name: 'list_engagements',
  description: 'List engagements with optional filters',
  inputSchema: {
    type: 'object',
    properties: {
      clientId: {
        type: 'string',
        description: 'Filter by client ID',
      },
      type: {
        type: 'string',
        enum: ['AUDIT', 'TAX', 'REVIEW', 'COMPILATION'],
        description: 'Filter by engagement type',
      },
      status: {
        type: 'string',
        enum: ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'],
        description: 'Filter by status',
      },
      assignedStaffId: {
        type: 'string',
        description: 'Filter by assigned staff member',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results',
        default: 50,
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination',
        default: 0,
      },
    },
    required: [],
  },
  idempotent: true,
};

export const listEngagements: ToolHandler = async (input, context) => {
  const { clientId, type, status, assignedStaffId, limit = 50, offset = 0 } = input;

  const supabase = getSupabaseServiceClient();

  let query = supabase.from('engagements').select('*', { count: 'exact' });

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

  // Apply filters
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  if (type) {
    query = query.eq('type', type);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (assignedStaffId) {
    query = query.eq('assigned_staff_id', assignedStaffId);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Failed to list engagements: ${error.message}`,
        details: error,
      },
    };
  }

  return {
    success: true,
    data: {
      engagements: data || [],
      total: count || 0,
      limit,
      offset,
      filters: input,
    },
  };
};

/**
 * add_engagement_note - Add a note to an engagement
 */
export const addEngagementNoteDefinition: ToolDefinition = {
  name: 'add_engagement_note',
  description: 'Add a note to an engagement',
  inputSchema: {
    type: 'object',
    properties: {
      engagementId: {
        type: 'string',
        description: 'Engagement ID',
      },
      note: {
        type: 'string',
        description: 'Note content',
      },
      noteType: {
        type: 'string',
        enum: ['GENERAL', 'ISSUE', 'RESOLUTION', 'DECISION'],
        description: 'Type of note',
        default: 'GENERAL',
      },
    },
    required: ['engagementId', 'note'],
  },
  idempotent: false,
};

export const addEngagementNote: ToolHandler = async (input, context) => {
  const { engagementId, note, noteType = 'GENERAL' } = input;

  if (!engagementId || !note) {
    return {
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'engagementId and note are required',
      },
    };
  }

  // Check access
  const hasAccess = await hasEngagementAccess(engagementId, context);
  if (!hasAccess) {
    return {
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'You do not have access to this engagement',
      },
    };
  }

  const supabase = getSupabaseServiceClient();

  // Check if engagement_notes table exists, otherwise use a generic notes table
  // For now, we'll try engagement_notes first
  const { data, error } = await supabase
    .from('engagement_notes')
    .insert({
      engagement_id: engagementId,
      note,
      note_type: noteType,
      created_by: context.userId,
    })
    .select()
    .single();

  if (error) {
    // If table doesn't exist, we could create a generic notes entry
    // For now, return error
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Failed to add note: ${error.message}`,
        details: error,
      },
    };
  }

  return {
    success: true,
    data: {
      noteId: data.id,
      engagementId: data.engagement_id,
      note: data.note,
      noteType: data.note_type,
      createdBy: data.created_by,
      createdAt: data.created_at,
    },
  };
};

/**
 * assign_engagement - Assign engagement to staff member
 */
export const assignEngagementDefinition: ToolDefinition = {
  name: 'assign_engagement',
  description: 'Assign an engagement to a staff member',
  inputSchema: {
    type: 'object',
    properties: {
      engagementId: {
        type: 'string',
        description: 'Engagement ID',
      },
      staffId: {
        type: 'string',
        description: 'Staff member user ID to assign to',
      },
    },
    required: ['engagementId', 'staffId'],
  },
  idempotent: false,
};

export const assignEngagement: ToolHandler = async (input, context) => {
  const { engagementId, staffId } = input;

  if (!engagementId || !staffId) {
    return {
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'engagementId and staffId are required',
      },
    };
  }

  // Check access - only SYSTEM_ADMIN or current assignee can reassign
  const engagement = await getEngagementById(engagementId, context);
  if (!engagement) {
    return {
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'You do not have access to this engagement',
      },
    };
  }

  // Check if user can assign (SYSTEM_ADMIN or current assignee)
  const canAssign =
    context.userRole === 'SYSTEM_ADMIN' ||
    engagement.assigned_staff_id === context.userId;

  if (!canAssign) {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to assign this engagement',
      },
    };
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('engagements')
    .update({
      assigned_staff_id: staffId,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', engagementId)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Failed to assign engagement: ${error.message}`,
        details: error,
      },
    };
  }

  return {
    success: true,
    data: {
      engagementId: data.id,
      assignedStaffId: data.assigned_staff_id,
      assignedBy: context.userId,
      assignedAt: data.updated_at,
    },
  };
};

