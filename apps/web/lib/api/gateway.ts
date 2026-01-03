/**
 * Gateway API Client
 * 
 * Type-safe client for communicating with the Prisma Glow Gateway API
 */

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';

// ============================================================================
// TYPES
// ============================================================================

export interface Agent {
    id: string;
    category: 'tax' | 'audit' | 'accounting' | 'corporate';
    name: string;
    description?: string;
    jurisdictions: string[];
    tools: string[];
    engine: 'openai' | 'gemini';
    routingTags?: string[];
}

export interface AgentListResponse {
    count: number;
    agents: Agent[];
}

export interface AgentExecuteRequest {
    message: string;
    jurisdictionCode?: string;
    sessionId?: string;
}

export interface ToolCall {
    name: string;
    arguments: Record<string, any>;
    result?: {
        hits?: Array<{
            source_name: string;
            page_url: string;
            similarity: number;
            chunk_text?: string;
        }>;
    };
}

export interface AgentExecuteResponse {
    agentId: string;
    engine: 'openai' | 'gemini';
    output: string;
    toolCalls?: ToolCall[];
    executionTime: number;
    metadata?: Record<string, any>;
}

export interface AutoRouteResponse {
    selectedAgent: {
        id: string;
        name: string;
        category: string;
        reason: string;
    };
    message: string;
}

export interface GatewayError {
    error: string;
    message?: string;
    details?: any;
}

// ============================================================================
// API CLIENT
// ============================================================================

class GatewayClient {
    private baseUrl: string;
    private authToken: string | null = null;

    constructor(baseUrl: string = GATEWAY_URL) {
        this.baseUrl = baseUrl;
    }

    setAuthToken(token: string) {
        this.authToken = token;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}/api/v1${endpoint}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.authToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${this.authToken}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error: GatewayError = await response.json().catch(() => ({
                error: 'Request failed',
                message: response.statusText,
            }));
            throw new Error(error.message || error.error);
        }

        return response.json();
    }

    // -------------------------------------------------------------------------
    // SPECIALIST AGENTS
    // -------------------------------------------------------------------------

    /**
     * List all available specialist agents
     */
    async listAgents(filters?: {
        category?: string;
        jurisdiction?: string;
    }): Promise<AgentListResponse> {
        const params = new URLSearchParams();
        if (filters?.category) params.set('category', filters.category);
        if (filters?.jurisdiction) params.set('jurisdiction', filters.jurisdiction);

        const query = params.toString();
        return this.request<AgentListResponse>(
            `/specialist-agents${query ? `?${query}` : ''}`
        );
    }

    /**
     * Get details of a specific agent
     */
    async getAgent(agentId: string): Promise<Agent> {
        return this.request<Agent>(`/specialist-agents/${agentId}`);
    }

    /**
     * Execute an agent with a user message
     */
    async executeAgent(
        agentId: string,
        request: AgentExecuteRequest
    ): Promise<AgentExecuteResponse> {
        return this.request<AgentExecuteResponse>(
            `/specialist-agents/${agentId}/execute`,
            {
                method: 'POST',
                body: JSON.stringify(request),
            }
        );
    }

    /**
     * Auto-route a query to the most appropriate agent
     */
    async autoRoute(
        message: string,
        context?: { jurisdictionCode?: string; category?: string }
    ): Promise<AutoRouteResponse> {
        return this.request<AutoRouteResponse>('/specialist-agents/auto-route', {
            method: 'POST',
            body: JSON.stringify({ message, context }),
        });
    }

    // -------------------------------------------------------------------------
    // HEALTH CHECK
    // -------------------------------------------------------------------------

    async healthCheck(): Promise<{ status: string; services: Record<string, string> }> {
        const response = await fetch(`${this.baseUrl}/health`);
        return response.json();
    }
}

// Singleton instance
export const gateway = new GatewayClient();

// Helper to set auth from Supabase session
export function setGatewayAuth(accessToken: string) {
    gateway.setAuthToken(accessToken);
}
