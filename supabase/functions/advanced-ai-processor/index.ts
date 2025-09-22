import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { 
  createChatCompletion,
  generateIntelligentResponse,
  type AIMessage,
  type CompletionOptions
} from "../_shared/openai-sdk.ts";

interface ProcessingRequest {
  message: string;
  userId: string;
  phoneNumber: string;
  agentId?: string;
  context?: any;
}

interface QualityScores {
  accuracy: number;
  helpfulness: number;
  safety: number;
  relevance: number;
  coherence: number;
}

interface SafetyFlags {
  inappropriate: boolean;
  hallucination: boolean;
  harmful: boolean;
  misinformation: boolean;
  sensitive_topic: boolean;
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Advanced AI processing now uses SDK - no need for openai variable

  try {
    const { message, userId, phoneNumber, agentId, context } = await req.json() as ProcessingRequest;

    console.log(`🧠 Advanced AI processing for user: ${phoneNumber}`);

    // 1. Content Safety Check using SDK
    const safetyResult = await performSafetyCheck(message);
    if (!safetyResult.safe) {
      return createResponse({ 
        message: "I can't process that request. Please rephrase your message.", 
        requiresHuman: true,
        reason: 'safety_violation'
      });
    }

    // 2. Retrieve Enhanced User Memory
    const userMemory = await getEnhancedMemory(supabase, userId);
    
    // 3. Get Agent Configuration with A/B Testing
    const agentConfig = await getOptimalAgent(supabase, agentId, userId);

    // 4. Generate Context-Aware Response using SDK
    const aiResponse = await generateAdvancedResponse(
      message,
      userMemory, 
      agentConfig,
      context
    );

    // 5. Quality Assessment
    const qualityScores = await assessResponseQuality(message, aiResponse.message);

    // 6. Update Enhanced Memory
    await updateEnhancedMemory(supabase, userId, message, aiResponse.message, qualityScores);

    // 7. Store Quality Metrics
    await storeQualityMetrics(supabase, phoneNumber, aiResponse.message, qualityScores, safetyResult.flags);

    // 8. Update Agent Performance Metrics
    await updateAgentMetrics(supabase, agentConfig.id, qualityScores, Date.now() - req.timestamp);

    return createResponse(aiResponse);

  } catch (error) {
    console.error('❌ Advanced AI processor error:', error);
    
    // Fallback to basic response
    const fallbackResponse = await generateFallbackResponse(message);
    
    return createResponse({
      message: fallbackResponse,
      confidence: 0.5,
      fallback: true
    });
  }
});

