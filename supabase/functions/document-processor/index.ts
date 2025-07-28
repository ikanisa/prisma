import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface ProcessDocumentRequest {
  document_id?: string;
  module_id?: string;
  content?: string;
  stage: 'extraction' | 'summarization' | 'tagging' | 'embedding' | 'all';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id, module_id, content, stage }: ProcessDocumentRequest = await req.json();
    console.log(`Processing document stage: ${stage}`);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Log the processing start
    await supabase.from('agent_execution_log').insert({
      function_name: 'document-processor',
      input_data: { document_id, module_id, stage },
      user_id: 'system',
      timestamp: new Date().toISOString()
    });

    const startTime = Date.now();
    let results: any = {};

    try {
      // Fetch document/module content if not provided
      let documentContent = content;
      let targetTable = '';
      let targetId = '';

      if (!documentContent) {
        if (document_id) {
          const { data: doc } = await supabase
            .from('centralized_documents')
            .select('content, title')
            .eq('id', document_id)
            .single();
          documentContent = doc?.content;
          targetTable = 'centralized_documents';
          targetId = document_id;
        } else if (module_id) {
          const { data: module } = await supabase
            .from('learning_modules')
            .select('content, title, summary')
            .eq('id', module_id)
            .single();
          documentContent = module?.content || module?.summary;
          targetTable = 'learning_modules';
          targetId = module_id;
        }
      }

      if (!documentContent) {
        throw new Error('No content found for processing');
      }

      // Process based on stage
      switch (stage) {
        case 'extraction':
          results = await extractContent(documentContent);
          break;
        case 'summarization':
          results = await generateSummary(documentContent);
          break;
        case 'tagging':
          results = await generateTags(documentContent);
          break;
        case 'embedding':
          results = await generateEmbeddings(documentContent);
          break;
        case 'all':
          results = await processAllStages(documentContent);
          break;
        default:
          throw new Error(`Unknown processing stage: ${stage}`);
      }

      // Update the document/module with results
      if (targetTable && targetId) {
        await updateDocumentWithResults(supabase, targetTable, targetId, results, stage);
      }

      const executionTime = Date.now() - startTime;

      // Log successful completion
      await supabase.from('agent_execution_log').insert({
        function_name: 'document-processor',
        input_data: { document_id, module_id, stage, results_summary: Object.keys(results) },
        success_status: true,
        execution_time_ms: executionTime,
        user_id: 'system',
        timestamp: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        success: true,
        stage,
        document_id,
        module_id,
        results,
        execution_time_ms: executionTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error processing document:', error);
      
      // Log error
      await supabase.from('agent_execution_log').insert({
        function_name: 'document-processor',
        input_data: { document_id, module_id, stage },
        success_status: false,
        execution_time_ms: Date.now() - startTime,
        error_details: error.message,
        user_id: 'system',
        timestamp: new Date().toISOString()
      });

      throw error;
    }

  } catch (error) {
    console.error('Error in document-processor:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractContent(content: string) {
  // Simple content extraction - can be enhanced with more sophisticated parsing
  const wordCount = content.split(/\s+/).length;
  const charCount = content.length;
  const paragraphs = content.split(/\n\s*\n/).length;
  
  return {
    extracted_text: content,
    word_count: wordCount,
    char_count: charCount,
    paragraph_count: paragraphs,
    extraction_timestamp: new Date().toISOString()
  };
}

async function generateSummary(content: string) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a knowledge summarization expert for Rwanda fintech AI agents. Create concise, actionable summaries focusing on mobile money, banking, and local business practices.'
        },
        {
          role: 'user',
          content: `Summarize this content for AI agent learning in Rwanda fintech context:\n\n${content.slice(0, 4000)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI summarization failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    summary: data.choices[0].message.content,
    summary_timestamp: new Date().toISOString()
  };
}

async function generateTags(content: string) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate relevant tags for Rwanda fintech content. Focus on: mobile_money, mtn_momo, airtel_money, banking, kinyarwanda, ussd, payments, regulations, business_practices, rural_banking, microfinance'
        },
        {
          role: 'user',
          content: `Generate 5-10 relevant tags for this content (return as JSON array of strings):\n\n${content.slice(0, 2000)}`
        }
      ],
      temperature: 0.2,
      max_tokens: 200
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI tagging failed: ${response.statusText}`);
  }

  const data = await response.json();
  let tags: string[] = [];
  
  try {
    tags = JSON.parse(data.choices[0].message.content);
  } catch {
    // Fallback: extract tags from text
    tags = data.choices[0].message.content
      .split(/[,\n]/)
      .map((tag: string) => tag.trim().replace(/[^\w\s]/g, ''))
      .filter((tag: string) => tag.length > 0)
      .slice(0, 10);
  }

  return {
    auto_tags: tags,
    tagging_timestamp: new Date().toISOString()
  };
}

async function generateEmbeddings(content: string) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Create chunks for embedding
  const chunks = createTextChunks(content, 1000, 100);
  const embeddings = [];

  for (const chunk of chunks) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: chunk
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    embeddings.push({
      chunk,
      embedding: data.data[0].embedding
    });
  }

  return {
    embeddings,
    embedding_count: embeddings.length,
    embedding_timestamp: new Date().toISOString()
  };
}

async function processAllStages(content: string) {
  const [extraction, summary, tags, embeddings] = await Promise.all([
    extractContent(content),
    generateSummary(content),
    generateTags(content),
    generateEmbeddings(content)
  ]);

  return {
    ...extraction,
    ...summary,
    ...tags,
    ...embeddings,
    processed_all_stages: true
  };
}

async function updateDocumentWithResults(supabase: any, table: string, id: string, results: any, stage: string) {
  const updateData: any = {};

  if (results.summary) {
    updateData.summary = results.summary;
  }
  
  if (results.auto_tags) {
    updateData.auto_tags = results.auto_tags;
  }
  
  if (results.embedding_count) {
    updateData.vector_count = results.embedding_count;
  }

  updateData.updated_at = new Date().toISOString();

  if (Object.keys(updateData).length > 1) { // More than just updated_at
    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error(`Failed to update ${table}:`, error);
    }
  }
}

function createTextChunks(text: string, maxSize = 1000, overlap = 100): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf('.', end);
      if (sentenceEnd > start + maxSize * 0.5) {
        end = sentenceEnd + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = Math.max(start + maxSize - overlap, end);
  }

  return chunks.filter(chunk => chunk.length > 0);
}