'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Sparkles, ExternalLink, ArrowLeft } from 'lucide-react';
import { testDeepSearch } from '../actions';

const CATEGORIES = ['IFRS', 'ISA', 'ETHICS', 'TAX', 'CORP', 'REG', 'AML', 'US_GAAP', 'KNOWLEDGE'];
const JURISDICTIONS = ['GLOBAL', 'RW', 'MT', 'EU', 'US', 'UK'];

export default function TestDeepSearchPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [jurisdiction, setJurisdiction] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await testDeepSearch(query, category, jurisdiction);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  const examples = [
    { query: 'revenue recognition', category: 'IFRS', jurisdiction: 'GLOBAL' },
    { query: 'VAT registration threshold', category: 'TAX', jurisdiction: 'RW' },
    { query: 'audit risk assessment procedures', category: 'ISA', jurisdiction: 'GLOBAL' },
    { query: 'Malta imputation system', category: 'TAX', jurisdiction: 'MT' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Test DeepSearch</h2>
          <p className="text-muted-foreground">
            Try semantic vector search across the knowledge base
          </p>
        </div>
        <Link
          href="/admin/knowledge"
          className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Query</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your question..."
              className="w-full rounded-lg border bg-background px-10 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category Filter</label>
            <select
              value={category || ''}
              onChange={(e) => setCategory(e.target.value || null)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Jurisdiction Filter</label>
            <select
              value={jurisdiction || ''}
              onChange={(e) => setJurisdiction(e.target.value || null)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Jurisdictions</option>
              {JURISDICTIONS.map((jur) => (
                <option key={jur} value={jur}>
                  {jur}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {loading ? 'Searching...' : 'Search Knowledge Base'}
        </button>
      </form>

      {/* Example Queries */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 font-semibold">Example Queries</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(ex.query);
                setCategory(ex.category);
                setJurisdiction(ex.jurisdiction);
              }}
              className="rounded-lg border bg-background p-4 text-left transition-colors hover:bg-accent"
            >
              <div className="font-medium">{ex.query}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{ex.category}</span>
                <span className="rounded bg-secondary px-1.5 py-0.5">{ex.jurisdiction}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Results ({results.length})</h3>
            <p className="text-sm text-muted-foreground">Sorted by similarity</p>
          </div>

          {results.map((result, i) => (
            <div key={result.id} className="rounded-lg border bg-card p-6">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {result.category}
                    </span>
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs">
                      {result.jurisdiction_code}
                    </span>
                  </div>
                  <h4 className="mt-2 font-semibold">{result.source_name}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Similarity</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {(result.similarity * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm leading-relaxed">{result.content}</p>

              {result.tags && result.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {result.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <a
                href={result.page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View source
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && !error && (
        <div className="rounded-lg border bg-muted/50 p-12 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-semibold">No results yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter a query and click Search to test the knowledge base
          </p>
        </div>
      )}
    </div>
  );
}
