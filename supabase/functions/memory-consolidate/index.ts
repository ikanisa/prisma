import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🧠 Starting memory consolidation process...");

    // Get all contacts that have recent memory entries
    const { data: contacts } = await sb.from('contacts').select('wa_id').neq('wa_id', null);
    
    let totalProcessed = 0;
    
    for (const contact of contacts || []) {
      try {
        // Fetch last 20 turn memories for this contact
        const { data: memories } = await sb
          .from('agent_memory')
          .select('*')
          .eq('contact_wa_id', contact.wa_id)
          .eq('memory_type', 'turn')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!memories?.length) {
          console.log(`⏭️ No turn memories for contact ${contact.wa_id}`);
          continue;
        }

        // Create summary text
        const text = memories.map(m => m.content).join('\n');
        
        // Call OpenAI to summarize
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Summarize this conversation in 20 words max, focusing on key user preferences and context.' },
              { role: 'user', content: text }
            ],
            max_tokens: 64
          }),
        });

        const summary = await response.json();
        const summaryText = summary.choices?.[0]?.message?.content;

        if (summaryText) {
          // Insert summary memory
          await sb.from('agent_memory').insert({
            contact_wa_id: contact.wa_id,
            memory_type: 'summary',
            content: summaryText
          });

          // Log consolidation
          await sb.from('memory_consolidation_log').insert({
            contact_wa_id: contact.wa_id,
            summary_token_len: summary.usage?.total_tokens || 0,
            new_memories: memories.length
          });

          totalProcessed++;
          console.log(`✅ Consolidated ${memories.length} memories for ${contact.wa_id}: "${summaryText}"`);
        }
      } catch (error) {
        console.error(`❌ Error processing contact ${contact.wa_id}:`, error);
        continue;
      }
    }

    console.log(`🎯 Memory consolidation complete. Processed ${totalProcessed} contacts.`);

    return new Response(JSON.stringify({ 
      status: 'ok', 
      processed: totalProcessed 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Memory consolidation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});