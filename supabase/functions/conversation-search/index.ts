import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, filters, limit = 50, offset = 0 } = await req.json();

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Searching conversations with query: ${query}`);

    let searchQuery = supabase
      .from('conversations')
      .select(`
        *,
        contact_id,
        conversation_messages!inner(message_text)
      `)
      .limit(limit)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    // Text search in messages
    if (query) {
      searchQuery = searchQuery.ilike('conversation_messages.message_text', `%${query}%`);
    }

    // Apply filters
    if (filters?.status) {
      searchQuery = searchQuery.eq('status', filters.status);
    }

    if (filters?.channel) {
      searchQuery = searchQuery.eq('channel', filters.channel);
    }

    if (filters?.handoff_requested) {
      searchQuery = searchQuery.eq('handoff_requested', true);
    }

    if (filters?.date_from) {
      searchQuery = searchQuery.gte('created_at', filters.date_from);
    }

    if (filters?.date_to) {
      searchQuery = searchQuery.lte('created_at', filters.date_to);
    }

    const { data: conversations, error } = await searchQuery;

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true });

    if (query) {
      countQuery = countQuery.ilike('conversation_messages.message_text', `%${query}%`);
    }

    const { count } = await countQuery;

    // Label conversations based on patterns
    const labeledConversations = conversations?.map(conv => {
      const labels = [];
      
      if (conv.handoff_requested) labels.push('human-handoff');
      if (conv.message_count > 10) labels.push('long-conversation');
      if (conv.status === 'escalated') labels.push('escalated');
      if (conv.channel === 'whatsapp') labels.push('whatsapp');
      
      return {
        ...conv,
        labels
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: labeledConversations,
        total: count || 0,
        query,
        filters
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in conversation search:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});