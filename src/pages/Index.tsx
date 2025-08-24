import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useOrganizations } from '@/hooks/use-organizations';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: orgLoading } = useOrganizations();

  // Show loading while checking authentication
  if (authLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is authenticated and has organizations, redirect to first org
  if (user && memberships.length > 0) {
    const firstOrg = memberships[0].organization;
    return <Navigate to={`/${firstOrg.slug}/dashboard`} replace />;
  }

  // If not authenticated, redirect to sign-in
  return <Navigate to="/auth/sign-in" replace />;
}
