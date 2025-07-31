import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PredictionRequest {
  userId: string;
  currentMessage: string;
  conversationHistory: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  userContext?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, currentMessage, conversationHistory, userContext }: PredictionRequest = await req.json();
    
    console.log(`🔮 Predictive Response Engine: Analyzing patterns for user ${userId}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Analyze conversation patterns
    const patterns = analyzeConversationPatterns(conversationHistory, currentMessage);
    
    // Get user behavioral data
    const behaviorData = await getUserBehaviorData(supabase, userId);
    
    // Predict likely responses and objections
    const predictions = generateResponsePredictions(patterns, behaviorData, userContext);
    
    // Calculate engagement probability
    const engagementProbability = calculateEngagementProbability(patterns, behaviorData);
    
    // Generate proactive suggestions
    const proactiveSuggestions = generateProactiveSuggestions(predictions, engagementProbability);
    
    // Store prediction results for learning
    await storePredictionResults(supabase, userId, predictions, engagementProbability);

    return new Response(JSON.stringify({
      success: true,
      predictions: {
        likelyResponses: predictions.responses,
        potentialObjections: predictions.objections,
        recommendedApproach: predictions.approach,
        engagementProbability,
        proactiveSuggestions,
        confidenceScore: predictions.confidence
      },
      patterns: {
        conversationStage: patterns.stage,
        sentimentTrend: patterns.sentiment,
        responseTime: patterns.avgResponseTime,
        engagementLevel: patterns.engagement
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Predictive Response Engine error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      predictions: {
        likelyResponses: ['I need more information'],
        potentialObjections: ['cost_concern'],
        recommendedApproach: 'informational',
        engagementProbability: 0.5
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function analyzeConversationPatterns(history: any[], currentMessage: string) {
  const patterns = {
    stage: 'discovery',
    sentiment: 0,
    avgResponseTime: 0,
    engagement: 0.5,
    keywordFrequency: {},
    questionCount: 0,
    objectionCount: 0
  };

  if (history.length === 0) return patterns;

  // Analyze sentiment progression
  let totalSentiment = 0;
  let questionCount = 0;
  let objectionCount = 0;
  
  history.forEach((msg, index) => {
    if (msg.role === 'user') {
      // Simple sentiment analysis
      const sentiment = analyzeSentiment(msg.content);
      totalSentiment += sentiment;
      
      // Count questions and objections
      if (msg.content.includes('?')) questionCount++;
      if (containsObjection(msg.content)) objectionCount++;
    }
  });

  patterns.sentiment = totalSentiment / history.filter(m => m.role === 'user').length;
  patterns.questionCount = questionCount;
  patterns.objectionCount = objectionCount;

  // Determine conversation stage
  patterns.stage = determineConversationStage(currentMessage, patterns);
  
  // Calculate engagement level
  patterns.engagement = calculateEngagementLevel(history, patterns);

  return patterns;
}

function analyzeSentiment(text: string): number {
  const positive = ['good', 'great', 'excellent', 'yes', 'interested', 'want', 'need'];
  const negative = ['no', 'not', 'bad', 'expensive', 'difficult', 'problem', 'issue'];
  
  const lowerText = text.toLowerCase();
  let score = 0;
  
  positive.forEach(word => {
    if (lowerText.includes(word)) score += 0.1;
  });
  
  negative.forEach(word => {
    if (lowerText.includes(word)) score -= 0.1;
  });
  
  return Math.max(-1, Math.min(1, score));
}

function containsObjection(text: string): boolean {
  const objectionKeywords = [
    'already', 'expensive', 'complicated', 'difficult', 'time', 'busy',
    'not interested', 'no need', 'working fine', 'satisfied'
  ];
  
  const lowerText = text.toLowerCase();
  return objectionKeywords.some(keyword => lowerText.includes(keyword));
}

function determineConversationStage(message: string, patterns: any): string {
  const lowerMessage = message.toLowerCase();
  
  if (patterns.questionCount === 0 && patterns.objectionCount === 0) {
    return 'awareness';
  }
  
  if (lowerMessage.includes('how') || lowerMessage.includes('what') || lowerMessage.includes('?')) {
    return 'interest';
  }
  
  if (patterns.objectionCount > 0) {
    return 'consideration';
  }
  
  if (lowerMessage.includes('want') || lowerMessage.includes('try') || lowerMessage.includes('start')) {
    return 'intent';
  }
  
  return 'discovery';
}

function calculateEngagementLevel(history: any[], patterns: any): number {
  let engagement = 0.5; // Base engagement
  
  // More questions = higher engagement
  engagement += patterns.questionCount * 0.1;
  
  // Positive sentiment increases engagement
  if (patterns.sentiment > 0) {
    engagement += patterns.sentiment * 0.2;
  }
  
  // Recent activity increases engagement
  if (history.length > 3) {
    engagement += 0.1;
  }
  
  return Math.min(1, engagement);
}

async function getUserBehaviorData(supabase: any, userId: string) {
  const { data: behaviorData } = await supabase
    .from('user_behavior_patterns')
    .select('*')
    .eq('user_id', userId);

  return behaviorData || [];
}

function generateResponsePredictions(patterns: any, behaviorData: any[], userContext: any) {
  const predictions = {
    responses: [],
    objections: [],
    approach: 'informational',
    confidence: 0.6
  };

  // Predict likely responses based on stage
  switch (patterns.stage) {
    case 'awareness':
      predictions.responses = ['What is easyMO?', 'How does it work?', 'Tell me more'];
      predictions.approach = 'educational';
      break;
    case 'interest':
      predictions.responses = ['How much does it cost?', 'Is it safe?', 'Can I try it?'];
      predictions.approach = 'demonstrative';
      break;
    case 'consideration':
      predictions.responses = ['I already use MoMo', 'Seems complicated', 'Not sure I need it'];
      predictions.objections = ['existing_solution', 'complexity_concern', 'need_justification'];
      predictions.approach = 'reassuring';
      break;
    case 'intent':
      predictions.responses = ['How do I start?', 'Show me the demo', 'Send me the link'];
      predictions.approach = 'action-oriented';
      break;
  }

  // Adjust based on user type
  const userType = behaviorData.find(b => b.pattern_type === 'user_type')?.pattern_data?.type;
  if (userType) {
    predictions.responses = adjustForUserType(predictions.responses, userType);
  }

  // Calculate confidence based on available data
  predictions.confidence = Math.min(0.9, 0.4 + (behaviorData.length * 0.1) + (patterns.engagement * 0.3));

  return predictions;
}

function adjustForUserType(responses: string[], userType: string): string[] {
  const typeSpecificResponses = {
    moto_driver: ['How fast is the payment?', 'Do passengers know how to scan?', 'Will it work during rain?'],
    bar_owner: ['Can waiters use this?', 'What about tips?', 'Does it work when busy?'],
    vendor: ['Will customers understand?', 'Is it better than cash?', 'Do I need to print anything?']
  };

  return typeSpecificResponses[userType] || responses;
}

function calculateEngagementProbability(patterns: any, behaviorData: any[]): number {
  let probability = 0.5; // Base probability
  
  // Positive sentiment increases probability
  probability += patterns.sentiment * 0.2;
  
  // Questions show engagement
  probability += patterns.questionCount * 0.1;
  
  // Objections can be positive (shows consideration)
  if (patterns.objectionCount > 0 && patterns.objectionCount < 3) {
    probability += 0.1;
  }
  
  // Previous engagement data
  const engagementHistory = behaviorData.find(b => b.pattern_type === 'engagement_level');
  if (engagementHistory) {
    const previousEngagement = parseFloat(engagementHistory.behavioral_score) || 0.5;
    probability = (probability + previousEngagement) / 2;
  }
  
  return Math.max(0.1, Math.min(0.95, probability));
}

function generateProactiveSuggestions(predictions: any, engagementProbability: number): string[] {
  const suggestions = [];
  
  if (engagementProbability > 0.7) {
    suggestions.push('Offer immediate demo or trial');
    suggestions.push('Share success story from similar user type');
  }
  
  if (predictions.objections.length > 0) {
    suggestions.push('Prepare objection-specific responses');
    suggestions.push('Use social proof to address concerns');
  }
  
  if (engagementProbability < 0.4) {
    suggestions.push('Ask discovery questions to re-engage');
    suggestions.push('Provide value-focused messaging');
  }
  
  return suggestions;
}

async function storePredictionResults(supabase: any, userId: string, predictions: any, engagement: number) {
  try {
    await supabase
      .from('conversation_learning_log')
      .insert([{
        user_id: userId,
        learning_summary: `Predicted: ${predictions.approach} approach, ${predictions.confidence} confidence`,
        confidence_level: predictions.confidence,
        improvement_note: `Engagement probability: ${engagement}`,
        timestamp: new Date().toISOString()
      }]);
  } catch (error) {
    console.error('Failed to store prediction results:', error);
  }
}