import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Brain, 
  Cpu, 
  Database, 
  Zap, 
  Target, 
  TrendingUp,
  Activity,
  HardDrive,
  Lightbulb,
  Settings,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  BarChart3,
  Network,
  Sparkles
} from 'lucide-react';

interface AgentMetrics {
  reasoning_depth: number;
  memory_utilization: number;
  response_quality: number;
  execution_efficiency: number;
  learning_effectiveness: number;
}

interface MemoryStats {
  total_memories: number;
  by_type: {
    [key: string]: {
      count: number;
      avg_confidence: number;
      avg_importance: number;
    };
  };
  avg_confidence: number;
  avg_importance: number;
}

export default function OmniAgentCommandCenter() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [reasoningSteps, setReasoningSteps] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics>({
    reasoning_depth: 0,
    memory_utilization: 0,
    response_quality: 0,
    execution_efficiency: 0,
    learning_effectiveness: 0
  });
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAgentMetrics();
    loadMemoryStats();
    loadExecutionLogs();
  }, []);

  const loadAgentMetrics = async () => {
    try {
      const { data: metricsData } = await supabase
        .from('agent_performance_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

      if (metricsData && metricsData.length > 0) {
        const latestMetrics = metricsData.reduce((acc, metric) => {
          acc[metric.metric_type] = metric.metric_value;
          return acc;
        }, {} as any);

        setMetrics({
          reasoning_depth: latestMetrics.reasoning_depth || 0,
          memory_utilization: latestMetrics.memory_utilization || 0,
          response_quality: latestMetrics.response_quality || 0,
          execution_efficiency: latestMetrics.execution_efficiency || 0,
          learning_effectiveness: latestMetrics.learning_effectiveness || 0
        });
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const loadMemoryStats = async () => {
    try {
      const { data: memories } = await supabase
        .from('agent_memory_enhanced')
        .select('memory_type, confidence_score, importance_weight');

      if (memories) {
        const stats: MemoryStats = {
          total_memories: memories.length,
          by_type: {},
          avg_confidence: 0,
          avg_importance: 0
        };

        // Calculate stats by type
        const typeGroups = memories.reduce((acc, memory) => {
          const type = memory.memory_type || 'unknown';
          if (!acc[type]) acc[type] = [];
          acc[type].push(memory);
          return acc;
        }, {} as any);

        Object.entries(typeGroups).forEach(([type, typeMemories]: [string, any[]]) => {
          stats.by_type[type] = {
            count: typeMemories.length,
            avg_confidence: typeMemories.reduce((sum, m) => sum + m.confidence_score, 0) / typeMemories.length,
            avg_importance: typeMemories.reduce((sum, m) => sum + m.importance_weight, 0) / typeMemories.length
          };
        });

        // Overall averages
        stats.avg_confidence = memories.reduce((sum, m) => sum + m.confidence_score, 0) / memories.length;
        stats.avg_importance = memories.reduce((sum, m) => sum + m.importance_weight, 0) / memories.length;

        setMemoryStats(stats);
      }
    } catch (error) {
      console.error('Error loading memory stats:', error);
    }
  };

  const loadExecutionLogs = async () => {
    try {
      const { data: logs } = await supabase
        .from('agent_execution_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (logs) {
        setExecutionLogs(logs);
      }
    } catch (error) {
      console.error('Error loading execution logs:', error);
    }
  };

  const executeOmniAgent = async () => {
    if (!userMessage.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a message for the Omni Agent",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setAgentResponse('');
    setReasoningSteps([]);

    try {
      console.log('Executing Omni Agent with message:', userMessage);

      const { data, error } = await supabase.functions.invoke('omni-agent-orchestrator', {
        body: {
          user_id: 'admin_user',
          message: userMessage,
          task_type: 'general',
          priority: 'high'
        }
      });

      if (error) {
        console.error('Omni Agent error:', error);
        throw error;
      }

      if (data) {
        console.log('Omni Agent response:', data);
        setAgentResponse(data.response);
        setReasoningSteps(data.reasoning_steps || []);
        
        if (data.performance_metrics) {
          setMetrics(data.performance_metrics);
        }

        toast({
          title: "Omni Agent Executed",
          description: `Response generated in ${data.execution_time_ms}ms`,
        });
      }

    } catch (error) {
      console.error('Error executing Omni Agent:', error);
      toast({
        title: "Execution Failed",
        description: error.message || "Failed to execute Omni Agent",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      // Reload metrics and logs
      loadAgentMetrics();
      loadExecutionLogs();
    }
  };

  const consolidateMemory = async (type: string = 'full') => {
    setIsConsolidating(true);

    try {
      const { data, error } = await supabase.functions.invoke('memory-consolidator-enhanced', {
        body: {
          user_id: 'admin_user',
          consolidation_type: type
        }
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Memory Consolidated",
          description: `Processed ${data.memories_processed} memories, consolidated ${data.memories_consolidated}`,
        });
        
        // Reload memory stats
        loadMemoryStats();
      }

    } catch (error) {
      console.error('Error consolidating memory:', error);
      toast({
        title: "Consolidation Failed",
        description: error.message || "Failed to consolidate memory",
        variant: "destructive"
      });
    } finally {
      setIsConsolidating(false);
    }
  };

  const getMetricColor = (value: number) => {
    if (value >= 0.8) return 'text-green-600';
    if (value >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMetricProgress = (value: number) => Math.round(value * 100);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Omni Agent Command Center
          </h1>
          <p className="text-muted-foreground">
            Advanced AI Agent with Reasoning, Memory, and Learning
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => consolidateMemory('full')}
            disabled={isConsolidating}
            variant="outline"
          >
            {isConsolidating ? (
              <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <HardDrive className="h-4 w-4 mr-2" />
            )}
            Consolidate Memory
          </Button>
          <Button onClick={loadAgentMetrics} variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Refresh Metrics
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Reasoning Depth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2 text-primary">
              {getMetricProgress(metrics.reasoning_depth)}%
            </div>
            <Progress value={getMetricProgress(metrics.reasoning_depth)} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2 text-primary">
              {getMetricProgress(metrics.memory_utilization)}%
            </div>
            <Progress value={getMetricProgress(metrics.memory_utilization)} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Response Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2 text-primary">
              {getMetricProgress(metrics.response_quality)}%
            </div>
            <Progress value={getMetricProgress(metrics.response_quality)} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2 text-primary">
              {getMetricProgress(metrics.execution_efficiency)}%
            </div>
            <Progress value={getMetricProgress(metrics.execution_efficiency)} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2 text-primary">
              {getMetricProgress(metrics.learning_effectiveness)}%
            </div>
            <Progress value={getMetricProgress(metrics.learning_effectiveness)} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="interaction" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="interaction">Agent Interaction</TabsTrigger>
          <TabsTrigger value="memory">Memory System</TabsTrigger>
          <TabsTrigger value="reasoning">Reasoning Engine</TabsTrigger>
          <TabsTrigger value="monitoring">System Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="interaction" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Agent Interface
                </CardTitle>
                <CardDescription>
                  Interact with the Omni Agent's advanced reasoning capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter your message for the Omni Agent..."
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  rows={4}
                />
                <Button 
                  onClick={executeOmniAgent} 
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Execute Omni Agent
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Response Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Agent Response
                </CardTitle>
                <CardDescription>
                  The agent's comprehensive response with reasoning
                </CardDescription>
              </CardHeader>
              <CardContent>
                {agentResponse ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm leading-relaxed">{agentResponse}</p>
                    </div>
                    {reasoningSteps.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Reasoning Steps:</h4>
                        <div className="space-y-2">
                          {reasoningSteps.map((step, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Badge variant={step.result === 'success' ? 'default' : 'destructive'}>
                                Step {step.step}
                              </Badge>
                              <span className="text-sm">{step.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Execute the Omni Agent to see its response</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Memory Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Memory Statistics
                </CardTitle>
                <CardDescription>
                  Current state of the agent's memory system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {memoryStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          {memoryStats.total_memories}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Memories</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          {Math.round(memoryStats.avg_confidence * 100)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Confidence</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold">Memory Types:</h4>
                      {Object.entries(memoryStats.by_type).map(([type, stats]) => (
                        <div key={type} className="flex justify-between items-center p-2 bg-muted rounded">
                          <span className="capitalize">{type.replace('_', ' ')}</span>
                          <Badge variant="outline">{stats.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Loading memory statistics...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Memory Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Memory Management
                </CardTitle>
                <CardDescription>
                  Optimize and manage the agent's memory system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => consolidateMemory('episodic_to_semantic')}
                    disabled={isConsolidating}
                    variant="outline"
                    size="sm"
                  >
                    Consolidate Episodic
                  </Button>
                  <Button
                    onClick={() => consolidateMemory('short_term_to_long_term')}
                    disabled={isConsolidating}
                    variant="outline"
                    size="sm"
                  >
                    Promote Short-term
                  </Button>
                  <Button
                    onClick={() => consolidateMemory('working_memory_cleanup')}
                    disabled={isConsolidating}
                    variant="outline"
                    size="sm"
                  >
                    Clean Working
                  </Button>
                  <Button
                    onClick={() => consolidateMemory('full')}
                    disabled={isConsolidating}
                    size="sm"
                  >
                    Full Consolidation
                  </Button>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Memory Health:</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Confidence</span>
                      <span className={getMetricColor(memoryStats?.avg_confidence || 0)}>
                        {Math.round((memoryStats?.avg_confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Importance</span>
                      <span className={getMetricColor(memoryStats?.avg_importance || 0)}>
                        {Math.round((memoryStats?.avg_importance || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reasoning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Reasoning Engine Status
              </CardTitle>
              <CardDescription>
                Multi-stage reasoning and decision-making capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2 text-blue-600">Causal Reasoning</h4>
                  <p className="text-sm text-muted-foreground">
                    Analyzes cause-effect relationships and dependencies
                  </p>
                  <Badge className="mt-2" variant="outline">Active</Badge>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2 text-green-600">Logical Reasoning</h4>
                  <p className="text-sm text-muted-foreground">
                    Applies formal logic and deductive reasoning
                  </p>
                  <Badge className="mt-2" variant="outline">Active</Badge>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2 text-purple-600">Creative Reasoning</h4>
                  <p className="text-sm text-muted-foreground">
                    Generates novel solutions and approaches
                  </p>
                  <Badge className="mt-2" variant="outline">Active</Badge>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2 text-orange-600">Strategic Reasoning</h4>
                  <p className="text-sm text-muted-foreground">
                    Long-term planning and optimization
                  </p>
                  <Badge className="mt-2" variant="outline">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Execution Logs
              </CardTitle>
              <CardDescription>
                Recent agent execution history and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {executionLogs.length > 0 ? (
                  executionLogs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium">{log.function_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.execution_time_ms && (
                          <Badge variant="outline">{log.execution_time_ms}ms</Badge>
                        )}
                        <Badge variant={log.success_status ? 'default' : 'destructive'}>
                          {log.success_status ? 'Success' : 'Failed'}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No execution logs available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}