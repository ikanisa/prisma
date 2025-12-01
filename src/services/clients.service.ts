import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAppStore } from '@/stores/mock-data';

export interface ClientRecord {
  id: string;
  orgId: string;
  name: string;
  industry: string;
  country: string;
  fiscalYearEnd: string;
  contactName: string;
  contactEmail: string;
  createdAt: string;
}

type ClientRow = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

export type ClientAttributes = Omit<ClientRecord, 'id' | 'orgId' | 'createdAt'>;

export interface CreateClientInput extends ClientAttributes {
  orgId: string;
}

export interface UpdateClientInput {
  id: string;
  orgId: string;
  updates: Partial<ClientAttributes>;
}

export interface DeleteClientInput {
  id: string;
  orgId: string;
}

const friendlyId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

const mapClientRow = (row: ClientRow): ClientRecord => ({
  id: row?.id ?? friendlyId(),
  orgId: row?.org_id ?? '',
  name: row?.name ?? '',
  industry: row?.industry ?? '',
  country: row?.country ?? '',
  fiscalYearEnd: row?.fiscal_year_end ?? '',
  contactName: (row as any)?.contact_name ?? '',
  contactEmail: (row as any)?.email ?? '',
  createdAt: row?.created_at ?? new Date().toISOString(),
});

type AppStoreState = ReturnType<typeof useAppStore.getState>;

const getMockClients = (orgId: string): ClientRecord[] => {
  const store = useAppStore.getState();
  return store.clients.filter((client) => client.orgId === orgId);
};

const setMockClients = (nextClients: ClientRecord[]) => {
  const store = useAppStore.getState();
  store.setClients(nextClients as AppStoreState['clients']);
};

export async function getClients(orgId: string): Promise<ClientRecord[]> {
  if (!orgId) {
    return [];
  }

  if (!isSupabaseConfigured) {
    return getMockClients(orgId);
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapClientRow);
}

export async function createClient(payload: CreateClientInput): Promise<ClientRecord> {
  if (!payload.orgId) {
    throw new Error('Organization is required to create a client.');
  }

  if (!isSupabaseConfigured) {
    const record: ClientRecord = {
      id: friendlyId(),
      orgId: payload.orgId,
      name: payload.name,
      industry: payload.industry,
      country: payload.country,
      fiscalYearEnd: payload.fiscalYearEnd,
      contactName: payload.contactName,
      contactEmail: payload.contactEmail,
      createdAt: new Date().toISOString(),
    };
    const store = useAppStore.getState();
    setMockClients([...store.clients, record]);
    return record;
  }

  const insertPayload: ClientInsert = {
    org_id: payload.orgId,
    name: payload.name,
    industry: payload.industry,
    country: payload.country,
    fiscal_year_end: payload.fiscalYearEnd,
    contact_name: payload.contactName,
    email: payload.contactEmail,
  } as ClientInsert;

  const { data, error } = await supabase.from('clients').insert(insertPayload).select('*').single();

  if (error) {
    throw error;
  }

  return mapClientRow(data);
}

export async function updateClient(payload: UpdateClientInput): Promise<ClientRecord> {
  if (!payload.orgId) {
    throw new Error('Organization is required to update a client.');
  }

  if (!payload.id) {
    throw new Error('Client id is required to update a client.');
  }

  if (!isSupabaseConfigured) {
    const store = useAppStore.getState();
    const next = store.clients.map((client) => {
      if (client.id !== payload.id) {
        return client;
      }
      return {
        ...client,
        ...payload.updates,
      };
    });
    setMockClients(next);
    const updated = next.find((client) => client.id === payload.id);
    if (!updated) {
      throw new Error('Client not found');
    }
    return updated as ClientRecord;
  }

  const updatePayload: ClientUpdate = {
    updated_at: new Date().toISOString(),
  } as ClientUpdate;

  if (payload.updates.name !== undefined) updatePayload.name = payload.updates.name;
  if (payload.updates.industry !== undefined) updatePayload.industry = payload.updates.industry;
  if (payload.updates.country !== undefined) updatePayload.country = payload.updates.country;
  if (payload.updates.fiscalYearEnd !== undefined)
    updatePayload.fiscal_year_end = payload.updates.fiscalYearEnd;
  if (payload.updates.contactName !== undefined) updatePayload.contact_name = payload.updates.contactName;
  if (payload.updates.contactEmail !== undefined) updatePayload.email = payload.updates.contactEmail;

  const { data, error } = await supabase
    .from('clients')
    .update(updatePayload)
    .eq('id', payload.id)
    .eq('org_id', payload.orgId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapClientRow(data);
}

export async function deleteClient(payload: DeleteClientInput): Promise<void> {
  if (!payload.id) {
    throw new Error('Client id is required to delete a client.');
  }

  if (!payload.orgId) {
    throw new Error('Organization is required to delete a client.');
  }

  if (!isSupabaseConfigured) {
    const store = useAppStore.getState();
    const next = store.clients.filter((client) => client.id !== payload.id);
    setMockClients(next);
    return;
  }

  const { error } = await supabase.from('clients').delete().eq('id', payload.id).eq('org_id', payload.orgId);

  if (error) {
    throw error;
  }
}
