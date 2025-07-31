import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  last_updated: string;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  source_ip: string;
  user_id?: string;
  details: any;
  created_at: string;
  resolved: boolean;
}

export default function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchSecurityData = async (showToast = false) => {
    try {
      setRefreshing(true);

      // Fetch security audit log
      const { data: auditData, error: auditError } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditError) throw auditError;

      // Fetch rate limit data
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .from('rate_limit_tracker')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (rateLimitError) throw rateLimitError;

      // Process events
      const processedEvents: SecurityEvent[] = (auditData || []).map(event => ({
        id: event.id,
        event_type: event.event_type,
        severity: event.severity,
        source_ip: event.source_ip || 'Unknown',
        user_id: event.user_id,
        details: event.details || {},
        created_at: event.created_at,
        resolved: false // You could add a resolved field to your schema
      }));

      setEvents(processedEvents);

      // Calculate metrics
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const events24h = processedEvents.filter(e => new Date(e.created_at) > last24h);
      const eventsWeek = processedEvents.filter(e => new Date(e.created_at) > lastWeek);
      
      const criticalEvents24h = events24h.filter(e => e.severity === 'critical').length;
      const highEvents24h = events24h.filter(e => e.severity === 'high').length;
      
      const calculatedMetrics: SecurityMetric[] = [
        {
          id: 'total_events_24h',
          name: 'Security Events (24h)',
          value: events24h.length,
          status: events24h.length > 50 ? 'critical' : events24h.length > 20 ? 'warning' : 'good',
          trend: events24h.length > eventsWeek.length / 7 ? 'up' : 'down',
          last_updated: now.toISOString()
        },
        {
          id: 'critical_events',
          name: 'Critical Events (24h)',
          value: criticalEvents24h,
          status: criticalEvents24h > 0 ? 'critical' : 'good',
          trend: 'stable',
          last_updated: now.toISOString()
        },
        {
          id: 'high_events',
          name: 'High Severity Events (24h)',
          value: highEvents24h,
          status: highEvents24h > 5 ? 'critical' : highEvents24h > 2 ? 'warning' : 'good',
          trend: 'stable',
          last_updated: now.toISOString()
        },
        {
          id: 'rate_limits',
          name: 'Rate Limit Triggers',
          value: (rateLimitData || []).length,
          status: (rateLimitData || []).length > 100 ? 'warning' : 'good',
          trend: 'stable',
          last_updated: now.toISOString()
        },
        {
          id: 'unique_ips',
          name: 'Unique Source IPs (24h)',
          value: new Set(events24h.map(e => e.source_ip)).size,
          status: 'good',
          trend: 'stable',
          last_updated: now.toISOString()
        }
      ];

      setMetrics(calculatedMetrics);

      if (showToast) {
        toast({
          title: "Security data refreshed",
          description: "Security metrics and events have been updated.",
        });
      }
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({
        title: "Error fetching security data",
        description: "Failed to load security information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    
    // Set up real-time subscription for security events
    const subscription = supabase
      .channel('security_events')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'security_audit_log' },
        (payload) => {
          console.log('New security event:', payload);
          fetchSecurityData();
        }
      )
      .subscribe();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => fetchSecurityData(), 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'low': 'secondary',
      'medium': 'outline',
      'high': 'destructive',
      'critical': 'destructive'
    };
    
    return <Badge variant={variants[severity] || 'default'}>{severity.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  const criticalAlerts = events.filter(e => e.severity === 'critical').slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
          <p className="text-muted-foreground">Monitor security events and system health</p>
        </div>
        <Button 
          onClick={() => fetchSecurityData(true)} 
          disabled={refreshing}
          variant="outline"
        >
          {refreshing ? (
            <>
              <Activity className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Critical Security Alerts</AlertTitle>
          <AlertDescription className="text-red-700">
            {criticalAlerts.length} critical security event(s) require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
              {getStatusIcon(metric.status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className={`h-3 w-3 mr-1 ${
                  metric.trend === 'up' ? 'text-red-500' : 
                  metric.trend === 'down' ? 'text-green-500' : 'text-gray-500'
                }`} />
                {metric.trend === 'up' ? 'Increasing' : 
                 metric.trend === 'down' ? 'Decreasing' : 'Stable'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Events Table */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Events</TabsTrigger>
          <TabsTrigger value="critical">Critical Events</TabsTrigger>
          <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Latest security events from the past 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {events.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      {getSeverityBadge(event.severity)}
                      <div>
                        <p className="text-sm font-medium">{event.event_type.replace(/_/g, ' ').toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">IP: {event.source_ip}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No security events found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="critical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Critical Security Events</CardTitle>
              <CardDescription>Events requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {events.filter(e => e.severity === 'critical').map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50">
                    <div className="flex items-center space-x-3">
                      {getSeverityBadge(event.severity)}
                      <div>
                        <p className="text-sm font-medium">{event.event_type.replace(/_/g, ' ').toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">IP: {event.source_ip}</p>
                        {event.details && (
                          <p className="text-xs text-gray-600 mt-1">
                            {JSON.stringify(event.details).substring(0, 100)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {events.filter(e => e.severity === 'critical').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>No critical security events found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting Activity</CardTitle>
              <CardDescription>Recent rate limiting triggers and patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Rate limiting data visualization coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}