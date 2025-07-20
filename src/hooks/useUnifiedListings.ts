import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ListingType = 'product' | 'produce' | 'property' | 'vehicle' | 'hardware';

export const useUnifiedListings = (listingType?: ListingType) => {
  return useQuery({
    queryKey: ['unified_listings', listingType],
    queryFn: async () => {
      let query = supabase
        .from('unified_listings')
        .select('*,businesses(name)');

      if (listingType) {
        query = query.eq('listing_type', listingType);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUnifiedOrders = () => {
  return useQuery({
    queryKey: ['unified_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unified_orders')
        .select('*,businesses(name)')
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