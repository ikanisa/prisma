import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient, withSupabase } from "../_shared/supabase.ts";

interface WAContact {
  wa_id: string;
  display_name?: string;
  business_name?: string;
  tags?: string[];
  profile_pic_url?: string;
  status?: string;
}

interface ContactListParams {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  status?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    switch (action) {
      case 'list':
        return await listContacts(payload as ContactListParams);
      case 'create':
        return await createContact(payload as WAContact);
      case 'update':
        return await updateContact(payload as { id: string } & Partial<WAContact>);
      case 'delete':
        return await deleteContact(payload as { id: string });
      case 'bulk_import':
        return await bulkImportContacts(payload as { contacts: WAContact[] });
      case 'sync_tags':
        return await syncContactTags(payload as { contact_id: string; tags: string[] });
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('WA Contacts Manager error:', error);
    
    // Log to execution log
    await withSupabase(async (client) => {
      await client.from('agent_execution_log').insert({
        function_name: 'wa-contacts-manager',
        input_data: { error: error.message },
        success_status: false,
        error_details: error.message,
        execution_time_ms: 0
      });
    });

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function listContacts(params: ContactListParams) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { page = 1, limit = 50, search, tags, status } = params;
    const offset = (page - 1) * limit;

    let query = client
      .from('wa_contacts')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('last_seen', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (search) {
      query = query.or(`display_name.ilike.%${search}%,business_name.ilike.%${search}%,wa_id.ilike.%${search}%`);
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const executionTime = Date.now() - startTime;

    // Log successful execution
    await client.from('agent_execution_log').insert({
      function_name: 'wa-contacts-manager',
      input_data: params,
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          contacts: data || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            pages: Math.ceil((count || 0) / limit)
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function createContact(contact: WAContact) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    // Check if contact already exists
    const { data: existing } = await client
      .from('wa_contacts')
      .select('id')
      .eq('wa_id', contact.wa_id)
      .is('deleted_at', null)
      .single();

    if (existing) {
      throw new Error(`Contact with wa_id ${contact.wa_id} already exists`);
    }

    const { data, error } = await client
      .from('wa_contacts')
      .insert(contact)
      .select()
      .single();

    if (error) throw error;

    const executionTime = Date.now() - startTime;

    // Log successful execution
    await client.from('agent_execution_log').insert({
      function_name: 'wa-contacts-manager',
      input_data: contact,
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function updateContact(payload: { id: string } & Partial<WAContact>) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { id, ...updates } = payload;

    const { data, error } = await client
      .from('wa_contacts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    const executionTime = Date.now() - startTime;

    // Log successful execution
    await client.from('agent_execution_log').insert({
      function_name: 'wa-contacts-manager',
      input_data: payload,
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function deleteContact(payload: { id: string }) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { data, error } = await client
      .from('wa_contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', payload.id)
      .select()
      .single();

    if (error) throw error;

    const executionTime = Date.now() - startTime;

    // Log successful execution
    await client.from('agent_execution_log').insert({
      function_name: 'wa-contacts-manager',
      input_data: payload,
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function bulkImportContacts(payload: { contacts: WAContact[] }) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { contacts } = payload;
    
    // Filter out duplicates
    const waIds = contacts.map(c => c.wa_id);
    const { data: existing } = await client
      .from('wa_contacts')
      .select('wa_id')
      .in('wa_id', waIds)
      .is('deleted_at', null);

    const existingWaIds = new Set(existing?.map(c => c.wa_id) || []);
    const newContacts = contacts.filter(c => !existingWaIds.has(c.wa_id));

    let insertedCount = 0;
    if (newContacts.length > 0) {
      const { data, error } = await client
        .from('wa_contacts')
        .insert(newContacts)
        .select();

      if (error) throw error;
      insertedCount = data?.length || 0;
    }

    const executionTime = Date.now() - startTime;

    // Log successful execution
    await client.from('agent_execution_log').insert({
      function_name: 'wa-contacts-manager',
      input_data: { total_contacts: contacts.length, inserted: insertedCount },
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          total_provided: contacts.length,
          inserted: insertedCount,
          skipped: contacts.length - insertedCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function syncContactTags(payload: { contact_id: string; tags: string[] }) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { contact_id, tags } = payload;

    const { data, error } = await client
      .from('wa_contacts')
      .update({ tags, updated_at: new Date().toISOString() })
      .eq('id', contact_id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    const executionTime = Date.now() - startTime;

    // Log successful execution
    await client.from('agent_execution_log').insert({
      function_name: 'wa-contacts-manager',
      input_data: payload,
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}