import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type OrderType = 'marketplace' | 'produce' | 'pharmacy' | 'hardware' | 'services';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'completed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  listing_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  metadata?: Record<string, any>;
}

export interface UnifiedOrder {
  id: string;
  order_type: OrderType;
  customer_phone: string;
  customer_id?: string;
  vendor_id: string;
  items: OrderItem[];
  listing_ids: string[];
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  total_amount: number;
  currency: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: string;
  payment_reference?: string;
  delivery_method?: string;
  delivery_address?: string;
  delivery_notes?: string;
  domain_metadata?: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  cancelled_at?: string;
  businesses?: {
    name: string;
  };
}

export const useUnifiedOrders = (filters?: {
  orderType?: OrderType;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  vendorId?: string;
}) => {
  return useQuery({
    queryKey: ['unified_orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('unified_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.orderType) {
        query = query.eq('order_type', filters.orderType);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus);
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters?.vendorId) {
        query = query.eq('vendor_id', filters.vendorId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []).map(order => ({
        ...order,
        items: (order.items as any) || [],
        listing_ids: (order.listing_ids as any) || [],
        domain_metadata: (order.domain_metadata as any) || {},
        businesses: undefined
      })) as UnifiedOrder[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: Omit<UnifiedOrder, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'cancelled_at' | 'businesses'>) => {
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: orderData
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create order');
      
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified_orders'] });
      queryClient.invalidateQueries({ queryKey: ['unified_listings'] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status, paymentStatus }: {
      orderId: string;
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
    }) => {
      const updateData: any = {};
      if (status) updateData.status = status;
      if (paymentStatus) updateData.payment_status = paymentStatus;
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('unified_orders')
        .update(updateData)
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

export const useOrdersByCustomer = (customerPhone: string) => {
  return useQuery({
    queryKey: ['unified_orders', 'customer', customerPhone],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unified_orders')
        .select('*')
        .eq('customer_phone', customerPhone)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(order => ({
        ...order,
        items: (order.items as any) || [],
        listing_ids: (order.listing_ids as any) || [],
        domain_metadata: (order.domain_metadata as any) || {},
        businesses: undefined
      })) as UnifiedOrder[];
    },
    enabled: !!customerPhone,
    staleTime: 2 * 60 * 1000,
  });
};

export const useOrdersByVendor = (vendorId: string) => {
  return useQuery({
    queryKey: ['unified_orders', 'vendor', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unified_orders')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(order => ({
        ...order,
        items: (order.items as any) || [],
        listing_ids: (order.listing_ids as any) || [],
        domain_metadata: (order.domain_metadata as any) || {},
        businesses: undefined
      })) as UnifiedOrder[];
    },
    enabled: !!vendorId,
    staleTime: 2 * 60 * 1000,
  });
};