async function performSafetyCheck(message: string): Promise<{safe: boolean, flags: SafetyFlags}> {
  try {
    const systemPrompt = `
You are a content safety classifier. Analyze the following message for:
1. Inappropriate content (violence, adult content, harassment)
2. Potential hallucination requests (asking for false information)
3. Harmful requests (illegal activities, dangerous advice)
4. Misinformation (requests to spread false information)
5. Sensitive topics requiring human intervention

Respond with JSON only: {"safe": boolean, "flags": {"inappropriate": boolean, "hallucination": boolean, "harmful": boolean, "misinformation": boolean, "sensitive_topic": boolean}, "confidence": number}`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    const completion = await createChatCompletion(messages, {
      model: 'gpt-4.1-2025-04-14',
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      safe: result.safe && result.confidence > 0.8,
      flags: result.flags
    };
  } catch (error) {
    console.error('Safety check failed:', error);
    return { safe: true, flags: { inappropriate: false, hallucination: false, harmful: false, misinformation: false, sensitive_topic: false } };
  }
}

async function getEnhancedMemory(supabase: any, userId: string) {
  const { data: memory } = await supabase
    .from('agent_memory_enhanced')
    .select('*')
    .eq('user_id', userId)
    .gte('confidence_score', 0.7)
    .order('importance_weight', { ascending: false })
    .limit(20);

  const { data: behaviorPatterns } = await supabase
    .from('user_behavior_patterns')
    .select('*')
    .eq('user_id', userId);

  return {
    memories: memory || [],
    behaviors: behaviorPatterns || [],
    summary: await generateMemorySummary(memory || [])
  };
}

async function generateMemorySummary(memories: any[]): Promise<string> {
  if (memories.length === 0) return "New user - no previous interactions";
  
  const preferences = memories.filter(m => m.memory_type === 'preference');
  const context = memories.filter(m => m.memory_type === 'context');
  
  return `User has ${preferences.length} preferences and ${context.length} contextual memories. Recent interactions suggest ${memories[0]?.memory_value?.summary || 'standard engagement'}.`;
}

async function getOptimalAgent(supabase: any, requestedAgentId: string, userId: string) {
  // Check for active A/B experiments
  const { data: experiment } = await supabase
    .from('model_experiments')
    .select('*, ai_models_a:model_a_id(*), ai_models_b:model_b_id(*)')
    .eq('status', 'running')
    .lte('start_date', new Date().toISOString())
    .gte('end_date', new Date().toISOString())
    .single();

  if (experiment) {
    // A/B test assignment based on user ID hash
    const userHash = hashString(userId);
    const useModelA = userHash % 100 < (experiment.traffic_split * 100);
    
    return useModelA ? experiment.ai_models_a : experiment.ai_models_b;
  }

  // Default to requested agent or best performing model
  const { data: agent } = await supabase
    .from('ai_models')
    .select('*')
    .eq('status', 'active')
    .order('performance_metrics->overall_score', { ascending: false })
    .limit(1)
    .single();

  return agent;
}

async function generateAdvancedResponse(
  message: string, 
  userMemory: any, 
  agentConfig: any,
  context: any
) {
  const systemPrompt = `
You are ${agentConfig.name}, an advanced AI assistant for easyMO.

User Memory Context:
${userMemory.summary}

Key User Preferences:
${userMemory.memories.filter(m => m.memory_type === 'preference').map(m => `- ${m.memory_key}: ${JSON.stringify(m.memory_value)}`).join('\n')}

Conversation Context:
${JSON.stringify(context || {}, null, 2)}

Guidelines:
1. Personalize responses based on user memory
2. Maintain conversation context
3. Be helpful, accurate, and culturally appropriate for Rwanda
4. If unsure, ask clarifying questions
5. Never make up information - state limitations clearly
6. Keep responses concise but comprehensive

Model Configuration:
${JSON.stringify(agentConfig.configuration, null, 2)}`;

  try {
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    const completion = await createChatCompletion(messages, {
      model: agentConfig.model_type || 'gpt-4.1-2025-04-14',
      temperature: agentConfig.configuration.temperature || 0.7,
      max_tokens: agentConfig.configuration.max_tokens || 500
    });

    return {
      message: completion.choices[0]?.message?.content,
      confidence: 0.9,
      modelUsed: agentConfig.model_type,
      tokenUsage: completion.usage
    };
  } catch (error) {
    console.error('Response generation failed:', error);
    throw error;
  }
}

async function assessResponseQuality(userMessage: string, aiResponse: string): Promise<QualityScores> {
  try {
    const systemPrompt = `
Analyze the quality of this AI response across multiple dimensions.

User Message: "${userMessage}"
AI Response: "${aiResponse}"

Rate each dimension from 0.0 to 1.0:
- accuracy: How factually correct is the response?
- helpfulness: How well does it address the user's need?
- safety: How safe and appropriate is the content?
- relevance: How relevant is the response to the question?
- coherence: How well-structured and clear is the response?

Respond with JSON only: {"accuracy": float, "helpfulness": float, "safety": float, "relevance": float, "coherence": float}`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Please assess this conversation.' }
    ];

    const completion = await createChatCompletion(messages, {
      model: 'gpt-4.1-2025-04-14',
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch (error) {
    console.error('Quality assessment failed:', error);
    return { accuracy: 0.8, helpfulness: 0.8, safety: 1.0, relevance: 0.8, coherence: 0.8 };
  }
}

async function updateEnhancedMemory(
  supabase: any, 
  userId: string, 
  userMessage: string, 
  aiResponse: string, 
  qualityScores: QualityScores
) {
  // Extract actionable memories from conversation
  const memoryUpdates = await extractMemoryUpdates(userMessage, aiResponse, qualityScores);
  
  for (const update of memoryUpdates) {
    await supabase
      .from('agent_memory_enhanced')
      .upsert({
        user_id: userId,
        memory_type: update.type,
        memory_key: update.key,
        memory_value: update.value,
        confidence_score: update.confidence,
        importance_weight: update.importance,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,memory_key'
      });
  }
}

async function extractMemoryUpdates(userMessage: string, aiResponse: string, qualityScores: QualityScores) {
  // Simple rule-based memory extraction
  const updates = [];
  
  // Extract preferences
  if (userMessage.toLowerCase().includes('prefer') || userMessage.toLowerCase().includes('like')) {
    updates.push({
      type: 'preference',
      key: 'communication_style',
      value: { style: 'conversational', timestamp: new Date().toISOString() },
      confidence: 0.7,
      importance: 0.6
    });
  }

  // Extract context
  updates.push({
    type: 'context',
    key: 'last_interaction',
    value: { 
      message: userMessage.substring(0, 100),
      response_quality: qualityScores,
      timestamp: new Date().toISOString()
    },
    confidence: 1.0,
    importance: 0.5
  });

  return updates;
}

async function storeQualityMetrics(
  supabase: any, 
  phoneNumber: string, 
  response: string, 
  qualityScores: QualityScores, 
  safetyFlags: SafetyFlags
) {
  await supabase
    .from('conversation_quality')
    .insert({
      phone_number: phoneNumber,
      response_text: response,
      quality_scores: qualityScores,
      safety_flags: safetyFlags,
      confidence_score: Object.values(qualityScores).reduce((a, b) => a + b, 0) / Object.keys(qualityScores).length,
      automated_checks: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    });
}

async function updateAgentMetrics(supabase: any, agentId: string, qualityScores: QualityScores, responseTimeMs: number) {
  const overallScore = Object.values(qualityScores).reduce((a, b) => a + b, 0) / Object.keys(qualityScores).length;
  
  await supabase
    .from('agent_performance_metrics')
    .insert({
      agent_id: agentId,
      metric_type: 'response_quality',
      metric_value: overallScore,
      measurement_period: 'real_time',
      metadata: {
        response_time_ms: responseTimeMs,
        quality_breakdown: qualityScores
      }
    });
}

async function generateFallbackResponse(message: string): Promise<string> {
  const fallbacks = [
    "I'm having trouble processing that right now. Could you please try again?",
    "Let me help you with that. Could you provide more details?",
    "I want to make sure I give you the best response. Could you rephrase your question?",
    "I'm experiencing some technical difficulties. Please try again in a moment."
  ];
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function createResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}