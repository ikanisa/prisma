import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Edit3, 
  Save, 
  Plus, 
  Trash2,
  FileText,
  Code,
  Languages,
  Brain,
  MessageSquare,
  CreditCard,
  Package,
  ShoppingCart,
  Truck,
  Building,
  Calendar,
  Megaphone,
  HelpCircle
} from 'lucide-react';

interface Persona {
  id: string;
  agent_id: string;
  personality: string;
  tone: string;
  instructions: string;
  language: string;
  updated_at: string;
}

interface PersonaEditorProps {
  agentId?: string;
}

// Unified Omni Agent Persona
const UNIFIED_OMNI_AGENT = {
  icon: Brain,
  color: "text-purple-500",
  data: {
    "agent_name": "easyMO_OmniAgent",
    "version": "v2.0",
    "role_summary": "A comprehensive AI super-agent that seamlessly handles all easyMO operations—onboarding, payments, listings, marketplace, logistics, business services, events, marketing, and support—through intelligent skill routing and context-aware responses in WhatsApp chat.",
    "core_objective": "Provide unified, intelligent assistance across all easyMO services while maintaining specialized expertise in each domain, ensuring smooth handoffs between skills and personalized user experiences.",
    "primary_channels": ["WhatsApp chat (text, quick‑replies, location, cards, QR, voice)"],
    "supported_locales": ["rw", "en", "fr"],
    
    "unified_skills": {
      "onboarding": {
        "purpose": "First-contact user acquisition and profile setup",
        "triggers": ["new_user", "registration", "first_message"],
        "tone": "friendly"
      },
      "payments": {
        "purpose": "Mobile money QR generation and payment processing", 
        "triggers": ["numeric_amount", "payment", "qr"],
        "tone": "concise"
      },
      "listings": {
        "purpose": "Farmer produce inventory management",
        "triggers": ["add", "list", "sell", "harvest"],
        "tone": "helpful"
      },
      "marketplace": {
        "purpose": "Product discovery and shopping experience",
        "triggers": ["buy", "shop", "browse", "search"],
        "tone": "neutral"
      },
      "logistics": {
        "purpose": "Driver dispatch and delivery coordination",
        "triggers": ["driver", "delivery", "pickup"],
        "tone": "direct"
      },
      "business": {
        "purpose": "Business catalog and order management",
        "triggers": ["business", "catalog", "order"],
        "tone": "salesy"
      },
      "events": {
        "purpose": "Event discovery and ticket booking",
        "triggers": ["events", "book", "ticket"],
        "tone": "enthusiastic"
      },
      "marketing": {
        "purpose": "Automated campaigns and user engagement",
        "triggers": ["cron_schedule", "segment_targeting"],
        "tone": "persuasive"
      },
      "support": {
        "purpose": "Issue resolution and escalation management",
        "triggers": ["help", "problem", "error", "negative_sentiment"],
        "tone": "empathetic"
      }
    },

    "behavioural_principles": [
      "🧠 *Intelligent Routing*: Analyze user intent to activate the most appropriate skill set while maintaining conversation context.",
      "🔄 *Seamless Handoffs*: Transition between skills without requiring user to restart or repeat information.",
      "📱 *Mobile-First*: Optimize all interactions for WhatsApp constraints and mobile data limitations.",
      "🌍 *Multi-Modal*: Handle text, voice, images, location, and structured data inputs seamlessly.",
      "⚡ *Performance*: Respond within 2 seconds for cached operations, 5 seconds for complex processing.",
      "🔐 *Security*: Maintain user privacy and data protection across all skill interactions.",
      "📊 *Analytics*: Track user journey across skills to optimize conversion and satisfaction.",
      "🎯 *Personalization*: Adapt responses based on user history, preferences, and behavior patterns."
    ],

    "data_contracts": {
      "reads": ["users", "drivers", "businesses", "products", "orders", "payments", "events", "conversations"],
      "writes": ["all_tables_with_appropriate_permissions"],
      "edge_functions": ["all_specialized_functions"],
      "vector_memory": ["unified_conversation_context", "skill_specific_embeddings"]
    },

    "interaction_patterns": {
      "skill_detection": "Use NLP intent classification to identify primary skill needed",
      "context_preservation": "Maintain conversation state across skill transitions",
      "fallback_strategy": "Route unclear requests to most appropriate skill based on user history",
      "escalation_path": "Support skill handles all complex issues requiring human intervention"
    },

    "metrics": {
      "unified_success_rate": "≥ 95%",
      "skill_routing_accuracy": "≥ 98%", 
      "avg_response_time_ms": "< 3000",
      "user_satisfaction_score": "≥ 4.7/5",
      "completion_rate_per_skill": "≥ 90%",
      "cross_skill_conversion": "≥ 25%"
    },

    "training_corpus": "Unified knowledge base spanning all business domains with cross-skill interaction patterns",
    
    "sample_unified_flow": [
      {"user": "Hi", "skill": "onboarding", "response": "Welcome to easyMO! 🎉"},
      {"user": "5000", "skill": "payments", "response": "QR generated for 5000 RWF"},
      {"user": "buy tomatoes", "skill": "marketplace", "response": "🍅 Here are fresh tomatoes near you"},
      {"user": "help delivery issue", "skill": "support", "response": "Let me check your delivery status"}
    ]
  }
};

