import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { corsHeaders } from "../_shared/cors.ts";
import { getOpenAIClient } from "../_shared/openai.ts";

interface DocumentLearningRequest {
  documentId: string;
  action: 'extract_skills' | 'update_persona' | 'generate_journey_patterns' | 'enhance_capabilities';
  priority?: 'high' | 'medium' | 'low';
}

interface LearningInsight {
  type: 'skill' | 'persona_trait' | 'journey_pattern' | 'capability';
  title: string;
  content: string;
  confidence: number;
  relevance_score: number;
  implementation_notes: string;
  tags: string[];
}

interface UserJourneyPattern {
  pattern_name: string;
  user_types: string[];
  flow_steps: string[];
  success_criteria: Record<string, any>;
  common_pain_points: string[];
  optimization_suggestions: string[];
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const openai = getOpenAIClient();

  try {
    const { documentId, action, priority = 'medium' } = await req.json() as DocumentLearningRequest;
    
    console.log(`🧠 Processing document learning: ${action} for document ${documentId}`);

    switch (action) {
      case 'extract_skills':
        return await extractSkillsFromDocument(req, supabase, openai, documentId);
      case 'update_persona':
        return await updatePersonaFromDocument(req, supabase, openai, documentId);
      case 'generate_journey_patterns':
        return await generateJourneyPatterns(req, supabase, openai, documentId);
      case 'enhance_capabilities':
        return await enhanceCapabilities(req, supabase, openai, documentId);
      default:
        return await processFullDocumentLearning(req, supabase, openai, documentId);
    }
  } catch (error) {
    console.error('❌ Dynamic learning processor error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processFullDocumentLearning(req: Request, supabase: any, openai: any, documentId: string) {
  console.log(`📚 Full document learning processing for: ${documentId}`);

  // Fetch document content
  const { data: document } = await supabase
    .from('agent_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (!document) {
    throw new Error('Document not found');
  }

  // Download file content from storage
  const { data: fileData } = await supabase.storage
    .from('agent-documents')
    .download(document.file_path);

  let content = '';
  if (fileData) {
    content = await fileData.text();
  }

  // Extract comprehensive insights
  const insights = await extractLearningInsights(openai, content, document.type);
  
  // Process each insight type
  const results = {
    skills_updated: 0,
    persona_updates: 0,
    journey_patterns: 0,
    capabilities_enhanced: 0,
    insights: []
  };

  for (const insight of insights) {
    try {
      switch (insight.type) {
        case 'skill':
          await updateAgentSkills(supabase, insight);
          results.skills_updated++;
          break;
        case 'persona_trait':
          await updateAgentPersona(supabase, insight);
          results.persona_updates++;
          break;
        case 'journey_pattern':
          await updateUserJourneyPatterns(supabase, insight);
          results.journey_patterns++;
          break;
        case 'capability':
          await enhanceAgentCapabilities(supabase, insight);
          results.capabilities_enhanced++;
          break;
      }
      results.insights.push(insight);
    } catch (error) {
      console.error(`Error processing ${insight.type}:`, error);
    }
  }

  // Update document processing status
  await supabase
    .from('agent_documents')
    .update({ 
      learning_processed: true,
      learning_insights: results.insights.length,
      processed_at: new Date().toISOString()
    })
    .eq('id', documentId);

  // Log learning activity
  await supabase
    .from('learning_activity_log')
    .insert({
      document_id: documentId,
      learning_type: 'full_document_processing',
      insights_extracted: results.insights.length,
      processing_notes: `Processed ${results.insights.length} insights from ${document.title}`,
      confidence_score: results.insights.length > 0 
        ? results.insights.reduce((sum, i) => sum + i.confidence, 0) / results.insights.length 
        : 0.5
    });

  return new Response(JSON.stringify({
    success: true,
    document_id: documentId,
    processing_results: results,
    insights_count: results.insights.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function extractLearningInsights(openai: any, content: string, docType: string): Promise<LearningInsight[]> {
  const systemPrompt = `You are an AI learning specialist analyzing documents to extract actionable insights for an omni-agent system in Rwanda. 

The agent operates across:
- Payments (Mobile Money, QR codes)
- Transportation (Moto rides, logistics)
- Marketplace (Products, farmers, businesses)
- Events and social activities
- Customer support

Extract insights that can improve:
1. SKILLS: New techniques, processes, or capabilities
2. PERSONA_TRAITS: Behavioral patterns, communication styles, cultural nuances
3. JOURNEY_PATTERNS: User flow optimizations, common paths, success patterns
4. CAPABILITIES: Technical enhancements, integration opportunities

Focus on Rwanda-specific context, Kinyarwanda language nuances, and cultural considerations.

Return insights as JSON array with format:
{
  "insights": [
    {
      "type": "skill|persona_trait|journey_pattern|capability",
      "title": "Brief descriptive title",
      "content": "Detailed content/implementation",
      "confidence": 0.0-1.0,
      "relevance_score": 0.0-1.0,
      "implementation_notes": "How to implement this",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Document Type: ${docType}\n\nContent:\n${content.substring(0, 4000)}` }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.insights || [];
  } catch (error) {
    console.error('Failed to extract learning insights:', error);
    return [];
  }
}

async function updateAgentSkills(supabase: any, insight: LearningInsight) {
  // Update or create skill entry
  const { data: existingSkill } = await supabase
    .from('agent_skills')
    .select('*')
    .eq('skill_name', insight.title)
    .single();

  if (existingSkill) {
    // Update existing skill
    await supabase
      .from('agent_skills')
      .update({
        skill_description: insight.content,
        implementation_notes: insight.implementation_notes,
        confidence_level: insight.confidence,
        tags: insight.tags,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSkill.id);
  } else {
    // Create new skill
    await supabase
      .from('agent_skills')
      .insert({
        skill_name: insight.title,
        skill_description: insight.content,
        implementation_notes: insight.implementation_notes,
        confidence_level: insight.confidence,
        relevance_score: insight.relevance_score,
        tags: insight.tags,
        skill_category: extractSkillCategory(insight.tags),
        is_active: insight.confidence > 0.7
      });
  }
}

async function updateAgentPersona(supabase: any, insight: LearningInsight) {
  // Update persona traits
  await supabase
    .from('agent_persona_traits')
    .upsert({
      trait_name: insight.title,
      trait_description: insight.content,
      implementation_guidance: insight.implementation_notes,
      confidence_score: insight.confidence,
      tags: insight.tags,
      is_active: insight.confidence > 0.6
    }, {
      onConflict: 'trait_name'
    });
}

async function updateUserJourneyPatterns(supabase: any, insight: LearningInsight) {
  // Extract journey pattern from insight
  const pattern = await parseJourneyPattern(insight);
  
  await supabase
    .from('user_journey_patterns')
    .insert({
      pattern_name: insight.title,
      pattern_description: insight.content,
      flow_steps: pattern.flow_steps || [],
      success_criteria: pattern.success_criteria || {},
      optimization_notes: insight.implementation_notes,
      confidence_score: insight.confidence,
      tags: insight.tags,
      is_active: insight.confidence > 0.7
    });
}

async function enhanceAgentCapabilities(supabase: any, insight: LearningInsight) {
  // Update capabilities registry
  await supabase
    .from('agent_capabilities')
    .upsert({
      capability_name: insight.title,
      capability_description: insight.content,
      implementation_details: insight.implementation_notes,
      confidence_level: insight.confidence,
      tags: insight.tags,
      is_enabled: insight.confidence > 0.8
    }, {
      onConflict: 'capability_name'
    });
}

async function extractSkillsFromDocument(req: Request, supabase: any, openai: any, documentId: string) {
  // Focused skill extraction
  const insights = await processDocumentForType(supabase, openai, documentId, 'skill');
  
  for (const insight of insights) {
    await updateAgentSkills(supabase, insight);
  }

  return new Response(JSON.stringify({
    success: true,
    skills_extracted: insights.length,
    skills: insights
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function updatePersonaFromDocument(req: Request, supabase: any, openai: any, documentId: string) {
  const insights = await processDocumentForType(supabase, openai, documentId, 'persona_trait');
  
  for (const insight of insights) {
    await updateAgentPersona(supabase, insight);
  }

  return new Response(JSON.stringify({
    success: true,
    persona_updates: insights.length,
    traits: insights
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function generateJourneyPatterns(req: Request, supabase: any, openai: any, documentId: string) {
  // Extract journey patterns and update dynamic journey tracking
  const patterns = await extractUserJourneyPatterns(supabase, openai, documentId);
  
  // Update journey patterns in real-time
  await updateDynamicJourneyTracking(supabase, patterns);

  return new Response(JSON.stringify({
    success: true,
    patterns_generated: patterns.length,
    patterns: patterns
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function enhanceCapabilities(req: Request, supabase: any, openai: any, documentId: string) {
  const insights = await processDocumentForType(supabase, openai, documentId, 'capability');
  
  for (const insight of insights) {
    await enhanceAgentCapabilities(supabase, insight);
  }

  return new Response(JSON.stringify({
    success: true,
    capabilities_enhanced: insights.length,
    capabilities: insights
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function processDocumentForType(supabase: any, openai: any, documentId: string, type: string) {
  const { data: document } = await supabase
    .from('agent_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  const { data: fileData } = await supabase.storage
    .from('agent-documents')
    .download(document.file_path);

  const content = fileData ? await fileData.text() : '';
  const insights = await extractLearningInsights(openai, content, document.type);
  
  return insights.filter(insight => insight.type === type);
}

async function extractUserJourneyPatterns(supabase: any, openai: any, documentId: string): Promise<UserJourneyPattern[]> {
  // Specialized journey pattern extraction
  const { data: document } = await supabase
    .from('agent_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  const { data: fileData } = await supabase.storage
    .from('agent-documents')
    .download(document.file_path);

  const content = fileData ? await fileData.text() : '';

  const systemPrompt = `Extract user journey patterns from this document for Rwanda-based services.
  
  Focus on identifying:
  - Common user flows and pathways
  - Success patterns and criteria
  - Pain points and friction areas
  - Optimization opportunities
  
  Return as JSON array of patterns.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content.substring(0, 3000) }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.patterns || [];
  } catch (error) {
    console.error('Failed to extract journey patterns:', error);
    return [];
  }
}

async function updateDynamicJourneyTracking(supabase: any, patterns: UserJourneyPattern[]) {
  for (const pattern of patterns) {
    await supabase
      .from('dynamic_journey_patterns')
      .upsert({
        pattern_name: pattern.pattern_name,
        user_types: pattern.user_types,
        flow_steps: pattern.flow_steps,
        success_criteria: pattern.success_criteria,
        pain_points: pattern.common_pain_points,
        optimization_suggestions: pattern.optimization_suggestions,
        confidence_score: pattern.confidence,
        last_updated: new Date().toISOString(),
        is_active: pattern.confidence > 0.7
      }, {
        onConflict: 'pattern_name'
      });
  }
}

function extractSkillCategory(tags: string[]): string {
  if (tags.includes('payment') || tags.includes('momo')) return 'payments';
  if (tags.includes('transport') || tags.includes('moto')) return 'transportation';
  if (tags.includes('marketplace') || tags.includes('products')) return 'marketplace';
  if (tags.includes('events') || tags.includes('social')) return 'events';
  if (tags.includes('support') || tags.includes('help')) return 'support';
  return 'general';
}

async function parseJourneyPattern(insight: LearningInsight): Promise<UserJourneyPattern> {
  // Parse journey pattern from insight content
  return {
    pattern_name: insight.title,
    user_types: insight.tags.filter(tag => 
      ['driver', 'passenger', 'farmer', 'shopper', 'business'].includes(tag)
    ),
    flow_steps: [],
    success_criteria: {},
    common_pain_points: [],
    optimization_suggestions: [insight.implementation_notes],
    confidence: insight.confidence
  };
}