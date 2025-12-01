'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Database,
  FileText,
  Globe,
  TrendingUp,
  RefreshCw,
  Search,
  BarChart3,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { getKnowledgeStats, type KnowledgeStats } from './actions';

export default function KnowledgeDashboard() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const data = await getKnowledgeStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const coverage = stats.totalChunks > 0 ? (stats.embeddedChunks / stats.totalChunks) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Knowledge Console</h2>
          <p className="text-muted-foreground">
            Monitor ingestion, search analytics, and knowledge base quality
          </p>
        </div>
        <button
          onClick={loadStats}
          className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Web Sources"
          value={stats.totalSources.toLocaleString()}
          subtext={`${stats.activeSources} active`}
          icon={Globe}
          trend={
            stats.activeSources === stats.totalSources ? (
              <span className="text-green-600 dark:text-green-400">All active</span>
            ) : undefined
          }
        />
        <MetricCard
          label="Pages Indexed"
          value={stats.totalPages.toLocaleString()}
          subtext={`${stats.activeSources} sources`}
          icon={FileText}
        />
        <MetricCard
          label="Knowledge Chunks"
          value={stats.totalChunks.toLocaleString()}
          subtext={`${coverage.toFixed(1)}% embedded`}
          icon={Database}
          trend={
            coverage === 100 ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : undefined
          }
        />
        <MetricCard
          label="Last Sync"
          value={
            stats.lastSync
              ? new Date(stats.lastSync).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Never'
          }
          subtext={stats.lastSync ? getRelativeTime(stats.lastSync) : undefined}
          icon={Clock}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickLink
          href="/admin/knowledge/sources"
          icon={Globe}
          title="Web Sources"
          description="Manage 200 curated sources"
        />
        <QuickLink
          href="/admin/knowledge/analytics"
          icon={BarChart3}
          title="Search Analytics"
          description="Query stats and usage"
        />
        <QuickLink
          href="/admin/knowledge/test"
          icon={Search}
          title="Test DeepSearch"
          description="Try vector search"
        />
      </div>

      {/* Category Distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <TrendingUp className="h-5 w-5" />
            Top Categories
          </h3>
          <div className="space-y-3">
            {stats.categories.slice(0, 8).map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <span className="text-sm font-medium">{cat.category}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${(cat.count / stats.totalChunks) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm text-muted-foreground">
                    {cat.count.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Globe className="h-5 w-5" />
            Top Jurisdictions
          </h3>
          <div className="space-y-3">
            {stats.jurisdictions.slice(0, 8).map((jur) => (
              <div key={jur.jurisdiction} className="flex items-center justify-between">
                <span className="text-sm font-medium">{jur.jurisdiction}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${(jur.count / stats.totalChunks) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm text-muted-foreground">
                    {jur.count.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  trend?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-muted-foreground" />
        {trend}
      </div>
      <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border bg-card p-6 transition-all hover:border-primary hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold group-hover:text-primary">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function getRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
