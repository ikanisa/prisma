import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AgentConfiguration() {
  const [config, setConfig] = useState({
    name: "",
    description: "",
    max_tokens: 4000,
    temperature: 0.7,
    system_prompt: "",
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchAgentConfig();
  }, []);

  const fetchAgentConfig = async () => {
    try {
      const { data } = await supabase
        .from('agent_configs')
        .select('*')
        .eq('id', 'omni-agent')
        .single();
      
      if (data) {
        setConfig({
          name: data.name || "",
          description: data.description || "",
          max_tokens: 4000, // Not in schema, using default
          temperature: data.temperature || 0.7,
          system_prompt: data.system_prompt || "",
          is_active: data.active || true,
        });
      }
    } catch (error) {
      console.error('Error fetching agent config:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('agent_configs')
        .upsert({
          id: 'omni-agent',
          name: config.name,
          description: config.description,
          temperature: config.temperature,
          system_prompt: config.system_prompt,
          active: config.is_active,
          assistant_id: 'omni-agent',
          code: 'omni-agent',
        });

      if (error) throw error;

      toast({
        title: "Configuration saved",
        description: "Agent configuration has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/omni-agent')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Agent Configuration</h1>
            <p className="text-muted-foreground">Configure your omni-agent settings</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Configuration"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Basic Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="Enter agent name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_active">Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={config.is_active}
                  onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
                />
                <Label htmlFor="is_active">{config.is_active ? "Active" : "Inactive"}</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              placeholder="Describe the agent's purpose and capabilities"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input
                id="max_tokens"
                type="number"
                value={config.max_tokens}
                onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
                min="100"
                max="8000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                min="0"
                max="2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt</Label>
            <Textarea
              id="system_prompt"
              value={config.system_prompt}
              onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              placeholder="Enter the system prompt that defines the agent's behavior and personality"
              rows={10}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}