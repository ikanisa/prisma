'use client';

import { useState, useCallback } from 'react';
import { gateway, setGatewayAuth } from '@/lib/api/gateway';
import { createClient } from '@/lib/supabase/client';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface QuickAskProps {
    placeholder?: string;
    contextHint?: string;
}

export function QuickAsk({ placeholder, contextHint }: QuickAskProps) {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState<string | null>(null);
    const [agentName, setAgentName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            // Set auth
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                setGatewayAuth(session.access_token);
            }

            // Auto-route to best agent
            const routeResult = await gateway.autoRoute(query);
            const result = await gateway.executeAgent(routeResult.selectedAgent.id, {
                message: query,
            });

            setResponse(result.output);
            setAgentName(routeResult.selectedAgent.name);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get response');
        } finally {
            setIsLoading(false);
        }
    }, [query, isLoading]);

    return (
        <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-purple-500/5 p-6">
            <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Quick Ask</h3>
                {contextHint && (
                    <span className="ml-auto text-xs text-muted-foreground">
                        {contextHint}
                    </span>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={placeholder || 'Ask about tax, audit, or accounting...'}
                        disabled={isLoading}
                        className="w-full rounded-lg border bg-background px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </button>
                </div>

                {/* Response */}
                {response && (
                    <div className="rounded-lg bg-muted/50 p-4">
                        {agentName && (
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                {agentName}
                            </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{response}</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}
            </form>
        </div>
    );
}
