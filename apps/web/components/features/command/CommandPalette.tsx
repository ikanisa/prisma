'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useCommand } from './CommandProvider';
import { gateway, setGatewayAuth, type Agent } from '@/lib/api/gateway';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
    Search,
    X,
    Sparkles,
    Scale,
    Calculator,
    ClipboardCheck,
    Building2,
    ArrowRight,
    Loader2,
    MessageSquare,
} from 'lucide-react';

const categoryIcons: Record<string, React.ElementType> = {
    tax: Scale,
    audit: ClipboardCheck,
    accounting: Calculator,
    corporate: Building2,
};

const categoryColors: Record<string, string> = {
    tax: 'text-blue-500',
    audit: 'text-purple-500',
    accounting: 'text-green-500',
    corporate: 'text-orange-500',
};

interface Message {
    role: 'user' | 'assistant';
    content: string;
    agentName?: string;
}

export function CommandPalette() {
    const { isOpen, close, currentPage } = useCommand();
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<'search' | 'chat'>('search');
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize on first open
    useEffect(() => {
        if (isOpen && !isInitialized) {
            initializeAgents();
        }
    }, [isOpen, isInitialized]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            // Reset state when closed
            setQuery('');
            setMode('search');
            setMessages([]);
            setSelectedAgent(null);
        }
    }, [isOpen]);

    // Scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Note: Keyboard shortcuts handled by CommandKeyListener

    async function initializeAgents() {
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                setGatewayAuth(session.access_token);
            }
            const response = await gateway.listAgents();
            setAgents(response.agents);
            setIsInitialized(true);
        } catch (err) {
            console.error('Failed to load agents:', err);
        }
    }

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isLoading) return;

        const userQuery = query.trim();
        setQuery('');
        setMode('chat');
        setMessages((prev) => [...prev, { role: 'user', content: userQuery }]);
        setIsLoading(true);

        try {
            let response;
            let agentName = 'AI Assistant';

            if (selectedAgent) {
                response = await gateway.executeAgent(selectedAgent.id, { message: userQuery });
                agentName = selectedAgent.name;
            } else {
                // Auto-route to best agent
                const routeResult = await gateway.autoRoute(userQuery, {
                    category: currentPage === 'audit' ? 'audit' :
                        currentPage === 'accounting' ? 'accounting' : undefined,
                });
                const agent = agents.find((a) => a.id === routeResult.selectedAgent.id);
                if (agent) {
                    response = await gateway.executeAgent(agent.id, { message: userQuery });
                    agentName = agent.name;
                    setSelectedAgent(agent);
                }
            }

            if (response) {
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: response.output, agentName },
                ]);
            }
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [query, isLoading, selectedAgent, agents, currentPage]);

    const filteredAgents = query
        ? agents.filter(
            (a) =>
                a.name.toLowerCase().includes(query.toLowerCase()) ||
                a.category.toLowerCase().includes(query.toLowerCase())
        )
        : agents.slice(0, 6);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={close}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 border-b px-4 py-3">
                    {mode === 'chat' && selectedAgent ? (
                        <>
                            {(() => {
                                const Icon = categoryIcons[selectedAgent.category] || Sparkles;
                                return <Icon className={cn('h-5 w-5', categoryColors[selectedAgent.category])} />;
                            })()}
                            <span className="text-sm font-medium">{selectedAgent.name}</span>
                            <button
                                onClick={() => {
                                    setMode('search');
                                    setSelectedAgent(null);
                                    setMessages([]);
                                }}
                                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                            >
                                Change agent
                            </button>
                        </>
                    ) : (
                        <>
                            <Search className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                Ask anything about tax, audit, or accounting...
                            </span>
                        </>
                    )}
                    <button
                        onClick={close}
                        className="ml-auto rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Chat Messages */}
                {mode === 'chat' && messages.length > 0 && (
                    <div className="max-h-80 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={cn(
                                    'flex gap-3',
                                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                                )}
                            >
                                <div
                                    className={cn(
                                        'max-w-[85%] rounded-2xl px-4 py-2.5',
                                        msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-foreground'
                                    )}
                                >
                                    {msg.role === 'assistant' && msg.agentName && (
                                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                                            {msg.agentName}
                                        </p>
                                    )}
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="rounded-2xl bg-muted px-4 py-3">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                {/* Agent Selection */}
                {mode === 'search' && !query && (
                    <div className="p-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Specialist Agents
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {filteredAgents.map((agent) => {
                                const Icon = categoryIcons[agent.category] || Sparkles;
                                return (
                                    <button
                                        key={agent.id}
                                        onClick={() => {
                                            setSelectedAgent(agent);
                                            setMode('chat');
                                            inputRef.current?.focus();
                                        }}
                                        className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                                    >
                                        <Icon className={cn('h-5 w-5', categoryColors[agent.category])} />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="truncate text-sm font-medium">{agent.name}</p>
                                            <p className="truncate text-xs text-muted-foreground capitalize">
                                                {agent.category}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Input */}
                <form onSubmit={handleSubmit} className="border-t p-3">
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={
                                selectedAgent
                                    ? `Ask ${selectedAgent.name}...`
                                    : 'Type a question or select an agent...'
                            }
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            disabled={isLoading}
                        />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">↵</kbd>
                            <span>to send</span>
                            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">esc</kbd>
                            <span>to close</span>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
