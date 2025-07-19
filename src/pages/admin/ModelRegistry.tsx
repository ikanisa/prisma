import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Search, 
  Filter, 
  MoreHorizontal,
  Brain,
  Zap,
  Target,
  Activity,
  TrendingUp,
  Settings,
  Eye,
  Copy,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Code,
  Database,
  Bot,
  Cpu,
  Clock,
  BarChart3,
  Gauge,
  Network,
  Shield,
  Users,
  Globe
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ModelConfig {
  id: string;
  task_name: string;
  primary_model: string;
  secondary_model: string;
  fallback_model: string;
  prompt_prefix: string;
  created_at: string;
}

const AVAILABLE_MODELS = {
  openai: [
    { 
      id: 'gpt-4.1-2025-04-14', 
      name: 'GPT-4.1 (2025)', 
      description: 'Latest flagship model with enhanced reasoning',
      context: '128K',
      cost: '$$$'
    },
    { 
      id: 'o3-2025-04-16', 
      name: 'O3 Reasoning', 
      description: 'Advanced reasoning for complex problems',
      context: '200K',
      cost: '$$$$'
    },
    { 
      id: 'o4-mini-2025-04-16', 
      name: 'O4 Mini', 
      description: 'Fast reasoning optimized for coding',
      context: '128K',
      cost: '$$'
    },
    { 
      id: 'gpt-4.1-mini-2025-04-14', 
      name: 'GPT-4.1 Mini', 
      description: 'Efficient model with vision capabilities',
      context: '128K',
      cost: '$'
    },
  ],
  anthropic: [
    { 
      id: 'claude-opus-4-20250514', 
      name: 'Claude Opus 4', 
      description: 'Most capable model with superior reasoning',
      context: '200K',
      cost: '$$$$'
    },
    { 
      id: 'claude-sonnet-4-20250514', 
      name: 'Claude Sonnet 4', 
      description: 'High-performance with exceptional efficiency',
      context: '200K',
      cost: '$$$'
    },
    { 
      id: 'claude-3-5-haiku-20241022', 
      name: 'Claude 3.5 Haiku', 
      description: 'Fastest model for quick responses',
      context: '200K',
      cost: '$'
    },
  ],
  google: [
    { 
      id: 'gemini-1.5-pro', 
      name: 'Gemini 1.5 Pro', 
      description: 'Advanced multimodal capabilities',
      context: '2M',
      cost: '$$$'
    },
    { 
      id: 'gemini-1.5-flash', 
      name: 'Gemini 1.5 Flash', 
      description: 'Fast and efficient multimodal model',
      context: '1M',
      cost: '$$'
    },
  ]
};

const TASK_CATEGORIES = [
  { 
    value: "conversation", 
    label: "Conversation", 
    description: "Customer support, sales chat, general interaction",
    icon: Users,
    examples: ["customer_support", "sales_chat", "general_inquiry"]
  },
  { 
    value: "analysis", 
    label: "Analysis & Research", 
    description: "Data analysis, research, content understanding",
    icon: BarChart3,
    examples: ["market_analysis", "document_review", "data_insights"]
  },
  { 
    value: "generation", 
    label: "Content Generation", 
    description: "Writing, code generation, creative content",
    icon: Code,
    examples: ["content_writing", "code_generation", "creative_copy"]
  },
  { 
    value: "automation", 
    label: "Task Automation", 
    description: "Workflow automation, decision making",
    icon: Zap,
    examples: ["order_processing", "lead_qualification", "scheduling"]
  },
  { 
    value: "integration", 
    label: "System Integration", 
    description: "API calls, data processing, external systems",
    icon: Network,
    examples: ["api_integration", "data_sync", "webhook_processing"]
  }
];

