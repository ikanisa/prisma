import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Users, 
  Brain, 
  Wrench,
  MessageSquare,
  Settings,
  Activity,
  TrendingUp
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

interface Persona {
  id: string;
  agent_id: string;
  tone: string;
  language: string;
  personality: string;
  instructions: string;
}

interface Task {
  id: string;
  agent_id: string;
  name: string;
  trigger_type: string;
  trigger_value: string;
  tool_name: string;
  active: boolean;
}

interface Document {
  id: string;
  agent_id: string;
  title: string;
  drive_file_id?: string;
  storage_path?: string;
  embedding_ok: boolean;
}

export default function AgentOverview() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAgentData = async () => {
    if (!id) return;

    try {
      const [agentResult, personasResult, tasksResult, documentsResult] = await Promise.all([
        supabase.from('agents').select('*').eq('id', id).single(),
        supabase.from('agent_personas').select('*').eq('agent_id', id),
        supabase.from('agent_tasks').select('*').eq('agent_id', id),
        supabase.from('agent_documents').select('*').eq('agent_id', id)
      ]);

      if (agentResult.error && agentResult.error.code !== 'PGRST116') {
        throw agentResult.error;
      }

      setAgent(agentResult.data);
      setPersonas(personasResult.data || []);
      setTasks(tasksResult.data || []);
      setDocuments(documentsResult.data || []);
    } catch (error) {
      console.error('Error fetching agent data:', error);
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
    fetchAgentData();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Agent Not Found</h1>
          <Button asChild>
            <Link to="/admin/agents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Agents
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link to="/admin/agents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Agents
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{agent.name}</h1>
            <p className="text-muted-foreground">{agent.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={agent.status === 'active' ? "default" : "secondary"}>
            {agent.status}
          </Badge>
          <Button variant="outline" asChild>
            <Link to={`/admin/agents/${agent.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Personas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personas.length}</div>
            <div className="text-xs text-muted-foreground">
              {personas.filter(p => p.language === 'en').length} English
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
            <div className="text-xs text-muted-foreground">
              {tasks.filter(t => t.active).length} active
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <div className="text-xs text-muted-foreground">
              {documents.filter(d => d.embedding_ok).length} embedded
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98%</div>
            <div className="text-xs text-muted-foreground">
              Success rate
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Agent Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Name</h4>
                  <p>{agent.name}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-muted-foreground">
                    {agent.description || 'No description provided'}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Status</h4>
                  <Badge variant={agent.status === 'active' ? "default" : "secondary"}>
                    {agent.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Created</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(agent.created_at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" asChild>
                  <Link to={`/admin/agents/${agent.id}/personas`}>
                    <Users className="mr-2 h-4 w-4" />
                    Manage Personas
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/admin/agents/${agent.id}/tasks`}>
                    <Wrench className="mr-2 h-4 w-4" />
                    Configure Tasks
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/admin/agents/${agent.id}/learning`}>
                    <Brain className="mr-2 h-4 w-4" />
                    Learning & Training
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/admin/agents/${agent.id}/analytics`}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Analytics
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="personas" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Agent Personas</h2>
            <Button asChild>
              <Link to={`/admin/agents/${agent.id}/personas/new`}>
                <Users className="mr-2 h-4 w-4" />
                Add Persona
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personas.map((persona) => (
              <Card key={persona.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{persona.tone}</CardTitle>
                  <CardDescription>
                    Language: {persona.language.toUpperCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {persona.personality?.substring(0, 100) || 'No personality defined'}...
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/agents/${agent.id}/personas/${persona.id}`}>
                      View Details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Agent Tasks</h2>
            <Button asChild>
              <Link to={`/admin/agents/${agent.id}/tasks/new`}>
                <Wrench className="mr-2 h-4 w-4" />
                Add Task
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{task.name}</CardTitle>
                  <CardDescription>
                    Trigger: {task.trigger_type} - {task.trigger_value}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Tool: {task.tool_name}
                      </p>
                      <Badge variant={task.active ? "default" : "secondary"} className="mt-2">
                        {task.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/agents/${agent.id}/tasks/${task.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Training Documents</h2>
            <Button asChild>
              <Link to={`/admin/agents/${agent.id}/documents/upload`}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Upload Document
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((document) => (
              <Card key={document.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{document.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant={document.embedding_ok ? "default" : "secondary"}>
                        {document.embedding_ok ? "Embedded" : "Processing"}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}