'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Globe,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Power,
  PowerOff,
  Edit,
  Trash2,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { getActiveSources, getSourceCountByCategory, getCrawlStats, toggleSourceStatus } from '@/packages/lib/src/knowledge-web-sources';
import type { KnowledgeWebSource } from '@/packages/lib/src/knowledge-web-sources';

export default function WebSourcesPage() {
  const supabase = createClientComponentClient();
  
  const [sources, setSources] = useState<KnowledgeWebSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'INACTIVE' | 'all'>('all');

  // Load data
  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedJurisdiction, selectedStatus]);

  async function loadData() {
    try {
      setLoading(true);

      // Build filters
      const filters: any = {};
      if (selectedCategory !== 'all') filters.category = selectedCategory;
      if (selectedJurisdiction !== 'all') filters.jurisdiction = selectedJurisdiction;
      if (selectedStatus !== 'all') filters.status = selectedStatus;

      // Load sources
      const sourcesData = await getActiveSources(supabase, filters);
      setSources(sourcesData);

      // Load stats
      const [statsData, categoryData] = await Promise.all([
        getCrawlStats(supabase),
        getSourceCountByCategory(supabase, selectedStatus !== 'INACTIVE'),
      ]);

      setStats(statsData);
      setCategoryCounts(categoryData);
    } catch (error) {
      console.error('Failed to load sources:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter sources by search term
  const filteredSources = sources.filter((source) =>
    source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle source status
  async function handleToggleStatus(id: string) {
    try {
      await toggleSourceStatus(supabase, id);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  }

  // Get unique values for filters
  const categories = Array.from(new Set(sources.map((s) => s.category))).sort();
  const jurisdictions = Array.from(new Set(sources.map((s) => s.jurisdiction_code))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Web Knowledge Sources
          </h2>
          <p className="text-muted-foreground">
            Manage 200 curated web sources for AI agent learning
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Source
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-5">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Sources</p>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{stats.total}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Active</p>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{stats.active}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Never Crawled</p>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{stats.neverCrawled}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Recent (7d)</p>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{stats.recentlyCrawled}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Stale (30d+)</p>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{stats.stale}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid gap-4 sm:grid-cols-4">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-10 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat} ({categoryCounts[cat] || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Jurisdiction Filter */}
        <div>
          <select
            value={selectedJurisdiction}
            onChange={(e) => setSelectedJurisdiction(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Jurisdictions</option>
            {jurisdictions.map((jur) => (
              <option key={jur} value={jur}>
                {jur}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sources Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">
            Sources ({filteredSources.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`rounded px-3 py-1 text-sm ${
                selectedStatus === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus('ACTIVE')}
              className={`rounded px-3 py-1 text-sm ${
                selectedStatus === 'ACTIVE'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setSelectedStatus('INACTIVE')}
              className={`rounded px-3 py-1 text-sm ${
                selectedStatus === 'INACTIVE'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              No sources found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {source.status === 'ACTIVE' ? (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{source.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary truncate max-w-md"
                        >
                          {source.url}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                          {source.category}
                        </span>
                        <span className="rounded bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-400">
                          {source.jurisdiction_code}
                        </span>
                        <span className="rounded bg-purple-500/10 px-2 py-0.5 text-purple-600 dark:text-purple-400">
                          Priority {source.priority}
                        </span>
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
                          {source.authority_level}
                        </span>
                        {source.last_crawled_at ? (
                          <span className="text-muted-foreground">
                            Crawled {new Date(source.last_crawled_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            Never crawled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleStatus(source.id)}
                    className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent"
                    title={source.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  >
                    {source.status === 'ACTIVE' ? (
                      <Power className="h-4 w-4" />
                    ) : (
                      <PowerOff className="h-4 w-4" />
                    )}
                  </button>
                  <button className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Distribution */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Category Distribution</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(categoryCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <span className="text-sm font-medium text-foreground">{category}</span>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
