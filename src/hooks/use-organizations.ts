import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { createTenantClient, TenantClient } from '@/lib/tenant-client';
import { useAppStore, mockMemberships } from '@/stores/mock-data';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  brand_primary: string;
  brand_secondary: string;
  created_at: string;
}

export interface Membership {
  id: string;
  org_id: string;
  user_id: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN';
  organization: Organization;
}

export function useOrganizations() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const currentOrg = memberships.find((m) => m.org_id === currentOrgId)?.organization || null;
  const tenantClient = useMemo<TenantClient | null>(() => {
    if (!currentOrg) return null;
    return createTenantClient(currentOrg.id);
  }, [currentOrg]);

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      console.log('[ORG] No user, skipping membership fetch');
      return;
    }
    if (!isSupabaseConfigured) {
      return;
    }

    console.log('[ORG] Fetching memberships for user:', user.email);
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

      console.log('[ORG] Memberships fetched:', data?.length || 0, 'memberships');
      setMemberships(data || []);
    } catch (error) {
      console.error('[ORG] Error fetching memberships:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Demo mode: hydrate from mock data and match the demo user
      const appStore = useAppStore.getState();
      const orgMap = new Map(appStore.organizations.map((org) => [org.id, org]));
      const targetUserId = '1';

      let normalized = mockMemberships
        .filter((membership) => membership.userId === targetUserId)
        .map((membership) => {
          const org = orgMap.get(membership.orgId) ?? {
            id: membership.orgId,
            name: 'Aurora Advisors',
            slug: 'aurora',
            brandPrimary: '#00bcd4',
            brandSecondary: '#9c27b0',
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
            },
          } satisfies Membership;
        });

      if (normalized.length === 0 && mockMemberships.length > 0) {
        normalized = mockMemberships.slice(0, 1).map((membership) => {
          const org = orgMap.get(membership.orgId) ?? {
            id: membership.orgId,
            name: 'Aurora Advisors',
            slug: 'aurora',
            brandPrimary: '#00bcd4',
            brandSecondary: '#9c27b0',
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
    const savedOrgId = localStorage.getItem('currentOrgId');
    console.log('[ORG] Setting current org. Saved:', savedOrgId, 'Memberships:', memberships.length);
    if (savedOrgId && memberships.some((m) => m.org_id === savedOrgId)) {
      console.log('[ORG] Using saved org:', savedOrgId);
      setCurrentOrgId(savedOrgId);
    } else if (memberships.length > 0) {
      console.log('[ORG] Using first membership:', memberships[0].org_id);
      setCurrentOrgId(memberships[0].org_id);
    } else if (memberships.length === 0) {
      console.log('[ORG] No memberships found!');
    }
  }, [memberships]);

  useEffect(() => {
    if (currentOrgId) {
      localStorage.setItem('currentOrgId', currentOrgId);
    }
  }, [currentOrgId]);


  const switchOrganization = useCallback((orgId: string) => {
    setCurrentOrgId(orgId);
  }, []);

  const hasRole = (minRole: 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN') => {
    if (!currentOrg) return false;

    const membership = memberships.find((m) => m.org_id === currentOrgId);
    if (!membership) return false;

    const roleHierarchy = { EMPLOYEE: 1, MANAGER: 2, SYSTEM_ADMIN: 3 };
    return roleHierarchy[membership.role] >= roleHierarchy[minRole];
  };

  const isSystemAdmin = () => memberships.some((m) => m.role === 'SYSTEM_ADMIN');

  return {
    memberships,
    currentOrg,
    currentOrgId,
    loading,
    switchOrganization,
    hasRole,
    isSystemAdmin,
    refetch: fetchMemberships,
    tenantClient,
  };
}
