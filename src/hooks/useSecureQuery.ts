import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppErrorHandler } from '@/utils/errorHandler';
import { useAdminAuth } from './admin/useAdminAuth';

interface SecureQueryOptions {
  table: string;
  select?: string;
  filters?: Record<string, unknown>;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  queryKey: string[];
}

export function useSecureQuery<T = unknown>({
  table,
  select = '*',
  filters = {},
  requireAuth = true,
  requireAdmin = false,
  queryKey,
}: SecureQueryOptions) {
  const { user, isAdmin, loading: authLoading } = useAdminAuth();

  return useQuery({
    queryKey,
    enabled: 
      !authLoading && 
      (!requireAuth || !!user) && 
      (!requireAdmin || isAdmin === true),
    
    queryFn: async () => {
      try {
        // Security checks
        if (requireAuth && !user) {
          throw AppErrorHandler.createError('Authentication required', 'AUTH_REQUIRED');
        }
        
        if (requireAdmin && !isAdmin) {
          throw AppErrorHandler.createError('Admin privileges required', 'ADMIN_REQUIRED');
        }

        // Build query
        let query = supabase.from(table as any).select(select);

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else {
              query = query.eq(key, value);
            }
          }
        });

        const { data, error, count } = await query;

        if (error) {
          throw AppErrorHandler.createError(
            `Database error: ${error.message}`,
            'DATABASE_ERROR',
            { table, filters, originalError: error }
          );
        }

        return { data: data as T[], count };
      } catch (error) {
        const appError = AppErrorHandler.handle(error, `useSecureQuery:${table}`);
        AppErrorHandler.log(appError);
        throw appError;
      }
    },
  });
}

// Specialized hook for admin-only queries
export function useAdminQuery<T = unknown>(
  options: Omit<SecureQueryOptions, 'requireAdmin'>
) {
  return useSecureQuery<T>({ ...options, requireAdmin: true });
}

// Specialized hook for public queries that don't require auth
export function usePublicQuery<T = unknown>(
  options: Omit<SecureQueryOptions, 'requireAuth'>
) {
  return useSecureQuery<T>({ ...options, requireAuth: false });
}