/**
 * Create Agent Page
 * 
 * Form page for creating new AI agents.
 */

import * as React from 'react';
import { useRouter } from 'next/router';
import { useCreateAgent } from '@/hooks/use-agents';
import { AgentForm } from '@/components/agents/AgentForm';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreateAgentPage() {
  const router = useRouter();
  const createAgent = useCreateAgent();

  const handleSubmit = async (data: any) => {
    try {
      const result = await createAgent.mutateAsync({
        ...data,
        version: '1.0.0',
      });

      toast({
        title: 'Agent created',
        description: `${data.name} has been created successfully.`,
      });

      // Redirect to the new agent's page
      router.push(`/admin/agents/${result.id}`);
    } catch (error) {
      toast({
        title: 'Failed to create agent',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error; // Re-throw to prevent form from clearing
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
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
        <h1 className="text-3xl font-bold tracking-tight">Create New Agent</h1>
        <p className="text-muted-foreground mt-1">
          Configure a new AI agent for your organization
        </p>
      </div>

      {/* Form */}
      <div className="rounded-lg border bg-card p-6">
        <AgentForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createAgent.isPending}
        />
      </div>
    </div>
  );
}
