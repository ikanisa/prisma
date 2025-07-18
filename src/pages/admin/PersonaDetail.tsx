import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Bot, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

interface Persona {
  id: string;
  agent_id: string;
  language: string;
  tone: string;
  personality: string;
  instructions: string;
  updated_at: string;
}

export default function PersonaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchPersona();
    }
  }, [id]);

  const fetchPersona = async () => {
    try {
      const { data: personaData, error: personaError } = await supabase
        .from("agent_personas")
        .select("*")
        .eq("id", id)
        .single();

      if (personaError) throw personaError;

      setPersona(personaData);

      // Fetch the associated agent
      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", personaData.agent_id)
        .single();

      if (agentError) throw agentError;
      setAgent(agentData);
    } catch (error) {
      console.error("Error fetching persona:", error);
      toast({
        title: "Error",
        description: "Failed to fetch persona details",
        variant: "destructive"
      });
      navigate("/admin/personas");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!persona) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("agent_personas")
        .update({
          language: persona.language,
          tone: persona.tone,
          personality: persona.personality,
          instructions: persona.instructions,
          updated_at: new Date().toISOString()
        })
        .eq("id", persona.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Persona updated successfully"
      });
    } catch (error) {
      console.error("Error saving persona:", error);
      toast({
        title: "Error",
        description: "Failed to save persona",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!persona || !confirm("Are you sure you want to delete this persona?")) return;

    try {
      const { error } = await supabase
        .from("agent_personas")
        .delete()
        .eq("id", persona.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Persona deleted successfully"
      });
      navigate("/admin/personas");
    } catch (error) {
      console.error("Error deleting persona:", error);
      toast({
        title: "Error",
        description: "Failed to delete persona",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin/personas")} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Personas
          </Button>
        </div>
        <div className="text-center">Loading persona...</div>
      </div>
    );
  }

  if (!persona || !agent) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin/personas")} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Personas
          </Button>
        </div>
        <div className="text-center">Persona not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate("/admin/personas")} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Personas
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Bot className="w-6 h-6 mr-2" />
              {agent.name} Persona
            </h1>
            <p className="text-muted-foreground">Configure personality and behavior</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Agent Info */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Agent Name</label>
                <p className="text-sm text-muted-foreground">{agent.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <div>
                  <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                    {agent.status}
                  </Badge>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Persona Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Persona Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="language" className="text-sm font-medium">Language</label>
                <Input
                  id="language"
                  value={persona.language}
                  onChange={(e) => setPersona({ ...persona, language: e.target.value })}
                  placeholder="e.g., en, fr, rw"
                />
              </div>
              <div>
                <label htmlFor="tone" className="text-sm font-medium">Tone</label>
                <Input
                  id="tone"
                  value={persona.tone}
                  onChange={(e) => setPersona({ ...persona, tone: e.target.value })}
                  placeholder="e.g., friendly, professional, casual"
                />
              </div>
            </div>

            <div>
              <label htmlFor="personality" className="text-sm font-medium">Personality</label>
              <Textarea
                id="personality"
                value={persona.personality}
                onChange={(e) => setPersona({ ...persona, personality: e.target.value })}
                placeholder="Describe the agent's personality traits..."
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="instructions" className="text-sm font-medium">Instructions</label>
              <Textarea
                id="instructions"
                value={typeof persona.instructions === 'string' ? persona.instructions : JSON.stringify(persona.instructions, null, 2)}
                onChange={(e) => setPersona({ ...persona, instructions: e.target.value })}
                placeholder="Detailed instructions for the agent's behavior..."
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Instructions can be in JSON format or plain text
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="font-medium">Created</label>
                <p className="text-muted-foreground">
                  {new Date(agent.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="font-medium">Last Updated</label>
                <p className="text-muted-foreground">
                  {new Date(persona.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}