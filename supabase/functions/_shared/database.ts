import { supabaseClient } from "./client.ts";
/**
 * Production database utilities
 * Centralized database operations with proper error handling
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { logger } from './logger.ts';
import { withRetry, PerformanceMonitor } from './utils.ts';

// Database operation wrapper with automatic retries and logging
export async function withDatabase<T>(
  operation: (client: SupabaseClient) => Promise<T>,
  client: SupabaseClient,
  context?: string
): Promise<T> {
  const monitor = new PerformanceMonitor(`Database: ${context || 'unknown'}`);
  
  try {
    const result = await withRetry(
      () => operation(client),
      3, // max retries
      1000, // base delay
      context
    );
    
    monitor.end({ success: true });
    return result;
  } catch (error) {
    monitor.end({ success: false, error: (error as Error).message });
    logger.error(`Database operation failed: ${context}`, error);
    throw error;
  }
}

// Common database operations with error handling
export const dbOperations = {
  // Safe user lookup with caching potential
  async getUserByPhone(client: SupabaseClient, phone: string) {
    return withDatabase(async (db) => {
      const { data, error } = await db
        .from('users')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();
      
      if (error) {
        throw new Error(`Failed to fetch user: ${error.message}`);
      }
      
      return data;
    }, client, `getUserByPhone:${phone}`);
  },

  // Safe user creation with validation
  async createUser(client: SupabaseClient, userData: { 
    phone: string; 
    momo_code?: string; 
    credits?: number;
    name?: string;
  }) {
    return withDatabase(async (db) => {
      const { data, error } = await db
        .from('users')
        .insert({
          phone: userData.phone,
          momo_code: userData.momo_code || userData.phone.replace('+', ''),
          credits: userData.credits || 0,
          name: userData.name,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('User already exists');
        }
        throw new Error(`Failed to create user: ${error.message}`);
      }
      
      logger.info('User created successfully', { phone: userData.phone });
      return data;
    }, client, `createUser:${userData.phone}`);
  },

  // Safe conversation logging
  async logConversation(client: SupabaseClient, messageData: {
    phone_number: string;
    role: 'user' | 'assistant';
    message: string;
    agent_id?: string;
    model_used?: string;
    confidence_score?: number;
  }) {
    return withDatabase(async (db) => {
      const { error } = await db
        .from('conversation_messages')
        .insert({
          phone_number: messageData.phone_number,
          sender: messageData.role,
          message_text: messageData.message,
          channel: 'whatsapp',
          model_used: messageData.model_used,
          confidence_score: messageData.confidence_score,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        logger.warn('Failed to log conversation', { error: error.message, messageData });
        // Don't throw - conversation logging shouldn't break the main flow
      }
    }, client, `logConversation:${messageData.phone_number}`);
  },

  // Safe contact management
  async updateContact(client: SupabaseClient, phone: string, updates: {
    name?: string;
    last_interaction?: string;
    total_conversations?: number;
    location?: string;
  }) {
    return withDatabase(async (db) => {
      const { error } = await db
        .from('contacts')
        .upsert({
          phone_number: phone,
          last_interaction: updates.last_interaction || new Date().toISOString(),
          total_conversations: updates.total_conversations || 1,
          name: updates.name,
          location: updates.location,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'phone_number',
          ignoreDuplicates: false
        });
      
      if (error) {
        logger.warn('Failed to update contact', { error: error.message, phone });
      }
    }, client, `updateContact:${phone}`);
  },

  // Bulk operations with transaction support
  async bulkInsert<T>(
    client: SupabaseClient, 
    tableName: string, 
    records: T[], 
    batchSize: number = 1000
  ) {
    return withDatabase(async (db) => {
      const results = [];
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { data, error } = await db
          .from(tableName)
          .insert(batch)
          .select();
        
        if (error) {
          throw new Error(`Bulk insert failed at batch ${i}-${i + batchSize}: ${error.message}`);
        }
        
        results.push(...(data || []));
      }
      
      logger.info(`Bulk insert completed`, { 
        table: tableName, 
        totalRecords: records.length,
        batches: Math.ceil(records.length / batchSize)
      });
      
      return results;
    }, client, `bulkInsert:${tableName}`);
  },

  // Safe RPC calls
  async callRPC<T>(
    client: SupabaseClient,
    functionName: string,
    params: any = {}
  ): Promise<T> {
    return withDatabase(async (db) => {
      const { data, error } = await db.rpc(functionName, params);
      
      if (error) {
        throw new Error(`RPC call failed (${functionName}): ${error.message}`);
      }
      
      return data;
    }, client, `rpc:${functionName}`);
  }
};

// Connection health check
export async function checkDatabaseHealth(client: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await client.from('users').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}

// Query optimization helpers
export const queryOptimizations = {
  // Pagination helper
  paginate: (query: any, page: number = 1, limit: number = 50) => {
    const offset = (page - 1) * limit;
    return query.range(offset, offset + limit - 1);
  },

  // Common select patterns
  selectWithRelations: (baseSelect: string, relations: string[]) => {
    return `${baseSelect},${relations.join(',')}`;
  },

  // Date range filtering
  filterByDateRange: (query: any, column: string, startDate?: string, endDate?: string) => {
    if (startDate) {
      query = query.gte(column, startDate);
    }
    if (endDate) {
      query = query.lte(column, endDate);
    }
    return query;
  }
};