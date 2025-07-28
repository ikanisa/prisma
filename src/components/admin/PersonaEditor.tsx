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
  Languages
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

export function PersonaEditor({ agentId }: PersonaEditorProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [editing, setEditing] = useState(false);
  const [editMode, setEditMode] = useState<'form' | 'json' | 'markdown'>('form');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const fetchPersonas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_personas')
        .select('*')
        .eq('agent_id', agentId || 'default')
        .order('updated_at', { ascending: false });

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
      const { data, error } = await supabase
        .from('agent_personas')
        .insert({
          agent_id: agentId || 'default',
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Persona List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Agent Personas</span>
            <Button size="sm" onClick={createNewPersona} disabled={saving}>
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </CardTitle>
          <CardDescription>Manage AI agent personalities</CardDescription>
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

      {/* Persona Editor */}
      <div className="lg:col-span-2">
        {selectedPersona ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Persona Editor</span>
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
  );
}