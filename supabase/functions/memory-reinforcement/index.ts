import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { corsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  try {
    const { conversationId, action, userId, context } = await req.json();
    
    console.log(`Memory reinforcement - Action: ${action}, Conversation: ${conversationId}`);

    switch (action) {
      case 'reinforce':
        return await reinforceConversationMemory(conversationId, userId, context);
      case 'analyze_gaps':
        return await analyzeLearningGaps(conversationId);
      case 'strengthen_memory':
        return await strengthenMemoryPaths(userId, context);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Memory reinforcement error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function reinforceConversationMemory(conversationId: string, userId: string, context: any) {
  console.log(`Reinforcing memory for conversation: ${conversationId}`);

  // Get conversation messages
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('phone_number', userId)
    .order('created_at', { ascending: true });

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      message: 'No messages found for reinforcement',
      reinforced_items: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Extract key information for memory reinforcement
  const keyInsights = await extractKeyInsights(messages);
  const userPreferences = await identifyUserPreferences(messages);
  const conversationPatterns = await analyzeConversationPatterns(messages);

  // Store reinforced memories
  const reinforcementResults = await Promise.all([
    storeMemory(userId, 'insights', JSON.stringify(keyInsights)),
    storeMemory(userId, 'preferences', JSON.stringify(userPreferences)),
    storeMemory(userId, 'patterns', JSON.stringify(conversationPatterns))
  ]);

  // Identify learning gaps
  const learningGaps = await identifyLearningGaps(messages, conversationId);

  return new Response(JSON.stringify({
    success: true,
    reinforced_items: reinforcementResults.length,
    learning_gaps_identified: learningGaps.length,
    insights: keyInsights,
    preferences: userPreferences,
    patterns: conversationPatterns,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function analyzeLearningGaps(conversationId: string) {
  // Get recent learning gaps for this conversation
  const { data: gaps } = await supabase
    .from('learning_gap_instances')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  const gapAnalysis = {
    total_gaps: gaps?.length || 0,
    gap_categories: gaps ? [...new Set(gaps.map(g => g.gap_category))] : [],
    severity_breakdown: gaps ? gaps.reduce((acc, gap) => {
      acc[gap.severity_level] = (acc[gap.severity_level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) : {},
    recent_gaps: gaps?.slice(0, 5) || []
  };

  return new Response(JSON.stringify({
    success: true,
    gap_analysis: gapAnalysis,
    recommendations: generateGapRecommendations(gapAnalysis),
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function strengthenMemoryPaths(userId: string, context: any) {
  // Get existing memories for user
  const { data: memories } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('user_id', userId);

  const strengthenedMemories = [];
  
  if (memories) {
    for (const memory of memories) {
      // Strengthen memory by updating with additional context
      const strengthenedValue = await strengthenMemoryValue(memory, context);
      
      if (strengthenedValue !== memory.memory_value) {
        await supabase
          .from('agent_memory')
          .update({ 
            memory_value: strengthenedValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', memory.id);
        
        strengthenedMemories.push({
          type: memory.memory_type,
          original: memory.memory_value,
          strengthened: strengthenedValue
        });
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    strengthened_memories: strengthenedMemories.length,
    details: strengthenedMemories,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function extractKeyInsights(messages: any[]) {
  const insights = {
    communication_style: analyzeCommStyle(messages),
    response_patterns: analyzeResponsePatterns(messages),
    engagement_level: calculateEngagement(messages),
    topic_preferences: extractTopics(messages)
  };

  return insights;
}

async function identifyUserPreferences(messages: any[]) {
  const preferences = {
    preferred_time: extractTimePreferences(messages),
    communication_frequency: calculateFrequency(messages),
    response_length: calculatePreferredLength(messages),
    formality_level: assessFormality(messages)
  };

  return preferences;
}

async function analyzeConversationPatterns(messages: any[]) {
  return {
    typical_session_length: messages.length,
    average_response_time: calculateAvgResponseTime(messages),
    conversation_flow: analyzeFlow(messages),
    engagement_triggers: identifyTriggers(messages)
  };
}

async function identifyLearningGaps(messages: any[], conversationId: string) {
  const gaps = [];
  
  // Identify communication gaps
  if (messages.some(m => m.sender === 'user' && !hasResponse(m, messages))) {
    gaps.push({
      conversation_id: conversationId,
      gap_category: 'response_gap',
      gap_description: 'User message without agent response',
      severity_level: 'medium',
      context_excerpt: messages[0]?.message_text?.substring(0, 100),
      suggested_improvement: 'Ensure all user messages receive responses'
    });
  }

  // Store gaps in database
  if (gaps.length > 0) {
    await supabase.from('learning_gap_instances').insert(gaps);
  }

  return gaps;
}

async function storeMemory(userId: string, memoryType: string, memoryValue: string) {
  return await supabase
    .from('agent_memory')
    .upsert({
      user_id: userId,
      memory_type: memoryType,
      memory_value: memoryValue,
      updated_at: new Date().toISOString()
    });
}

async function strengthenMemoryValue(memory: any, context: any): Promise<string> {
  // Simple strengthening - in production, use AI to enhance memory
  const existingValue = memory.memory_value;
  
  if (context && context.additionalInfo) {
    const enhanced = `${existingValue} | Enhanced: ${context.additionalInfo}`;
    return enhanced.length > 1000 ? existingValue : enhanced;
  }
  
  return existingValue;
}

function generateGapRecommendations(gapAnalysis: any): string[] {
  const recommendations = [];
  
  if (gapAnalysis.total_gaps > 5) {
    recommendations.push('High number of gaps detected - review conversation flow');
  }
  
  if (gapAnalysis.gap_categories.includes('response_gap')) {
    recommendations.push('Implement better response coverage');
  }
  
  if (gapAnalysis.severity_breakdown.high > 0) {
    recommendations.push('Address high-severity gaps immediately');
  }
  
  return recommendations;
}

// Helper functions for analysis
function analyzeCommStyle(messages: any[]) {
  const avgLength = messages.reduce((sum, m) => sum + (m.message_text?.length || 0), 0) / messages.length;
  return avgLength > 100 ? 'detailed' : avgLength > 50 ? 'moderate' : 'brief';
}

function analyzeResponsePatterns(messages: any[]) {
  return { pattern: 'sequential', typical_exchanges: Math.ceil(messages.length / 2) };
}

function calculateEngagement(messages: any[]) {
  return messages.length > 10 ? 'high' : messages.length > 5 ? 'medium' : 'low';
}

function extractTopics(messages: any[]) {
  const topics = ['general_inquiry', 'support', 'information'];
  return topics.slice(0, Math.min(3, Math.ceil(messages.length / 5)));
}

function extractTimePreferences(messages: any[]) {
  const hours = messages.map(m => new Date(m.created_at).getHours());
  const mostCommon = hours.sort((a,b) => 
    hours.filter(h => h === a).length - hours.filter(h => h === b).length
  ).pop();
  return `${mostCommon}:00`;
}

function calculateFrequency(messages: any[]) {
  const timeSpan = messages.length > 1 ? 
    new Date(messages[messages.length - 1].created_at).getTime() - new Date(messages[0].created_at).getTime() : 0;
  const days = timeSpan / (1000 * 60 * 60 * 24);
  return days > 0 ? messages.length / days : 0;
}

function calculatePreferredLength(messages: any[]) {
  const userMessages = messages.filter(m => m.sender === 'user');
  const avgLength = userMessages.reduce((sum, m) => sum + (m.message_text?.length || 0), 0) / userMessages.length;
  return Math.round(avgLength);
}

function assessFormality(messages: any[]) {
  // Simple heuristic - check for formal language patterns
  const formalWords = messages.reduce((count, m) => {
    const text = m.message_text?.toLowerCase() || '';
    if (text.includes('please') || text.includes('thank you') || text.includes('kindly')) {
      return count + 1;
    }
    return count;
  }, 0);
  
  return formalWords / messages.length > 0.3 ? 'formal' : 'casual';
}

function calculateAvgResponseTime(messages: any[]) {
  // Simplified - would calculate actual time differences between messages
  return '2-5 minutes';
}

function analyzeFlow(messages: any[]) {
  return messages.length > 1 ? 'multi-turn' : 'single-turn';
}

function identifyTriggers(messages: any[]) {
  return ['greeting', 'question', 'request'];
}

function hasResponse(message: any, allMessages: any[]) {
  const messageTime = new Date(message.created_at);
  return allMessages.some(m => 
    m.sender === 'agent' && 
    new Date(m.created_at) > messageTime
  );
}