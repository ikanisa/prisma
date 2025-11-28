/**
 * PersonaService - Business logic for Agent Persona operations
 * 
 * Manages agent personas including system prompts, personality traits,
 * and configuration parameters.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Persona,
  CreatePersonaInput,
  UpdatePersonaInput,
} from '../schemas/persona.schema.js';

export class PersonaService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new persona for an agent
   */
  async create(agentId: string, data: CreatePersonaInput): Promise<Persona> {
    // If this persona is set as active, deactivate others first
    if (data.is_active) {
      await this.deactivateAllPersonas(agentId);
    }

    const { data: persona, error } = await this.supabase
      .from('agent_personas')
      .insert({
        ...data,
        agent_id: agentId,
        version: 1,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create persona: ${error.message}`);
    }

    return persona as Persona;
  }

  /**
   * List all personas for an agent
   */
  async listByAgentId(agentId: string): Promise<Persona[]> {
    const { data, error } = await this.supabase
      .from('agent_personas')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to list personas: ${error.message}`);
    }

    return (data || []) as Persona[];
  }

  /**
   * Get a single persona by ID
   */
  async getById(id: string): Promise<Persona | null> {
    const { data, error } = await this.supabase
      .from('agent_personas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get persona: ${error.message}`);
    }

    return data as Persona;
  }

  /**
   * Update an existing persona
   */
  async update(id: string, data: UpdatePersonaInput): Promise<Persona> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Persona not found');
    }

    // If setting this persona as active, deactivate others first
    if (data.is_active) {
      await this.deactivateAllPersonas(existing.agent_id);
    }

    const { data: persona, error } = await this.supabase
      .from('agent_personas')
      .update({
        ...data,
        version: existing.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update persona: ${error.message}`);
    }

    return persona as Persona;
  }

  /**
   * Delete a persona
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('agent_personas')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete persona: ${error.message}`);
    }
  }

  /**
   * Activate a persona (set as the active persona for the agent)
   */
  async activate(id: string): Promise<Persona> {
    const persona = await this.getById(id);
    if (!persona) {
      throw new Error('Persona not found');
    }

    // Deactivate all other personas for this agent
    await this.deactivateAllPersonas(persona.agent_id);

    // Activate the specified persona
    const { data: updated, error } = await this.supabase
      .from('agent_personas')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to activate persona: ${error.message}`);
    }

    return updated as Persona;
  }

  /**
   * Test a persona with sample input
   */
  async test(id: string, inputText: string): Promise<{
    output: string;
    latency_ms: number;
  }> {
    const persona = await this.getById(id);
    if (!persona) {
      throw new Error('Persona not found');
    }

    const startTime = Date.now();

    // TODO: Integrate with actual AI execution
    // This is a placeholder
    const mockOutput = `[Persona Test] Using persona "${persona.name}"\n` +
      `System prompt preview: "${persona.system_prompt.substring(0, 100)}..."\n` +
      `Temperature: ${persona.temperature}\n` +
      `Input received: "${inputText.substring(0, 50)}..."`;

    return {
      output: mockOutput,
      latency_ms: Date.now() - startTime + 50,
    };
  }

  /**
   * Get version history for a persona
   */
  async getVersionHistory(id: string): Promise<Array<{
    version: number;
    updated_at: string;
    system_prompt_preview: string;
  }>> {
    // Note: This would require a separate version history table
    // For now, return current version info
    const persona = await this.getById(id);
    if (!persona) {
      return [];
    }

    return [{
      version: persona.version,
      updated_at: persona.updated_at,
      system_prompt_preview: persona.system_prompt.substring(0, 100) + '...',
    }];
  }

  // Private helper methods

  private async deactivateAllPersonas(agentId: string): Promise<void> {
    await this.supabase
      .from('agent_personas')
      .update({ is_active: false })
      .eq('agent_id', agentId);
  }
}
