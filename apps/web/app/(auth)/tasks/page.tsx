import { CheckSquare, Plus, Filter } from 'lucide-react';

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Tasks
          </h2>
          <p className="text-muted-foreground">Track and manage your tasks</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">
          <Filter className="h-4 w-4" />
          Filter
        </button>
        <div className="flex gap-2">
          <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
            All
          </button>
          <button className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">
            Active
          </button>
          <button className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">
            Completed
          </button>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <CheckSquare className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium text-foreground">
          No tasks yet
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first task to get started
        </p>
        <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Create Task
        </button>
      </div>
    </div>
  );
}
