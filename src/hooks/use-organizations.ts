import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { createTenantClient, TenantClient } from '@/lib/tenant-client';
import { useAppStore, mockMemberships } from '@/stores/mock-data';
import { recordClientEvent, recordClientError } from '@/lib/client-events';
import { getDefaultAutonomyLevel } from '@/lib/system-config';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  brand_primary: string;
  brand_secondary: string;
  created_at: string;
  autonomy_level?: string;
}

export type OrgRole =
  | 'SERVICE_ACCOUNT'
  | 'READONLY'
  | 'CLIENT'
  | 'EMPLOYEE'
  | 'MANAGER'
  | 'EQR'
  | 'PARTNER'
  | 'SYSTEM_ADMIN';

export interface Membership {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  autonomy_floor?: string;
  autonomy_ceiling?: string;
  is_service_account?: boolean;
  client_portal_allowed_repos?: string[];
  client_portal_denied_actions?: string[];
  organization: Organization;
}

export function useOrganizations() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const currentOrg = memberships.find((m) => m.org_id === currentOrgId)?.organization || null;
  const currentMembership = memberships.find((m) => m.org_id === currentOrgId) || null;
  const currentRole = currentMembership?.role ?? null;
  const tenantClient = useMemo<TenantClient | null>(() => {
    if (!currentOrg) return null;
    return createTenantClient(currentOrg.id);
  }, [currentOrg]);

  const hasFetched = useRef(false);

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      recordClientEvent({ name: 'organizations:skipFetchNoUser' });
      return;
    }
    if (!isSupabaseConfigured) {
      return;
    }

    if (hasFetched.current) {
      recordClientEvent({ name: 'organizations:skipFetchAlreadyFetched' });
      return;
    }

    recordClientEvent({ name: 'organizations:fetchRequested' });
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(
          `
          *,
          organization:organizations(*)
        `,
        )
        .eq('user_id', user.id);

      if (error) throw error;

      recordClientEvent({ name: 'organizations:fetched', data: { count: data?.length ?? 0 } });
      setMemberships(data || []);
      hasFetched.current = true;
    } catch (error) {
      recordClientError({ name: 'organizations:fetchError', error });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    hasFetched.current = false;
  }, [user?.id, isSupabaseConfigured]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Demo mode: hydrate from mock data and match the demo user
      const appStore = useAppStore.getState();
      const orgMap = new Map(appStore.organizations.map((org) => [org.id, org]));
      const targetUserId = '1';

      const defaultAutonomy = getDefaultAutonomyLevel();

      let normalized = mockMemberships
        .filter((membership) => membership.userId === targetUserId)
        .map((membership) => {
          const org = orgMap.get(membership.orgId) ?? {
            id: membership.orgId,
            name: 'Prisma Glow',
            slug: 'prisma-glow',
            brandPrimary: '#2563eb',
            brandSecondary: '#7c3aed',
            createdAt: new Date().toISOString(),
          };
          return {
            id: membership.id,
            org_id: membership.orgId,
            user_id: membership.userId,
            role: membership.role as Membership['role'],
            organization: {
              id: org.id,
              name: org.name,
              slug: org.slug,
              brand_primary: org.brandPrimary,
              brand_secondary: org.brandSecondary,
              created_at: org.createdAt,
              autonomy_level: defaultAutonomy,
            },
          } satisfies Membership;
        });

      if (normalized.length === 0 && mockMemberships.length > 0) {
        normalized = mockMemberships.slice(0, 1).map((membership) => {
          const org = orgMap.get(membership.orgId) ?? {
            id: membership.orgId,
            name: 'Prisma Glow',
            slug: 'prisma-glow',
            brandPrimary: '#2563eb',
            brandSecondary: '#7c3aed',
            createdAt: new Date().toISOString(),
          };
          return {
            id: membership.id,
            org_id: membership.orgId,
            user_id: membership.userId,
            role: membership.role as Membership['role'],
            organization: {
              id: org.id,
              name: org.name,
              slug: org.slug,
              brand_primary: org.brandPrimary,
              brand_secondary: org.brandSecondary,
              created_at: org.createdAt,
              autonomy_level: defaultAutonomy,
            },
          } satisfies Membership;
        });
      }

      setMemberships(normalized);
      setLoading(false);
      if (normalized.length > 0) {
        setCurrentOrgId((prev) => prev ?? normalized[0].org_id);
      }
      return;
    }

    if (user) {
      void fetchMemberships();
    } else {
      setMemberships([]);
      setCurrentOrgId(null);
      setLoading(false);
    }
  }, [user, fetchMemberships]);

  useEffect(() => {
    const inBrowser = typeof window !== 'undefined';
    if (!inBrowser) {
      return;
    }

    const savedOrgId = window.localStorage.getItem('currentOrgId');
    if (savedOrgId && memberships.some((m) => m.org_id === savedOrgId)) {
      recordClientEvent({ name: 'organizations:setCurrentFromStorage', data: { orgId: savedOrgId } });
      setCurrentOrgId(savedOrgId);
      return;
    }

    if (memberships.length > 0) {
      recordClientEvent({ name: 'organizations:setCurrentFromFirstMembership', data: { orgId: memberships[0].org_id } });
      setCurrentOrgId(memberships[0].org_id);
    } else if (memberships.length === 0) {
      recordClientEvent({ name: 'organizations:noMembershipsDetected', level: 'warn' });
    }
  }, [memberships]);

  useEffect(() => {
    if (!currentOrgId || typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('currentOrgId', currentOrgId);
  }, [currentOrgId]);


  const switchOrganization = useCallback((orgId: string) => {
    setCurrentOrgId((previous) => {
      if (previous === orgId) {
        return previous;
      }
      recordClientEvent({ name: 'organizations:switch', data: { orgId } });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('currentOrgId', orgId);
      }
      return orgId;
    });
  }, []);

  const clearOrganization = useCallback(() => {
    recordClientEvent({ name: 'organizations:clearCurrentOrg' });
    setCurrentOrgId(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('currentOrgId');
    }
  }, []);

  const roleHierarchy: Record<OrgRole, number> = {
    SERVICE_ACCOUNT: 10,
    READONLY: 20,
    CLIENT: 30,
    EMPLOYEE: 40,
    MANAGER: 70,
    EQR: 80,
    PARTNER: 90,
    SYSTEM_ADMIN: 100,
  };

  const hasRole = (minRole: OrgRole) => {
    if (!currentOrg) return false;
    if (!currentMembership) return false;

    return roleHierarchy[currentMembership.role] >= roleHierarchy[minRole];
  };

  const isSystemAdmin = () => memberships.some((m) => m.role === 'SYSTEM_ADMIN');

  return {
    memberships,
    currentOrg,
    currentOrgId,
    loading,
    currentRole,
    switchOrganization,
    clearOrganization,
    hasRole,
    isSystemAdmin,
    refetch: fetchMemberships,
    tenantClient,
  };
}
