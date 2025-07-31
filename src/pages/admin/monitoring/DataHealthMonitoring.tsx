import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Database, AlertTriangle, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import { useAdminData } from '@/hooks/admin/useAdminData';

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: number;
  threshold: number;
  lastCheck: string;
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  uptime: number;
  lastCheck: string;
}

export default function DataHealthMonitoring() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([
    {
      name: 'Database Connections',
      status: 'healthy',
      value: 85,
      threshold: 90,
      lastCheck: new Date().toISOString()
    },
    {
      name: 'Memory Usage',
      status: 'warning',
      value: 75,
      threshold: 80,
      lastCheck: new Date().toISOString()
    },
    {
      name: 'API Response Time',
      status: 'healthy',
      value: 245,
      threshold: 500,
      lastCheck: new Date().toISOString()
    },
    {
      name: 'Error Rate',
      status: 'critical',
      value: 5.2,
      threshold: 2.0,
      lastCheck: new Date().toISOString()
    }
  ]);

  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([
    {
      name: 'Supabase Database',
      status: 'online',
      responseTime: 45,
      uptime: 99.9,
      lastCheck: new Date().toISOString()
    },
    {
      name: 'WhatsApp API',
      status: 'online',
      responseTime: 120,
      uptime: 98.5,
      lastCheck: new Date().toISOString()
    },
    {
      name: 'OpenAI API',
      status: 'degraded',
      responseTime: 2400,
      uptime: 95.2,
      lastCheck: new Date().toISOString()
    },
    {
      name: 'Edge Functions',
      status: 'online',
      responseTime: 180,
      uptime: 99.7,
      lastCheck: new Date().toISOString()
    }
  ]);

  const { data: circuitBreakers } = useAdminData('circuit_breakers', { autoLoad: true });

  const performanceData = [
    { time: '00:00', cpu: 45, memory: 62, network: 23 },
    { time: '04:00', cpu: 52, memory: 58, network: 31 },
    { time: '08:00', cpu: 78, memory: 71, network: 45 },
    { time: '12:00', cpu: 85, memory: 75, network: 52 },
    { time: '16:00', cpu: 92, memory: 82, network: 48 },
    { time: '20:00', cpu: 68, memory: 65, network: 35 },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
      case 'offline':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'default';
      case 'warning':
      case 'degraded':
        return 'secondary';
      case 'critical':
      case 'offline':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const healthyCount = healthMetrics.filter(m => m.status === 'healthy').length;
  const warningCount = healthMetrics.filter(m => m.status === 'warning').length;
  const criticalCount = healthMetrics.filter(m => m.status === 'critical').length;

  const onlineServices = serviceStatuses.filter(s => s.status === 'online').length;
  const avgResponseTime = serviceStatuses.reduce((acc, s) => acc + s.responseTime, 0) / serviceStatuses.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Health Monitoring</h1>
          <p className="text-muted-foreground">Monitor system health and service status</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Metrics</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{healthyCount}</div>
            <p className="text-xs text-muted-foreground">Out of {healthMetrics.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Online</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineServices}/{serviceStatuses.length}</div>
            <p className="text-xs text-muted-foreground">Available services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgResponseTime)}ms</div>
            <p className="text-xs text-muted-foreground">Across all services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Health Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(metric.status)}
                  <span className="font-medium">{metric.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusVariant(metric.status)}>
                    {metric.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {metric.name.includes('Time') ? `${metric.value}ms` : 
                     metric.name.includes('Rate') ? `${metric.value}%` : 
                     `${metric.value}%`}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceStatuses.map((service, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(service.status)}
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <Badge variant={getStatusVariant(service.status)}>
                    {service.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Response: {service.responseTime}ms</span>
                  <span>Uptime: {service.uptime}%</span>
                </div>
                <Progress value={service.uptime} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              cpu: { label: 'CPU', color: 'hsl(var(--chart-1))' },
              memory: { label: 'Memory', color: 'hsl(var(--chart-2))' },
              network: { label: 'Network', color: 'hsl(var(--chart-3))' },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="cpu" stroke="var(--color-cpu)" strokeWidth={2} />
                <Line type="monotone" dataKey="memory" stroke="var(--color-memory)" strokeWidth={2} />
                <Line type="monotone" dataKey="network" stroke="var(--color-network)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {circuitBreakers && circuitBreakers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Circuit Breakers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {circuitBreakers.map((breaker: any) => (
                <div key={breaker.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Badge variant={breaker.status === 'closed' ? 'default' : 'destructive'}>
                      {breaker.status}
                    </Badge>
                    <div>
                      <p className="font-medium">{breaker.service_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Failures: {breaker.failure_count}/{breaker.failure_threshold}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Last Updated: {new Date(breaker.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}