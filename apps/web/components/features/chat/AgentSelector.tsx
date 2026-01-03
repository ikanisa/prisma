'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bot, ChevronDown, Sparkles, Scale, Calculator, Building2 } from 'lucide-react';
import type { Agent } from '@/lib/api/gateway';

interface AgentSelectorProps {
    agents: Agent[];
    selectedAgent: Agent | null;
    onSelect: (agent: Agent) => void;
    loading?: boolean;
}

const categoryIcons: Record<string, React.ElementType> = {
    tax: Scale,
    audit: Sparkles,
    accounting: Calculator,
    corporate: Building2,
};

const categoryColors: Record<string, string> = {
    tax: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    audit: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    accounting: 'bg-green-500/10 text-green-500 border-green-500/20',
    corporate: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

export function AgentSelector({
    agents,
    selectedAgent,
    onSelect,
    loading,
}: AgentSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState<string | null>(null);

    const categories = ['tax', 'audit', 'accounting', 'corporate'];
    const filteredAgents = filter
        ? agents.filter((a) => a.category === filter)
        : agents;

    return (
        <div className="relative">
            {/* Selected Agent Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={loading}
                className="flex w-full items-center justify-between gap-2 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
            >
                <div className="flex items-center gap-3">
                    {selectedAgent ? (
                        <>
                            {(() => {
                                const Icon = categoryIcons[selectedAgent.category] || Bot;
                                return (
                                    <div
                                        className={cn(
                                            'flex h-10 w-10 items-center justify-center rounded-lg border',
                                            categoryColors[selectedAgent.category]
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </div>
                                );
                            })()}
                            <div>
                                <p className="font-medium">{selectedAgent.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                    {selectedAgent.category} Specialist
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                                <Sparkles className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-medium">Auto-Select Agent</p>
                                <p className="text-xs text-muted-foreground">
                                    Let AI choose the best expert
                                </p>
                            </div>
                        </>
                    )}
                </div>
                <ChevronDown
                    className={cn(
                        'h-5 w-5 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180'
                    )}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-hidden rounded-xl border bg-card shadow-lg">
                    {/* Category Filters */}
                    <div className="flex gap-1 border-b p-2">
                        <button
                            onClick={() => setFilter(null)}
                            className={cn(
                                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                                !filter
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                            )}
                        >
                            All
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={cn(
                                    'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                                    filter === cat
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Agent List */}
                    <div className="max-h-72 overflow-y-auto p-2">
                        {/* Auto-select option */}
                        <button
                            onClick={() => {
                                onSelect(null as any);
                                setIsOpen(false);
                            }}
                            className="mb-1 flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-gradient-to-br from-primary/20 to-purple-500/20">
                                <Sparkles className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Auto-Select</p>
                                <p className="text-xs text-muted-foreground">
                                    AI chooses the best expert
                                </p>
                            </div>
                        </button>

                        <div className="my-2 border-t" />

                        {filteredAgents.map((agent) => {
                            const Icon = categoryIcons[agent.category] || Bot;
                            return (
                                <button
                                    key={agent.id}
                                    onClick={() => {
                                        onSelect(agent);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted',
                                        selectedAgent?.id === agent.id && 'bg-muted'
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'flex h-8 w-8 items-center justify-center rounded-lg border',
                                            categoryColors[agent.category]
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="truncate text-sm font-medium">{agent.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {agent.jurisdictions.slice(0, 3).join(', ')}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
