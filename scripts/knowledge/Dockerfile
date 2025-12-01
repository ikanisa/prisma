# Knowledge Base API Dockerfile
FROM node:20-alpine AS base

# Install dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

WORKDIR /app

# Copy package files
COPY scripts/knowledge/package.json ./
COPY pnpm-lock.yaml ./
COPY .npmrc* ./

# Install pnpm
RUN npm install -g pnpm@9.12.3

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source files
COPY scripts/knowledge/ ./scripts/knowledge/
COPY config/knowledge/ ./config/knowledge/
COPY supabase/migrations/ ./supabase/migrations/

# Build stage (if needed)
FROM base AS build
RUN pnpm install --frozen-lockfile
# Add any build steps here if needed

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/scripts ./scripts
COPY --from=base /app/config ./config

# Create API server
COPY <<'EOF' ./server.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai').default;

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Search endpoint
app.post('/api/knowledge/search', async (req, res) => {
  try {
    const { query, jurisdiction, types, topK = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Search
    const { data, error } = await supabase.rpc('search_knowledge_semantic', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.75,
      match_count: topK,
      filter_jurisdiction_id: jurisdiction || null,
      filter_types: types || null,
      filter_authority_levels: ['PRIMARY', 'SECONDARY'],
    });

    if (error) throw error;

    res.json({
      success: true,
      results: data,
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Stats endpoint
app.get('/api/knowledge/stats', async (req, res) => {
  try {
    const { count: docCount } = await supabase
      .from('knowledge_documents')
      .select('*', { count: 'exact', head: true });

    const { count: chunkCount } = await supabase
      .from('knowledge_chunks')
      .select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      stats: {
        documents: docCount,
        chunks: chunkCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Knowledge Base API listening on port ${PORT}`);
});
EOF

# Expose port
EXPOSE 3002

# Run server
CMD ["node", "server.js"]
