import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useOrganizations } from '@/hooks/use-organizations';

export function FallbackRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: orgLoading } = useOrganizations();

  console.log('[FALLBACK_REDIRECT] Auth loading:', authLoading, 'Org loading:', orgLoading);
  console.log('[FALLBACK_REDIRECT] User:', user?.email, 'Memberships:', memberships.length);

  // Show loading while checking authentication
  if (authLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, redirect to sign-in
  if (!user) {
    console.log('[FALLBACK_REDIRECT] No user, redirecting to sign in');
    return <Navigate to="/auth/sign-in" replace />;
  }

  // If user has memberships, redirect to first organization
  if (memberships.length > 0) {
    const firstOrg = memberships[0].organization;
    console.log('[FALLBACK_REDIRECT] Redirecting to first org:', firstOrg.slug);
    return <Navigate to={`/${firstOrg.slug}/dashboard`} replace />;
  }

  // No memberships - show error
  console.log('[FALLBACK_REDIRECT] No memberships found');
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