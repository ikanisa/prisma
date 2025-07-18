import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ModelConfig {
  id: string;
  task_name: string;
  primary_model: string;
  secondary_model: string;
  fallback_model: string;
  prompt_prefix: string;
  created_at: string;
}

export default function ModelRegistry() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [testResult, setTestResult] = useState<string>('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    task_name: '',
    primary_model: 'gpt-4o-mini',
    secondary_model: 'claude-3-5-haiku-20241022',
    fallback_model: 'gemini-1.5-flash',
    prompt_prefix: ''
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const { data, error } = await supabase
        .from('mcp_model_registry')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('Error loading models:', error);
      toast({
        title: "Error",
        description: "Failed to load model registry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingModel) {
        const { error } = await supabase
          .from('mcp_model_registry')
          .update(formData)
          .eq('id', editingModel.id);
        
        if (error) throw error;
        toast({ title: "Success", description: "Model configuration updated" });
      } else {
        const { error } = await supabase
          .from('mcp_model_registry')
          .insert(formData);
        
        if (error) throw error;
        toast({ title: "Success", description: "Model configuration created" });
      }

      setIsDialogOpen(false);
      setEditingModel(null);
      resetForm();
      loadModels();
    } catch (error) {
      console.error('Error saving model:', error);
      toast({
        title: "Error",
        description: "Failed to save model configuration",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('mcp_model_registry')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Model configuration deleted" });
      loadModels();
    } catch (error) {
      console.error('Error deleting model:', error);
      toast({
        title: "Error",
        description: "Failed to delete model configuration",
        variant: "destructive",
      });
    }
  };

  const testModel = async (model: ModelConfig) => {
    try {
      const { data, error } = await supabase.functions.invoke('mcp-orchestrator', {
        body: {
          task: model.task_name,
          prompt: "Hello, this is a test message. Please respond briefly.",
          context: { test: true }
        }
      });

      if (error) throw error;
      setTestResult(JSON.stringify(data, null, 2));
      toast({ title: "Success", description: "Model test completed" });
    } catch (error) {
      console.error('Error testing model:', error);
      toast({
        title: "Error",
        description: "Failed to test model",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (model: ModelConfig) => {
    setEditingModel(model);
    setFormData({
      task_name: model.task_name,
      primary_model: model.primary_model,
      secondary_model: model.secondary_model,
      fallback_model: model.fallback_model,
      prompt_prefix: model.prompt_prefix
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      task_name: '',
      primary_model: 'gpt-4o-mini',
      secondary_model: 'claude-3-5-haiku-20241022',
      fallback_model: 'gemini-1.5-flash',
      prompt_prefix: ''
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Model Registry</h1>
          <p className="text-muted-foreground">
            Configure AI models for different tasks in the easyMO system
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingModel(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Model Config
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingModel ? 'Edit' : 'Add'} Model Configuration
              </DialogTitle>
              <DialogDescription>
                Configure how AI models are used for specific tasks
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task_name" className="text-right">
                  Task Name
                </Label>
                <Input
                  id="task_name"
                  value={formData.task_name}
                  onChange={(e) => setFormData({...formData, task_name: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g., sales_pitch, customer_support"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="primary_model" className="text-right">
                  Primary Model
                </Label>
                <Input
                  id="primary_model"
                  value={formData.primary_model}
                  onChange={(e) => setFormData({...formData, primary_model: e.target.value})}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="secondary_model" className="text-right">
                  Secondary Model
                </Label>
                <Input
                  id="secondary_model"
                  value={formData.secondary_model}
                  onChange={(e) => setFormData({...formData, secondary_model: e.target.value})}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fallback_model" className="text-right">
                  Fallback Model
                </Label>
                <Input
                  id="fallback_model"
                  value={formData.fallback_model}
                  onChange={(e) => setFormData({...formData, fallback_model: e.target.value})}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prompt_prefix" className="text-right">
                  Prompt Prefix
                </Label>
                <Textarea
                  id="prompt_prefix"
                  value={formData.prompt_prefix}
                  onChange={(e) => setFormData({...formData, prompt_prefix: e.target.value})}
                  className="col-span-3"
                  rows={3}
                  placeholder="System prompt that will be prepended to all requests..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingModel ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Configurations</CardTitle>
          <CardDescription>
            {models.length} model configurations defined
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead>Primary Model</TableHead>
                <TableHead>Secondary Model</TableHead>
                <TableHead>Fallback Model</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <Badge variant="outline">{model.task_name}</Badge>
                  </TableCell>
                  <TableCell>{model.primary_model}</TableCell>
                  <TableCell>{model.secondary_model}</TableCell>
                  <TableCell>{model.fallback_model}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testModel(model)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(model)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(model.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {models.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No model configurations found. Add one to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>Test Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
              {testResult}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}