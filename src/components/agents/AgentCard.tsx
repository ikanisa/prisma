/**
 * AgentCard Component
 * 
 * A card component for displaying agent information in grid/list views.
 * Shows agent status, type, and quick actions.
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bot,
  MoreVertical,
  Copy,
  Trash2,
  Play,
  Eye,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { Agent } from '@/hooks/use-agents';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  assistant: <Bot className="h-5 w-5" />,
  specialist: <Sparkles className="h-5 w-5" />,
  orchestrator: <Settings className="h-5 w-5" />,
  evaluator: <Eye className="h-5 w-5" />,
  autonomous: <Play className="h-5 w-5" />,
};

const TYPE_LABELS: Record<string, string> = {
  assistant: 'Assistant',
  specialist: 'Specialist',
  orchestrator: 'Orchestrator',
  evaluator: 'Evaluator',
  autonomous: 'Autonomous',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  testing: 'bg-yellow-500',
  active: 'bg-green-500',
  deprecated: 'bg-orange-500',
  archived: 'bg-red-500',
};

export interface AgentCardProps {
  agent: Agent;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onTest?: (id: string) => void;
  compact?: boolean;
}

export function AgentCard({
  agent,
  onDuplicate,
  onDelete,
  onTest,
  compact = false,
}: AgentCardProps) {
  const icon = TYPE_ICONS[agent.type] || <Bot className="h-5 w-5" />;
  const typeLabel = TYPE_LABELS[agent.type] || agent.type;
  const statusColor = STATUS_COLORS[agent.status] || 'bg-gray-500';

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link 
                to={`/admin/agents/${agent.id}`}
                className="font-medium hover:underline"
              >
                {agent.name}
              </Link>
              <Badge variant="outline" className="text-xs">
                {typeLabel}
              </Badge>
              <Badge 
                variant="secondary" 
                className={`${statusColor} text-white text-xs`}
              >
                {agent.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {agent.description || 'No description'} • v{agent.version}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/admin/agents/${agent.id}`}>View</Link>
          </Button>
          <AgentCardMenu
            agentId={agent.id}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onTest={onTest}
          />
        </div>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">
                <Link 
                  to={`/admin/agents/${agent.id}`}
                  className="hover:underline"
                >
                  {agent.name}
                </Link>
              </CardTitle>
              <CardDescription className="text-xs">
                {typeLabel} • v{agent.version}
              </CardDescription>
            </div>
          </div>
          <AgentCardMenu
            agentId={agent.id}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onTest={onTest}
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {agent.description || 'No description provided'}
        </p>
        <div className="flex items-center justify-between">
          <Badge 
            variant="secondary" 
            className={`${statusColor} text-white`}
          >
            {agent.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Updated {new Date(agent.updated_at).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentCardMenu({
  agentId,
  onDuplicate,
  onDelete,
  onTest,
}: {
  agentId: string;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onTest?: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/admin/agents/${agentId}`}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/admin/agents/${agentId}/personas`}>
            <Sparkles className="mr-2 h-4 w-4" />
            Edit Personas
          </Link>
        </DropdownMenuItem>
        {onTest && (
          <DropdownMenuItem onClick={() => onTest(agentId)}>
            <Play className="mr-2 h-4 w-4" />
            Test Agent
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {onDuplicate && (
          <DropdownMenuItem onClick={() => onDuplicate(agentId)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem 
            onClick={() => onDelete(agentId)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AgentCard;
