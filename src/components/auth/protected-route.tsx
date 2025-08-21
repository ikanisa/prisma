import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useOrganizations } from '@/hooks/use-organizations';

interface ProtectedRouteProps {
  children: React.ReactNode;
  orgSlug?: string;
  requiredRole?: 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN';
}

export function ProtectedRoute({ children, orgSlug, requiredRole }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { currentOrg, loading: orgLoading, hasRole } = useOrganizations();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || orgLoading) return;

    // Not authenticated
    if (!user) {
      navigate('/auth/sign-in');
      return;
    }

    // If orgSlug is provided, check if current org matches
    if (orgSlug && (!currentOrg || currentOrg.slug !== orgSlug)) {
      navigate('/404');
      return;
    }

    // Check role requirements
    if (requiredRole && !hasRole(requiredRole)) {
      navigate('/unauthorized');
      return;
    }
  }, [user, currentOrg, authLoading, orgLoading, orgSlug, requiredRole, hasRole, navigate]);

  if (authLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}