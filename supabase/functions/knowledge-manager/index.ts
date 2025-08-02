import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getOpenAIClient } from "../_shared/openai.ts";

interface KnowledgeUpdate {
  topic: string;
  content: string;
  source: 'conversation' | 'manual' | 'external_api';
  confidence?: number;
  tags?: string[];
}

interface KnowledgeQuery {
  query: string;
  limit?: number;
  threshold?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const openai = getOpenAIClient();

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'add':
        return await addKnowledge(req, supabase, openai);
      case 'search':
        return await searchKnowledge(req, supabase, openai);
      case 'update':
        return await updateKnowledge(req, supabase, openai);
      case 'validate':
        return await validateKnowledge(req, supabase, openai);
      case 'learn_from_conversation':
        return await learnFromConversation(req, supabase, openai);
      case 'auto_update':
        return await autoUpdateKnowledge(req, supabase, openai);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('❌ Knowledge manager error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function addKnowledge(req: Request, supabase: any, openai: any) {
  const { topic, content, source, confidence = 1.0, tags = [] } = await req.json() as KnowledgeUpdate;

  console.log(`📚 Adding knowledge: ${topic}`);

  // Generate embedding for semantic search
  const embedding = await generateEmbedding(openai, `${topic}: ${content}`);

  // Extract tags if not provided
  const extractedTags = tags.length > 0 ? tags : await extractTags(openai, content);

  // Check for existing knowledge
  const { data: existing } = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('topic', topic)
    .eq('validation_status', 'validated')
    .order('version', { ascending: false })
    .limit(1);

  let version = 1;
  if (existing && existing.length > 0) {
    version = existing[0].version + 1;
  }

  const { data: knowledge } = await supabase
    .from('knowledge_base')
    .insert({
      topic,
      content,
      version,
      source,
      confidence,
      tags: extractedTags,
      vector_embedding: embedding,
      validation_status: source === 'manual' ? 'validated' : 'pending'
    })
    .select()
    .single();

  // Auto-validate high-confidence knowledge
  if (confidence >= 0.9 && source === 'external_api') {
    await supabase
      .from('knowledge_base')
      .update({ validation_status: 'validated' })
      .eq('id', knowledge.id);
  }

  return new Response(JSON.stringify({ success: true, knowledge }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function searchKnowledge(req: Request, supabase: any, openai: any) {
  const { query, limit = 5, threshold = 0.7 } = await req.json() as KnowledgeQuery;

  console.log(`🔍 Searching knowledge: ${query}`);

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(openai, query);

  // Semantic search using vector similarity
  const { data: results } = await supabase.rpc('search_knowledge_base', {
    query_embedding: queryEmbedding,
    similarity_threshold: threshold,
    match_limit: limit
  });

  // Enhance results with relevance scoring
  const enhancedResults = await Promise.all(
    (results || []).map(async (result: any) => ({
      ...result,
      relevance_score: await calculateRelevanceScore(openai, query, result.content),
      summary: await generateSummary(openai, result.content)
    }))
  );

  return new Response(JSON.stringify({ results: enhancedResults }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function updateKnowledge(req: Request, supabase: any, openai: any) {
  const { id, content, confidence, tags } = await req.json();

  console.log(`📝 Updating knowledge: ${id}`);

  const updates: any = { updated_at: new Date().toISOString() };

  if (content) {
    updates.content = content;
    updates.vector_embedding = await generateEmbedding(openai, content);
    updates.validation_status = 'pending'; // Re-validate after content change
  }

  if (confidence !== undefined) updates.confidence = confidence;
  if (tags) updates.tags = tags;

  const { data: updated } = await supabase
    .from('knowledge_base')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return new Response(JSON.stringify({ success: true, knowledge: updated }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function validateKnowledge(req: Request, supabase: any, openai: any) {
  const { id, status, validatorId } = await req.json();

  console.log(`✅ Validating knowledge: ${id} as ${status}`);

  const { data: knowledge } = await supabase
    .from('knowledge_base')
    .update({
      validation_status: status,
      validated_by: validatorId,
      validated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  // If rejected, learn from the feedback
  if (status === 'rejected') {
    await learnFromRejection(supabase, openai, knowledge);
  }

  return new Response(JSON.stringify({ success: true, knowledge }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function learnFromConversation(req: Request, supabase: any, openai: any) {
  const { conversationId, phoneNumber, messages } = await req.json();

  console.log(`🧠 Learning from conversation: ${conversationId}`);

  // Extract knowledge from conversation
  const knowledgeItems = await extractKnowledgeFromConversation(openai, messages);

  const addedKnowledge = [];

  for (const item of knowledgeItems) {
    if (item.confidence >= 0.6) {
      const embedding = await generateEmbedding(openai, `${item.topic}: ${item.content}`);

      const { data: knowledge } = await supabase
        .from('knowledge_base')
        .insert({
          topic: item.topic,
          content: item.content,
          source: 'conversation',
          confidence: item.confidence,
          tags: item.tags,
          vector_embedding: embedding,
          validation_status: item.confidence >= 0.8 ? 'validated' : 'pending'
        })
        .select()
        .single();

      addedKnowledge.push(knowledge);
    }
  }

  return new Response(JSON.stringify({ 
    success: true, 
    knowledgeCount: addedKnowledge.length,
    knowledge: addedKnowledge 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function autoUpdateKnowledge(req: Request, supabase: any, openai: any) {
  console.log(`🔄 Auto-updating knowledge base`);

  // Find knowledge that needs updating (low confidence, old, or frequently accessed)
  const { data: candidates } = await supabase
    .from('knowledge_base')
    .select('*')
    .or('confidence.lt.0.7,created_at.lt.2024-01-01')
    .eq('validation_status', 'validated')
    .limit(10);

  const updates = [];

  for (const candidate of candidates || []) {
    // Verify current accuracy
    const accuracy = await verifyKnowledgeAccuracy(openai, candidate.topic, candidate.content);
    
    if (accuracy < 0.7) {
      // Try to find updated information
      const updatedContent = await findUpdatedInformation(openai, candidate.topic);
      
      if (updatedContent) {
        const embedding = await generateEmbedding(openai, `${candidate.topic}: ${updatedContent}`);
        
        await supabase
          .from('knowledge_base')
          .update({
            content: updatedContent,
            confidence: 0.8,
            vector_embedding: embedding,
            updated_at: new Date().toISOString(),
            validation_status: 'pending'
          })
          .eq('id', candidate.id);

        updates.push({
          id: candidate.id,
          topic: candidate.topic,
          action: 'updated'
        });
      }
    }
  }

  return new Response(JSON.stringify({ 
    success: true, 
    updatesCount: updates.length,
    updates 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function generateEmbedding(openai: any, text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return new Array(1536).fill(0); // Return zero vector as fallback
  }
}

async function extractTags(openai: any, content: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract 3-5 relevant tags from this content. Focus on topics, categories, and key concepts. Return as JSON array of strings.'
        },
        { role: 'user', content }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 100
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.tags || [];
  } catch (error) {
    console.error('Tag extraction failed:', error);
    return ['general'];
  }
}

async function calculateRelevanceScore(openai: any, query: string, content: string): Promise<number> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Rate how relevant this content is to the query on a scale of 0.0 to 1.0. Respond with only the number.'
        },
        { role: 'user', content: `Query: ${query}\nContent: ${content}` }
      ],
      max_tokens: 10
    });

    return parseFloat(response.choices[0].message.content) || 0.5;
  } catch (error) {
    return 0.5;
  }
}

async function generateSummary(openai: any, content: string): Promise<string> {
  if (content.length < 200) return content;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Summarize this content in 1-2 sentences. Keep the key information.'
        },
        { role: 'user', content }
      ],
      max_tokens: 100
    });

    return response.choices[0].message.content;
  } catch (error) {
    return content.substring(0, 200) + '...';
  }
}

async function extractKnowledgeFromConversation(openai: any, messages: any[]): Promise<any[]> {
  const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract factual knowledge items from this conversation that could be useful for future conversations. Focus on:
- User preferences and patterns
- Factual information shared
- Process clarifications
- Common questions and answers

Return as JSON array with format: [{"topic": "string", "content": "string", "confidence": 0.0-1.0, "tags": ["tag1", "tag2"]}]`
        },
        { role: 'user', content: conversationText }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.knowledge || [];
  } catch (error) {
    console.error('Knowledge extraction failed:', error);
    return [];
  }
}

async function verifyKnowledgeAccuracy(openai: any, topic: string, content: string): Promise<number> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Verify if this information about the topic is accurate and up-to-date. Rate accuracy from 0.0 to 1.0. Respond with only the number.'
        },
        { role: 'user', content: `Topic: ${topic}\nContent: ${content}` }
      ],
      max_tokens: 10
    });

    return parseFloat(response.choices[0].message.content) || 0.5;
  } catch (error) {
    return 0.5;
  }
}

async function findUpdatedInformation(openai: any, topic: string): Promise<string | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Provide current, accurate information about this topic. Focus on facts that are relevant for customer service in Rwanda.'
        },
        { role: 'user', content: `Topic: ${topic}` }
      ],
      max_tokens: 300
    });

    return response.choices[0].message.content;
  } catch (error) {
    return null;
  }
}

async function learnFromRejection(supabase: any, openai: any, knowledge: any) {
  // Store feedback for future learning
  await supabase
    .from('knowledge_base')
    .insert({
      topic: `rejected_${knowledge.topic}`,
      content: `Rejected content: ${knowledge.content}`,
      source: 'validation_feedback',
      confidence: 0.1,
      tags: ['rejected', 'feedback'],
      validation_status: 'validated'
    });
}