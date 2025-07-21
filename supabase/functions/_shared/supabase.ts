/**
 * REFACTOR: Centralized Supabase client factory
 * Eliminates 110+ duplicate client instantiations across edge functions
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { logger } from './logger.ts';

// Connection pool for edge function efficiency
let _supabaseClient: SupabaseClient | null = null;
let _clientCreatedAt: number | null = null;
const CLIENT_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

// Environment validation
function validateEnvironment(): { url: string; key: string } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing required Supabase environment variables', null, {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
    throw new Error('Missing required Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  }

  return { url: supabaseUrl, key: supabaseKey };
}

// Production-ready Supabase client with connection pooling
export function getSupabaseClient(): SupabaseClient {
  const now = Date.now();
  
  // Refresh client periodically for better memory management
  if (_supabaseClient && _clientCreatedAt && (now - _clientCreatedAt) > CLIENT_REFRESH_INTERVAL) {
    logger.info('Refreshing Supabase client after 30 minutes');
    _supabaseClient = null;
    _clientCreatedAt = null;
  }
  
  if (_supabaseClient) {
    return _supabaseClient;
  }

  const { url, key } = validateEnvironment();
  
  try {
    _supabaseClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'x-application-name': 'easymo-edge-functions',
          'x-request-timestamp': new Date().toISOString(),
        }
      },
      // Production optimizations
      db: {
        schema: 'public'
      }
    });
    
    _clientCreatedAt = now;
    logger.info('Supabase client created successfully');
    return _supabaseClient;
  } catch (error) {
    logger.error('Failed to create Supabase client', error);
    throw error;
  }
}

// Database connection helper with error handling
export async function withSupabase<T>(
  operation: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const client = getSupabaseClient();
  
  try {
    return await operation(client);
  } catch (error) {
    console.error('Supabase operation failed:', error);
    throw error;
  }
}

// Common database operations
export const db = {
  // Users
  async getUserByPhone(phone: string) {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }
    
    return data;
  },

  async createUser(userData: { phone: string; momo_code: string; credits?: number }) {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Conversations
  async logConversation(messageData: {
    user_id: string;
    role: 'user' | 'assistant';
    message: string;
  }) {
    const { error } = await getSupabaseClient()
      .from('agent_conversations')
      .insert(messageData);
    
    if (error) throw error;
  },

  // Contacts
  async updateContactInteraction(phone: string) {
    const { error } = await getSupabaseClient()
      .from('contacts')
      .upsert({
        phone_number: phone,
        last_interaction: new Date().toISOString(),
        total_conversations: 1
      }, {
        onConflict: 'phone_number',
        ignoreDuplicates: false
      });
    
    if (error) throw error;
  }
};