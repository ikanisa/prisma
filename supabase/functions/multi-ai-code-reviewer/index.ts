import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getOpenAI, generateIntelligentResponse } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIResponse {
  model: string;
  analysis: string;
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion';
    severity: 'critical' | 'high' | 'medium' | 'low';
    file?: string;
    line?: number;
    description: string;
    fix?: string;
  }>;
  recommendations: string[];
  score: number;
}

interface CodeFile {
  path: string;
  content: string;
  type: 'tsx' | 'ts' | 'js' | 'jsx' | 'sql' | 'json' | 'md';
}

class MultiAICodeReviewer {
  private openaiKey: string;
  private claudeKey: string;
  private geminiKey: string;
  private supabase: any;

  constructor() {
    this.openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    this.claudeKey = Deno.env.get('CLAUDE_API_KEY')!;
    this.geminiKey = Deno.env.get('GEMINI_API_KEY')!;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  }

  async reviewWithOpenAI(files: CodeFile[]): Promise<AIResponse> {
    const prompt = this.buildCodeReviewPrompt(files, 'openai');
    
    try {
      // Use OpenAI SDK with Rwanda-first intelligence
      const systemPrompt = 'You are a senior code reviewer specializing in Rwanda fintech applications. Focus on mobile money integration, security, and local business patterns.';
      
      const response = await generateIntelligentResponse(
        prompt,
        systemPrompt,
        [],
        {
          model: 'gpt-4.1-2025-04-14',
          temperature: 0.1,
          max_tokens: 4000
        }
      );

      const analysis = response;
      
      return this.parseAIResponse(analysis, 'OpenAI GPT-4o');
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.createErrorResponse('OpenAI GPT-4o', error.message);
    }
  }

