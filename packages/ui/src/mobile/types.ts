/**
 * Mobile Types
 * 
 * Type definitions for mobile PWA components.
 */

// ============================================================================
// NAVIGATION
// ============================================================================

export interface NavItem {
    id: string;
    label: string;
    icon: string;
    route: string;
    badge?: number;
}

export interface MobileShellProps {
    children: React.ReactNode;
    currentRoute: string;
    navItems: NavItem[];
    onNavigate: (route: string) => void;
    title?: string;
    showBackButton?: boolean;
    onBack?: () => void;
    rightAction?: React.ReactNode;
}

// ============================================================================
// OFFLINE SYNC
// ============================================================================

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

export interface SyncItem {
    id: string;
    type: 'document' | 'checklist' | 'photo' | 'note' | 'form';
    name: string;
    status: SyncStatus;
    size?: number;
    timestamp: Date;
    retryCount?: number;
    error?: string;
}

export interface OfflineSyncState {
    isOnline: boolean;
    pendingItems: SyncItem[];
    lastSyncTime?: Date;
    totalPending: number;
    totalSize: number;
}

// ============================================================================
// CAMERA/DOCUMENT CAPTURE
// ============================================================================

export interface CapturedDocument {
    id: string;
    imageUri: string;
    thumbnailUri?: string;
    filename: string;
    capturedAt: Date;

    // Metadata
    documentType?: 'invoice' | 'receipt' | 'contract' | 'bank_statement' | 'other';
    engagementId?: string;
    workpaperId?: string;

    // Processing
    ocrText?: string;
    extractedData?: Record<string, unknown>;
    processingStatus?: 'pending' | 'processing' | 'complete' | 'failed';

    // Sync
    syncStatus: SyncStatus;
}

export interface DocumentCaptureProps {
    onCapture: (document: CapturedDocument) => void;
    engagementId?: string;
    maxPhotos?: number;
}

// ============================================================================
// VOICE NOTES
// ============================================================================

export interface VoiceNote {
    id: string;
    audioUri: string;
    duration: number;  // seconds
    recordedAt: Date;

    // Metadata
    engagementId?: string;
    workpaperId?: string;
    taskId?: string;

    // Transcription
    transcript?: string;
    transcriptionStatus?: 'pending' | 'processing' | 'complete' | 'failed';

    // Sync
    syncStatus: SyncStatus;
}

export interface VoiceRecorderProps {
    onRecordComplete: (note: VoiceNote) => void;
    maxDuration?: number;  // seconds
}

// ============================================================================
// CHECKLIST
// ============================================================================

export interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
    required: boolean;
    notes?: string;
    attachments?: string[];
    completedAt?: Date;
    completedBy?: string;
}

export interface Checklist {
    id: string;
    title: string;
    description?: string;
    items: ChecklistItem[];

    // Context
    engagementId: string;
    workpaperId?: string;

    // Progress
    progress: number;  // 0-100

    // Sync
    syncStatus: SyncStatus;
    lastModified: Date;
}

export interface ChecklistUIProps {
    checklist: Checklist;
    onItemToggle: (itemId: string, completed: boolean) => void;
    onItemNote: (itemId: string, note: string) => void;
    onItemAttach: (itemId: string) => void;
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

export interface QuickAction {
    id: string;
    label: string;
    icon: string;
    color?: string;
    action: () => void;
}

export interface QuickActionsMenuProps {
    actions: QuickAction[];
    isOpen: boolean;
    onToggle: () => void;
}
