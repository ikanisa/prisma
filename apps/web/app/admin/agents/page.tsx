import { Bot, Plus, Activity, Zap } from 'lucide-react';

const agents = [
  { id: 1, name: 'Tax Analysis Agent', status: 'active', tasks: 24 },
  { id: 2, name: 'Document Processor', status: 'active', tasks: 156 },
  { id: 3, name: 'Client Onboarding', status: 'inactive', tasks: 0 },
];

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            AI Agents
          </h2>
          <p className="text-muted-foreground">
            Manage and monitor AI agents
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Deploy Agent
        </button>
      </div>

      {/* Agents Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="rounded-lg border border-border bg-card p-6"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-primary/10 p-2">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  agent.status === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {agent.status}
              </span>
            </div>
            <h3 className="mt-4 font-semibold text-foreground">{agent.name}</h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>{agent.tasks} tasks completed</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent">
                Configure
              </button>
              <button className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent">
                <Zap className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
