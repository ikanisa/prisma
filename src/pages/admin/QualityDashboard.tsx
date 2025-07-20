import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity, Shield, Zap, Target } from "lucide-react";

interface QualityMetrics {
  average_score: number;
  total_evaluations: number;
  low_quality_count: number;
}

interface Evaluation {
  id: string;
  phone_number: string;
  style_score: number;
  clarity_score: number;
  helpfulness_score: number;
  overall_score: number;
  evaluation_notes: string;
  evaluated_at: string;
  model_used: string;
}

export default function QualityDashboard() {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [qualityGates, setQualityGates] = useState({
    responseTime: { threshold: 1000, status: 'green' },
    successRate: { threshold: 95, status: 'green' },
    errorRate: { threshold: 5, status: 'green' }
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    
    if (autoRefresh) {
      const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, timeRange]);

  async function loadData() {
    try {
      // Load quality metrics with time range
      const timeFilter = new Date();
      switch (timeRange) {
        case '1h':
          timeFilter.setHours(timeFilter.getHours() - 1);
          break;
        case '24h':
          timeFilter.setHours(timeFilter.getHours() - 24);
          break;
        case '7d':
          timeFilter.setDate(timeFilter.getDate() - 7);
          break;
      }

      // Load agent execution logs for real-time metrics
      const { data: executionLogs, error: logsError } = await supabase
        .from('agent_execution_log')
        .select('*')
        .gte('timestamp', timeFilter.toISOString())
        .order('timestamp', { ascending: false });

      if (logsError) throw logsError;

      // Calculate real-time metrics
      const totalExecutions = executionLogs?.length || 0;
      const successfulExecutions = executionLogs?.filter(log => log.success_status).length || 0;
      const avgResponseTime = totalExecutions > 0 
        ? executionLogs.reduce((sum, log) => sum + (log.execution_time_ms || 0), 0) / totalExecutions 
        : 0;
      const errorRate = totalExecutions > 0 ? ((totalExecutions - successfulExecutions) / totalExecutions) * 100 : 0;

      // Update quality gates
      setQualityGates({
        responseTime: { 
          threshold: 1000, 
          status: avgResponseTime < 1000 ? 'green' : avgResponseTime < 2000 ? 'yellow' : 'red' 
        },
        successRate: { 
          threshold: 95, 
          status: (successfulExecutions / totalExecutions * 100) >= 95 ? 'green' : 
                   (successfulExecutions / totalExecutions * 100) >= 85 ? 'yellow' : 'red' 
        },
        errorRate: { 
          threshold: 5, 
          status: errorRate <= 5 ? 'green' : errorRate <= 10 ? 'yellow' : 'red' 
        }
      });

      // Load conversation evaluations
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('conversation_evaluations')
        .select('*')
        .gte('evaluated_at', timeFilter.toISOString())
        .order('evaluated_at', { ascending: false })
        .limit(50);

      if (evaluationsError) throw evaluationsError;
      setEvaluations(evaluationsData || []);

      // Calculate enhanced metrics
      const avgScore = evaluationsData?.length > 0 
        ? evaluationsData.reduce((sum, evaluation) => sum + evaluation.overall_score, 0) / evaluationsData.length 
        : 0;

      setMetrics({
        average_score: avgScore,
        total_evaluations: totalExecutions,
        low_quality_count: evaluationsData?.filter(evaluation => evaluation.overall_score < 0.6).length || 0
      });

    } catch (error) {
      console.error('Error loading quality data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load quality dashboard"
      });
    } finally {
      setLoading(false);
    }
  }

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'green': return <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />;
      case 'yellow': return <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />;
      case 'red': return <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />;
      default: return <div className="w-3 h-3 bg-gray-500 rounded-full" />;
    }
  };

  const scoreDistribution = evaluations.reduce((acc, evaluation) => {
    const range = Math.floor(evaluation.overall_score * 10) / 10;
    const key = `${range.toFixed(1)}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(scoreDistribution)
    .map(([score, count]) => ({ score, count }))
    .sort((a, b) => parseFloat(a.score) - parseFloat(b.score));

  const trendData = evaluations
    .slice(0, 20)
    .reverse()
    .map((evaluation, index) => ({
      index: index + 1,
      score: evaluation.overall_score,
      style: evaluation.style_score,
      clarity: evaluation.clarity_score,
      helpfulness: evaluation.helpfulness_score
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Quality Dashboard</h1>
          <p className="text-muted-foreground">Real-time AI performance monitoring with automated quality gates</p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
            <TabsList>
              <TabsTrigger value="1h">1H</TabsTrigger>
              <TabsTrigger value="24h">24H</TabsTrigger>
              <TabsTrigger value="7d">7D</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-2"
          >
            <Activity className="h-4 w-4" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
        </div>
      </div>

      {/* Quality Gates - Traffic Light Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Automated Quality Gates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Response Time Gate</p>
                <p className="text-sm text-muted-foreground">&lt; {qualityGates.responseTime.threshold}ms</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIndicator(qualityGates.responseTime.status)}
                <span className="text-sm font-medium">
                  {qualityGates.responseTime.status.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Success Rate Gate</p>
                <p className="text-sm text-muted-foreground">&gt; {qualityGates.successRate.threshold}%</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIndicator(qualityGates.successRate.status)}
                <span className="text-sm font-medium">
                  {qualityGates.successRate.status.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Error Rate Gate</p>
                <p className="text-sm text-muted-foreground">&lt; {qualityGates.errorRate.threshold}%</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIndicator(qualityGates.errorRate.status)}
                <span className="text-sm font-medium">
                  {qualityGates.errorRate.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold">
                  {(metrics?.average_score || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                {(metrics?.average_score || 0) >= 0.7 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
            <Progress value={(metrics?.average_score || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Evaluations</p>
                <p className="text-2xl font-bold">{metrics?.total_evaluations || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Quality</p>
                <p className="text-2xl font-bold">{metrics?.low_quality_count || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quality Rate</p>
                <p className="text-2xl font-bold">
                  {metrics?.total_evaluations 
                    ? (((metrics.total_evaluations - (metrics.low_quality_count || 0)) / metrics.total_evaluations) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="score" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Trend (Last 20)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" name="Overall" />
                <Line type="monotone" dataKey="style" stroke="#10b981" name="Style" />
                <Line type="monotone" dataKey="clarity" stroke="#3b82f6" name="Clarity" />
                <Line type="monotone" dataKey="helpfulness" stroke="#f59e0b" name="Helpfulness" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Quality Drill-down */}
      <Tabs defaultValue="low-quality" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="low-quality">Low Quality Issues</TabsTrigger>
            <TabsTrigger value="trends">Performance Trends</TabsTrigger>
            <TabsTrigger value="conversations">Conversation Details</TabsTrigger>
          </TabsList>
          <Button variant="outline" onClick={() => navigate('/admin/conversation-analysis')}>
            <Target className="h-4 w-4 mr-2" />
            Advanced Analysis
          </Button>
        </div>

        <TabsContent value="low-quality">
          <Card>
            <CardHeader>
              <CardTitle>Low Quality Evaluations - Action Required</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {evaluations
                  .filter(evaluation => evaluation.overall_score < 0.6)
                  .slice(0, 10)
                  .map((evaluation) => (
                    <div key={evaluation.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <div>
                            <span className="font-medium">Contact: {evaluation.phone_number}</span>
                            <span className="text-sm text-muted-foreground ml-4">
                              {new Date(evaluation.evaluated_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">
                            Score: {evaluation.overall_score.toFixed(2)}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => {
                            // Navigate to detailed conversation view
                            navigate(`/admin/conversation/${evaluation.phone_number}?evaluation=${evaluation.id}`);
                          }}>
                            Investigate
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="text-center p-2 border rounded">
                          <div className="text-xs text-muted-foreground">Style</div>
                          <div className={`font-medium ${evaluation.style_score < 0.6 ? 'text-red-600' : ''}`}>
                            {evaluation.style_score.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center p-2 border rounded">
                          <div className="text-xs text-muted-foreground">Clarity</div>
                          <div className={`font-medium ${evaluation.clarity_score < 0.6 ? 'text-red-600' : ''}`}>
                            {evaluation.clarity_score.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center p-2 border rounded">
                          <div className="text-xs text-muted-foreground">Helpfulness</div>
                          <div className={`font-medium ${evaluation.helpfulness_score < 0.6 ? 'text-red-600' : ''}`}>
                            {evaluation.helpfulness_score.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      
                      {evaluation.evaluation_notes && (
                        <div className="bg-muted/30 p-3 rounded text-sm">
                          <div className="font-medium text-xs text-muted-foreground mb-1">QUALITY ISSUES:</div>
                          {evaluation.evaluation_notes}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                        <span>Model: {evaluation.model_used}</span>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                          <span>Requires Review</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends & Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Score Improvement Opportunities</h4>
                  <div className="space-y-3">
                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Style Consistency</span>
                        <span className="text-sm font-medium text-orange-600">Needs Work</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Inconsistent tone across conversations
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Response Clarity</span>
                        <span className="text-sm font-medium text-green-600">Good</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Clear and understandable responses
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Helpfulness</span>
                        <span className="text-sm font-medium text-yellow-600">Moderate</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Sometimes lacks actionable guidance
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Quality Gate History</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Response Time</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Passed (99.2%)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm">Success Rate</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Warning (87.5%)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Error Rate</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Passed (2.1%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversation Evaluations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {evaluations.slice(0, 15).map((evaluation) => (
                  <div key={evaluation.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        evaluation.overall_score >= 0.8 ? 'bg-green-500' :
                        evaluation.overall_score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="font-medium text-sm">{evaluation.phone_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(evaluation.evaluated_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {(evaluation.overall_score * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {evaluation.model_used}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => {
                        navigate(`/admin/conversation/${evaluation.phone_number}?evaluation=${evaluation.id}`);
                      }}>
                        View
                      </Button>
                    </div>
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