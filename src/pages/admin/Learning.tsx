import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
}

interface Learning {
  id: string;
  agent_id: string;
  source_type: string;
  source_detail: string;
  vectorize: boolean;
  created_at: string;
  agents?: Agent;
}

interface LearningFormData {
  agent_id: string;
  source_type: string;
  source_detail: string;
  vectorize: boolean;
}

const SOURCE_TYPES = [
  { value: "bucket", label: "Storage Bucket" },
  { value: "url", label: "URL" },
  { value: "supabase_table", label: "Supabase Table" }
];

export default function Learning() {
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLearning, setEditingLearning] = useState<Learning | null>(null);
  const [formData, setFormData] = useState<LearningFormData>({
    agent_id: "",
    source_type: "bucket",
    source_detail: "",
    vectorize: true
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    try {
      const [learningsResult, agentsResult] = await Promise.all([
        supabase
          .from("agent_learning")
          .select(`
            *,
            agents!inner (
              id,
              name
            )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("agents")
          .select("id, name")
          .order("name")
      ]);

      if (learningsResult.error) throw learningsResult.error;
      if (agentsResult.error) throw agentsResult.error;

      setLearnings(learningsResult.data || []);
      setAgents(agentsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch learning configurations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLearning) {
        const { error } = await supabase
          .from("agent_learning")
          .update(formData)
          .eq("id", editingLearning.id);
        if (error) throw error;
        toast({ title: "Success", description: "Learning config updated successfully" });
      } else {
        const { error } = await supabase
          .from("agent_learning")
          .insert([formData]);
        if (error) throw error;
        toast({ title: "Success", description: "Learning config created successfully" });
      }
      
      setDialogOpen(false);
      setEditingLearning(null);
      setFormData({
        agent_id: "",
        source_type: "bucket",
        source_detail: "",
        vectorize: true
      });
      fetchData();
    } catch (error) {
      console.error("Error saving learning config:", error);
      toast({
        title: "Error",
        description: "Failed to save learning configuration",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this learning configuration?")) return;
    
    try {
      const { error } = await supabase
        .from("agent_learning")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Learning config deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting learning config:", error);
      toast({
        title: "Error",
        description: "Failed to delete learning configuration",
        variant: "destructive"
      });
    }
  };

  const openDialog = (learning?: Learning) => {
    if (learning) {
      setEditingLearning(learning);
      setFormData({
        agent_id: learning.agent_id,
        source_type: learning.source_type || "bucket",
        source_detail: learning.source_detail || "",
        vectorize: learning.vectorize
      });
    } else {
      setEditingLearning(null);
      setFormData({
        agent_id: "",
        source_type: "bucket",
        source_detail: "",
        vectorize: true
      });
    }
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="p-6">Loading learning configurations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agent Learning</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Learning Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLearning ? "Edit Learning Source" : "Create Learning Source"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Agent</label>
                <select
                  value={formData.agent_id}
                  onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select an agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Source Type</label>
                <select
                  value={formData.source_type}
                  onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {SOURCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Source Detail</label>
                <Input
                  value={formData.source_detail}
                  onChange={(e) => setFormData({ ...formData, source_detail: e.target.value })}
                  placeholder={
                    formData.source_type === "bucket" ? "bucket-name" :
                    formData.source_type === "url" ? "https://example.com/data" :
                    "table_name"
                  }
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.vectorize}
                  onCheckedChange={(checked) => setFormData({ ...formData, vectorize: checked })}
                />
                <label className="text-sm font-medium">Enable Vectorization</label>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingLearning ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {learnings.map((learning) => (
          <Card key={learning.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                {learning.agents?.name} - {learning.source_type}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={learning.vectorize ? "default" : "secondary"}>
                  {learning.vectorize ? "Vectorized" : "No Vector"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDialog(learning)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(learning.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <span className="font-medium">Source:</span> {learning.source_detail}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Created: {new Date(learning.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {learnings.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No learning sources found. Configure data sources for agent training and context.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}