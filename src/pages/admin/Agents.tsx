/**
 * Agent Management Page
 * Admin interface for managing AI agent configurations
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings, 
  Plus, 
  Edit, 
  Play, 
  Pause, 
  BarChart3, 
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSecureInput } from '@/hooks/useSecureInput';

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
  status: string;
  created_at: string;
  error_message?: string;
}

export default function AgentManagement() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingAgent, setTestingAgent] = useState<AgentConfig | null>(null);
  const { toast } = useToast();
  
  // Form state for editing agents
  const nameInput = useSecureInput('', { maxLength: 100 });
  const descriptionInput = useSecureInput('', { maxLength: 500 });
  const systemPromptInput = useSecureInput('', { maxLength: 4000 });
  const assistantIdInput = useSecureInput('', { maxLength: 100 });
  const [temperature, setTemperature] = useState(0.3);
  const [toolsJson, setToolsJson] = useState('[]');
  const [active, setActive] = useState(true);
  
  // Test mode state
  const testMessageInput = useSecureInput('', { maxLength: 500 });
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_configs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent configurations",
        variant: "destructive"
      });
    }
  };

  const fetchRecentRuns = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_runs')
        .select('id, agent_code, status, created_at, error_message')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setRecentRuns(data || []);
    } catch (error) {
      console.error('Error fetching recent runs:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAgents(), fetchRecentRuns()]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  const handleEditAgent = (agent: AgentConfig) => {
    setEditingAgent(agent);
    nameInput.updateValue(agent.name);
    descriptionInput.updateValue(agent.description || '');
    systemPromptInput.updateValue(agent.system_prompt || '');
    assistantIdInput.updateValue(agent.assistant_id);
    setTemperature(agent.temperature);
    setToolsJson(JSON.stringify(agent.tools_json, null, 2));
    setActive(agent.active);
  };

  const handleSaveAgent = async () => {
    if (!editingAgent) return;
    
    if (!nameInput.isValid || !systemPromptInput.isValid) {
      toast({
        title: "Validation Error",
        description: "Please check your input for errors",
        variant: "destructive"
      });
      return;
    }
    
    try {
      let parsedTools;
      try {
        parsedTools = JSON.parse(toolsJson);
      } catch {
        throw new Error('Invalid JSON in tools configuration');
      }
      
      const { error } = await supabase
        .from('agent_configs')
        .update({
          name: nameInput.value,
          description: descriptionInput.value,
          system_prompt: systemPromptInput.value,
          assistant_id: assistantIdInput.value,
          temperature,
          tools_json: parsedTools,
          active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAgent.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Agent configuration updated successfully"
      });
      
      setEditingAgent(null);
      await fetchAgents();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save agent configuration",
        variant: "destructive"
      });
    }
  };

  const handleToggleAgent = async (agent: AgentConfig) => {
    try {
      const { error } = await supabase
        .from('agent_configs')
        .update({ 
          active: !agent.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', agent.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Agent ${!agent.active ? 'activated' : 'deactivated'} successfully`
      });
      
      await fetchAgents();
    } catch (error) {
      console.error('Error toggling agent:', error);
      toast({
        title: "Error",
        description: "Failed to update agent status",
        variant: "destructive"
      });
    }
  };

  const handleTestAgent = async () => {
    if (!testingAgent || !testMessageInput.value.trim()) return;
    
    setTestLoading(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('agent-router', {
        body: {
          agent_code: testingAgent.code,
          message: testMessageInput.value,
          phone: '+250700000000',
          test_mode: true
        }
      });
      
      if (error) throw error;
      
      setTestResult(data);
      toast({
        title: "Test Completed",
        description: "Agent test executed successfully"
      });
    } catch (error) {
      console.error('Error testing agent:', error);
      setTestResult({ error: error.message });
      toast({
        title: "Test Failed",
        description: error.message || "Agent test failed",
        variant: "destructive"
      });
    } finally {
      setTestLoading(false);
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

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agent Management</h1>
          <p className="text-muted-foreground">
            Configure and monitor OpenAI AI agents for WhatsApp conversations
          </p>
        </div>
        <Button onClick={() => setEditingAgent({ 
          id: '', 
          code: '', 
          assistant_id: '', 
          name: '', 
          temperature: 0.3, 
          tools_json: [], 
          active: true,
          created_at: '',
          updated_at: ''
        })}>
          <Plus className="mr-2 h-4 w-4" />
          Add Agent
        </Button>
      </div>

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="agents">Agent Configurations</TabsTrigger>
          <TabsTrigger value="runs">Recent Runs</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Agents</CardTitle>
              <CardDescription>
                Manage AI agent configurations and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Temperature</TableHead>
                    <TableHead>Tools</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {agent.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {agent.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={agent.active ? "default" : "secondary"}>
                          {agent.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{agent.temperature}</TableCell>
                      <TableCell>{Array.isArray(agent.tools_json) ? agent.tools_json.length : 0} tools</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAgent(agent)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTestingAgent(agent);
                              setTestDialogOpen(true);
                              testMessageInput.reset();
                              setTestResult(null);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAgent(agent)}
                          >
                            {agent.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Agent Runs</CardTitle>
              <CardDescription>
                Monitor recent agent executions and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {run.agent_code}
                        </code>
                      </TableCell>
                      <TableCell>{getStatusBadge(run.status)}</TableCell>
                      <TableCell>
                        {new Date(run.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {run.error_message && (
                          <span className="text-red-600 text-sm">
                            {run.error_message.substring(0, 50)}...
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Agent Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgent?.id ? 'Edit Agent' : 'Create Agent'}
            </DialogTitle>
            <DialogDescription>
              Configure the AI agent settings and behavior
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  value={nameInput.value}
                  onChange={(e) => nameInput.updateValue(e.target.value)}
                  placeholder="e.g., easyMO Main Agent"
                />
                {nameInput.error && (
                  <p className="text-sm text-red-600">{nameInput.error}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="code">Agent Code</Label>
                <Input
                  id="code"
                  value={editingAgent?.code || ''}
                  disabled={!!editingAgent?.id}
                  placeholder="e.g., easymo_main"
                />
              </div>
              
              <div>
                <Label htmlFor="assistant_id">OpenAI Assistant ID</Label>
                <Input
                  id="assistant_id"
                  value={assistantIdInput.value}
                  onChange={(e) => assistantIdInput.updateValue(e.target.value)}
                  placeholder="asst_..."
                />
              </div>
              
              <div>
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={active}
                  onCheckedChange={setActive}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={descriptionInput.value}
                  onChange={(e) => descriptionInput.updateValue(e.target.value)}
                  placeholder="Brief description of the agent's purpose"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="system_prompt">System Prompt</Label>
                <Textarea
                  id="system_prompt"
                  value={systemPromptInput.value}
                  onChange={(e) => systemPromptInput.updateValue(e.target.value)}
                  placeholder="System instructions for the agent..."
                  rows={8}
                />
                {systemPromptInput.error && (
                  <p className="text-sm text-red-600">{systemPromptInput.error}</p>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="tools_json">Tools Configuration (JSON)</Label>
            <Textarea
              id="tools_json"
              value={toolsJson}
              onChange={(e) => setToolsJson(e.target.value)}
              placeholder="[]"
              rows={10}
              className="font-mono text-sm"
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditingAgent(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAgent}>
              Save Agent
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Agent Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Agent: {testingAgent?.name}</DialogTitle>
            <DialogDescription>
              Send a test message to the agent and see the response
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="test_message">Test Message</Label>
              <Textarea
                id="test_message"
                value={testMessageInput.value}
                onChange={(e) => testMessageInput.updateValue(e.target.value)}
                placeholder="Enter a test message..."
                rows={3}
              />
            </div>
            
            {testResult && (
              <div>
                <Label>Response</Label>
                <div className="bg-muted p-4 rounded-lg">
                  {testResult.error ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{testResult.error}</AlertDescription>
                    </Alert>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Run ID: {testResult.runId}
                      </p>
                      <p className="whitespace-pre-wrap">{testResult.response}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={handleTestAgent}
              disabled={testLoading || !testMessageInput.value.trim()}
            >
              {testLoading ? 'Testing...' : 'Test Agent'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}