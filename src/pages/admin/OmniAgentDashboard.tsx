import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, Brain, Activity, MessageSquare, TrendingUp, Settings, FileText, BookOpen, Shield, Target, Zap, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface OmniAgentSkill {
  id: string;
  skill_name: string;
  skill_description: string;
  usage_count: number;
  last_used_at: string;
  is_active: boolean;
}

interface OmniAgentMetric {
  id: string;
  metric_type: string;
  skill_name: string;
  metric_value: number;
  timestamp: string;
  metadata: any;
}

interface OmniAgentConversation {
  id: string;
  phone_number: string;
  message_text: string;
  sender: string;
  skill_used: string;
  intent_detected: string;
  confidence_score: number;
  created_at: string;
}

interface QualityMetrics {
  overall_health: number;
  performance_score: number;
  conversation_score: number;
  critical_issues: number;
  last_audit: string;
}

interface LearningInsights {
  key_learnings: string[];
  improvement_areas: string[];
  confidence_score: number;
  last_learning_cycle: string;
}

export default function OmniAgentDashboard() {
  const [skills, setSkills] = useState<OmniAgentSkill[]>([]);
  const [metrics, setMetrics] = useState<OmniAgentMetric[]>([]);
  const [conversations, setConversations] = useState<OmniAgentConversation[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [learningInsights, setLearningInsights] = useState<LearningInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [learningLoading, setLearningLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchOmniAgentData();
    fetchQualityMetrics();
    fetchLearningInsights();
  }, []);

  const fetchOmniAgentData = async () => {
    try {
      const [skillsResult, metricsResult, conversationsResult] = await Promise.all([
        supabase.from('omni_agent_skills').select('*').order('usage_count', { ascending: false }),
        supabase.from('omni_agent_metrics').select('*').order('timestamp', { ascending: false }).limit(50),
        supabase.from('omni_agent_conversations').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      setSkills(skillsResult.data || []);
      setMetrics(metricsResult.data || []);
      setConversations(conversationsResult.data || []);
    } catch (error) {
      console.error('Error fetching omni-agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQualityMetrics = async () => {
    try {
      setQualityLoading(true);
      
      const { data, error } = await supabase.functions.invoke('agent-quality-monitor', {
        body: { action: 'get_quality_dashboard', period: '24h' }
      });

      if (error) throw error;

      if (data?.success) {
        setQualityMetrics(data.summary);
      }
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
      toast({
        title: "Quality Metrics Error",
        description: "Failed to fetch quality metrics. Using demo data.",
        variant: "destructive"
      });
      
      // Fallback demo data
      setQualityMetrics({
        overall_health: 0.85,
        performance_score: 0.78,
        conversation_score: 0.82,
        critical_issues: 2,
        last_audit: new Date().toISOString()
      });
    } finally {
      setQualityLoading(false);
    }
  };

  const fetchLearningInsights = async () => {
    try {
      setLearningLoading(true);
      
      const { data, error } = await supabase.functions.invoke('agent-continuous-learning', {
        body: { action: 'generate_insights' }
      });

      if (error) throw error;

      if (data) {
        setLearningInsights({
          key_learnings: data.key_learnings || [],
          improvement_areas: data.improvement_opportunities || [],
          confidence_score: data.confidence_score || 0.75,
          last_learning_cycle: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching learning insights:', error);
      toast({
        title: "Learning Insights Error", 
        description: "Failed to fetch learning insights. Using demo data.",
        variant: "destructive"
      });
      
      // Fallback demo data
      setLearningInsights({
        key_learnings: [
          "Users prefer shorter responses for payment requests",
          "Transport bookings are most common in the morning",
          "Rwanda cultural context improves engagement by 23%"
        ],
        improvement_areas: [
          "Response clarity for complex queries",
          "Context retention across conversations",
          "Confidence scoring for edge cases"
        ],
        confidence_score: 0.75,
        last_learning_cycle: new Date().toISOString()
      });
    } finally {
      setLearningLoading(false);
    }
  };

  const runQualityAudit = async () => {
    try {
      setQualityLoading(true);
      toast({
        title: "Quality Audit Started",
        description: "Running comprehensive quality audit..."
      });

      const { data, error } = await supabase.functions.invoke('agent-quality-monitor', {
        body: { action: 'run_full_audit', period: '24h' }
      });

      if (error) throw error;

      await fetchQualityMetrics();
      
      toast({
        title: "Quality Audit Complete",
        description: `Overall score: ${Math.round((data?.overall_score || 0) * 100)}%`
      });
    } catch (error) {
      console.error('Error running quality audit:', error);
      toast({
        title: "Audit Failed",
        description: "Quality audit failed to complete",
        variant: "destructive"
      });
    } finally {
      setQualityLoading(false);
    }
  };

  const runLearningCycle = async () => {
    try {
      setLearningLoading(true);
      toast({
        title: "Learning Cycle Started",
        description: "Running continuous learning cycle..."
      });

      const { data, error } = await supabase.functions.invoke('agent-continuous-learning', {
        body: { action: 'run_learning_cycle' }
      });

      if (error) throw error;

      await fetchLearningInsights();
      
      toast({
        title: "Learning Cycle Complete",
        description: `Processed ${data?.results?.length || 0} learning modules`
      });
    } catch (error) {
      console.error('Error running learning cycle:', error);
      toast({
        title: "Learning Failed",
        description: "Learning cycle failed to complete",
        variant: "destructive"
      });
    } finally {
      setLearningLoading(false);
    }
  };

  const getSkillColor = (skillName: string) => {
    const colors = {
      PaymentSkill: 'bg-green-500',
      TransportSkill: 'bg-blue-500',
      ListingsSkill: 'bg-purple-500',
      CommerceSkill: 'bg-orange-500',
      DataSyncSkill: 'bg-yellow-500',
      AdminSupportSkill: 'bg-gray-500'
    };
    return colors[skillName as keyof typeof colors] || 'bg-gray-400';
  };

  const totalConversations = conversations.length;
  const activeSkills = skills.filter(s => s.is_active).length;
  const totalUsage = skills.reduce((sum, skill) => sum + skill.usage_count, 0);

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
        <div>
          <h1 className="text-3xl font-bold">Omni Agent Dashboard</h1>
          <p className="text-muted-foreground">
            Unified AI agent managing all easyMO services
          </p>
        </div>
        <Button onClick={() => navigate('/admin/omni-agent/configure')}>
          <Settings className="mr-2 h-4 w-4" />
          Configure Agent
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Active Skills</p>
                <p className="text-2xl font-bold">{activeSkills}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Conversations</p>
                <p className="text-2xl font-bold">{totalConversations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Usage</p>
                <p className="text-2xl font-bold">{totalUsage}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {conversations.length > 0 
                    ? Math.round(conversations.reduce((sum, c) => sum + (c.confidence_score || 0), 0) / conversations.length * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Status Alert */}
      {qualityMetrics && qualityMetrics.critical_issues > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {qualityMetrics.critical_issues} critical issues detected in agent performance. 
            <Button variant="link" className="p-0 h-auto ml-2" onClick={runQualityAudit}>
              Run Quality Audit
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quality">Quality Monitor</TabsTrigger>
          <TabsTrigger value="learning">Continuous Learning</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="persona">Persona</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6">
            {/* Enhanced Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">System Health</p>
                        <p className="text-2xl font-bold">
                          {qualityMetrics ? Math.round(qualityMetrics.overall_health * 100) : '--'}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        qualityMetrics && qualityMetrics.overall_health > 0.8 
                          ? 'bg-green-100 text-green-800' 
                          : qualityMetrics && qualityMetrics.overall_health > 0.6
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {qualityMetrics && qualityMetrics.overall_health > 0.8 ? 'Excellent' : 
                         qualityMetrics && qualityMetrics.overall_health > 0.6 ? 'Good' : 'Needs Attention'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Learning Score</p>
                      <p className="text-2xl font-bold">
                        {learningInsights ? Math.round(learningInsights.confidence_score * 100) : '--'}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Response Quality</p>
                      <p className="text-2xl font-bold">
                        {qualityMetrics ? Math.round(qualityMetrics.conversation_score * 100) : '--'}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Critical Issues</p>
                      <p className="text-2xl font-bold">
                        {qualityMetrics?.critical_issues || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={runQualityAudit} 
                    disabled={qualityLoading}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Shield className="h-6 w-6 mb-2" />
                    {qualityLoading ? "Running..." : "Quality Audit"}
                  </Button>
                  
                  <Button 
                    onClick={runLearningCycle} 
                    disabled={learningLoading}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Brain className="h-6 w-6 mb-2" />
                    {learningLoading ? "Processing..." : "Learning Cycle"}
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/admin/omni-agent/configure')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Settings className="h-6 w-6 mb-2" />
                    Configure Agent
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Key Learnings */}
            {learningInsights && learningInsights.key_learnings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Recent Key Learnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {learningInsights.key_learnings.slice(0, 3).map((learning, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                        <p className="text-sm">{learning}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="quality">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Quality Monitor</h3>
                <p className="text-muted-foreground">Comprehensive agent performance analysis</p>
              </div>
              <Button onClick={runQualityAudit} disabled={qualityLoading}>
                <Shield className="mr-2 h-4 w-4" />
                {qualityLoading ? "Running Audit..." : "Run Quality Audit"}
              </Button>
            </div>

            {qualityMetrics ? (
              <div className="grid gap-6">
                {/* Quality Scores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Overall Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-2">
                        {Math.round(qualityMetrics.overall_health * 100)}%
                      </div>
                      <Progress value={qualityMetrics.overall_health * 100} className="h-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Performance Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-2">
                        {Math.round(qualityMetrics.performance_score * 100)}%
                      </div>
                      <Progress value={qualityMetrics.performance_score * 100} className="h-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Conversation Quality</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-2">
                        {Math.round(qualityMetrics.conversation_score * 100)}%
                      </div>
                      <Progress value={qualityMetrics.conversation_score * 100} className="h-2" />
                    </CardContent>
                  </Card>
                </div>

                {/* Issues & Alerts */}
                {qualityMetrics.critical_issues > 0 && (
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-800">
                        <AlertTriangle className="h-5 w-5" />
                        Critical Issues Detected
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-orange-800">
                          {qualityMetrics.critical_issues} critical issues require immediate attention. 
                          Run a full quality audit for detailed analysis.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quality Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quality Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="font-medium text-green-800">Strengths</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">High response accuracy</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Cultural context awareness</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Fast response times</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-medium text-orange-800">Areas for Improvement</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm">Complex query handling</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm">Memory consolidation</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm">Edge case confidence</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No quality metrics available. Run a quality audit to get started.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="learning">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Continuous Learning</h3>
                <p className="text-muted-foreground">Agent learning insights and improvement tracking</p>
              </div>
              <Button onClick={runLearningCycle} disabled={learningLoading}>
                <Brain className="mr-2 h-4 w-4" />
                {learningLoading ? "Processing..." : "Run Learning Cycle"}
              </Button>
            </div>

            {learningInsights ? (
              <div className="grid gap-6">
                {/* Learning Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Learning Confidence Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold">
                        {Math.round(learningInsights.confidence_score * 100)}%
                      </div>
                      <div className="flex-1">
                        <Progress value={learningInsights.confidence_score * 100} className="h-3" />
                        <p className="text-sm text-muted-foreground mt-1">
                          Last updated: {new Date(learningInsights.last_learning_cycle).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Learnings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Key Learnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {learningInsights.key_learnings.map((learning, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{learning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Improvement Areas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                      Improvement Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {learningInsights.improvement_areas.map((area, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-orange-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{area}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Learning Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Learning Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="outline" onClick={() => navigate('/admin/omni-agent/learning')}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        View Learning History
                      </Button>
                      <Button variant="outline" onClick={() => navigate('/admin/omni-agent/configure')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Update Configuration
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No learning insights available. Run a learning cycle to get started.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="persona">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Agent Persona Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current Persona Summary */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Current Persona</h4>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                      <div><strong>Name:</strong> Aline - easyMO Assistant</div>
                      <div><strong>Mission:</strong> Deliver fast, accurate, context-aware help for Rwanda users</div>
                      <div><strong>Languages:</strong> English, Kinyarwanda, French, Swahili</div>
                      <div><strong>Cultural Focus:</strong> Rwanda-first context and language sensitivity</div>
                    </div>
                  </div>
                  
                  {/* Core Capabilities */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Core Capabilities</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['Payments', 'Transport', 'Commerce', 'Listings', 'Support'].map((capability) => (
                        <Badge key={capability} variant="secondary" className="justify-center">
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button onClick={() => navigate('/admin/omni-agent/persona')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Persona
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Knowledge Base & Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Document Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">150+</div>
                    <div className="text-sm text-green-600">Training Documents</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">5</div>
                    <div className="text-sm text-blue-600">Domain Areas</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700">98%</div>
                    <div className="text-sm text-purple-600">Processing Complete</div>
                  </div>
                </div>
                
                {/* Document Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" onClick={() => navigate('/admin/omni-agent/documents')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Upload New Documents
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/admin/documents')}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    View Knowledge Base
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle>Omni Agent Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map((skill) => (
                  <Card 
                    key={skill.id} 
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => navigate(`/admin/omni-agent/skill/${skill.id}`)}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Badge className={getSkillColor(skill.skill_name)}>
                          {skill.skill_name.replace('Skill', '')}
                        </Badge>
                        <Badge variant={skill.is_active ? "default" : "secondary"}>
                          {skill.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-medium">{skill.skill_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {skill.skill_description}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Usage Count</span>
                          <span className="font-medium">{skill.usage_count}</span>
                        </div>
                        <Progress 
                          value={Math.min((skill.usage_count / Math.max(totalUsage, 1)) * 100, 100)} 
                          className="h-2"
                        />
                        {skill.last_used_at && (
                          <div className="text-xs text-muted-foreground">
                            Last used: {new Date(skill.last_used_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversations.map((conversation) => (
                  <div key={conversation.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{conversation.phone_number}</Badge>
                        <Badge variant="secondary">{conversation.sender}</Badge>
                        {conversation.skill_used && (
                          <Badge className={getSkillColor(conversation.skill_used)}>
                            {conversation.skill_used.replace('Skill', '')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(conversation.created_at).toLocaleString()}
                      </div>
                    </div>
                    <p className="text-sm mb-2">{conversation.message_text}</p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      {conversation.intent_detected && (
                        <span>Intent: {conversation.intent_detected}</span>
                      )}
                      {conversation.confidence_score && (
                        <span>Confidence: {Math.round(conversation.confidence_score * 100)}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.map((metric) => (
                  <div key={metric.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{metric.metric_type}</div>
                        {metric.skill_name && (
                          <div className="text-sm text-muted-foreground">
                            Skill: {metric.skill_name}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{metric.metric_value}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(metric.timestamp).toLocaleDateString()}
                        </div>
                      </div>
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