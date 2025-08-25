/* eslint-env node */
import express from 'express';
import type { AgentMessage } from './graphs';
import { Supervisor } from './graphs';

const app = express();
app.use(express.json());

const supervisor = new Supervisor();

// SSE chat endpoint
app.post('/v1/agent/chat', async (req, res) => {
  const messages: AgentMessage[] = req.body?.messages ?? [];
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { cost } = await supervisor.chat(messages, (token) => {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    });
    res.write(`data: ${JSON.stringify({ event: 'end', cost })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ event: 'error', message: (err as Error).message })}\n\n`);
    res.end();
  }
});

// List available tools
app.get('/v1/agent/tools', (_req, res) => {
  res.json({ tools: supervisor.listTools() });
});

// Invoke a specific tool
app.post('/v1/agent/tools/:name', async (req, res) => {
  const name = req.params.name;
  const messages: AgentMessage[] = req.body?.messages ?? [];
  try {
    const { response, cost } = await supervisor.invoke(name, messages);
    res.json({ response, cost });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

export default app;
