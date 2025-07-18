import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { corsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  try {
    const { operation, userId, memoryType, memoryValue, context } = await req.json();
    
    console.log(`Memory consolidator - Operation: ${operation}, User: ${userId}`);

    switch (operation) {
      case 'store':
        return await storeMemory(userId, memoryType, memoryValue);
      case 'retrieve':
        return await retrieveMemory(userId, memoryType);
      case 'update':
        return await updateMemory(userId, memoryType, memoryValue);
      case 'consolidate':
        return await consolidateUserMemory(userId, context);
      case 'search':
        return await searchMemory(userId, context?.query);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error('Memory consolidator error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function storeMemory(userId: string, memoryType: string, memoryValue: string) {
  console.log(`Storing memory: ${memoryType} for user: ${userId}`);

  const { data, error } = await supabase
    .from('agent_memory')
    .upsert({
      user_id: userId,
      memory_type: memoryType,
      memory_value: memoryValue,
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    message: 'Memory stored successfully',
    memory_id: data?.[0]?.id,
    stored_data: {
      user_id: userId,
      memory_type: memoryType,
      memory_value: memoryValue
    },
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function retrieveMemory(userId: string, memoryType?: string) {
  console.log(`Retrieving memory for user: ${userId}, type: ${memoryType}`);

  let query = supabase
    .from('agent_memory')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (memoryType) {
    query = query.eq('memory_type', memoryType);
  }

  const { data, error } = await query;

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    memories: data || [],
    total_memories: data?.length || 0,
    memory_types: data ? [...new Set(data.map(m => m.memory_type))] : [],
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function updateMemory(userId: string, memoryType: string, memoryValue: string) {
  console.log(`Updating memory: ${memoryType} for user: ${userId}`);

  const { data, error } = await supabase
    .from('agent_memory')
    .update({
      memory_value: memoryValue,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('memory_type', memoryType)
    .select();

  if (error) throw error;

  if (!data || data.length === 0) {
    // If no existing memory, create new one
    return await storeMemory(userId, memoryType, memoryValue);
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Memory updated successfully',
    updated_records: data.length,
    updated_data: data[0],
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function consolidateUserMemory(userId: string, context: any) {
  console.log(`Consolidating memory for user: ${userId}`);

  // Get all memories for user
  const { data: memories } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (!memories || memories.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      message: 'No memories to consolidate',
      consolidated_items: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Group memories by type
  const memoryGroups = groupMemoriesByType(memories);
  
  // Consolidate each group
  const consolidatedMemories = [];
  for (const [memoryType, typeMemories] of Object.entries(memoryGroups)) {
    const consolidated = await consolidateMemoryGroup(typeMemories as any[], context);
    if (consolidated) {
      consolidatedMemories.push({
        memory_type: memoryType,
        consolidated_value: consolidated,
        source_count: (typeMemories as any[]).length
      });

      // Update the consolidated memory
      await supabase
        .from('agent_memory')
        .upsert({
          user_id: userId,
          memory_type: memoryType,
          memory_value: consolidated,
          updated_at: new Date().toISOString()
        });

      // Remove old duplicate memories (keep the most recent)
      const oldMemoryIds = (typeMemories as any[])
        .slice(1) // Skip the first (most recent) one
        .map(m => m.id);
      
      if (oldMemoryIds.length > 0) {
        await supabase
          .from('agent_memory')
          .delete()
          .in('id', oldMemoryIds);
      }
    }
  }

  // Extract patterns and insights
  const patterns = extractMemoryPatterns(memories);
  const insights = generateMemoryInsights(memories, patterns);

  return new Response(JSON.stringify({
    success: true,
    consolidated_memories: consolidatedMemories.length,
    details: consolidatedMemories,
    patterns: patterns,
    insights: insights,
    total_memories_processed: memories.length,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function searchMemory(userId: string, query: string) {
  console.log(`Searching memory for user: ${userId}, query: ${query}`);

  if (!query) {
    throw new Error('Search query is required');
  }

  const { data: memories } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('user_id', userId)
    .ilike('memory_value', `%${query}%`)
    .order('updated_at', { ascending: false });

  const searchResults = memories?.map(memory => ({
    id: memory.id,
    memory_type: memory.memory_type,
    memory_value: memory.memory_value,
    relevance_score: calculateRelevanceScore(memory.memory_value, query),
    updated_at: memory.updated_at
  })) || [];

  // Sort by relevance score
  searchResults.sort((a, b) => b.relevance_score - a.relevance_score);

  return new Response(JSON.stringify({
    success: true,
    query: query,
    results: searchResults,
    total_results: searchResults.length,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function groupMemoriesByType(memories: any[]) {
  return memories.reduce((groups, memory) => {
    const type = memory.memory_type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(memory);
    return groups;
  }, {} as Record<string, any[]>);
}

async function consolidateMemoryGroup(memories: any[], context: any): Promise<string | null> {
  if (memories.length <= 1) return null;

  // Simple consolidation - merge related memories
  const values = memories.map(m => m.memory_value);
  
  // For preferences, merge them
  if (memories[0].memory_type === 'preferences') {
    return consolidatePreferences(values);
  }
  
  // For user info, keep the most recent
  if (memories[0].memory_type === 'user_info') {
    return memories[0].memory_value;
  }
  
  // For general memories, combine them
  return values.join(' | ');
}

function consolidatePreferences(preferences: string[]): string {
  const prefs = preferences.map(p => {
    try {
      return JSON.parse(p);
    } catch {
      return { general: p };
    }
  });

  const consolidated = prefs.reduce((acc, pref) => {
    return { ...acc, ...pref };
  }, {});

  return JSON.stringify(consolidated);
}

function extractMemoryPatterns(memories: any[]) {
  const patterns = {
    memory_types: [...new Set(memories.map(m => m.memory_type))],
    update_frequency: calculateUpdateFrequency(memories),
    most_active_type: findMostActiveMemoryType(memories),
    memory_evolution: trackMemoryEvolution(memories)
  };

  return patterns;
}

function generateMemoryInsights(memories: any[], patterns: any) {
  const insights = [];

  if (patterns.memory_types.length > 5) {
    insights.push('User has diverse interaction patterns');
  }

  if (patterns.update_frequency > 10) {
    insights.push('Highly active user with frequent updates');
  }

  if (patterns.most_active_type === 'preferences') {
    insights.push('User preferences are frequently updated');
  }

  return insights;
}

function calculateUpdateFrequency(memories: any[]): number {
  if (memories.length < 2) return 0;

  const timeSpan = new Date(memories[0].updated_at).getTime() - 
                   new Date(memories[memories.length - 1].updated_at).getTime();
  const days = timeSpan / (1000 * 60 * 60 * 24);
  
  return days > 0 ? memories.length / days : 0;
}

function findMostActiveMemoryType(memories: any[]): string {
  const typeCounts = memories.reduce((counts, memory) => {
    counts[memory.memory_type] = (counts[memory.memory_type] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  return Object.entries(typeCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
}

function trackMemoryEvolution(memories: any[]): any {
  const evolution = {
    total_updates: memories.length,
    first_memory: memories[memories.length - 1]?.updated_at,
    latest_memory: memories[0]?.updated_at,
    growth_trend: memories.length > 10 ? 'growing' : 'stable'
  };

  return evolution;
}

function calculateRelevanceScore(memoryValue: string, query: string): number {
  const lowerMemory = memoryValue.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  let score = 0;
  
  // Exact match gets highest score
  if (lowerMemory.includes(lowerQuery)) {
    score += 10;
  }
  
  // Word matches
  const queryWords = lowerQuery.split(' ');
  queryWords.forEach(word => {
    if (lowerMemory.includes(word)) {
      score += 2;
    }
  });
  
  // Length bonus for longer memories
  score += Math.min(memoryValue.length / 100, 5);
  
  return score;
}
