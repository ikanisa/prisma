import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Activity, TrendingUp, Users, MessageSquare, Zap, Database, RefreshCw } from 'lucide-react';
import { useAdminData } from '@/hooks/admin/useAdminData';

export default function SystemMetrics() {
  const [timeRange, setTimeRange] = useState('24h');
  const [metricType, setMetricType] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: executionLogs } = useAdminData('agent_execution_log', { autoLoad: true });
  const { data: performanceMetrics } = useAdminData('agent_performance_metrics', { autoLoad: true });

  // Mock data for visualizations
  const usageData = [
    { time: '00:00', users: 145, messages: 2340, api_calls: 890 },
    { time: '04:00', users: 89, messages: 1456, api_calls: 567 },
    { time: '08:00', users: 234, messages: 3789, api_calls: 1234 },
    { time: '12:00', users: 456, messages: 5678, api_calls: 2100 },
    { time: '16:00', users: 389, messages: 4567, api_calls: 1800 },
    { time: '20:00', users: 278, messages: 3456, api_calls: 1456 },
  ];

  const errorData = [
    { time: '00:00', errors: 5, warnings: 12 },
    { time: '04:00', errors: 3, warnings: 8 },
    { time: '08:00', errors: 8, warnings: 15 },
    { time: '12:00', errors: 12, warnings: 23 },
    { time: '16:00', errors: 6, warnings: 18 },
    { time: '20:00', errors: 4, warnings: 10 },
  ];

  const performanceData = [
    { name: 'Response Time', value: 245, trend: '+5%' },
    { name: 'Throughput', value: 1250, trend: '+12%' },
    { name: 'Success Rate', value: 98.5, trend: '+0.3%' },
    { name: 'CPU Usage', value: 68, trend: '-2%' },
  ];

  const functionUsage = [
    { name: 'WhatsApp Handler', calls: 1240, errors: 5 },
    { name: 'AI Assistant', calls: 890, errors: 12 },
    { name: 'Memory Manager', calls: 567, errors: 2 },
    { name: 'Quality Gate', calls: 345, errors: 8 },
    { name: 'Payment Handler', calls: 234, errors: 1 },
  ];

  const pieData = [
    { name: 'Successful', value: 85, color: '#22c55e' },
    { name: 'Failed', value: 10, color: '#ef4444' },
    { name: 'Timeout', value: 3, color: '#f59e0b' },
    { name: 'Retried', value: 2, color: '#3b82f6' },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const totalExecutions = executionLogs?.length || 0;
  const successfulExecutions = executionLogs?.filter((log: any) => log.success_status === true).length || 0;
  const avgExecutionTime = executionLogs?.reduce((acc: number, log: any) => acc + (log.execution_time_ms || 0), 0) / totalExecutions || 0;
  const errorRate = ((totalExecutions - successfulExecutions) / totalExecutions * 100) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Metrics</h1>
          <p className="text-muted-foreground">Monitor system performance and usage statistics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((successfulExecutions / totalExecutions) * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">+0.3% improvement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgExecutionTime)}ms</div>
            <p className="text-xs text-muted-foreground">-15ms improvement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">-0.5% improvement</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                users: { label: 'Active Users', color: 'hsl(var(--chart-1))' },
                messages: { label: 'Messages', color: 'hsl(var(--chart-2))' },
                api_calls: { label: 'API Calls', color: 'hsl(var(--chart-3))' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2} />
                  <Line type="monotone" dataKey="messages" stroke="var(--color-messages)" strokeWidth={2} />
                  <Line type="monotone" dataKey="api_calls" stroke="var(--color-api_calls)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execution Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                successful: { label: 'Successful', color: '#22c55e' },
                failed: { label: 'Failed', color: '#ef4444' },
                timeout: { label: 'Timeout', color: '#f59e0b' },
                retried: { label: 'Retried', color: '#3b82f6' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                errors: { label: 'Errors', color: 'hsl(var(--destructive))' },
                warnings: { label: 'Warnings', color: 'hsl(var(--warning))' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={errorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="warnings" stackId="1" stroke="var(--color-warnings)" fill="var(--color-warnings)" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="errors" stackId="1" stroke="var(--color-errors)" fill="var(--color-errors)" fillOpacity={0.8} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Function Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                calls: { label: 'Calls', color: 'hsl(var(--chart-1))' },
                errors: { label: 'Errors', color: 'hsl(var(--destructive))' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={functionUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="calls" fill="var(--color-calls)" />
                  <Bar dataKey="errors" fill="var(--color-errors)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {performanceData.map((metric, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{metric.name}</h3>
                  <span className={`text-sm ${metric.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.trend}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">
                    {metric.name === 'Response Time' ? `${metric.value}ms` :
                     metric.name === 'Success Rate' ? `${metric.value}%` :
                     metric.name === 'CPU Usage' ? `${metric.value}%` :
                     metric.value.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}