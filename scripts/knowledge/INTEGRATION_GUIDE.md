# Knowledge Base Integration Guide
Complete guide for integrating the accounting knowledge base into your applications

## 🎯 Quick Integration

### Option 1: Direct Database Queries

```typescript
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function searchKnowledge(question: string) {
  // 1. Generate embedding
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question,
  });

  // 2. Search via RPC
  const { data } = await supabase.rpc("search_knowledge_semantic", {
    query_embedding: JSON.stringify(embedding.data[0].embedding),
    match_threshold: 0.75,
    match_count: 5,
  });

  return data;
}
```

### Option 2: Using DeepSearch Agent

```typescript
import { DeepSearchAgent } from "./scripts/knowledge/deepsearch-agent";

const agent = new DeepSearchAgent({ supabase, openai });

const response = await agent.search({
  query: "How do I account for foreign exchange?",
  types: ["IFRS", "IAS"],
  jurisdiction: "RW",
});

console.log(response.answer);
console.log(response.sources);
console.log(response.confidence);
```

### Option 3: Load from YAML Config

```typescript
const agent = await DeepSearchAgent.fromConfigFile(
  supabase,
  openai,
  "config/knowledge/deepsearch-agent.yaml"
);

const response = await agent.search({ query: "..." });
```

## 🔌 Integration Patterns

### 1. REST API Endpoint

```typescript
// apps/gateway/src/routes/knowledge.ts
import { Router } from "express";
import { DeepSearchAgent } from "@/scripts/knowledge/deepsearch-agent";

const router = Router();

router.post("/api/knowledge/search", async (req, res) => {
  try {
    const { query, jurisdiction, types } = req.body;

    const agent = new DeepSearchAgent({ supabase, openai });
    const response = await agent.search({
      query,
      jurisdiction,
      types,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
```

### 2. Next.js Server Action

```typescript
// apps/web/src/app/actions/knowledge.ts
"use server";

import { DeepSearchAgent } from "@/scripts/knowledge/deepsearch-agent";
import { createClient } from "@/lib/supabase-server";

export async function searchKnowledge(query: string, options?: {
  jurisdiction?: string;
  types?: string[];
}) {
  const supabase = createClient();
  const agent = new DeepSearchAgent({ 
    supabase, 
    openai: new OpenAI() 
  });

  const response = await agent.search({
    query,
    ...options,
  });

  return {
    answer: response.answer,
    sources: response.sources,
    confidence: response.confidence,
  };
}
```

### 3. React Component

```typescript
// apps/web/src/components/KnowledgeSearch.tsx
"use client";

import { useState } from "react";
import { searchKnowledge } from "@/app/actions/knowledge";

export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await searchKnowledge(query, {
        types: ["IFRS", "IAS"],
      });
      setResult(response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about accounting standards..."
          className="flex-1 px-4 py-2 border rounded"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {result && (
        <div className="border rounded p-4">
          <h3 className="font-bold mb-2">Answer</h3>
          <p className="mb-4">{result.answer}</p>

          <h4 className="font-semibold mb-2">Sources</h4>
          <ul className="space-y-1">
            {result.sources.map((source: any, idx: number) => (
              <li key={idx} className="text-sm">
                {source.code} {source.section} ({(source.similarity * 100).toFixed(1)}%)
              </li>
            ))}
          </ul>

          <p className="text-sm text-gray-600 mt-4">
            Confidence: {(result.confidence * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}
```

### 4. Chat Interface

