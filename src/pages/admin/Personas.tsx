import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
}

interface Persona {
  id: string;
  agent_id: string;
  language: string;
  tone: string;
  personality: string;
  instructions: string;
  updated_at: string;
  agents?: Agent;
}

interface PersonaFormData {
  agent_id: string;
  language: string;
  tone: string;
  personality: string;
  instructions: string;
}

export default function Personas() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [formData, setFormData] = useState<PersonaFormData>({
    agent_id: "",
    language: "en",
    tone: "",
    personality: "",
    instructions: ""
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
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const [personasResult, agentsResult, countResult] = await Promise.all([
        supabase
          .from("agent_personas")
          .select(`
            *,
            agents!inner (
              id,
              name
            )
          `)
          .order("updated_at", { ascending: false })
          .range(from, to),
        supabase
          .from("agents")
          .select("id, name")
          .order("name"),
        supabase
          .from("agent_personas")
          .select("*", { count: "exact", head: true })
      ]);

      if (personasResult.error) throw personasResult.error;
      if (agentsResult.error) throw agentsResult.error;
      if (countResult.error) throw countResult.error;

      setPersonas(personasResult.data || []);
      setAgents(agentsResult.data || []);
      setTotalCount(countResult.count || 0);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch personas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPersona) {
        const { error } = await supabase
          .from("agent_personas")
          .update(formData)
          .eq("id", editingPersona.id);
        if (error) throw error;
        toast({ title: "Success", description: "Persona updated successfully" });
      } else {
        const { error } = await supabase
          .from("agent_personas")
          .insert([formData]);
        if (error) throw error;
        toast({ title: "Success", description: "Persona created successfully" });
      }
      
      setDialogOpen(false);
      setEditingPersona(null);
      setFormData({ agent_id: "", language: "en", tone: "", personality: "", instructions: "" });
      setCurrentPage(1);
      fetchData();
    } catch (error) {
      console.error("Error saving persona:", error);
      toast({
        title: "Error",
        description: "Failed to save persona",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this persona?")) return;
    
    try {
      const { error } = await supabase
        .from("agent_personas")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Persona deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting persona:", error);
      toast({
        title: "Error",
        description: "Failed to delete persona",
        variant: "destructive"
      });
    }
  };

  const openDialog = (persona?: Persona) => {
    if (persona) {
      setEditingPersona(persona);
      setFormData({
        agent_id: persona.agent_id,
        language: persona.language || "en",
        tone: persona.tone || "",
        personality: persona.personality || "",
        instructions: persona.instructions || ""
      });
    } else {
      setEditingPersona(null);
      setFormData({ agent_id: "", language: "en", tone: "", personality: "", instructions: "" });
    }
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="p-6">Loading personas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agent Personas</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Persona
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPersona ? "Edit Persona" : "Create Persona"}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Language</label>
                  <Input
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    placeholder="e.g., en, es, fr"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tone</label>
                  <Input
                    value={formData.tone}
                    onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                    placeholder="e.g., friendly, professional"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Personality</label>
                <Input
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  placeholder="e.g., helpful, concise, empathetic"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Instructions</label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={4}
                  placeholder="Additional system prompt instructions..."
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingPersona ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {personas.map((persona) => (
          <Card key={persona.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                {persona.agents?.name} - {persona.language?.toUpperCase()}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDialog(persona)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(persona.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Tone:</span> {persona.tone || "Not set"}
                </div>
                <div>
                  <span className="font-medium">Personality:</span> {persona.personality || "Not set"}
                </div>
              </div>
              {persona.instructions && (
                <div className="mt-2">
                  <span className="font-medium text-sm">Instructions:</span>
                  <p className="text-sm text-muted-foreground mt-1">{persona.instructions}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Updated: {new Date(persona.updated_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {personas.length === 0 && !loading && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No personas found. Create personas to define agent behavior and personality.</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalCount > itemsPerPage && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} personas
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
    </div>
  );
}