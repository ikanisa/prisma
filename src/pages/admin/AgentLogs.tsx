import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RefreshCw, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AgentRun {
  id: string;
  agent_code: string;
  status: string;
  conversation_id: string;
  wa_message_id: string;
  request_payload: any;
  response_payload: any;
  error_message: string;
  created_at: string;
  updated_at: string;
}

interface ToolCall {
  id: string;
  run_id: string;
  tool_name: string;
  tool_args: any;
  tool_result: any;
  execution_time_ms: number;
  created_at: string;
}

export default function AgentLogs() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [runsResult, callsResult] = await Promise.all([
        supabase
          .from("agent_runs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("agent_tool_calls")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200)
      ]);

      if (runsResult.error) throw runsResult.error;
      if (callsResult.error) throw callsResult.error;

      setRuns(runsResult.data || []);
      setToolCalls(callsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch agent logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRuns = runs.filter((run) => {
    const matchesSearch = searchQuery === "" || 
      run.agent_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.wa_message_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.request_payload?.userPhone?.includes(searchQuery);
    
    const matchesStatus = selectedStatus === "" || run.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'tool_call': return 'secondary';
      case 'started': return 'outline';
      default: return 'secondary';
    }
  };

  const getRunDuration = (run: AgentRun) => {
    if (!run.updated_at) return '-';
    const start = new Date(run.created_at).getTime();
    const end = new Date(run.updated_at).getTime();
    return `${Math.round((end - start) / 1000)}s`;
  };

  const getToolCallsForRun = (runId: string) => {
    return toolCalls.filter(call => call.run_id === runId);
  };

  if (loading) {
    return <div className="p-6">Loading agent execution logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agent Execution Logs</h1>
          <p className="text-muted-foreground">Monitor agent runs and tool executions</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by agent, phone, or message ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Filter by Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">All statuses</option>
                <option value="started">Started</option>
                <option value="tool_call">Tool Call</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Agent Runs ({filteredRuns.length} runs)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>User Phone</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRuns.map((run) => {
                const runToolCalls = getToolCallsForRun(run.id);
                return (
                  <TableRow key={run.id}>
                    <TableCell>
                      {format(new Date(run.created_at), 'MMM dd, HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{run.agent_code}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(run.status)}>
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {run.request_payload?.userPhone || '-'}
                    </TableCell>
                    <TableCell>{getRunDuration(run)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {runToolCalls.length} calls
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRunId(selectedRunId === run.id ? null : run.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredRuns.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery || selectedStatus ? "No runs match your filters." : "No agent runs found."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tool Calls Details */}
      {selectedRunId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Tool Calls for Run {selectedRunId.slice(0, 8)}...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead>Execution Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getToolCallsForRun(selectedRunId).map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      {format(new Date(call.created_at), 'HH:mm:ss.SSS')}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{call.tool_name}</span>
                    </TableCell>
                    <TableCell>{call.execution_time_ms}ms</TableCell>
                    <TableCell>
                      <Badge variant={call.tool_result?.error ? 'destructive' : 'default'}>
                        {call.tool_result?.error ? 'Failed' : 'Success'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <details className="max-w-xs">
                        <summary className="cursor-pointer text-sm text-muted-foreground">
                          View result
                        </summary>
                        <pre className="mt-2 text-xs overflow-auto max-h-32 bg-muted p-2 rounded">
                          {JSON.stringify(call.tool_result, null, 2)}
                        </pre>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}