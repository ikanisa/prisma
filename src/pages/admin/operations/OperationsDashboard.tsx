import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminQuery } from "@/hooks/useSecureQuery";
import { Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function OperationsDashboard() {
  const { data: logs, isLoading: loadingLogs } = useAdminQuery({
    table: 'edge_function_logs',
    queryKey: ['admin', 'edge_logs']
  });

  const { data: metrics, isLoading: loadingMetrics } = useAdminQuery({
    table: 'system_metrics_enhanced',
    queryKey: ['admin', 'system_metrics']
  });

  const { data: execLogs, isLoading: loadingExecLogs } = useAdminQuery({
    table: 'agent_execution_log',
    queryKey: ['admin', 'execution_logs']
  });

  const { data: conversations, isLoading: loadingConversations } = useAdminQuery({
    table: 'unified_conversations',
    queryKey: ['admin', 'conversations']
  });

  const statsCards = [
    {
      title: "System Health",
      value: "99.8%",
      icon: CheckCircle,
      change: "+0.1%",
      changeType: "positive" as const
    },
    {
      title: "Edge Function Calls",
      value: logs?.data?.length || 0,
      icon: Activity,
      change: "+15%",
      changeType: "positive" as const
    },
    {
      title: "Error Rate",
      value: `${Math.round((logs?.data?.filter((l: any) => l.status === 'error').length || 0) / Math.max(logs?.data?.length || 1, 1) * 100)}%`,
      icon: AlertTriangle,
      change: "-5%",
      changeType: "positive" as const
    },
    {
      title: "Avg Response Time",
      value: `${Math.round(((logs?.data || []).reduce((sum: number, l: any) => sum + (l.execution_time_ms || 0), 0) / Math.max((logs?.data || []).length, 1))}ms`,
      icon: Clock,
      change: "-12ms",
      changeType: "positive" as const
    }
  ];

  const renderSimpleTable = (data: any[], title: string, isLoading: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
          </TableRow>
        ) : data?.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8">No {title.toLowerCase()} found</TableCell>
          </TableRow>
        ) : (
          data?.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm">{item.id.slice(0, 8)}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{item.function_name || item.metric_name || item.participant_phone || 'N/A'}</div>
                  {item.execution_time_ms && <div className="text-sm text-muted-foreground">{item.execution_time_ms}ms</div>}
                  {item.metric_value && <div className="text-sm text-muted-foreground">Value: {item.metric_value}</div>}
                  {item.channel && <div className="text-sm text-muted-foreground">Channel: {item.channel}</div>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={item.status === 'success' || item.status === 'active' || item.success_status ? 'default' : 'destructive'}>
                  {item.status || (item.success_status ? 'Success' : 'Failed')}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {new Date(item.timestamp || item.recorded_at || item.last_message_at || item.created_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Operations Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor system health, logs, and performance metrics
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}>
                  {stat.change}
                </span>
                {" "}from last hour
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Tables */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Edge Function Logs</TabsTrigger>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="execution">AI Execution Logs</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Edge Function Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(logs?.data || [], 'logs', loadingLogs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(metrics?.data || [], 'metrics', loadingMetrics)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Agent Execution Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(execLogs?.data || [], 'execution logs', loadingExecLogs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(conversations?.data || [], 'conversations', loadingConversations)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}