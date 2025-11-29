import { FileText, CheckSquare, Users, BarChart } from 'lucide-react';

const stats = [
  { label: 'Documents', value: '24', icon: FileText },
  { label: 'Tasks', value: '12', icon: CheckSquare },
  { label: 'Clients', value: '8', icon: Users },
  { label: 'Reports', value: '5', icon: BarChart },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your workspace
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="p-6">
          <p className="text-muted-foreground">No recent activity to display.</p>
        </div>
      </div>
    </div>
  );
}
