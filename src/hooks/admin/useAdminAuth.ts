import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

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

    const checkAdminAccess = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (!session?.session?.user) {
          setState({
            user: null,
            isAdmin: false,
            loading: false,
            checkingAuth: false
          });
          return;
        }

        const user = session.session.user;

        // Check if user has admin role
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (!mounted) return;

        setState({
          user,
          isAdmin: !!roles && !error,
          loading: false,
          checkingAuth: false
        });
      } catch (error) {
        console.error('Error checking admin access:', error);
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

    checkAdminAccess();

    // Listen for auth changes
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
          await checkAdminAccess();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}