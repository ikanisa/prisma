/**
 * Widget Factory
 * 
 * Creates ChatKit widgets from tool results
 */

import type {
  Widget,
  ButtonWidget,
  CardWidget,
  TableWidget,
  ListWidget,
} from '@prisma/lib/openai/chatkit';
import type { ToolResult } from '@prisma/tools';

/**
 * Create widget from tool result
 */
export function createWidgetFromToolResult(
  toolName: string,
  result: ToolResult
): Widget[] {
  if (!result.success || !result.data) {
    return [];
  }

  const widgets: Widget[] = [];

  switch (toolName) {
    case 'list_engagements':
      return createEngagementsListWidget(result.data as any);
    
    case 'get_engagement':
      return createEngagementCardWidget(result.data as any);
    
    case 'list_staff':
      return createStaffListWidget(result.data as any);
    
    case 'search_knowledge_base':
      return createKnowledgeResultsWidget(result.data as any);
    
    case 'generate_request_for_documents':
      return createDocumentRequestWidget(result.data as any);
    
    default:
      // Generic widget for any tool result
      return createGenericCardWidget(toolName, result.data);
  }
}

/**
 * Create engagements list widget
 */
function createEngagementsListWidget(data: {
  engagements: Array<{
    id: string;
    name?: string;
    status?: string;
    type?: string;
  }>;
  total: number;
}): Widget[] {
  const items = data.engagements.map((eng) => ({
    id: eng.id,
    title: eng.name || eng.id,
    description: `${eng.type || 'Engagement'} · ${eng.status || 'Unknown'}`,
    actions: [
      {
        type: 'callback' as const,
        callback: 'view_engagement',
        data: { engagementId: eng.id },
      },
    ],
  }));

  const listWidget: ListWidget = {
    type: 'list',
    id: 'engagements-list',
    title: 'Engagements',
    description: `Found ${data.total} engagement(s)`,
    items,
    layout: 'vertical',
  };

  return [listWidget];
}

/**
 * Create engagement card widget
 */
function createEngagementCardWidget(data: Record<string, unknown>): Widget[] {
  const cardWidget: CardWidget = {
    type: 'card',
    id: 'engagement-card',
    title: 'Engagement Details',
    header: data.name as string || 'Engagement',
    content: [
      {
        type: 'text',
        content: `**Status:** ${data.status || 'Unknown'}\n**Type:** ${data.type || 'Unknown'}\n**Period:** ${data.period || 'N/A'}`,
        format: 'markdown',
      },
    ],
    actions: [
      {
        type: 'callback',
        callback: 'view_engagement',
        data: { engagementId: data.id },
      },
    ],
  };

  return [cardWidget];
}

/**
 * Create staff list widget
 */
function createStaffListWidget(data: {
  staff: Array<{
    id: string;
    email: string;
    full_name?: string;
    role: string;
  }>;
  total: number;
}): Widget[] {
  const tableWidget: TableWidget = {
    type: 'table',
    id: 'staff-table',
    title: 'Staff Members',
    description: `${data.total} staff member(s)`,
    headers: ['Name', 'Email', 'Role'],
    rows: data.staff.map((staff) => [
      staff.full_name || 'N/A',
      staff.email,
      staff.role,
    ]),
  };

  return [tableWidget];
}

/**
 * Create knowledge results widget
 */
function createKnowledgeResultsWidget(data: {
  results: Array<{
    id: string;
    title: string;
    content?: string;
    category?: string;
  }>;
  total: number;
}): Widget[] {
  const items = data.results.map((result) => ({
    id: result.id,
    title: result.title,
    description: result.content?.substring(0, 200) || '',
    metadata: {
      category: result.category,
    },
  }));

  const listWidget: ListWidget = {
    type: 'list',
    id: 'knowledge-results',
    title: 'Knowledge Base Results',
    description: `Found ${data.total} result(s)`,
    items,
    layout: 'vertical',
  };

  return [listWidget];
}

/**
 * Create document request widget
 */
function createDocumentRequestWidget(data: {
  checklist: Array<{
    id: string;
    documentType: string;
    status: string;
  }>;
  engagementId: string;
}): Widget[] {
  const items = data.checklist.map((item) => ({
    id: item.id,
    title: item.documentType,
    description: `Status: ${item.status}`,
    actions: [
      {
        type: 'callback' as const,
        callback: 'mark_document_received',
        data: { itemId: item.id },
      },
    ],
  }));

  const listWidget: ListWidget = {
    type: 'list',
    id: 'document-request-checklist',
    title: 'Document Request Checklist',
    description: `${data.checklist.length} document(s) requested`,
    items,
    layout: 'vertical',
  };

  return [listWidget];
}

/**
 * Create generic card widget for any tool result
 */
function createGenericCardWidget(toolName: string, data: unknown): Widget[] {
  const cardWidget: CardWidget = {
    type: 'card',
    id: `tool-result-${toolName}`,
    title: `Tool Result: ${toolName}`,
    content: [
      {
        type: 'text',
        content: JSON.stringify(data, null, 2),
        format: 'plain',
      },
    ],
  };

  return [cardWidget];
}

/**
 * Create action button widget
 */
export function createActionButton(
  label: string,
  callback: string,
  data?: Record<string, unknown>,
  variant: 'primary' | 'secondary' | 'danger' | 'outline' = 'primary'
): ButtonWidget {
  return {
    type: 'button',
    id: `btn_${callback}_${Date.now()}`,
    label,
    variant,
    actions: [
      {
        type: 'callback',
        callback,
        data: data || {},
      },
    ],
  };
}

