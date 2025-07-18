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

async function predictConversionLikelihood(
  supabase: any,
  user_id: string,
  context_data: any
): Promise<Response> {
  console.log(`Predicting conversion likelihood for user: ${user_id}`);
  
  // Get comprehensive user data
  const { data: conversations } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('phone_number', user_id);

  const { data: behaviorPatterns } = await supabase
    .from('user_behavior_patterns')
    .select('*')
    .eq('user_id', user_id);

  // Calculate conversion likelihood factors
  const conversionFactors = calculateConversionFactors(
    conversations || [],
    [],
    behaviorPatterns || [],
    context_data
  );

  // Predict conversion likelihood
  const conversionPrediction = predictConversion(conversionFactors, context_data);
  
  // Generate actionable recommendations
  const recommendations = generateConversionRecommendations(conversionPrediction, conversionFactors);

  // Store prediction
  await supabase
    .from('prediction_accuracy')
    .insert({
      user_id,
      prediction_type: 'conversion_likelihood',
      predicted_value: conversionPrediction.likelihood,
      prediction_date: new Date().toISOString(),
      vendor_id: user_id
    });

  return new Response(JSON.stringify({
    success: true,
    conversion_likelihood: conversionPrediction.likelihood,
    confidence: conversionPrediction.confidence,
    factors: conversionFactors,
    recommendations: recommendations,
    timeline_prediction: conversionPrediction.timeline,
    risk_factors: conversionPrediction.risk_factors,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateBehavioralInsights(
  supabase: any,
  user_id: string
): Promise<Response> {
  console.log(`Generating behavioral insights for user: ${user_id}`);
  
  // Get all relevant data
  const [conversationsResult, patternsResult] = await Promise.all([
    supabase
      .from('conversation_messages')
      .select('*')
      .eq('phone_number', user_id),
    supabase
      .from('user_behavior_patterns')
      .select('*')
      .eq('user_id', user_id)
  ]);

  const conversations = conversationsResult.data || [];
  const patterns = patternsResult.data || [];

  // Generate comprehensive insights
  const insights = {
    communication_style: analyzeCommunicationStyle(conversations),
    engagement_level: calculateEngagementLevel(conversations),
    decision_making_pattern: analyzeDecisionMaking(conversations, []),
    pain_points: identifyPainPoints(conversations, []),
    preferences: extractDetailedPreferences([], conversations),
    objection_patterns: analyzeObjectionPatterns(conversations),
    response_behavior: analyzeResponseBehavior(conversations),
    conversion_indicators: identifyConversionIndicators(conversations, [])
  };

  // Generate personalized recommendations
  const personalizedRecommendations = generatePersonalizedRecommendations(insights, patterns);

  return new Response(JSON.stringify({
    success: true,
    insights: insights,
    personalized_recommendations: personalizedRecommendations,
    behavioral_score: calculateOverallBehavioralScore(insights),
    key_insights: extractKeyInsights(insights),
    action_priorities: prioritizeActions(personalizedRecommendations),
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helper Functions
function analyzeConversationPatterns(conversations: any[]): UserBehaviorPattern[] {
  const patterns: UserBehaviorPattern[] = [];
  
  if (conversations.length === 0) return patterns;

  // Conversation frequency pattern
  const avgTimeBetween = calculateAverageTimeBetweenConversations(conversations);
  patterns.push({
    user_id: conversations[0]?.phone_number || '',
    pattern_type: 'conversation_frequency',
    pattern_data: {
      average_days_between: avgTimeBetween,
      total_conversations: conversations.length,
      frequency_category: categorizeFrequency(avgTimeBetween)
    },
    confidence_score: conversations.length >= 3 ? 0.8 : 0.5,
    last_updated: new Date().toISOString()
  });

  // Message length pattern
  const messageLengths = conversations.map(m => (m.message_text || '').length);
  
  if (messageLengths.length > 0) {
    patterns.push({
      user_id: conversations[0]?.phone_number || '',
      pattern_type: 'message_length',
      pattern_data: {
        average_length: messageLengths.reduce((a, b) => a + b, 0) / messageLengths.length,
        longest_message: Math.max(...messageLengths),
        shortest_message: Math.min(...messageLengths),
        communication_style: categorizeMessageLength(messageLengths)
      },
      confidence_score: messageLengths.length >= 5 ? 0.9 : 0.6,
      last_updated: new Date().toISOString()
    });
  }

  return patterns;
}

function analyzeTimingPatterns(conversations: any[]): UserBehaviorPattern[] {
  const patterns: UserBehaviorPattern[] = [];
  
  if (conversations.length === 0) return patterns;

  // Extract hours and days from conversation timestamps
  const timingData = conversations.map(c => {
    const date = new Date(c.created_at);
    return {
      hour: date.getHours(),
      day: date.getDay(),
      response_quality: 'positive' // Default since we don't have this field
    };
  });

  // Find preferred hours
  const hourCounts: Record<number, number> = {};
  timingData.forEach(t => {
    hourCounts[t.hour] = (hourCounts[t.hour] || 0) + 1;
  });

  const preferredHour = Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0];

  if (preferredHour) {
    patterns.push({
      user_id: conversations[0]?.phone_number || '',
      pattern_type: 'timing_preference',
      pattern_data: {
        preferred_hour: parseInt(preferredHour),
        hour_distribution: hourCounts,
        most_responsive_time: findMostResponsiveTime(timingData)
      },
      confidence_score: conversations.length >= 5 ? 0.8 : 0.6,
      last_updated: new Date().toISOString()
    });
  }

  return patterns;
}

function analyzeResponsePatterns(conversations: any[]): UserBehaviorPattern[] {
  const patterns: UserBehaviorPattern[] = [];
  
  // Analyze response time patterns based on message timestamps
  if (conversations.length > 1) {
    const responseTimes = [];
    for (let i = 1; i < conversations.length; i++) {
      const timeDiff = new Date(conversations[i].created_at).getTime() - 
                      new Date(conversations[i-1].created_at).getTime();
      responseTimes.push(timeDiff / (1000 * 60)); // Convert to minutes
    }

    if (responseTimes.length > 0) {
      patterns.push({
        user_id: conversations[0]?.phone_number || '',
        pattern_type: 'response_time',
        pattern_data: {
          average_response_time: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          fastest_response: Math.min(...responseTimes),
          slowest_response: Math.max(...responseTimes),
          response_consistency: calculateResponseConsistency(responseTimes)
        },
        confidence_score: responseTimes.length >= 3 ? 0.8 : 0.5,
        last_updated: new Date().toISOString()
      });
    }
  }

  return patterns;
}

function analyzeEngagementPatterns(conversations: any[]): UserBehaviorPattern[] {
  const patterns: UserBehaviorPattern[] = [];
  
  // Calculate engagement metrics
  const totalMessages = conversations.length;
  const avgMessagesPerConversation = 1; // Since we're dealing with individual messages
  
  const userMessages = conversations.filter(c => c.sender === 'user').length;
  const engagementScore = totalMessages > 0 ? userMessages / totalMessages : 0;

  patterns.push({
    user_id: conversations[0]?.phone_number || '',
    pattern_type: 'engagement_level',
    pattern_data: {
      total_conversations: totalMessages,
      average_messages_per_conversation: avgMessagesPerConversation,
      engagement_score: engagementScore,
      positive_interaction_ratio: engagementScore,
      engagement_trend: calculateEngagementTrend(conversations)
    },
    confidence_score: conversations.length >= 5 ? 0.9 : 0.6,
    last_updated: new Date().toISOString()
  });

  return patterns;
}

function analyzeHistoricalResponses(conversations: any[]): any {
  const userMessages = conversations.filter(c => c.sender === 'user');
  const positiveResponses = userMessages.filter(c => 
    (c.message_text || '').toLowerCase().includes('yes') ||
    (c.message_text || '').toLowerCase().includes('good') ||
    (c.message_text || '').toLowerCase().includes('thanks')
  ).length;

  return {
    total_conversations: conversations.length,
    positive_responses: positiveResponses,
    negative_responses: userMessages.length - positiveResponses,
    average_duration: 5, // Default since we don't have duration data
    response_patterns: extractResponsePatterns(conversations)
  };
}

function predictResponseBehavior(analysis: any, patterns: any[], context: any): PredictionResult {
  let confidence = 0.5;
  let predictedResponse = 'neutral';
  
  // Increase confidence based on data quality
  if (analysis.total_conversations >= 5) confidence += 0.2;
  if (patterns.length > 0) confidence += 0.1;
  
  // Predict response based on historical data
  const positiveRatio = analysis.total_conversations > 0 ? 
    analysis.positive_responses / analysis.total_conversations : 0;
  
  if (positiveRatio > 0.7) {
    predictedResponse = 'positive';
    confidence += 0.2;
  } else if (positiveRatio < 0.3) {
    predictedResponse = 'negative';
    confidence += 0.1;
  }

  return {
    prediction_type: 'user_response',
    predicted_value: predictedResponse,
    confidence: Math.min(confidence, 1.0),
    reasoning: `Based on ${analysis.total_conversations} conversations with ${(positiveRatio * 100).toFixed(1)}% positive responses`,
    recommended_actions: generateResponseActions(predictedResponse, analysis),
    timing_suggestions: generateTimingSuggestions(patterns)
  };
}

function calculateHistoricalAccuracy(predictions: any[]): number {
  if (predictions.length === 0) return 0;
  
  const accuratePredictions = predictions.filter(p => 
    p.actual_value && p.predicted_value === p.actual_value
  );
  
  return accuratePredictions.length / predictions.length;
}

function identifyConfidenceFactors(analysis: any, patterns: any[]): string[] {
  const factors = [];
  
  if (analysis.total_conversations >= 10) factors.push('Sufficient conversation history');
  if (patterns.length >= 3) factors.push('Multiple behavior patterns identified');
  if (analysis.positive_responses / analysis.total_conversations > 0.8) factors.push('Consistently positive interactions');
  
  return factors;
}

async function getHistoricalPredictions(supabase: any, user_id: string, prediction_type: string): Promise<any[]> {
  const { data } = await supabase
    .from('prediction_accuracy')
    .select('*')
    .eq('vendor_id', user_id)
    .eq('prediction_type', prediction_type);
  
  return data || [];
}

// Additional helper functions for timing, conversion, and insights
function analyzeUserTimingPatterns(conversations: any[]): any {
  const timingData = conversations.map(c => ({
    hour: new Date(c.created_at).getHours(),
    day: new Date(c.created_at).getDay(),
    satisfaction: 'positive', // Default
    duration: 5 // Default
  }));

  return {
    preferred_hours: findPreferredHours(timingData),
    preferred_days: findPreferredDays(timingData),
    best_response_times: findBestResponseTimes(timingData)
  };
}

function calculateOptimalTiming(userPatterns: any, generalPatterns: any[], context: any): any {
  return {
    recommended_hour: userPatterns.preferred_hours[0] || 14,
    recommended_day: userPatterns.preferred_days[0] || 1,
    confidence: calculateTimingConfidence(userPatterns, generalPatterns),
    alternative_times: userPatterns.preferred_hours.slice(1, 3)
  };
}

function generateTimingRecommendations(timing: any, context: any): string[] {
  const recommendations = [];
  
  recommendations.push(`Best time to contact: ${timing.recommended_hour}:00 on ${getDayName(timing.recommended_day)}`);
  
  if (timing.confidence < 0.6) {
    recommendations.push('Confidence is low - consider testing different times');
  }
  
  if (timing.alternative_times.length > 0) {
    recommendations.push(`Alternative times: ${timing.alternative_times.join(', ')}`);
  }
  
  return recommendations;
}

function calculateConversionFactors(conversations: any[], memory: any[], patterns: any[], context: any): any {
  return {
    engagement_score: calculateEngagementScore(conversations),
    response_quality: calculateAverageResponseQuality(conversations),
    objection_frequency: calculateObjectionFrequency(conversations, memory),
    timing_alignment: calculateTimingAlignment(conversations, patterns),
    interest_indicators: identifyInterestIndicators(conversations, memory),
    barrier_factors: identifyBarrierFactors(conversations, memory)
  };
}

function predictConversion(factors: any, context: any): any {
  let likelihood = 0.5;
  
  // Adjust based on factors
  likelihood += factors.engagement_score * 0.3;
  likelihood += factors.response_quality * 0.2;
  likelihood -= factors.objection_frequency * 0.2;
  likelihood += factors.timing_alignment * 0.1;
  likelihood += factors.interest_indicators.length * 0.05;
  likelihood -= factors.barrier_factors.length * 0.1;
  
  likelihood = Math.max(0, Math.min(1, likelihood));
  
  return {
    likelihood: likelihood,
    confidence: calculatePredictionConfidence(factors),
    timeline: predictTimelineToConversion(likelihood, factors),
    risk_factors: identifyConversionRisks(factors)
  };
}

function generateConversionRecommendations(prediction: any, factors: any): string[] {
  const recommendations = [];
  
  if (prediction.likelihood > 0.7) {
    recommendations.push('High conversion probability - focus on closing');
  } else if (prediction.likelihood < 0.3) {
    recommendations.push('Low conversion probability - focus on value building');
  } else {
    recommendations.push('Medium conversion probability - address objections');
  }
  
  if (factors.objection_frequency > 0.5) {
    recommendations.push('High objection frequency detected - use objection handling scripts');
  }
  
  return recommendations;
}

// Utility functions
function calculateAverageTimeBetweenConversations(conversations: any[]): number {
  if (conversations.length < 2) return 0;
  
  const dates = conversations.map(c => new Date(c.created_at)).sort();
  const intervals = [];
  
  for (let i = 1; i < dates.length; i++) {
    const diff = (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
    intervals.push(diff);
  }
  
  return intervals.reduce((a, b) => a + b, 0) / intervals.length;
}

function categorizeFrequency(avgDays: number): string {
  if (avgDays <= 1) return 'very_frequent';
  if (avgDays <= 3) return 'frequent';
  if (avgDays <= 7) return 'regular';
  if (avgDays <= 14) return 'occasional';
  return 'rare';
}

function categorizeMessageLength(lengths: number[]): string {
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  
  if (avgLength < 50) return 'concise';
  if (avgLength < 150) return 'moderate';
  return 'detailed';
}

function findMostResponsiveTime(timingData: any[]): number {
  const positiveByHour: Record<number, number> = {};
  
  timingData.forEach(t => {
    if (t.response_quality === 'positive') {
      positiveByHour[t.hour] = (positiveByHour[t.hour] || 0) + 1;
    }
  });
  
  return parseInt(Object.entries(positiveByHour)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || '14');
}

function calculateResponseConsistency(times: number[]): number {
  if (times.length < 2) return 0;
  
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  
  return Math.max(0, 1 - (stdDev / mean)); // Higher value = more consistent
}

function calculateEngagementTrend(conversations: any[]): string {
  if (conversations.length < 3) return 'insufficient_data';
  
  const recent = conversations.slice(0, Math.floor(conversations.length / 2));
  const older = conversations.slice(Math.floor(conversations.length / 2));
  
  const recentPositive = recent.filter(c => (c.message_text || '').toLowerCase().includes('yes')).length / recent.length;
  const olderPositive = older.filter(c => (c.message_text || '').toLowerCase().includes('yes')).length / older.length;
  
  if (recentPositive > olderPositive + 0.1) return 'improving';
  if (recentPositive < olderPositive - 0.1) return 'declining';
  return 'stable';
}

function extractResponsePatterns(conversations: any[]): any {
  return {
    quick_responders: conversations.filter(c => c.sender === 'user').length,
    thoughtful_responders: conversations.filter(c => (c.message_text || '').length > 100).length,
    engagement_pattern: calculateEngagementPattern(conversations)
  };
}

function calculateEngagementPattern(conversations: any[]): string {
  const avgLength = conversations.reduce((sum, c) => sum + (c.message_text || '').length, 0) / conversations.length;
  
  if (avgLength > 100) return 'highly_engaged';
  if (avgLength > 50) return 'moderately_engaged';
  return 'low_engagement';
}

function generateResponseActions(predictedResponse: string, analysis: any): string[] {
  switch (predictedResponse) {
    case 'positive':
      return ['Continue current approach', 'Focus on closing', 'Provide specific next steps'];
    case 'negative':
      return ['Address concerns first', 'Use empathy', 'Provide value demonstration'];
    default:
      return ['Build rapport', 'Identify pain points', 'Provide relevant information'];
  }
}

function generateTimingSuggestions(patterns: any[]): any {
  const timingPattern = patterns.find(p => p.pattern_type === 'timing_preference');
  
  if (timingPattern) {
    return {
      best_hour: timingPattern.pattern_data.preferred_hour,
      alternatives: timingPattern.pattern_data.hour_distribution
    };
  }
  
  return { best_hour: 14, alternatives: {} };
}

function findPreferredHours(timingData: any[]): number[] {
  const hourCounts: Record<number, number> = {};
  timingData.forEach(t => {
    hourCounts[t.hour] = (hourCounts[t.hour] || 0) + 1;
  });
  
  return Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));
}

function findPreferredDays(timingData: any[]): number[] {
  const dayCounts: Record<number, number> = {};
  timingData.forEach(t => {
    dayCounts[t.day] = (dayCounts[t.day] || 0) + 1;
  });
  
  return Object.entries(dayCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([day]) => parseInt(day));
}

function findBestResponseTimes(timingData: any[]): any {
  const responseTimes: Record<number, { total: number, positive: number }> = {};
  
  timingData.forEach(t => {
    if (!responseTimes[t.hour]) {
      responseTimes[t.hour] = { total: 0, positive: 0 };
    }
    responseTimes[t.hour].total++;
    if (t.satisfaction === 'positive') {
      responseTimes[t.hour].positive++;
    }
  });
  
  return Object.entries(responseTimes)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      success_rate: data.positive / data.total
    }))
    .sort((a, b) => b.success_rate - a.success_rate)
    .slice(0, 3);
}

function calculateTimingConfidence(userPatterns: any, generalPatterns: any[]): number {
  let confidence = 0.5;
  
  if (userPatterns.preferred_hours.length >= 3) confidence += 0.2;
  if (generalPatterns.length > 0) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

function getDayName(dayIndex: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex] || 'Monday';
}

function calculateEngagementScore(conversations: any[]): number {
  if (conversations.length === 0) return 0;
  
  const userMessages = conversations.filter(c => c.sender === 'user').length;
  const positiveMessages = conversations.filter(c => 
    (c.message_text || '').toLowerCase().includes('yes') ||
    (c.message_text || '').toLowerCase().includes('good')
  ).length;
  
  return (userMessages + positiveMessages) / (conversations.length * 2); // Normalize to 0-1
}

function calculateAverageResponseQuality(conversations: any[]): number {
  const positiveCount = conversations.filter(c => 
    (c.message_text || '').toLowerCase().includes('yes') ||
    (c.message_text || '').toLowerCase().includes('good') ||
    (c.message_text || '').toLowerCase().includes('thanks')
  ).length;
  
  return conversations.length > 0 ? positiveCount / conversations.length : 0;
}

function calculateObjectionFrequency(conversations: any[], memory: any[]): number {
  const objectionWords = ['no', 'not', 'cannot', 'difficult', 'expensive', 'busy'];
  const objectionCount = conversations.filter(c => 
    objectionWords.some(word => (c.message_text || '').toLowerCase().includes(word))
  ).length;
  
  return conversations.length > 0 ? objectionCount / conversations.length : 0;
}

function calculateTimingAlignment(conversations: any[], patterns: any[]): number {
  // Simplified calculation
  return 0.7;
}

function identifyInterestIndicators(conversations: any[], memory: any[]): string[] {
  const indicators = [];
  
  const hasQuestions = conversations.some(c => (c.message_text || '').includes('?'));
  if (hasQuestions) indicators.push('asking_questions');
  
  const hasPriceInquiry = conversations.some(c => 
    (c.message_text || '').toLowerCase().includes('price') ||
    (c.message_text || '').toLowerCase().includes('cost')
  );
  if (hasPriceInquiry) indicators.push('price_inquiry');
  
  return indicators;
}

function identifyBarrierFactors(conversations: any[], memory: any[]): string[] {
  const barriers = [];
  
  const hasTimeConstraints = conversations.some(c => 
    (c.message_text || '').toLowerCase().includes('busy') ||
    (c.message_text || '').toLowerCase().includes('time')
  );
  if (hasTimeConstraints) barriers.push('time_constraints');
  
  const hasPriceObjections = conversations.some(c => 
    (c.message_text || '').toLowerCase().includes('expensive') ||
    (c.message_text || '').toLowerCase().includes('costly')
  );
  if (hasPriceObjections) barriers.push('price_sensitivity');
  
  return barriers;
}

function calculatePredictionConfidence(factors: any): number {
  let confidence = 0.5;
  
  if (factors.engagement_score > 0.7) confidence += 0.2;
  if (factors.response_quality > 0.8) confidence += 0.1;
  if (factors.objection_frequency < 0.3) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

function predictTimelineToConversion(likelihood: number, factors: any): string {
  if (likelihood > 0.8) return '1-3 days';
  if (likelihood > 0.6) return '1-2 weeks';
  if (likelihood > 0.4) return '2-4 weeks';
  return '1+ months';
}

function identifyConversionRisks(factors: any): string[] {
  const risks = [];
  
  if (factors.objection_frequency > 0.5) risks.push('High objection rate');
  if (factors.engagement_score < 0.4) risks.push('Low engagement');
  if (factors.response_quality < 0.5) risks.push('Poor response quality');
  
  return risks;
}

// Insight generation functions
function analyzeCommunicationStyle(conversations: any[]): any {
  const avgLength = conversations.reduce((sum, c) => sum + (c.message_text || '').length, 0) / conversations.length;
  
  return {
    message_length: avgLength > 100 ? 'detailed' : avgLength > 50 ? 'moderate' : 'concise',
    formality_level: 'casual',
    response_speed: 'quick',
    engagement_depth: avgLength > 100 ? 'deep' : 'surface'
  };
}

function calculateEngagementLevel(conversations: any[]): number {
  return calculateEngagementScore(conversations);
}

function analyzeDecisionMaking(conversations: any[], memory: any[]): any {
  const hasQuestions = conversations.some(c => (c.message_text || '').includes('?'));
  
  return {
    decision_speed: hasQuestions ? 'deliberate' : 'quick',
    information_seeking: hasQuestions ? 'high' : 'low',
    consultation_tendency: 'moderate'
  };
}

function identifyPainPoints(conversations: any[], memory: any[]): string[] {
  const painPoints = [];
  
  if (conversations.some(c => (c.message_text || '').toLowerCase().includes('difficult'))) {
    painPoints.push('complexity_concerns');
  }
  
  if (conversations.some(c => (c.message_text || '').toLowerCase().includes('time'))) {
    painPoints.push('time_constraints');
  }
  
  if (conversations.some(c => (c.message_text || '').toLowerCase().includes('expensive'))) {
    painPoints.push('cost_sensitivity');
  }
  
  return painPoints;
}

function extractDetailedPreferences(memory: any[], conversations: any[]): any {
  return {
    communication_preference: 'direct',
    information_depth: 'detailed',
    interaction_style: 'professional'
  };
}

function analyzeObjectionPatterns(conversations: any[]): any {
  const objectionWords = ['no', 'not', 'cannot', 'difficult', 'expensive'];
  const objections = conversations.filter(c => 
    objectionWords.some(word => (c.message_text || '').toLowerCase().includes(word))
  );
  
  return {
    common_objections: ['time_constraints', 'complexity_concerns'],
    objection_frequency: conversations.length > 0 ? objections.length / conversations.length : 0,
    resolution_success: 0.7
  };
}

function analyzeResponseBehavior(conversations: any[]): any {
  const avgLength = conversations.reduce((sum, c) => sum + (c.message_text || '').length, 0) / conversations.length;
  
  return {
    response_time: 'moderate',
    message_depth: avgLength > 100 ? 'detailed' : 'brief',
    follow_through: 'good'
  };
}

function identifyConversionIndicators(conversations: any[], memory: any[]): string[] {
  const indicators = [];
  
  if (conversations.some(c => (c.message_text || '').includes('?'))) {
    indicators.push('asking_questions');
  }
  
  if (conversations.some(c => (c.message_text || '').toLowerCase().includes('demo'))) {
    indicators.push('demo_interest');
  }
  
  if (conversations.some(c => (c.message_text || '').toLowerCase().includes('price'))) {
    indicators.push('price_inquiry');
  }
  
  return indicators;
}

function generatePersonalizedRecommendations(insights: any, patterns: any[]): string[] {
  const recommendations = [];
  
  if (insights.communication_style.message_length === 'detailed') {
    recommendations.push('Provide comprehensive information');
  } else {
    recommendations.push('Keep responses concise and direct');
  }
  
  if (insights.pain_points.includes('time_constraints')) {
    recommendations.push('Emphasize time-saving benefits');
  }
  
  if (insights.conversion_indicators.includes('price_inquiry')) {
    recommendations.push('Focus on value proposition');
  }
  
  return recommendations;
}

function calculateOverallBehavioralScore(insights: any): number {
  let score = 0.5;
  
  if (insights.engagement_level > 0.7) score += 0.2;
  if (insights.conversion_indicators.length > 2) score += 0.1;
  if (insights.objection_patterns.objection_frequency < 0.3) score += 0.1;
  
  return Math.min(score, 1.0);
}

function extractKeyInsights(insights: any): string[] {
  const keyInsights = [];
  
  keyInsights.push(`Communication style: ${insights.communication_style.message_length}`);
  keyInsights.push(`Engagement level: ${insights.engagement_level > 0.7 ? 'high' : 'moderate'}`);
  
  if (insights.pain_points.length > 0) {
    keyInsights.push(`Main concerns: ${insights.pain_points.join(', ')}`);
  }
  
  return keyInsights;
}

function prioritizeActions(recommendations: string[]): any[] {
  return recommendations.map((rec, index) => ({
    action: rec,
    priority: index + 1,
    impact: index < 2 ? 'high' : 'medium'
  }));
}

function generatePatternInsights(patterns: UserBehaviorPattern[]): string[] {
  const insights = [];
  
  patterns.forEach(pattern => {
    switch (pattern.pattern_type) {
      case 'conversation_frequency':
        insights.push(`User has ${pattern.pattern_data.frequency_category} interaction pattern`);
        break;
      case 'timing_preference':
        insights.push(`Most active around ${pattern.pattern_data.preferred_hour}:00`);
        break;
      case 'engagement_level':
        insights.push(`Shows ${pattern.pattern_data.engagement_score > 0.7 ? 'high' : 'moderate'} engagement`);
        break;
      case 'message_length':
        insights.push(`Prefers ${pattern.pattern_data.communication_style} communication`);
        break;
    }
  });
  
  return insights;
}