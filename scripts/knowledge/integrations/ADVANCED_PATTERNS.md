# Advanced Integration Examples

Complete integration patterns for the Accounting Knowledge Base System.

## Table of Contents

1. [WebSocket Real-Time Search](#websocket-real-time-search)
2. [React Custom Hooks](#react-custom-hooks)
3. [Multi-Agent Orchestration](#multi-agent-orchestration)
4. [Batch Processing](#batch-processing)
5. [Cache Strategies](#cache-strategies)
6. [Error Handling Patterns](#error-handling-patterns)

---

## WebSocket Real-Time Search

Real-time collaborative search using WebSocket connections.

### Server (Node.js + ws)

```typescript
import WebSocket, { WebSocketServer } from 'ws';
import { DeepSearchAgent } from '../deepsearch-agent';

const wss = new WebSocketServer({ port: 3003 });

const agent = new DeepSearchAgent({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
});

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'search':
          const results = await agent.search({
            query: message.query,
            jurisdictionCode: message.jurisdiction,
            topK: message.topK || 10,
          });

          ws.send(JSON.stringify({
            type: 'search_results',
            requestId: message.requestId,
            data: results,
          }));
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log('WebSocket server running on ws://localhost:3003');
```

### Client (React)

```typescript
import { useEffect, useState, useCallback } from 'react';

export function useKnowledgeWebSocket() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3003');

    socket.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  const search = useCallback(
    (query: string, jurisdiction?: string) => {
      if (!ws || !connected) {
        throw new Error('WebSocket not connected');
      }

      const requestId = Math.random().toString(36).substring(7);

      return new Promise((resolve, reject) => {
        const handler = (event: MessageEvent) => {
          const message = JSON.parse(event.data);

          if (message.type === 'search_results' && message.requestId === requestId) {
            ws.removeEventListener('message', handler);
            resolve(message.data);
          } else if (message.type === 'error') {
            ws.removeEventListener('message', handler);
            reject(new Error(message.message));
          }
        };

        ws.addEventListener('message', handler);

        ws.send(JSON.stringify({
          type: 'search',
          requestId,
          query,
          jurisdiction,
        }));

        // Timeout after 30 seconds
        setTimeout(() => {
          ws.removeEventListener('message', handler);
          reject(new Error('Search timeout'));
        }, 30000);
      });
    },
    [ws, connected]
  );

  return { search, connected };
}

// Usage in component
function SearchComponent() {
  const { search, connected } = useKnowledgeWebSocket();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const data = await search(query);
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {/* Search UI */}
    </div>
  );
}
```

---

## React Custom Hooks

Reusable hooks for common knowledge base operations.

```typescript
import { useState, useEffect, useCallback } from 'react';

// Hook for searching the knowledge base
export function useKnowledgeSearch() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (query: string, jurisdiction?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/knowledge/search?q=${encodeURIComponent(query)}${
          jurisdiction ? `&jurisdiction=${jurisdiction}` : ''
        }`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

// Hook for AI assistant chat
export function useAccountantAI() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);

  const ask = useCallback(async (question: string, jurisdiction?: string) => {
    setLoading(true);

    const userMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/knowledge/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, jurisdiction }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      const assistantMessage = { role: 'assistant', content: data.answer };
      setMessages(prev => [...prev, assistantMessage]);

      return data;
    } catch (error) {
      const errorMessage = {
        role: 'error',
        content: error instanceof Error ? error.message : 'Unknown error',
      };
      setMessages(prev => [...prev, errorMessage]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, loading, ask, clear };
}

// Hook for document browsing
export function useKnowledgeDocuments(filters?: {
  jurisdiction?: string;
  type?: string;
}) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const params = new URLSearchParams();
        if (filters?.jurisdiction) params.set('jurisdiction', filters.jurisdiction);
        if (filters?.type) params.set('type', filters.type);

        const response = await fetch(`/api/knowledge/documents?${params}`);
        if (!response.ok) throw new Error('Failed to fetch documents');

        const data = await response.json();
        setDocuments(data.documents);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [filters?.jurisdiction, filters?.type]);

  return { documents, loading, error };
}
```

---

## Multi-Agent Orchestration

Coordinating multiple agents for complex workflows.

```typescript
import { DeepSearchAgent } from '../deepsearch-agent';
import OpenAI from 'openai';

/**
 * Multi-Agent Orchestrator
 * Coordinates DeepSearch, AccountantAI, and TaxAdvisor agents
 */
export class KnowledgeOrchestrator {
  private searchAgent: DeepSearchAgent;
  private openai: OpenAI;

  constructor(config: {
    supabaseUrl: string;
    supabaseKey: string;
    openaiApiKey: string;
  }) {
    this.searchAgent = new DeepSearchAgent(config);
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  /**
   * Complex Query: Requires multiple searches and synthesis
   */
  async handleComplexQuery(query: string, jurisdiction: string) {
    // Step 1: Analyze the query to determine what information is needed
    const analysis = await this.analyzeQuery(query);

    // Step 2: Parallel searches for different aspects
    const searches = await Promise.all([
      this.searchAgent.search({
        query: analysis.accountingQuery,
        jurisdictionCode: jurisdiction,
        types: ['IFRS', 'IAS', 'GAAP'],
        topK: 5,
      }),
      this.searchAgent.search({
        query: analysis.taxQuery,
        jurisdictionCode: jurisdiction,
        types: ['TAX_LAW'],
        topK: 5,
      }),
      this.searchAgent.search({
        query: analysis.auditQuery,
        jurisdictionCode: jurisdiction,
        types: ['ISA'],
        topK: 5,
      }),
    ]);

    // Step 3: Synthesize results
    const synthesis = await this.synthesizeResults(query, searches);

    return synthesis;
  }

  /**
   * Comparative Analysis: Compare treatment across jurisdictions
   */
  async compareJurisdictions(
    topic: string,
    jurisdictions: string[]
  ) {
    const results = await Promise.all(
      jurisdictions.map(jurisdiction =>
        this.searchAgent.search({
          query: topic,
          jurisdictionCode: jurisdiction,
          topK: 3,
        })
      )
    );

    const comparison = await this.compareResults(topic, results, jurisdictions);

    return comparison;
  }

  /**
   * Compliance Check: Verify compliance with multiple standards
   */
  async checkCompliance(scenario: string, jurisdiction: string) {
    // Search for relevant standards
    const standards = await this.searchAgent.search({
      query: scenario,
      jurisdictionCode: jurisdiction,
      topK: 10,
    });

    // Group by authority level
    const primary = standards.results.filter(
      r => r.source.authorityLevel === 'PRIMARY'
    );
    const secondary = standards.results.filter(
      r => r.source.authorityLevel === 'SECONDARY'
    );

    // Generate compliance assessment
    const assessment = await this.assessCompliance(scenario, primary, secondary);

    return {
      compliant: assessment.compliant,
      issues: assessment.issues,
      recommendations: assessment.recommendations,
      citations: primary.map(r => ({
        code: r.document.code,
        section: r.chunk.sectionPath,
        requirement: r.chunk.content,
      })),
    };
  }

  private async analyzeQuery(query: string) {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Analyze the user query and extract separate search queries for accounting, tax, and audit aspects.',
        },
        { role: 'user', content: query },
      ],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  private async synthesizeResults(query: string, searches: any[]) {
    const context = searches
      .flat()
      .map(s => s.results.map((r: any) => r.chunk.content).join('\n'))
      .join('\n\n');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Synthesize the following information into a comprehensive answer:
${context}`,
        },
        { role: 'user', content: query },
      ],
    });

    return completion.choices[0].message.content;
  }

  private async compareResults(
    topic: string,
    results: any[],
    jurisdictions: string[]
  ) {
    const context = results
      .map((r, i) => `Jurisdiction: ${jurisdictions[i]}\n${r.results.map((x: any) => x.chunk.content).join('\n')}`)
      .join('\n\n');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Compare the treatment of "${topic}" across the following jurisdictions:
${context}`,
        },
        {
          role: 'user',
          content: 'Provide a detailed comparison highlighting key differences and similarities.',
        },
      ],
    });

    return completion.choices[0].message.content;
  }

  private async assessCompliance(
    scenario: string,
    primary: any[],
    secondary: any[]
  ) {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Assess compliance of the following scenario with accounting standards:
Scenario: ${scenario}

Primary Standards:
${primary.map(p => `[${p.document.code}] ${p.chunk.content}`).join('\n\n')}

Secondary Guidance:
${secondary.map(s => `[${s.source.name}] ${s.chunk.content}`).join('\n\n')}`,
        },
        {
          role: 'user',
          content: 'Assess compliance and provide recommendations.',
        },
      ],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }
}

// Usage Example
async function example() {
  const orchestrator = new KnowledgeOrchestrator({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    openaiApiKey: process.env.OPENAI_API_KEY!,
  });

  // Complex query
  const result = await orchestrator.handleComplexQuery(
    'How should we account for revenue from long-term construction contracts?',
    'RW'
  );

  // Compare jurisdictions
  const comparison = await orchestrator.compareJurisdictions(
    'revenue recognition for software subscriptions',
    ['RW', 'EU', 'US']
  );

  // Compliance check
  const compliance = await orchestrator.checkCompliance(
    'Company recognizes revenue at contract signing',
    'RW'
  );
}
```

---

## Batch Processing

Process multiple queries efficiently.

```typescript
import pLimit from 'p-limit';
import { DeepSearchAgent } from '../deepsearch-agent';

export class BatchProcessor {
  private agent: DeepSearchAgent;
  private limit = pLimit(5); // Max 5 concurrent requests

  constructor(agent: DeepSearchAgent) {
    this.agent = agent;
  }

  /**
   * Process multiple queries in parallel with concurrency control
   */
  async processQueries(queries: string[], jurisdiction?: string) {
    const results = await Promise.all(
      queries.map(query =>
        this.limit(() =>
          this.agent.search({
            query,
            jurisdictionCode: jurisdiction,
            topK: 5,
          })
        )
      )
    );

    return results;
  }

  /**
   * Process queries with progress tracking
   */
  async processQueriesWithProgress(
    queries: string[],
    jurisdiction?: string,
    onProgress?: (current: number, total: number) => void
  ) {
    const results: any[] = [];
    let completed = 0;

    for (const query of queries) {
      const result = await this.agent.search({
        query,
        jurisdictionCode: jurisdiction,
        topK: 5,
      });

      results.push(result);
      completed++;

      if (onProgress) {
        onProgress(completed, queries.length);
      }
    }

    return results;
  }

  /**
   * Process queries with retry logic
   */
  async processQueriesWithRetry(
    queries: string[],
    jurisdiction?: string,
    maxRetries = 3
  ) {
    const results = [];

    for (const query of queries) {
      let attempt = 0;
      let success = false;
      let lastError: Error | null = null;

      while (attempt < maxRetries && !success) {
        try {
          const result = await this.agent.search({
            query,
            jurisdictionCode: jurisdiction,
            topK: 5,
          });

          results.push({ query, result, status: 'success' });
          success = true;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          attempt++;

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (!success) {
        results.push({
          query,
          error: lastError?.message,
          status: 'failed',
        });
      }
    }

    return results;
  }
}
```

This documentation continues with **Cache Strategies** and **Error Handling Patterns** sections...
