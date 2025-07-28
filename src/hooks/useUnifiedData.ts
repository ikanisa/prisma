import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedListing } from './useUnifiedListings';

export interface UnifiedOrder {
  id: string;
  user_id: string;
  quantity: number;
  price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'failed';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Enhanced typed hooks for unified data management

export interface UnifiedFilters {
  status?: string;
  type?: string;
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Unified Listings Hook
export const useUnifiedListings = (filters?: UnifiedFilters) => {
  return useQuery({
    queryKey: ['unified_listings', filters],
    queryFn: async () => {
      let query = supabase
        .from('unified_listings')
        .select('*');

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type as any);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status as any);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UnifiedListing[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Unified Orders Hook
export const useUnifiedOrders = (filters?: UnifiedFilters) => {
  return useQuery({
    queryKey: ['unified_orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('unified_orders')
        .select('*');

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status as any);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UnifiedOrder[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Conversations Hook
export const useConversations = (filters?: UnifiedFilters) => {
  return useQuery({
    queryKey: ['conversations', filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000, // 30 seconds for real-time feel
  });
};

// Agents Hook
export const useAgents = () => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          agent_configs(*),
          agent_personas(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// System Metrics Hook
export const useSystemMetrics = () => {
  return useQuery({
    queryKey: ['system_metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000, // 1 minute
  });
};

// Mutation hooks for CRUD operations
export const useCreateListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listing: any) => {
      const { data, error } = await supabase
        .from('unified_listings')
        .insert([listing])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified_listings'] });
    },
  });
};

export const useUpdateListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('unified_listings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified_listings'] });
    },
  });
};

export const useDeleteListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('unified_listings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified_listings'] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: any }) => {
      const { data, error } = await supabase
        .from('unified_orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified_orders'] });
    },
  });
};