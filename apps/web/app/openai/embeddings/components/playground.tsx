'use client';

import { useMemo, useState } from 'react';

import { Button } from '@prisma-glow/ui';

import { EMBEDDING_MODEL_OPTIONS, type EmbeddingModelOption } from './model-options';

type EmbeddingVector = {
  index: number;
  embedding: number[];
};

type EmbeddingResponse = {
  model: string;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
  data: EmbeddingVector[];
};

const numberFormatter = new Intl.NumberFormat('en-GB', {
  maximumFractionDigits: 6,
});

function formatVectorPreview(vector: number[]): string {
  if (!vector.length) {
    return '';
  }
  const preview = vector.slice(0, 8).map((value) => numberFormatter.format(value));
  const suffix = vector.length > preview.length ? ' …' : '';
  return `[${preview.join(', ')}${suffix}]`;
}

function computeVectorStats(vector: number[] | undefined) {
  if (!vector?.length) {
    return null;
  }
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sumSquares = 0;

  for (const value of vector) {
    min = Math.min(min, value);
    max = Math.max(max, value);
    sumSquares += value * value;
  }

  const norm = Math.sqrt(sumSquares);

  return { length: vector.length, min, max, norm };
}

export function EmbeddingPlayground() {
  const [text, setText] = useState(
    'Embeddings turn unstructured text into vectors you can search, cluster, and analyse.',
  );
  const [model, setModel] = useState<EmbeddingModelOption>('text-embedding-3-small');
  const [dimensions, setDimensions] = useState<string>('');
  const [result, setResult] = useState<EmbeddingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const primaryVector = useMemo(() => result?.data[0]?.embedding ?? [], [result]);
  const stats = useMemo(() => computeVectorStats(primaryVector), [primaryVector]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!text.trim()) {
      setError('Enter some text to embed.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const dimsValue = Number(dimensions);
    const payload: Record<string, unknown> = {
      input: text.trim(),
      model,
    };

    if (!Number.isNaN(dimsValue) && dimsValue > 0) {
      payload.dimensions = Math.floor(dimsValue);
    }

    try {
      const response = await fetch('/api/openai/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as EmbeddingResponse & { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to create embedding');
      }

      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error creating embedding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">Generate an embedding</h3>
        <p className="text-sm text-slate-600">
          Pick a model, optionally shorten the dimensions, and create an embedding for your sample text. The
          preview shows the first values plus vector statistics to validate normalisation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900" htmlFor="embed-text">
            Text to embed
          </label>
          <textarea
            id="embed-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="min-h-[120px] w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-900" htmlFor="embed-model">
              Model
            </label>
            <select
              id="embed-model"
              value={model}
              onChange={(event) => setModel(event.target.value as EmbeddingModelOption)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {EMBEDDING_MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-900" htmlFor="embed-dimensions">
              Dimensions (optional)
            </label>
            <input
              id="embed-dimensions"
              inputMode="numeric"
              min={1}
              max={3072}
              placeholder="e.g. 512"
              value={dimensions}
              onChange={(event) => setDimensions(event.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="text-xs text-slate-500">
              Shorten vectors for latency-sensitive workloads. Values above the model dimension are ignored.
            </p>
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Generating…' : 'Create embedding'}
            </Button>
          </div>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {result ? (
        <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-medium text-slate-900">{result.model}</span>
            {stats ? (
              <span className="text-slate-600">
                {stats.length} dimensions · L2 norm {numberFormatter.format(stats.norm)} · min{' '}
                {numberFormatter.format(stats.min)} · max {numberFormatter.format(stats.max)}
              </span>
            ) : null}
            {result.usage ? (
              <span className="text-slate-500">
                Tokens: prompt {result.usage.prompt_tokens ?? 0} · total {result.usage.total_tokens ?? 0}
              </span>
            ) : null}
          </div>
          <div className="rounded bg-white p-3 font-mono text-xs text-slate-700 shadow-inner">
            {formatVectorPreview(primaryVector)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
