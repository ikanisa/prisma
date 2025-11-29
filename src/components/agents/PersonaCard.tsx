/**
 * PersonaCard Component
 * 
 * Displays an individual persona with configuration and actions.
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Persona, useDeletePersona, useUpdatePersona } from '@/hooks/use-agents';
import { MoreHorizontal, Edit, Play, CheckCircle2, Trash2, Copy } from 'lucide-react';
import { useRouter } from 'next/router';
import { toast } from '@/components/ui/use-toast';

interface PersonaCardProps {
  persona: Persona;
  onTest?: (persona: Persona) => void;
  onDuplicate?: (persona: Persona) => void;
}

const communicationStyleColors = {
  professional: 'default',
  friendly: 'secondary',
  concise: 'outline',
  detailed: 'default',
  technical: 'destructive',
} as const;

const piiHandlingColors = {
  redact: 'destructive',
  mask: 'warning',
  warn: 'secondary',
  allow: 'outline',
} as const;

export function PersonaCard({ persona, onTest, onDuplicate }: PersonaCardProps) {
  const router = useRouter();
  const deletePersona = useDeletePersona();
  const updatePersona = useUpdatePersona();

  const handleEdit = () => {
    router.push(`/admin/agents/${persona.agent_id}/personas/${persona.id}`);
  };

  const handleTest = () => {
    if (onTest) {
      onTest(persona);
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(persona);
    }
  };

  const handleActivate = async () => {
    try {
      await updatePersona.mutateAsync({
        agentId: persona.agent_id,
        personaId: persona.id,
        data: { is_active: true },
      });
      toast({
        title: 'Persona activated',
        description: `${persona.name} is now the active persona.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to activate',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${persona.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deletePersona.mutateAsync({
        agentId: persona.agent_id,
        personaId: persona.id,
      });
      toast({
        title: 'Persona deleted',
        description: `${persona.name} has been removed.`,
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
    <Card className={`hover:shadow-md transition-shadow ${persona.is_active ? 'border-primary' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{persona.name}</CardTitle>
              {persona.is_active && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </Badge>
              )}
            </div>
            {persona.role && (
              <CardDescription className="text-xs">{persona.role}</CardDescription>
            )}
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
              {!persona.is_active && (
                <DropdownMenuItem onClick={handleActivate}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Set as Active
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
        <div className="space-y-4">
          {/* System Prompt Preview */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">System Prompt:</p>
            <p className="text-sm bg-muted p-2 rounded text-xs line-clamp-3 font-mono">
              {persona.system_prompt}
            </p>
          </div>

          {/* Configuration */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={communicationStyleColors[persona.communication_style] as any}>
              {persona.communication_style}
            </Badge>
            <Badge variant={piiHandlingColors[persona.pii_handling] as any}>
              PII: {persona.pii_handling}
            </Badge>
            <Badge variant="outline">
              Temp: {persona.temperature.toFixed(1)}
            </Badge>
            {persona.personality_traits.map((trait) => (
              <Badge key={trait} variant="secondary" className="text-xs">
                {trait}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleEdit} className="flex-1">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleTest} className="flex-1">
              <Play className="mr-2 h-4 w-4" />
              Test
            </Button>
          </div>

          {/* Version Info */}
          <div className="text-xs text-muted-foreground border-t pt-2">
            <div>Version: {persona.version}</div>
            <div>Updated: {new Date(persona.updated_at).toLocaleDateString()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
