import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      userId,
      messageData,
      agentResponse,
      turnNumber,
      conversationId,
      domain = 'general'
    } = await req.json();

    console.log('🔗 Processing memory webhook:', { userId, turnNumber, domain });

    if (!userId || !messageData) {
      return new Response(
        JSON.stringify({ error: 'userId and messageData are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processingResults = {
      memoryLogged: false,
      summaryCreated: false,
      contextRetrieved: false,
      errors: []
    };

    // 1. Log conversation turn memory
    try {
      const conversationTurn = {
        turnNumber: turnNumber || 1,
        userMessage: messageData.userMessage || messageData.message || '',
        agentResponse: agentResponse || '',
        intent: messageData.intent,
        entities: extractEntities(messageData.userMessage || messageData.message || '', domain),
        context: {
          domain,
          phoneNumber: messageData.phoneNumber,
          conversationId,
          ...messageData.context
        },
        timestamp: new Date().toISOString()
      };

      // Store conversation memory
      const { error: conversationError } = await supabase
        .from('agent_memory_enhanced')
        .insert({
          user_id: userId,
          memory_type: 'conversation',
          memory_key: `turn_${turnNumber || 1}_${Date.now()}`,
          memory_value: {
            content: `User: ${conversationTurn.userMessage}\nAgent: ${conversationTurn.agentResponse}`,
            metadata: {
              domain,
              turnNumber: conversationTurn.turnNumber,
              intent: conversationTurn.intent,
              entities: conversationTurn.entities,
              context: conversationTurn.context,
              importance: 0.7,
              confidence: 1.0,
              tags: ['conversation', 'turn', domain]
            }
          },
          importance_weight: 0.7,
          confidence_score: 1.0
        });

      if (conversationError) {
        processingResults.errors.push(`Conversation memory: ${conversationError.message}`);
      } else {
        processingResults.memoryLogged = true;
        console.log('✅ Conversation turn logged');
      }

    } catch (error) {
      processingResults.errors.push(`Conversation logging: ${error.message}`);
    }

    // 2. Extract and store preferences
    try {
      const preferences = extractPreferences(messageData.userMessage || messageData.message || '');
      
      for (const pref of preferences) {
        const { error: prefError } = await supabase
          .from('agent_memory_enhanced')
          .insert({
            user_id: userId,
            memory_type: 'preference',
            memory_key: `pref_${Date.now()}_${Math.random()}`,
            memory_value: {
              content: pref.content,
              metadata: {
                domain,
                importance: 0.9,
                confidence: pref.confidence,
                tags: ['preference', ...pref.tags],
                extractedAt: new Date().toISOString()
              }
            },
            importance_weight: 0.9,
            confidence_score: pref.confidence
          });

        if (prefError) {
          console.warn('⚠️ Failed to store preference:', prefError);
        }
      }

    } catch (error) {
      processingResults.errors.push(`Preference extraction: ${error.message}`);
    }

    // 3. Extract and store facts
    try {
      const facts = extractFacts(messageData.userMessage || messageData.message || '');
      
      for (const fact of facts) {
        const { error: factError } = await supabase
          .from('agent_memory_enhanced')
          .insert({
            user_id: userId,
            memory_type: 'fact',
            memory_key: `fact_${Date.now()}_${Math.random()}`,
            memory_value: {
              content: fact.content,
              metadata: {
                domain,
                importance: 0.8,
                confidence: fact.confidence,
                tags: ['fact', ...fact.tags],
                entities: fact.entities,
                extractedAt: new Date().toISOString()
              }
            },
            importance_weight: 0.8,
            confidence_score: fact.confidence
          });

        if (factError) {
          console.warn('⚠️ Failed to store fact:', factError);
        }
      }

    } catch (error) {
      processingResults.errors.push(`Fact extraction: ${error.message}`);
    }

    // 4. Create conversation summary if needed (every 5 turns)
    const shouldCreateSummary = turnNumber && turnNumber % 5 === 0;
    if (shouldCreateSummary) {
      try {
        // Get recent conversation turns
        const { data: recentTurns } = await supabase
          .from('agent_memory_enhanced')
          .select('*')
          .eq('user_id', userId)
          .eq('memory_type', 'conversation')
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentTurns && recentTurns.length > 0) {
          const conversationText = recentTurns
            .map(turn => turn.memory_value.content)
            .reverse()
            .join('\n\n');

          // Call conversation summarizer
          const { data: summaryData, error: summaryError } = await supabase.functions.invoke('conversation-summarizer', {
            body: {
              conversationText,
              userId,
              domain,
              maxTokens: 200
            }
          });

          if (summaryError) {
            processingResults.errors.push(`Summary creation: ${summaryError.message}`);
          } else {
            processingResults.summaryCreated = true;
            console.log('✅ Conversation summary created');
          }
        }

      } catch (error) {
        processingResults.errors.push(`Summary creation: ${error.message}`);
      }
    }

    // 5. Get memory statistics
    const { data: memoryStats } = await supabase
      .from('agent_memory_enhanced')
      .select('memory_type')
      .eq('user_id', userId);

    const memoryBreakdown = (memoryStats || []).reduce((acc, mem) => {
      acc[mem.memory_type] = (acc[mem.memory_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Log execution
    await supabase
      .from('agent_execution_log')
      .insert({
        function_name: 'memory-webhook-processor',
        input_data: { 
          userId, 
          domain, 
          turnNumber,
          messageLength: (messageData.userMessage || messageData.message || '').length
        },
        output_data: { 
          ...processingResults,
          memoryBreakdown
        },
        execution_time_ms: 0,
        success_status: processingResults.errors.length === 0,
        user_id: userId
      });

    console.log('✅ Memory webhook processing completed');

    return new Response(
      JSON.stringify({
        success: true,
        results: processingResults,
        memoryBreakdown,
        metadata: {
          userId,
          domain,
          turnNumber,
          conversationId,
          processedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Memory webhook processor error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process memory webhook',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractEntities(text: string, domain: string): Record<string, any> {
  const entities: Record<string, any> = {};

  // Phone number
  const phoneMatch = text.match(/(\+25[0-9]{9}|07[0-9]{8})/);
  if (phoneMatch) {
    entities.phoneNumber = phoneMatch[0];
  }

  // Amount
  const amountMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:rwf|frw|francs?)/i);
  if (amountMatch) {
    entities.amount = amountMatch[0];
  }

  // Location
  const locationMatch = text.match(/(?:to|from|in)\s+([A-Za-z\s]+)/i);
  if (locationMatch) {
    entities.location = locationMatch[1].trim();
  }

  // Time
  const timeMatch = text.match(/(?:at|around)\s+(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))/i);
  if (timeMatch) {
    entities.time = timeMatch[1];
  }

  return entities;
}

function extractPreferences(text: string): Array<{
  content: string;
  confidence: number;
  tags: string[];
}> {
  const preferences = [];

  // Language preference
  if (/kinyarwanda|rwandan|french|français/i.test(text)) {
    const lang = text.match(/kinyarwanda|rwandan/i) ? 'rw' : 'fr';
    preferences.push({
      content: `Prefers ${lang} language`,
      confidence: 0.8,
      tags: ['language', lang]
    });
  }

  // Payment preference
  if (/mobile\s*money|momo|cash|credit/i.test(text)) {
    const method = text.match(/(mobile\s*money|momo|cash|credit)/i)?.[0];
    preferences.push({
      content: `Prefers payment method: ${method}`,
      confidence: 0.8,
      tags: ['payment', 'method']
    });
  }

  return preferences;
}

function extractFacts(text: string): Array<{
  content: string;
  confidence: number;
  tags: string[];
  entities: string[];
}> {
  const facts = [];

  // Name fact
  const nameMatch = text.match(/my name is ([A-Za-z\s]+)/i);
  if (nameMatch) {
    facts.push({
      content: `User name: ${nameMatch[1].trim()}`,
      confidence: 0.9,
      tags: ['identity', 'name'],
      entities: [nameMatch[1].trim()]
    });
  }

  // Work fact
  const workMatch = text.match(/(?:work at|works at|job at)\s+([A-Za-z\s]+)/i);
  if (workMatch) {
    facts.push({
      content: `Works at: ${workMatch[1].trim()}`,
      confidence: 0.8,
      tags: ['work', 'employment'],
      entities: [workMatch[1].trim()]
    });
  }

  // Location fact
  const liveMatch = text.match(/(?:live in|lives in|from)\s+([A-Za-z\s]+)/i);
  if (liveMatch) {
    facts.push({
      content: `Lives in: ${liveMatch[1].trim()}`,
      confidence: 0.8,
      tags: ['location', 'residence'],
      entities: [liveMatch[1].trim()]
    });
  }

  return facts;
}