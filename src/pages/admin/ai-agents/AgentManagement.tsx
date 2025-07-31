import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Upload, FileText, Database, Brain, Settings, Activity, Download, Eye, Trash2, Edit, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentEmbedding {
  id: string;
  title: string;
  file_url: string;
  openai_file_id: string;
  status: string;
  agent_scope: string;
  created_at: string;
  progress?: number;
}

interface LearningModule {
  id: string;
  agent_id: string;
  source_type: string;
  source_detail: string;
  vectorize: boolean;
  created_at: string;
  embedding_progress?: number;
}

interface ModelRegistry {
  id: string;
  name: string;
  provider: string;
  version: string;
  status: string;
  performance_score: number;
  last_updated: string;
}

export default function AgentManagement() {
  const [documents, setDocuments] = useState<DocumentEmbedding[]>([]);
  const [learningModules, setLearningModules] = useState<LearningModule[]>([]);
  const [modelRegistry, setModelRegistry] = useState<ModelRegistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [yamlFile, setYamlFile] = useState<File | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("yaml");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [docsResult, learningResult] = await Promise.all([
        supabase
          .from("centralized_documents")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("agent_learning")
          .select("*")
          .order("created_at", { ascending: false })
      ]);

      if (docsResult.error) throw docsResult.error;
      if (learningResult.error) throw learningResult.error;

      setDocuments(docsResult.data || []);
      setLearningModules(learningResult.data || []);
      
      // Mock model registry data
      setModelRegistry([
        {
          id: "1",
          name: "GPT-4o",
          provider: "OpenAI",
          version: "2024-11-20",
          status: "active",
          performance_score: 92.5,
          last_updated: new Date().toISOString()
        },
        {
          id: "2", 
          name: "GPT-4o-mini",
          provider: "OpenAI",
          version: "2024-07-18",
          status: "active",
          performance_score: 87.3,
          last_updated: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch agent management data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleYamlUpload = async () => {
    if (!yamlFile) {
      toast({
        title: "Error",
        description: "Please select a YAML file",
        variant: "destructive"
      });
      return;
    }

    try {
      const fileContent = await yamlFile.text();
      
      // Send to YAML processor
      const response = await fetch(`https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/yaml-agent-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs`
        },
        body: JSON.stringify({
          action: 'uploadYaml',
          fileName: yamlFile.name,
          content: fileContent
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "YAML agent definition uploaded successfully",
        });
        setUploadDialogOpen(false);
        setYamlFile(null);
        fetchData();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error("Error uploading YAML:", error);
      toast({
        title: "Error",
        description: "Failed to upload YAML agent definition",
        variant: "destructive"
      });
    }
  };

  const triggerEmbedding = async (documentId: string) => {
    try {
      const response = await fetch(`https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/vectorize-docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs`
        },
        body: JSON.stringify({
          document_id: documentId
        })
      });

      if (response.ok) {
        toast({
          title: "Success", 
          description: "Document embedding started",
        });
        fetchData();
      } else {
        throw new Error('Embedding failed');
      }
    } catch (error) {
      console.error("Error triggering embedding:", error);
      toast({
        title: "Error",
        description: "Failed to start document embedding",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-md w-1/3"></div>
          <div className="h-4 bg-muted rounded-md w-1/2"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            AI Agent Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage YAML definitions, document embeddings, learning modules, and model registry
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary/80">
                <Upload className="w-4 h-4 mr-2" />
                Upload YAML
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload YAML Agent Definition</DialogTitle>
                <DialogDescription>
                  Upload a YAML file to define new agent behavior and capabilities
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select YAML File</label>
                  <Input
                    type="file"
                    accept=".yml,.yaml"
                    onChange={(e) => setYamlFile(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                </div>
                {yamlFile && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {yamlFile.name} ({(yamlFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleYamlUpload} disabled={!yamlFile}>
                    Upload
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="yaml" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            YAML Definitions
          </TabsTrigger>
          <TabsTrigger value="embeddings" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Document Embeddings
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Learning Modules
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Model Registry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="yaml" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>YAML Agent Definitions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Upload YAML files to define agent behavior, workflows, and capabilities
                </p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload YAML Definition
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embeddings" className="space-y-4">
          <div className="grid gap-4">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">{doc.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={doc.status === 'active' ? 'default' : 'secondary'}>
                      {doc.status}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => triggerEmbedding(doc.id)}
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Embed
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Embedding Progress</span>
                      <span>{doc.progress || 0}%</span>
                    </div>
                    <Progress value={doc.progress || 0} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      Scope: {doc.agent_scope} • Created: {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {documents.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No documents found for embedding</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <div className="grid gap-4">
            {learningModules.map((module) => (
              <Card key={module.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">
                    {module.source_type}: {module.source_detail}
                  </CardTitle>
                  <Badge variant={module.vectorize ? 'default' : 'secondary'}>
                    {module.vectorize ? 'Vectorized' : 'Raw'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing Progress</span>
                      <span>{module.embedding_progress || 0}%</span>
                    </div>
                    <Progress value={module.embedding_progress || 0} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(module.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {learningModules.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No learning modules configured</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="grid gap-4">
            {modelRegistry.map((model) => (
              <Card key={model.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">
                    {model.name} v{model.version}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
                      {model.status}
                    </Badge>
                    <div className="text-sm font-medium text-green-600">
                      {model.performance_score}%
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Provider</span>
                      <span>{model.provider}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Performance Score</span>
                      <span>{model.performance_score}%</span>
                    </div>
                    <Progress value={model.performance_score} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      Last Updated: {new Date(model.last_updated).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}