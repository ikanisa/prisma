import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WAContact {
  id: string;
  wa_id: string;
  display_name?: string;
  business_name?: string;
  last_seen: string;
  tags: string[];
  profile_pic_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ContactFilters {
  search?: string;
  status?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface ContactsResponse {
  contacts: WAContact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function useWAContacts(filters: ContactFilters = {}) {
  return useQuery({
    queryKey: ['wa-contacts', filters],
    queryFn: async (): Promise<ContactsResponse> => {
      const { data, error } = await supabase.functions.invoke('wa-contacts-manager', {
        body: {
          action: 'list',
          payload: filters
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data;
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useCreateWAContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<WAContact, 'id' | 'created_at' | 'updated_at' | 'last_seen'>) => {
      const { data, error } = await supabase.functions.invoke('wa-contacts-manager', {
        body: { action: 'create', payload: contact }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-contacts'] });
      toast.success("Contact created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create contact: ${error.message}`);
    }
  });
}

export function useUpdateWAContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WAContact>) => {
      const { data, error } = await supabase.functions.invoke('wa-contacts-manager', {
        body: { action: 'update', payload: { id, ...updates } }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-contacts'] });
      toast.success("Contact updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update contact: ${error.message}`);
    }
  });
}

export function useDeleteWAContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('wa-contacts-manager', {
        body: { action: 'delete', payload: { id } }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-contacts'] });
      toast.success("Contact deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete contact: ${error.message}`);
    }
  });
}

export function useUpdateContactTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, tags }: { contactId: string; tags: string[] }) => {
      const { data, error } = await supabase.functions.invoke('wa-contacts-manager', {
        body: { action: 'sync_tags', payload: { contact_id: contactId, tags } }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-contacts'] });
      toast.success("Tags updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update tags: ${error.message}`);
    }
  });
}

export function useBulkImportContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contacts: Omit<WAContact, 'id' | 'created_at' | 'updated_at' | 'last_seen'>[]) => {
      const { data, error } = await supabase.functions.invoke('wa-contacts-manager', {
        body: { action: 'bulk_import', payload: { contacts } }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['wa-contacts'] });
      toast.success(`Import completed: ${result.inserted} imported, ${result.skipped} skipped`);
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    }
  });
}

export function useImportFromCSV() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (csvData: string) => {
      const { data, error } = await supabase.functions.invoke('contact-import', {
        body: { action: 'import_csv', payload: { csv_data: csvData } }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['wa-contacts'] });
      toast.success(`Import completed: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped`);
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    }
  });
}