'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Eye,
  Power,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getWebSources, updateSourceStatus, type WebSource } from '../actions';

const CATEGORIES = ['IFRS', 'ISA', 'ETHICS', 'TAX', 'CORP', 'REG', 'AML', 'US_GAAP', 'KNOWLEDGE'];
const JURISDICTIONS = ['GLOBAL', 'RW', 'MT', 'EU', 'US', 'UK'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING'];

export default function SourcesPage() {
  const [sources, setSources] = useState<WebSource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    category?: string;
    jurisdiction?: string;
    status?: string;
    search?: string;
  }>({});

  useEffect(() => {
    loadSources();
  }, [page, filters.category, filters.jurisdiction, filters.status]);

  async function loadSources() {
    setLoading(true);
    try {
      const { sources: data, total: count } = await getWebSources(page, 20, {
        category: filters.category,
        jurisdiction: filters.jurisdiction,
        status: filters.status,
      });
      setSources(data);
      setTotal(count);
    } catch (error) {
      console.error('Failed to load sources:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(sourceId: string, currentStatus: string) {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await updateSourceStatus(sourceId, newStatus);
    loadSources();
  }

  const filteredSources = filters.search
    ? sources.filter(
        (s) =>
          s.name.toLowerCase().includes(filters.search!.toLowerCase()) ||
          s.base_url.toLowerCase().includes(filters.search!.toLowerCase())
      )
    : sources;

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Web Sources</h2>
          <p className="text-muted-foreground">Manage curated knowledge sources ({total} total)</p>
        </div>
        <Link href="/admin/knowledge" className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
          Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sources..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full rounded-lg border bg-background px-10 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select value={filters.category || ''} onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })} className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
        </select>
        <select value={filters.jurisdiction || ''} onChange={(e) => setFilters({ ...filters, jurisdiction: e.target.value || undefined })} className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Jurisdictions</option>
          {JURISDICTIONS.map((jur) => (<option key={jur} value={jur}>{jur}</option>))}
        </select>
        <select value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })} className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Statuses</option>
          {STATUSES.map((status) => (<option key={status} value={status}>{status}</option>))}
        </select>
        <button onClick={() => setFilters({})} className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:bg-accent">
          <Filter className="h-4 w-4" />Clear
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Jurisdiction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Pages</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Chunks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSources.map((source) => (
                    <tr key={source.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium">{source.name}</div>
                          <a href={source.base_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                            {source.base_url.replace(/^https?:\/\//, '').slice(0, 40)}<ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{source.category}</span></td>
                      <td className="px-6 py-4 text-sm">{source.jurisdiction_code}</td>
                      <td className="px-6 py-4 text-sm">{source.page_count.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">{source.chunk_count.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${source.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                          {source.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/knowledge/sources/${source.id}`} className="rounded-lg border p-2 text-muted-foreground hover:bg-accent"><Eye className="h-4 w-4" /></Link>
                          <button onClick={() => toggleStatus(source.id, source.status)} className="rounded-lg border p-2 text-muted-foreground hover:bg-accent"><Power className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} sources</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="inline-flex items-center gap-1 rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50 hover:bg-accent">
                <ChevronLeft className="h-4 w-4" />Previous
              </button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="inline-flex items-center gap-1 rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50 hover:bg-accent">
                Next<ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
