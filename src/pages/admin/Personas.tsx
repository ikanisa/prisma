import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PersonaWithAgent {
  id: string;
  agent_id: string;
  language: string;
  tone: string;
  personality: string;
  instructions: string;
  updated_at: string;
  agents: {
    name: string;
    status: string;
  };
}

export default function Personas() {
  const [personas, setPersonas] = useState<PersonaWithAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      const { data, error } = await supabase
        .from("agent_personas")
        .select(`
          *,
          agents!inner(name, status)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setPersonas(data || []);
    } catch (error) {
      console.error("Error fetching personas:", error);
      toast({
        title: "Error",
        description: "Failed to fetch personas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPersonas = personas.filter(persona =>
    persona.agents?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    persona.tone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    persona.personality?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePersonaClick = (personaId: string) => {
    navigate(`/admin/personas/${personaId}`);
  };

  if (loading) {
    return <div className="p-6">Loading agents...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Bot className="w-6 h-6 mr-2" />
            AI Personas
          </h1>
          <p className="text-muted-foreground">Configure personality, tone, and behavior for each AI agent</p>
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search personas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Loading personas...</div>
      ) : filteredPersonas.length === 0 ? (
        <div className="text-center py-8">
          <p>No personas found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPersonas.map((persona) => (
            <Card 
              key={persona.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handlePersonaClick(persona.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="font-bold">{persona.agents?.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={persona.agents?.status === 'active' ? 'default' : 'secondary'}>
                      {persona.agents?.status}
                    </Badge>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Tone:</span>
                    <span>{persona.tone}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Language:</span>
                    <span className="uppercase">{persona.language}</span>
                  </div>
                  {persona.personality && (
                    <div className="text-sm">
                      <span className="font-medium">Personality:</span>
                      <p className="text-muted-foreground mt-1 line-clamp-3">
                        {persona.personality.length > 120 
                          ? persona.personality.substring(0, 120) + "..." 
                          : persona.personality
                        }
                      </p>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground pt-2">
                    Updated: {new Date(persona.updated_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit'
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}