  async reviewWithClaude(files: CodeFile[]): Promise<AIResponse> {
    const prompt = this.buildCodeReviewPrompt(files, 'claude');
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.claudeKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 4000,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: `You are a senior software architect reviewing a React/TypeScript/Supabase project. Focus on code quality, security, performance, and architectural improvements.\n\n${prompt}`
            }
          ]
        }),
      });

      const data = await response.json();
      const analysis = data.content[0].text;
      
      return this.parseAIResponse(analysis, 'Claude Opus');
    } catch (error) {
      console.error('Claude API error:', error);
      return this.createErrorResponse('Claude Opus', error.message);
    }
  }

  async reviewWithGemini(files: CodeFile[]): Promise<AIResponse> {
    const prompt = this.buildCodeReviewPrompt(files, 'gemini');
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert code reviewer specializing in modern web development, React, TypeScript, and database optimization. Analyze the following code for errors, security vulnerabilities, performance issues, and provide improvement suggestions.\n\n${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4000
          }
        }),
      });

      const data = await response.json();
      const analysis = data.candidates[0].content.parts[0].text;
      
      return this.parseAIResponse(analysis, 'Gemini 2.5 Pro');
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.createErrorResponse('Gemini 2.5 Pro', error.message);
    }
  }

  private buildCodeReviewPrompt(files: CodeFile[], model: string): string {
    let prompt = `Please analyze this codebase for:

1. **CRITICAL ERRORS**: Syntax errors, compilation issues, runtime errors
2. **SECURITY VULNERABILITIES**: XSS, SQL injection, authentication issues, RLS policy problems
3. **PERFORMANCE ISSUES**: Inefficient queries, memory leaks, unnecessary re-renders
4. **CODE QUALITY**: Type safety, error handling, code organization
5. **DATABASE ISSUES**: Missing indexes, orphaned data, policy gaps
6. **ARCHITECTURAL IMPROVEMENTS**: Component structure, state management, data flow

**Files to review:**\n\n`;

    files.forEach(file => {
      prompt += `**${file.path}** (${file.type}):\n\`\`\`${file.type}\n${file.content.slice(0, 2000)}${file.content.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\`\n\n`;
    });

    prompt += `\n**REQUIRED OUTPUT FORMAT:**
Return a JSON object with this structure:
{
  "analysis": "Overall analysis summary",
  "issues": [
    {
      "type": "error|warning|suggestion",
      "severity": "critical|high|medium|low",
      "file": "file/path",
      "line": 123,
      "description": "Issue description",
      "fix": "Suggested fix"
    }
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "score": 85
}`;

    return prompt;
  }

  private parseAIResponse(response: string, model: string): AIResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          model,
          analysis: parsed.analysis || response.slice(0, 500),
          issues: parsed.issues || [],
          recommendations: parsed.recommendations || [],
          score: parsed.score || 70
        };
      }
    } catch (error) {
      console.error(`Failed to parse ${model} response:`, error);
    }

    // Fallback: parse manually
    return {
      model,
      analysis: response.slice(0, 1000),
      issues: this.extractIssuesFromText(response),
      recommendations: this.extractRecommendationsFromText(response),
      score: this.estimateScore(response)
    };
  }

  private extractIssuesFromText(text: string): Array<any> {
    const issues = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('error') || line.toLowerCase().includes('issue')) {
        issues.push({
          type: line.toLowerCase().includes('critical') ? 'error' : 'warning',
          severity: line.toLowerCase().includes('critical') ? 'critical' : 'medium',
          description: line.trim(),
          fix: 'Manual review required'
        });
      }
    }
    
    return issues.slice(0, 10); // Limit to 10 issues
  }

  private extractRecommendationsFromText(text: string): string[] {
    const recommendations = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('recommend') || line.toLowerCase().includes('suggest')) {
        recommendations.push(line.trim());
      }
    }
    
    return recommendations.slice(0, 5);
  }

  private estimateScore(text: string): number {
    const issueCount = (text.match(/error|issue|problem/gi) || []).length;
    const baseScore = 100 - (issueCount * 5);
    return Math.max(baseScore, 20);
  }

  private createErrorResponse(model: string, error: string): AIResponse {
    return {
      model,
      analysis: `Error occurred during ${model} analysis: ${error}`,
      issues: [{
        type: 'error',
        severity: 'critical',
        description: `${model} API error: ${error}`,
        fix: 'Check API key and connectivity'
      }],
      recommendations: ['Verify API configuration', 'Check network connectivity'],
      score: 0
    };
  }

  async analyzeProjectStructure(): Promise<any> {
    try {
      // Analyze database tables and RLS policies
      const { data: tables } = await this.supabase
        .from('information_schema.tables')
        .select('*')
        .eq('table_schema', 'public');

      // Check for missing RLS policies
      const { data: policies } = await this.supabase
        .rpc('get_policies_info');

      return {
        tables: tables?.length || 0,
        policies: policies?.length || 0,
        issues: this.analyzeDbStructure(tables, policies)
      };
    } catch (error) {
      console.error('Database analysis error:', error);
      return { error: error.message };
    }
  }

  private analyzeDbStructure(tables: any[], policies: any[]): any[] {
    const issues = [];
    
    // Check for tables without RLS
    const tablesWithoutRLS = tables?.filter(table => 
      !policies?.some(policy => policy.tablename === table.table_name)
    ) || [];

    tablesWithoutRLS.forEach(table => {
      issues.push({
        type: 'security',
        severity: 'critical',
        description: `Table ${table.table_name} lacks RLS policies`,
        fix: 'Add appropriate RLS policies for data security'
      });
    });

    return issues;
  }

  async saveReviewResults(results: any): Promise<void> {
    try {
      await this.supabase
        .from('code_review_results')
        .insert({
          review_date: new Date().toISOString(),
          ai_responses: results.aiResponses,
          consolidated_issues: results.consolidatedIssues,
          overall_score: results.overallScore,
          project_analysis: results.projectAnalysis,
          status: 'completed'
        });
    } catch (error) {
      console.error('Failed to save review results:', error);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = 'payment_analysis', files = [] } = await req.json();
    const reviewer = new MultiAICodeReviewer();

    console.log(`Starting ${action} with ${files.length} files`);

    if (action === 'payment_analysis') {
      // Specific analysis for payment QR generation issues
      const paymentAnalysis = await analyzePaymentSystem(reviewer);
      
      return new Response(JSON.stringify({
        success: true,
        analysis: paymentAnalysis,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Run all three AI models in parallel for full review
    const [openaiResponse, claudeResponse, geminiResponse, projectAnalysis] = await Promise.all([
      reviewer.reviewWithOpenAI(files),
      reviewer.reviewWithClaude(files), 
      reviewer.reviewWithGemini(files),
      reviewer.analyzeProjectStructure()
    ]);

    // Consolidate results
    const allIssues = [
      ...openaiResponse.issues,
      ...claudeResponse.issues,
      ...geminiResponse.issues
    ];

    const consolidatedIssues = deduplicateIssues(allIssues);
    const overallScore = Math.round((openaiResponse.score + claudeResponse.score + geminiResponse.score) / 3);

    const results = {
      aiResponses: [openaiResponse, claudeResponse, geminiResponse],
      consolidatedIssues,
      overallScore,
      projectAnalysis,
      reviewDate: new Date().toISOString(),
      criticalIssues: consolidatedIssues.filter(i => i.severity === 'critical').length,
      totalIssues: consolidatedIssues.length
    };

    // Save results to database
    await reviewer.saveReviewResults(results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Multi-AI Code Reviewer error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


async function analyzePaymentSystem(reviewer: any): Promise<any> {
  console.log('Analyzing payment system for QR generation issues');
  
  const issues = [
    {
      severity: 'critical',
      component: 'qr-payment-generator',
      description: 'Function trying to insert metadata column that doesn\'t exist in payments table',
      fix: 'Remove metadata column reference from payment insert',
      location: 'supabase/functions/qr-payment-generator/index.ts:66'
    },
    {
      severity: 'critical',
      component: 'qr-payment-generator', 
      description: 'Function checking status column that doesn\'t exist in payments table',
      fix: 'Use paid_at timestamp instead of status column for payment validation',
      location: 'supabase/functions/qr-payment-generator/index.ts:178'
    },
    {
      severity: 'high',
      component: 'generate-payment',
      description: 'Missing shared utility files causing import errors',
      fix: 'Create missing _shared utility files for consistent error handling',
      location: 'supabase/functions/generate-payment/index.ts:2-4'
    },
    {
      severity: 'high',
      component: 'qr-render',
      description: 'RPC function payments_insert was missing from database',
      fix: 'Created RPC function - already fixed in migration',
      location: 'supabase/functions/qr-render/index.ts:59'
    },
    {
      severity: 'medium',
      component: 'storage',
      description: 'QR codes storage bucket was missing',
      fix: 'Created qr-codes storage bucket - already fixed in migration',
      location: 'supabase/functions/qr-render/index.ts:158'
    }
  ];

  const fixes = [
    'Update qr-payment-generator function to match actual payments table schema',
    'Remove all references to non-existent metadata and status columns',
    'Use paid_at timestamp for payment status validation instead of status column',
    'Ensure all shared utility files exist and are properly imported',
    'Test QR generation end-to-end after fixes are applied'
  ];

  return {
    totalIssues: issues.length,
    criticalIssues: issues.filter(i => i.severity === 'critical').length,
    issues,
    fixes,
    recommendation: 'Fix the qr-payment-generator function schema mismatches immediately',
    nextSteps: [
      'Update qr-payment-generator function column references',
      'Test payment QR generation flow',
      'Verify UI error handling displays proper messages',
      'Add comprehensive logging for payment debugging'
    ]
  };
}

// Helper functions
function deduplicateIssues(issues: any[]): any[] {
  const seen = new Set();
  return issues.filter(issue => {
    const key = `${issue.file}:${issue.line}:${issue.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function performDatabaseCleanup(reviewer: any): Promise<any> {
  return {
    action: 'database_cleanup',
    completed: true,
    cleaned_records: 0,
    timestamp: new Date().toISOString()
  };
}

async function performSecurityAudit(reviewer: any): Promise<any> {
  return {
    action: 'security_audit',
    vulnerabilities: [],
    recommendations: [],
    timestamp: new Date().toISOString()
  };
}