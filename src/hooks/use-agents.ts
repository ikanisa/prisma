/**
 * React hooks for AI Agent System API.
 * 
 * Provides data fetching, mutations, and cache management for agents and personas.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { UUID } from 'crypto';

// Types matching backend schemas
export interface Agent {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  description?: string;
  avatar_url?: string;
  type: 'assistant' | 'specialist' | 'orchestrator' | 'evaluator' | 'autonomous';
  category?: string;
  status: 'draft' | 'testing' | 'active' | 'deprecated' | 'archived';
  is_public: boolean;
  version: string;
  parent_version_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface Persona {
  id: string;
  agent_id: string;
  name: string;
  role?: string;
  system_prompt: string;
  personality_traits: string[];
  communication_style: 'professional' | 'friendly' | 'concise' | 'detailed' | 'technical';
  temperature: number;
  pii_handling: 'redact' | 'mask' | 'warn' | 'allow';
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AgentListResponse {
  agents: Agent[];
  total: number;
  page: number;
  page_size: number;
}

export interface ExecutionResponse {
  id: string;
  output_text: string;
  latency_ms: number;
  created_at: string;
}

// API base URL
const API_BASE = '/api/v1/agents';

// Fetch helper
async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================
// Agent Hooks
// ============================================

/**
 * Fetch paginated list of agents with filters
 */
export function useAgents(params?: {
  page?: number;
  page_size?: number;
  type?: string;
  status?: string;
  search?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.page_size) queryParams.set('page_size', params.page_size.toString());
  if (params?.type) queryParams.set('type', params.type);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.search) queryParams.set('search', params.search);

  return useQuery<AgentListResponse>({
    queryKey: ['agents', params],
    queryFn: () => fetchAPI<AgentListResponse>(`${API_BASE}?${queryParams}`),
  });
}

/**
 * Fetch single agent by ID
 */
export function useAgent(agentId: string | undefined, options?: UseQueryOptions<Agent>) {
  return useQuery<Agent>({
    queryKey: ['agents', agentId],
    queryFn: () => fetchAPI<Agent>(`${API_BASE}/${agentId}`),
    enabled: !!agentId,
    ...options,
  });
}

/**
 * Create new agent
 */
export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Agent>) =>
      fetchAPI<Agent>(API_BASE, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

/**
 * Update existing agent
 */
export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) =>
      fetchAPI<Agent>(`${API_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agents', variables.id] });
    },
  });
}

/**
 * Delete agent (soft delete/archive)
 */
export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`${API_BASE}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

/**
 * Publish agent (set to active status)
 */
export function usePublishAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI<Agent>(`${API_BASE}/${id}/publish`, { method: 'POST' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agents', id] });
    },
  });
}

/**
 * Execute agent with input text
 */
export function useExecuteAgent() {
  return useMutation({
    mutationFn: ({ id, input_text, persona_id }: {
      id: string;
      input_text: string;
      persona_id?: string;
    }) =>
      fetchAPI<ExecutionResponse>(`${API_BASE}/${id}/execute`, {
        method: 'POST',
        body: JSON.stringify({ input_text, persona_id }),
      }),
  });
}

/**
 * Get agent execution statistics
 */
export function useAgentStats(agentId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['agents', agentId, 'stats', days],
    queryFn: () =>
      fetchAPI(`${API_BASE}/${agentId}/stats?days=${days}`),
    enabled: !!agentId,
  });
}

// ============================================
// Persona Hooks
// ============================================

/**
 * Fetch all personas for an agent
 */
export function usePersonas(agentId: string | undefined) {
  return useQuery<Persona[]>({
    queryKey: ['agents', agentId, 'personas'],
    queryFn: () => fetchAPI<Persona[]>(`${API_BASE}/${agentId}/personas`),
    enabled: !!agentId,
  });
}

/**
 * Fetch single persona
 */
export function usePersona(agentId: string | undefined, personaId: string | undefined) {
  return useQuery<Persona>({
    queryKey: ['agents', agentId, 'personas', personaId],
    queryFn: () => fetchAPI<Persona>(`${API_BASE}/${agentId}/personas/${personaId}`),
    enabled: !!agentId && !!personaId,
  });
}

/**
 * Create new persona for an agent
 */
export function useCreatePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: Partial<Persona> }) =>
      fetchAPI<Persona>(`${API_BASE}/${agentId}/personas`, {
        method: 'POST',
        body: JSON.stringify({ ...data, agent_id: agentId }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'personas'] });
    },
  });
}

/**
 * Update existing persona
 */
export function useUpdatePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agentId,
      personaId,
      data,
    }: {
      agentId: string;
      personaId: string;
      data: Partial<Persona>;
    }) =>
      fetchAPI<Persona>(`${API_BASE}/${agentId}/personas/${personaId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'personas'] });
      queryClient.invalidateQueries({
        queryKey: ['agents', variables.agentId, 'personas', variables.personaId],
      });
    },
  });
}

/**
 * Delete persona
 */
export function useDeletePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, personaId }: { agentId: string; personaId: string }) =>
      fetchAPI(`${API_BASE}/${agentId}/personas/${personaId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'personas'] });
    },
  });
}
