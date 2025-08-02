import { supabase } from '@/integrations/supabase/client';

export interface MemoryEntry {
  id?: string;
  user_id: string;
  memory_type: string;
  memory_key: string;
  memory_value: any;
  confidence_score?: number;
  importance_weight?: number;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConversationState {
  id?: string;
  phone_number: string;
  flow_name: string;
  current_step: string;
  flow_data: Record<string, any>;
  status: 'active' | 'completed' | 'abandoned';
  started_at?: string;
  completed_at?: string;
}

export class MemoryAPI {
  // Simple key-value memory operations using existing tables
  async setMemory(userId: string, type: string, key: string, value: any, options: {
    confidence?: number;
    importance?: number;
    expiresAt?: Date;
  } = {}): Promise<boolean> {
    try {
      // Use existing events table for memory storage
      const { error } = await supabase
        .from('events')
        .insert({
          session_id: `${userId}_${type}_${key}`,
          event_type: 'memory_set',
          event_data: {
            user_id: userId,
            memory_type: type,
            memory_key: key,
            memory_value: typeof value === 'string' ? value : JSON.stringify(value),
            confidence_score: options.confidence || 1.0,
            importance_weight: options.importance || 1.0,
            expires_at: options.expiresAt?.toISOString()
          }
        });

      return !error;
    } catch (error) {
      console.error('Error setting memory:', error);
      return false;
    }
  }

  async getMemory(userId: string, type: string, key: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('event_data, created_at')
        .eq('session_id', `${userId}_${type}_${key}`)
        .eq('event_type', 'memory_set')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      const eventData = data.event_data as any;
      
      // Check if memory has expired
      if (eventData?.expires_at && new Date(eventData.expires_at) < new Date()) {
        await this.deleteMemory(userId, type, key);
        return null;
      }

      // Try to parse JSON, fallback to string
      try {
        return JSON.parse(String(eventData?.memory_value || ''));
      } catch {
        return String(eventData?.memory_value || '');
      }
    } catch (error) {
      console.error('Error getting memory:', error);
      return null;
    }
  }

