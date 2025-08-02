import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupOperation {
  operation: string;
  details: string;
  status: 'success' | 'error';
  count?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    
    const { action } = await req.json();
    
    const results: CleanupOperation[] = [];
    
    if (action === 'verify_cleanup') {
      // Verify the cleanup was successful
      
      // Check agents table
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, status')
        .order('created_at', { ascending: false });
        
      results.push({
        operation: 'agents_check',
        details: `Found ${agents?.length || 0} agents`,
        status: agentsError ? 'error' : 'success',
        count: agents?.length || 0
      });

      // Check agent_configs table
      const { data: configs, error: configsError } = await supabase
        .from('agent_configs')
        .select('id, name, code, active')
        .order('created_at', { ascending: false });
        
      results.push({
        operation: 'agent_configs_check',
        details: `Found ${configs?.length || 0} agent configurations`,
        status: configsError ? 'error' : 'success',
        count: configs?.length || 0
      });

      // Check omni_agent_skills table
      const { data: skills, error: skillsError } = await supabase
        .from('omni_agent_skills')
        .select('id, skill_name, is_active, usage_count')
        .order('usage_count', { ascending: false });
        
      results.push({
        operation: 'omni_skills_check',
        details: `Found ${skills?.length || 0} omni agent skills`,
        status: skillsError ? 'error' : 'success',
        count: skills?.length || 0
      });

      // Check omni_agent_conversations table
      const { data: conversations, error: conversationsError } = await supabase
        .from('omni_agent_conversations')
        .select('id')
        .limit(10);
        
      results.push({
        operation: 'omni_conversations_check',
        details: `Omni conversations table accessible`,
        status: conversationsError ? 'error' : 'success'
      });

      // Check conversation_messages for omni-agent metadata
      const { data: messages, error: messagesError } = await supabase
        .from('conversation_messages')
        .select('id, metadata')
        .contains('metadata', { agent_type: 'omni-agent' })
        .limit(5);
        
      results.push({
        operation: 'message_migration_check',
        details: `Found ${messages?.length || 0} messages with omni-agent metadata`,
        status: messagesError ? 'error' : 'success',
        count: messages?.length || 0
      });

    } else if (action === 'final_cleanup') {
      // Perform final cleanup operations
      
      // Clean up any remaining orphaned data
      const { error: orphanedMemoryError } = await supabase
        .from('agent_memory')
        .delete()
        .not('user_id', 'in', `(SELECT phone_number FROM contacts)`);
        
      results.push({
        operation: 'orphaned_memory_cleanup',
        details: 'Cleaned up orphaned agent memory records',
        status: orphanedMemoryError ? 'error' : 'success'
      });

      // Clean up any empty or test conversations
      const { error: emptyConversationsError } = await supabase
        .from('conversation_messages')
        .delete()
        .or('message_text.eq.,message_text.eq.test,message_text.eq.hello');
        
      results.push({
        operation: 'empty_conversations_cleanup',
        details: 'Cleaned up empty/test conversation messages',
        status: emptyConversationsError ? 'error' : 'success'
      });

      // Update system metrics to reflect the new architecture
      const { error: metricsError } = await supabase
        .from('omni_agent_metrics')
        .upsert({
          metric_type: 'system_cleanup',
          metric_value: 1,
          metadata: {
            cleanup_date: new Date().toISOString(),
            architecture: 'omni-agent',
            status: 'completed'
          }
        });
        
      results.push({
        operation: 'metrics_update',
        details: 'Updated system metrics for omni-agent architecture',
        status: metricsError ? 'error' : 'success'
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('System cleanup error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});