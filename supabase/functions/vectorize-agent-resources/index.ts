import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmbeddingRequest {
  resourceTypes?: string[];
  force?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { resourceTypes = ['action_button', 'template', 'skill', 'persona', 'document'], force = false }: EmbeddingRequest = 
      req.method === 'POST' ? await req.json() : {};

    console.log(`🧠 Starting vectorization for resources: ${resourceTypes.join(', ')}`);

    let totalProcessed = 0;
    const results: Record<string, number> = {};

    // Process Action Buttons
    if (resourceTypes.includes('action_button')) {
      const { data: actionButtons } = await supabase
        .from('action_buttons')
        .select('*');

      if (actionButtons && actionButtons.length > 0) {
        let processed = 0;
        for (const button of actionButtons) {
          const content = `Action Button: ${button.label}\nDescription: ${button.description || ''}\nDomain: ${button.domain}\nPayload: ${button.payload}`;
          
          // Check if embedding already exists
          if (!force) {
            const { data: existing } = await supabase
              .from('agent_resource_embeddings')
              .select('id')
              .eq('resource_type', 'action_button')
              .eq('resource_id', button.id)
              .single();
            
            if (existing) continue;
          }

          const embedding = await generateEmbedding(content, openaiApiKey);
          
          await supabase
            .from('agent_resource_embeddings')
            .upsert({
              resource_type: 'action_button',
              resource_id: button.id,
              content,
              embedding,
              metadata: {
                label: button.label,
                domain: button.domain,
                description: button.description
              }
            });
          
          processed++;
        }
        results.action_buttons = processed;
        totalProcessed += processed;
        console.log(`✅ Processed ${processed} action buttons`);
      }
    }

    // Process WhatsApp Templates
    if (resourceTypes.includes('template')) {
      const { data: templates } = await supabase
        .from('whatsapp_templates')
        .select('*');

      if (templates && templates.length > 0) {
        let processed = 0;
        for (const template of templates) {
          const content = `WhatsApp Template: ${template.name}\nCategory: ${template.category}\nLanguage: ${template.language}\nBody: ${template.body_text || ''}\nHeader: ${template.header_text || ''}`;
          
          // Check if embedding already exists
          if (!force) {
            const { data: existing } = await supabase
              .from('agent_resource_embeddings')
              .select('id')
              .eq('resource_type', 'template')
              .eq('resource_id', template.id)
              .single();
            
            if (existing) continue;
          }

          const embedding = await generateEmbedding(content, openaiApiKey);
          
          await supabase
            .from('agent_resource_embeddings')
            .upsert({
              resource_type: 'template',
              resource_id: template.id,
              content,
              embedding,
              metadata: {
                name: template.name,
                category: template.category,
                language: template.language,
                status: template.status
              }
            });
          
          processed++;
        }
        results.templates = processed;
        totalProcessed += processed;
        console.log(`✅ Processed ${processed} templates`);
      }
    }

    // Process Agent Skills
    if (resourceTypes.includes('skill')) {
      const { data: skills } = await supabase
        .from('agent_skills')
        .select('*');

      if (skills && skills.length > 0) {
        let processed = 0;
        for (const skill of skills) {
          const content = `Agent Skill: ${skill.skill}\nEnabled: ${skill.enabled}\nConfiguration: ${JSON.stringify(skill.config)}`;
          
          // Check if embedding already exists
          if (!force) {
            const { data: existing } = await supabase
              .from('agent_resource_embeddings')
              .select('id')
              .eq('resource_type', 'skill')
              .eq('resource_id', skill.id)
              .single();
            
            if (existing) continue;
          }

          const embedding = await generateEmbedding(content, openaiApiKey);
          
          await supabase
            .from('agent_resource_embeddings')
            .upsert({
              resource_type: 'skill',
              resource_id: skill.id,
              content,
              embedding,
              metadata: {
                skill: skill.skill,
                enabled: skill.enabled,
                config: skill.config
              }
            });
          
          processed++;
        }
        results.skills = processed;
        totalProcessed += processed;
        console.log(`✅ Processed ${processed} skills`);
      }
    }

    // Process Agent Personas
    if (resourceTypes.includes('persona')) {
      const { data: personas } = await supabase
        .from('agent_personas')
        .select('*');

      if (personas && personas.length > 0) {
        let processed = 0;
        for (const persona of personas) {
          const content = `Agent Persona\nPersonality: ${persona.personality || ''}\nTone: ${persona.tone || ''}\nLanguage: ${persona.language}\nInstructions: ${persona.instructions || ''}`;
          
          // Check if embedding already exists
          if (!force) {
            const { data: existing } = await supabase
              .from('agent_resource_embeddings')
              .select('id')
              .eq('resource_type', 'persona')
              .eq('resource_id', persona.id)
              .single();
            
            if (existing) continue;
          }

          const embedding = await generateEmbedding(content, openaiApiKey);
          
          await supabase
            .from('agent_resource_embeddings')
            .upsert({
              resource_type: 'persona',
              resource_id: persona.id,
              content,
              embedding,
              metadata: {
                personality: persona.personality,
                tone: persona.tone,
                language: persona.language
              }
            });
          
          processed++;
        }
        results.personas = processed;
        totalProcessed += processed;
        console.log(`✅ Processed ${processed} personas`);
      }
    }

    // Process Centralized Documents
    if (resourceTypes.includes('document')) {
      const { data: documents } = await supabase
        .from('centralized_documents')
        .select('*')
        .eq('status', 'active');

      if (documents && documents.length > 0) {
        let processed = 0;
        for (const doc of documents) {
          const content = `Document: ${doc.title}\nType: ${doc.document_type}\nScope: ${doc.agent_scope}\nContent: ${doc.content || ''}`;
          
          // Check if embedding already exists
          if (!force) {
            const { data: existing } = await supabase
              .from('agent_resource_embeddings')
              .select('id')
              .eq('resource_type', 'document')
              .eq('resource_id', doc.id)
              .single();
            
            if (existing) continue;
          }

          // Split large documents into chunks
          const chunks = createTextChunks(content);
          
          for (let i = 0; i < chunks.length; i++) {
            const chunkContent = chunks[i];
            const embedding = await generateEmbedding(chunkContent, openaiApiKey);
            
            await supabase
              .from('agent_resource_embeddings')
              .upsert({
                resource_type: 'document',
                resource_id: `${doc.id}_chunk_${i}`,
                content: chunkContent,
                embedding,
                metadata: {
                  title: doc.title,
                  document_type: doc.document_type,
                  agent_scope: doc.agent_scope,
                  chunk_index: i,
                  total_chunks: chunks.length,
                  original_document_id: doc.id
                }
              });
          }
          
          processed++;
        }
        results.documents = processed;
        totalProcessed += processed;
        console.log(`✅ Processed ${processed} documents`);
      }
    }

    // Update agent learning status
    await supabase
      .from('automated_tasks')
      .insert({
        task_name: 'vectorize_agent_resources',
        task_type: 'learning',
        status: 'completed',
        result: {
          total_processed: totalProcessed,
          results,
          timestamp: new Date().toISOString()
        }
      });

    console.log(`🎉 Vectorization complete! Total processed: ${totalProcessed}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_processed: totalProcessed,
        results,
        message: 'Agent resources vectorized successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Vectorization error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function generateEmbedding(text: string, openaiApiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function createTextChunks(text: string, maxChunkSize = 1000, overlap = 200): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChunkSize, text.length);
    
    // Try to break at word boundary
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > start) {
        end = lastSpace;
      }
    }
    
    chunks.push(text.slice(start, end));
    start = end - overlap;
    
    if (start >= text.length) break;
  }

  return chunks;
}