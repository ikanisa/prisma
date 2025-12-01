import { ClipboardCheck, Plus, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';

const audits = [
  { id: 1, client: 'Acme Corporation', type: 'Financial Audit', status: 'in_progress', progress: 65 },
  { id: 2, client: 'TechStart Inc.', type: 'Compliance Review', status: 'pending', progress: 0 },
  { id: 3, client: 'Global Traders LLC', type: 'Internal Audit', status: 'completed', progress: 100 },
];

const findings = [
  { id: 1, severity: 'high', title: 'Revenue Recognition Issue', client: 'Acme Corporation' },
  { id: 2, severity: 'medium', title: 'Inventory Discrepancy', client: 'TechStart Inc.' },
  { id: 3, severity: 'low', title: 'Documentation Gap', client: 'Global Traders LLC' },
];

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Audit
          </h2>
          <p className="text-muted-foreground">
            Manage audit workflows and findings
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New Audit
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-foreground">3</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
              <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-foreground">5</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-foreground">12</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open Findings</p>
              <p className="text-2xl font-bold text-foreground">8</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Audits */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Active Audits</h3>
        </div>
        <div className="divide-y divide-border">
          {audits.map((audit) => (
            <div
              key={audit.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{audit.client}</h4>
                  <p className="text-sm text-muted-foreground">{audit.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24">
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${audit.progress}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {audit.progress}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Findings */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Recent Findings</h3>
        </div>
        <div className="divide-y divide-border">
          {findings.map((finding) => (
            <div
              key={finding.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`rounded-lg p-2 ${
                    finding.severity === 'high'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : finding.severity === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}
                >
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      finding.severity === 'high'
                        ? 'text-red-600 dark:text-red-400'
                        : finding.severity === 'medium'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-blue-600 dark:text-blue-400'
                    }`}
                  />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{finding.title}</h4>
                  <p className="text-sm text-muted-foreground">{finding.client}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  finding.severity === 'high'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : finding.severity === 'medium'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}
              >
                {finding.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
