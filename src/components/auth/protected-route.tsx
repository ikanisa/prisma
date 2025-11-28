import { Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useOrganizations, type OrgRole } from '@/hooks/use-organizations';
import { recordClientEvent } from '@/lib/client-events';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: OrgRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { memberships, currentOrg, loading: orgLoading } = useOrganizations();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const location = useLocation();

  recordClientEvent({
    name: 'protectedRoute:init',
    data: {
      authLoading,
      orgLoading,
      orgSlug,
      membershipCount: memberships.length,
    },
  });

  // Show loading while checking authentication and organizations
  if (authLoading || orgLoading) {
    recordClientEvent({ name: 'protectedRoute:loading', data: { orgSlug } });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated - redirect to sign in
  if (!user) {
    recordClientEvent({ name: 'protectedRoute:redirectSignIn', data: { from: location.pathname } });
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  // No memberships at all - show error or create default membership
  if (memberships.length === 0) {
    recordClientEvent({ name: 'protectedRoute:noMemberships', level: 'warn' });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Organization Access</h2>
          <p className="text-muted-foreground">You don't have access to any organizations.</p>
          <p className="text-muted-foreground">Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  // If accessing a specific org slug, verify access
  if (orgSlug) {
    const targetOrg = memberships.find(m => m.organization.slug === orgSlug);
    if (!targetOrg) {
      recordClientEvent({
        name: 'protectedRoute:redirectFirstOrg',
        level: 'warn',
        data: { requestedSlug: orgSlug, fallbackSlug: memberships[0]?.organization.slug },
      });
      const firstOrg = memberships[0].organization;
      return <Navigate to={`/${firstOrg.slug}/dashboard`} replace />;
    }

    // Check role requirements
    if (requiredRole) {
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
      const userRole = targetOrg.role;
      const hasRequiredRole = roleHierarchy[userRole] >= roleHierarchy[requiredRole];
      
      if (!hasRequiredRole) {
        recordClientEvent({
          name: 'protectedRoute:insufficientRole',
          level: 'warn',
          data: { requiredRole, userRole, orgSlug },
        });
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You don't have sufficient permissions to access this page.</p>
            </div>
          </div>
        );
      }
    }
  }

  recordClientEvent({ name: 'protectedRoute:granted', data: { orgSlug: orgSlug ?? currentOrg?.slug } });
  return <>{children}</>;
}
