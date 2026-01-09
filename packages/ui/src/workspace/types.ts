/**
 * Workspace Types
 * 
 * Type definitions for engagement workspace components.
 */

// ============================================================================
// TASK TYPES
// ============================================================================

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkspaceTask {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;

    // Assignment
    assigneeId?: string;
    assigneeName?: string;

    // References
    engagementId: string;
    workpaperId?: string;
    accountId?: string;

    // Dates
    dueDate?: Date;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;

    // Metadata
    tags?: string[];
    estimatedHours?: number;
    actualHours?: number;

    // Dependencies
    blockedBy?: string[];
    blocks?: string[];

    // Comments
    commentCount?: number;
    attachmentCount?: number;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export type DocumentType =
    | 'workpaper'
    | 'source_document'
    | 'confirmation'
    | 'report'
    | 'memo'
    | 'correspondence'
    | 'other';

export interface WorkspaceDocument {
    id: string;
    name: string;
    type: DocumentType;
    path: string;

    // File info
    mimeType: string;
    fileSize: number;

    // Status
    status: 'draft' | 'review' | 'approved' | 'final';
    version: number;

    // References
    engagementId: string;
    ref?: string;  // Workpaper reference

    // Audit trail
    createdBy: string;
    createdAt: Date;
    updatedBy: string;
    updatedAt: Date;

    // Preview
    thumbnailUrl?: string;
    previewUrl?: string;
}

// ============================================================================
// WORKPAPER TREE
// ============================================================================

export interface WorkpaperNode {
    id: string;
    name: string;
    type: 'folder' | 'workpaper';
    ref?: string;  // e.g., 'A-1', 'B-2'

    // Folder specific
    children?: WorkpaperNode[];

    // Workpaper specific
    documentId?: string;
    status?: 'not_started' | 'in_progress' | 'review' | 'completed';
    assignee?: string;

    // Counts (for folders)
    totalWorkpapers?: number;
    completedWorkpapers?: number;
}

// ============================================================================
// ACTIVITY FEED
// ============================================================================

export type ActivityType =
    | 'task_created'
    | 'task_completed'
    | 'task_assigned'
    | 'document_uploaded'
    | 'document_approved'
    | 'workpaper_reviewed'
    | 'comment_added'
    | 'issue_raised'
    | 'issue_resolved'
    | 'team_joined'
    | 'deadline_updated';

export interface ActivityItem {
    id: string;
    type: ActivityType;
    message: string;

    // Actor
    userId: string;
    userName: string;
    userAvatar?: string;

    // Target
    targetType?: 'task' | 'document' | 'workpaper' | 'issue';
    targetId?: string;
    targetName?: string;

    timestamp: Date;

    // Optional details
    details?: Record<string, unknown>;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface TaskBoardProps {
    tasks: WorkspaceTask[];
    columns?: TaskStatus[];
    onTaskClick?: (task: WorkspaceTask) => void;
    onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
    onTaskCreate?: (status: TaskStatus) => void;
}

export interface DocumentViewerProps {
    document: WorkspaceDocument | null;
    onClose?: () => void;
    onApprove?: (documentId: string) => void;
    onReject?: (documentId: string, reason: string) => void;
}

export interface WorkpaperTreeProps {
    nodes: WorkpaperNode[];
    selectedId?: string;
    onNodeSelect?: (node: WorkpaperNode) => void;
    onNodeExpand?: (nodeId: string, expanded: boolean) => void;
}

export interface ActivityFeedProps {
    activities: ActivityItem[];
    maxItems?: number;
    onActivityClick?: (activity: ActivityItem) => void;
}
