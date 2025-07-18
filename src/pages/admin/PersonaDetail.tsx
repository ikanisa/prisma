import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Bot, Save, User, FileText, Settings, BookOpen, Brain, Activity, MessageSquare, Upload, File, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Persona {
  id: string;
  agent_id: string;
  language: string;
  tone: string;
  personality: string;
  instructions: string;
  updated_at: string;
  agents?: {
    name: string;
    status: string;
    created_at: string;
  };
}

interface Task {
  id: string;
  name: string;
  trigger_type: string;
  trigger_value: string;
  tool_name: string;
  active: boolean;
  created_at: string;
}

interface Document {
  id: string;
  title: string;
  embedding_ok: boolean;
  created_at: string;
  storage_path: string;
}

interface Learning {
  id: string;
  source_type: string;
  source_detail: string;
  vectorize: boolean;
  created_at: string;
}

interface Log {
  id: string;
  event: string;
  success: boolean;
  created_at: string;
}

export default function PersonaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [learning, setLearning] = useState<Learning[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchPersonaData();
    }
  }, [id]);

  const fetchPersonaData = async () => {
    try {
      // Fetch persona with agent details
      const { data: personaData, error: personaError } = await supabase
        .from("agent_personas")
        .select(`
          *,
          agents!inner(name, status, created_at)
        `)
        .eq("id", id)
        .maybeSingle();

      if (personaError) throw personaError;
      
      if (!personaData) {
        throw new Error("Persona not found");
      }
      
      setPersona(personaData);

      if (personaData.agent_id) {
        // Fetch related data
        const [tasksRes, docsRes, learningRes, logsRes] = await Promise.all([
          supabase.from("agent_tasks").select("*").eq("agent_id", personaData.agent_id).order("created_at", { ascending: false }),
          supabase.from("agent_documents").select("*").eq("agent_id", personaData.agent_id),
          supabase.from("agent_learning").select("*").eq("agent_id", personaData.agent_id),
          supabase.from("agent_logs").select("*").eq("agent_id", personaData.agent_id).order("created_at", { ascending: false }).limit(200)
        ]);

        setTasks(tasksRes.data || []);
        setDocuments(docsRes.data || []);
        setLearning(learningRes.data || []);
        setLogs(logsRes.data || []);
      }
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !persona?.agent_id) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('agent_id', persona.agent_id);
      formData.append('title', file.name);

      const { data, error } = await supabase.functions.invoke('upload-persona-doc', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });

      // Refresh documents list
      if (persona.agent_id) {
        const { data: docsData } = await supabase
          .from("agent_documents")
          .select("*")
          .eq("agent_id", persona.agent_id);
        
        setDocuments(docsData || []);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, storagePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('persona-docs')
        .remove([storagePath]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('agent_documents')
        .delete()
        .eq('id', docId);

      if (dbError) throw dbError;

      // Update local state
      setDocuments(documents.filter(doc => doc.id !== docId));

      toast({
        title: "Success",
        description: "Document deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
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

  if (!persona) {
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate("/admin/personas")} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Personas
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Bot className="w-6 h-6 mr-2" />
              {persona.agents?.name} Persona
            </h1>
            <p className="text-muted-foreground">Configure personality and behavior</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="prompt" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            System Prompt
          </TabsTrigger>
          <TabsTrigger value="markdown" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Markdown
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Tasks & Tools
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Learning
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Test Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Agent Name</label>
                  <p className="text-sm text-muted-foreground">{persona.agents?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div>
                    <Badge variant={persona.agents?.status === 'active' ? 'default' : 'secondary'}>
                      {persona.agents?.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Updated</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(persona.updated_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={typeof persona.instructions === 'string' ? persona.instructions : JSON.stringify(persona.instructions, null, 2)}
                onChange={(e) => setPersona({ ...persona, instructions: e.target.value })}
                placeholder="System instructions for the agent..."
                rows={20}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Instructions can be in JSON format or plain text
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks & Tools</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground">No tasks configured</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="border rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{task.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {task.trigger_type}: {task.trigger_value}
                          </p>
                          <p className="text-sm text-muted-foreground">Tool: {task.tool_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(task.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={task.active ? 'default' : 'secondary'}>
                          {task.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="markdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Persona Details (Markdown View)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {persona.instructions ? (
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                    {typeof persona.instructions === 'string' 
                      ? persona.instructions 
                      : JSON.stringify(persona.instructions, null, 2)
                    }
                  </pre>
                ) : (
                  <p className="text-muted-foreground">No instructions available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Documents
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.txt,.doc,.docx,.md"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    size="sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-muted-foreground">No documents uploaded</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded p-3 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <File className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={doc.embedding_ok ? 'default' : 'secondary'}>
                          {doc.embedding_ok ? 'Vectorized' : 'Pending'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id, doc.storage_path)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Sources</CardTitle>
            </CardHeader>
            <CardContent>
              {learning.length === 0 ? (
                <p className="text-muted-foreground">No learning sources configured</p>
              ) : (
                <div className="space-y-2">
                  {learning.map((item) => (
                    <div key={item.id} className="border rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{item.source_type}</h4>
                          <p className="text-sm text-muted-foreground">{item.source_detail}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={item.vectorize ? 'default' : 'secondary'}>
                          {item.vectorize ? 'Vectorize' : 'Skip'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-muted-foreground">No logs available</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="border rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm">{log.event}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={log.success ? 'default' : 'destructive'}>
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Test chat functionality will be implemented in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}