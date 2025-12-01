'use client';

/**
 * Agent Analytics Dashboard
 * 
 * Real-time monitoring of agent performance, RAG usage, and user feedback.
 */

import { useEffect, useState } from 'react';

export default function AgentAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExecutions: 0,
    successRate: 0,
    avgRating: 0,
    totalCost: 0,
  });

  useEffect(() => {
    // Simulated data for now
    setTimeout(() => {
      setStats({
        totalExecutions: 1234,
        successRate: 98.5,
        avgRating: 4.7,
        totalCost: 12.45,
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agent Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Real-time monitoring of agent performance and RAG usage
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total Executions"
            value={stats.totalExecutions.toLocaleString()}
            subtitle="Last 30 days"
            color="bg-blue-500"
          />
          <SummaryCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            subtitle="Across all agents"
            color="bg-green-500"
          />
          <SummaryCard
            title="Average Rating"
            value={stats.avgRating.toFixed(1)}
            subtitle="Out of 5.0"
            color="bg-yellow-500"
          />
          <SummaryCard
            title="Total Cost"
            value={`$${stats.totalCost.toFixed(2)}`}
            subtitle="OpenAI API costs"
            color="bg-purple-500"
          />
        </div>

        {/* Placeholder for charts */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Coming Soon</h2>
          <p className="text-gray-600">
            Full analytics dashboard with charts and real-time data will be available once the database migration is applied.
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <p className="text-sm text-blue-900 font-medium">Next Steps:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-blue-800">
              <li>Apply migration: <code className="bg-blue-100 px-1 rounded">psql "$DATABASE_URL" -f supabase/migrations/20260201170000_agent_analytics_schema.sql</code></li>
              <li>Start tracking agent usage with <code className="bg-blue-100 px-1 rounded">AgentAnalyticsLogger</code></li>
              <li>View real-time metrics on this dashboard</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`w-12 h-12 ${color} rounded-lg mb-4`}></div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
    </div>
  );
}
