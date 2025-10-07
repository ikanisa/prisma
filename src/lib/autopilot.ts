import { authorizedFetch } from '@/lib/api';

export interface AutopilotSchedule {
  id: string;
  org_id: string;
  kind: string;
  cron_expression: string;
  active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface AutopilotJob {
  id: string;
  org_id: string;
  kind: string;
  payload: Record<string, unknown>;
  status: string;
  scheduled_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  attempts: number;
  created_at: string;
}

export async function fetchSchedules(orgSlug: string): Promise<AutopilotSchedule[]> {
  const response = await authorizedFetch(`/v1/autopilot/schedules?orgSlug=${encodeURIComponent(orgSlug)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.detail ?? 'Unable to load autopilot schedules');
  }
  return payload.schedules as AutopilotSchedule[];
}

export async function createSchedule(params: {
  orgSlug: string;
  kind: string;
  cronExpression: string;
  active: boolean;
  metadata: Record<string, unknown>;
}): Promise<AutopilotSchedule> {
  const response = await authorizedFetch('/v1/autopilot/schedules', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.detail ?? 'Unable to create schedule');
  }
  return payload.schedule as AutopilotSchedule;
}

export async function fetchJobs(orgSlug: string, status?: string): Promise<AutopilotJob[]> {
  const query = new URLSearchParams({ orgSlug });
  if (status) query.set('status', status);
  const response = await authorizedFetch(`/v1/autopilot/jobs?${query.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.detail ?? 'Unable to load autopilot jobs');
  }
  return payload.jobs as AutopilotJob[];
}

export async function enqueueJob(params: {
  orgSlug: string;
  kind: string;
  payload: Record<string, unknown>;
}): Promise<AutopilotJob> {
  const response = await authorizedFetch('/v1/autopilot/jobs/run', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.detail ?? 'Unable to queue job');
  }
  return payload.job as AutopilotJob;
}
