/**
 * AgentList Component
 * 
 * Displays a grid of agent cards with filtering and search.
 */

import * as React from 'react';
import { AgentCard } from './AgentCard';
import { Agent } from '@/hooks/use-agents';
import { EmptyState } from '@/components/ui/EmptyState';
import { Loader2 } from 'lucide-react';

interface AgentListProps {
  agents: Agent[];
  isLoading?: boolean;
  emptyMessage?: string;
  onTestAgent?: (agent: Agent) => void;
  onDuplicateAgent?: (agent: Agent) => void;
}

export function AgentList({ 
  agents, 
  isLoading = false,
  emptyMessage = 'No agents found',
  onTestAgent,
  onDuplicateAgent,
}: AgentListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <EmptyState
        title="No agents"
        description={emptyMessage}
        icon="🤖"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <AgentCard 
          key={agent.id} 
          agent={agent}
          onTest={onTestAgent}
          onDuplicate={onDuplicateAgent}
        />
      ))}
    </div>
  );
}
