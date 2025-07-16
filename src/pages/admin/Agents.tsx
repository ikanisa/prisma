import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Power, PowerOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
  status: string;
  description: string;
  created_at: string;
}

interface AgentFormData {
  name: string;
  description: string;
  status: string;
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>({
    name: "",
    description: "",
    status: "active"
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAgents(data || []);
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
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="p-6">Loading agents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">AI Agents</h1>
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

      <div className="grid gap-4">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">{agent.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={agent.status === "active" ? "default" : "secondary"}>
                  {agent.status}
                </Badge>
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
              <p className="text-sm text-muted-foreground">{agent.description}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Created: {new Date(agent.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {agents.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No agents found. Create your first AI agent to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}