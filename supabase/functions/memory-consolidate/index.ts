import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧠 Starting memory consolidation process...');

    // Get recent conversations that need consolidation
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        contact_id,
        updated_at,
        conversation_messages (
          id,
          content,
          role,
          created_at
        )
      `)
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('updated_at', { ascending: false });

    if (convError) {
      throw new Error(`Failed to fetch conversations: ${convError.message}`);
    }

    let consolidatedCount = 0;
    let totalMessages = 0;

    for (const conversation of conversations || []) {
      const messages = conversation.conversation_messages || [];
      if (messages.length === 0) continue;

      totalMessages += messages.length;

      // Extract conversation patterns
      const patterns = {
        messageCount: messages.length,
        avgResponseTime: calculateAvgResponseTime(messages),
        topIntents: extractTopIntents(messages),
        userPreferences: extractUserPreferences(messages),
        satisfactionSignals: extractSatisfactionSignals(messages)
      };

      // Generate conversation summary
      const summary = generateConversationSummary(messages, patterns);

      // Check if consolidation already exists for this conversation
      const { data: existingConsolidation } = await supabase
        .from('memory_consolidation_log')
        .select('id')
        .eq('conversation_id', conversation.id)
        .single();

      if (!existingConsolidation) {
        // Insert new consolidation record
        const { error: insertError } = await supabase
          .from('memory_consolidation_log')
          .insert({
            contact_id: conversation.contact_id,
            conversation_id: conversation.id,
            summary,
            patterns,
            insights: {
              needsFollowUp: patterns.satisfactionSignals.negative > 0,
              preferredLanguage: patterns.userPreferences.language,
              commonTopics: patterns.topIntents.slice(0, 3),
              engagementLevel: calculateEngagementLevel(patterns)
            },
            created_at: new Date().toISOString()
          });

        if (!insertError) {
          consolidatedCount++;
        }
      }

      // Update agent memory with consolidated insights
      await updateAgentMemory(conversation.contact_id, patterns, summary);
    }

    // Log the consolidation run
    const { error: logError } = await supabase
      .from('automated_tasks')
      .insert({
        task_type: 'memory_consolidation',
        status: 'completed',
        metadata: {
          conversations_processed: conversations?.length || 0,
          messages_processed: totalMessages,
          consolidations_created: consolidatedCount,
          run_time: new Date().toISOString()
        }
      });

    if (logError) {
      console.warn('Failed to log consolidation run:', logError);
    }

    console.log(`✅ Memory consolidation complete: ${consolidatedCount} new consolidations created`);

    return new Response(
      JSON.stringify({
        success: true,
        conversationsProcessed: conversations?.length || 0,
        messagesProcessed: totalMessages,
        consolidationsCreated: consolidatedCount,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Memory consolidation error:', error);
    
    // Log the failure
    await supabase.from('automated_tasks').insert({
      task_type: 'memory_consolidation',
      status: 'failed',
      metadata: {
        error: error.message,
        run_time: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function calculateAvgResponseTime(messages: any[]): number {
  if (messages.length < 2) return 0;
  
  let totalTime = 0;
  let responseCount = 0;
  
  for (let i = 1; i < messages.length; i++) {
    const current = new Date(messages[i].created_at);
    const previous = new Date(messages[i-1].created_at);
    const diff = current.getTime() - previous.getTime();
    
    if (diff > 0 && diff < 3600000) { // Less than 1 hour
      totalTime += diff;
      responseCount++;
    }
  }
  
  return responseCount > 0 ? Math.round(totalTime / responseCount / 1000) : 0; // In seconds
}

function extractTopIntents(messages: any[]): string[] {
  const intents = messages
    .filter(m => m.role === 'user')
    .map(m => detectIntent(m.content))
    .filter(Boolean);
    
  const intentCounts = intents.reduce((acc, intent) => {
    acc[intent] = (acc[intent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(intentCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([intent]) => intent);
}

function detectIntent(content: string): string {
  const text = content.toLowerCase();
  
  if (text.includes('pay') || text.includes('kwishyura') || text.includes('payer')) return 'payment';
  if (text.includes('ride') || text.includes('moto') || text.includes('transport')) return 'mobility';
  if (text.includes('order') || text.includes('buy') || text.includes('shop')) return 'commerce';
  if (text.includes('list') || text.includes('sell') || text.includes('property')) return 'listings';
  if (text.includes('help') || text.includes('support') || text.includes('problem')) return 'support';
  
  return 'general';
}

function extractUserPreferences(messages: any[]): any {
  const userMessages = messages.filter(m => m.role === 'user');
  
  // Detect language preference
  let rwCount = 0, enCount = 0, frCount = 0;
  
  userMessages.forEach(m => {
    const text = m.content.toLowerCase();
    if (text.includes('muraho') || text.includes('murakoze') || text.includes('nshaka')) rwCount++;
    if (text.includes('hello') || text.includes('thank') || text.includes('want')) enCount++;
    if (text.includes('bonjour') || text.includes('merci') || text.includes('veux')) frCount++;
  });
  
  let language = 'en';
  if (rwCount > enCount && rwCount > frCount) language = 'rw';
  else if (frCount > enCount) language = 'fr';
  
  return {
    language,
    messageLength: userMessages.reduce((acc, m) => acc + m.content.length, 0) / userMessages.length,
    timeOfDay: getMostActiveTimeOfDay(userMessages)
  };
}

function extractSatisfactionSignals(messages: any[]): any {
  const userMessages = messages.filter(m => m.role === 'user');
  let positive = 0, negative = 0;
  
  userMessages.forEach(m => {
    const text = m.content.toLowerCase();
    
    // Positive signals
    if (text.includes('thank') || text.includes('murakoze') || text.includes('good') || text.includes('great')) positive++;
    
    // Negative signals  
    if (text.includes('problem') || text.includes('error') || text.includes('wrong') || text.includes('bad')) negative++;
  });
  
  return { positive, negative };
}

function getMostActiveTimeOfDay(messages: any[]): string {
  const hours = messages.map(m => new Date(m.created_at).getHours());
  const hourCounts = hours.reduce((acc, hour) => {
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  const mostActiveHour = Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0];
    
  const hour = parseInt(mostActiveHour || '12');
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function generateConversationSummary(messages: any[], patterns: any): string {
  const userMsgCount = messages.filter(m => m.role === 'user').length;
  const assistantMsgCount = messages.filter(m => m.role === 'assistant').length;
  
  return `Conversation with ${userMsgCount} user messages and ${assistantMsgCount} assistant responses. ` +
    `Primary intents: ${patterns.topIntents.slice(0, 3).join(', ')}. ` +
    `Language: ${patterns.userPreferences.language}. ` +
    `Satisfaction: ${patterns.satisfactionSignals.positive > patterns.satisfactionSignals.negative ? 'positive' : 'neutral'}.`;
}

function calculateEngagementLevel(patterns: any): string {
  const score = patterns.messageCount * 0.3 + 
                (patterns.avgResponseTime < 300 ? 1 : 0) * 0.4 +
                patterns.satisfactionSignals.positive * 0.3;
                
  if (score > 2) return 'high';
  if (score > 1) return 'medium';
  return 'low';
}

async function updateAgentMemory(contactId: string, patterns: any, summary: string) {
  const memoryData = {
    contact_id: contactId,
    memory_type: 'consolidated_insights',
    memory_value: {
      patterns,
      summary,
      lastUpdated: new Date().toISOString()
    },
    created_at: new Date().toISOString()
  };

  await supabase.from('agent_memory').upsert(memoryData, {
    onConflict: 'contact_id,memory_type'
  });
}