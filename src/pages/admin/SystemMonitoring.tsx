/**
 * System Monitoring Dashboard
 * Production-ready monitoring interface for easyMO
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Database, 
  MemoryStick, 
  Zap,
  RefreshCw,
  Clock,
  TrendingUp,
  AlertTriangle,
  ShieldAlert
} from "lucide-react";

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency_ms?: number;
  error?: string;
  metadata?: Record<string, any>;
}

interface SystemMetrics {
  timestamp: string;
  memory_usage: {
    rss: number;
    heap_used: number;
    heap_total: number;
    external: number;
  };
  request_count: number;
  error_count: number;
  avg_response_time: number;
  active_connections: number;
}

interface SystemAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  service: string;
  metadata: Record<string, any>;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}

export default function SystemMonitoring() {
  const [healthData, setHealthData] = useState<{
    overall_status: 'healthy' | 'unhealthy' | 'degraded';
    checks: HealthCheck[];
    timestamp: string;
  } | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { toast } = useToast();

  const refreshHealthData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('system-health-monitor', {
        body: { action: 'health' }
      });

      if (error) throw error;
      setHealthData(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch health data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('system-health-monitor', {
        body: { action: 'metrics' }
      });

      if (error) throw error;
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const refreshAlerts = async () => {
    try {
      // Use alert_configurations table for now
      const { data: alertData, error: alertError } = await supabase
        .from('alert_configurations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (alertError) {
        console.error('Failed to fetch alerts:', alertError);
        setAlerts([]);
        return;
      }

      // Transform alert_configurations to match SystemAlert interface
      const transformedAlerts: SystemAlert[] = alertData?.map(alert => ({
        id: alert.id,
        severity: (alert.severity_levels?.[0] as 'low' | 'medium' | 'high' | 'critical') || 'medium',
        title: alert.name || 'System Alert',
        message: `Alert configuration: ${alert.name || 'Unnamed alert'} - Throttle: ${alert.throttle_minutes || 15} minutes`,
        service: 'system',
        metadata: typeof alert.notification_channels === 'object' && alert.notification_channels ? 
                  alert.notification_channels as Record<string, any> : {},
        acknowledged: !alert.is_active, // Use is_active inversely as acknowledged
        resolved: !alert.is_active,
        created_at: alert.created_at
      })) || [];

      setAlerts(transformedAlerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setAlerts([]);
    }
  };

  const runFullMonitoring = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('system-health-monitor');

      if (error) throw error;
      
      setHealthData(data.health);
      setMetrics(data.metrics);
      setLastRefresh(new Date());
      
      // Refresh alerts
      await refreshAlerts();
      
      toast({
        title: "Success",
        description: "System monitoring completed",
      });
    } catch (error) {
      console.error('Failed to run monitoring:', error);
      toast({
        title: "Error",
        description: "Failed to run system monitoring",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      // Use alert_configurations table for now
      const { error } = await supabase
        .from('alert_configurations')
        .update({ 
          is_active: false // Disable the alert configuration
        })
        .eq('id', alertId);

      if (error) {
        throw error;
      }
      
      await refreshAlerts();
      toast({
        title: "Success",
        description: "Alert acknowledged (configuration disabled)",
      });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    runFullMonitoring();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'healthy' ? 'default' : 
                   status === 'degraded' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system health and performance monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button 
            onClick={runFullMonitoring} 
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(healthData.overall_status)}
              System Status
            </CardTitle>
            <CardDescription>
              Overall system health: {getStatusBadge(healthData.overall_status)}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          {healthData?.checks.map((check, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {check.service === 'database' ? <Database className="h-4 w-4" /> :
                     check.service === 'memory' ? <MemoryStick className="h-4 w-4" /> :
                     <Zap className="h-4 w-4" />}
                    {check.service.charAt(0).toUpperCase() + check.service.slice(1)}
                  </CardTitle>
                  {getStatusBadge(check.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {check.latency_ms && (
                    <div>
                      <span className="text-muted-foreground">Latency:</span>
                      <p className="font-medium">{check.latency_ms}ms</p>
                    </div>
                  )}
                  {check.metadata && Object.entries(check.metadata).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                      <p className="font-medium">
                        {typeof value === 'number' && key.includes('mb') ? 
                          `${value} MB` : 
                          typeof value === 'number' && key.includes('percent') ?
                          `${Number(value).toFixed(1)}%` :
                          String(value)
                        }
                      </p>
                    </div>
                  ))}
                </div>
                {check.error && (
                  <Alert className="mt-4" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{check.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                  <MemoryStick className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatBytes(metrics.memory_usage.heap_used)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    of {formatBytes(metrics.memory_usage.heap_total)} total
                  </p>
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground">
                      RSS: {formatBytes(metrics.memory_usage.rss)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Requests</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.request_count}</div>
                  <p className="text-xs text-muted-foreground">
                    Total requests processed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Errors</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.error_count}</div>
                  <p className="text-xs text-muted-foreground">
                    Total errors encountered
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No alerts found. System is running smoothly!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className={alert.severity === 'critical' ? 'border-red-200' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getSeverityIcon(alert.severity)}
                      {alert.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' :
                        alert.severity === 'high' ? 'destructive' :
                        alert.severity === 'medium' ? 'secondary' : 'default'
                      }>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      {!alert.acknowledged && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    Service: {alert.service} • {new Date(alert.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{alert.message}</p>
                  {Object.keys(alert.metadata).length > 0 && (
                    <div className="mt-3 p-3 bg-muted rounded text-xs">
                      <pre>{JSON.stringify(alert.metadata, null, 2)}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}