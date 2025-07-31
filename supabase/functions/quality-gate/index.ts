import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualityCheckRequest {
  response: string;
  context: {
    userMessage: string;
    userType?: string;
    conversationCount: number;
    memoryEntries: number;
  };
  channel: string;
}

interface QualityResult {
  approved: boolean;
  score: number;
  issues: string[];
  improvements: string[];
  enhancedResponse?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { response, context, channel }: QualityCheckRequest = await req.json();
    
    console.log(`🔍 Quality Gate: Checking response quality`);

    const qualityResult = await evaluateResponse(response, context);
    
    // If quality is low, enhance the response
    if (qualityResult.score < 0.6) {
      qualityResult.enhancedResponse = enhanceResponse(response, context, qualityResult.issues);
    }

    console.log(`✅ Quality check complete: ${qualityResult.score} score, ${qualityResult.approved ? 'APPROVED' : 'REJECTED'}`);

    return new Response(JSON.stringify(qualityResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Quality Gate error:', error);
    
    return new Response(JSON.stringify({
      approved: false,
      score: 0,
      issues: ['Quality gate system error'],
      improvements: ['Use fallback response'],
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function evaluateResponse(response: string, context: any): Promise<QualityResult> {
  const issues = [];
  const improvements = [];
  let score = 1.0;

  // Check for robotic patterns
  if (isRobotic(response)) {
    issues.push('Response appears robotic or templated');
    improvements.push('Add more natural, conversational language');
    score -= 0.3;
  }

  // Check for context relevance
  if (!isContextRelevant(response, context)) {
    issues.push('Response not relevant to user context');
    improvements.push('Reference user type or previous conversation');
    score -= 0.2;
  }

  // Check for appropriate length
  if (response.length > 300) {
    issues.push('Response too long for messaging platform');
    improvements.push('Keep responses under 2 sentences');
    score -= 0.1;
  }

  if (response.length < 20) {
    issues.push('Response too short and unhelpful');
    improvements.push('Provide more helpful information');
    score -= 0.2;
  }

  // Check for easyMO reference
  if (!response.toLowerCase().includes('easymo') && !response.toLowerCase().includes('easy.ikanisa.com')) {
    issues.push('Missing easyMO product reference');
    improvements.push('Include easyMO website link');
    score -= 0.1;
  }

  // Check for personalization
  if (context.userType && !isPersonalized(response, context.userType)) {
    issues.push('Response not personalized for user type');
    improvements.push(`Tailor response for ${context.userType}`);
    score -= 0.15;
  }

  // Check for conversation awareness
  if (context.conversationCount > 0 && !showsConversationAwareness(response)) {
    issues.push('Response lacks conversation history awareness');
    improvements.push('Reference previous interactions');
    score -= 0.1;
  }

  const approved = score >= 0.6 && issues.length <= 2;

  return {
    approved,
    score: Math.max(0, score),
    issues,
    improvements
  };
}

function isRobotic(response: string): boolean {
  const roboticPatterns = [
    /I am an AI/i,
    /How can I help you today/i,
    /Thank you for contacting/i,
    /Please let me know if/i,
    /I understand that you/i,
    /As an AI assistant/i
  ];
  
  return roboticPatterns.some(pattern => pattern.test(response));
}

function isContextRelevant(response: string, context: any): boolean {
  const lowerResponse = response.toLowerCase();
  const lowerMessage = context.userMessage.toLowerCase();
  
  // Check if response addresses user's question
  if (lowerMessage.includes('how') && !lowerResponse.includes('how')) {
    return false;
  }
  
  if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return lowerResponse.includes('free') || lowerResponse.includes('cost') || lowerResponse.includes('price');
  }
  
  return true;
}

function isPersonalized(response: string, userType: string): boolean {
  const lowerResponse = response.toLowerCase();
  
  const typeKeywords = {
    'moto_driver': ['moto', 'driver', 'rider', 'transport'],
    'hospitality_worker': ['bar', 'restaurant', 'waiter', 'tip'],
    'vendor': ['business', 'customer', 'sell', 'vendor']
  };
  
  const keywords = typeKeywords[userType] || [];
  return keywords.some(keyword => lowerResponse.includes(keyword));
}

function showsConversationAwareness(response: string): boolean {
  const awarenessWords = [
    'again', 'back', 'continue', 'discussed', 'mentioned', 
    'before', 'previous', 'last time', 'earlier'
  ];
  
  const lowerResponse = response.toLowerCase();
  return awarenessWords.some(word => lowerResponse.includes(word));
}

function enhanceResponse(response: string, context: any, issues: string[]): string {
  let enhanced = response;
  
  // Add personalization if missing
  if (context.userType && issues.includes('Response not personalized for user type')) {
    const personalizations = {
      'moto_driver': 'Perfect for moto drivers like you! ',
      'hospitality_worker': 'Great for bars and restaurants! ',
      'vendor': 'Ideal for vendors and small businesses! '
    };
    enhanced = personalizations[context.userType] + enhanced;
  }
  
  // Add conversation awareness if missing
  if (context.conversationCount > 0 && issues.includes('Response lacks conversation history awareness')) {
    enhanced = 'Thanks for staying in touch! ' + enhanced;
  }
  
  // Ensure easyMO reference
  if (!enhanced.toLowerCase().includes('easymo') && !enhanced.toLowerCase().includes('easy.ikanisa.com')) {
    enhanced += ' Check it out at https://easy.ikanisa.com/';
  }
  
  // Trim if too long
  if (enhanced.length > 280) {
    enhanced = enhanced.substring(0, 250) + '... Visit https://easy.ikanisa.com/';
  }
  
  return enhanced;
}