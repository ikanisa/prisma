// ============================================================================
// Quality Gate v2 - Advanced Response Quality Control
// Validates and improves AI responses using multi-criteria analysis
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface QualityAssessment {
  overall_score: number;
  clarity_score: number;
  helpfulness_score: number;
  cultural_appropriateness: number;
  actionability_score: number;
  needs_improvement: boolean;
  improvement_suggestions: string[];
}

interface QualityResult {
  original_response: string;
  quality_assessment: QualityAssessment;
  improved_response?: string;
  should_use_improved: boolean;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      response_text, 
      user_message, 
      user_context = {},
      domain = 'general',
      language = 'en'
    } = await req.json();

    console.log(`🔍 Quality Gate: Analyzing response for domain: ${domain}`);

    const result = await analyzeAndImproveResponse(
      response_text,
      user_message,
      user_context,
      domain,
      language
    );

    // Log quality metrics for learning
    await logQualityMetrics(result, user_context.userId || 'unknown');

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in quality-gate-v2:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// Quality Analysis and Improvement
// ============================================================================

async function analyzeAndImproveResponse(
  responseText: string,
  userMessage: string,
  userContext: any,
  domain: string,
  language: string
): Promise<QualityResult> {
  
  // Step 1: Assess quality using multiple criteria
  const assessment = await assessResponseQuality(
    responseText, 
    userMessage, 
    userContext, 
    domain, 
    language
  );

  const result: QualityResult = {
    original_response: responseText,
    quality_assessment: assessment,
    should_use_improved: false,
    confidence: assessment.overall_score
  };

  // Step 2: If quality is below threshold, generate improvement
  if (assessment.overall_score < 0.7 || assessment.needs_improvement) {
    console.log(`⚠️ Response quality below threshold (${assessment.overall_score}), generating improvement`);
    
    const improvedResponse = await generateImprovedResponse(
      responseText,
      userMessage,
      userContext,
      domain,
      language,
      assessment.improvement_suggestions
    );

    if (improvedResponse) {
      result.improved_response = improvedResponse;
      result.should_use_improved = true;
    }
  }

  return result;
}

async function assessResponseQuality(
  responseText: string,
  userMessage: string,
  userContext: any,
  domain: string,
  language: string
): Promise<QualityAssessment> {
  
  const systemPrompt = `You are a quality assessment expert for Rwanda's mobile money and service platform.
  
  Assess this AI response across multiple dimensions and return JSON:
  {
    "overall_score": 0.0-1.0,
    "clarity_score": 0.0-1.0,
    "helpfulness_score": 0.0-1.0,
    "cultural_appropriateness": 0.0-1.0,
    "actionability_score": 0.0-1.0,
    "needs_improvement": boolean,
    "improvement_suggestions": ["specific suggestions"]
  }
  
  Quality Criteria:
  - Clarity: Is the response clear and easy to understand?
  - Helpfulness: Does it actually help the user accomplish their goal?
  - Cultural Appropriateness: Is it appropriate for Rwanda context and culture?
  - Actionability: Does it provide clear next steps or actions?
  
  Rwanda Context:
  - Mobile money (MoMo) is primary payment method
  - Kinyarwanda is local language (provide translations if needed)
  - Community-oriented culture
  - Focus on practical, immediate solutions`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: systemPrompt
      }, {
        role: 'user',
        content: `Domain: ${domain}
        Language: ${language}
        User Context: ${JSON.stringify(userContext)}
        
        User Message: "${userMessage}"
        AI Response: "${responseText}"
        
        Please assess the quality of this response.`
      }],
      temperature: 0.2
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateImprovedResponse(
  originalResponse: string,
  userMessage: string,
  userContext: any,
  domain: string,
  language: string,
  suggestions: string[]
): Promise<string | null> {
  
  const systemPrompt = `You are an expert at improving AI responses for Rwanda's mobile money and service platform.

  Improve the given response based on the feedback suggestions. Make it:
  - More clear and actionable
  - Culturally appropriate for Rwanda
  - Helpful and solution-focused
  - Include Kinyarwanda phrases when appropriate
  - Provide specific next steps

  Rwanda Context:
  - MTN MoMo and Airtel Money are main payment methods
  - Use respectful greetings like "Muraho" (Hello in Kinyarwanda)
  - Focus on immediate, practical solutions
  - Community and family are important values`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: systemPrompt
      }, {
        role: 'user',
        content: `Domain: ${domain}
        Language: ${language}
        User Context: ${JSON.stringify(userContext)}
        
        Original User Message: "${userMessage}"
        Original AI Response: "${originalResponse}"
        
        Improvement Suggestions:
        ${suggestions.map(s => `- ${s}`).join('\n')}
        
        Please provide an improved response that addresses these issues.`
      }],
      temperature: 0.3
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// ============================================================================
// Quality Metrics and Learning
// ============================================================================