export function PersonaEditor({ agentId = 'omni-agent' }: PersonaEditorProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [selectedOmniAgent, setSelectedOmniAgent] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editMode, setEditMode] = useState<'form' | 'json' | 'markdown'>('form');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'custom' | 'omni'>('omni');
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    personality: '',
    tone: '',
    instructions: '',
    language: 'en'
  });

  // JSON/Markdown editor state
  const [jsonData, setJsonData] = useState('');
  const [markdownData, setMarkdownData] = useState('');

  useEffect(() => {
    fetchPersonas();
    // Initialize with unified omni agent
    setSelectedOmniAgent('unified');
  }, [agentId]);

  useEffect(() => {
    if (selectedPersona) {
      setFormData({
        personality: selectedPersona.personality || '',
        tone: selectedPersona.tone || '',
        instructions: selectedPersona.instructions || '',
        language: selectedPersona.language || 'en'
      });
      
      // Set JSON data
      setJsonData(JSON.stringify({
        personality: selectedPersona.personality,
        tone: selectedPersona.tone,
        instructions: selectedPersona.instructions,
        language: selectedPersona.language
      }, null, 2));
      
      // Set Markdown data
      setMarkdownData(`# Agent Persona

## Personality
${selectedPersona.personality || 'Not specified'}

## Tone
${selectedPersona.tone || 'Not specified'}

## Instructions
${selectedPersona.instructions || 'Not specified'}

## Language
${selectedPersona.language || 'en'}
`);
    }
  }, [selectedPersona]);

  // Update JSON/Markdown when unified omni agent is selected
  useEffect(() => {
    if (selectedOmniAgent === 'unified') {
      const agentData = UNIFIED_OMNI_AGENT.data;
      
      setJsonData(JSON.stringify(agentData, null, 2));
      
      setMarkdownData(`# ${agentData.agent_name} — Unified Omni Agent Persona

## Role Summary
${agentData.role_summary}

## Core Objective
${agentData.core_objective}

## Primary Channels
${Array.isArray(agentData.primary_channels) ? agentData.primary_channels.join(', ') : agentData.primary_channels}

## Supported Locales
${Array.isArray(agentData.supported_locales) ? agentData.supported_locales.join(', ') : agentData.supported_locales}

## Unified Skills
${Object.entries(agentData.unified_skills).map(([skill, config]) => `### ${skill}
- **Purpose**: ${config.purpose}
- **Triggers**: ${Array.isArray(config.triggers) ? config.triggers.join(', ') : config.triggers}
- **Tone**: ${config.tone}`).join('\n\n')}

## Behavioural Principles
${Array.isArray(agentData.behavioural_principles) ? agentData.behavioural_principles.map(principle => `- ${principle}`).join('\n') : 'Not specified'}

## Data Contracts
- **Reads**: ${Array.isArray(agentData.data_contracts.reads) ? agentData.data_contracts.reads.join(', ') : agentData.data_contracts.reads}
- **Writes**: ${Array.isArray(agentData.data_contracts.writes) ? agentData.data_contracts.writes.join(', ') : agentData.data_contracts.writes}
- **Edge Functions**: ${Array.isArray(agentData.data_contracts.edge_functions) ? agentData.data_contracts.edge_functions.join(', ') : agentData.data_contracts.edge_functions}

## Interaction Patterns
${Object.entries(agentData.interaction_patterns).map(([pattern, description]) => `- **${pattern}**: ${description}`).join('\n')}

## Key Performance Metrics
${Object.entries(agentData.metrics).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}

## Sample Unified Flow
${agentData.sample_unified_flow.map((flow, index) => `${index + 1}. **User**: "${flow.user}" → **Skill**: ${flow.skill} → **Response**: "${flow.response}"`).join('\n')}
`);
    }
  }, [selectedOmniAgent]);

  const fetchPersonas = async () => {
    try {
      setLoading(true);
      
      // Handle special case for omni-agent (use null for agent_id)
      const finalAgentId = agentId === 'omni-agent' ? null : agentId;
      
      let query = supabase
        .from('agent_personas')
        .select('*')
        .order('updated_at', { ascending: false });
        
      // Apply filter based on agent type
      if (finalAgentId === null) {
        query = query.is('agent_id', null);
      } else {
        query = query.eq('agent_id', finalAgentId);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      
      setPersonas(data || []);
      if (data && data.length > 0 && !selectedPersona) {
        setSelectedPersona(data[0]);
      }
    } catch (error) {
      console.error('Error fetching personas:', error);
      toast({
        title: "Error",
        description: "Failed to fetch personas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewPersona = async () => {
    try {
      setSaving(true);
      
      // Handle special case for omni-agent (use null for agent_id)
      const finalAgentId = agentId === 'omni-agent' ? null : agentId;
      
      const { data, error } = await supabase
        .from('agent_personas')
        .insert({
          agent_id: finalAgentId,
          personality: 'Professional and helpful',
          tone: 'Friendly and knowledgeable',
          instructions: 'Assist users with their queries efficiently',
          language: 'en'
        })
        .select()
        .single();

      if (error) throw error;

      setPersonas([data, ...personas]);
      setSelectedPersona(data);
      setEditing(true);
      
      toast({
        title: "Success",
        description: "New persona created"
      });
    } catch (error) {
      console.error('Error creating persona:', error);
      toast({
        title: "Error",
        description: "Failed to create persona",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const savePersona = async () => {
    if (!selectedPersona) return;

    try {
      setSaving(true);
      
      let updateData = { ...formData };
      
      // If editing in JSON mode, parse JSON data
      if (editMode === 'json') {
        try {
          const parsedJson = JSON.parse(jsonData);
          updateData = {
            personality: parsedJson.personality || '',
            tone: parsedJson.tone || '',
            instructions: parsedJson.instructions || '',
            language: parsedJson.language || 'en'
          };
        } catch (e) {
          throw new Error('Invalid JSON format');
        }
      }
      
      // If editing in markdown mode, parse markdown to extract fields
      if (editMode === 'markdown') {
        const lines = markdownData.split('\n');
        let currentSection = '';
        let content = '';
        
        for (const line of lines) {
          if (line.startsWith('## Personality')) {
            currentSection = 'personality';
            content = '';
          } else if (line.startsWith('## Tone')) {
            if (currentSection === 'personality') updateData.personality = content.trim();
            currentSection = 'tone';
            content = '';
          } else if (line.startsWith('## Instructions')) {
            if (currentSection === 'tone') updateData.tone = content.trim();
            currentSection = 'instructions';
            content = '';
          } else if (line.startsWith('## Language')) {
            if (currentSection === 'instructions') updateData.instructions = content.trim();
            currentSection = 'language';
            content = '';
          } else if (!line.startsWith('#') && line.trim()) {
            content += line + '\n';
          }
        }
        
        // Handle last section
        if (currentSection === 'language' && content.trim()) {
          updateData.language = content.trim();
        }
      }

      const { data, error } = await supabase
        .from('agent_personas')
        .update(updateData)
        .eq('id', selectedPersona.id)
        .select()
        .single();

      if (error) throw error;

      // Update personas list
      setPersonas(personas.map(p => p.id === selectedPersona.id ? data : p));
      setSelectedPersona(data);
      setEditing(false);
      
      toast({
        title: "Success",
        description: "Persona updated successfully"
      });
    } catch (error) {
      console.error('Error saving persona:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save persona",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const deletePersona = async (personaId: string) => {
    try {
      const { error } = await supabase
        .from('agent_personas')
        .delete()
        .eq('id', personaId);

      if (error) throw error;

      const updatedPersonas = personas.filter(p => p.id !== personaId);
      setPersonas(updatedPersonas);
      
      if (selectedPersona?.id === personaId) {
        setSelectedPersona(updatedPersonas[0] || null);
      }
      
      toast({
        title: "Success",
        description: "Persona deleted"
      });
    } catch (error) {
      console.error('Error deleting persona:', error);
      toast({
        title: "Error",
        description: "Failed to delete persona",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading personas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center space-x-4">
        <Button
          variant={viewMode === 'omni' ? 'default' : 'outline'}
          onClick={() => setViewMode('omni')}
        >
          <Brain className="h-4 w-4 mr-2" />
          Omni Agent Personas
        </Button>
        <Button
          variant={viewMode === 'custom' ? 'default' : 'outline'}
          onClick={() => setViewMode('custom')}
        >
          <User className="h-4 w-4 mr-2" />
          Custom Personas
        </Button>
      </div>

      {viewMode === 'omni' ? (
        <div className="space-y-6">
          {/* Unified Omni Agent Card */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedOmniAgent === 'unified' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedOmniAgent('unified')}
          >
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className={`h-5 w-5 ${UNIFIED_OMNI_AGENT.color}`} />
                <span>{UNIFIED_OMNI_AGENT.data.agent_name}</span>
              </CardTitle>
              <CardDescription>
                {UNIFIED_OMNI_AGENT.data.role_summary.substring(0, 150)}...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="outline">v{UNIFIED_OMNI_AGENT.data.version}</Badge>
                <div className="text-sm text-muted-foreground">
                  <strong>Channels:</strong> {Array.isArray(UNIFIED_OMNI_AGENT.data.primary_channels) 
                    ? UNIFIED_OMNI_AGENT.data.primary_channels[0] 
                    : UNIFIED_OMNI_AGENT.data.primary_channels}
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Locales:</strong> {Array.isArray(UNIFIED_OMNI_AGENT.data.supported_locales) 
                    ? UNIFIED_OMNI_AGENT.data.supported_locales.join(', ') 
                    : UNIFIED_OMNI_AGENT.data.supported_locales}
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Skills:</strong> {Object.keys(UNIFIED_OMNI_AGENT.data.unified_skills).length} unified capabilities
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Unified Omni Agent Details */}
          {selectedOmniAgent === 'unified' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className={`h-5 w-5 ${UNIFIED_OMNI_AGENT.color}`} />
                  <span>{UNIFIED_OMNI_AGENT.data.agent_name} Details</span>
                </CardTitle>
                <CardDescription>
                  Comprehensive unified persona configuration and documentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="json" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="json">
                      <Code className="h-4 w-4 mr-2" />
                      JSON Configuration
                    </TabsTrigger>
                    <TabsTrigger value="markdown">
                      <FileText className="h-4 w-4 mr-2" />
                      Markdown Documentation
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="json" className="mt-4">
                    <div className="space-y-2">
                      <Label>JSON Configuration</Label>
                      <Textarea
                        value={jsonData}
                        readOnly
                        className="font-mono text-xs"
                        rows={25}
                        placeholder="JSON configuration will appear here..."
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="markdown" className="mt-4">
                    <div className="space-y-2">
                      <Label>Markdown Documentation</Label>
                      <Textarea
                        value={markdownData}
                        readOnly
                        className="font-mono text-xs"
                        rows={25}
                        placeholder="Markdown documentation will appear here..."
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Custom Personas List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Custom Personas</span>
                <Button size="sm" onClick={createNewPersona} disabled={saving}>
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </CardTitle>
              <CardDescription>Manage custom AI agent personalities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {personas.map((persona) => (
                <div
                  key={persona.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPersona?.id === persona.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedPersona(persona)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {persona.personality?.substring(0, 20) || 'Unnamed'}...
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Badge variant="outline" className="text-xs">
                        {persona.language}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePersona(persona.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {persona.tone?.substring(0, 30) || 'No tone specified'}...
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Custom Persona Editor */}
          <div className="lg:col-span-2">
            {selectedPersona ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Custom Persona Editor</span>
                    <div className="flex items-center space-x-2">
                      {editing ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={savePersona}
                            disabled={saving}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setEditing(true)}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <Tabs value={editMode} onValueChange={(value) => setEditMode(value as any)}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="form">
                          <User className="h-4 w-4 mr-2" />
                          Form
                        </TabsTrigger>
                        <TabsTrigger value="json">
                          <Code className="h-4 w-4 mr-2" />
                          JSON
                        </TabsTrigger>
                        <TabsTrigger value="markdown">
                          <FileText className="h-4 w-4 mr-2" />
                          Markdown
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="form" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="personality">Personality</Label>
                            <Textarea
                              id="personality"
                              value={formData.personality}
                              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                              placeholder="Describe the agent's personality..."
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="tone">Tone</Label>
                            <Textarea
                              id="tone"
                              value={formData.tone}
                              onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                              placeholder="Define the communication tone..."
                              rows={3}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="instructions">Instructions</Label>
                          <Textarea
                            id="instructions"
                            value={formData.instructions}
                            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                            placeholder="Detailed instructions for the agent..."
                            rows={4}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="language">Language</Label>
                          <Input
                            id="language"
                            value={formData.language}
                            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                            placeholder="Language code (e.g., en, rw, fr)"
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="json" className="mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="json-editor">JSON Configuration</Label>
                          <Textarea
                            id="json-editor"
                            value={jsonData}
                            onChange={(e) => setJsonData(e.target.value)}
                            className="font-mono text-sm"
                            rows={15}
                            placeholder="Edit persona configuration in JSON format..."
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="markdown" className="mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="markdown-editor">Markdown Documentation</Label>
                          <Textarea
                            id="markdown-editor"
                            value={markdownData}
                            onChange={(e) => setMarkdownData(e.target.value)}
                            className="font-mono text-sm"
                            rows={15}
                            placeholder="Edit persona in markdown format..."
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Personality</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedPersona.personality || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Tone</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedPersona.tone || 'Not specified'}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Instructions</Label>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {selectedPersona.instructions || 'No instructions provided'}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Languages className="h-4 w-4" />
                          <span className="text-sm">Language: {selectedPersona.language}</span>
                        </div>
                        <Badge variant="outline">
                          Updated: {new Date(selectedPersona.updated_at).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">
                      Select a persona to view and edit details
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}