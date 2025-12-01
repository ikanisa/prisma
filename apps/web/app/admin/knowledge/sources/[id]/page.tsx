'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Globe,
  FileText,
  Database,
  Calendar,
  Tag,
  Power,
  Clock,
} from 'lucide-react';
import { getSourceDetail, triggerSourceSync, updateSourceStatus, type SourceDetail } from '../../actions';

export default function SourceDetailPage() {
  const params = useParams();
  const sourceId = params.id as string;
  
  const [source, setSource] = useState<SourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSource();
  }, [sourceId]);

  async function loadSource() {
    setLoading(true);
    try {
      const data = await getSourceDetail(sourceId);
      setSource(data);
    } catch (error) {
      console.error('Failed to load source:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await triggerSourceSync(sourceId);
      await loadSource();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleStatus() {
    if (!source) return;
    const newStatus = source.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await updateSourceStatus(sourceId, newStatus);
    await loadSource();
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <h2 className="text-xl font-semibold">Source not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The source with ID {sourceId} could not be found.
          </p>
          <Link
            href="/admin/knowledge/sources"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sources
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/knowledge/sources"
              className="rounded-lg border p-2 hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{source.name}</h2>
              <a
                href={source.base_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                <Globe className="h-3 w-3" />
                {source.base_url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Re-sync'}
          </button>
          <button
            onClick={handleToggleStatus}
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Power className="h-4 w-4" />
            {source.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Category" value={source.category} icon={Tag} badge />
        <MetricCard label="Jurisdiction" value={source.jurisdiction_code} icon={Globe} />
        <MetricCard label="Pages" value={source.page_count.toLocaleString()} icon={FileText} />
        <MetricCard label="Chunks" value={source.chunk_count.toLocaleString()} icon={Database} />
      </div>

      {/* Status & Timing */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <Power className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Status</span>
          </div>
          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              source.status === 'ACTIVE'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
            }`}
          >
            {source.status}
          </span>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Created</span>
          </div>
          <p className="mt-2 text-sm">
            {new Date(source.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Last Sync</span>
          </div>
          <p className="mt-2 text-sm">
            {source.last_sync_at
              ? new Date(source.last_sync_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Never'}
          </p>
        </div>
      </div>

      {/* Tags */}
      {source.tags && source.tags.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Tag className="h-5 w-5" />
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {source.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pages Table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold">Pages ({source.pages.length})</h3>
        </div>
        <div className="divide-y">
          {source.pages.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No pages indexed yet. Re-sync to populate.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Chunks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Last Scraped
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {source.pages.map((page) => (
                    <tr key={page.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm hover:text-primary"
                        >
                          {page.url.replace(/^https?:\/\//, '').slice(0, 60)}
                          {page.url.length > 60 && '...'}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {page.title || <span className="text-muted-foreground">No title</span>}
                      </td>
                      <td className="px-6 py-4 text-sm">{page.chunk_count.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            page.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}
                        >
                          {page.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {page.last_scraped_at
                          ? new Date(page.last_scraped_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sync History (placeholder) */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Clock className="h-5 w-5" />
          Sync History
        </h3>
        <p className="text-sm text-muted-foreground">
          Sync history will be available after implementing the sync log table.
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  badge = false,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  badge?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {badge ? (
        <span className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {value}
        </span>
      ) : (
        <p className="mt-2 text-xl font-bold">{value}</p>
      )}
    </div>
  );
}
