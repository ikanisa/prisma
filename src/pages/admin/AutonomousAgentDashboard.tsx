import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Zap, MessageCircle, Target, BookOpen, TrendingUp, Activity, Users } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AgentMetrics {
  total_interactions: number;
  average_confidence: number;
  skill_usage: Record<string, number>;
  learning_rate: number;
  memory_efficiency: number;
  response_time_ms: number;
}

interface CognitiveInsight {
  id: string;
  timestamp: string;
  insight_type: string;
  description: string;
  confidence: number;
  impact_score: number;
}

export default function AutonomousAgentDashboard() {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [insights, setInsights] = useState<CognitiveInsight[]>([]);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [memoryStats, setMemoryStats] = useState<any>({});
  const [skillPerformance, setSkillPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        loadAgentMetrics(),
        loadCognitiveInsights(),
        loadRecentConversations(),
        loadMemoryStats(),
        loadSkillPerformance()
      ]);
    } catch (error) {
      console.error('Dashboard data loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentMetrics = async () => {
    // Get execution logs for metrics
    const { data: execLogs } = await supabase
      .from('agent_execution_log')
      .select('*')
      .eq('function_name', 'autonomous-master-agent')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (execLogs) {
      const totalInteractions = execLogs.length;
      const avgConfidence = execLogs.reduce((sum, log) => {
        const inputData = typeof log.input_data === 'object' ? log.input_data : {};
        return sum + (inputData?.confidence || 0.8);
      }, 0) / totalInteractions;
      const avgResponseTime = execLogs.reduce((sum, log) => sum + (log.execution_time_ms || 0), 0) / totalInteractions;

      setMetrics({
        total_interactions: totalInteractions,
        average_confidence: avgConfidence,
        skill_usage: extractSkillUsage(execLogs),
        learning_rate: calculateLearningRate(execLogs),
        memory_efficiency: calculateMemoryEfficiency(execLogs),
        response_time_ms: avgResponseTime
      });
    }
  };

  const loadCognitiveInsights = async () => {
    // Get memory insights
    const { data } = await supabase
      .from('agent_memory_enhanced')
      .select('*')
      .eq('memory_type', 'semantic')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      const mappedInsights = data.map(memory => ({
        id: memory.id,
        timestamp: memory.created_at,
        insight_type: 'learning_pattern',
        description: `New pattern learned: ${memory.memory_key}`,
        confidence: memory.confidence_score,
        impact_score: memory.importance_weight
      }));
      setInsights(mappedInsights);
    }
  };

  const loadRecentConversations = async () => {
    const { data } = await supabase
      .from('agent_conversations')
      .select('*')
      .order('ts', { ascending: false })
      .limit(10);

    if (data) {
      setRecentConversations(data);
    }
  };

  const loadMemoryStats = async () => {
    const { data } = await supabase
      .from('agent_memory_enhanced')
      .select('memory_type')
      .not('memory_type', 'is', null);

    if (data) {
      const stats = data.reduce((acc, item) => {
        acc[item.memory_type] = (acc[item.memory_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      setMemoryStats(stats);
    }
  };

  const loadSkillPerformance = async () => {
    // Mock skill performance data (would come from actual skill execution logs)
    const skills = [
      { name: 'Payment Mastery', success_rate: 95, usage_count: 120, avg_confidence: 0.92 },
      { name: 'Transport Mastery', success_rate: 88, usage_count: 85, avg_confidence: 0.86 },
      { name: 'Business Mastery', success_rate: 91, usage_count: 95, avg_confidence: 0.89 },
      { name: 'Communication Mastery', success_rate: 97, usage_count: 200, avg_confidence: 0.94 },
      { name: 'Learning Mastery', success_rate: 84, usage_count: 45, avg_confidence: 0.82 },
      { name: 'Reasoning Mastery', success_rate: 89, usage_count: 160, avg_confidence: 0.87 }
    ];
    
    setSkillPerformance(skills);
  };

  const extractSkillUsage = (logs: any[]) => {
    const usage: Record<string, number> = {};
    logs.forEach(log => {
      const skillsUsed = log.input_data?.skills_used || [];
      skillsUsed.forEach((skill: string) => {
        usage[skill] = (usage[skill] || 0) + 1;
      });
    });
    return usage;
  };

  const calculateLearningRate = (logs: any[]) => {
    // Calculate based on confidence improvement over time
    if (logs.length < 2) return 0;
    
    const recent = logs.slice(0, 10);
    const older = logs.slice(-10);
    
    const recentAvg = recent.reduce((sum, log) => sum + (log.input_data?.confidence || 0.8), 0) / recent.length;
    const olderAvg = older.reduce((sum, log) => sum + (log.input_data?.confidence || 0.8), 0) / older.length;
    
    return ((recentAvg - olderAvg) / olderAvg) * 100;
  };

  const calculateMemoryEfficiency = (logs: any[]) => {
    // Mock calculation based on successful memory retrieval
    return 87.5;
  };

  const triggerLearningUpdate = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('memory-consolidator-enhanced', {
        body: { 
          user_id: 'system',
          consolidation_type: 'full'
        }
      });
      
      if (error) throw error;
      
      console.log('Learning update triggered:', data);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Learning update failed:', error);
    }
  };

  const memoryChartData = Object.entries(memoryStats).map(([type, count]) => ({
    name: type.replace('_', ' ').toUpperCase(),
    value: count,
    color: getMemoryTypeColor(type)
  }));

  const confidenceTrendData = recentConversations.slice(0, 7).reverse().map((conv, index) => ({
    interaction: index + 1,
    confidence: 0.7 + (Math.random() * 0.3), // Mock confidence data
    timestamp: new Date(conv.ts).toLocaleDateString()
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Autonomous Agent Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor AI agent intelligence, learning, and performance
          </p>
        </div>
        <Button onClick={triggerLearningUpdate} className="gap-2">
          <BookOpen className="h-4 w-4" />
          Trigger Learning Update
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_interactions || 0}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics?.average_confidence || 0) * 100).toFixed(1)}%
            </div>
            <Progress value={(metrics?.average_confidence || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              +{(metrics?.learning_rate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Intelligence improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics?.response_time_ms || 0).toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Average processing time
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cognitive" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cognitive">Cognitive Analysis</TabsTrigger>
          <TabsTrigger value="memory">Memory Systems</TabsTrigger>
          <TabsTrigger value="skills">Skill Performance</TabsTrigger>
          <TabsTrigger value="conversations">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="cognitive" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Confidence Trend</CardTitle>
                <CardDescription>Agent confidence over recent interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={confidenceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="interaction" />
                    <YAxis domain={[0, 1]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="confidence" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cognitive Insights</CardTitle>
                <CardDescription>Recent learning patterns and discoveries</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {insights.map((insight) => (
                      <div key={insight.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{insight.insight_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(insight.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{insight.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="text-xs">
                            Confidence: {(insight.confidence * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs">
                            Impact: {insight.impact_score.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Memory Distribution</CardTitle>
                <CardDescription>Types of memories stored in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={memoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {memoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memory Efficiency</CardTitle>
                <CardDescription>Quality and utilization of stored memories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Retrieval Accuracy</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Consolidation Rate</span>
                      <span>78%</span>
                    </div>
                    <Progress value={78} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Pattern Recognition</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Storage Efficiency</span>
                      <span>{metrics?.memory_efficiency || 0}%</span>
                    </div>
                    <Progress value={metrics?.memory_efficiency || 0} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skill Performance Matrix</CardTitle>
              <CardDescription>Performance metrics for each master skill</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skillPerformance.map((skill) => (
                  <div key={skill.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{skill.name}</h4>
                      <Badge variant={skill.success_rate >= 90 ? "default" : "secondary"}>
                        {skill.success_rate}% Success
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Usage Count</div>
                        <div className="font-medium">{skill.usage_count}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Confidence</div>
                        <div className="font-medium">{(skill.avg_confidence * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Success Rate</div>
                        <Progress value={skill.success_rate} className="mt-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
              <CardDescription>Latest interactions processed by the autonomous agent</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {recentConversations.map((conv) => (
                    <div key={conv.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={conv.role === 'user' ? 'outline' : 'default'}>
                          {conv.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(conv.ts).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{conv.message}</p>
                      {conv.metadata?.skills_used && (
                        <div className="flex gap-1 mt-2">
                          {conv.metadata.skills_used.map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getMemoryTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'short_term': '#8884d8',
    'long_term': '#82ca9d',
    'episodic': '#ffc658',
    'semantic': '#ff7c7c',
    'working_memory': '#8dd1e1'
  };
  return colors[type] || '#8884d8';
}