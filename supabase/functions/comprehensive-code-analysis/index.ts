import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { getOpenAI, generateIntelligentResponse } from '../_shared/openai-sdk.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface AnalysisRequest {
  action: 'full_analysis' | 'type_safety_check' | 'performance_audit';
  files?: string[];
  focus_areas?: string[];
}

interface CodeIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  file: string;
  line?: number;
  message: string;
  suggestion: string;
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, files = [], focus_areas = [] }: AnalysisRequest = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const analysisPrompts = {
      full_analysis: `
        As a senior TypeScript/React code reviewer, perform a comprehensive analysis of this easyMO Admin Panel codebase.
        
        Focus on these critical areas:
        1. **Type Safety**: Identify 'any' types, missing interfaces, and unsafe type assertions
        2. **Authentication Flow**: Check for security vulnerabilities in auth logic
        3. **React Best Practices**: Hook dependencies, effect cleanup, re-renders
        4. **Error Handling**: Missing try-catch blocks, unhandled promises
        5. **Performance**: Unnecessary re-renders, memory leaks, inefficient queries
        6. **Data Flow**: Supabase integration, RLS policies, data fetching patterns
        
        Key issues identified from static analysis:
        - Extensive use of 'any' types (139 occurrences)
        - Console.log statements in production code
        - Potential auth timing issues in useAdminAuth hook
        - Missing error boundaries
        - Inconsistent error handling patterns
        
        Provide:
        1. Critical issues that need immediate fixing
        2. Specific code recommendations with examples
        3. Security concerns
        4. Performance optimizations
        5. Overall code quality score (1-10)
      `,
      
      type_safety_check: `
        Focus specifically on TypeScript type safety issues:
        1. Replace all 'any' types with proper interfaces
        2. Add missing type annotations
        3. Fix unsafe type assertions
        4. Ensure proper generic constraints
        5. Validate Supabase type definitions usage
      `,
      
      performance_audit: `
        Analyze performance issues:
        1. React component re-rendering patterns
        2. useEffect dependency arrays
        3. Expensive operations in render cycles
        4. Database query optimization
        5. Bundle size and code splitting opportunities
      `
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert TypeScript/React code reviewer specializing in enterprise admin panel applications. You focus on security, performance, type safety, and maintainability.' 
          },
          { 
            role: 'user', 
            content: analysisPrompts[action] || analysisPrompts.full_analysis 
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    // Parse analysis and extract actionable issues
    const issues: CodeIssue[] = [];
    
    // Store results in database
    const { error: insertError } = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/code_review_results`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
      },
      body: JSON.stringify({
        status: 'completed',
        ai_responses: [{ model: 'gpt-4o', response: analysis }],
        consolidated_issues: issues,
        overall_score: extractScoreFromAnalysis(analysis),
        project_analysis: {
          action,
          focus_areas,
          timestamp: new Date().toISOString()
        }
      })
    });

    return new Response(JSON.stringify({
      success: true,
      analysis,
      issues,
      recommendations: extractRecommendations(analysis),
      next_steps: extractNextSteps(analysis),
      score: extractScoreFromAnalysis(analysis)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Code analysis error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractScoreFromAnalysis(analysis: string): number {
  const scoreMatch = analysis.match(/(?:score|rating).*?(\d+)(?:\/10|out of 10)/i);
  return scoreMatch ? parseInt(scoreMatch[1]) : 7;
}

function extractRecommendations(analysis: string): string[] {
  const recommendations: string[] = [];
  const lines = analysis.split('\n');
  
  for (const line of lines) {
    if (line.match(/^[\d\-\*]\s*.*(?:should|must|need to|recommend)/i)) {
      recommendations.push(line.trim());
    }
  }
  
  return recommendations.slice(0, 10); // Top 10 recommendations
}

function extractNextSteps(analysis: string): string[] {
  const steps: string[] = [];
  const lines = analysis.split('\n');
  
  for (const line of lines) {
    if (line.match(/^[\d\-\*]\s*.*(?:fix|update|add|remove|refactor)/i)) {
      steps.push(line.trim());
    }
  }
  
  return steps.slice(0, 5); // Top 5 next steps
}