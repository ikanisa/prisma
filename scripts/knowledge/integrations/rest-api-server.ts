/**
 * REST API Integration Example
 * 
 * Express.js API server providing REST endpoints for the Knowledge Base
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { DeepSearchAgent } from '../deepsearch-agent';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Initialize clients
const agent = new DeepSearchAgent({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * GET /api/knowledge/search
 * Search the knowledge base
 */
app.get('/api/knowledge/search', async (req, res) => {
  try {
    const { q, jurisdiction, types, topK = '10' } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await agent.search({
      query: q,
      jurisdictionCode: jurisdiction as string | undefined,
      types: types ? (types as string).split(',') : undefined,
      topK: parseInt(topK as string, 10),
    });

    // Log the query
    await logQuery({
      agentName: 'DeepSearch',
      query: q,
      jurisdiction: jurisdiction as string,
      resultCount: results.results.length,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/knowledge/ask
 * Ask AccountantAI a question with context
 */
app.post('/api/knowledge/ask', async (req, res) => {
  try {
    const { question, jurisdiction, context } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // 1. Search knowledge base
    const searchResults = await agent.search({
      query: question,
      jurisdictionCode: jurisdiction,
      topK: 6,
    });

    // 2. Build context
    const knowledgeContext = searchResults.results
      .map(r => `[${r.document.code}] ${r.chunk.content}`)
      .join('\n\n');

    // 3. Generate answer
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a professional accountant assistant.
Context: ${knowledgeContext}`,
        },
        {
          role: 'user',
          content: context ? `Context: ${context}\n\nQuestion: ${question}` : question,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const answer = completion.choices[0].message.content;

    // 4. Log interaction
    await logQuery({
      agentName: 'AccountantAI',
      query: question,
      jurisdiction,
      resultCount: searchResults.results.length,
      response: answer?.slice(0, 500),
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });

    res.json({
      answer,
      citations: searchResults.results.map(r => ({
        code: r.document.code,
        title: r.document.title,
        section: r.chunk.sectionPath,
        confidence: r.score,
        url: r.source.url,
      })),
      metadata: {
        searchTimeMs: searchResults.metadata.searchTimeMs,
        tokensUsed: completion.usage?.total_tokens,
      },
    });
  } catch (error) {
    console.error('Ask error:', error);
    res.status(500).json({ 
      error: 'Failed to generate answer',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/knowledge/ask/stream
 * Stream AI responses in real-time
 */
app.post('/api/knowledge/ask/stream', async (req, res) => {
  try {
    const { question, jurisdiction } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 1. Search knowledge base
    const searchResults = await agent.search({
      query: question,
      jurisdictionCode: jurisdiction,
      topK: 6,
    });

    // Send citations first
    res.write(`data: ${JSON.stringify({ 
      type: 'citations', 
      data: searchResults.results 
    })}\n\n`);

    // 2. Stream OpenAI response
    const knowledgeContext = searchResults.results
      .map(r => `[${r.document.code}] ${r.chunk.content}`)
      .join('\n\n');

    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a professional accountant assistant.
Context: ${knowledgeContext}`,
        },
        { role: 'user', content: question },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ type: 'content', data: content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      data: error instanceof Error ? error.message : 'Unknown error' 
    })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/knowledge/documents
 * List all documents
 */
app.get('/api/knowledge/documents', async (req, res) => {
  try {
    const { jurisdiction, type, status = 'ACTIVE' } = req.query;

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('knowledge_documents')
      .select(`
        *,
        source:knowledge_sources(*),
        chunks:knowledge_chunks(count)
      `)
      .eq('status', status);

    if (jurisdiction) {
      query = query.eq('source.jurisdiction_id', jurisdiction);
    }

    if (type) {
      query = query.eq('source.type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ documents: data });
  } catch (error) {
    console.error('Documents error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/knowledge/documents/:id
 * Get document details
 */
app.get('/api/knowledge/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('knowledge_documents')
      .select(`
        *,
        source:knowledge_sources(*),
        chunks:knowledge_chunks(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document: data });
  } catch (error) {
    console.error('Document error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/knowledge/stats
 * Get knowledge base statistics
 */
app.get('/api/knowledge/stats', async (req, res) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [
      { count: sourcesCount },
      { count: documentsCount },
      { count: chunksCount },
      { count: embeddingsCount },
    ] = await Promise.all([
      supabase.from('knowledge_sources').select('*', { count: 'exact', head: true }),
      supabase.from('knowledge_documents').select('*', { count: 'exact', head: true }),
      supabase.from('knowledge_chunks').select('*', { count: 'exact', head: true }),
      supabase.from('knowledge_embeddings').select('*', { count: 'exact', head: true }),
    ]);

    res.json({
      sources: sourcesCount,
      documents: documentsCount,
      chunks: chunksCount,
      embeddings: embeddingsCount,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// HELPERS
// ============================================================================

async function logQuery(data: {
  agentName: string;
  query: string;
  jurisdiction?: string;
  resultCount?: number;
  response?: string | null;
  userAgent?: string;
  ip?: string;
}) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from('agent_queries_log').insert({
    agent_name: data.agentName,
    query_text: data.query,
    response_summary: data.response,
    metadata: {
      jurisdiction: data.jurisdiction,
      result_count: data.resultCount,
      user_agent: data.userAgent,
      ip: data.ip,
      timestamp: new Date().toISOString(),
    },
  });
}

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Knowledge Base API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Search: http://localhost:${PORT}/api/knowledge/search?q=revenue`);
});

export default app;
