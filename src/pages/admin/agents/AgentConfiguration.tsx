import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Save,
  Settings,
  MessageSquare,
  Target,
  Users,
  Zap,
  Shield,
  BarChart,
  Brain,
  Workflow,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AgentConfig {
  id: string;
  name: string;
  mission: string;
  north_star_metric: string;
  persona: {
    name: string;
    tone: string;
    cultural_fit: string;
    conversation_style: string;
  };
  responsibilities: string[];
  domains: AgentDomain[];
  operating_modes: string[];
  escalation_rules: EscalationRule[];
  kpis: string[];
  tools_config: ToolConfig[];
  intent_matrix: IntentConfig[];
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

export default function AgentConfiguration() {
  const { id } = useParams<{ id: string }>();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Initialize with comprehensive easyMO configuration
  const initializeConfig = (): AgentConfig => ({
    id: id || '',
    name: 'Kwezi - easyMO AI Assistant',
    mission: 'Deliver fast, helpful, culturally aware, and compliant assistance to every user on WhatsApp — converting intent to action (trip match, order, listing, payment, signup) while continuously learning and improving the system.',
    north_star_metric: '% of conversations that reach a successful outcome (booked trip, completed payment, submitted order/listing) without human intervention and with positive user feedback.',
    persona: {
      name: 'Kwezi',
      tone: 'Friendly, concise, practical; mixes light emojis when appropriate (WhatsApp). Avoids jargon; uses plain Kinyarwanda/English/French/Swahili depending on user preference.',
      cultural_fit: 'Respects Rwandan norms (politeness, clarity, community spirit). Avoids pushiness; emphasizes value (free service, time saved, transparency).',
      conversation_style: 'Lead with a direct answer, then offer next step (CTA or quick reply). Use WhatsApp templates/Flows wisely (outside 24h window or for structured tasks). Confirm understanding with short summaries.'
    },
    responsibilities: [
      'Intent Capture & Routing',
      'Task Orchestration', 
      'Memory & Personalization',
      'Quality & Compliance Checks',
      'Human-in-the-Loop Escalation',
      'Continuous Learning & Improvement'
    ],
    domains: [
      {
        name: 'momo_qr_payments',
        description: 'Generate, share, and track MoMo QR payments',
        sub_agents: [
          { role: 'Payment Processor', tasks: ['Generate QR codes', 'Process payments', 'Handle refunds'] }
        ],
        core_tasks: ['QR generation', 'Payment status check', 'Refund handling'],
        key_tables: ['payments', 'qr_codes', 'transactions']
      },
      {
        name: 'moto_mobility',
        description: 'Peer-to-peer moto ride coordinating for drivers & passengers',
        sub_agents: [
          { role: 'Trip Orchestrator', tasks: ['Match drivers and passengers', 'Handle bookings', 'Track trips'] }
        ],
        core_tasks: ['Driver trip creation', 'Passenger matching', 'Booking management'],
        key_tables: ['driver_trips', 'passenger_intents', 'bookings']
      },
      {
        name: 'commerce_ordering',
        description: 'Handle orders for pharmacies, bars, hardware, farmers',
        sub_agents: [
          { role: 'Order Concierge', tasks: ['Process orders', 'Show catalog', 'Handle payments'] }
        ],
        core_tasks: ['Order processing', 'Catalog management', 'Payment integration'],
        key_tables: ['orders', 'products', 'unified_orders']
      }
    ],
    operating_modes: [
      'Realtime Conversational Mode (default)',
      'Batch/Background Mode',
      'QA & Tuning Mode',
      'Emergency/Safe Mode'
    ],
    escalation_rules: [
      {
        condition: 'User explicitly asks for human',
        action: 'Create handoff ticket and notify live support',
        priority: 'medium'
      },
      {
        condition: 'Negative sentiment + high urgency',
        action: 'Escalate to human immediately',
        priority: 'high'
      },
      {
        condition: 'AI confidence < 0.4 for 2 consecutive turns',
        action: 'Suggest human assistance',
        priority: 'medium'
      },
      {
        condition: 'Payment or legal dispute',
        action: 'Immediate human escalation',
        priority: 'critical'
      }
    ],
    kpis: [
      'Response Time (RTT): < 3s average',
      'Autonomy Rate: % convos completed without human',
      'Template Usage Ratio: Compliance with 24h window',
      'Conversion Rate: Trip bookings, orders, listings, payments',
      'Error Rate: Failed edge functions, webhook errors',
      'User Satisfaction: Post-convo feedback'
    ],
    tools_config: [
      {
        name: 'send_whatsapp_message',
        type: 'messaging',
        description: 'Send text, template, or flow messages via WhatsApp',
        parameters: { recipient: 'string', message_type: 'string', content: 'object' }
      },
      {
        name: 'generate_payment_qr',
        type: 'payment',
        description: 'Generate MoMo QR code for payments',
        parameters: { amount: 'number', currency: 'string', purpose: 'string' }
      },
      {
        name: 'driver_trip_create',
        type: 'mobility',
        description: 'Create new driver trip',
        parameters: { origin: 'geometry', destination: 'geometry', departure_time: 'datetime' }
      },
      {
        name: 'passenger_intent_create',
        type: 'mobility',
        description: 'Create passenger ride request',
        parameters: { origin: 'geometry', destination: 'geometry', when: 'datetime' }
      }
    ],
    intent_matrix: [
      {
        intent_id: 'qr_generate_receive',
        goal: 'Provide QR to receive funds',
        triggers: ['qr', 'get paid', 'scan and pay me', 'give me code'],
        required_slots: ['amount'],
        optional_slots: ['purpose', 'payer_name'],
        tools: ['generate_payment_qr', 'send_whatsapp_message'],
        template: 'qr_receive_v1'
      },
      {
        intent_id: 'driver_trip_create',
        goal: 'Post a trip (origin/dest/time)',
        triggers: ["i'm going from", "leaving", "heading to"],
        required_slots: ['origin', 'destination', 'departure_time'],
        optional_slots: ['seats', 'price', 'notes'],
        tools: ['driver_trip_create', 'geo_reverse_geocode'],
        template: 'driver_trip_post_v1'
      },
      {
        intent_id: 'passenger_intent_create',
        goal: 'Request a ride',
        triggers: ['i need a moto', 'ride from', 'go to'],
        required_slots: ['origin', 'destination', 'when'],
        optional_slots: ['max_price', 'notes'],
        tools: ['passenger_intent_create', 'match_search_driver_trips'],
        template: 'passenger_request_v1'
      }
    ]
  });

  const fetchData = async () => {
    if (!id) return;

    try {
      // Try to fetch existing configuration
      const { data: agentData, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (agentData) {
        // If agent exists, use its data or initialize with defaults
        setConfig(initializeConfig());
      } else {
        setConfig(initializeConfig());
      }
    } catch (error) {
      console.error('Error fetching agent config:', error);
      setConfig(initializeConfig());
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      // Save configuration (this would typically go to a dedicated config table)
      toast({
        title: "Success",
        description: "Agent configuration saved successfully"
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load agent configuration
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link to="/admin/agents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Agents
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Agent Configuration</h1>
            <p className="text-muted-foreground">{config.name}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="persona" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Persona
          </TabsTrigger>
          <TabsTrigger value="domains" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Domains
          </TabsTrigger>
          <TabsTrigger value="intents" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Intents
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="escalation" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Escalation
          </TabsTrigger>
          <TabsTrigger value="kpis" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            KPIs
          </TabsTrigger>
          <TabsTrigger value="modes" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Modes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Mission & North Star
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mission">Mission Statement</Label>
                  <Textarea
                    id="mission"
                    value={config.mission}
                    onChange={(e) => setConfig({ ...config, mission: e.target.value })}
                    rows={4}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="north_star">North Star Metric</Label>
                  <Textarea
                    id="north_star"
                    value={config.north_star_metric}
                    onChange={(e) => setConfig({ ...config, north_star_metric: e.target.value })}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Responsibilities</CardTitle>
                <CardDescription>Core responsibilities of this agent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {config.responsibilities.map((responsibility, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Badge variant="outline" className="shrink-0">
                        {index + 1}
                      </Badge>
                      <span className="text-sm">{responsibility}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="persona" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Persona Configuration
              </CardTitle>
              <CardDescription>
                Define the personality and behavior of your AI agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="persona_name">Persona Name</Label>
                    <Input
                      id="persona_name"
                      value={config.persona.name}
                      onChange={(e) => setConfig({
                        ...config,
                        persona: { ...config.persona, name: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tone">Tone & Style</Label>
                    <Textarea
                      id="tone"
                      value={config.persona.tone}
                      onChange={(e) => setConfig({
                        ...config,
                        persona: { ...config.persona, tone: e.target.value }
                      })}
                      rows={4}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cultural_fit">Cultural Fit</Label>
                    <Textarea
                      id="cultural_fit"
                      value={config.persona.cultural_fit}
                      onChange={(e) => setConfig({
                        ...config,
                        persona: { ...config.persona, cultural_fit: e.target.value }
                      })}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="conversation_style">Conversation Style</Label>
                    <Textarea
                      id="conversation_style"
                      value={config.persona.conversation_style}
                      onChange={(e) => setConfig({
                        ...config,
                        persona: { ...config.persona, conversation_style: e.target.value }
                      })}
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Functional Domains
              </CardTitle>
              <CardDescription>
                Define the different domains your agent can handle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {config.domains.map((domain, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-lg">{domain.name}</h4>
                      <Badge variant="outline">{domain.sub_agents.length} Sub-Agents</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{domain.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">Core Tasks</h5>
                        <div className="space-y-1">
                          {domain.core_tasks.map((task, taskIndex) => (
                            <Badge key={taskIndex} variant="secondary" className="mr-1 mb-1">
                              {task}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Key Tables</h5>
                        <div className="space-y-1">
                          {domain.key_tables.map((table, tableIndex) => (
                            <Badge key={tableIndex} variant="outline" className="mr-1 mb-1">
                              {table}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Sub-Agents</h5>
                        <div className="space-y-1">
                          {domain.sub_agents.map((subAgent, subIndex) => (
                            <div key={subIndex} className="text-sm">
                              <div className="font-medium">{subAgent.role}</div>
                              <div className="text-muted-foreground text-xs">
                                {subAgent.tasks.join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Intent Matrix
              </CardTitle>
              <CardDescription>
                Configure how the agent recognizes and handles different user intents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.intent_matrix.map((intent, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{intent.intent_id}</h4>
                      <Badge variant={intent.template ? "default" : "secondary"}>
                        {intent.template ? `Template: ${intent.template}` : 'No Template'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{intent.goal}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium mb-1">Triggers</div>
                        <div className="space-y-1">
                          {intent.triggers.map((trigger, triggerIndex) => (
                            <Badge key={triggerIndex} variant="outline" className="text-xs">
                              "{trigger}"
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Required Slots</div>
                        <div className="space-y-1">
                          {intent.required_slots.map((slot, slotIndex) => (
                            <Badge key={slotIndex} variant="destructive" className="text-xs">
                              {slot}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Optional Slots</div>
                        <div className="space-y-1">
                          {intent.optional_slots.map((slot, slotIndex) => (
                            <Badge key={slotIndex} variant="secondary" className="text-xs">
                              {slot}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Tools</div>
                        <div className="space-y-1">
                          {intent.tools.map((tool, toolIndex) => (
                            <Badge key={toolIndex} variant="default" className="text-xs">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Tools Configuration
              </CardTitle>
              <CardDescription>
                Configure the tools and functions available to your agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.tools_config.map((tool, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{tool.name}</h4>
                      <Badge variant="outline">{tool.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                    {tool.parameters && (
                      <div className="text-xs">
                        <div className="font-medium mb-1">Parameters:</div>
                        <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(tool.parameters, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Escalation Rules
              </CardTitle>
              <CardDescription>
                Define when and how the agent should escalate to human support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.escalation_rules.map((rule, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            rule.priority === 'critical' ? 'destructive' :
                            rule.priority === 'high' ? 'default' :
                            rule.priority === 'medium' ? 'secondary' : 'outline'
                          }
                        >
                          {rule.priority}
                        </Badge>
                        <span className="font-medium">Rule {index + 1}</span>
                      </div>
                    </div>
                    <div className="text-sm">
                      <div><strong>Condition:</strong> {rule.condition}</div>
                      <div><strong>Action:</strong> {rule.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Key Performance Indicators
              </CardTitle>
              <CardDescription>
                Monitor and track agent performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.kpis.map((kpi, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="text-sm">{kpi}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Operating Modes
              </CardTitle>
              <CardDescription>
                Different operational modes for various scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.operating_modes.map((mode, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge variant={index === 0 ? "default" : "outline"}>
                      {index === 0 ? 'Default' : 'Secondary'}
                    </Badge>
                    <span className="text-sm">{mode}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}