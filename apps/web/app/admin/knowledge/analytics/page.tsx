'use client';

import Link from 'next/link';
import { BarChart3, TrendingUp, Clock, ArrowLeft } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Search Analytics</h2>
          <p className="text-muted-foreground">Query statistics and usage patterns</p>
        </div>
        <Link
          href="/admin/knowledge"
          className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      {/* Coming Soon Notice */}
      <div className="rounded-lg border bg-card p-12 text-center">
        <BarChart3 className="mx-auto h-16 w-16 text-muted-foreground" />
        <h3 className="mt-6 text-xl font-semibold">Analytics Coming Soon</h3>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Query logging and analytics dashboard will be available in the next release. Track search
          patterns, identify knowledge gaps, and monitor agent usage.
        </p>

        <div className="mx-auto mt-8 max-w-2xl space-y-4">
          <h4 className="text-sm font-semibold">Planned Features:</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-background p-4 text-left">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h5 className="mt-2 font-medium">Query Trends</h5>
              <p className="mt-1 text-xs text-muted-foreground">
                Track popular searches by category and jurisdiction
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4 text-left">
              <Clock className="h-5 w-5 text-primary" />
              <h5 className="mt-2 font-medium">Usage Patterns</h5>
              <p className="mt-1 text-xs text-muted-foreground">
                Identify peak usage times and agent activity
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4 text-left">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h5 className="mt-2 font-medium">Low Similarity Alerts</h5>
              <p className="mt-1 text-xs text-muted-foreground">
                Find queries with poor matches to identify gaps
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4 text-left">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h5 className="mt-2 font-medium">Agent Stats</h5>
              <p className="mt-1 text-xs text-muted-foreground">
                See which agents use the knowledge base most
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
