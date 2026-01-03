'use client';

import { cn } from '@/lib/utils';
import { Bot, User, ExternalLink } from 'lucide-react';

interface Source {
    source_name: string;
    page_url: string;
    similarity: number;
}

interface MessageBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    agentName?: string;
    timestamp?: Date;
    isLoading?: boolean;
}

export function MessageBubble({
    role,
    content,
    sources,
    agentName,
    timestamp,
    isLoading,
}: MessageBubbleProps) {
    const isUser = role === 'user';

    return (
        <div
            className={cn(
                'flex gap-3 p-4',
                isUser ? 'flex-row-reverse' : 'flex-row'
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                )}
            >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Message Content */}
            <div
                className={cn(
                    'flex max-w-[80%] flex-col gap-2',
                    isUser ? 'items-end' : 'items-start'
                )}
            >
                {/* Agent Name */}
                {!isUser && agentName && (
                    <span className="text-xs font-medium text-muted-foreground">
                        {agentName}
                    </span>
                )}

                {/* Message Bubble */}
                <div
                    className={cn(
                        'rounded-2xl px-4 py-3',
                        isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground',
                        isLoading && 'animate-pulse'
                    )}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ animationDelay: '0ms' }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ animationDelay: '150ms' }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ animationDelay: '300ms' }} />
                        </div>
                    ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {content}
                        </p>
                    )}
                </div>

                {/* Sources */}
                {sources && sources.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                        {sources.slice(0, 3).map((source, i) => (
                            <a
                                key={i}
                                href={source.page_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <ExternalLink className="h-3 w-3" />
                                {source.source_name}
                            </a>
                        ))}
                    </div>
                )}

                {/* Timestamp */}
                {timestamp && (
                    <span className="text-xs text-muted-foreground">
                        {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>
        </div>
    );
}
