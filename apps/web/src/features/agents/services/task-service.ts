import { getApiClient } from '@/src/lib/api-client';
import type { ApiClientInstance } from '@/src/lib/api-client';

export type AgentTask = {
  id: string;
  title: string;
  status: string;
  assignee?: string | null;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  updatedAt?: string | null;
};

export interface AgentTaskResult {
  tasks: AgentTask[];
  total: number;
  source: 'api' | 'stub';
}

const buildStubTasks = (orgSlug: string): AgentTaskResult => {
  const now = new Date();
  const makeDate = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();
  const stubTasks: AgentTask[] = [
    {
      id: `${orgSlug}-task-1`,
      title: 'Review planning analytics anomalies',
      status: 'IN_REVIEW',
      assignee: 'alex.rivera@demo.local',
      priority: 'high',
      dueDate: makeDate(1),
      updatedAt: now.toISOString(),
    },
    {
      id: `${orgSlug}-task-2`,
      title: 'Prepare walkthrough evidence for revenue controls',
      status: 'IN_PROGRESS',
      assignee: 'priya.patel@demo.local',
      priority: 'medium',
      dueDate: makeDate(3),
      updatedAt: now.toISOString(),
    },
    {
      id: `${orgSlug}-task-3`,
      title: 'Document IFRS 15 conclusions for iteration 4',
      status: 'READY_FOR_REVIEW',
      assignee: 'samira.ahmed@demo.local',
      priority: 'high',
      dueDate: makeDate(5),
      updatedAt: now.toISOString(),
    },
  ];
  return { tasks: stubTasks, total: stubTasks.length, source: 'stub' };
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `task-${Math.random().toString(36).slice(2, 10)}`;
};

const normaliseTask = (candidate: Record<string, unknown>): AgentTask => ({
  id: String(candidate.id ?? generateId()),
  title: typeof candidate.title === 'string' && candidate.title.length > 0 ? candidate.title : 'Untitled task',
  status: typeof candidate.status === 'string' && candidate.status.length > 0 ? candidate.status : 'UNKNOWN',
  assignee: typeof candidate.assignee === 'string' ? candidate.assignee : null,
  priority:
    candidate.priority === 'high' || candidate.priority === 'medium' || candidate.priority === 'low'
      ? candidate.priority
      : 'medium',
  dueDate: typeof candidate.dueDate === 'string' ? candidate.dueDate : null,
  updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
});

const extractTasks = (payload: unknown): AgentTaskResult | null => {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const rawTasks = Array.isArray(record.tasks)
    ? (record.tasks as unknown[])
    : Array.isArray(record.items)
    ? (record.items as unknown[])
    : Array.isArray(record.data)
    ? (record.data as unknown[])
    : null;
  if (!rawTasks) return null;
  const tasks = rawTasks.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object').map(normaliseTask);
  const total = typeof record.total === 'number' ? record.total : tasks.length;
  return { tasks, total, source: 'api' };
};

export const fetchAgentTasks = async (
  orgSlug: string,
  token?: string | null,
  clientFactory: (token?: string) => ApiClientInstance = getApiClient,
): Promise<AgentTaskResult> => {
  if (!orgSlug) {
    return buildStubTasks('demo');
  }

  const client = clientFactory(token ?? undefined);
  try {
    const response = await client.listTasks(orgSlug);
    const normalised = extractTasks(response);
    if (normalised) {
      return normalised;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Falling back to stubbed tasks', error);
    }
  }
  return buildStubTasks(orgSlug);
};
