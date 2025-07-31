import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Save, ArrowLeft, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function PersonaConfiguration() {
  const [persona, setPersona] = useState({
    personality_traits: [] as string[],
    communication_style: "",
    knowledge_domains: [] as string[],
    response_patterns: "",
    cultural_context: "",
    ethical_guidelines: "",
  });
  const [newTrait, setNewTrait] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchPersonaConfig();
  }, []);

  const fetchPersonaConfig = async () => {
    try {
      const { data } = await supabase
        .from('agent_configs')
        .select('tools_json')
        .eq('id', 'omni-agent')
        .single();
      
      if (data?.tools_json && typeof data.tools_json === 'object' && data.tools_json !== null) {
        const toolsData = data.tools_json as any;
        if (toolsData.persona_config) {
          setPersona(toolsData.persona_config);
        }
      }
    } catch (error) {
      console.error('Error fetching persona config:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('agent_configs')
        .update({
          tools_json: { persona_config: persona },
        })
        .eq('id', 'omni-agent');

      if (error) throw error;

      toast({
        title: "Persona saved",
        description: "Agent persona has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving persona:', error);
      toast({
        title: "Error",
        description: "Failed to save persona. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTrait = () => {
    if (newTrait.trim() && !persona.personality_traits.includes(newTrait.trim())) {
      setPersona({
        ...persona,
        personality_traits: [...persona.personality_traits, newTrait.trim()]
      });
      setNewTrait("");
    }
  };

  const removeTrait = (trait: string) => {
    setPersona({
      ...persona,
      personality_traits: persona.personality_traits.filter(t => t !== trait)
    });
  };

  const addDomain = () => {
    if (newDomain.trim() && !persona.knowledge_domains.includes(newDomain.trim())) {
      setPersona({
        ...persona,
        knowledge_domains: [...persona.knowledge_domains, newDomain.trim()]
      });
      setNewDomain("");
    }
  };

  const removeDomain = (domain: string) => {
    setPersona({
      ...persona,
      knowledge_domains: persona.knowledge_domains.filter(d => d !== domain)
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/omni-agent')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Persona Configuration</h1>
            <p className="text-muted-foreground">Define your agent's personality and behavior</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Persona"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Personality Traits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={newTrait}
                onChange={(e) => setNewTrait(e.target.value)}
                placeholder="Add personality trait..."
                onKeyPress={(e) => e.key === 'Enter' && addTrait()}
              />
              <Button size="sm" onClick={addTrait}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {persona.personality_traits.map((trait, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {trait}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => removeTrait(trait)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Knowledge Domains</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="Add knowledge domain..."
                onKeyPress={(e) => e.key === 'Enter' && addDomain()}
              />
              <Button size="sm" onClick={addDomain}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {persona.knowledge_domains.map((domain, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  {domain}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => removeDomain(domain)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Communication Style</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={persona.communication_style}
            onChange={(e) => setPersona({ ...persona, communication_style: e.target.value })}
            placeholder="Describe how the agent should communicate (tone, style, formality level, etc.)"
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={persona.response_patterns}
            onChange={(e) => setPersona({ ...persona, response_patterns: e.target.value })}
            placeholder="Define typical response patterns and structures the agent should follow"
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cultural Context</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={persona.cultural_context}
              onChange={(e) => setPersona({ ...persona, cultural_context: e.target.value })}
              placeholder="Cultural considerations and local context awareness"
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ethical Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={persona.ethical_guidelines}
              onChange={(e) => setPersona({ ...persona, ethical_guidelines: e.target.value })}
              placeholder="Ethical principles and guidelines the agent should follow"
              rows={4}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}