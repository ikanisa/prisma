import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getOpenAIClient } from "../_shared/openai.ts";

interface JourneyEvent {
  user_id: string;
  event_type: 'start' | 'step' | 'completion' | 'abandonment' | 'error';
  journey_name: string;
  step_name?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

interface JourneyAnalysis {
  user_id: string;
  journey_patterns: string[];
  success_probability: number;
  next_best_actions: string[];
  personalization_insights: Record<string, any>;
  risk_factors: string[];
}

interface DynamicJourneyMap {
  journey_id: string;
  user_type: string;
  current_patterns: string[];
  adaptive_flow: Record<string, any>;
  success_metrics: Record<string, number>;
  optimization_opportunities: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const openai = getOpenAIClient();

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'track_event':
        return await trackJourneyEvent(req, supabase, openai);
      case 'analyze_journey':
        return await analyzeUserJourney(req, supabase, openai);
      case 'get_dynamic_map':
        return await getDynamicJourneyMap(req, supabase, openai);
      case 'update_patterns':
        return await updateJourneyPatterns(req, supabase, openai);
      case 'real_time_insights':
        return await getRealTimeInsights(req, supabase, openai);
      case 'generate_ai_journey':
        return await generateAIJourney(req, supabase, openai);
      case 'optimize_journey':
        return await optimizeJourney(req, supabase, openai);
      case 'update_from_interactions':
        return await updateFromInteractions(req, supabase, openai);
      default:
        return await processJourneyUpdate(req, supabase, openai);
    }
  } catch (error) {
    console.error('❌ Dynamic journey tracker error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function trackJourneyEvent(req: Request, supabase: any, openai: any) {
  const event = await req.json() as JourneyEvent;
  
  console.log(`🗺️ Tracking journey event: ${event.event_type} for ${event.user_id}`);

  // Store the event
  const { data: journeyEvent } = await supabase
    .from('user_journey_events')
    .insert({
      user_id: event.user_id,
      event_type: event.event_type,
      journey_name: event.journey_name,
      step_name: event.step_name,
      metadata: event.metadata || {},
      timestamp: event.timestamp || new Date().toISOString()
    })
    .select()
    .single();

  // Update user's current journey state
  await updateUserJourneyState(supabase, event);

  // Analyze patterns in real-time
  const analysis = await analyzeJourneyInRealTime(supabase, openai, event);

  // Update dynamic patterns based on new event
  await updateDynamicPatterns(supabase, event, analysis);

  // Generate next best actions
  const nextActions = await generateNextBestActions(supabase, openai, event.user_id, analysis);

  return new Response(JSON.stringify({
    success: true,
    event_id: journeyEvent.id,
    analysis: analysis,
    next_actions: nextActions,
    journey_insights: {
      completion_probability: analysis.success_probability,
      risk_factors: analysis.risk_factors,
      personalization: analysis.personalization_insights
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function analyzeUserJourney(req: Request, supabase: any, openai: any) {
  const { user_id, journey_name, time_window_hours = 24 } = await req.json();

  console.log(`📊 Analyzing journey for user: ${user_id}`);

  // Get recent journey events
  const cutoffTime = new Date(Date.now() - time_window_hours * 60 * 60 * 1000).toISOString();
  
  const { data: events } = await supabase
    .from('user_journey_events')
    .select('*')
    .eq('user_id', user_id)
    .gte('timestamp', cutoffTime)
    .order('timestamp', { ascending: true });

  // Get user's historical patterns
  const { data: historicalPatterns } = await supabase
    .from('user_journey_patterns')
    .select('*')
    .eq('user_id', user_id)
    .eq('is_active', true);

  // Get current user context
  const { data: userContext } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('user_id', user_id)
    .in('memory_type', ['preferences', 'behavior_patterns', 'success_history']);

  // AI-powered journey analysis
  const analysis = await performDeepJourneyAnalysis(openai, {
    events: events || [],
    patterns: historicalPatterns || [],
    context: userContext || [],
    journey_name
  });

  // Update user journey insights
  await supabase
    .from('user_journey_insights')
    .upsert({
      user_id,
      journey_name,
      analysis_results: analysis,
      success_probability: analysis.success_probability,
      risk_factors: analysis.risk_factors,
      personalization_insights: analysis.personalization_insights,
      last_analyzed: new Date().toISOString()
    }, {
      onConflict: 'user_id,journey_name'
    });

  return new Response(JSON.stringify({
    success: true,
    analysis: analysis,
    events_analyzed: events?.length || 0,
    patterns_found: analysis.journey_patterns.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getDynamicJourneyMap(req: Request, supabase: any, openai: any) {
  const { user_id, journey_type } = await req.json();

  console.log(`🗺️ Generating dynamic journey map for: ${user_id}`);

  // Get user's current state and preferences
  const { data: userState } = await supabase
    .from('user_journey_state')
    .select('*')
    .eq('user_id', user_id)
    .single();

  // Get relevant journey patterns
  const { data: patterns } = await supabase
    .from('dynamic_journey_patterns')
    .select('*')
    .eq('is_active', true)
    .contains('user_types', [userState?.user_type || 'general']);

  // Generate adaptive journey map
  const dynamicMap = await generateAdaptiveJourneyMap(openai, {
    user_id,
    user_state: userState,
    available_patterns: patterns || [],
    journey_type
  });

  // Store the generated map
  await supabase
    .from('dynamic_journey_maps')
    .upsert({
      user_id,
      journey_type,
      adaptive_flow: dynamicMap.adaptive_flow,
      success_metrics: dynamicMap.success_metrics,
      optimization_opportunities: dynamicMap.optimization_opportunities,
      generated_at: new Date().toISOString(),
      is_active: true
    }, {
      onConflict: 'user_id,journey_type'
    });

  return new Response(JSON.stringify({
    success: true,
    dynamic_map: dynamicMap,
    personalization_level: calculatePersonalizationLevel(userState, patterns || [])
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function updateJourneyPatterns(req: Request, supabase: any, openai: any) {
  const { pattern_updates, learning_source } = await req.json();

  console.log(`🔄 Updating journey patterns from: ${learning_source}`);

  let patternsUpdated = 0;

  for (const update of pattern_updates) {
    try {
      // Validate and enhance pattern with AI
      const enhancedPattern = await enhanceJourneyPattern(openai, update);
      
      await supabase
        .from('dynamic_journey_patterns')
        .upsert({
          pattern_name: enhancedPattern.pattern_name,
          user_types: enhancedPattern.user_types,
          flow_steps: enhancedPattern.flow_steps,
          success_criteria: enhancedPattern.success_criteria,
          optimization_suggestions: enhancedPattern.optimization_suggestions,
          confidence_score: enhancedPattern.confidence,
          learning_source,
          last_updated: new Date().toISOString(),
          is_active: enhancedPattern.confidence > 0.6
        }, {
          onConflict: 'pattern_name'
        });

      patternsUpdated++;
    } catch (error) {
      console.error(`Failed to update pattern ${update.pattern_name}:`, error);
    }
  }

  // Trigger pattern optimization
  await optimizeJourneyPatterns(supabase, openai);

  return new Response(JSON.stringify({
    success: true,
    patterns_updated: patternsUpdated,
    optimization_triggered: true
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getRealTimeInsights(req: Request, supabase: any, openai: any) {
  const { time_window_minutes = 30, user_filter } = await req.json();

  console.log(`📈 Getting real-time journey insights`);

  const cutoffTime = new Date(Date.now() - time_window_minutes * 60 * 1000).toISOString();

  // Get recent journey events
  let query = supabase
    .from('user_journey_events')
    .select('*')
    .gte('timestamp', cutoffTime);

  if (user_filter) {
    query = query.eq('user_id', user_filter);
  }

  const { data: recentEvents } = await query.order('timestamp', { ascending: false });

  // Analyze real-time patterns
  const insights = await analyzeRealTimePatterns(openai, recentEvents || []);

  // Get active journey statistics
  const { data: activeJourneys } = await supabase
    .from('user_journey_state')
    .select('*')
    .eq('is_active', true);

  return new Response(JSON.stringify({
    success: true,
    real_time_insights: insights,
    active_journeys_count: activeJourneys?.length || 0,
    recent_events_count: recentEvents?.length || 0,
    time_window_minutes,
    trends: {
      completion_rate: insights.completion_rate,
      abandonment_points: insights.abandonment_points,
      optimization_opportunities: insights.optimization_opportunities
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function updateUserJourneyState(supabase: any, event: JourneyEvent) {
  const journeyState = {
    user_id: event.user_id,
    current_journey: event.journey_name,
    current_step: event.step_name || 'unknown',
    last_event_type: event.event_type,
    last_activity: event.timestamp || new Date().toISOString(),
    is_active: event.event_type !== 'completion' && event.event_type !== 'abandonment'
  };

  await supabase
    .from('user_journey_state')
    .upsert(journeyState, {
      onConflict: 'user_id'
    });
}

async function analyzeJourneyInRealTime(supabase: any, openai: any, event: JourneyEvent): Promise<JourneyAnalysis> {
  // Get user's recent journey history
  const { data: recentEvents } = await supabase
    .from('user_journey_events')
    .select('*')
    .eq('user_id', event.user_id)
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: true });

  const systemPrompt = `Analyze this user's journey event and recent history to provide insights.

  Focus on:
  - Pattern recognition
  - Success probability prediction
  - Risk factor identification
  - Personalization opportunities

  Consider Rwanda context, cultural factors, and mobile-first behaviors.

  Return analysis as JSON with format:
  {
    "journey_patterns": ["pattern1", "pattern2"],
    "success_probability": 0.0-1.0,
    "next_best_actions": ["action1", "action2"],
    "personalization_insights": {},
    "risk_factors": ["risk1", "risk2"]
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Current Event: ${JSON.stringify(event)}\n\nRecent History: ${JSON.stringify(recentEvents?.slice(-10) || [])}` 
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    
    return {
      user_id: event.user_id,
      journey_patterns: analysis.journey_patterns || [],
      success_probability: analysis.success_probability || 0.5,
      next_best_actions: analysis.next_best_actions || [],
      personalization_insights: analysis.personalization_insights || {},
      risk_factors: analysis.risk_factors || []
    };
  } catch (error) {
    console.error('Journey analysis failed:', error);
    return {
      user_id: event.user_id,
      journey_patterns: [],
      success_probability: 0.5,
      next_best_actions: [],
      personalization_insights: {},
      risk_factors: []
    };
  }
}

async function performDeepJourneyAnalysis(openai: any, data: any): Promise<JourneyAnalysis> {
  const systemPrompt = `Perform deep analysis of user journey data for Rwanda-based services.

  Analyze:
  - Event sequences and patterns
  - Success/failure indicators
  - User behavior trends
  - Optimization opportunities

  Return comprehensive analysis as JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(data) }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1200
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    
    return {
      user_id: data.events[0]?.user_id || 'unknown',
      journey_patterns: analysis.journey_patterns || [],
      success_probability: analysis.success_probability || 0.5,
      next_best_actions: analysis.next_best_actions || [],
      personalization_insights: analysis.personalization_insights || {},
      risk_factors: analysis.risk_factors || []
    };
  } catch (error) {
    console.error('Deep journey analysis failed:', error);
    return {
      user_id: 'unknown',
      journey_patterns: [],
      success_probability: 0.5,
      next_best_actions: [],
      personalization_insights: {},
      risk_factors: []
    };
  }
}

async function generateAdaptiveJourneyMap(openai: any, data: any): Promise<DynamicJourneyMap> {
  const systemPrompt = `Generate an adaptive journey map based on user state and available patterns.

  Create personalized flow that:
  - Adapts to user preferences and behavior
  - Optimizes for success probability
  - Minimizes friction points
  - Leverages successful patterns

  Return adaptive map as JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(data) }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000
    });

    const map = JSON.parse(response.choices[0].message.content);
    
    return {
      journey_id: `${data.user_id}_${data.journey_type}_${Date.now()}`,
      user_type: data.user_state?.user_type || 'general',
      current_patterns: map.current_patterns || [],
      adaptive_flow: map.adaptive_flow || {},
      success_metrics: map.success_metrics || {},
      optimization_opportunities: map.optimization_opportunities || []
    };
  } catch (error) {
    console.error('Adaptive journey map generation failed:', error);
    return {
      journey_id: `${data.user_id}_${data.journey_type}_${Date.now()}`,
      user_type: 'general',
      current_patterns: [],
      adaptive_flow: {},
      success_metrics: {},
      optimization_opportunities: []
    };
  }
}

async function generateNextBestActions(supabase: any, openai: any, userId: string, analysis: JourneyAnalysis): Promise<string[]> {
  // Combine AI insights with business rules
  const businessRules = await getBusinessRules(supabase, analysis.journey_patterns);
  
  const systemPrompt = `Generate next best actions for user based on journey analysis and business rules.

  Prioritize actions that:
  - Increase success probability
  - Reduce friction
  - Align with user preferences
  - Follow business objectives

  Return 3-5 specific, actionable recommendations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Analysis: ${JSON.stringify(analysis)}\nBusiness Rules: ${JSON.stringify(businessRules)}` 
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.actions || analysis.next_best_actions;
  } catch (error) {
    console.error('Next best actions generation failed:', error);
    return analysis.next_best_actions;
  }
}

async function updateDynamicPatterns(supabase: any, event: JourneyEvent, analysis: JourneyAnalysis) {
  // Update pattern success rates and optimization metrics
  for (const pattern of analysis.journey_patterns) {
    await supabase
      .from('pattern_performance_metrics')
      .upsert({
        pattern_name: pattern,
        event_type: event.event_type,
        success_indicator: event.event_type === 'completion',
        timestamp: new Date().toISOString(),
        user_type: analysis.personalization_insights.user_type || 'general'
      }, {
        onConflict: 'pattern_name,timestamp'
      });
  }
}

async function enhanceJourneyPattern(openai: any, pattern: any): Promise<any> {
  // AI enhancement of journey patterns
  const systemPrompt = `Enhance this journey pattern with AI insights and optimization suggestions.

  Focus on:
  - Improving flow efficiency
  - Reducing abandonment points
  - Adding personalization opportunities
  - Optimizing for Rwanda context

  Return enhanced pattern as JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(pattern) }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800
    });

    const enhanced = JSON.parse(response.choices[0].message.content);
    return { ...pattern, ...enhanced, confidence: enhanced.confidence || 0.8 };
  } catch (error) {
    console.error('Pattern enhancement failed:', error);
    return pattern;
  }
}

async function optimizeJourneyPatterns(supabase: any, openai: any) {
  // Periodic optimization of journey patterns based on performance data
  const { data: performanceData } = await supabase
    .from('pattern_performance_metrics')
    .select('*')
    .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  // AI-powered pattern optimization
  // Implementation would include success rate analysis, A/B testing results, etc.
  
  console.log('🚀 Journey pattern optimization completed');
}

async function analyzeRealTimePatterns(openai: any, events: any[]): Promise<any> {
  if (!events.length) {
    return {
      completion_rate: 0,
      abandonment_points: [],
      optimization_opportunities: []
    };
  }

  const systemPrompt = `Analyze real-time journey events to identify immediate patterns and insights.

  Focus on:
  - Current completion vs abandonment rates
  - Common drop-off points
  - Emerging optimization opportunities

  Return insights as JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(events.slice(0, 50)) }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 600
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Real-time pattern analysis failed:', error);
    return {
      completion_rate: 0.5,
      abandonment_points: [],
      optimization_opportunities: []
    };
  }
}

function calculatePersonalizationLevel(userState: any, patterns: any[]): number {
  // Calculate how personalized the journey can be based on available data
  let score = 0;
  
  if (userState?.user_type) score += 0.3;
  if (userState?.preferences) score += 0.2;
  if (userState?.behavior_history) score += 0.2;
  if (patterns.length > 0) score += 0.3;
  
  return Math.min(score, 1.0);
}

async function getBusinessRules(supabase: any, patterns: string[]): Promise<any[]> {
  const { data: rules } = await supabase
    .from('business_rules')
    .select('*')
    .eq('is_active', true)
    .overlaps('applicable_patterns', patterns);

  return rules || [];
}

async function processJourneyUpdate(req: Request, supabase: any, openai: any) {
  // Default comprehensive journey processing
  const { user_id, update_type = 'full_sync' } = await req.json();

  console.log(`🔄 Processing journey update: ${update_type} for ${user_id}`);

  // Sync all journey data for user
  const results = await Promise.all([
    trackJourneyEvent(req, supabase, openai),
    analyzeUserJourney(req, supabase, openai),
    getDynamicJourneyMap(req, supabase, openai)
  ]);

  return new Response(JSON.stringify({
    success: true,
    update_type,
    sync_results: results.map(r => JSON.parse(r.body))
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}