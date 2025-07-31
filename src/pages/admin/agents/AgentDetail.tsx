import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings, Users, FileText, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

interface Persona {
  id: string;
  language: string;
  tone: string;
  personality: string;
  instructions: string;
}

interface Task {
  id: string;
  name: string;
  trigger_type: string;
  trigger_value: string;
  tool_name: string;
  active: boolean;
}

interface Document {
  id: string;
  title: string;
  storage_path: string;
  embedding_ok: boolean;
  created_at: string;
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchAgentData();
    }
  }, [id]);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      
      // Fetch agent details
      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", id)
        .single();

      if (agentError) throw agentError;
      setAgent(agentData);

      // Fetch personas
      const { data: personasData, error: personasError } = await supabase
        .from("agent_personas")
        .select("*")
        .eq("agent_id", id);

      if (personasError) throw personasError;
      setPersonas(personasData || []);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("agent_tasks")
        .select("*")
        .eq("agent_id", id);

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from("agent_documents")
        .select("*")
        .eq("agent_id", id);

      if (documentsError) throw documentsError;
      setDocuments(documentsData || []);

    } catch (error) {
      console.error("Error fetching agent data:", error);
      toast.error("Failed to load agent data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Agent Not Found</h2>
          <Button onClick={() => navigate("/admin/ai-agents-models")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/admin/ai-agents-models")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{agent.name}</h1>
            <p className="text-muted-foreground">{agent.description}</p>
          </div>
        </div>
        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
          {agent.status}
        </Badge>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personas">Personas ({personas.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Personas</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{personas.length}</div>
                <p className="text-xs text-muted-foreground">Active configurations</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.filter(t => t.active).length}</div>
                <p className="text-xs text-muted-foreground">Active tasks</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{documents.filter(d => d.embedding_ok).length}</div>
                <p className="text-xs text-muted-foreground">Ready documents</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Agent Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <p className="text-sm text-muted-foreground">{agent.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground">{agent.description || "No description provided"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <p className="text-sm text-muted-foreground">{agent.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Created</label>
                <p className="text-sm text-muted-foreground">
                  {new Date(agent.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personas" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Agent Personas</h3>
            <Button onClick={() => navigate(`/admin/agents/${id}/personas/new`)}>
              Create Persona
            </Button>
          </div>
          
          <div className="grid gap-4">
            {personas.map((persona) => (
              <Card key={persona.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/admin/agents/${id}/personas/${persona.id}`)}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">
                        {persona.language.toUpperCase()} Persona
                      </CardTitle>
                      <CardDescription>Tone: {persona.tone}</CardDescription>
                    </div>
                    <Badge variant="outline">{persona.language}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {persona.personality}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Agent Tasks</h3>
            <Button onClick={() => navigate(`/admin/agents/${id}/tasks/new`)}>
              Create Task
            </Button>
          </div>
          
          <div className="grid gap-4">
            {tasks.map((task) => (
              <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/admin/agents/${id}/tasks/${task.id}`)}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{task.name}</CardTitle>
                      <CardDescription>
                        Trigger: {task.trigger_type} - {task.trigger_value}
                      </CardDescription>
                    </div>
                    <Badge variant={task.active ? "default" : "secondary"}>
                      {task.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tool: {task.tool_name}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Agent Documents</h3>
            <Button onClick={() => navigate(`/admin/agents/${id}/documents/upload`)}>
              Upload Document
            </Button>
          </div>
          
          <div className="grid gap-4">
            {documents.map((document) => (
              <Card key={document.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{document.title}</CardTitle>
                      <CardDescription>
                        {new Date(document.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge variant={document.embedding_ok ? "default" : "secondary"}>
                      {document.embedding_ok ? "Ready" : "Processing"}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}