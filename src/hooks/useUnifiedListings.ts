import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ListingType = 'product' | 'produce' | 'property' | 'vehicle' | 'service';
export type ListingStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface UnifiedListing {
  id: string;
  owner_id: string;
  type: ListingType;
  title: string;
  description?: string;
  location_gps?: any;
  status: ListingStatus;
  price?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const useUnifiedListings = (listingType?: ListingType) => {
  return useQuery({
    queryKey: ['unified_listings', listingType],
    queryFn: async () => {
      let query = supabase
        .from('unified_listings')
        .select('*');

      if (listingType) {
        query = query.eq('type', listingType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UnifiedListing[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Simple unified orders hook - moved complex logic to useUnifiedOrders.ts
export const useSimpleUnifiedOrders = () => {
  return useQuery({
    queryKey: ['simple_unified_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unified_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const usePayments = () => {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};