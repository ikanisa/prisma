import type { RequestHandler } from 'express';
import { bindOrgContext } from '../utils/request-context';

const DEFAULT_ROLE_HIERARCHY = ['STAFF', 'MANAGER', 'PARTNER', 'SYSTEM_ADMIN'];

export type OrgGuardOptions = {
  minimumRole?: string;
  roleHierarchy?: string[];
};

export type OrgContext = {
  orgId: string;
  userId: string;
  role: string;
};

function parseMembershipHeader(headerValue: string | string[] | undefined): Record<string, string> {
  if (!headerValue) return {};
  const raw = Array.isArray(headerValue) ? headerValue.join(',') : headerValue;
  const entries = raw.split(/[;,]/).map((entry) => entry.trim()).filter(Boolean);
  const result: Record<string, string> = {};
  for (const entry of entries) {
    const [orgId, role] = entry.split(':', 2).map((part) => part.trim());
    if (orgId && role) {
      result[orgId] = role.toUpperCase();
    }
  }
  return result;
}

function resolveOrgId(req: any): string | null {
  const headerOrg = (req.headers['x-org-id'] as string | undefined)?.trim();
  if (headerOrg) return headerOrg;
  const paramOrg = (req.params?.orgId ?? req.params?.orgSlug ?? req.params?.org) as string | undefined;
  if (paramOrg) return paramOrg;
  if (req.body && typeof req.body === 'object') {
    const bodyOrg = (req.body.orgId ?? req.body.orgSlug) as string | undefined;
    if (bodyOrg) return String(bodyOrg);
  }
  return null;
}

function getUserId(req: any): string | null {
  const header = (req.headers['x-user-id'] as string | undefined)?.trim();
  if (header) return header;
  if (req.user?.id) return String(req.user.id);
  if (req.auth?.userId) return String(req.auth.userId);
  return null;
}

function hasRequiredRole(role: string, minimumRole: string | undefined, hierarchy: string[]): boolean {
  if (!minimumRole) return true;
  const normalised = role.toUpperCase();
  const target = minimumRole.toUpperCase();
  const index = hierarchy.indexOf(normalised);
  const minIndex = hierarchy.indexOf(target);
  if (index === -1 || minIndex === -1) {
    return normalised === target;
  }
  return index >= minIndex;
}

declare module 'express-serve-static-core' {
  interface Response {
    locals: {
      org?: OrgContext;
      [key: string]: unknown;
    };
  }
}

export function createOrgGuard(options: OrgGuardOptions = {}): RequestHandler {
  const hierarchy = options.roleHierarchy ?? DEFAULT_ROLE_HIERARCHY;
  return (req, res, next) => {
    const orgId = resolveOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'org_id_missing' });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'user_not_authenticated' });
    }

    const memberships = parseMembershipHeader(req.headers['x-org-memberships']);
    const role = memberships[orgId];
    if (!role) {
      return res.status(403).json({ error: 'org_access_denied' });
    }
    if (!hasRequiredRole(role, options.minimumRole, hierarchy)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    const context: OrgContext = { orgId, userId, role };
    res.locals.org = context;
    bindOrgContext(orgId, userId);
    next();
  };
}
