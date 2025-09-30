import { authorizedFetch } from '@/lib/api';
import type { OrgRole } from '@/hooks/use-organizations';

export interface AdminOrgSettings {
  allowedEmailDomains: string[];
  defaultRole: OrgRole;
  requireMfaForSensitive: boolean;
  impersonationBreakglassEmails: string[];
}

export async function fetchOrgSettings(orgId: string): Promise<AdminOrgSettings> {
  const response = await authorizedFetch(`/api/admin/org/settings?orgId=${encodeURIComponent(orgId)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to load settings');
  }
  return payload.settings as AdminOrgSettings;
}

export async function updateOrgSettings(orgId: string, body: Partial<AdminOrgSettings>): Promise<AdminOrgSettings> {
  const response = await authorizedFetch('/api/admin/org/settings', {
    method: 'POST',
    body: JSON.stringify({ orgId, ...body }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to update settings');
  }
  return payload.settings as AdminOrgSettings;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  module?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  user_id?: string | null;
  created_at: string;
}

export async function fetchAuditLog(orgId: string, opts: { limit?: number; after?: string; module?: string } = {}): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams({ orgId });
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.after) params.set('after', opts.after);
  if (opts.module) params.set('module', opts.module);
  const response = await authorizedFetch(`/api/admin/auditlog/list?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to load audit log');
  }
  return (payload.entries ?? []) as AuditLogEntry[];
}

export interface ImpersonationGrant {
  id: string;
  org_id: string;
  granted_by_user_id: string;
  target_user_id: string;
  approved_by_user_id?: string | null;
  reason?: string | null;
  expires_at?: string | null;
  active: boolean;
  created_at: string;
}

export async function listImpersonationGrants(orgId: string): Promise<ImpersonationGrant[]> {
  const response = await authorizedFetch(`/api/admin/impersonation/list?orgId=${encodeURIComponent(orgId)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to load impersonation grants');
  }
  return (payload.grants ?? []) as ImpersonationGrant[];
}

export async function requestImpersonation(body: { orgId: string; targetUserId: string; reason?: string; expiresAt?: string | null }) {
  const response = await authorizedFetch('/api/admin/impersonation/request', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to request impersonation');
  }
  return payload.grant as ImpersonationGrant;
}

export async function approveImpersonation(body: { orgId: string; grantId: string; expiresAt?: string | null }) {
  const response = await authorizedFetch('/api/admin/impersonation/approve', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to approve impersonation');
  }
  return payload;
}

export async function revokeImpersonation(body: { orgId: string; grantId: string }) {
  const response = await authorizedFetch('/api/admin/impersonation/revoke', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to revoke impersonation');
  }
  return payload;
}