```typescript
// apps/web/src/components/AccountingChat.tsx
"use client";

import { useState } from "react";
import { searchKnowledge } from "@/app/actions/knowledge";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: any[];
  confidence?: number;
};

export function AccountingChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await searchKnowledge(input);

      const assistantMessage: Message = {
        role: "assistant",
        content: response.answer,
        sources: response.sources,
        confidence: response.confidence,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] border rounded">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100"
              }`}
            >
              <p>{msg.content}</p>
              {msg.sources && (
                <div className="mt-2 text-xs opacity-75">
                  Sources: {msg.sources.map((s) => s.code).join(", ")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask about accounting..."
          className="flex-1 px-4 py-2 border rounded"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

### 5. CLI Tool

```typescript
// scripts/knowledge/cli.ts
import { DeepSearchAgent } from "./deepsearch-agent";
import readline from "readline";

const agent = new DeepSearchAgent({ supabase, openai });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🤖 Accounting Knowledge Assistant");
console.log("Ask me anything about IFRS, IAS, ISA, or tax law\n");

rl.on("line", async (query) => {
  if (query === "exit") {
    process.exit(0);
  }

  const response = await agent.search({ query });

  console.log("\n" + response.answer + "\n");
  console.log("Sources:", response.sources.map((s) => s.code).join(", "));
  console.log(
    "Confidence:",
    (response.confidence * 100).toFixed(1) + "%\n"
  );

  rl.prompt();
});

rl.prompt();
```

## 🎨 UI Components Library

### SearchBox Component

```typescript
// packages/ui/src/components/SearchBox.tsx
export function SearchBox({
  onSearch,
  placeholder = "Search accounting standards...",
}: {
  onSearch: (query: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            onSearch(query);
          }
        }}
        placeholder={placeholder}
        className="w-full px-4 py-3 pl-12 border rounded-lg"
      />
      <SearchIcon className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
    </div>
  );
}
```

### CitationCard Component

```typescript
// packages/ui/src/components/CitationCard.tsx
export function CitationCard({
  code,
  title,
  section,
  similarity,
}: {
  code: string;
  title: string;
  section?: string;
  similarity: number;
}) {
  return (
    <div className="border rounded p-3 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">{code}</h4>
          <p className="text-xs text-gray-600">{title}</p>
          {section && (
            <p className="text-xs text-gray-500 mt-1">Section: {section}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Relevance</div>
          <div className="font-semibold text-sm">
            {(similarity * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 🔐 Security Considerations

### 1. API Key Management

```typescript
// apps/gateway/src/middleware/auth.ts
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || !validateApiKey(apiKey)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}
```

### 2. Rate Limiting

```typescript
// apps/gateway/src/middleware/rateLimit.ts
import rateLimit from "express-rate-limit";

export const knowledgeSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: "Too many requests, please try again later",
});
```

### 3. Input Validation

```typescript
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().min(3).max(500),
  jurisdiction: z.string().length(2).optional(),
  types: z.array(z.enum(["IFRS", "IAS", "ISA", "GAAP", "TAX_LAW"])).optional(),
});

// Use in endpoint
const validated = searchSchema.parse(req.body);
```

## 📊 Monitoring & Analytics

### 1. Query Logging

```typescript
// Already built into DeepSearchAgent
// All queries are logged to agent_queries_log table
```

### 2. Performance Metrics

```sql
-- Average query latency
SELECT
  agent_name,
  AVG(latency_ms) as avg_latency,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_name;
```

### 3. User Analytics

```sql
-- Popular queries
SELECT
  query_text,
  COUNT(*) as count,
  AVG((metadata->>'avg_similarity')::float) as avg_relevance
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY query_text
ORDER BY count DESC
LIMIT 20;
```

## 🚀 Deployment

### Environment Variables

```bash
# .env.production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-key
DATABASE_URL=postgresql://...
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  knowledge-api:
    build: .
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    ports:
      - "3001:3001"
```

## 📚 Best Practices

1. **Cache results**: Use Redis for frequently asked questions
2. **Batch queries**: Group similar queries for efficiency
3. **Monitor costs**: Track OpenAI API usage
4. **Update regularly**: Re-ingest standards quarterly
5. **A/B test thresholds**: Find optimal similarity thresholds
6. **Human oversight**: Flag low-confidence answers
7. **Audit trails**: Always log queries for compliance

## 🔗 Related Documentation

- [Quick Start Guide](./QUICK_START.md)
- [README](./README.md)
- [DeepSearch Agent Config](../../config/knowledge/deepsearch-agent.yaml)
- [AccountantAI Agent Config](../../config/knowledge/accountant-ai-agent.yaml)
- [Retrieval Rules](../../config/knowledge/retrieval-rules.yaml)
