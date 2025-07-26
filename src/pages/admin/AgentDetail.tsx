/**
 * Agent Detail Page
 * Detailed view for individual agent configuration and run history
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Wrench as ToolIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AgentConfig {
  id: string;
  code: string;
  assistant_id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  temperature: number;
  tools_json: any;  // Changed from any[] to any to match Supabase Json type
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface AgentRun {
  id: string;
  agent_code: string;
  conversation_id?: string;
  wa_message_id?: string;
  openai_run_id?: string;
  status: string;
  request_payload?: any;
  response_payload?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface ToolCall {
  id: string;
  run_id: string;
  tool_name: string;
  tool_args: any;
  tool_result: any;
  execution_time_ms?: number;
  created_at: string;
}

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAgent = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('agent_configs')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setAgent(data);
    } catch (error) {
      console.error('Error fetching agent:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent configuration",
        variant: "destructive"
      });
    }
  };

  const fetchRuns = async () => {
    if (!agent) return;
    
    try {
      const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_code', agent.code)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setRuns(data || []);
    } catch (error) {
      console.error('Error fetching runs:', error);
    }
  };

  const fetchToolCalls = async (runId: string) => {
    try {
      const { data, error } = await supabase
        .from('agent_tool_calls')
        .select('*')
        .eq('run_id', runId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setToolCalls(data || []);
    } catch (error) {
      console.error('Error fetching tool calls:', error);
      setToolCalls([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAgent();
      setLoading(false);
    };
    
    loadData();
  }, [id]);

  useEffect(() => {
    if (agent) {
      fetchRuns();
    }
  }, [agent]);

  useEffect(() => {
    if (selectedRun) {
      fetchToolCalls(selectedRun.id);
    } else {
      setToolCalls([]);
    }
  }, [selectedRun]);

  const handleToggleAgent = async () => {
    if (!agent) return;
    
    try {
      const { error } = await supabase
        .from('agent_configs')
        .update({ 
          active: !agent.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', agent.id);
      
      if (error) throw error;
      
      setAgent({ ...agent, active: !agent.active });
      toast({
        title: "Success",
        description: `Agent ${!agent.active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling agent:', error);
      toast({
        title: "Error",
        description: "Failed to update agent status",
        variant: "destructive"
      });
    }
  };

  const handleRetryRun = async (run: AgentRun) => {
    if (!run.wa_message_id) {
      toast({
        title: "Error",
        description: "Cannot retry run without original message ID",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase.functions.invoke('agent-router', {
        body: {
          wa_message_id: run.wa_message_id,
          agent_code: run.agent_code
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Agent run retried successfully"
      });
      
      // Refresh runs after a short delay
      setTimeout(() => {
        fetchRuns();
      }, 2000);
    } catch (error) {
      console.error('Error retrying run:', error);
      toast({
        title: "Error",
        description: "Failed to retry agent run",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'tool_call':
        return <Badge className="bg-blue-100 text-blue-800"><Activity className="w-3 h-3 mr-1" />Tool Call</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Started</Badge>;
    }
  };

  const formatJsonPayload = (payload: any) => {
    if (!payload) return 'No data';
    return JSON.stringify(payload, null, 2);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Agent configuration not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/agents')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{agent.name}</h1>
            <p className="text-muted-foreground">{agent.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={agent.active ? "default" : "secondary"}>
            {agent.active ? "Active" : "Inactive"}
          </Badge>
          <Button variant="outline" onClick={handleToggleAgent}>
            {agent.active ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {agent.active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="outline" onClick={() => navigate(`/admin/agents/${agent.id}/edit`)}>
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Agent Code</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-2xl font-bold bg-muted px-2 py-1 rounded">
              {agent.code}
            </code>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agent.temperature}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tools Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(agent.tools_json) ? agent.tools_json.length : 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="runs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="runs">Recent Runs</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Agent Runs</CardTitle>
                <CardDescription>Recent execution history</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => (
                      <TableRow 
                        key={run.id}
                        className={selectedRun?.id === run.id ? "bg-muted" : "cursor-pointer hover:bg-muted/50"}
                        onClick={() => setSelectedRun(run)}
                      >
                        <TableCell>{getStatusBadge(run.status)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(run.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {run.status === 'failed' && run.wa_message_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetryRun(run);
                              }}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {selectedRun && (
              <Card>
                <CardHeader>
                  <CardTitle>Run Details</CardTitle>
                  <CardDescription>
                    Execution details for run {selectedRun.id.slice(0, 8)}...
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Status</h4>
                    {getStatusBadge(selectedRun.status)}
                  </div>
                  
                  {selectedRun.error_message && (
                    <div>
                      <h4 className="font-semibold mb-2">Error</h4>
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{selectedRun.error_message}</AlertDescription>
                      </Alert>
                    </div>
                  )}
                  
                  {selectedRun.request_payload && (
                    <div>
                      <h4 className="font-semibold mb-2">Request</h4>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
                        {formatJsonPayload(selectedRun.request_payload)}
                      </pre>
                    </div>
                  )}
                  
                  {selectedRun.response_payload && (
                    <div>
                      <h4 className="font-semibold mb-2">Response</h4>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
                        {formatJsonPayload(selectedRun.response_payload)}
                      </pre>
                    </div>
                  )}
                  
                  {toolCalls.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Tool Calls ({toolCalls.length})</h4>
                      <div className="space-y-2">
                        {toolCalls.map((call) => (
                          <div key={call.id} className="border rounded p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <ToolIcon className="h-3 w-3" />
                              <span className="font-mono text-sm">{call.tool_name}</span>
                              {call.execution_time_ms && (
                                <Badge variant="outline" className="text-xs">
                                  {call.execution_time_ms}ms
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Args: {JSON.stringify(call.tool_args)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Result: {JSON.stringify(call.tool_result).substring(0, 100)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
              <CardDescription>Current agent settings and prompt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Assistant ID</h4>
                <code className="bg-muted px-2 py-1 rounded text-sm">
                  {agent.assistant_id}
                </code>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">System Prompt</h4>
                <pre className="bg-muted p-4 rounded text-sm whitespace-pre-wrap overflow-auto max-h-64">
                  {agent.system_prompt || 'No system prompt configured'}
                </pre>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Temperature</h4>
                <div className="text-lg">{agent.temperature}</div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Last Updated</h4>
                <div className="text-sm text-muted-foreground">
                  {new Date(agent.updated_at).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Tools</CardTitle>
              <CardDescription>
                Tools that the agent can use during conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!Array.isArray(agent.tools_json) || agent.tools_json.length === 0 ? (
                <p className="text-muted-foreground">No tools configured</p>
              ) : (
                <div className="space-y-4">
                  {(Array.isArray(agent.tools_json) ? agent.tools_json : []).map((tool, index) => (
                    <div key={index} className="border rounded p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ToolIcon className="h-4 w-4" />
                        <h4 className="font-semibold">{tool.name}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {tool.description}
                      </p>
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">
                          View parameters
                        </summary>
                        <pre className="bg-muted p-2 rounded mt-2 overflow-auto">
                          {JSON.stringify(tool.parameters, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}