export default function ModelRegistry() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [testResult, setTestResult] = useState<string>('');
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all-categories");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const { toast } = useToast();

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalConfigs: 0,
    activeConfigs: 0,
    totalTests: 0,
    successRate: 0,
    popularModels: [] as { model: string; count: number }[],
    taskDistribution: [] as { category: string; count: number }[]
  });

  const [formData, setFormData] = useState({
    task_name: '',
    primary_model: 'gpt-4.1-2025-04-14',
    secondary_model: 'claude-sonnet-4-20250514',
    fallback_model: 'claude-3-5-haiku-20241022',
    prompt_prefix: ''
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const [modelsResult, fallbackLogsResult] = await Promise.all([
        supabase
          .from('mcp_model_registry')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('fallback_activity_log')
          .select('success, original_model, fallback_model')
      ]);

      if (modelsResult.error) throw modelsResult.error;
      
      const modelsData = modelsResult.data || [];
      const logsData = fallbackLogsResult.data || [];
      
      setModels(modelsData);

      // Calculate analytics
      const totalTests = logsData.length;
      const successfulTests = logsData.filter(log => log.success).length;
      const successRate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;

      // Count popular models
      const modelCounts = modelsData.reduce((acc, model) => {
        acc[model.primary_model] = (acc[model.primary_model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const popularModels = Object.entries(modelCounts)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Task distribution
      const taskDistribution = TASK_CATEGORIES.map(category => {
        const count = modelsData.filter(model => 
          category.examples.some(example => 
            model.task_name.toLowerCase().includes(example.toLowerCase())
          )
        ).length;
        return { category: category.label, count };
      });

      setAnalytics({
        totalConfigs: modelsData.length,
        activeConfigs: modelsData.length, // Assuming all are active for now
        totalTests,
        successRate: Math.round(successRate),
        popularModels,
        taskDistribution
      });

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
      setTestLoading(model.id);
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
    } finally {
      setTestLoading(null);
    }
  };

  const duplicateModel = async (model: ModelConfig) => {
    try {
      const duplicatedData = {
        task_name: `${model.task_name}_copy`,
        primary_model: model.primary_model,
        secondary_model: model.secondary_model,
        fallback_model: model.fallback_model,
        prompt_prefix: model.prompt_prefix
      };

      const { error } = await supabase
        .from('mcp_model_registry')
        .insert(duplicatedData);
      
      if (error) throw error;
      toast({ title: "Success", description: "Model configuration duplicated" });
      loadModels();
    } catch (error) {
      console.error('Error duplicating model:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate model configuration",
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
      primary_model: 'gpt-4.1-2025-04-14',
      secondary_model: 'claude-sonnet-4-20250514',
      fallback_model: 'claude-3-5-haiku-20241022',
      prompt_prefix: ''
    });
  };

  // Filter models based on search and category
  const filteredModels = models.filter(model => {
    const matchesSearch = !searchQuery || 
      model.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.primary_model.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all-categories' || 
      TASK_CATEGORIES.find(cat => cat.value === filterCategory)?.examples.some(example =>
        model.task_name.toLowerCase().includes(example.toLowerCase())
      );

    return matchesSearch && matchesCategory;
  });

  const getModelInfo = (modelId: string) => {
    for (const provider of Object.values(AVAILABLE_MODELS)) {
      const model = provider.find(m => m.id === modelId);
      if (model) return model;
    }
    return { name: modelId, description: 'Custom model', context: 'Unknown', cost: '?' };
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded"></div>
          ))}
        </div>
        <div className="h-96 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Analytics */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Model Registry</h1>
            <p className="text-muted-foreground">
              Configure and manage AI models for different tasks across the platform
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadModels}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingModel(null); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    {editingModel ? 'Edit' : 'Create'} Model Configuration
                  </DialogTitle>
                  <DialogDescription>
                    Configure how AI models are used for specific tasks and workflows
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Setup</TabsTrigger>
                    <TabsTrigger value="models">Model Selection</TabsTrigger>
                    <TabsTrigger value="prompting">Prompt Engineering</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="task_name">Task Name</Label>
                        <Input
                          id="task_name"
                          value={formData.task_name}
                          onChange={(e) => setFormData({...formData, task_name: e.target.value})}
                          placeholder="e.g., customer_support, sales_pitch"
                        />
                        <div className="text-xs text-muted-foreground">
                          Use descriptive names that clearly identify the task purpose
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Task Category</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select task category" />
                          </SelectTrigger>
                          <SelectContent>
                            {TASK_CATEGORIES.map((category) => {
                              const IconComponent = category.icon;
                              return (
                                <SelectItem key={category.value} value={category.value}>
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="w-4 h-4" />
                                    <div>
                                      <div className="font-medium">{category.label}</div>
                                      <div className="text-xs text-muted-foreground">{category.description}</div>
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="models" className="space-y-6">
                    {/* Primary Model Selection */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Primary Model</Label>
                        <div className="text-sm text-muted-foreground">Main model used for this task</div>
                      </div>
                      
                      {Object.entries(AVAILABLE_MODELS).map(([provider, models]) => (
                        <Card key={provider} className="p-4">
                          <h4 className="font-medium mb-3 capitalize">{provider}</h4>
                          <div className="grid gap-2">
                            {models.map((model) => (
                              <div
                                key={model.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  formData.primary_model === model.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-muted-foreground/50'
                                }`}
                                onClick={() => setFormData({...formData, primary_model: model.id})}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium">{model.name}</div>
                                    <div className="text-sm text-muted-foreground">{model.description}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-muted-foreground">Context: {model.context}</div>
                                    <div className="text-xs text-muted-foreground">Cost: {model.cost}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    {/* Secondary & Fallback Models */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Secondary Model</Label>
                        <Select value={formData.secondary_model} onValueChange={(value) => setFormData({...formData, secondary_model: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(AVAILABLE_MODELS).flat().map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Fallback Model</Label>
                        <Select value={formData.fallback_model} onValueChange={(value) => setFormData({...formData, fallback_model: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(AVAILABLE_MODELS).flat().map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="prompting" className="space-y-6">
                    <div className="space-y-2">
                      <Label>System Prompt Prefix</Label>
                      <Textarea
                        value={formData.prompt_prefix}
                        onChange={(e) => setFormData({...formData, prompt_prefix: e.target.value})}
                        rows={8}
                        placeholder="You are an AI assistant specialized in..."
                        className="font-mono text-sm"
                      />
                      <div className="text-xs text-muted-foreground">
                        This prompt will be prepended to all requests for this task configuration
                      </div>
                    </div>
                    
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Well-crafted prompts significantly improve model performance. Include context about the task, 
                        expected behavior, and any specific formatting requirements.
                      </AlertDescription>
                    </Alert>
                  </TabsContent>
                </Tabs>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingModel ? 'Update Configuration' : 'Create Configuration'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Configs</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalConfigs}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.activeConfigs} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.successRate}%</div>
              <Progress value={analytics.successRate} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalTests}</div>
              <p className="text-xs text-muted-foreground">
                Model executions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Model</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.popularModels[0]?.model.split('-')[0] || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.popularModels[0]?.count || 0} configs
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search configurations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">All categories</SelectItem>
                  {TASK_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setFilterCategory("all-categories");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Configurations */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Configurations ({filteredModels.length})
          </h2>
        </div>
        
        {filteredModels.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No configurations found</h3>
              <p className="text-muted-foreground mb-6">
                {models.length === 0 
                  ? "Create your first model configuration to get started"
                  : "Try adjusting your filters or search terms"
                }
              </p>
              <Button onClick={() => { resetForm(); setEditingModel(null); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Configuration
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredModels.map((model) => {
              const primaryModelInfo = getModelInfo(model.primary_model);
              const taskCategory = TASK_CATEGORIES.find(cat => 
                cat.examples.some(example => 
                  model.task_name.toLowerCase().includes(example.toLowerCase())
                )
              );
              const CategoryIcon = taskCategory?.icon || Target;
              
              return (
                <Card key={model.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                            <Badge variant="outline">{model.task_name}</Badge>
                          </div>
                          {taskCategory && (
                            <Badge variant="secondary">
                              {taskCategory.label}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{primaryModelInfo.name}</CardTitle>
                        <CardDescription>
                          {primaryModelInfo.description}
                        </CardDescription>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => testModel(model)}>
                            <Play className="w-4 h-4 mr-2" />
                            Test Configuration
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateModel(model)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(model)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(model.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Cpu className="w-4 h-4" />
                          Primary Model
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div><strong>Model:</strong> {primaryModelInfo.name}</div>
                          <div><strong>Context:</strong> {primaryModelInfo.context}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Shield className="w-4 h-4" />
                          Fallback Chain
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div><strong>Secondary:</strong> {getModelInfo(model.secondary_model).name}</div>
                          <div><strong>Fallback:</strong> {getModelInfo(model.fallback_model).name}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Code className="w-4 h-4" />
                          Configuration
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div><strong>Prompt:</strong> {model.prompt_prefix ? 'Configured' : 'Default'}</div>
                          <div><strong>Status:</strong> 
                            {testLoading === model.id ? (
                              <span className="text-yellow-600 ml-1">Testing...</span>
                            ) : (
                              <span className="text-green-600 ml-1">Ready</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Created {new Date(model.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        Ready for execution
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-md overflow-auto text-sm max-h-96">
                {testResult}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setTestResult('')}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}