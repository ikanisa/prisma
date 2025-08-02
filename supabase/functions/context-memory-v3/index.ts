import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContextMemoryRequest {
  action: 'retrieve' | 'store' | 'predict' | 'forget' | 'consolidate';
  userId: string;
  agentId?: string;
  context?: {
    currentIntent?: string;
    conversationPhase?: string;
    emotionalState?: string;
    urgency?: number;
    location?: { lat: number; lng: number };
    timeContext?: string;
  };
  memories?: MemoryNode[];
  query?: string;
  prediction_horizon?: number; // minutes into future
}

interface MemoryNode {
  type: 'preference' | 'fact' | 'pattern' | 'context' | 'prediction';
  key: string;
  value: any;
  confidence: number;
  importance: number;
  temporal_weight?: number;
  source: string;
  expires_at?: string;
  associations?: string[];
  emotional_context?: {
    valence: number; // -1 to 1 (negative to positive)
    arousal: number; // 0 to 1 (calm to excited)
    dominance: number; // 0 to 1 (controlled to in-control)
  };
}

interface ContextualMemory {
  core_memories: MemoryNode[];
  working_memories: MemoryNode[];
  predictive_memories: MemoryNode[];
  contextual_relevance: number;
  confidence_score: number;
  temporal_freshness: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const request: ContextMemoryRequest = await req.json();

    console.log(`🧠 Context Memory V3 - Action: ${request.action} for user: ${request.userId}`);

