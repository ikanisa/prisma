'use client';

import { useMemo, useState } from 'react';

import { Button } from '@prisma-glow/ui';

import { EMBEDDING_MODEL_OPTIONS, type EmbeddingModelOption } from './model-options';

type EmbeddingResponse = {
  data: Array<{ index: number; embedding: number[] }>;
};

type SampleDocument = {
  id: string;
  title: string;
  summary: string;
  content: string;
  focus: string;
};

const SAMPLE_DOCUMENTS: SampleDocument[] = [
  {
    id: 'controls-revenue',
    title: 'Revenue controls walkthrough',
    summary: 'Key controls covering cut-off, approval, and revenue recognition for SaaS contracts.',
    content:
      'Revenue cycle walkthrough describing order intake, multi-step approvals, ASC 606 allocation, and cut-off testing procedures for SaaS contracts with annual upfront billing.',
    focus: 'Audit controls',
  },
  {
    id: 'evidence-manifest',
    title: 'Evidence manifest generator',
    summary: 'Automation note describing how sampling manifests include checksum, policy references, and storage paths.',
    content:
      'Automation utility that collates sampling manifests, generates SHA-256 checksums, stores Supabase storage paths, and links documents to approval workflows to meet ISA evidence retention.',
    focus: 'Automation',
  },
  {
    id: 'tax-vat',
    title: 'VAT return preparation checklist',
    summary: 'Workflow for computing VAT payable, partial exemption coefficient, and filing deadlines.',
    content:
      'VAT return preparation instructions detailing Malta 2025 rates, partial exemption coefficients, adjustments for zero-rated supplies, and filing deadlines with review checklist.',
    focus: 'Tax',
  },
  {
    id: 'analytics-je',
    title: 'Journal entry risk analytics',
    summary: 'Explanation of deterministic scoring that prioritises high-risk journal entries for testing.',
    content:
      'Deterministic analytics kernel scoring journal entries for weekends, round amounts, late postings, and segregation of duties violations. Outputs sampling manifest and ties to ADA-1 logs.',
    focus: 'Analytics',
  },
  {
    id: 'client-portal',
    title: 'Client portal onboarding script',
    summary: 'Sequence for provisioning portal access and delivering onboarding checklist to clients.',
    content:
      'Client portal onboarding procedure covering identity verification, workspace provisioning, initial document request packs, and task assignments for engagement leads.',
    focus: 'Engagements',
  },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

const DETERMINISTIC_VOCAB = Array.from(
  new Set(
    SAMPLE_DOCUMENTS.flatMap((doc) =>
      tokenize(`${doc.title} ${doc.summary} ${doc.content}`),
    ),
  ),
).sort();

function buildDeterministicVector(text: string): number[] {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return new Array(DETERMINISTIC_VOCAB.length).fill(0);
  }

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  const vector = DETERMINISTIC_VOCAB.map((term) => counts.get(term) ?? 0);
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm ? vector.map((value) => value / norm) : vector;
}

const DETERMINISTIC_DOCUMENT_VECTORS = SAMPLE_DOCUMENTS.map((doc) =>
  buildDeterministicVector(`${doc.title} ${doc.summary} ${doc.content}`),
);

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const valueA = a[i];
    const valueB = b[i];
    dot += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }
  if (!normA || !normB) {
    return 0;
  }
  return dot / Math.sqrt(normA * normB);
}

export function SimilarityExplorer() {
  const [query, setQuery] = useState('Which artefacts explain revenue controls?');
  const [model, setModel] = useState<EmbeddingModelOption>('text-embedding-3-small');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Array<{ document: SampleDocument; score: number }>>([]);
  const [useDeterministicCorpus, setUseDeterministicCorpus] = useState(true);

  const sortedScores = useMemo(
    () => [...scores].sort((a, b) => b.score - a.score).slice(0, 4),
    [scores],
  );

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      setError('Provide a query to search across the sample documents.');
      return;
    }

    setLoading(true);
    setError(null);
    setScores([]);

    try {
      if (useDeterministicCorpus) {
        const deterministicVector = buildDeterministicVector(query.trim());
        const nextScores = SAMPLE_DOCUMENTS.map((document, index) => ({
          document,
          score: cosineSimilarity(deterministicVector, DETERMINISTIC_DOCUMENT_VECTORS[index] ?? []),
        }));
        setScores(nextScores);
        return;
      }

      const payload = {
        input: [query.trim(), ...SAMPLE_DOCUMENTS.map((doc) => doc.content)],
        model,
      };

      const response = await fetch('/api/openai/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as EmbeddingResponse & { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to compute embeddings for search');
      }

      if (!Array.isArray(body.data) || body.data.length <= SAMPLE_DOCUMENTS.length) {
        throw new Error('Embedding response did not include all document vectors.');
      }

      const [queryVector, ...documentVectors] = body.data.map((item) => item.embedding);
      const nextScores = SAMPLE_DOCUMENTS.map((document, index) => ({
        document,
        score: cosineSimilarity(queryVector, documentVectors[index] ?? []),
      }));

      setScores(nextScores);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error running search');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">Search across curated knowledge</h3>
        <p className="text-sm text-slate-600">
          We embed a mini knowledge base alongside your query and rank the most relevant artefacts using cosine similarity. This
          mirrors the retrieval-augmented generation pattern you would apply to Supabase or pgvector.
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900" htmlFor="similarity-query">
            Natural language query
          </label>
          <input
            id="similarity-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-900" htmlFor="similarity-model">
              Model
            </label>
            <select
              id="similarity-model"
              value={model}
              onChange={(event) => setModel(event.target.value as EmbeddingModelOption)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              disabled={loading}
            >
              {EMBEDDING_MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-900" htmlFor="deterministic-toggle">
              <input
                id="deterministic-toggle"
                type="checkbox"
                checked={useDeterministicCorpus}
                onChange={(event) => setUseDeterministicCorpus(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Use deterministic corpus (offline)
            </label>
            <p className="text-xs text-slate-500">
              Seeded vectors keep demos and tests deterministic without calling the OpenAI API.
            </p>
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Searching…' : 'Run semantic search'}
            </Button>
          </div>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-3">
        {sortedScores.length ? (
          <ul className="space-y-3">
            {sortedScores.map(({ document, score }) => (
              <li
                key={document.id}
                className="rounded-md border border-slate-200 bg-slate-50 p-4 shadow-inner transition hover:border-blue-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-blue-600">{document.focus}</p>
                    <h4 className="text-base font-semibold text-slate-900">{document.title}</h4>
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    Similarity {score.toFixed(3)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{document.summary}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Run a search to rank the sample artefacts by semantic similarity.</p>
        )}
      </div>
    </div>
  );
}
