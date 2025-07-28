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
  // Simple key-value memory operations
  async setMemory(userId: string, type: string, key: string, value: any, options: {
    confidence?: number;
    importance?: number;
    expiresAt?: Date;
  } = {}): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agent_memory_enhanced')
        .upsert({
          user_id: userId,
          memory_type: type,
          memory_key: key,
          memory_value: typeof value === 'string' ? value : JSON.stringify(value),
          confidence_score: options.confidence || 1.0,
          importance_weight: options.importance || 1.0,
          expires_at: options.expiresAt?.toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,memory_type,memory_key'
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
        .from('agent_memory_enhanced')
        .select('memory_value, expires_at')
        .eq('user_id', userId)
        .eq('memory_type', type)
        .eq('memory_key', key)
        .single();

      if (error || !data) return null;

      // Check if memory has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        await this.deleteMemory(userId, type, key);
        return null;
      }

      // Try to parse JSON, fallback to string
      try {
        return JSON.parse(String(data.memory_value));
      } catch {
        return String(data.memory_value);
      }
    } catch (error) {
      console.error('Error getting memory:', error);
      return null;
    }
  }

  async deleteMemory(userId: string, type: string, key: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agent_memory_enhanced')
        .delete()
        .eq('user_id', userId)
        .eq('memory_type', type)
        .eq('memory_key', key);

      return !error;
    } catch (error) {
      console.error('Error deleting memory:', error);
      return false;
    }
  }

  async getAllMemory(userId: string, type?: string): Promise<MemoryEntry[]> {
    try {
      let query = supabase
        .from('agent_memory_enhanced')
        .select('*')
        .eq('user_id', userId);

      if (type) {
        query = query.eq('memory_type', type);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error || !data) return [];

      return data.map(entry => ({
        ...entry,
        memory_value: this.tryParseJSON(String(entry.memory_value))
      }));
    } catch (error) {
      console.error('Error getting all memory:', error);
      return [];
    }
  }

  // Conversation state management
  async setConversationState(phoneNumber: string, flowName: string, currentStep: string, data: Record<string, any>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversation_flows')
        .upsert({
          phone_number: phoneNumber,
          flow_name: flowName,
          current_step: currentStep,
          flow_data: data,
          status: 'active'
        }, {
          onConflict: 'phone_number,flow_name'
        });

      return !error;
    } catch (error) {
      console.error('Error setting conversation state:', error);
      return false;
    }
  }

  async getConversationState(phoneNumber: string, flowName?: string): Promise<ConversationState | null> {
    try {
      let query = supabase
        .from('conversation_flows')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('status', 'active');

      if (flowName) {
        query = query.eq('flow_name', flowName);
      }

      const { data, error } = await query
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      return error || !data ? null : {
        ...data,
        flow_data: typeof data.flow_data === 'string' ? JSON.parse(data.flow_data) : data.flow_data
      } as ConversationState;
    } catch (error) {
      console.error('Error getting conversation state:', error);
      return null;
    }
  }

  async completeConversationFlow(phoneNumber: string, flowName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversation_flows')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('phone_number', phoneNumber)
        .eq('flow_name', flowName)
        .eq('status', 'active');

      return !error;
    } catch (error) {
      console.error('Error completing conversation flow:', error);
      return false;
    }
  }

  async abandonConversationFlow(phoneNumber: string, flowName?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('conversation_flows')
        .update({
          status: 'abandoned',
          completed_at: new Date().toISOString()
        })
        .eq('phone_number', phoneNumber)
        .eq('status', 'active');

      if (flowName) {
        query = query.eq('flow_name', flowName);
      }

      const { error } = await query;
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

  // Vector search helper (if needed)
  async searchSimilarMemories(userId: string, query: string, limit: number = 5): Promise<MemoryEntry[]> {
    // Placeholder for vector search functionality
    // Would require vector embeddings and similarity search
    try {
      const { data, error } = await supabase
        .from('agent_memory_enhanced')
        .select('*')
        .eq('user_id', userId)
        .ilike('memory_value', `%${query}%`)
        .order('importance_weight', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map(entry => ({
        ...entry,
        memory_value: this.tryParseJSON(String(entry.memory_value))
      }));
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  // Cleanup expired memories
  async cleanupExpiredMemories(): Promise<number> {
    try {
      const { count } = await supabase
        .from('agent_memory_enhanced')
        .delete({ count: 'exact' })
        .lt('expires_at', new Date().toISOString());

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