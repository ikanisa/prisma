import { SupabaseClient } from '@supabase/supabase-js';

export interface Conversation {
  id: string;
  userId: string;
  agentId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export class ConversationPersistence {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, agentId: string, title?: string): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        user_id: userId,
        agent_id: agentId,
        title,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);

    return this.mapConversation(data);
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get conversation: ${error.message}`);
    }

    return this.mapConversation(data);
  }

  /**
   * List user's conversations
   */
  async listConversations(userId: string, limit = 50, offset = 0): Promise<Conversation[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to list conversations: ${error.message}`);

    return data.map(this.mapConversation);
  }

  /**
   * List conversations by agent
   */
  async listConversationsByAgent(userId: string, agentId: string): Promise<Conversation[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to list conversations: ${error.message}`);

    return data.map(this.mapConversation);
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const { error } = await this.supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId);

    if (error) throw new Error(`Failed to update conversation: ${error.message}`);
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): Promise<ConversationMessage> {
    const { data, error } = await this.supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        metadata,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add message: ${error.message}`);

    return this.mapMessage(data);
  }

  /**
   * Get conversation messages
   */
  async getMessages(conversationId: string): Promise<ConversationMessage[]> {
    const { data, error } = await this.supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to get messages: ${error.message}`);

    return data.map(this.mapMessage);
  }

  /**
   * Get conversation with messages
   */
  async getConversationWithMessages(conversationId: string): Promise<{
    conversation: Conversation;
    messages: ConversationMessage[];
  } | null> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return null;

    const messages = await this.getMessages(conversationId);

    return { conversation, messages };
  }

  /**
   * Search conversations by content
   */
  async searchConversations(userId: string, query: string): Promise<Conversation[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%`)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to search conversations: ${error.message}`);

    return data.map(this.mapConversation);
  }

  private mapConversation(data: any): Conversation {
    return {
      id: data.id,
      userId: data.user_id,
      agentId: data.agent_id,
      title: data.title,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      metadata: data.metadata,
    };
  }

  private mapMessage(data: any): ConversationMessage {
    return {
      id: data.id,
      conversationId: data.conversation_id,
      role: data.role,
      content: data.content,
      createdAt: new Date(data.created_at),
      metadata: data.metadata,
    };
  }
}