  async deleteMemory(userId: string, type: string, key: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('session_id', `${userId}_${type}_${key}`)
        .eq('event_type', 'memory_set');

      return !error;
    } catch (error) {
      console.error('Error deleting memory:', error);
      return false;
    }
  }

  async getAllMemory(userId: string, type?: string): Promise<MemoryEntry[]> {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .eq('event_type', 'memory_set')
        .like('session_id', `${userId}%`);

      if (type) {
        query = query.like('session_id', `${userId}_${type}_%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map(entry => {
        const eventData = entry.event_data as any;
        return {
          id: entry.id,
          user_id: eventData?.user_id || userId,
          memory_type: eventData?.memory_type || type || 'unknown',
          memory_key: eventData?.memory_key || 'unknown',
          memory_value: this.tryParseJSON(String(eventData?.memory_value || '')),
          confidence_score: eventData?.confidence_score,
          importance_weight: eventData?.importance_weight,
          expires_at: eventData?.expires_at,
          created_at: entry.created_at,
          updated_at: entry.created_at
        };
      });
    } catch (error) {
      console.error('Error getting all memory:', error);
      return [];
    }
  }

  // Conversation state management using events table
  async setConversationState(phoneNumber: string, flowName: string, currentStep: string, data: Record<string, any>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          session_id: `conversation_${phoneNumber}_${flowName}`,
          event_type: 'conversation_state',
          event_data: {
            phone_number: phoneNumber,
            flow_name: flowName,
            current_step: currentStep,
            flow_data: data,
            status: 'active'
          }
        });

      return !error;
    } catch (error) {
      console.error('Error setting conversation state:', error);
      return false;
    }
  }

  async getConversationState(phoneNumber: string, flowName?: string): Promise<ConversationState | null> {
    try {
      const sessionId = flowName ? `conversation_${phoneNumber}_${flowName}` : `conversation_${phoneNumber}%`;
      
      let query = supabase
        .from('events')
        .select('event_data, created_at')
        .eq('event_type', 'conversation_state');

      if (flowName) {
        query = query.eq('session_id', `conversation_${phoneNumber}_${flowName}`);
      } else {
        query = query.like('session_id', `conversation_${phoneNumber}_%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      const eventData = data.event_data as any;
      return {
        id: eventData?.id,
        phone_number: eventData?.phone_number || phoneNumber,
        flow_name: eventData?.flow_name || flowName || 'unknown',
        current_step: eventData?.current_step || 'unknown',
        flow_data: eventData?.flow_data || {},
        status: eventData?.status || 'active',
        started_at: data.created_at
      };
    } catch (error) {
      console.error('Error getting conversation state:', error);
      return null;
    }
  }

  async completeConversationFlow(phoneNumber: string, flowName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          session_id: `conversation_${phoneNumber}_${flowName}_completed`,
          event_type: 'conversation_completed',
          event_data: {
            phone_number: phoneNumber,
            flow_name: flowName,
            completed_at: new Date().toISOString()
          }
        });

      return !error;
    } catch (error) {
      console.error('Error completing conversation flow:', error);
      return false;
    }
  }

  async abandonConversationFlow(phoneNumber: string, flowName?: string): Promise<boolean> {
    try {
      const sessionId = flowName ? `conversation_${phoneNumber}_${flowName}_abandoned` : `conversation_${phoneNumber}_abandoned`;
      
      const { error } = await supabase
        .from('events')
        .insert({
          session_id: sessionId,
          event_type: 'conversation_abandoned',
          event_data: {
            phone_number: phoneNumber,
            flow_name: flowName,
            abandoned_at: new Date().toISOString()
          }
        });

      return !error;
    } catch (error) {
      console.error('Error abandoning conversation flow:', error);
      return false;
    }
  }

  // Context helpers for skills
  async getUserContext(userId: string): Promise<Record<string, any>> {
    const memories = await this.getAllMemory(userId);
    const context: Record<string, any> = {};
    
    memories.forEach(memory => {
      if (!context[memory.memory_type]) {
        context[memory.memory_type] = {};
      }
      context[memory.memory_type][memory.memory_key] = memory.memory_value;
    });

    return context;
  }

  async setUserPreference(userId: string, key: string, value: any): Promise<boolean> {
    return this.setMemory(userId, 'preferences', key, value, { importance: 0.8 });
  }

  async getUserPreference(userId: string, key: string): Promise<any> {
    return this.getMemory(userId, 'preferences', key);
  }

  async setUserProfile(userId: string, profileData: Record<string, any>): Promise<boolean> {
    const success = [];
    
    for (const [key, value] of Object.entries(profileData)) {
      success.push(await this.setMemory(userId, 'profile', key, value, { importance: 1.0 }));
    }

    return success.every(s => s);
  }

  async getUserProfile(userId: string): Promise<Record<string, any>> {
    const memories = await this.getAllMemory(userId, 'profile');
    const profile: Record<string, any> = {};
    
    memories.forEach(memory => {
      profile[memory.memory_key] = memory.memory_value;
    });

    return profile;
  }

  // Vector search helper (simplified to use events table)
  async searchSimilarMemories(userId: string, query: string, limit: number = 5): Promise<MemoryEntry[]> {
    try {
      // Search through event_data for memory entries
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_type', 'memory_set')
        .like('session_id', `${userId}%`)
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to filter

      if (error || !data) return [];

      // Filter and map results
      return data
        .filter(entry => {
          const eventData = entry.event_data as any;
          const memoryValue = String(eventData?.memory_value || '');
          return memoryValue.toLowerCase().includes(query.toLowerCase());
        })
        .slice(0, limit)
        .map(entry => {
          const eventData = entry.event_data as any;
          return {
            id: entry.id,
            user_id: eventData?.user_id || userId,
            memory_type: eventData?.memory_type || 'unknown',
            memory_key: eventData?.memory_key || 'unknown',
            memory_value: this.tryParseJSON(String(eventData?.memory_value || '')),
            confidence_score: eventData?.confidence_score,
            importance_weight: eventData?.importance_weight,
            expires_at: eventData?.expires_at,
            created_at: entry.created_at,
            updated_at: entry.created_at
          };
        });
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  // Cleanup expired memories using events table
  async cleanupExpiredMemories(): Promise<number> {
    try {
      // Get expired memory events
      const { data } = await supabase
        .from('events')
        .select('id, event_data')
        .eq('event_type', 'memory_set');

      if (!data) return 0;

      const expiredIds = data
        .filter(entry => {
          const eventData = entry.event_data as any;
          return eventData?.expires_at && new Date(eventData.expires_at) < new Date();
        })
        .map(entry => entry.id);

      if (expiredIds.length === 0) return 0;

      const { count } = await supabase
        .from('events')
        .delete({ count: 'exact' })
        .in('id', expiredIds);

      return count || 0;
    } catch (error) {
      console.error('Error cleaning up expired memories:', error);
      return 0;
    }
  }

  private tryParseJSON(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}

// Export singleton instance
export const memoryAPI = new MemoryAPI();