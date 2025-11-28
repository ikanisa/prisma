import { authorizedFetch } from '@/lib/api';

export interface AutonomyJobAllowance {
  kind: string;
  label: string;
}

export interface AutonomyAlert {
  id: string;
  type?: string;
  severity?: string;
  message?: string;
  createdAt?: string;
}

export interface AutonomyApproval {
  id: string;
  action?: string;
  entityType?: string;
  requestedBy?: string;
  createdAt?: string;
}

export interface AutonomySuggestion {
  workflow?: string;
  label?: string;
  description?: string;
  step?: number;
  minimumAutonomy?: string;
  newRun?: boolean;
}

export interface AutonomyStatus {
  autonomy: {
    level: string;
    description: string;
    floor: string;
    ceiling: string;
    allowedJobs: AutonomyJobAllowance[];
  };
  evidence: {
    open: number;
    alerts: AutonomyAlert[];
  };
  approvals: {
    pending: number;
    items: AutonomyApproval[];
  };
  suggestions: AutonomySuggestion[];
  autopilot: Record<string, unknown>;
}

export async function fetchAutonomyStatus(orgSlug: string): Promise<AutonomyStatus> {
  const response = await authorizedFetch(`/v1/autonomy/status?orgSlug=${encodeURIComponent(orgSlug)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.detail ?? 'Failed to load autonomy status');
  }
  return payload as AutonomyStatus;
}
