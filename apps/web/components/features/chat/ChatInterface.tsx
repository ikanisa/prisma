'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { AgentSelector } from './AgentSelector';
import { gateway, type Agent, type AgentExecuteResponse, setGatewayAuth } from '@/lib/api/gateway';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    agentId?: string;
    agentName?: string;
    sources?: Array<{ source_name: string; page_url: string; similarity: number }>;
    timestamp: Date;
}

interface ChatInterfaceProps {
    initialAgentId?: string;
}

export function ChatInterface({ initialAgentId }: ChatInterfaceProps) {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sessionId = useRef(`session-${Date.now()}`);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Initialize: fetch agents and set auth
    useEffect(() => {
        async function init() {
            try {
                // Get auth token from Supabase
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    setGatewayAuth(session.access_token);
                }

                // Fetch available agents
                const response = await gateway.listAgents();
                setAgents(response.agents);

                // Pre-select agent if specified
                if (initialAgentId) {
                    const agent = response.agents.find((a) => a.id === initialAgentId);
                    if (agent) setSelectedAgent(agent);
                }

                setIsInitialized(true);
            } catch (err) {
                console.error('Failed to initialize chat:', err);
                setError('Failed to connect to AI service. Please try again.');
            }
        }

        init();
    }, [initialAgentId]);

    const handleSendMessage = useCallback(async (content: string) => {
        if (!content.trim()) return;

        // Add user message
        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);
        setError(null);

        try {
            let response: AgentExecuteResponse;
            let usedAgentId: string;
            let usedAgentName: string;

            if (selectedAgent) {
                // Execute specific agent
                response = await gateway.executeAgent(selectedAgent.id, {
                    message: content,
                    sessionId: sessionId.current,
                });
                usedAgentId = selectedAgent.id;
                usedAgentName = selectedAgent.name;
            } else {
                // Auto-route to best agent
                const routeResult = await gateway.autoRoute(content);
                const agent = agents.find((a) => a.id === routeResult.selectedAgent.id);

                if (!agent) {
                    throw new Error('Could not find appropriate agent');
                }

                response = await gateway.executeAgent(agent.id, {
                    message: content,
                    sessionId: sessionId.current,
                });
                usedAgentId = agent.id;
                usedAgentName = agent.name;
            }

            // Extract sources from tool calls
            const sources: Message['sources'] = [];
            if (response.toolCalls) {
                for (const call of response.toolCalls) {
                    if (call.result?.hits) {
                        sources.push(
                            ...call.result.hits.slice(0, 3).map((h) => ({
                                source_name: h.source_name,
                                page_url: h.page_url,
                                similarity: h.similarity,
                            }))
                        );
                    }
                }
            }

            // Add assistant message
            const assistantMessage: Message = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: response.output,
                agentId: usedAgentId,
                agentName: usedAgentName,
                sources: sources.length > 0 ? sources : undefined,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            console.error('Failed to execute agent:', err);
            setError(err instanceof Error ? err.message : 'Failed to get response');
        } finally {
            setIsLoading(false);
        }
    }, [selectedAgent, agents]);

    const handleClearChat = () => {
        setMessages([]);
        setError(null);
        sessionId.current = `session-${Date.now()}`;
    };

    if (!isInitialized) {
        return (
            <div className="flex h-full items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b bg-card p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <AgentSelector
                            agents={agents}
                            selectedAgent={selectedAgent}
                            onSelect={setSelectedAgent}
                            loading={isLoading}
                        />
                    </div>
                    {messages.length > 0 && (
                        <button
                            onClick={handleClearChat}
                            className="rounded-lg border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
                        >
                            Clear Chat
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <div className="mb-4 rounded-full bg-primary/10 p-4">
                            <svg
                                className="h-12 w-12 text-primary"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                />
                            </svg>
                        </div>
                        <h3 className="mb-2 text-lg font-semibold">Ask an Expert</h3>
                        <p className="max-w-sm text-sm text-muted-foreground">
                            Get instant answers about tax, audit, accounting, and corporate matters from our AI specialists.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {messages.map((message) => (
                            <MessageBubble
                                key={message.id}
                                role={message.role}
                                content={message.content}
                                agentName={message.agentName}
                                sources={message.sources}
                                timestamp={message.timestamp}
                            />
                        ))}
                        {isLoading && (
                            <MessageBubble
                                role="assistant"
                                content=""
                                isLoading
                                agentName={selectedAgent?.name || 'AI Expert'}
                            />
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {/* Input */}
            <div className="border-t bg-card p-4">
                <ChatInput
                    onSend={handleSendMessage}
                    disabled={isLoading}
                    placeholder={
                        selectedAgent
                            ? `Ask ${selectedAgent.name}...`
                            : 'Ask about tax, audit, or accounting...'
                    }
                />
            </div>
        </div>
    );
}