async function logQualityMetrics(result: QualityResult, userId: string) {
  try {
    // Log to quality_feedback table
    await supabase.from('quality_feedback').insert({
      user_id: userId,
      original_response: result.original_response,
      patched_response: result.improved_response,
      quality_score: result.quality_assessment.overall_score,
      patch_reason: result.quality_assessment.improvement_suggestions.join('; '),
      model_used: 'gpt-4o'
    });

    // Log detailed metrics to system_metrics
    const metrics = [
      {
        metric_name: 'quality_gate_overall_score',
        metric_value: result.quality_assessment.overall_score,
        metric_type: 'quality',
        tags: { component: 'quality_gate', userId }
      },
      {
        metric_name: 'quality_gate_clarity_score',
        metric_value: result.quality_assessment.clarity_score,
        metric_type: 'quality',
        tags: { component: 'quality_gate', userId }
      },
      {
        metric_name: 'quality_gate_helpfulness_score',
        metric_value: result.quality_assessment.helpfulness_score,
        metric_type: 'quality',
        tags: { component: 'quality_gate', userId }
      },
      {
        metric_name: 'quality_gate_improvement_rate',
        metric_value: result.should_use_improved ? 1 : 0,
        metric_type: 'quality',
        tags: { component: 'quality_gate', userId }
      }
    ];

    await supabase.from('system_metrics').insert(metrics);

    console.log(`📊 Logged quality metrics for user ${userId}`);
  } catch (error) {
    console.error('Failed to log quality metrics:', error);
  }
}

// ============================================================================
// Quality Pattern Analysis (for continuous learning)
// ============================================================================

async function analyzeQualityPatterns(timeframe: string = '24h') {
  console.log(`📈 Analyzing quality patterns over ${timeframe}`);
  
  const cutoff = new Date();
  switch (timeframe) {
    case '1h':
      cutoff.setHours(cutoff.getHours() - 1);
      break;
    case '24h':
      cutoff.setDate(cutoff.getDate() - 1);
      break;
    case '7d':
      cutoff.setDate(cutoff.getDate() - 7);
      break;
  }

  const { data: qualityData } = await supabase
    .from('quality_feedback')
    .select('*')
    .gte('created_at', cutoff.toISOString());

  if (!qualityData || qualityData.length === 0) {
    return { message: 'No quality data found for analysis' };
  }

  const analysis = {
    total_responses: qualityData.length,
    avg_quality_score: qualityData.reduce((sum, item) => sum + item.quality_score, 0) / qualityData.length,
    improvement_rate: qualityData.filter(item => item.patched_response).length / qualityData.length,
    common_issues: extractCommonIssues(qualityData),
    trends: calculateQualityTrends(qualityData)
  };

  // Store analysis results
  await supabase.from('system_metrics').insert({
    metric_name: 'quality_analysis_result',
    metric_value: analysis.avg_quality_score,
    metric_type: 'analysis',
    tags: {
      timeframe,
      total_responses: analysis.total_responses,
      improvement_rate: analysis.improvement_rate
    }
  });

  return analysis;
}

function extractCommonIssues(qualityData: any[]): string[] {
  const issues = qualityData
    .map(item => item.patch_reason)
    .filter(reason => reason)
    .join(' ')
    .toLowerCase();

  const commonTerms = ['clarity', 'helpfulness', 'cultural', 'actionable', 'specific'];
  return commonTerms.filter(term => issues.includes(term));
}

function calculateQualityTrends(qualityData: any[]) {
  // Simple trend calculation - could be enhanced with more sophisticated analysis
  const sorted = qualityData.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const half = Math.floor(sorted.length / 2);
  
  const firstHalf = sorted.slice(0, half);
  const secondHalf = sorted.slice(half);
  
  const firstAvg = firstHalf.reduce((sum, item) => sum + item.quality_score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, item) => sum + item.quality_score, 0) / secondHalf.length;
  
  return {
    trend_direction: secondAvg > firstAvg ? 'improving' : 'declining',
    trend_magnitude: Math.abs(secondAvg - firstAvg),
    first_period_avg: firstAvg,
    second_period_avg: secondAvg
  };
}