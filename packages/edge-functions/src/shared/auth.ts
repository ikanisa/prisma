import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthContext {
  user: any;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export class AuthManager {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async validateAuthHeader(authHeader: string | null): Promise<AuthContext> {
    if (!authHeader) {
      return {
        user: null,
        isAuthenticated: false,
        isAdmin: false,
      };
    }

    try {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        return {
          user: null,
          isAuthenticated: false,
          isAdmin: false,
        };
      }

      // Check if user has admin role
      const { data: profile } = await this.supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      return {
        user,
        isAuthenticated: true,
        isAdmin,
      };
    } catch (error) {
      console.error('Auth validation error:', error);
      return {
        user: null,
        isAuthenticated: false,
        isAdmin: false,
      };
    }
  }

  requireAuth(auth: AuthContext): void {
    if (!auth.isAuthenticated) {
      throw new Error('Authentication required');
    }
  }

  requireAdmin(auth: AuthContext): void {
    this.requireAuth(auth);
    if (!auth.isAdmin) {
      throw new Error('Admin privileges required');
    }
  }
}