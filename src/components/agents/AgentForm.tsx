/**
 * AgentForm Component
 * 
 * Form for creating and editing agents.
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Agent } from '@/hooks/use-agents';
import { Loader2 } from 'lucide-react';

const agentFormSchema = z.object({
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(200, 'Name must be less than 200 characters'),
  description: z.string().optional(),
  type: z.enum(['assistant', 'specialist', 'orchestrator', 'evaluator', 'autonomous']),
  category: z.string().optional(),
  status: z.enum(['draft', 'testing', 'active', 'deprecated', 'archived']),
  is_public: z.boolean(),
  avatar_url: z.string().url().optional().or(z.literal('')),
});

type AgentFormValues = z.infer<typeof agentFormSchema>;

interface AgentFormProps {
  agent?: Agent;
  onSubmit: (data: AgentFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function AgentForm({ agent, onSubmit, onCancel, isSubmitting = false }: AgentFormProps) {
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      slug: agent?.slug || '',
      name: agent?.name || '',
      description: agent?.description || '',
      type: agent?.type || 'assistant',
      category: agent?.category || '',
      status: agent?.status || 'draft',
      is_public: agent?.is_public || false,
      avatar_url: agent?.avatar_url || '',
    },
  });

  const handleSubmit = async (data: AgentFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      // Error handling is done in parent component
      console.error('Form submission error:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input placeholder="tax-corp-us-023" {...field} disabled={!!agent} />
              </FormControl>
              <FormDescription>
                Unique identifier for the agent. Cannot be changed after creation.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="US Corporate Tax Specialist" {...field} />
              </FormControl>
              <FormDescription>
                Display name for the agent
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the agent's purpose and capabilities..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Detailed description of what this agent does
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="assistant">🤖 Assistant</SelectItem>
                    <SelectItem value="specialist">🎓 Specialist</SelectItem>
                    <SelectItem value="orchestrator">🎭 Orchestrator</SelectItem>
                    <SelectItem value="evaluator">⚖️ Evaluator</SelectItem>
                    <SelectItem value="autonomous">🚀 Autonomous</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Agent's functional role
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Current lifecycle status
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input placeholder="tax, audit, accounting, advisory..." {...field} />
              </FormControl>
              <FormDescription>
                Business domain or specialty area
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avatar_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/avatar.png" {...field} />
              </FormControl>
              <FormDescription>
                URL to agent's avatar image
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_public"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Public Agent</FormLabel>
                <FormDescription>
                  Make this agent available to all users in the organization
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {agent ? 'Update Agent' : 'Create Agent'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
