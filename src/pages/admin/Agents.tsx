import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Power, PowerOff, ChevronLeft, ChevronRight, Bot, Code, MessageSquare, Settings, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
  status: string;
  description: string;
  created_at: string;
}

interface YAMLAgent {
  name: string;
  model: string;
  tone?: string;
  system: string;
  triggers?: any[];
  workflow?: any[];
  tools?: any[];
  ui_output?: any;
  schedule?: string;
  run_mode?: string;
}

interface AgentFormData {
  name: string;
  description: string;
  status: string;
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [yamlAgents, setYamlAgents] = useState<Record<string, YAMLAgent>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>({
    name: "",
    description: "",
    status: "active"
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [testing, setTesting] = useState(false);
  const itemsPerPage = 50;
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
    loadYAMLAgents();
  }, [currentPage]);

  const fetchAgents = async () => {
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const [dataResult, countResult] = await Promise.all([
        supabase
          .from("agents")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("agents")
          .select("*", { count: "exact", head: true })
      ]);

      if (dataResult.error) throw dataResult.error;
      if (countResult.error) throw countResult.error;

      setAgents(dataResult.data || []);
      setTotalCount(countResult.count || 0);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast({
        title: "Error",
        description: "Failed to fetch agents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadYAMLAgents = async () => {
    try {
      const response = await fetch(`https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/yaml-agent-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs`
        },
        body: JSON.stringify({ action: 'loadAgents' })
      });

      if (response.ok) {
        const data = await response.json();
        setYamlAgents(data.agents || {});
      } else {
        console.error('Failed to load YAML agents');
      }
    } catch (error) {
      console.error('Error loading YAML agents:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAgent) {
        const { error } = await supabase
          .from("agents")
          .update(formData)
          .eq("id", editingAgent.id);
        if (error) throw error;
        toast({ title: "Success", description: "Agent updated successfully" });
      } else {
        const { error } = await supabase
          .from("agents")
          .insert([formData]);
        if (error) throw error;
        toast({ title: "Success", description: "Agent created successfully" });
      }
      
      setDialogOpen(false);
      setEditingAgent(null);
      setFormData({ name: "", description: "", status: "active" });
      fetchAgents();
    } catch (error) {
      console.error("Error saving agent:", error);
      toast({
        title: "Error",
        description: "Failed to save agent",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    
    try {
      const { error } = await supabase
        .from("agents")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Agent deleted successfully" });
      fetchAgents();
    } catch (error) {
      console.error("Error deleting agent:", error);
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive"
      });
    }
  };

  const toggleStatus = async (agent: Agent) => {
    try {
      const newStatus = agent.status === "active" ? "paused" : "active";
      const { error } = await supabase
        .from("agents")
        .update({ status: newStatus })
        .eq("id", agent.id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Agent status updated" });
      fetchAgents();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const openDialog = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        name: agent.name,
        description: agent.description || "",
        status: agent.status
      });
    } else {
      setEditingAgent(null);
      setFormData({ name: "", description: "", status: "active" });
    }
    setCurrentPage(1);
    setDialogOpen(true);
  };

  const testAgent = async (agentName: string) => {
    if (!testMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a test message",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(`https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/yaml-agent-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs`
        },
        body: JSON.stringify({
          action: 'processMessage',
          agentName,
          message: testMessage,
          userId: 'test-user-id',
          whatsappNumber: '+250700000000'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTestResponse(data.response || 'No response received');
      } else {
        setTestResponse('Error: Failed to test agent');
      }
    } catch (error) {
      console.error('Error testing agent:', error);
      setTestResponse('Error: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-muted-foreground">YAML-based intelligent agents for WhatsApp</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAgent ? "Edit Agent" : "Create Agent"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingAgent ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="agents">Agent Overview</TabsTrigger>
          <TabsTrigger value="test">Test Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4">
            {agents.map((agent) => {
              const yamlConfig = yamlAgents[agent.name];
              return (
                <Card key={agent.id} className="relative">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                      <Bot className="w-6 h-6 text-primary" />
                      <div>
                        <CardTitle className="text-lg font-medium">{agent.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{agent.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={agent.status === "active" ? "default" : "secondary"}>
                        {agent.status}
                      </Badge>
                      {yamlConfig && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          YAML Configured
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(agent)}
                        title={`${agent.status === "active" ? "Pause" : "Activate"} agent`}
                      >
                        {agent.status === "active" ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(agent)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(agent.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {yamlConfig ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            <span className="font-medium">Configuration</span>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Model:</strong> {yamlConfig.model}</p>
                            <p><strong>Tone:</strong> {yamlConfig.tone || 'Default'}</p>
                            {yamlConfig.schedule && <p><strong>Schedule:</strong> {yamlConfig.schedule}</p>}
                            {yamlConfig.run_mode && <p><strong>Mode:</strong> {yamlConfig.run_mode}</p>}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Code className="w-4 h-4" />
                            <span className="font-medium">Capabilities</span>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Triggers:</strong> {yamlConfig.triggers?.length || 0}</p>
                            <p><strong>Workflows:</strong> {yamlConfig.workflow?.length || 0}</p>
                            <p><strong>Tools:</strong> {yamlConfig.tools?.length || 0}</p>
                            {yamlConfig.ui_output && <p><strong>UI:</strong> {yamlConfig.ui_output.type}</p>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            <span className="font-medium">System Prompt</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p className="line-clamp-3">{yamlConfig.system}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">No YAML configuration found for this agent</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-4">
                      Created: {new Date(agent.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {agents.length === 0 && !loading && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No agents found. The 9 YAML agents should be automatically loaded.</p>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {totalCount > itemsPerPage && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} agents
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Test Agent Responses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Agent</label>
                <select
                  value={selectedAgent?.name || ""}
                  onChange={(e) => {
                    const agent = agents.find(a => a.name === e.target.value);
                    setSelectedAgent(agent || null);
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Choose an agent to test</option>
                  {agents.filter(a => yamlAgents[a.name]).map((agent) => (
                    <option key={agent.id} value={agent.name}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Test Message</label>
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter a message to test the agent..."
                />
              </div>

              <Button 
                onClick={() => selectedAgent && testAgent(selectedAgent.name)}
                disabled={!selectedAgent || !testMessage.trim() || testing}
                className="w-full"
              >
                {testing ? "Testing..." : "Test Agent"}
              </Button>

              {testResponse && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agent Response</label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm">{testResponse}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}