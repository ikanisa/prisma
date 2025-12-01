/**
 * Prisma Glow Gateway API Server
 * 
 * Express.js API gateway for AI Agent operations.
 */

import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';

import {
  createAgentRouter,
  createPersonaRouter,
  createStandalonePersonaRouter,
  createToolRouter,
  createAgentToolRouter,
  createKnowledgeRouter,
  createAgentKnowledgeRouter,
} from './routes/index.js';

// Environment variables
const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Validate environment
if (!SUPABASE_URL) {
  console.warn('Warning: SUPABASE_URL not set. Database operations will fail.');
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
  },
});

// Create Express app
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API v1 routes
const apiV1 = express.Router();

// Agent routes
apiV1.use('/agents', createAgentRouter(supabase));

// Nested agent routes
apiV1.use('/agents/:agentId/personas', createPersonaRouter(supabase));
apiV1.use('/agents/:agentId/tools', createAgentToolRouter(supabase));
apiV1.use('/agents/:agentId/knowledge', createAgentKnowledgeRouter(supabase));

// Standalone routes
apiV1.use('/personas', createStandalonePersonaRouter(supabase));
apiV1.use('/tools', createToolRouter(supabase));
apiV1.use('/knowledge-sources', createKnowledgeRouter(supabase));

// Mount API v1
app.use('/api/v1', apiV1);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Gateway API server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

export { app };
