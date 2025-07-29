import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Settings, Zap, Activity, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AgentSkill {
  agent_id: string;
  skill: string;
  enabled: boolean;
  updated_at: string;
  config?: any;
}

interface SkillTemplate {
  name: string;
  description: string;
  category: string;
  required_tools: string[];
  default_config: any;
}

const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    name: "PaymentSkill",
    description: "Handle MoMo payments, QR generation, and transaction management",
    category: "Financial",
    required_tools: ["createMoMoPaymentLink", "generateQRCodeSVG"],
    default_config: { max_amount: 1000000, currency: "RWF" }
  },
  {
    name: "TransportSkill", 
    description: "Book rides, track drivers, manage transport logistics",
    category: "Mobility",
    required_tools: ["bookRide", "trackRide"],
    default_config: { max_distance_km: 50, default_vehicle_type: "moto" }
  },
  {
    name: "CommerceSkill",
    description: "Product search, order creation, inventory management",
    category: "E-Commerce",
    required_tools: ["searchProducts", "createOrder"],
    default_config: { max_cart_items: 20, delivery_radius_km: 25 }
  },
  {
    name: "MemorySkill",
    description: "Context retrieval, semantic lookup, conversation memory",
    category: "Intelligence",
    required_tools: ["semanticLookup", "saveMemory"],
    default_config: { max_context_length: 8000, similarity_threshold: 0.7 }
  },
  {
    name: "FeedbackSkill",
    description: "User feedback collection, quality monitoring, improvement tracking",
    category: "Quality",
    required_tools: ["logUserFeedback"],
    default_config: { auto_collect: true, rating_scale: 5 }
  },
  {
    name: "ConversationSkill",
    description: "Advanced conversational abilities, context awareness, multi-turn dialogue",
    category: "Communication",
    required_tools: [],
    default_config: { max_turns: 20, context_retention: true }
  }
];

export function SkillsMatrix() {
  const [agentSkills, setAgentSkills] = useState<AgentSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [configDialogSkill, setConfigDialogSkill] = useState<string | null>(null);
  const [skillConfig, setSkillConfig] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchAgentSkills();
  }, []);

  const fetchAgentSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_skills')
        .select('*')
        .order('skill');

      if (error) throw error;
      setAgentSkills(data || []);
    } catch (error) {
      console.error('Error fetching agent skills:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent skills",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = async (skillName: string, enabled: boolean) => {
    setUpdating(skillName);
    try {
      // Get first agent (in real app, should be current agent)
      const agentId = agentSkills[0]?.agent_id || '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase
        .from('agent_skills')
        .upsert({
          agent_id: agentId,
          skill: skillName,
          enabled: enabled,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await fetchAgentSkills();
      
      toast({
        title: "Success",
        description: `${skillName} ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling skill:', error);
      toast({
        title: "Error",
        description: "Failed to update skill",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const updateSkillConfig = async (skillName: string, config: any) => {
    try {
      const agentId = agentSkills[0]?.agent_id || '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase
        .from('agent_skills')
        .upsert({
          agent_id: agentId,
          skill: skillName,
          enabled: true,
          config: config,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await fetchAgentSkills();
      setConfigDialogSkill(null);
      
      toast({
        title: "Success",
        description: `${skillName} configuration updated`,
      });
    } catch (error) {
      console.error('Error updating skill config:', error);
      toast({
        title: "Error",
        description: "Failed to update skill configuration",
        variant: "destructive"
      });
    }
  };

  const getSkillStatus = (skillName: string) => {
    const skill = agentSkills.find(s => s.skill === skillName);
    return skill?.enabled || false;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      Financial: 'hsl(var(--success))',
      Mobility: 'hsl(var(--primary))', 
      'E-Commerce': 'hsl(var(--warning))',
      Intelligence: 'hsl(var(--info))',
      Quality: 'hsl(var(--secondary))',
      Communication: 'hsl(var(--accent))'
    };
    return colors[category as keyof typeof colors] || 'hsl(var(--muted))';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const enabledSkills = SKILL_TEMPLATES.filter(template => 
    getSkillStatus(template.name)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Skills Matrix</h2>
          <p className="text-muted-foreground">
            Manage and configure AI agent capabilities
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="text-sm">
            {enabledSkills}/{SKILL_TEMPLATES.length} Skills Active
          </Badge>
          <Progress value={(enabledSkills / SKILL_TEMPLATES.length) * 100} className="w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SKILL_TEMPLATES.map((template) => {
          const isEnabled = getSkillStatus(template.name);
          const isUpdating = updating === template.name;
          
          return (
            <Card key={template.name} className={`transition-all ${
              isEnabled ? 'ring-2 ring-primary/20 bg-primary/5' : 'hover:shadow-md'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {isEnabled ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                      {template.name}
                    </CardTitle>
                    <Badge 
                      variant="outline" 
                      style={{ borderColor: getCategoryColor(template.category) }}
                      className="text-xs"
                    >
                      {template.category}
                    </Badge>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => toggleSkill(template.name, checked)}
                    disabled={isUpdating}
                  />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
                
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Required Tools
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {template.required_tools.map((tool) => (
                      <Badge key={tool} variant="secondary" className="text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>

                {isEnabled && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConfigDialogSkill(template.name);
                        setSkillConfig(template.default_config);
                      }}
                      className="w-full"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Dialog */}
      {configDialogSkill && (
        <Card className="fixed inset-4 z-50 max-w-2xl mx-auto my-auto bg-background border shadow-lg">
          <CardHeader>
            <CardTitle>Configure {configDialogSkill}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {Object.entries(skillConfig).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="text-sm font-medium">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                  {typeof value === 'boolean' ? (
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) =>
                        setSkillConfig(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  ) : typeof value === 'number' ? (
                    <Input
                      id={key}
                      type="number"
                      value={value}
                      onChange={(e) =>
                        setSkillConfig(prev => ({ ...prev, [key]: parseInt(e.target.value) }))
                      }
                    />
                  ) : (
                    <Input
                      id={key}
                      value={String(value)}
                      onChange={(e) =>
                        setSkillConfig(prev => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setConfigDialogSkill(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateSkillConfig(configDialogSkill, skillConfig)}
              >
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}