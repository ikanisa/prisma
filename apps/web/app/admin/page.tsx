import { Shield, Users, Bot, GitBranch, BarChart, Activity, Server, Database } from 'lucide-react';
import Link from 'next/link';

const stats = [
  { label: 'Total Users', value: '156', icon: Users, href: '/admin/iam' },
  { label: 'Active Agents', value: '8', icon: Bot, href: '/admin/agents' },
  { label: 'Workflows', value: '12', icon: GitBranch, href: '/admin/workflows' },
  { label: 'API Calls (24h)', value: '45.2k', icon: Activity, href: '/admin/telemetry' },
];

const systemHealth = [
  { name: 'API Server', status: 'healthy', uptime: '99.9%' },
  { name: 'Database', status: 'healthy', uptime: '99.99%' },
  { name: 'Queue Workers', status: 'healthy', uptime: '99.8%' },
  { name: 'Storage', status: 'degraded', uptime: '98.5%' },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Admin Dashboard
        </h2>
        <p className="text-muted-foreground">
          System overview and administration
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* System Health */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">System Health</h3>
          </div>
          <span className="text-sm text-muted-foreground">Last updated: Just now</span>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {systemHealth.map((service) => (
            <div
              key={service.name}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{service.name}</span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    service.status === 'healthy'
                      ? 'bg-green-500'
                      : service.status === 'degraded'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">
                  {service.status}
                </span>
                <span className="text-muted-foreground">{service.uptime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/iam"
          className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
        >
          <div className="rounded-lg bg-primary/10 p-3">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">Manage Users</h4>
            <p className="text-sm text-muted-foreground">
              Add, edit, or remove user accounts
            </p>
          </div>
        </Link>

        <Link
          href="/admin/agents"
          className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
        >
          <div className="rounded-lg bg-primary/10 p-3">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">Configure Agents</h4>
            <p className="text-sm text-muted-foreground">
              Deploy and manage AI agents
            </p>
          </div>
        </Link>

        <Link
          href="/admin/knowledge"
          className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
        >
          <div className="rounded-lg bg-primary/10 p-3">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">Knowledge Base</h4>
            <p className="text-sm text-muted-foreground">
              Manage RAG and knowledge sources
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
