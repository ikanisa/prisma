import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedListing } from './useUnifiedListings';

// TODO: Import from @easymo/lib-core once packages are built and linked
// import { AppError, createErrorResponse, createSuccessResponse } from '@easymo/lib-core/error';
// import { retryWithBackoff } from '@easymo/lib-core/utils';

// Unified data types
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

export interface UnifiedContact {
  id: string;
  phone_number: string;
  name?: string;
  email?: string;
  preferred_language: 'en' | 'fr' | 'rw';
  contact_type: 'prospect' | 'customer' | 'vendor' | 'partner' | 'support';
  status: 'active' | 'blocked' | 'opted_out' | 'inactive';
  lifecycle_stage: 'lead' | 'qualified' | 'opportunity' | 'customer' | 'advocate';
  location_data?: Record<string, any>;
  preferences: Record<string, any>;
  tags?: string[];
  custom_fields: Record<string, any>;
  first_contact_date: string;
  last_interaction_date?: string;
  total_conversations: number;
  total_orders: number;
  total_spent: number;
  avg_response_time_minutes?: number;
  satisfaction_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface UnifiedConversation {
  id: string;
  phone_number: string;
  contact_name?: string;
  session_id: string;
  conversation_type: 'support' | 'sales' | 'service' | 'bridge';
  status: 'active' | 'paused' | 'completed' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_agent?: string;
  metadata: Record<string, any>;
  tags?: string[];
  created_at: string;
  updated_at: string;
  last_message_at: string;
  total_messages: number;
  satisfaction_score?: number;
  resolution_time_minutes?: number;
}

export interface UnifiedMessage {
  id: string;
  conversation_id?: string;
  phone_number: string;
  sender_role: 'user' | 'agent' | 'system' | 'bot';
  message_text?: string;
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact';
  message_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  direction: 'inbound' | 'outbound';
  agent_id?: string;
  model_used?: string;
  confidence_score?: number;
  processing_time_ms?: number;
  media_url?: string;
  media_type?: string;
  media_size?: number;
  reply_to_message_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  delivered_at?: string;
  read_at?: string;
}

export interface EdgeFunctionLog {
  id: string;
  function_name: string;
  execution_id: string;
  user_id?: string;
  phone_number?: string;
  request_method?: string;
  request_path?: string;
  request_headers?: Record<string, any>;
  request_body?: Record<string, any>;
  response_status?: number;
  response_body?: Record<string, any>;
  error_message?: string;
  error_stack?: string;
  execution_time_ms?: number;
  memory_used_mb?: number;
  cold_start: boolean;
  environment: string;
  version?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SystemMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_type: 'performance' | 'business' | 'technical' | 'security';
  measurement_unit?: string;
  tags: Record<string, any>;
  dimensions: Record<string, any>;
  timestamp: string;
  source: string;
  environment: string;
  created_at: string;
}

// Enhanced filters interface
export interface UnifiedFilters {
  status?: string;
  type?: string;
  userId?: string;
  phoneNumber?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  environment?: string;
  functionName?: string;
  conversationType?: string;
  messageType?: string;
  priority?: string;
  contactType?: string;
  lifecycleStage?: string;
  metricType?: string;
  source?: string;
  tags?: string[];
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