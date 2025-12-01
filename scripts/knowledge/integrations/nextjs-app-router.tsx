/**
 * Next.js App Router Integration Examples
 * 
 * Comprehensive examples showing how to integrate the Accounting Knowledge Base
 * into Next.js 13+ applications using App Router, Server Components, and Server Actions.
 */

import { DeepSearchAgent } from '../deepsearch-agent';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ============================================================================
// SERVER COMPONENTS
// ============================================================================

/**
 * Server Component: Knowledge Search Page
 * Usage: app/knowledge/search/page.tsx
 */
export default async function KnowledgeSearchPage({
  searchParams,
}: {
  searchParams: { q?: string; jurisdiction?: string };
}) {
  let results = null;
  
  if (searchParams.q) {
    const agent = new DeepSearchAgent({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      openaiApiKey: process.env.OPENAI_API_KEY!,
    });

    results = await agent.search({
      query: searchParams.q,
      jurisdictionCode: searchParams.jurisdiction,
      topK: 6,
    });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Accounting Knowledge Base</h1>
      
      <SearchForm 
        initialQuery={searchParams.q} 
        initialJurisdiction={searchParams.jurisdiction}
      />
      
      {results && <SearchResults results={results} />}
    </div>
  );
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

'use server';

import { revalidatePath } from 'next/cache';

/**
 * Server Action: Perform Knowledge Search
 * Usage: Import and call from Client Components
 */
export async function searchKnowledgeBase(formData: FormData) {
  const query = formData.get('query') as string;
  const jurisdiction = formData.get('jurisdiction') as string;

  if (!query?.trim()) {
    return { error: 'Query is required' };
  }

  try {
    const agent = new DeepSearchAgent({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      openaiApiKey: process.env.OPENAI_API_KEY!,
    });

    const results = await agent.search({
      query: query.trim(),
      jurisdictionCode: jurisdiction || undefined,
      topK: 6,
    });

    await logQuery({
      agentName: 'DeepSearch',
      query,
      jurisdiction,
      resultCount: results.results.length,
    });

    revalidatePath('/knowledge/search');
    
    return { success: true, results };
  } catch (error) {
    console.error('Knowledge search error:', error);
    return { 
      error: 'Search failed. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Server Action: Ask Accountant AI with Citations
 * Usage: Powers AI assistant chat interfaces
 */
export async function askAccountantAI(formData: FormData) {
  const question = formData.get('question') as string;
  const jurisdiction = formData.get('jurisdiction') as string;
  const context = formData.get('context') as string;

  if (!question?.trim()) {
    return { error: 'Question is required' };
  }

  try {
    const agent = new DeepSearchAgent({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      openaiApiKey: process.env.OPENAI_API_KEY!,
    });

    const searchResults = await agent.search({
      query: question.trim(),
      jurisdictionCode: jurisdiction || undefined,
      topK: 6,
    });

    const knowledgeContext = searchResults.results
      .map(r => `[${r.document.code}] ${r.chunk.content}`)
      .join('\n\n');

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a professional accountant assistant. Provide accurate, 
standard-compliant answers based on IFRS, IAS, ISA, GAAP, and local tax laws.
Always cite sources using [Standard Section] format. State assumptions clearly.

Context from knowledge base:
${knowledgeContext}`,
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

    await logQuery({
      agentName: 'AccountantAI',
      query: question,
      jurisdiction,
      resultCount: searchResults.results.length,
      response: answer?.slice(0, 500),
    });

    return {
      success: true,
      answer,
      citations: searchResults.results.map(r => ({
        code: r.document.code,
        title: r.document.title,
        section: r.chunk.sectionPath,
        confidence: r.score,
      })),
    };
  } catch (error) {
    console.error('AccountantAI error:', error);
    return {
      error: 'Failed to generate answer. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// CLIENT COMPONENTS
// ============================================================================

'use client';

import { useState, useTransition } from 'react';

/**
 * Client Component: Search Form
 */
function SearchForm({ 
  initialQuery = '', 
  initialJurisdiction = '' 
}: { 
  initialQuery?: string; 
  initialJurisdiction?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form 
      action="/knowledge/search"
      method="GET"
      className="mb-8"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => {
          const formData = new FormData(e.currentTarget);
          const q = formData.get('q');
          const jurisdiction = formData.get('jurisdiction');
          const params = new URLSearchParams();
          if (q) params.set('q', q.toString());
          if (jurisdiction) params.set('jurisdiction', jurisdiction.toString());
          window.location.href = `/knowledge/search?${params.toString()}`;
        });
      }}
    >
      <div className="flex gap-4">
        <input
          type="text"
          name="q"
          defaultValue={initialQuery}
          placeholder="Search accounting standards, tax laws..."
          className="flex-1 px-4 py-2 border rounded-lg"
          disabled={isPending}
        />
        
        <select
          name="jurisdiction"
          defaultValue={initialJurisdiction}
          className="px-4 py-2 border rounded-lg"
          disabled={isPending}
        >
          <option value="">All Jurisdictions</option>
          <option value="RW">Rwanda</option>
          <option value="EU">European Union</option>
          <option value="US">United States</option>
          <option value="GLOBAL">Global (IFRS/IAS)</option>
        </select>

        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
}

/**
 * Client Component: Search Results Display
 */
function SearchResults({ results }: { results: any }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Found {results.results.length} results
        </h2>
        <span className="text-sm text-gray-600">
          Search time: {results.metadata.searchTimeMs}ms
        </span>
      </div>

      {results.results.map((result: any, idx: number) => (
        <div key={idx} className="border rounded-lg p-6 hover:shadow-lg transition">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-blue-600">
                {result.document.code} - {result.document.title}
              </h3>
              {result.chunk.sectionPath && (
                <p className="text-sm text-gray-600">
                  Section: {result.chunk.sectionPath}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-green-600">
                {(result.score * 100).toFixed(0)}% match
              </span>
              <span className="text-xs text-gray-500">
                {result.source.authorityLevel}
              </span>
            </div>
          </div>

          {result.chunk.heading && (
            <h4 className="font-medium text-gray-700 mb-2">
              {result.chunk.heading}
            </h4>
          )}

          <p className="text-gray-700 mb-3 leading-relaxed">
            {result.chunk.content}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>📚 {result.source.name}</span>
            <span>🌍 {result.jurisdiction.name}</span>
            {result.source.url && (
              <a 
                href={result.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View source →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Client Component: AI Assistant Chat Interface
 */
function AccountantAIChat() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('question', userMessage);
      
      const result = await askAccountantAI(formData);

      if (result.success && result.answer) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: result.answer },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'error', content: result.error || 'Failed to get response' },
        ]);
      }
    });
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : msg.role === 'error'
                ? 'bg-red-100'
                : 'bg-gray-100 max-w-[80%]'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {isPending && (
          <div className="bg-gray-100 p-4 rounded-lg max-w-[80%]">
            <p className="text-sm text-gray-600">Thinking...</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask an accounting question..."
            className="flex-1 px-4 py-2 border rounded-lg"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function logQuery(data: {
  agentName: string;
  query: string;
  jurisdiction?: string;
  resultCount?: number;
  response?: string | null;
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from('agent_queries_log').insert({
    agent_name: data.agentName,
    query_text: data.query,
    response_summary: data.response,
    metadata: {
      jurisdiction: data.jurisdiction,
      result_count: data.resultCount,
      timestamp: new Date().toISOString(),
    },
  });
}
