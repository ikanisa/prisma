import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Zap, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIModel {
  id: string;
  name: string;
  version: string;
  model_type: string;
  status: string;
  performance_metrics: any;
  cost_per_token: number;
  created_at: string;
}

interface ModelExperiment {
  id: string;
  name: string;
  description: string;
  status: string;
  traffic_split: number;
  start_date: string;
  end_date: string;
  results: any;
  ai_models_a: any;
  ai_models_b: any;
}

interface BenchmarkResult {
  id: string;
  benchmark_type: string;
  metric_name: string;
  metric_value: number;
  benchmark_date: string;
  metadata: any;
}

export default function ModelManagement() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [experiments, setExperiments] = useState<ModelExperiment[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [benchmarkProgress, setBenchmarkProgress] = useState<number>(0);
  const [experimentDialog, setExperimentDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [modelsResult, experimentsResult, benchmarksResult] = await Promise.all([
        supabase.from('ai_models').select('*').order('created_at', { ascending: false }),
        supabase.from('model_experiments').select(`
          *,
          ai_models_a:model_a_id(*),
          ai_models_b:model_b_id(*)
        `).order('created_at', { ascending: false }),
        supabase.from('model_benchmarks').select('*').order('benchmark_date', { ascending: false })
      ]);

      setModels(modelsResult.data || []);
      setExperiments(experimentsResult.data || []);
      setBenchmarks(benchmarksResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch model data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runBenchmark = async (modelId: string, benchmarkTypes: string[]) => {
    try {
      setBenchmarkProgress(0);
      
      const response = await supabase.functions.invoke('model-management', {
        body: {
          action: 'benchmark',
          modelId,
          benchmarkTypes
        }
      });

      if (response.error) throw response.error;

      setBenchmarkProgress(100);
      await fetchData();
      
      toast({
        title: "Success",
        description: "Benchmark completed successfully"
      });
    } catch (error) {
      console.error('Benchmark error:', error);
      toast({
        title: "Error",
        description: "Failed to run benchmark",
        variant: "destructive"
      });
    }
  };

  const createExperiment = async (experimentData: any) => {
    try {
      const response = await supabase.functions.invoke('model-management', {
        body: {
          action: 'experiment',
          ...experimentData
        }
      });

      if (response.error) throw response.error;

      await fetchData();
      setExperimentDialog(false);
      
      toast({
        title: "Success",
        description: "A/B experiment created successfully"
      });
    } catch (error) {
      console.error('Experiment creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create experiment",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPerformanceScore = (metrics: any): number => {
    if (!metrics || !metrics.overall_score) return 0;
    return Math.round(metrics.overall_score * 100);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">AI Model Management</h1>
        <div className="flex gap-2">
          <Dialog open={experimentDialog} onOpenChange={setExperimentDialog}>
            <DialogTrigger asChild>
              <Button>
                <TrendingUp className="mr-2 h-4 w-4" />
                Create A/B Test
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create A/B Experiment</DialogTitle>
              </DialogHeader>
              <ExperimentForm onSubmit={createExperiment} models={models} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Active Models</p>
                <p className="text-2xl font-bold">
                  {models.filter(m => m.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Running Experiments</p>
                <p className="text-2xl font-bold">
                  {experiments.filter(e => e.status === 'running').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Avg Performance</p>
                <p className="text-2xl font-bold">
                  {Math.round(models.reduce((acc, m) => acc + getPerformanceScore(m.performance_metrics), 0) / models.length || 0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Cost Efficiency</p>
                <p className="text-2xl font-bold">High</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="models" className="w-full">
        <TabsList>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="experiments">A/B Experiments</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>AI Models</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.map((model) => (
                  <div key={model.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(model.status)}
                          <h3 className="font-semibold">{model.name} v{model.version}</h3>
                          <Badge variant="outline">{model.model_type}</Badge>
                          <Badge className={
                            model.status === 'active' ? 'bg-green-500' : 
                            model.status === 'testing' ? 'bg-yellow-500' : 'bg-gray-500'
                          }>
                            {model.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Performance: {getPerformanceScore(model.performance_metrics)}%</span>
                          <span>Cost: ${model.cost_per_token?.toFixed(6)}/token</span>
                          <span>Created: {new Date(model.created_at).toLocaleDateString()}</span>
                        </div>
                        {model.performance_metrics?.overall_score && (
                          <Progress 
                            value={getPerformanceScore(model.performance_metrics)} 
                            className="w-64" 
                          />
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => runBenchmark(model.id, ['response_time', 'accuracy', 'safety'])}
                        >
                          Run Benchmark
                        </Button>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiments">
          <Card>
            <CardHeader>
              <CardTitle>A/B Experiments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {experiments.map((experiment) => (
                  <div key={experiment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(experiment.status)}
                          <h3 className="font-semibold">{experiment.name}</h3>
                          <Badge className={
                            experiment.status === 'running' ? 'bg-blue-500' : 
                            experiment.status === 'completed' ? 'bg-green-500' : 'bg-gray-500'
                          }>
                            {experiment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{experiment.description}</p>
                        <div className="flex items-center space-x-4 text-sm">
                          <span>Model A: {experiment.ai_models_a?.name}</span>
                          <span>Model B: {experiment.ai_models_b?.name}</span>
                          <span>Split: {Math.round(experiment.traffic_split * 100)}%/{Math.round((1 - experiment.traffic_split) * 100)}%</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(experiment.start_date).toLocaleDateString()} - {new Date(experiment.end_date).toLocaleDateString()}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Results
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks">
          <Card>
            <CardHeader>
              <CardTitle>Benchmark Results</CardTitle>
            </CardHeader>
            <CardContent>
              {benchmarkProgress > 0 && benchmarkProgress < 100 && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Running benchmark...</span>
                    <span className="text-sm">{benchmarkProgress}%</span>
                  </div>
                  <Progress value={benchmarkProgress} />
                </div>
              )}
              
              <div className="space-y-4">
                {benchmarks.map((benchmark) => (
                  <div key={benchmark.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{benchmark.benchmark_type}</Badge>
                          <span className="font-medium">{benchmark.metric_name}</span>
                        </div>
                        <div className="text-lg font-bold">
                          {benchmark.benchmark_type === 'response_time' ? 
                            `${benchmark.metric_value}ms` :
                            `${(benchmark.metric_value * 100).toFixed(1)}%`
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(benchmark.benchmark_date).toLocaleString()}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {models.map((model) => (
                    <div key={model.id} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{model.name}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Overall Score</span>
                          <span className="font-medium">{getPerformanceScore(model.performance_metrics)}%</span>
                        </div>
                        <Progress value={getPerformanceScore(model.performance_metrics)} />
                        
                        {model.performance_metrics?.benchmark_results && (
                          <div className="mt-4 space-y-1">
                            {model.performance_metrics.benchmark_results.map((result: any, index: number) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="capitalize">{result.metricName.replace('_', ' ')}</span>
                                <span>{result.value.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ExperimentFormProps {
  onSubmit: (data: any) => void;
  models: AIModel[];
}

function ExperimentForm({ onSubmit, models }: ExperimentFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    modelAId: '',
    modelBId: '',
    trafficSplit: 0.5,
    duration: 7,
    successMetrics: ['response_quality', 'user_satisfaction']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Experiment Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., GPT-4o vs Claude-3 Accuracy Test"
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Description</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the experiment goals"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Model A</label>
          <Select value={formData.modelAId} onValueChange={(value) => setFormData({ ...formData, modelAId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Model A" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name} ({model.model_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Model B</label>
          <Select value={formData.modelBId} onValueChange={(value) => setFormData({ ...formData, modelBId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Model B" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name} ({model.model_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Traffic Split (Model A %)</label>
        <Input
          type="range"
          min="0.1"
          max="0.9"
          step="0.1"
          value={formData.trafficSplit}
          onChange={(e) => setFormData({ ...formData, trafficSplit: parseFloat(e.target.value) })}
        />
        <div className="text-sm text-gray-600 mt-1">
          {Math.round(formData.trafficSplit * 100)}% Model A, {Math.round((1 - formData.trafficSplit) * 100)}% Model B
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Duration (days)</label>
        <Input
          type="number"
          min="1"
          max="30"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
        />
      </div>

      <Button type="submit" className="w-full">Create Experiment</Button>
    </form>
  );
}