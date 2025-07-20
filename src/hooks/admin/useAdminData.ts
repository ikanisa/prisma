import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { LoadingState, AdminError } from '@/types/admin';

interface UseAdminDataOptions {
  autoLoad?: boolean;
  dependencies?: any[];
}

interface UseAdminDataReturn<T> {
  data: T[];
  loading: boolean;
  error: AdminError | null;
  loadingState: LoadingState;
  total: number;
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useAdminData<T = any>(
  tableName: string,
  options: UseAdminDataOptions = {}
): UseAdminDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const { autoLoad = true, dependencies = [] } = options;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingState('loading');
      setError(null);

      const { data: result, error: queryError, count } = await supabase
        .from(tableName as any)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (queryError) {
        throw new Error(queryError.message);
      }

      setData((result as T[]) || []);
      setTotal(count || 0);
      setLoadingState('success');
    } catch (err) {
      const error: AdminError = {
        code: 'LOAD_ERROR',
        message: err instanceof Error ? err.message : 'Failed to load data',
        details: { tableName }
      };
      
      setError(error);
      setLoadingState('error');
      
      toast({
        title: "Error",
        description: `Failed to load ${tableName}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [tableName, toast]);

  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [loadData, autoLoad, ...dependencies]);

  return {
    data,
    loading,
    error,
    loadingState,
    total,
    refresh: loadData,
    setData
  };
}

export function useAdminQuery<T = any>(
  query: () => Promise<{ data: T[] | null; error: any; count?: number | null }>,
  dependencies: any[] = []
): UseAdminDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const executeQuery = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingState('loading');
      setError(null);

      const result = await query();

      if (result.error) {
        throw new Error(result.error.message || 'Query failed');
      }

      setData(result.data || []);
      setTotal(result.count || 0);
      setLoadingState('success');
    } catch (err) {
      const error: AdminError = {
        code: 'QUERY_ERROR',
        message: err instanceof Error ? err.message : 'Query failed'
      };
      
      setError(error);
      setLoadingState('error');
      
      toast({
        title: "Error",
        description: "Failed to execute query",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [query, toast]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery, ...dependencies]);

  return {
    data,
    loading,
    error,
    loadingState,
    total,
    refresh: executeQuery,
    setData
  };
}