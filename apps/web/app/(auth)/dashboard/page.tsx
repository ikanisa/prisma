'use client';

import { FileText, CheckSquare, Users, BarChart, Command, Sparkles } from 'lucide-react';
import { useCommand } from '@/components/features/command';
import { QuickAsk, InsightCard } from '@/components/features/ai';

const stats = [
  { label: 'Documents', value: '24', icon: FileText },
  { label: 'Tasks', value: '12', icon: CheckSquare },
  { label: 'Clients', value: '8', icon: Users },
  { label: 'Reports', value: '5', icon: BarChart },
];

const aiInsights = [
  {
    id: 1,
    title: 'VAT Filing Deadline Approaching',
    description: '3 clients have VAT returns due in the next 7 days. Review now to avoid late penalties.',
    type: 'warning' as const,
  },
  {
    id: 2,
    title: 'Audit Finding Needs Response',
    description: 'High severity finding for Acme Corp requires management response before Friday.',
    type: 'action' as const,
  },
  {
    id: 3,
    title: 'IFRS 16 Impact Analysis Ready',
    description: 'AI has completed lease analysis for 3 new contracts. Review suggested journal entries.',
    type: 'success' as const,
  },
];

export default function DashboardPage() {
  const { open } = useCommand();

  return (
    <div className="space-y-6">
      {/* Header with AI shortcut */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s what needs your attention today
          </p>
        </div>
        <button
          onClick={open}
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Sparkles className="h-4 w-4" />
          Ask AI
          <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>
        </button>
      </div>

      {/* Quick Ask Widget */}
      <QuickAsk
        placeholder="What do you need help with today?"
        contextHint="AI will auto-route to the right specialist"
      />

      {/* AI Insights */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Insights
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {aiInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              title={insight.title}
              description={insight.description}
              type={insight.type}
              action={{
                label: 'View details',
                onClick: () => console.log('View insight', insight.id),
              }}
            />
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div>
        <h3 className="mb-3 font-semibold text-foreground">Overview</h3>
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
      </div>

      {/* Recent Activity with AI context */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
          <button
            onClick={open}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Ask AI about activity →
          </button>
        </div>
        <div className="p-6">
          <p className="text-muted-foreground">No recent activity to display.</p>
        </div>
      </div>
    </div>
  );
}
