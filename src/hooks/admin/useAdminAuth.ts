import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AdminAuthState {
  user: User | null;
  isAdmin: boolean | null;
  loading: boolean;
  checkingAuth: boolean;
}

export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    isAdmin: null,
    loading: true,
    checkingAuth: true
  });

  useEffect(() => {
    let mounted = true;

    const checkAdminAccess = async (providedSession?: Session | null) => {
      try {
        // Use provided session or get current session
        let session: Session | null = providedSession || null;
        
        if (!session) {
          const { data: sessionData } = await supabase.auth.getSession();
          session = sessionData.session;
        }
        
        if (!mounted) return;

        if (!session?.user) {
          setState({
            user: null,
            isAdmin: false,
            loading: false,
            checkingAuth: false
          });
          return;
        }

        const user = session.user;

        // For development: allow any authenticated user to be admin
        // In production: check the is_admin() function
        const isDev = import.meta.env.DEV;
        
        if (isDev) {
          // Development mode: any authenticated user is admin
          setState({
            user,
            isAdmin: true,
            loading: false,
            checkingAuth: false
          });
        } else {
          // Production mode: check admin role with proper session context
          const { data: isAdminResult, error } = await supabase.rpc('is_admin');
          
          if (!mounted) return;
          
          if (error) {
            console.error('Error checking admin status:', error);
          }
          
          setState({
            user,
            isAdmin: !error && isAdminResult === true,
            loading: false,
            checkingAuth: false
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error checking admin access:', errorMessage);
        if (mounted) {
          setState({
            user: null,
            isAdmin: false,
            loading: false,
            checkingAuth: false
          });
        }
      }
    };

    // Listen for auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session?.user) {
          setState({
            user: null,
            isAdmin: false,
            loading: false,
            checkingAuth: false
          });
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Use a small delay to ensure session is properly set
          setTimeout(() => {
            if (mounted) {
              checkAdminAccess(session);
            }
          }, 100);
        }
      }
    );

    // Initial check
    checkAdminAccess();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}