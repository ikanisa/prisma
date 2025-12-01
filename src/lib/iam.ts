import { authorizedFetch } from '@/lib/api';
import type { OrgRole } from '@/hooks/use-organizations';

export interface IamUserProfile {
  display_name: string;
  email: string;
  locale?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
  phone_e164?: string | null;
  whatsapp_e164?: string | null;
}

export interface IamMember {
  id: string;
  user_id: string;
  role: OrgRole;
  invited_by?: string | null;
  created_at?: string;
  updated_at?: string;
  user_profile?: IamUserProfile;
}

export interface IamInvite {
  id: string;
  email_or_phone: string;
  role: OrgRole;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expires_at: string;
  created_at: string;
}

export interface IamTeamMembership {
  user_id: string;
  role: 'LEAD' | 'MEMBER' | 'VIEWER';
  created_at?: string;
}

export interface IamTeam {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  team_members?: IamTeamMembership[];
}

export interface IamDirectory {
  orgId: string;
  actorRole: OrgRole;
  members: IamMember[];
  invites: IamInvite[];
  teams: IamTeam[];
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as { error?: string }).error ?? 'IAM request failed';
    throw new Error(message);
  }
  return data as T;
}

export async function fetchIamDirectory(orgId: string): Promise<IamDirectory> {
  const response = await authorizedFetch(`/api/iam/members/list?orgId=${encodeURIComponent(orgId)}`);
  return parseResponse<IamDirectory>(response);
}

export async function inviteMember(payload: { orgId: string; emailOrPhone: string; role: OrgRole }): Promise<{ inviteId: string; token: string; expiresAt: string; role: OrgRole }>
{
  const response = await authorizedFetch('/api/iam/members/invite', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function revokeInvite(orgId: string, inviteId: string): Promise<void> {
  const response = await authorizedFetch('/api/iam/members/revoke-invite', {
    method: 'POST',
    body: JSON.stringify({ orgId, inviteId }),
  });
  await parseResponse(response);
}

export async function updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<void> {
  const response = await authorizedFetch('/api/iam/members/update-role', {
    method: 'POST',
    body: JSON.stringify({ orgId, userId, role }),
  });
  await parseResponse(response);
}

export async function createTeam(payload: { orgId: string; name: string; description?: string | null }): Promise<IamTeam> {
  const response = await authorizedFetch('/api/iam/teams/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<{ team: IamTeam }>(response);
  return data.team;
}

export async function addTeamMember(payload: { orgId: string; teamId: string; userId: string; role?: string }): Promise<void> {
  const response = await authorizedFetch('/api/iam/teams/add-member', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await parseResponse(response);
}

export async function removeTeamMember(payload: { orgId: string; teamId: string; userId: string }): Promise<void> {
  const response = await authorizedFetch('/api/iam/teams/remove-member', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await parseResponse(response);
}

export interface UpdateProfilePayload {
  displayName?: string;
  phoneE164?: string | null;
  whatsappE164?: string | null;
  avatarUrl?: string | null;
  locale?: string | null;
  timezone?: string | null;
  orgId?: string;
  theme?: 'SYSTEM' | 'LIGHT' | 'DARK';
  notifications?: Record<string, any>;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<void> {
  const response = await authorizedFetch('/api/iam/profile/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await parseResponse(response);
}
