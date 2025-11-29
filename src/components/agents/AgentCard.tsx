/**
 * AgentCard Component
 * 
 * Displays an individual agent with key information and actions.
 */

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Agent, useDeleteAgent, usePublishAgent } from '@/hooks/use-agents';
import { MoreHorizontal, Edit, Play, Copy, Archive, Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import { toast } from '@/components/ui/use-toast';

interface AgentCardProps {
  agent: Agent;
  onTest?: (agent: Agent) => void;
  onDuplicate?: (agent: Agent) => void;
}

const statusColors = {
  draft: 'secondary',
  testing: 'warning',
  active: 'success',
  deprecated: 'destructive',
  archived: 'outline',
} as const;

const typeIcons: Record<Agent['type'], string> = {
  assistant: '🤖',
  specialist: '🎓',
  orchestrator: '🎭',
  evaluator: '⚖️',
  autonomous: '🚀',
};

export function AgentCard({ agent, onTest, onDuplicate }: AgentCardProps) {
  const router = useRouter();
  const deleteAgent = useDeleteAgent();
  const publishAgent = usePublishAgent();

  const handleEdit = () => {
    router.push(`/admin/agents/${agent.id}`);
  };

  const handleTest = () => {
    if (onTest) {
      onTest(agent);
    } else {
      router.push(`/admin/agents/${agent.id}/test`);
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(agent);
    }
  };

  const handlePublish = async () => {
    try {
      await publishAgent.mutateAsync(agent.id);
      toast({
        title: 'Agent published',
        description: `${agent.name} is now active and ready to use.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to publish',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteAgent.mutateAsync(agent.id);
      toast({
        title: 'Agent deleted',
        description: `${agent.name} has been removed.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to delete',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label={agent.type}>
              {typeIcons[agent.type]}
            </span>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <CardDescription className="text-xs">{agent.slug}</CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleTest}>
                <Play className="mr-2 h-4 w-4" />
                Test
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {agent.status !== 'active' && (
                <DropdownMenuItem onClick={handlePublish}>
                  <Archive className="mr-2 h-4 w-4" />
                  Publish
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {agent.description || 'No description provided'}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant={statusColors[agent.status] as any}>
            {agent.status}
          </Badge>
          <Badge variant="outline">{agent.type}</Badge>
          {agent.category && (
            <Badge variant="outline">{agent.category}</Badge>
          )}
          {agent.is_public && (
            <Badge variant="outline">Public</Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit} className="flex-1">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleTest} className="flex-1">
            <Play className="mr-2 h-4 w-4" />
            Test
          </Button>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <div>Version: {agent.version}</div>
          <div>Updated: {new Date(agent.updated_at).toLocaleDateString()}</div>
        </div>
      </CardContent>
    </Card>
  );
}
