// Supabase-backed CRUD helper
import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useOrganizations } from '@/hooks/use-organizations';
import { useCreateClient, useDeleteClient, useUpdateClient, type ClientRecord } from '@/hooks/use-clients';
import {
  useCreateEngagement,
  useUpdateEngagement,
  type EngagementRecord,
} from '@/hooks/use-engagements';
import { useCreateTask, useUpdateTask, type TaskRecord } from '@/hooks/use-tasks';

export function useCrud() {
  const { currentOrg } = useOrganizations();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();
  const createEngagementMutation = useCreateEngagement();
  const updateEngagementMutation = useUpdateEngagement();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();

  const ensureOrg = useCallback(() => {
    if (!currentOrg?.id) {
      throw new Error('Select an organization before performing this action.');
    }
    return currentOrg.id;
  }, [currentOrg?.id]);

  const handleError = (error: unknown, fallback: string) => {
    const description = error instanceof Error ? error.message : fallback;
    toast({
      variant: 'destructive',
      title: 'Operation failed',
      description,
    });
  };

  const createClient = async (data: Omit<ClientRecord, 'id' | 'createdAt' | 'orgId'>) => {
    try {
      const orgId = ensureOrg();
      await createClientMutation.mutateAsync({ orgId, ...data });
      toast({ title: 'Client created successfully' });
    } catch (error) {
      handleError(error, 'Unable to create client.');
    }
  };

  const updateClient = async (id: string, data: Partial<ClientRecord>) => {
    try {
      const orgId = ensureOrg();
      await updateClientMutation.mutateAsync({ id, orgId, updates: data });
      toast({ title: 'Client updated successfully' });
    } catch (error) {
      handleError(error, 'Unable to update client.');
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const orgId = ensureOrg();
      await deleteClientMutation.mutateAsync({ id, orgId });
      toast({ title: 'Client deleted successfully' });
    } catch (error) {
      handleError(error, 'Unable to delete client.');
    }
  };

  const createEngagement = async (data: Omit<EngagementRecord, 'id' | 'createdAt' | 'orgId'>) => {
    try {
      const orgId = ensureOrg();
      await createEngagementMutation.mutateAsync({ orgId, ...data });
      toast({ title: 'Engagement created successfully' });
    } catch (error) {
      handleError(error, 'Unable to create engagement.');
    }
  };

  const updateEngagement = async (id: string, data: Partial<EngagementRecord>) => {
    try {
      const orgId = ensureOrg();
      await updateEngagementMutation.mutateAsync({ id, orgId, updates: data });
      toast({ title: 'Engagement updated successfully' });
    } catch (error) {
      handleError(error, 'Unable to update engagement.');
    }
  };

  const createTask = async (data: Omit<TaskRecord, 'id' | 'createdAt' | 'orgId'>) => {
    try {
      const orgId = ensureOrg();
      await createTaskMutation.mutateAsync({ orgId, ...data });
      toast({ title: 'Task created successfully' });
    } catch (error) {
      handleError(error, 'Unable to create task.');
    }
  };

  const updateTask = async (id: string, data: Partial<TaskRecord>) => {
    try {
      const orgId = ensureOrg();
      await updateTaskMutation.mutateAsync({ id, orgId, updates: data });
      toast({ title: 'Task updated successfully' });
    } catch (error) {
      handleError(error, 'Unable to update task.');
    }
  };

  const loading =
    createClientMutation.isPending ||
    updateClientMutation.isPending ||
    deleteClientMutation.isPending ||
    createEngagementMutation.isPending ||
    updateEngagementMutation.isPending ||
    createTaskMutation.isPending ||
    updateTaskMutation.isPending;

  return {
    loading,
    createClient,
    updateClient,
    deleteClient,
    createEngagement,
    updateEngagement,
    createTask,
    updateTask,
  };
}
