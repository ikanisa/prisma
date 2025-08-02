import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getOpenAI, generateIntelligentResponse } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface AuditRequest {
  auditType: string;
  runBy: string;
}

interface KnowledgeGap {
  gap_type: string;
  impacted_area: string;
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  recommended_action: string;
  model_source: string;
  content_excerpt: string;
  fix_suggestion: string;
}

interface CoverageScore {
  domain: string;
  score: number;
  missing_coverage: any;
  model_evaluator: string;
  detailed_analysis: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { auditType, runBy }: AuditRequest = await req.json();
    console.log(`Starting knowledge audit: ${auditType} by ${runBy}`);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }


    // Start the audit by creating a log entry
    const { data: auditLog, error: auditError } = await supabase
      .rpc('run_knowledge_audit', { audit_type: auditType, run_by: runBy });

    if (auditError) {
      throw new Error(`Failed to create audit log: ${auditError.message}`);
    }

    const auditId = auditLog;
    console.log(`Created audit log with ID: ${auditId}`);

    // Fetch knowledge sources for analysis
    const sources = await fetchKnowledgeSources(supabase);
    console.log(`Fetched ${sources.length} knowledge sources`);

    // Run AI evaluation using multiple models
    const auditResults = await runMultiModelAudit(sources, auditType);
    console.log(`Completed AI audit with ${auditResults.gaps.length} gaps found`);

    // Store gaps and coverage scores
    await storeAuditResults(supabase, auditId, auditResults);

    // Update audit log with completion status
    const { error: updateError } = await supabase
      .from('knowledge_audit_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_gaps_found: auditResults.gaps.length,
        coverage_summary: auditResults.coverage_summary,
        execution_time_ms: Date.now() - parseInt(auditId.split('-')[0], 16)
      })
      .eq('id', auditId);

    if (updateError) {
      console.error('Failed to update audit log:', updateError);
    }

    return new Response(JSON.stringify({
      audit_id: auditId,
      summary: {
        gaps_found: auditResults.gaps.length,
        coverage_scores: auditResults.coverage_scores,
        status: 'completed'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in knowledge-audit-run:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchKnowledgeSources(supabase: any) {
  const sources = [];
  
  // Fetch learning modules
  const { data: modules } = await supabase
    .from('learning_modules')
    .select('*')
    .limit(50);
  
  if (modules) {
    sources.push(...modules.map((m: any) => ({
      type: 'learning_module',
      title: m.title,
      content: m.content || m.summary,
      tags: m.auto_tags || [],
      relevance_score: m.relevance_score || 0
    })));
  }

  // Fetch centralized documents
  const { data: documents } = await supabase
    .from('centralized_documents')
    .select('*')
    .limit(30);
  
  if (documents) {
    sources.push(...documents.map((d: any) => ({
      type: 'document',
      title: d.title,
      content: d.content,
      document_type: d.document_type,
      status: d.status
    })));
  }

  // Fetch conversation learning logs
  const { data: conversations } = await supabase
    .from('conversation_learning_log')
    .select('*')
    .limit(20);
  
  if (conversations) {
    sources.push(...conversations.map((c: any) => ({
      type: 'conversation_insight',
      summary: c.learning_summary,
      confidence: c.confidence_level,
      improvement_note: c.improvement_note
    })));
  }

  return sources;
}

async function runMultiModelAudit(sources: any[], auditType: string) {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OpenAI API key');
  }

  const gaps: KnowledgeGap[] = [];
  const coverage_scores: CoverageScore[] = [];
  
  try {
    // Prepare analysis prompt
    const analysisPrompt = `
You are an AI knowledge auditor conducting a ${auditType} audit of an autonomous WhatsApp agent system for Rwanda's fintech/mobile money ecosystem.

Analyze the following knowledge sources and identify:
1. Knowledge gaps (missing information)
2. Coverage scores by domain (0-100)
3. Quality issues
4. Recommendations for improvement

Knowledge Sources:
${JSON.stringify(sources, null, 2)}

Focus areas for Rwanda fintech:
- Mobile Money (MTN MoMo, Airtel Money)
- Banking integration
- Rwandan language support (Kinyarwanda)
- Local business practices
- Regulatory compliance
- Payment flows and USSD codes

Return a JSON response with:
{
  "gaps": [
    {
      "gap_type": "missing_knowledge|outdated_info|quality_issue",
      "impacted_area": "specific domain affected",
      "severity_level": "low|medium|high|critical",
      "recommended_action": "what to do",
      "content_excerpt": "relevant content sample",
      "fix_suggestion": "specific improvement recommendation"
    }
  ],
  "coverage_scores": [
    {
      "domain": "domain name",
      "score": 85,
      "missing_coverage": {"areas": ["list of missing areas"]},
      "detailed_analysis": {"strengths": [], "weaknesses": []}
    }
  ],
  "coverage_summary": {
    "overall_score": 75,
    "critical_gaps": 2,
    "areas_needing_attention": ["list"]
  }
}`;

    // Use OpenAI SDK with Rwanda-first intelligence
    const systemPrompt = 'You are a knowledge audit specialist for AI agents in Rwanda fintech.';
    
    const aiResponse = await generateIntelligentResponse(
      analysisPrompt,
      systemPrompt,
      [],
      {
        model: 'gpt-4.1-2025-04-14',
        temperature: 0.3,
        max_tokens: 3000
      }
    );

    const auditResults = JSON.parse(aiResponse);

    // Process gaps
    for (const gap of auditResults.gaps || []) {
      gaps.push({
        gap_type: gap.gap_type,
        impacted_area: gap.impacted_area,
        severity_level: gap.severity_level,
        recommended_action: gap.recommended_action,
        model_source: 'gpt-4o',
        content_excerpt: gap.content_excerpt || '',
        fix_suggestion: gap.fix_suggestion
      });
    }

    // Process coverage scores
    for (const score of auditResults.coverage_scores || []) {
      coverage_scores.push({
        domain: score.domain,
        score: Math.min(100, Math.max(0, score.score)),
        missing_coverage: score.missing_coverage || {},
        model_evaluator: 'gpt-4o',
        detailed_analysis: score.detailed_analysis || {}
      });
    }

    return {
      gaps,
      coverage_scores,
      coverage_summary: auditResults.coverage_summary || {}
    };

  } catch (error) {
    console.error('Error in AI audit:', error);
    // Return minimal results on error
    return {
      gaps: [],
      coverage_scores: [
        {
          domain: 'error_recovery',
          score: 0,
          missing_coverage: { error: error.message },
          model_evaluator: 'gpt-4o',
          detailed_analysis: { error: 'Audit failed to complete' }
        }
      ],
      coverage_summary: { overall_score: 0, critical_gaps: 1, areas_needing_attention: ['audit_system'] }
    };
  }
}

async function storeAuditResults(supabase: any, auditId: string, results: any) {
  // Store knowledge gaps
  for (const gap of results.gaps) {
    const { error } = await supabase
      .from('knowledge_gaps')
      .insert({
        audit_id: auditId,
        ...gap
      });

    if (error) {
      console.error('Failed to store gap:', error);
    }
  }

  // Store coverage scores
  for (const score of results.coverage_scores) {
    const { error } = await supabase
      .from('coverage_scores')
      .insert({
        audit_id: auditId,
        ...score
      });

    if (error) {
      console.error('Failed to store coverage score:', error);
    }
  }
}