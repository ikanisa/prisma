import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Edit, 
  Save,
  MessageSquare,
  User,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
}

interface Persona {
  id: string;
  agent_id: string;
  tone: string;
  language: string;
  personality: string;
  instructions: string;
  updated_at: string;
  // Enhanced fields for comprehensive agent configuration
  mission?: string;
  north_star_metric?: string;
  voice_behavior?: string;
  cultural_fit?: string;
  conversation_style?: string;
  responsibilities?: string[];
  domains?: AgentDomain[];
  operating_modes?: string[];
  escalation_rules?: EscalationRule[];
  kpis?: string[];
  tools_config?: ToolConfig[];
  intent_matrix?: IntentConfig[];
}

interface AgentDomain {
  name: string;
  description: string;
  sub_agents: SubAgent[];
  core_tasks: string[];
  key_tables: string[];
}

interface SubAgent {
  role: string;
  tasks: string[];
}

interface EscalationRule {
  condition: string;
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ToolConfig {
  name: string;
  type: string;
  description: string;
  parameters?: any;
}

interface IntentConfig {
  intent_id: string;
  goal: string;
  triggers: string[];
  required_slots: string[];
  optional_slots: string[];
  tools: string[];
  template?: string;
}

export default function PersonaDetail() {
  const { id, personaId } = useParams<{ id: string; personaId: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    tone: '',
    language: '',
    personality: '',
    instructions: ''
  });

  const fetchData = async () => {
    if (!id || !personaId) return;

    try {
      const [agentResult, personaResult] = await Promise.all([
        supabase.from('agents').select('*').eq('id', id).single(),
        supabase.from('agent_personas').select('*').eq('id', personaId).single()
      ]);

      if (agentResult.error && agentResult.error.code !== 'PGRST116') {
        throw agentResult.error;
      }
      if (personaResult.error) throw personaResult.error;

      setAgent(agentResult.data);
      setPersona(personaResult.data);
      setFormData({
        tone: personaResult.data.tone || '',
        language: personaResult.data.language || '',
        personality: personaResult.data.personality || '',
        instructions: personaResult.data.instructions || ''
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch persona data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!personaId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('agent_personas')
        .update({
          tone: formData.tone,
          language: formData.language,
          personality: formData.personality,
          instructions: formData.instructions,
          updated_at: new Date().toISOString()
        })
        .eq('id', personaId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Persona updated successfully"
      });

      setEditing(false);
      await fetchData();
    } catch (error) {
      console.error('Error saving persona:', error);
      toast({
        title: "Error",
        description: "Failed to save persona",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (persona) {
      setFormData({
        tone: persona.tone || '',
        language: persona.language || '',
        personality: persona.personality || '',
        instructions: persona.instructions || ''
      });
    }
    setEditing(false);
  };

  useEffect(() => {
    fetchData();
  }, [id, personaId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!agent || !persona) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Persona not found or agent not accessible
          </AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link to="/admin/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link to={`/admin/agents/${agent.id}/personas`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Personas
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{persona.tone} Persona</h1>
            <p className="text-muted-foreground">
              For {agent.name} • Language: {persona.language.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {persona.language.toUpperCase()}
          </Badge>
          {editing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Persona
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Persona Information</CardTitle>
                <CardDescription>
                  Basic settings for this persona
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tone">Tone</Label>
                  <Input
                    id="tone"
                    value={formData.tone}
                    onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                    disabled={!editing}
                    placeholder="e.g., friendly, professional, casual"
                  />
                </div>
                
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    disabled={!editing}
                    placeholder="e.g., en, fr, rw"
                  />
                </div>
                
                <div>
                  <Label htmlFor="personality">Personality</Label>
                  <Textarea
                    id="personality"
                    value={formData.personality}
                    onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                    disabled={!editing}
                    placeholder="Describe the personality traits for this persona..."
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Persona Stats</CardTitle>
                <CardDescription>
                  Performance and usage statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-sm text-muted-foreground">Conversations</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">0%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">0s</div>
                    <div className="text-sm text-muted-foreground">Avg Response</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-sm text-muted-foreground">User Rating</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Last Updated</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(persona.updated_at).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="instructions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Instructions</CardTitle>
              <CardDescription>
                Specific instructions for how this persona should behave
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                disabled={!editing}
                placeholder="Provide detailed instructions for this persona's behavior, conversation style, and responses..."
                rows={12}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Persona Preview</CardTitle>
              <CardDescription>
                How this persona will appear in conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-semibold mb-2">Persona Summary</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Tone:</strong> {formData.tone || 'Not specified'}</div>
                  <div><strong>Language:</strong> {formData.language?.toUpperCase() || 'Not specified'}</div>
                  <div><strong>Personality:</strong> {formData.personality || 'Not specified'}</div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Sample Conversation</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="h-6 w-6 mt-1 text-muted-foreground" />
                    <div className="bg-muted p-3 rounded-lg flex-1">
                      <p className="text-sm">Hello, I need help with my order.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-6 w-6 mt-1 text-primary" />
                    <div className="bg-primary/10 p-3 rounded-lg flex-1">
                      <p className="text-sm">
                        {formData.tone === 'friendly' 
                          ? "Hi there! I'd be happy to help you with your order. Could you please share your order number or tell me what specific issue you're experiencing?"
                          : formData.tone === 'professional'
                          ? "Good day. I can assist you with your order inquiry. Please provide your order number and describe the issue you're facing."
                          : "Hello! I'm here to help with your order. What seems to be the problem?"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}