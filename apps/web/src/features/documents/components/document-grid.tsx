'use client';

import { formatDistanceToNow } from 'date-fns';
import { useDocuments } from '../hooks/use-documents';
import type { DocumentSummary } from '../services/document-service';
import { logger } from '@/lib/logger';
import { Skeleton } from '@/components/ui/skeleton';

const formatUpdatedAt = (iso?: string | null) => {
  if (!iso) return 'recently';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('document_grid.timestamp_format_failed', { error, iso });
    }
    return 'recently';
  }
};

export interface DocumentGridProps {
  repo?: string | null;
  title?: string;
}

const DOCUMENT_LOADING_PLACEHOLDERS = Array.from({ length: 6 });

export function DocumentGrid({ repo = null, title = 'Recent knowledge base documents' }: DocumentGridProps) {
  const { documents, total, source, isPending } = useDocuments(repo);

  if (isPending) {
    return (
      <section
        className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm"
        aria-labelledby="documents-heading"
        aria-busy="true"
      >
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          {DOCUMENT_LOADING_PLACEHOLDERS.map((_, index) => (
            <article key={`document-grid-skeleton-${index}`} className="space-y-3 rounded-lg border border-border/80 bg-background p-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm" aria-labelledby="documents-heading">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="documents-heading" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">
            Synced from structured storage {source === 'stub' ? '(sample data)' : ''}.
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground" aria-live="polite">
          {total} file{total === 1 ? '' : 's'}
        </span>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {documents.map((doc: DocumentSummary) => (
          <article key={doc.id} className="space-y-3 rounded-lg border border-border/80 bg-background p-4">
            <header className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{doc.category}</p>
              <h3 className="text-base font-semibold text-foreground">{doc.name}</h3>
            </header>
            <dl className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <dt className="font-medium text-foreground">Owner</dt>
                <dd>{doc.owner ?? 'Unassigned'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-medium text-foreground">Status</dt>
                <dd className="capitalize">{doc.state}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-medium text-foreground">Updated</dt>
                <dd>{formatUpdatedAt(doc.updatedAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
