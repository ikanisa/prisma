import { BarChart, Activity, Clock, AlertCircle } from 'lucide-react';

const metrics = [
  { label: 'API Requests', value: '12.4k', change: '+12%', icon: Activity },
  { label: 'Avg Response', value: '245ms', change: '-8%', icon: Clock },
  { label: 'Error Rate', value: '0.12%', change: '-3%', icon: AlertCircle },
];

export default function TelemetryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Telemetry & Monitoring
        </h2>
        <p className="text-muted-foreground">
          Real-time system metrics and performance data
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.change.startsWith('+');
          const isNegative = metric.change.startsWith('-');
          
          return (
            <div
              key={metric.label}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span
                  className={`text-sm font-medium ${
                    metric.label === 'Error Rate'
                      ? isNegative
                        ? 'text-green-600'
                        : 'text-red-600'
                      : isPositive
                        ? 'text-green-600'
                        : 'text-red-600'
                  }`}
                >
                  {metric.change}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">
                  {metric.value}
                </p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Placeholder */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Request Volume</h3>
        </div>
        <div className="flex h-64 items-center justify-center p-6">
          <div className="text-center">
            <BarChart className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              Chart visualization will be displayed here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
