import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { createTenantClient, TenantClient } from '@/lib/tenant-client';

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
  const [loading, setLoading] = useState(false);

  const currentOrg = memberships.find((m) => m.org_id === currentOrgId)?.organization || null;
  const tenantClient = useMemo<TenantClient | null>(() => {
    if (!currentOrg) return null;
    return createTenantClient(currentOrg.id);
  }, [currentOrg]);

  useEffect(() => {
    if (user) {
      fetchMemberships();
    } else {
      setMemberships([]);
      setCurrentOrgId(null);
    }
  }, [user]);

  useEffect(() => {
    const savedOrgId = localStorage.getItem('currentOrgId');
    if (savedOrgId && memberships.some((m) => m.org_id === savedOrgId)) {
      setCurrentOrgId(savedOrgId);
    } else if (memberships.length > 0) {
      setCurrentOrgId(memberships[0].org_id);
    }
  }, [memberships]);

  useEffect(() => {
    if (currentOrgId) {
      localStorage.setItem('currentOrgId', currentOrgId);
    }
  }, [currentOrgId]);

  const fetchMemberships = async () => {
    if (!user) return;

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

      setMemberships(data || []);
    } catch (error) {
      console.error('Error fetching memberships:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = (orgId: string) => {
    setCurrentOrgId(orgId);
  };

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