    switch (request.action) {
      case 'retrieve':
        return await retrieveContextualMemory(supabase, request);
      case 'store':
        return await storeContextualMemory(supabase, request);
      case 'predict':
        return await predictiveMemory(supabase, request, openaiApiKey);
      case 'forget':
        return await intelligentForgetting(supabase, request);
      case 'consolidate':
        return await memoryConsolidation(supabase, request, openaiApiKey);
      default:
        throw new Error(`Unknown action: ${request.action}`);
    }

  } catch (error) {
    console.error('Error in context-memory-v3:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function retrieveContextualMemory(
  supabase: any, 
  request: ContextMemoryRequest
): Promise<Response> {
  const { userId, context, query } = request;
  const now = new Date();

  // Calculate temporal and contextual weights
  const timeOfDay = now.getHours();
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Retrieve core memories (long-term, high importance)
  const { data: coreMemories, error: coreError } = await supabase
    .from('agent_memory_enhanced')
    .select('*')
    .eq('user_id', userId)
    .gte('importance_weight', 0.7)
    .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
    .order('importance_weight', { ascending: false })
    .limit(10);

  if (coreError) throw coreError;

  // Retrieve working memories (recent, contextually relevant)
  const { data: workingMemories, error: workingError } = await supabase
    .from('agent_memory_enhanced')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(15);

  if (workingError) throw workingError;

  // Retrieve predictive memories (patterns and predictions)
  const { data: predictiveMemories, error: predictiveError } = await supabase
    .from('agent_memory_enhanced')
    .select('*')
    .eq('user_id', userId)
    .eq('memory_type', 'prediction')
    .gte('expires_at', now.toISOString())
    .order('confidence_score', { ascending: false })
    .limit(5);

  if (predictiveError) throw predictiveError;

  // Context-aware filtering and ranking
  const contextualMemory: ContextualMemory = {
    core_memories: await rankMemoriesByContext(coreMemories || [], context),
    working_memories: await rankMemoriesByContext(workingMemories || [], context),
    predictive_memories: await rankMemoriesByContext(predictiveMemories || [], context),
    contextual_relevance: calculateContextualRelevance(context, timeOfDay, isWeekend),
    confidence_score: calculateOverallConfidence(coreMemories, workingMemories),
    temporal_freshness: calculateTemporalFreshness(workingMemories)
  };

  // Semantic search if query provided
  if (query) {
    try {
      const { data: semanticResults } = await supabase.functions.invoke('semantic-lookup', {
        body: {
          action: 'search',
          namespace: `user_${userId}`,
          query: query,
          limit: 5
        }
      });

      if (semanticResults?.matches) {
        contextualMemory.working_memories.push(...semanticResults.matches.map((match: any) => ({
          type: 'fact',
          key: 'semantic_match',
          value: match.text,
          confidence: match.score,
          importance: match.score * 0.8,
          source: 'semantic_search'
        })));
      }
    } catch (semanticError) {
      console.warn('Semantic search failed:', semanticError);
    }
  }

  // Update access patterns
  const accessPattern = {
    user_id: userId,
    access_time: now.toISOString(),
    context_type: context?.currentIntent || 'general',
    time_of_day: timeOfDay,
    day_of_week: dayOfWeek,
    memory_types_accessed: [
      ...new Set([
        ...contextualMemory.core_memories.map(m => m.type),
        ...contextualMemory.working_memories.map(m => m.type)
      ])
    ]
  };

  await supabase.from('memory_access_patterns').upsert(accessPattern).select().single();

  console.log(`✅ Retrieved contextual memory: ${contextualMemory.core_memories.length} core + ${contextualMemory.working_memories.length} working + ${contextualMemory.predictive_memories.length} predictive`);

  return new Response(JSON.stringify({
    success: true,
    contextual_memory: contextualMemory,
    context_metadata: {
      time_of_day: timeOfDay,
      is_weekend: isWeekend,
      contextual_relevance: contextualMemory.contextual_relevance
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function storeContextualMemory(
  supabase: any, 
  request: ContextMemoryRequest
): Promise<Response> {
  const { userId, agentId, memories, context } = request;
  
  if (!memories || memories.length === 0) {
    throw new Error('No memories provided for storage');
  }

  const now = new Date();
  const enhancedMemories = memories.map(memory => {
    // Calculate temporal decay
    const halfLife = getMemoryHalfLife(memory.type, memory.importance);
    const expiresAt = memory.expires_at || 
      new Date(now.getTime() + halfLife * 60 * 60 * 1000).toISOString();

    // Generate vector embedding key
    const embeddingText = `${memory.key}: ${JSON.stringify(memory.value)}`;

    return {
      user_id: userId,
      agent_id: agentId,
      memory_type: memory.type,
      memory_key: memory.key,
      memory_value: memory.value,
      confidence_score: memory.confidence,
      importance_weight: memory.importance,
      expires_at: expiresAt,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      // Context enrichment
      contextual_metadata: {
        storage_context: context,
        emotional_context: memory.emotional_context,
        associations: memory.associations,
        source: memory.source,
        time_of_day: now.getHours(),
        day_of_week: now.getDay()
      }
    };
  });

  // Batch insert with conflict resolution
  const { data: storedMemories, error: storeError } = await supabase
    .from('agent_memory_enhanced')
    .upsert(enhancedMemories, {
      onConflict: 'user_id,memory_key',
      ignoreDuplicates: false
    })
    .select('id, memory_key');

  if (storeError) throw storeError;

  // Store in vector database for semantic search
  const vectorPromises = enhancedMemories.map(async (memory) => {
    try {
      await supabase.functions.invoke('semantic-lookup', {
        body: {
          action: 'store',
          namespace: `user_${userId}`,
          texts: [`${memory.memory_key}: ${JSON.stringify(memory.memory_value)}`],
          metadata: [{
            memory_type: memory.memory_type,
            importance: memory.importance_weight,
            created_at: memory.created_at,
            expires_at: memory.expires_at
          }]
        }
      });
    } catch (vectorError) {
      console.warn(`Failed to store memory in vector DB: ${memory.memory_key}`, vectorError);
    }
  });

  await Promise.allSettled(vectorPromises);

  console.log(`✅ Stored ${storedMemories?.length || 0} contextual memories for user ${userId}`);

  return new Response(JSON.stringify({
    success: true,
    stored_count: storedMemories?.length || 0,
    memory_ids: storedMemories?.map(m => m.id) || []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function predictiveMemory(
  supabase: any, 
  request: ContextMemoryRequest,
  openaiApiKey?: string
): Promise<Response> {
  const { userId, context, prediction_horizon = 60 } = request;
  const now = new Date();

  // Get user patterns
  const { data: patterns, error: patternsError } = await supabase
    .from('user_behavior_patterns')
    .select('*')
    .eq('user_id', userId)
    .order('confidence_score', { ascending: false })
    .limit(10);

  if (patternsError) throw patternsError;

  // Get recent access patterns
  const { data: accessPatterns, error: accessError } = await supabase
    .from('memory_access_patterns')
    .select('*')
    .eq('user_id', userId)
    .gte('access_time', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('access_time', { ascending: false });

  if (accessError) throw accessError;

  const predictions: MemoryNode[] = [];

  // Time-based predictions
  const currentHour = now.getHours();
  const futureTime = new Date(now.getTime() + prediction_horizon * 60 * 1000);
  
  if (patterns) {
    for (const pattern of patterns) {
      const patternData = pattern.pattern_data;
      
      // Predict next likely actions
      if (patternData.time_patterns) {
        const timePattern = patternData.time_patterns[currentHour];
        if (timePattern && timePattern.likelihood > 0.3) {
          predictions.push({
            type: 'prediction',
            key: 'likely_next_action',
            value: {
              action: timePattern.most_common_action,
              likelihood: timePattern.likelihood,
              predicted_time: futureTime.toISOString()
            },
            confidence: timePattern.likelihood,
            importance: 0.6,
            source: 'temporal_pattern_analysis',
            expires_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
          });
        }
      }

      // Context-based predictions
      if (context?.currentIntent && patternData.intent_transitions) {
        const transition = patternData.intent_transitions[context.currentIntent];
        if (transition) {
          predictions.push({
            type: 'prediction',
            key: 'likely_next_intent',
            value: {
              next_intent: transition.most_likely_next,
              confidence: transition.confidence,
              avg_time_to_transition: transition.avg_minutes
            },
            confidence: transition.confidence,
            importance: 0.7,
            source: 'intent_transition_analysis',
            expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString()
          });
        }
      }
    }
  }

  // AI-powered predictions if OpenAI available
  if (openaiApiKey && patterns && patterns.length > 0) {
    try {
      const predictionPrompt = `Based on user behavior patterns and current context, predict what this user might need in the next ${prediction_horizon} minutes:

Current Context: ${JSON.stringify(context)}
User Patterns: ${JSON.stringify(patterns.slice(0, 5), null, 2)}
Current Time: ${now.toISOString()}

Predict:
1. Most likely next service request
2. Preferred communication style
3. Potential pain points or needs
4. Optimal response timing

Return structured predictions with confidence scores.`;

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
              content: 'You are a predictive memory system for easyMO Rwanda. Generate actionable predictions based on user patterns.'
            },
            { role: 'user', content: predictionPrompt }
          ],
          temperature: 0.3,
          max_tokens: 800
        }),
      });

      if (response.ok) {
        const aiResult = await response.json();
        const aiPredictions = aiResult.choices[0].message.content;
        
        predictions.push({
          type: 'prediction',
          key: 'ai_behavioral_prediction',
          value: {
            predictions: aiPredictions,
            model: 'gpt-4.1-2025-04-14',
            generated_at: now.toISOString()
          },
          confidence: 0.75,
          importance: 0.8,
          source: 'ai_pattern_analysis',
          expires_at: new Date(now.getTime() + prediction_horizon * 60 * 1000).toISOString()
        });
      }
    } catch (aiError) {
      console.warn('AI prediction failed:', aiError);
    }
  }

  // Store predictions
  if (predictions.length > 0) {
    await storeContextualMemory(supabase, {
      action: 'store',
      userId,
      memories: predictions,
      context
    });
  }

  console.log(`🔮 Generated ${predictions.length} predictive memories for user ${userId}`);

  return new Response(JSON.stringify({
    success: true,
    predictions: predictions,
    prediction_horizon_minutes: prediction_horizon,
    generated_at: now.toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function intelligentForgetting(
  supabase: any, 
  request: ContextMemoryRequest
): Promise<Response> {
  const { userId } = request;
  const now = new Date();

  // Identify memories to forget based on:
  // 1. Expired memories
  // 2. Low importance + old age
  // 3. Contradicted/superseded memories
  // 4. Privacy-sensitive data past retention period

  const forgettingCriteria = [
    // Expired memories
    {
      name: 'expired',
      condition: `expires_at < '${now.toISOString()}'`
    },
    // Low importance + old (>30 days)
    {
      name: 'low_importance_old',
      condition: `importance_weight < 0.3 AND created_at < '${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()}'`
    },
    // Superseded preferences
    {
      name: 'superseded_preferences',
      condition: `memory_type = 'preference' AND updated_at < '${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()}' AND confidence_score < 0.5`
    }
  ];

  const forgottenCounts: { [key: string]: number } = {};

  for (const criteria of forgettingCriteria) {
    const { data: toForget, error: selectError } = await supabase
      .from('agent_memory_enhanced')
      .select('id, memory_key, memory_type')
      .eq('user_id', userId)
      .or(criteria.condition);

    if (selectError) {
      console.warn(`Error selecting memories for ${criteria.name}:`, selectError);
      continue;
    }

    if (toForget && toForget.length > 0) {
      // Archive before deleting
      const archiveData = toForget.map(memory => ({
        ...memory,
        user_id: userId,
        forgotten_at: now.toISOString(),
        forgetting_reason: criteria.name,
        archived_at: now.toISOString()
      }));

      await supabase.from('forgotten_memories_archive').insert(archiveData);

      // Delete from active memory
      const { error: deleteError } = await supabase
        .from('agent_memory_enhanced')
        .delete()
        .in('id', toForget.map(m => m.id));

      if (!deleteError) {
        forgottenCounts[criteria.name] = toForget.length;
      }
    }
  }

  // Clean up vector database
  try {
    await supabase.functions.invoke('semantic-lookup', {
      body: {
        action: 'cleanup',
        namespace: `user_${userId}`,
        before_date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (vectorError) {
    console.warn('Vector cleanup failed:', vectorError);
  }

  const totalForgotten = Object.values(forgottenCounts).reduce((sum, count) => sum + count, 0);

  console.log(`🧹 Intelligent forgetting completed for user ${userId}: ${totalForgotten} memories archived`);

  return new Response(JSON.stringify({
    success: true,
    forgotten_counts: forgottenCounts,
    total_forgotten: totalForgotten,
    processed_at: now.toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function memoryConsolidation(
  supabase: any, 
  request: ContextMemoryRequest,
  openaiApiKey?: string
): Promise<Response> {
  const { userId } = request;
  const now = new Date();
  
  // Get memories from last 24 hours for consolidation
  const { data: recentMemories, error: memoryError } = await supabase
    .from('agent_memory_enhanced')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  if (memoryError) throw memoryError;

  if (!recentMemories || recentMemories.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      message: 'No recent memories to consolidate',
      processed_at: now.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Group memories by type and key for pattern detection
  const memoryGroups: { [key: string]: any[] } = {};
  recentMemories.forEach(memory => {
    const groupKey = `${memory.memory_type}:${memory.memory_key}`;
    if (!memoryGroups[groupKey]) {
      memoryGroups[groupKey] = [];
    }
    memoryGroups[groupKey].push(memory);
  });

  const consolidatedMemories: MemoryNode[] = [];

  // Consolidate each group
  for (const [groupKey, memories] of Object.entries(memoryGroups)) {
    if (memories.length > 1) {
      // Multiple memories of same type/key - consolidate
      const consolidatedValue = consolidateValues(memories);
      const avgConfidence = memories.reduce((sum, m) => sum + m.confidence_score, 0) / memories.length;
      const maxImportance = Math.max(...memories.map(m => m.importance_weight));

      consolidatedMemories.push({
        type: memories[0].memory_type,
        key: memories[0].memory_key,
        value: consolidatedValue,
        confidence: Math.min(avgConfidence * 1.1, 1.0), // Slight boost for consolidation
        importance: Math.min(maxImportance * 1.05, 1.0),
        source: 'memory_consolidation',
        associations: [...new Set(memories.flatMap(m => m.contextual_metadata?.associations || []))]
      });

      // Remove old individual memories
      await supabase
        .from('agent_memory_enhanced')
        .delete()
        .in('id', memories.map(m => m.id));
    }
  }

  // Store consolidated memories
  if (consolidatedMemories.length > 0) {
    await storeContextualMemory(supabase, {
      action: 'store',
      userId,
      memories: consolidatedMemories
    });
  }

  // Pattern extraction using AI if available
  let extractedPatterns: MemoryNode[] = [];
  if (openaiApiKey && recentMemories.length > 5) {
    try {
      const patternPrompt = `Analyze these user memories from the last 24 hours and extract behavioral patterns:

${recentMemories.map(m => `${m.memory_type}: ${m.memory_key} = ${JSON.stringify(m.memory_value)}`).join('\n')}

Extract:
1. Behavioral patterns
2. Preference trends  
3. Usage patterns
4. Emotional patterns

Return structured patterns that can predict future behavior.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            { role: 'system', content: 'You are a memory consolidation system. Extract meaningful patterns from user memories.' },
            { role: 'user', content: patternPrompt }
          ],
          temperature: 0.2,
          max_tokens: 1000
        }),
      });

      if (response.ok) {
        const aiResult = await response.json();
        const patterns = aiResult.choices[0].message.content;
        
        extractedPatterns.push({
          type: 'pattern',
          key: 'consolidated_behavior_pattern',
          value: {
            patterns: patterns,
            source_memory_count: recentMemories.length,
            extraction_date: now.toISOString()
          },
          confidence: 0.8,
          importance: 0.9,
          source: 'ai_pattern_extraction',
          expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    } catch (aiError) {
      console.warn('AI pattern extraction failed:', aiError);
    }
  }

  if (extractedPatterns.length > 0) {
    await storeContextualMemory(supabase, {
      action: 'store',
      userId,
      memories: extractedPatterns
    });
  }

  console.log(`🔄 Memory consolidation completed for user ${userId}: ${consolidatedMemories.length} consolidated + ${extractedPatterns.length} patterns`);

  return new Response(JSON.stringify({
    success: true,
    consolidated_count: consolidatedMemories.length,
    pattern_count: extractedPatterns.length,
    source_memory_count: recentMemories.length,
    processed_at: now.toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Utility functions

function getMemoryHalfLife(type: string, importance: number): number {
  const baseHours = {
    'preference': 168, // 1 week
    'fact': 72,       // 3 days  
    'pattern': 336,   // 2 weeks
    'context': 24,    // 1 day
    'prediction': 2   // 2 hours
  };
  
  const base = baseHours[type] || 24;
  return base * (0.5 + importance); // Importance extends half-life
}

async function rankMemoriesByContext(memories: any[], context?: any): Promise<MemoryNode[]> {
  if (!context) return memories.map(memoryToNode);

  return memories
    .map(memory => {
      const node = memoryToNode(memory);
      node.temporal_weight = calculateTemporalWeight(memory);
      return node;
    })
    .sort((a, b) => {
      const scoreA = (a.importance + a.confidence + (a.temporal_weight || 0)) / 3;
      const scoreB = (b.importance + b.confidence + (b.temporal_weight || 0)) / 3;
      return scoreB - scoreA;
    });
}

function memoryToNode(memory: any): MemoryNode {
  return {
    type: memory.memory_type,
    key: memory.memory_key,
    value: memory.memory_value,
    confidence: memory.confidence_score,
    importance: memory.importance_weight,
    source: memory.contextual_metadata?.source || 'unknown'
  };
}

function calculateTemporalWeight(memory: any): number {
  const now = new Date();
  const created = new Date(memory.created_at);
  const ageHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  
  // Exponential decay with 24-hour half-life
  return Math.exp(-0.693 * ageHours / 24);
}

function calculateContextualRelevance(context: any, timeOfDay: number, isWeekend: boolean): number {
  let relevance = 0.5; // Base relevance
  
  if (context?.urgency) {
    relevance += context.urgency * 0.3;
  }
  
  if (context?.emotionalState === 'urgent' || context?.emotionalState === 'frustrated') {
    relevance += 0.2;
  }
  
  // Time-based adjustments
  if (timeOfDay >= 8 && timeOfDay <= 18 && !isWeekend) {
    relevance += 0.1; // Business hours
  }
  
  return Math.min(relevance, 1.0);
}

function calculateOverallConfidence(coreMemories: any[], workingMemories: any[]): number {
  const allMemories = [...(coreMemories || []), ...(workingMemories || [])];
  if (allMemories.length === 0) return 0;
  
  const avgConfidence = allMemories.reduce((sum, m) => sum + (m.confidence_score || 0), 0) / allMemories.length;
  return avgConfidence;
}

function calculateTemporalFreshness(workingMemories: any[]): number {
  if (!workingMemories || workingMemories.length === 0) return 0;
  
  const now = new Date();
  const avgAge = workingMemories.reduce((sum, m) => {
    const age = (now.getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60);
    return sum + age;
  }, 0) / workingMemories.length;
  
  // Fresher memories = higher score
  return Math.max(0, 1 - avgAge / 24);
}

function consolidateValues(memories: any[]): any {
  if (memories.length === 1) return memories[0].memory_value;
  
  const values = memories.map(m => m.memory_value);
  
  // If all values are the same, return it
  if (values.every(v => JSON.stringify(v) === JSON.stringify(values[0]))) {
    return values[0];
  }
  
  // For different values, create a consolidated structure
  return {
    consolidated: true,
    values: values,
    most_recent: values[values.length - 1],
    most_confident: memories.sort((a, b) => b.confidence_score - a.confidence_score)[0].memory_value,
    consolidation_metadata: {
      source_count: memories.length,
      confidence_range: [
        Math.min(...memories.map(m => m.confidence_score)),
        Math.max(...memories.map(m => m.confidence_score))
      ]
    }
  };
}