/**
 * Tool-Specific Widgets
 * 
 * Creates specialized widgets for tool outputs
 */

import type {
  Widget,
  CardWidget,
  TableWidget,
  ListWidget,
  ButtonWidget,
} from '@prisma/lib/openai/chatkit';

/**
 * Create engagement summary card widget
 */
export function createEngagementSummaryWidget(engagement: {
  id: string;
  name?: string;
  status: string;
  type?: string;
  period?: string;
  assignedStaffId?: string;
}): CardWidget {
  return {
    type: 'card',
    id: `engagement-${engagement.id}`,
    title: 'Engagement Summary',
    header: engagement.name || engagement.id,
    content: [
      {
        type: 'text',
        content: `**Status:** ${engagement.status}\n**Type:** ${engagement.type || 'N/A'}\n**Period:** ${engagement.period || 'N/A'}`,
        format: 'markdown',
      },
    ],
    actions: [
      {
        type: 'callback',
        callback: 'view_engagement',
        data: { engagementId: engagement.id },
      },
      {
        type: 'callback',
        callback: 'assign_engagement',
        data: { engagementId: engagement.id },
      },
    ],
  };
}

/**
 * Create task queue widget
 */
export function createTaskQueueWidget(tasks: Array<{
  id: string;
  title: string;
  status: string;
  priority?: string;
  dueDate?: string;
}>): TableWidget {
  return {
    type: 'table',
    id: 'task-queue',
    title: 'Task Queue',
    headers: ['Task', 'Status', 'Priority', 'Due Date'],
    rows: tasks.map((task) => [
      task.title,
      task.status,
      task.priority || 'N/A',
      task.dueDate || 'N/A',
    ]),
    actions: tasks.map((task) => [
      {
        type: 'callback' as const,
        callback: 'view_task',
        data: { taskId: task.id },
      },
    ]),
  };
}

/**
 * Create KPI summary card
 */
export function createKPICardWidget(kpis: {
  engagementStatus?: string;
  riskLevel?: string;
  missingDocsCount?: number;
  openTasksCount?: number;
}): CardWidget {
  const kpiItems = [];
  
  if (kpis.engagementStatus) {
    kpiItems.push({
      type: 'text' as const,
      content: `**Engagement Status:** ${kpis.engagementStatus}`,
      format: 'markdown' as const,
    });
  }
  
  if (kpis.riskLevel) {
    kpiItems.push({
      type: 'text' as const,
      content: `**Risk Level:** ${kpis.riskLevel}`,
      format: 'markdown' as const,
    });
  }
  
  if (kpis.missingDocsCount !== undefined) {
    kpiItems.push({
      type: 'text' as const,
      content: `**Missing Documents:** ${kpis.missingDocsCount}`,
      format: 'markdown' as const,
    });
  }
  
  if (kpis.openTasksCount !== undefined) {
    kpiItems.push({
      type: 'text' as const,
      content: `**Open Tasks:** ${kpis.openTasksCount}`,
      format: 'markdown' as const,
    });
  }

  return {
    type: 'card',
    id: 'kpi-summary',
    title: 'Summary',
    content: kpiItems,
  };
}

/**
 * Create approval widget (admin only)
 */
export function createApprovalWidget(
  itemId: string,
  itemType: string,
  itemTitle: string
): CardWidget {
  return {
    type: 'card',
    id: `approval-${itemId}`,
    title: 'Approval Required',
    header: itemTitle,
    content: [
      {
        type: 'text',
        content: `**Type:** ${itemType}\n\nThis item requires your approval.`,
        format: 'markdown',
      },
    ],
    actions: [
      {
        type: 'callback',
        callback: 'approve_item',
        data: { itemId, itemType },
      },
      {
        type: 'callback',
        callback: 'reject_item',
        data: { itemId, itemType },
      },
    ],
  };
}

/**
 * Create evidence request list widget
 */
export function createEvidenceRequestWidget(items: Array<{
  id: string;
  documentType: string;
  status: 'PENDING' | 'RECEIVED' | 'REVIEWED';
  dueDate?: string;
}>): ListWidget {
  return {
    type: 'list',
    id: 'evidence-request',
    title: 'Evidence Request',
    description: `${items.filter((i) => i.status === 'PENDING').length} pending`,
    items: items.map((item) => ({
      id: item.id,
      title: item.documentType,
      description: `Status: ${item.status}${item.dueDate ? ` · Due: ${item.dueDate}` : ''}`,
      actions: [
        {
          type: 'callback' as const,
          callback: 'mark_evidence_received',
          data: { itemId: item.id },
        },
        {
          type: 'callback' as const,
          callback: 'upload_evidence',
          data: { itemId: item.id, documentType: item.documentType },
        },
      ],
    })),
    layout: 'vertical',
  };
}

