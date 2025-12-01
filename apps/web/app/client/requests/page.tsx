import { Send, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const requests = [
  { id: 1, title: 'Tax Extension Request', status: 'pending', date: '2024-01-15' },
  { id: 2, title: 'Document Clarification', status: 'completed', date: '2024-01-10' },
  { id: 3, title: 'Account Update', status: 'in_progress', date: '2024-01-08' },
];

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  in_progress: { label: 'In Progress', icon: AlertCircle, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', icon: CheckCircle, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

export default function ClientRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Requests
          </h2>
          <p className="text-muted-foreground">
            Track your submitted requests
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* Requests List */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Your Requests</h3>
        </div>
        <div className="divide-y divide-border">
          {requests.map((request) => {
            const status = statusConfig[request.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;
            
            return (
              <div
                key={request.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Send className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{request.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Submitted on {new Date(request.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
