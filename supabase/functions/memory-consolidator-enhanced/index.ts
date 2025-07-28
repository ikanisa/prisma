import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { user_id, consolidation_type = 'full' } = await req.json();
    
    console.log('🧠 Memory Consolidator Enhanced started for:', user_id);
    
    const consolidator = new MemoryConsolidatorEnhanced(supabase, user_id);
    const result = await consolidator.consolidate(consolidation_type);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Memory consolidation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

class MemoryConsolidatorEnhanced {
  private supabase: any;
  private userId: string;
  private memoryNetworks: Map<string, any[]> = new Map();
  private consolidationRules: any[] = [];

  constructor(supabase: any, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  async consolidate(consolidationType: string) {
    const startTime = Date.now();
    
    try {
      // 1. Load all memories
      await this.loadMemories();
      
      // 2. Analyze memory patterns
      await this.analyzeMemoryPatterns();
      
      // 3. Perform consolidation based on type
      const consolidationResult = await this.performConsolidation(consolidationType);
      
      // 4. Update memory importance and relationships
      await this.updateMemoryWeights();
      
      // 5. Prune redundant or low-value memories
      await this.pruneMemories();
      
      // 6. Generate memory insights
      const insights = await this.generateMemoryInsights();
      
      return {
        success: true,
        consolidation_type: consolidationType,
        memories_processed: consolidationResult.processed,
        memories_consolidated: consolidationResult.consolidated,
        memories_pruned: consolidationResult.pruned,
        insights: insights,
        execution_time_ms: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('Consolidation error:', error);
      throw error;
    }
  }

  async loadMemories() {
    console.log('📚 Loading memories for consolidation...');
    
    // Load all enhanced memories
    const { data: memories } = await this.supabase
      .from('agent_memory_enhanced')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: true });

    if (memories) {
      // Group memories by type and create network relationships
      const memoryTypes = ['short_term', 'long_term', 'episodic', 'semantic', 'working_memory'];
      
      memoryTypes.forEach(type => {
        const typeMemories = memories.filter(m => m.memory_type === type);
        this.memoryNetworks.set(type, typeMemories);
      });
      
      console.log('Memory networks loaded:', {
        short_term: this.memoryNetworks.get('short_term')?.length || 0,
        long_term: this.memoryNetworks.get('long_term')?.length || 0,
        episodic: this.memoryNetworks.get('episodic')?.length || 0,
        semantic: this.memoryNetworks.get('semantic')?.length || 0,
        working_memory: this.memoryNetworks.get('working_memory')?.length || 0
      });
    }
  }

  async analyzeMemoryPatterns() {
    console.log('🔍 Analyzing memory patterns...');
    
    const analysisPrompt = `
    Analyze the following memory patterns for consolidation:
    
    MEMORY DISTRIBUTION:
    ${Array.from(this.memoryNetworks.entries()).map(([type, memories]) => 
      `${type}: ${memories.length} items`
    ).join('\n')}
    
    RECENT MEMORIES (last 10):
    ${this.getRecentMemories(10).map(m => 
      `${m.memory_type}: ${m.memory_key} (confidence: ${m.confidence_score})`
    ).join('\n')}
    
    Identify:
    1. Redundant or duplicate memories
    2. Memories that should be consolidated
    3. Patterns that indicate important relationships
    4. Memories that have become obsolete
    5. Gaps in knowledge or experience
    
    Provide consolidation rules and recommendations.
    `;
    
    const analysis = await this.callOpenAI(analysisPrompt);
    this.consolidationRules = await this.parseConsolidationRules(analysis);
    
    console.log('Memory pattern analysis completed');
  }

