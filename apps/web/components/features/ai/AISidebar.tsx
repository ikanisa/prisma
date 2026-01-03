'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { gateway, setGatewayAuth, type Agent } from '@/lib/api/gateway';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
    MessageSquare,
    X,
    ChevronRight,
    Send,
    Loader2,
    Sparkles,
    Scale,
    Calculator,
    ClipboardCheck,
} from 'lucide-react';

const categoryIcons: Record<string, React.ElementType> = {
    tax: Scale,
    audit: ClipboardCheck,
    accounting: Calculator,
};

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AISidebarProps {
    defaultAgentId?: string;
    category: 'tax' | 'audit' | 'accounting';
    title?: string;
    placeholder?: string;
}

export function AISidebar({
    defaultAgentId,
    category,
    title,
    placeholder,
}: AISidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [agent, setAgent] = useState<Agent | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const Icon = categoryIcons[category] || Sparkles;

    // Load default agent on mount
    useEffect(() => {
        async function loadAgent() {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    setGatewayAuth(session.access_token);
                }

                const response = await gateway.listAgents({ category });
                if (response.agents.length > 0) {
                    const selectedAgent = defaultAgentId
                        ? response.agents.find((a) => a.id === defaultAgentId)
                        : response.agents[0];
                    setAgent(selectedAgent || response.agents[0]);
                }
            } catch (err) {
                console.error('Failed to load agent:', err);
            }
        }
        loadAgent();
    }, [category, defaultAgentId]);

    // Scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isLoading || !agent) return;

        const userQuery = query.trim();
        setQuery('');
        setMessages((prev) => [...prev, { role: 'user', content: userQuery }]);
        setIsLoading(true);

        try {
            const response = await gateway.executeAgent(agent.id, { message: userQuery });
            setMessages((prev) => [...prev, { role: 'assistant', content: response.output }]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [query, isLoading, agent]);

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-xl border border-r-0 bg-card p-3 shadow-lg transition-all hover:bg-muted',
                    isOpen && 'translate-x-80'
                )}
            >
                {isOpen ? (
                    <ChevronRight className="h-5 w-5" />
                ) : (
                    <MessageSquare className="h-5 w-5 text-primary" />
                )}
            </button>

            {/* Sidebar */}
            <div
                className={cn(
                    'fixed right-0 top-0 z-30 h-full w-80 border-l bg-card shadow-xl transition-transform duration-300',
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                )}
            >
                {/* Header */}
                <div className="flex items-center gap-3 border-b px-4 py-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                        <h3 className="font-semibold">{title || `${category.charAt(0).toUpperCase() + category.slice(1)} AI`}</h3>
                        {agent && (
                            <p className="text-xs text-muted-foreground truncate">{agent.name}</p>
                        )}
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100% - 120px)' }}>
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Icon className="h-10 w-10 text-muted-foreground/50 mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {placeholder || `Ask about ${category} standards, rules, or best practices...`}
                            </p>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        'rounded-xl px-3 py-2 text-sm',
                                        msg.role === 'user'
                                            ? 'ml-auto max-w-[85%] bg-primary text-primary-foreground'
                                            : 'mr-auto max-w-[85%] bg-muted text-foreground'
                                    )}
                                >
                                    {msg.content}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="mr-auto rounded-xl bg-muted px-3 py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="absolute bottom-0 left-0 right-0 border-t bg-card p-3">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={`Ask ${agent?.name || 'AI'}...`}
                            disabled={isLoading || !agent}
                            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !query.trim() || !agent}
                            className="rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
