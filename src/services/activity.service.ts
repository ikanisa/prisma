import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type ActivityType = 'create' | 'update' | 'delete' | 'login' | 'export';
export type ActivityEntity = 'client' | 'engagement' | 'task' | 'document' | 'user' | 'system';

export interface ActivityRecord {
  id: string;
  orgId: string | null;
  type: ActivityType;
  entity: ActivityEntity;
  action: string;
  details: string;
  userId: string | null;
  actorName?: string | null;
  createdAt: string;
  metadata?: Record<string, any> | null;
}

type ActivityRow = Database['public']['Tables']['activity_log']['Row'];

const friendlyId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

const mapActivityRow = (row: ActivityRow): ActivityRecord => {
  const metadata = (row as any)?.metadata ?? {};
  return {
    id: row?.id ?? friendlyId(),
    orgId: (row as any)?.org_id ?? null,
    type: (metadata.type as ActivityType) ?? 'update',
    entity: (row?.entity_type as ActivityEntity) ?? 'system',
    action: row?.action ?? 'Activity logged',
    details: (metadata.details as string) ?? '',
    userId: (row as any)?.user_id ?? null,
    actorName: metadata.actor_name ?? null,
    createdAt: row?.created_at ?? new Date().toISOString(),
    metadata,
  };
};

const MOCK_ACTIVITIES: ActivityRecord[] = [
  {
    id: '1',
    orgId: 'mock-org',
    type: 'create',
    entity: 'client',
    action: 'Created new client',
    details: 'Added TechCorp Solutions to client database',
    userId: '1',
    actorName: 'Sophia Systems',
    createdAt: '2024-01-15T14:30:00Z',
    metadata: { clientName: 'TechCorp Solutions' },
  },
  {
    id: '2',
    orgId: 'mock-org',
    type: 'update',
    entity: 'task',
    action: 'Updated task status',
    details: 'Changed "Review Q4 Reports" from In Progress to Completed',
    userId: '2',
    actorName: 'Mark Manager',
    createdAt: '2024-01-15T13:45:00Z',
    metadata: { taskId: 'task-123', oldStatus: 'IN_PROGRESS', newStatus: 'COMPLETED' },
  },
  {
    id: '3',
    orgId: 'mock-org',
    type: 'create',
    entity: 'document',
    action: 'Uploaded document',
    details: 'Added Annual_Compliance_Report_2024.pdf',
    userId: '1',
    actorName: 'Sophia Systems',
    createdAt: '2024-01-15T12:20:00Z',
    metadata: { fileName: 'Annual_Compliance_Report_2024.pdf', fileSize: '2.5MB' },
  },
  {
    id: '4',
    orgId: 'mock-org',
    type: 'login',
    entity: 'user',
    action: 'User login',
    details: 'Successful login from Chrome browser',
    userId: '3',
    actorName: 'Eli Employee',
    createdAt: '2024-01-15T11:15:00Z',
    metadata: { browser: 'Chrome', ip: '192.168.1.100' },
  },
  {
    id: '5',
    orgId: 'mock-org',
    type: 'update',
    entity: 'engagement',
    action: 'Updated engagement',
    details: 'Modified Project Alpha timeline and budget',
    userId: '2',
    actorName: 'Mark Manager',
    createdAt: '2024-01-15T10:30:00Z',
    metadata: { engagementName: 'Project Alpha' },
  },
  {
    id: '6',
    orgId: 'mock-org',
    type: 'delete',
    entity: 'task',
    action: 'Deleted task',
    details: 'Removed obsolete task "Legacy System Review"',
    userId: '1',
    actorName: 'Sophia Systems',
    createdAt: '2024-01-15T09:45:00Z',
    metadata: { taskName: 'Legacy System Review' },
  },
  {
    id: '7',
    orgId: 'mock-org',
    type: 'export',
    entity: 'system',
    action: 'Data export',
    details: 'Exported client data for Q4 reporting',
    userId: '2',
    actorName: 'Mark Manager',
    createdAt: '2024-01-14T16:20:00Z',
    metadata: { exportType: 'clients', recordCount: 45 },
  },
];

export async function getActivityLogs(orgId?: string | null): Promise<ActivityRecord[]> {
  if (!isSupabaseConfigured) {
    return MOCK_ACTIVITIES;
  }

  if (!orgId) {
    throw new Error('Organization is required to fetch activity logs.');
  }

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapActivityRow);
}

export { MOCK_ACTIVITIES };
