import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      conversationText,
      userId,
      domain = 'general',
      maxTokens = 200
    } = await req.json();

    console.log('📝 Creating conversation summary:', { userId, domain, textLength: conversationText?.length });

    if (!conversationText) {
      return new Response(
        JSON.stringify({ error: 'Conversation text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate summary using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Create a concise summary of this WhatsApp conversation focusing on:
            - Key user preferences and facts
            - Important outcomes or decisions
            - Context relevant for future interactions
            - Domain: ${domain}
            
            Keep it under ${maxTokens} words and be specific about Rwanda/East Africa context.`
          },
          {
            role: 'user',
            content: `Conversation to summarize:\n\n${conversationText}`
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;

    // Store summary as memory if userId provided
    if (userId && summary) {
      const { error: memoryError } = await supabase
        .from('agent_memory_enhanced')
        .insert({
          user_id: userId,
          memory_type: 'summary',
          memory_key: `conversation_summary_${Date.now()}`,
          memory_value: {
            content: summary,
            metadata: {
              domain,
              importance: 0.95,
              confidence: 0.9,
              tags: ['summary', 'conversation', domain],
              generated_at: new Date().toISOString(),
              source_length: conversationText.length
            }
          },
          importance_weight: 0.95,
          confidence_score: 0.9
        });

      if (memoryError) {
        console.warn('⚠️ Failed to store summary as memory:', memoryError);
      } else {
        console.log('✅ Summary stored as memory');
      }
    }

    // Extract key insights from summary
    const insights = extractInsights(summary, domain);

    // Log execution
    await supabase
      .from('agent_execution_log')
      .insert({
        function_name: 'conversation-summarizer',
        input_data: { 
          userId, 
          domain, 
          textLength: conversationText.length,
          maxTokens 
        },
        output_data: { 
          summaryLength: summary.length,
          insights: insights.length
        },
        execution_time_ms: 0,
        success_status: true,
        user_id: userId
      });

    console.log('✅ Conversation summary created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        insights,
        metadata: {
          domain,
          sourceLength: conversationText.length,
          summaryLength: summary.length,
          generatedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Conversation summarizer error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create conversation summary',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractInsights(summary: string, domain: string): Array<{
  type: string;
  content: string;
  confidence: number;
}> {
  const insights = [];

  // Extract preferences
  const prefMatches = summary.match(/prefer[s]?\s+([^.]+)/gi);
  if (prefMatches) {
    prefMatches.forEach(match => {
      insights.push({
        type: 'preference',
        content: match.trim(),
        confidence: 0.8
      });
    });
  }

  // Extract facts about user
  const factMatches = summary.match(/user\s+(?:is|has|works|lives|uses)\s+([^.]+)/gi);
  if (factMatches) {
    factMatches.forEach(match => {
      insights.push({
        type: 'fact',
        content: match.trim(),
        confidence: 0.7
      });
    });
  }

  // Extract outcomes
  const outcomeMatches = summary.match(/(?:decided|agreed|will|completed|paid|booked)\s+([^.]+)/gi);
  if (outcomeMatches) {
    outcomeMatches.forEach(match => {
      insights.push({
        type: 'outcome',
        content: match.trim(),
        confidence: 0.9
      });
    });
  }

  // Domain-specific insights
  if (domain === 'payments') {
    const amountMatches = summary.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:rwf|frw)/gi);
    if (amountMatches) {
      insights.push({
        type: 'transaction_amount',
        content: `Transaction amounts: ${amountMatches.join(', ')}`,
        confidence: 0.95
      });
    }
  }

  if (domain === 'mobility') {
    const locationMatches = summary.match(/(?:from|to)\s+([A-Za-z\s]+)/gi);
    if (locationMatches) {
      insights.push({
        type: 'travel_route',
        content: `Travel locations: ${locationMatches.join(', ')}`,
        confidence: 0.85
      });
    }
  }

  return insights.slice(0, 5); // Limit to top 5 insights
}