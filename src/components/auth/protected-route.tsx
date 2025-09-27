import { Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useOrganizations } from '@/hooks/use-organizations';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { memberships, currentOrg, loading: orgLoading } = useOrganizations();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const location = useLocation();

  console.log('[PROTECTED_ROUTE] Auth loading:', authLoading, 'Org loading:', orgLoading);
  console.log('[PROTECTED_ROUTE] User:', user?.email, 'Current org:', currentOrg?.slug, 'Target slug:', orgSlug);
  console.log('[PROTECTED_ROUTE] Memberships count:', memberships.length);

  // Show loading while checking authentication and organizations
  if (authLoading || orgLoading) {
    console.log('[PROTECTED_ROUTE] Showing loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated - redirect to sign in
  if (!user) {
    console.log('[PROTECTED_ROUTE] No user, redirecting to sign in');
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  // No memberships at all - show error or create default membership
  if (memberships.length === 0) {
    console.log('[PROTECTED_ROUTE] No memberships found');
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
      console.log('[PROTECTED_ROUTE] No access to org:', orgSlug, 'redirecting to first org');
      const firstOrg = memberships[0].organization;
      return <Navigate to={`/${firstOrg.slug}/dashboard`} replace />;
    }

    // Check role requirements
    if (requiredRole) {
      const roleHierarchy = { EMPLOYEE: 1, MANAGER: 2, SYSTEM_ADMIN: 3 };
      const userRole = targetOrg.role;
      const hasRequiredRole = roleHierarchy[userRole] >= roleHierarchy[requiredRole];
      
      if (!hasRequiredRole) {
        console.log('[PROTECTED_ROUTE] Insufficient role:', userRole, 'required:', requiredRole);
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

  console.log('[PROTECTED_ROUTE] Access granted, rendering children');
  return <>{children}</>;
}