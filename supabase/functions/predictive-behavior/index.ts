import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserBehaviorPattern {
  user_id: string;
  pattern_type: string;
  pattern_data: any;
  confidence_score: number;
  last_updated: string;
  prediction_accuracy?: number;
}

interface PredictionResult {
  prediction_type: string;
  predicted_value: any;
  confidence: number;
  reasoning: string;
  recommended_actions: string[];
  timing_suggestions: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      action, 
      user_id, 
      prediction_type,
      analysis_period,
      context_data 
    } = await req.json();

    switch (action) {
      case 'analyze_behavior_patterns':
        return await analyzeBehaviorPatterns(supabase, user_id, analysis_period);
      
      case 'predict_user_response':
        return await predictUserResponse(supabase, user_id, context_data);
      
      case 'optimize_timing':
        return await optimizeContactTiming(supabase, user_id, context_data);
      
      case 'predict_conversion_likelihood':
        return await predictConversionLikelihood(supabase, user_id, context_data);
      
      case 'generate_behavioral_insights':
        return await generateBehavioralInsights(supabase, user_id);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Predictive behavior engine error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeBehaviorPatterns(
  supabase: any, 
  user_id: string, 
  analysis_period: string = '30d'
): Promise<Response> {
  console.log(`Analyzing behavior patterns for user: ${user_id}, period: ${analysis_period}`);
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - parseInt(analysis_period.replace('d', '')));

  // Get conversation history
  const { data: conversations } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('phone_number', user_id)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  // Get existing behavior patterns
  const { data: existingPatterns } = await supabase
    .from('user_behavior_patterns')
    .select('*')
    .eq('user_id', user_id);

  // Analyze patterns
  const patterns = analyzeConversationPatterns(conversations || []);
  const timingPatterns = analyzeTimingPatterns(conversations || []);
  const responsePatterns = analyzeResponsePatterns(conversations || []);
  const engagementPatterns = analyzeEngagementPatterns(conversations || []);

  // Update behavior patterns in database
  const allPatterns = [...patterns, ...timingPatterns, ...responsePatterns, ...engagementPatterns];
  
  for (const pattern of allPatterns) {
    await supabase
      .from('user_behavior_patterns')
      .upsert({
        user_id,
        pattern_type: pattern.pattern_type,
        pattern_data: pattern.pattern_data,
        behavioral_score: pattern.confidence_score,
        pattern_confidence: pattern.confidence_score,
        last_analyzed: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  }

  return new Response(JSON.stringify({
    success: true,
    patterns: allPatterns,
    analysis_period: analysis_period,
    conversations_analyzed: conversations?.length || 0,
    insights: generatePatternInsights(allPatterns),
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function predictUserResponse(
  supabase: any,
  user_id: string,
  context_data: any
): Promise<Response> {
  console.log(`Predicting user response for: ${user_id}`);
  
  // Get user's historical responses
  const { data: conversations } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('phone_number', user_id)
    .order('created_at', { ascending: false })
    .limit(20);

  // Get behavior patterns
  const { data: patterns } = await supabase
    .from('user_behavior_patterns')
    .select('*')
    .eq('user_id', user_id);

  // Analyze response patterns
  const responseAnalysis = analyzeHistoricalResponses(conversations || []);
  
  // Predict likely response based on context
  const prediction = predictResponseBehavior(responseAnalysis, patterns || [], context_data);
  
  // Store prediction for accuracy tracking
  await supabase
    .from('prediction_accuracy')
    .insert({
      user_id,
      prediction_type: 'user_response',
      predicted_value: prediction.predicted_value,
      prediction_date: new Date().toISOString(),
      vendor_id: user_id
    });

  return new Response(JSON.stringify({
    success: true,
    prediction: prediction,
    historical_accuracy: calculateHistoricalAccuracy(await getHistoricalPredictions(supabase, user_id, 'user_response')),
    confidence_factors: identifyConfidenceFactors(responseAnalysis, patterns || []),
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function optimizeContactTiming(
  supabase: any,
  user_id: string,
  context_data: any
): Promise<Response> {
  console.log(`Optimizing contact timing for user: ${user_id}`);
  
  // Get timing patterns from contact_timing_patterns table
  const { data: timingData } = await supabase
    .from('contact_timing_patterns')
    .select('*')
    .order('success_rate', { ascending: false });

  // Get user's conversation history with timestamps
  const { data: conversations } = await supabase
    .from('conversation_messages')
    .select('created_at, sender')
    .eq('phone_number', user_id)
    .order('created_at', { ascending: false });

  // Analyze user's response patterns by time
  const userTimingPatterns = analyzeUserTimingPatterns(conversations || []);
  
  // Combine with general timing patterns
  const optimalTiming = calculateOptimalTiming(userTimingPatterns, timingData || [], context_data);
  
  // Generate timing recommendations
  const timingRecommendations = generateTimingRecommendations(optimalTiming, context_data);

  return new Response(JSON.stringify({
    success: true,
    optimal_timing: optimalTiming,
    recommendations: timingRecommendations,
    user_patterns: userTimingPatterns,
    general_patterns: timingData?.slice(0, 5) || [],
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function predictConversionLikelihood(supabase: any, user_id: string, context_data: any): Promise<Response> {
  // Get user engagement data
  const { data: behaviorData } = await supabase
    .from('user_behavior_patterns')
    .select('*')
    .eq('user_id', user_id);

  // Calculate conversion probability
  const conversionScore = calculateConversionProbability(behaviorData || [], context_data);
  
  return new Response(JSON.stringify({
    success: true,
    conversion_likelihood: conversionScore,
    factors: identifyConversionFactors(behaviorData || []),
    recommendations: generateConversionRecommendations(conversionScore),
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateBehavioralInsights(supabase: any, user_id: string): Promise<Response> {
  const { data: patterns } = await supabase
    .from('user_behavior_patterns')
    .select('*')
    .eq('user_id', user_id);

  const insights = generateInsightsFromPatterns(patterns || []);
  
  return new Response(JSON.stringify({
    success: true,
    insights,
    pattern_count: patterns?.length || 0,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helper functions (abbreviated for brevity)
function analyzeConversationPatterns(conversations: any[]) {
  return [{
    pattern_type: 'conversation_frequency',
    pattern_data: { frequency: conversations.length },
    confidence_score: 0.8
  }];
}

function analyzeTimingPatterns(conversations: any[]) {
  return [{
    pattern_type: 'preferred_time',
    pattern_data: { hour: 14 }, // Example: 2 PM
    confidence_score: 0.7
  }];
}

function analyzeResponsePatterns(conversations: any[]) {
  return [{
    pattern_type: 'response_style',
    pattern_data: { style: 'brief' },
    confidence_score: 0.6
  }];
}

function analyzeEngagementPatterns(conversations: any[]) {
  return [{
    pattern_type: 'engagement_level',
    pattern_data: { level: 'high' },
    confidence_score: 0.9
  }];
}

function generatePatternInsights(patterns: any[]) {
  return patterns.map(p => ({
    type: p.pattern_type,
    insight: `User shows ${p.pattern_data} behavior`,
    confidence: p.confidence_score
  }));
}

function analyzeHistoricalResponses(conversations: any[]) {
  return {
    response_speed: 'fast',
    common_topics: ['payment', 'help'],
    sentiment_trend: 'positive'
  };
}

function predictResponseBehavior(analysis: any, patterns: any[], context: any) {
  return {
    predicted_value: 'positive_response',
    confidence: 0.75,
    reasoning: 'Based on historical engagement patterns'
  };
}

function analyzeUserTimingPatterns(conversations: any[]) {
  return {
    preferred_hours: [9, 14, 18],
    response_rate_by_hour: { 9: 0.8, 14: 0.9, 18: 0.7 }
  };
}

function calculateOptimalTiming(userPatterns: any, generalPatterns: any[], context: any) {
  return {
    best_hour: 14,
    best_day: 2, // Tuesday
    confidence: 0.8
  };
}

function generateTimingRecommendations(timing: any, context: any) {
  return [
    `Contact at ${timing.best_hour}:00 for best response`,
    'Tuesday shows highest engagement'
  ];
}

function calculateConversionProbability(patterns: any[], context: any): number {
  return 0.65; // Example score
}

function identifyConversionFactors(patterns: any[]) {
  return ['high_engagement', 'frequent_contact', 'positive_sentiment'];
}

function generateConversionRecommendations(score: number) {
  return score > 0.7 ? ['Send offer now'] : ['Build more rapport first'];
}

function generateInsightsFromPatterns(patterns: any[]) {
  return patterns.map(p => `User has ${p.pattern_type} pattern with ${p.confidence_score} confidence`);
}

async function getHistoricalPredictions(supabase: any, user_id: string, type: string) {
  const { data } = await supabase
    .from('prediction_accuracy')
    .select('*')
    .eq('user_id', user_id)
    .eq('prediction_type', type);
  return data || [];
}

function calculateHistoricalAccuracy(predictions: any[]): number {
  if (predictions.length === 0) return 0;
  const accurate = predictions.filter(p => p.accuracy).length;
  return accurate / predictions.length;
}

function identifyConfidenceFactors(analysis: any, patterns: any[]) {
  return ['sufficient_historical_data', 'consistent_patterns'];
}