import { BookOpen, Plus, Search, FileText, Database, RefreshCw, Trash2 } from 'lucide-react';

const knowledgeSources = [
  { id: 1, name: 'Tax Regulations 2024', type: 'document', size: '12.5 MB', lastUpdated: '2024-01-15', status: 'indexed' },
  { id: 2, name: 'Audit Standards', type: 'document', size: '8.2 MB', lastUpdated: '2024-01-10', status: 'indexed' },
  { id: 3, name: 'Company Policies', type: 'document', size: '3.1 MB', lastUpdated: '2024-01-08', status: 'pending' },
  { id: 4, name: 'Client FAQ', type: 'database', size: '256 KB', lastUpdated: '2024-01-20', status: 'indexed' },
];

const stats = [
  { label: 'Total Documents', value: '1,234' },
  { label: 'Indexed Chunks', value: '45.6k' },
  { label: 'Embeddings', value: '45.6k' },
  { label: 'Last Sync', value: '2 hours ago' },
];

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Knowledge Base
          </h2>
          <p className="text-muted-foreground">
            Manage RAG knowledge sources and embeddings
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Source
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-6"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search knowledge sources..."
          className="w-full rounded-lg border border-input bg-background px-10 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Knowledge Sources */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Knowledge Sources</h3>
          <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-4 w-4" />
            Re-index All
          </button>
        </div>
        <div className="divide-y divide-border">
          {knowledgeSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  {source.type === 'document' ? (
                    <FileText className="h-5 w-5 text-primary" />
                  ) : (
                    <Database className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{source.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="capitalize">{source.type}</span>
                    <span>•</span>
                    <span>{source.size}</span>
                    <span>•</span>
                    <span>Updated {new Date(source.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    source.status === 'indexed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}
                >
                  {source.status}
                </span>
                <button className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent">
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
