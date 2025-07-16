import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, ArrowRight, Settings, User } from "lucide-react";
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

export default function Personas() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agentsResult, personasResult] = await Promise.all([
        supabase
          .from("agents")
          .select("id, name, description, status, created_at")
          .order("name"),
        supabase
          .from("agent_personas")
          .select("*")
      ]);

      if (agentsResult.error) throw agentsResult.error;
      if (personasResult.error) throw personasResult.error;

      setAgents(agentsResult.data || []);
      setPersonas(personasResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch agents and personas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPersonaForAgent = (agentId: string) => {
    return personas.find(p => p.agent_id === agentId);
  };

  const handleAgentClick = (agentId: string, agentName: string) => {
    // Navigate to individual persona page (we'll need to create this route)
    navigate(`/admin/personas/${agentId}`, { 
      state: { agentName } 
    });
  };

  if (loading) {
    return <div className="p-6">Loading agents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Agent Personas</h1>
          <p className="text-muted-foreground mt-2">
            Configure personality, tone, and behavior for each AI agent
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const persona = getPersonaForAgent(agent.id);
          const hasPersona = !!persona;
          
          return (
            <Card 
              key={agent.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer hover-scale"
              onClick={() => handleAgentClick(agent.id, agent.name)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg font-semibold">{agent.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={hasPersona ? "default" : "secondary"}>
                    {hasPersona ? "Configured" : "Needs Setup"}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {agent.description || "AI agent for WhatsApp interactions"}
                </p>
                
                {hasPersona ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Language:</span>
                      <span>{persona.language?.toUpperCase() || 'EN'}</span>
                    </div>
                    
                    {persona.tone && (
                      <div className="text-sm">
                        <span className="font-medium">Tone:</span> {persona.tone}
                      </div>
                    )}
                    
                    {persona.personality && (
                      <div className="text-sm">
                        <span className="font-medium">Personality:</span> {persona.personality}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(persona.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Settings className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to configure persona settings
                    </p>
                  </div>
                )}
                
                <div className="pt-2 border-t">
                  <Badge variant="outline" className="text-xs">
                    Status: {agent.status || 'Active'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {agents.length === 0 && !loading && (
        <Card>
          <CardContent className="p-6 text-center">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No AI agents found. The agents should be automatically created from the YAML configurations.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}