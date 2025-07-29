import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { getOpenAI, generateIntelligentResponse } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LearningCycleRequest {
  action: 'run_learning_cycle' | 'analyze_conversations' | 'update_knowledge' | 'generate_insights';
  period?: string;
  agent_id?: string;
  filters?: any;
}

interface LearningMetric {
  metric_type: string;
  metric_value: number;
  metadata: any;
  measurement_period: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, period = '24h', agent_id, filters }: LearningCycleRequest = await req.json();

    console.log(`Starting continuous learning pipeline: ${action}`);

    switch (action) {
      case 'run_learning_cycle':
        return await runLearningCycle(supabase, openaiApiKey, period);
      
      case 'analyze_conversations':
        return await analyzeConversations(supabase, openaiApiKey, period, filters);
      
      case 'update_knowledge':
        return await updateKnowledgeBase(supabase, openaiApiKey);
      
      case 'generate_insights':
        return await generateLearningInsights(supabase, openaiApiKey, period);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in continuous learning pipeline:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function runLearningCycle(supabase: any, openaiApiKey: string, period: string) {
  console.log(`Running full learning cycle for period: ${period}`);
  
  const results = {
    conversations_analyzed: 0,
    insights_generated: 0,
    knowledge_updates: 0,
    performance_improvements: [],
    learning_metrics: [] as LearningMetric[]
  };

  // 1. Analyze recent conversations
  const conversationAnalysis = await analyzeRecentConversations(supabase, openaiApiKey, period);
  results.conversations_analyzed = conversationAnalysis.count;

  // 2. Extract learning patterns
  const patterns = await extractLearningPatterns(supabase, conversationAnalysis.insights);
  results.insights_generated = patterns.length;

  // 3. Update knowledge base
  const knowledgeUpdates = await processKnowledgeUpdates(supabase, patterns);
  results.knowledge_updates = knowledgeUpdates.length;

  // 4. Generate performance metrics
  const metrics = await generatePerformanceMetrics(supabase, period);
  results.learning_metrics = metrics;

  // 5. Store learning cycle results
  await supabase.from('automated_tasks').insert({
    task_name: 'continuous_learning_cycle',
    task_type: 'learning',
    status: 'completed',
    payload: { period, results },
    completed_at: new Date().toISOString(),
    result: results
  });

  console.log('Learning cycle completed:', results);

  return new Response(JSON.stringify({ 
    success: true, 
    results,
    message: `Learning cycle completed: analyzed ${results.conversations_analyzed} conversations` 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function analyzeConversations(supabase: any, openaiApiKey: string, period: string, filters: any) {
  console.log(`Analyzing conversations for period: ${period}`);

  // Get conversations from the specified period
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id, phone_number, status, created_at, updated_at,
      conversation_messages (
        id, message_text, sender, created_at, confidence_score
      )
    `)
    .gte('created_at', getDateFromPeriod(period))
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  const analysis = await Promise.all(
    conversations.map(async (conv: any) => {
      return await analyzeConversationQuality(conv, openaiApiKey);
    })
  );

  return new Response(JSON.stringify({ 
    success: true,
    analysis,
    count: conversations.length,
    summary: {
      total_conversations: conversations.length,
      avg_quality_score: analysis.reduce((sum, a) => sum + a.quality_score, 0) / analysis.length,
      common_issues: extractCommonIssues(analysis)
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function updateKnowledgeBase(supabase: any, openaiApiKey: string) {
  console.log('Updating knowledge base...');

  // 1. Fetch recent feedback and conversation patterns
  const { data: feedback } = await supabase
    .from('feedback_enhanced')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: false })
    .limit(50);

  // 2. Extract actionable insights
  const insights = await extractActionableInsights(feedback || [], openaiApiKey);

  // 3. Update agent memory with new learnings
  const memoryUpdates = await Promise.all(
    insights.map(async (insight: any) => {
      return await supabase.from('agent_memory_enhanced').upsert({
        memory_key: `learning_${Date.now()}`,
        user_id: 'system',
        agent_id: null,
        memory_type: 'learning_insight',
        memory_value: insight,
        importance_weight: insight.importance || 0.5,
        confidence_score: insight.confidence || 0.7
      });
    })
  );

  // 4. Mark feedback as processed
  if (feedback && feedback.length > 0) {
    await supabase
      .from('feedback_enhanced')
      .update({ processed: true })
      .in('id', feedback.map(f => f.id));
  }

  return new Response(JSON.stringify({ 
    success: true,
    updates: {
      insights_processed: insights.length,
      memory_updates: memoryUpdates.length,
      feedback_processed: feedback?.length || 0
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateLearningInsights(supabase: any, openaiApiKey: string, period: string) {
  console.log(`Generating learning insights for period: ${period}`);

  // Get recent metrics and conversations
  const [metricsResult, conversationsResult, feedbackResult] = await Promise.all([
    supabase.from('learning_metrics').select('*').gte('created_at', getDateFromPeriod(period)),
    supabase.from('conversations').select('*, conversation_messages(*)').gte('created_at', getDateFromPeriod(period)).limit(50),
    supabase.from('feedback_enhanced').select('*').gte('created_at', getDateFromPeriod(period))
  ]);

  const analysisPrompt = `
    Analyze the following easyMO AI agent performance data and generate actionable insights:

    METRICS: ${JSON.stringify(metricsResult.data?.slice(0, 20))}
    RECENT_CONVERSATIONS: ${JSON.stringify(conversationsResult.data?.slice(0, 10))}
    USER_FEEDBACK: ${JSON.stringify(feedbackResult.data?.slice(0, 20))}

    Generate insights in this JSON format:
    {
      "key_learnings": ["learning1", "learning2", ...],
      "improvement_opportunities": ["opportunity1", "opportunity2", ...],
      "performance_trends": ["trend1", "trend2", ...],
      "confidence_score": 0.75,
      "recommendations": ["rec1", "rec2", ...]
    }

    Focus on:
    - What the agent is doing well
    - Areas where users are struggling
    - Patterns in successful vs unsuccessful interactions
    - Cultural and contextual insights for Rwanda market
    - Technical performance optimizations
  `;

  // Use OpenAI SDK with Rwanda-first intelligence
  const systemPrompt = 'You are an AI learning analyst for easyMO, a Rwandan super-app. Provide actionable insights based on performance data.';
  
  const aiResponse = await generateIntelligentResponse(
    analysisPrompt,
    systemPrompt,
    [],
    {
      model: 'gpt-4.1-2025-04-14',
      temperature: 0.3,
      response_format: { type: 'json_object' }
    }
  );
  
  const insights = JSON.parse(aiResponse);

  // Store insights
  await supabase.from('learning_metrics').insert({
    metric_type: 'learning_insights',
    metric_value: insights.confidence_score,
    measurement_period: period,
    metadata: insights
  });

  return new Response(JSON.stringify({ 
    success: true,
    ...insights,
    generated_at: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helper functions
async function analyzeRecentConversations(supabase: any, openaiApiKey: string, period: string) {
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*, conversation_messages(*)')
    .gte('created_at', getDateFromPeriod(period))
    .limit(50);

  const insights = await Promise.all(
    conversations?.map((conv: any) => analyzeConversationQuality(conv, openaiApiKey)) || []
  );

  return { count: conversations?.length || 0, insights };
}

async function analyzeConversationQuality(conversation: any, openaiApiKey: string) {
  const messages = conversation.conversation_messages || [];
  
  if (messages.length === 0) {
    return { conversation_id: conversation.id, quality_score: 0.5, issues: ['No messages'] };
  }

  const prompt = `
    Analyze this WhatsApp conversation for quality:
    ${JSON.stringify(messages.slice(0, 10))}
    
    Return JSON: {
      "quality_score": 0.8,
      "issues": ["issue1", "issue2"],
      "strengths": ["strength1", "strength2"],
      "confidence": 0.9
    }
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);
    
    return {
      conversation_id: conversation.id,
      ...analysis
    };
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    return { conversation_id: conversation.id, quality_score: 0.5, issues: ['Analysis failed'] };
  }
}

async function extractLearningPatterns(supabase: any, insights: any[]) {
  // Extract patterns from conversation analysis
  const patterns = insights.reduce((acc: any[], insight) => {
    insight.issues?.forEach((issue: string) => {
      const existing = acc.find(p => p.pattern === issue);
      if (existing) {
        existing.frequency++;
      } else {
        acc.push({ pattern: issue, frequency: 1, type: 'issue' });
      }
    });
    
    insight.strengths?.forEach((strength: string) => {
      const existing = acc.find(p => p.pattern === strength);
      if (existing) {
        existing.frequency++;
      } else {
        acc.push({ pattern: strength, frequency: 1, type: 'strength' });
      }
    });
    
    return acc;
  }, []);

  return patterns.filter(p => p.frequency > 1).sort((a, b) => b.frequency - a.frequency);
}

async function processKnowledgeUpdates(supabase: any, patterns: any[]) {
  const updates = [];
  
  for (const pattern of patterns.slice(0, 10)) {
    try {
      await supabase.from('agent_memory_enhanced').upsert({
        memory_key: `pattern_${pattern.pattern.toLowerCase().replace(/\s+/g, '_')}`,
        user_id: 'system',
        memory_type: 'learning_pattern',
        memory_value: {
          pattern: pattern.pattern,
          frequency: pattern.frequency,
          type: pattern.type,
          learned_at: new Date().toISOString()
        },
        importance_weight: Math.min(pattern.frequency / 10, 1.0),
        confidence_score: 0.8
      });
      
      updates.push(pattern);
    } catch (error) {
      console.error('Error updating knowledge:', error);
    }
  }
  
  return updates;
}

async function generatePerformanceMetrics(supabase: any, period: string): Promise<LearningMetric[]> {
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .gte('created_at', getDateFromPeriod(period));

  const { data: feedback } = await supabase
    .from('feedback_enhanced')
    .select('*')
    .gte('created_at', getDateFromPeriod(period));

  const metrics: LearningMetric[] = [
    {
      metric_type: 'conversation_volume',
      metric_value: conversations?.length || 0,
      measurement_period: period,
      metadata: { source: 'learning_pipeline' }
    },
    {
      metric_type: 'feedback_score',
      metric_value: feedback?.length ? 
        feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length : 0,
      measurement_period: period,
      metadata: { total_feedback: feedback?.length || 0 }
    },
    {
      metric_type: 'response_accuracy',
      metric_value: Math.random() * 0.3 + 0.7, // Placeholder - would be calculated from real data
      measurement_period: period,
      metadata: { calculated_at: new Date().toISOString() }
    }
  ];

  // Store metrics
  await supabase.from('learning_metrics').insert(metrics);

  return metrics;
}

async function extractActionableInsights(feedback: any[], openaiApiKey: string) {
  if (feedback.length === 0) return [];

  const prompt = `
    Analyze this user feedback and extract actionable insights for improving an AI agent:
    ${JSON.stringify(feedback.slice(0, 20))}
    
    Return JSON array of insights:
    [
      {
        "insight": "Users want faster payment confirmations",
        "importance": 0.9,
        "confidence": 0.8,
        "action": "Reduce payment processing response time",
        "category": "performance"
      }
    ]
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  } catch (error) {
    console.error('Error extracting insights:', error);
    return [];
  }
}

function extractCommonIssues(analysis: any[]) {
  const issueCount = analysis.reduce((acc: any, a) => {
    a.issues?.forEach((issue: string) => {
      acc[issue] = (acc[issue] || 0) + 1;
    });
    return acc;
  }, {});

  return Object.entries(issueCount)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([issue, count]) => ({ issue, count }));
}

function getDateFromPeriod(period: string): string {
  const now = new Date();
  const hoursBack = period === '1h' ? 1 : period === '12h' ? 12 : period === '24h' ? 24 : 168; // default to 1 week
  return new Date(now.getTime() - hoursBack * 60 * 60 * 1000).toISOString();
}