  getRecentMemories(count: number) {
    const allMemories = Array.from(this.memoryNetworks.values()).flat();
    return allMemories
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, count);
  }

  async parseConsolidationRules(analysis: string) {
    const parsePrompt = `
    Extract consolidation rules from this analysis:
    
    ${analysis}
    
    Format as JSON array:
    [
      {
        "rule_type": "duplicate_removal",
        "criteria": "similar memory keys within 1 hour",
        "action": "keep highest confidence"
      },
      {
        "rule_type": "pattern_consolidation",
        "criteria": "related episodic memories",
        "action": "create semantic summary"
      }
    ]
    `;
    
    const rulesResponse = await this.callOpenAI(parsePrompt);
    
    try {
      return JSON.parse(rulesResponse);
    } catch {
      return [
        {
          rule_type: "basic_cleanup",
          criteria: "low confidence memories",
          action: "prune memories with confidence < 0.3"
        }
      ];
    }
  }

  async performConsolidation(consolidationType: string) {
    console.log(`🔄 Performing ${consolidationType} consolidation...`);
    
    let processed = 0;
    let consolidated = 0;
    let pruned = 0;
    
    switch (consolidationType) {
      case 'full':
        const fullResult = await this.performFullConsolidation();
        processed = fullResult.processed;
        consolidated = fullResult.consolidated;
        pruned = fullResult.pruned;
        break;
        
      case 'episodic_to_semantic':
        const episodicResult = await this.consolidateEpisodicToSemantic();
        processed = episodicResult.processed;
        consolidated = episodicResult.consolidated;
        break;
        
      case 'short_term_to_long_term':
        const shortTermResult = await this.consolidateShortTermToLongTerm();
        processed = shortTermResult.processed;
        consolidated = shortTermResult.consolidated;
        break;
        
      case 'working_memory_cleanup':
        const workingResult = await this.cleanupWorkingMemory();
        processed = workingResult.processed;
        pruned = workingResult.pruned;
        break;
        
      default:
        throw new Error(`Unknown consolidation type: ${consolidationType}`);
    }
    
    return { processed, consolidated, pruned };
  }

  async performFullConsolidation() {
    let totalProcessed = 0;
    let totalConsolidated = 0;
    let totalPruned = 0;
    
    // 1. Consolidate episodic to semantic
    const episodicResult = await this.consolidateEpisodicToSemantic();
    totalProcessed += episodicResult.processed;
    totalConsolidated += episodicResult.consolidated;
    
    // 2. Move important short-term to long-term
    const shortTermResult = await this.consolidateShortTermToLongTerm();
    totalProcessed += shortTermResult.processed;
    totalConsolidated += shortTermResult.consolidated;
    
    // 3. Clean up working memory
    const workingResult = await this.cleanupWorkingMemory();
    totalProcessed += workingResult.processed;
    totalPruned += workingResult.pruned;
    
    // 4. Remove duplicates across all types
    const dedupeResult = await this.removeDuplicateMemories();
    totalProcessed += dedupeResult.processed;
    totalPruned += dedupeResult.pruned;
    
    return { 
      processed: totalProcessed, 
      consolidated: totalConsolidated, 
      pruned: totalPruned 
    };
  }

  async consolidateEpisodicToSemantic() {
    console.log('📖 Converting episodic memories to semantic knowledge...');
    
    const episodicMemories = this.memoryNetworks.get('episodic') || [];
    const processed = episodicMemories.length;
    let consolidated = 0;
    
    // Group episodic memories by themes
    const themeGroups = await this.groupMemoriesByTheme(episodicMemories);
    
    for (const [theme, memories] of themeGroups) {
      if (memories.length >= 3) { // Need multiple episodes to form semantic knowledge
        const semanticSummary = await this.createSemanticSummary(theme, memories);
        
        // Create new semantic memory
        await this.supabase
          .from('agent_memory_enhanced')
          .insert({
            user_id: this.userId,
            memory_key: `semantic_${theme}_${Date.now()}`,
            memory_value: semanticSummary,
            memory_type: 'semantic',
            confidence_score: this.calculateSemanticConfidence(memories),
            importance_weight: this.calculateSemanticImportance(memories)
          });
        
        // Update original episodic memories to reference semantic summary
        for (const memory of memories) {
          await this.supabase
            .from('agent_memory_enhanced')
            .update({
              importance_weight: memory.importance_weight * 0.7, // Reduce importance after consolidation
              metadata: { 
                ...memory.metadata, 
                consolidated_to_semantic: theme 
              }
            })
            .eq('id', memory.id);
        }
        
        consolidated++;
      }
    }
    
    console.log(`Consolidated ${consolidated} episodic themes to semantic knowledge`);
    return { processed, consolidated };
  }

  async groupMemoriesByTheme(memories: any[]) {
    const themeGroups = new Map();
    
    for (const memory of memories) {
      const theme = await this.extractTheme(memory);
      
      if (!themeGroups.has(theme)) {
        themeGroups.set(theme, []);
      }
      themeGroups.get(theme).push(memory);
    }
    
    return themeGroups;
  }

  async extractTheme(memory: any) {
    const themePrompt = `
    Extract a single-word theme from this memory:
    
    Key: ${memory.memory_key}
    Value: ${JSON.stringify(memory.memory_value)}
    
    Return only the theme word (e.g., "payments", "transport", "communication", "learning").
    `;
    
    const theme = await this.callOpenAI(themePrompt);
    return theme.toLowerCase().trim();
  }

  async createSemanticSummary(theme: string, memories: any[]) {
    const summaryPrompt = `
    Create a semantic knowledge summary from these related episodic memories:
    
    Theme: ${theme}
    
    Episodic Memories:
    ${memories.map(m => `${m.memory_key}: ${JSON.stringify(m.memory_value)}`).join('\n')}
    
    Create a comprehensive semantic summary that:
    1. Captures the essential knowledge patterns
    2. Abstracts general principles from specific instances
    3. Identifies key relationships and rules
    4. Preserves important contextual information
    
    Format as structured knowledge object.
    `;
    
    const summary = await this.callOpenAI(summaryPrompt);
    
    try {
      return JSON.parse(summary);
    } catch {
      return {
        theme: theme,
        summary: summary,
        source_episodes: memories.length,
        confidence: this.calculateSemanticConfidence(memories)
      };
    }
  }

  calculateSemanticConfidence(memories: any[]) {
    const avgConfidence = memories.reduce((sum, m) => sum + m.confidence_score, 0) / memories.length;
    const countBonus = Math.min(memories.length / 10, 0.2); // Bonus for more evidence
    return Math.min(1.0, avgConfidence + countBonus);
  }

  calculateSemanticImportance(memories: any[]) {
    const avgImportance = memories.reduce((sum, m) => sum + m.importance_weight, 0) / memories.length;
    const consolidationBonus = 0.3; // Bonus for being consolidated knowledge
    return Math.min(2.0, avgImportance + consolidationBonus);
  }

  async consolidateShortTermToLongTerm() {
    console.log('⏰ Moving important short-term memories to long-term...');
    
    const shortTermMemories = this.memoryNetworks.get('short_term') || [];
    const processed = shortTermMemories.length;
    let consolidated = 0;
    
    // Identify memories that should become long-term
    const candidatesForLongTerm = shortTermMemories.filter(m => 
      m.importance_weight > 1.0 && 
      m.confidence_score > 0.7 &&
      this.isOlderThan(m.created_at, 24 * 60 * 60 * 1000) // Older than 24 hours
    );
    
    for (const memory of candidatesForLongTerm) {
      // Enhanced evaluation for long-term storage
      const shouldPromote = await this.evaluateForLongTermStorage(memory);
      
      if (shouldPromote) {
        await this.supabase
          .from('agent_memory_enhanced')
          .update({
            memory_type: 'long_term',
            importance_weight: memory.importance_weight * 1.2, // Boost importance
            metadata: { 
              ...memory.metadata, 
              promoted_to_long_term: new Date().toISOString(),
              original_type: 'short_term'
            }
          })
          .eq('id', memory.id);
        
        consolidated++;
      }
    }
    
    console.log(`Promoted ${consolidated} short-term memories to long-term`);
    return { processed, consolidated };
  }

  async evaluateForLongTermStorage(memory: any) {
    const evaluationPrompt = `
    Evaluate if this short-term memory should become long-term:
    
    Memory: ${memory.memory_key}
    Value: ${JSON.stringify(memory.memory_value)}
    Confidence: ${memory.confidence_score}
    Importance: ${memory.importance_weight}
    Age: ${this.getMemoryAge(memory.created_at)} hours
    
    Consider:
    1. Long-term value and utility
    2. Frequency of reference/use
    3. Foundational knowledge value
    4. Unique or irreplaceable information
    
    Respond with YES or NO and brief reasoning.
    `;
    
    const evaluation = await this.callOpenAI(evaluationPrompt);
    return evaluation.toLowerCase().includes('yes');
  }

  getMemoryAge(createdAt: string) {
    return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  }

  isOlderThan(createdAt: string, milliseconds: number) {
    return Date.now() - new Date(createdAt).getTime() > milliseconds;
  }

  async cleanupWorkingMemory() {
    console.log('🧹 Cleaning up working memory...');
    
    const workingMemories = this.memoryNetworks.get('working_memory') || [];
    const processed = workingMemories.length;
    let pruned = 0;
    
    // Remove stale working memories (older than 1 hour with low importance)
    const staleMemories = workingMemories.filter(m => 
      this.isOlderThan(m.created_at, 60 * 60 * 1000) && // Older than 1 hour
      m.importance_weight < 0.5
    );
    
    for (const memory of staleMemories) {
      await this.supabase
        .from('agent_memory_enhanced')
        .delete()
        .eq('id', memory.id);
      
      pruned++;
    }
    
    console.log(`Pruned ${pruned} stale working memories`);
    return { processed, pruned };
  }

  async removeDuplicateMemories() {
    console.log('🔍 Removing duplicate memories...');
    
    const allMemories = Array.from(this.memoryNetworks.values()).flat();
    const processed = allMemories.length;
    let pruned = 0;
    
    // Group memories by similarity
    const duplicateGroups = await this.findDuplicateGroups(allMemories);
    
    for (const group of duplicateGroups) {
      if (group.length > 1) {
        // Keep the memory with highest confidence/importance
        const keeper = group.reduce((best, current) => 
          (current.confidence_score * current.importance_weight) > 
          (best.confidence_score * best.importance_weight) ? current : best
        );
        
        // Remove the others
        for (const duplicate of group) {
          if (duplicate.id !== keeper.id) {
            await this.supabase
              .from('agent_memory_enhanced')
              .delete()
              .eq('id', duplicate.id);
            
            pruned++;
          }
        }
      }
    }
    
    console.log(`Removed ${pruned} duplicate memories`);
    return { processed, pruned };
  }

  async findDuplicateGroups(memories: any[]) {
    const groups = [];
    const processed = new Set();
    
    for (let i = 0; i < memories.length; i++) {
      if (processed.has(memories[i].id)) continue;
      
      const group = [memories[i]];
      processed.add(memories[i].id);
      
      for (let j = i + 1; j < memories.length; j++) {
        if (processed.has(memories[j].id)) continue;
        
        const similarity = await this.calculateMemorySimilarity(memories[i], memories[j]);
        
        if (similarity > 0.85) { // High similarity threshold
          group.push(memories[j]);
          processed.add(memories[j].id);
        }
      }
      
      if (group.length > 1) {
        groups.push(group);
      }
    }
    
    return groups;
  }

  async calculateMemorySimilarity(memory1: any, memory2: any) {
    // Simple similarity based on key and content similarity
    const keySimilarity = this.stringSimilarity(memory1.memory_key, memory2.memory_key);
    const contentSimilarity = this.stringSimilarity(
      JSON.stringify(memory1.memory_value),
      JSON.stringify(memory2.memory_value)
    );
    
    return (keySimilarity * 0.4 + contentSimilarity * 0.6);
  }

  stringSimilarity(str1: string, str2: string) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1: string, str2: string) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  async updateMemoryWeights() {
    console.log('⚖️ Updating memory importance weights...');
    
    const allMemories = Array.from(this.memoryNetworks.values()).flat();
    
    for (const memory of allMemories) {
      const newWeight = await this.calculateUpdatedImportance(memory);
      
      if (Math.abs(newWeight - memory.importance_weight) > 0.1) {
        await this.supabase
          .from('agent_memory_enhanced')
          .update({
            importance_weight: newWeight
          })
          .eq('id', memory.id);
      }
    }
  }

  async calculateUpdatedImportance(memory: any) {
    const age = this.getMemoryAge(memory.created_at);
    const baseWeight = memory.importance_weight;
    
    // Decay based on age and type
    let decayFactor = 1.0;
    
    switch (memory.memory_type) {
      case 'working_memory':
        decayFactor = Math.max(0.1, 1 - (age / 24)); // Decay over 24 hours
        break;
      case 'short_term':
        decayFactor = Math.max(0.3, 1 - (age / (24 * 7))); // Decay over 1 week
        break;
      case 'long_term':
        decayFactor = Math.max(0.7, 1 - (age / (24 * 30))); // Decay over 1 month
        break;
      case 'semantic':
        decayFactor = Math.max(0.8, 1 - (age / (24 * 90))); // Decay over 3 months
        break;
      case 'episodic':
        decayFactor = Math.max(0.5, 1 - (age / (24 * 14))); // Decay over 2 weeks
        break;
    }
    
    return Math.max(0.1, baseWeight * decayFactor);
  }

  async pruneMemories() {
    console.log('✂️ Pruning low-value memories...');
    
    // Remove memories with very low importance and confidence
    const { data: lowValueMemories } = await this.supabase
      .from('agent_memory_enhanced')
      .select('id')
      .eq('user_id', this.userId)
      .lt('importance_weight', 0.2)
      .lt('confidence_score', 0.3);
    
    if (lowValueMemories && lowValueMemories.length > 0) {
      const { error } = await this.supabase
        .from('agent_memory_enhanced')
        .delete()
        .in('id', lowValueMemories.map(m => m.id));
      
      if (!error) {
        console.log(`Pruned ${lowValueMemories.length} low-value memories`);
      }
    }
  }

  async generateMemoryInsights() {
    console.log('💡 Generating memory insights...');
    
    const memoryStats = this.calculateMemoryStatistics();
    
    const insightsPrompt = `
    Generate insights about this user's memory profile:
    
    MEMORY STATISTICS:
    ${JSON.stringify(memoryStats, null, 2)}
    
    CONSOLIDATION RULES APPLIED:
    ${JSON.stringify(this.consolidationRules, null, 2)}
    
    Provide insights about:
    1. Memory usage patterns
    2. Learning and retention effectiveness
    3. Knowledge gap areas
    4. Optimization recommendations
    5. Cognitive load assessment
    `;
    
    const insights = await this.callOpenAI(insightsPrompt);
    
    return {
      statistics: memoryStats,
      analysis: insights,
      recommendations: await this.generateRecommendations(memoryStats)
    };
  }

  calculateMemoryStatistics() {
    const stats = {
      total_memories: 0,
      by_type: {} as any,
      avg_confidence: 0,
      avg_importance: 0,
      memory_age_distribution: {} as any
    };
    
    const allMemories = Array.from(this.memoryNetworks.values()).flat();
    stats.total_memories = allMemories.length;
    
    // Calculate by type
    for (const [type, memories] of this.memoryNetworks) {
      stats.by_type[type] = {
        count: memories.length,
        avg_confidence: memories.reduce((sum, m) => sum + m.confidence_score, 0) / memories.length || 0,
        avg_importance: memories.reduce((sum, m) => sum + m.importance_weight, 0) / memories.length || 0
      };
    }
    
    // Overall averages
    stats.avg_confidence = allMemories.reduce((sum, m) => sum + m.confidence_score, 0) / allMemories.length || 0;
    stats.avg_importance = allMemories.reduce((sum, m) => sum + m.importance_weight, 0) / allMemories.length || 0;
    
    // Age distribution
    const ageRanges = ['< 1 hour', '1-24 hours', '1-7 days', '1-30 days', '> 30 days'];
    stats.memory_age_distribution = ageRanges.reduce((acc, range) => {
      acc[range] = 0;
      return acc;
    }, {} as any);
    
    allMemories.forEach(memory => {
      const age = this.getMemoryAge(memory.created_at);
      if (age < 1) stats.memory_age_distribution['< 1 hour']++;
      else if (age < 24) stats.memory_age_distribution['1-24 hours']++;
      else if (age < 24 * 7) stats.memory_age_distribution['1-7 days']++;
      else if (age < 24 * 30) stats.memory_age_distribution['1-30 days']++;
      else stats.memory_age_distribution['> 30 days']++;
    });
    
    return stats;
  }

  async generateRecommendations(stats: any) {
    const recommendations = [];
    
    // Check memory balance
    if (stats.by_type.working_memory?.count > 50) {
      recommendations.push({
        type: 'working_memory_overload',
        message: 'Working memory is overloaded. Consider more frequent consolidation.',
        priority: 'high'
      });
    }
    
    // Check semantic knowledge
    if (stats.by_type.semantic?.count < stats.by_type.episodic?.count * 0.1) {
      recommendations.push({
        type: 'low_semantic_consolidation',
        message: 'Low semantic knowledge formation. More episodic-to-semantic consolidation needed.',
        priority: 'medium'
      });
    }
    
    // Check confidence levels
    if (stats.avg_confidence < 0.6) {
      recommendations.push({
        type: 'low_confidence',
        message: 'Overall memory confidence is low. Consider validation and reinforcement.',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an advanced memory consolidation specialist. Provide precise, analytical responses for memory optimization.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
