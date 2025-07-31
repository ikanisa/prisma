import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, Database, Settings, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SystemOps() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [cronJobs, setCronJobs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [executionsResult, cronJobsResult, alertsResult] = await Promise.all([
        supabase.from('agent_execution_log').select('*').limit(100),
        supabase.from('cron_jobs').select('*'),
        supabase.from('alert_configurations').select('*')
      ]);

      setExecutions(executionsResult.data || []);
      setCronJobs(cronJobsResult.data || []);
      setAlerts(alertsResult.data || []);
      
      // Fetch real system metrics from Supabase analytics or edge functions
      try {
        const { data: systemMetrics, error } = await supabase.functions.invoke('system-health-monitor', {
          body: { action: 'get_system_metrics' }
        });

        if (error) {
          console.error('Failed to fetch system metrics:', error);
          setMetrics([]);
        } else {
          setMetrics(systemMetrics?.metrics || []);
        }
      } catch (error) {
        console.error('Error fetching system metrics:', error);
        setMetrics([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': case 'critical': return 'bg-red-500';
      case 'active': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getJobStatusColor = (job: any) => {
    if (!job.is_active) return 'bg-gray-500';
    if (job.failure_count > 0) return 'bg-red-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Operations</h1>
        <Button>
          <Settings className="mr-2 h-4 w-4" />
          System Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">System Health</p>
                <p className="text-2xl font-bold text-green-600">
                  {metrics.find(m => m.name === 'System Health')?.value || '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="text-2xl font-bold">
                  {metrics.find(m => m.name === 'Uptime')?.value || '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">DB Queries/min</p>
                <p className="text-2xl font-bold">
                  {metrics.find(m => m.name === 'DB Queries')?.value || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold">
                  {alerts.filter(a => a.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Cron Jobs</p>
                <p className="text-2xl font-bold">
                  {cronJobs.filter(j => j.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="logs">Execution Logs</TabsTrigger>
          <TabsTrigger value="cron">Cron Jobs</TabsTrigger>
          <TabsTrigger value="alerts">Alert Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.map((metric, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{metric.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold">{metric.value}</span>
                        <Badge className={getStatusColor(metric.status)}>
                          {metric.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Function Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span className="font-bold">
                      {executions.length > 0 
                        ? Math.round((executions.filter(e => e.success_status).length / executions.length) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Response Time</span>
                    <span className="font-bold">
                      {executions.length > 0
                        ? Math.round(executions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / executions.length)
                        : 0}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Executions</span>
                    <span className="font-bold">{executions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed Executions</span>
                    <span className="font-bold text-red-600">
                      {executions.filter(e => !e.success_status).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Execution Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executions.slice(0, 20).map((execution) => (
                  <div key={execution.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={execution.success_status ? 'bg-green-500' : 'bg-red-500'}>
                            {execution.success_status ? 'Success' : 'Failed'}
                          </Badge>
                          <span className="font-medium">{execution.function_name}</span>
                          <span className="text-sm text-gray-600">
                            {execution.execution_time_ms}ms
                          </span>
                        </div>
                        {execution.error_details && (
                          <div className="text-sm text-red-600">
                            {execution.error_details}
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          {new Date(execution.timestamp).toLocaleString()}
                          {execution.user_id && (
                            <span className="ml-4">User: {execution.user_id}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cron">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cronJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{job.name}</h3>
                          <Badge className={getJobStatusColor(job)}>
                            {job.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{job.description}</p>
                        <div className="text-sm text-gray-500 space-x-4">
                          <span>Schedule: {job.schedule_expression}</span>
                          <span>Function: {job.function_name}</span>
                        </div>
                        <div className="text-sm text-gray-500 space-x-4">
                          <span>Executions: {job.execution_count}</span>
                          <span>Failures: {job.failure_count}</span>
                          {job.last_execution && (
                            <span>Last run: {new Date(job.last_execution).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          {job.is_active ? 'Pause' : 'Resume'}
                        </Button>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alert Configurations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{alert.name}</h3>
                          <Badge className={alert.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                            {alert.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          Types: {Array.isArray(alert.alert_types) ? alert.alert_types.join(', ') : 'None'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Severity: {Array.isArray(alert.severity_levels) ? alert.severity_levels.join(', ') : 'None'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Throttle: {alert.throttle_minutes} minutes
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}