/**
 * Agent Detail/Edit Page
 * 
 * View and edit a specific agent's configuration.
 */

import * as React from 'react';
import { useRouter } from 'next/router';
import { useAgent, useUpdateAgent } from '@/hooks/use-agents';
import { AgentForm } from '@/components/agents/AgentForm';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AgentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const { data: agent, isLoading, error } = useAgent(id as string);
  const updateAgent = useUpdateAgent();

  const handleSubmit = async (data: any) => {
    if (!agent) return;

    try {
      await updateAgent.mutateAsync({
        id: agent.id,
        data,
      });

      toast({
        title: 'Agent updated',
        description: `${data.name} has been updated successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to update agent',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleCancel = () => {
    router.push('/admin/agents');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load agent: {error instanceof Error ? error.message : 'Agent not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Agents
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
            <p className="text-muted-foreground mt-1">{agent.slug}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/agents/${agent.id}/test`)}
            >
              Test Agent
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/agents/${agent.id}/personas`)}
            >
              Manage Personas
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-6">Agent Configuration</h2>
            <AgentForm
              agent={agent}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={updateAgent.isPending}
            />
          </div>
        </TabsContent>

        <TabsContent value="personas">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              Persona management will be available soon.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="tools">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              Tool assignment will be available soon.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="knowledge">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              Knowledge base management will be available soon.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              Agent analytics will be available soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
