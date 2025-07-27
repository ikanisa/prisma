import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'failed';

export interface UnifiedOrder {
  id: string;
  user_id: string;
  listing_id: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface OrderFilters {
  status?: OrderStatus;
  userId?: string;
}

export const useUnifiedOrders = (filters?: OrderFilters) => {
  return useQuery({
    queryKey: ['unified_orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('unified_orders')
        .select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UnifiedOrder[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderData: Omit<UnifiedOrder, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('unified_orders')
        .insert(orderData)
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

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { data, error } = await supabase
        .from('unified_orders')
        .update({ status })
        .eq('id', orderId)
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

// Additional hooks for user-specific orders
export const useOrdersByUser = (userId: string) => {
  return useQuery({
    queryKey: ['unified_orders', 'user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unified_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UnifiedOrder[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};