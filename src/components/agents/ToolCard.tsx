/**
 * ToolCard Component
 * 
 * Displays an individual tool with configuration and actions.
 */

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Play, Trash2, Link2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  is_public: boolean;
  requires_approval: boolean;
  usage_count: number;
}

interface ToolCardProps {
  tool: Tool;
  onTest?: (tool: Tool) => void;
  onDelete?: (tool: Tool) => void;
}

export function ToolCard({ tool, onTest, onDelete }: ToolCardProps) {
  const categoryColors: Record<string, string> = {
    calculation: 'blue',
    'data-retrieval': 'green',
    transformation: 'purple',
    validation: 'orange',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{tool.name}</CardTitle>
            <CardDescription className="text-xs mt-1">{tool.description}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTest?.(tool)}>
                <Play className="mr-2 h-4 w-4" />
                Test
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(tool)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge>{tool.category}</Badge>
          {tool.is_public && <Badge variant="outline">Public</Badge>}
          {tool.requires_approval && <Badge variant="secondary">Requires Approval</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">
          <div>Usage: {tool.usage_count} times</div>
        </div>
      </CardContent>
    </Card>
  );
}
