import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  type ClientRecord,
  type CreateClientInput,
  type UpdateClientInput,
  type DeleteClientInput,
} from '@/services/clients.service';

export function useClients(orgId?: string | null) {
  return useQuery({
    queryKey: ['clients', orgId],
    queryFn: () => getClients(orgId as string),
    enabled: Boolean(orgId),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => createClient(input),
    onSuccess: (client) => {
      queryClient.setQueryData<ClientRecord[]>(['clients', client.orgId], (previous = []) => [
        client,
        ...previous.filter((existing) => existing.id !== client.id),
      ]);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClientInput) => updateClient(input),
    onSuccess: (client) => {
      queryClient.setQueryData<ClientRecord[]>(['clients', client.orgId], (previous = []) =>
        previous.map((existing) => (existing.id === client.id ? client : existing)),
      );
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteClientInput) => deleteClient(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients', variables.orgId] });
    },
  });
}

export type { ClientRecord } from '@/services/clients.service';
