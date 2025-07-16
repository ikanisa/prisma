import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Activity, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EdgeLog {
  id: string;
  function_name: string;
  status: string;
  timestamp: string;
  execution_time: number;
  request_id: string;
  logs: string[];
}

const EDGE_FUNCTIONS = [
  'generate-payment',
  'import-contacts', 
  'assign-driver',
  'push-marketing'
];

export default function EdgeLogs() {
  const [logs, setLogs] = useState<EdgeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEdgeLogs();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadEdgeLogs, 5000); // 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadEdgeLogs = async () => {
    try {
      // Note: In a real implementation, you would fetch from Supabase Analytics
      // For now, we'll simulate log data
      const mockLogs: EdgeLog[] = [
        {
          id: '1',
          function_name: 'generate-payment',
          status: 'completed',
          timestamp: new Date().toISOString(),
          execution_time: 245,
          request_id: 'req_123',
          logs: ['Payment generation started', 'QR code created', 'Database updated']
        },
        {
          id: '2', 
          function_name: 'assign-driver',
          status: 'error',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          execution_time: 156,
          request_id: 'req_124',
          logs: ['Driver assignment started', 'Error: No drivers available']
        },
        {
          id: '3',
          function_name: 'import-contacts',
          status: 'completed',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          execution_time: 892,
          request_id: 'req_125',
          logs: ['Google Places API called', '25 contacts imported']
        }
      ];

      setLogs(mockLogs);
    } catch (error) {
      console.error('Error loading edge logs:', error);
      toast({
        title: "Error",
        description: "Failed to load edge function logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testEdgeFunction = async (functionName: string) => {
    try {
      toast({
        title: "Testing Function",
        description: `Invoking ${functionName}...`,
      });

      // Test with sample data based on function
      let testPayload = {};
      switch (functionName) {
        case 'generate-payment':
          testPayload = { user_id: 'test-user-id', amount: 1000 };
          break;
        case 'import-contacts':
          testPayload = { lat: -1.955, lng: 30.091, radius: 1000 };
          break;
        case 'assign-driver':
          testPayload = { order_id: 'test-order-id' };
          break;
        case 'push-marketing':
          testPayload = {};
          break;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: testPayload
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${functionName} executed successfully`,
      });

      loadEdgeLogs(); // Refresh logs
    } catch (error) {
      console.error('Error testing function:', error);
      toast({
        title: "Error",
        description: `Failed to test ${functionName}`,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'error':
        return 'destructive';
      case 'running':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edge Function Logs</h1>
        <div className="flex gap-2">
          <Button 
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh ({autoRefresh ? 'ON' : 'OFF'})
          </Button>
          <Button onClick={loadEdgeLogs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Function Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {EDGE_FUNCTIONS.map((functionName) => {
          const recentLogs = logs.filter(log => log.function_name === functionName);
          const lastRun = recentLogs[0];
          
          return (
            <Card key={functionName}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{functionName}</CardTitle>
                {lastRun && getStatusIcon(lastRun.status)}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lastRun ? (
                    <>
                      <Badge variant={getStatusBadgeVariant(lastRun.status)}>
                        {lastRun.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Last run: {new Date(lastRun.timestamp).toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Execution: {lastRun.execution_time}ms
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No recent executions</p>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => testEdgeFunction(functionName)}
                  >
                    Test Function
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Function Executions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading logs...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Function</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Execution Time</TableHead>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Logs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.function_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <Badge variant={getStatusBadgeVariant(log.status)}>
                          {log.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{log.execution_time}ms</TableCell>
                    <TableCell className="font-mono text-sm">{log.request_id}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {log.logs.map((logLine, index) => (
                          <p key={index} className="text-xs text-muted-foreground">
                            {logLine}
                          </p>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}