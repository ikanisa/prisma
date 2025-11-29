import { GitBranch, Plus, Play, Pause } from 'lucide-react';

const workflows = [
  { id: 1, name: 'Client Onboarding', status: 'active', runs: 45 },
  { id: 2, name: 'Document Review', status: 'active', runs: 128 },
  { id: 3, name: 'Tax Filing Prep', status: 'paused', runs: 23 },
];

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Workflows
          </h2>
          <p className="text-muted-foreground">
            Design and manage automated workflows
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Create Workflow
        </button>
      </div>

      {/* Workflows List */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Active Workflows</h3>
        </div>
        <div className="divide-y divide-border">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{workflow.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {workflow.runs} runs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    workflow.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}
                >
                  {workflow.status}
                </span>
                <button className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent">
                  {workflow.status === 'active' ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
