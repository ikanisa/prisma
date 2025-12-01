import { FileText, Send, Bell, Clock } from 'lucide-react';

const recentActivity = [
  { id: 1, title: 'Document uploaded', description: 'Tax return 2024.pdf', time: '2 hours ago' },
  { id: 2, title: 'Request submitted', description: 'Extension request for Q4', time: '1 day ago' },
  { id: 3, title: 'Status update', description: 'Your 1099 form is ready', time: '3 days ago' },
];

export default function ClientPortalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome to Your Portal
        </h2>
        <p className="text-muted-foreground">
          Access your documents and communicate with your team
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <button className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent">
          <div className="rounded-lg bg-primary/10 p-3">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <span className="font-medium text-foreground">View Documents</span>
        </button>
        <button className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent">
          <div className="rounded-lg bg-primary/10 p-3">
            <Send className="h-6 w-6 text-primary" />
          </div>
          <span className="font-medium text-foreground">Submit Request</span>
        </button>
        <button className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent">
          <div className="rounded-lg bg-primary/10 p-3">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <span className="font-medium text-foreground">Notifications</span>
        </button>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="divide-y divide-border">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 px-6 py-4">
              <div className="rounded-lg bg-muted p-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{activity.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
