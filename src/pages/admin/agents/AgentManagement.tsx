import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Eye, 
  Settings, 
  Play, 
  Pause, 
  Users,
  Brain,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
}

interface AgentConfig {
  id: string;
  code: string;
  name: string;
  active: boolean;
  temperature: number;
  tools_json: any;
  created_at: string;
}

interface AgentRun {
  id: string;
  agent_code: string;
  status: string;
  created_at: string;
  error_message?: string;
}

export default function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>([]);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [agentsResult, configsResult, runsResult] = await Promise.all([
        supabase.from('agents').select('*').order('created_at', { ascending: false }),
        supabase.from('agent_configs').select('*').order('created_at', { ascending: false }),
        supabase.from('agent_runs').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      if (agentsResult.error) throw agentsResult.error;
      if (configsResult.error) throw configsResult.error;
      if (runsResult.error) throw runsResult.error;

      setAgents(agentsResult.data || []);
      setAgentConfigs(configsResult.data || []);
      setRecentRuns(runsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleConfig = async (config: AgentConfig) => {
    try {
      const { error } = await supabase
        .from('agent_configs')
        .update({ active: !config.active })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Agent ${!config.active ? 'activated' : 'deactivated'} successfully`
      });

      fetchData();
    } catch (error) {
      console.error('Error toggling agent:', error);
      toast({
        title: "Error",
        description: "Failed to update agent status",
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
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Started</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
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
            Manage AI agents, their configurations, personas, and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/admin/agents/new">
              <Plus className="mr-2 h-4 w-4" />
              New Agent
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Configs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agentConfigs.filter(c => c.active).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentRuns.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentRuns.length > 0 
                ? Math.round((recentRuns.filter(r => r.status === 'completed').length / recentRuns.length) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="configs">Configurations</TabsTrigger>
          <TabsTrigger value="runs">Recent Runs</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Agents</CardTitle>
              <CardDescription>
                Manage your AI agents and their personas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {agent.description || 'No description'}
                      </TableCell>
                      <TableCell>{getStatusBadge(agent.status)}</TableCell>
                      <TableCell>{new Date(agent.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/agents/${agent.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/agents/${agent.id}/personas`}>
                              <Users className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/agents/${agent.id}/learning`}>
                              <Brain className="h-4 w-4" />
                            </Link>
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

        <TabsContent value="configs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configurations</CardTitle>
              <CardDescription>
                Technical configurations for AI agents
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
                  {agentConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {config.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.active ? "default" : "secondary"}>
                          {config.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{config.temperature}</TableCell>
                      <TableCell>
                        {Array.isArray(config.tools_json) ? config.tools_json.length : 0} tools
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/agent-configs/${config.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleConfig(config)}
                          >
                            {config.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
    </div>
  );
}