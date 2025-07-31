import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Shield, Brain, Star, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConversationQuality {
  id: string;
  phone_number: string;
  response_text: string;
  quality_scores: any;
  safety_flags: any;
  confidence_score: number;
  human_feedback: any;
  created_at: string;
}

interface SafetyRule {
  id: string;
  rule_name: string;
  rule_type: string;
  rule_config: any;
  severity: string;
  action: string;
  is_active: boolean;
}

interface QualityMetrics {
  totalResponses: number;
  averageQuality: number;
  safetyViolations: number;
  humanEscalations: number;
}

export default function QualityAssurance() {
  const [qualityData, setQualityData] = useState<ConversationQuality[]>([]);
  const [safetyRules, setSafetyRules] = useState<SafetyRule[]>([]);
  const [metrics, setMetrics] = useState<QualityMetrics>({
    totalResponses: 0,
    averageQuality: 0,
    safetyViolations: 0,
    humanEscalations: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedResponse, setSelectedResponse] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedTimeframe]);

  const fetchData = async () => {
    try {
      const timeFilter = getTimeFilter(selectedTimeframe);
      
      const [qualityResult, rulesResult] = await Promise.all([
        supabase
          .from('conversation_quality')
          .select('*')
          .gte('created_at', timeFilter)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('content_safety_rules')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      const qualityData = qualityResult.data || [];
      setQualityData(qualityData);
      setSafetyRules(rulesResult.data || []);

      // Calculate metrics
      const totalResponses = qualityData.length;
      const averageQuality = totalResponses > 0 
        ? qualityData.reduce((sum, item) => sum + item.confidence_score, 0) / totalResponses 
        : 0;
      const safetyViolations = qualityData.filter(item => 
        Object.values(item.safety_flags).some(flag => flag)
      ).length;
      const humanEscalations = qualityData.filter(item => 
        item.human_feedback && Object.keys(item.human_feedback).length > 0
      ).length;

      setMetrics({
        totalResponses,
        averageQuality,
        safetyViolations,
        humanEscalations
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quality data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeFilter = (timeframe: string): string => {
    const now = new Date();
    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const submitHumanFeedback = async (responseId: string, feedback: any) => {
    try {
      await supabase
        .from('conversation_quality')
        .update({
          human_feedback: feedback
        })
        .eq('id', responseId);

      await fetchData();
      setFeedbackText("");
      setSelectedResponse("");
      
      toast({
        title: "Success",
        description: "Feedback submitted successfully"
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive"
      });
    }
  };

  const createSafetyRule = async (ruleData: any) => {
    try {
      await supabase
        .from('content_safety_rules')
        .insert(ruleData);

      await fetchData();
      
      toast({
        title: "Success",
        description: "Safety rule created successfully"
      });
    } catch (error) {
      console.error('Error creating safety rule:', error);
      toast({
        title: "Error",
        description: "Failed to create safety rule",
        variant: "destructive"
      });
    }
  };

  const toggleSafetyRule = async (ruleId: string, isActive: boolean) => {
    try {
      await supabase
        .from('content_safety_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      await fetchData();
      
      toast({
        title: "Success",
        description: `Safety rule ${isActive ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Error toggling safety rule:', error);
      toast({
        title: "Error",
        description: "Failed to update safety rule",
        variant: "destructive"
      });
    }
  };

  const getQualityColor = (score: number): string => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
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
        <h1 className="text-3xl font-bold">Quality Assurance</h1>
        <div className="flex gap-2">
          <select 
            value={selectedTimeframe} 
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Responses</p>
                <p className="text-2xl font-bold">{metrics.totalResponses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Avg Quality</p>
                <p className={`text-2xl font-bold ${getQualityColor(metrics.averageQuality)}`}>
                  {(metrics.averageQuality * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Safety Violations</p>
                <p className="text-2xl font-bold text-red-600">{metrics.safetyViolations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Human Reviews</p>
                <p className="text-2xl font-bold">{metrics.humanEscalations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="quality" className="w-full">
        <TabsList>
          <TabsTrigger value="quality">Quality Scores</TabsTrigger>
          <TabsTrigger value="safety">Safety Monitoring</TabsTrigger>
          <TabsTrigger value="feedback">Human Feedback</TabsTrigger>
          <TabsTrigger value="rules">Safety Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>Response Quality Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualityData.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{item.phone_number}</Badge>
                          <span className={`font-medium ${getQualityColor(item.confidence_score)}`}>
                            {(item.confidence_score * 100).toFixed(1)}% Quality
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        
                        <p className="text-sm bg-gray-50 p-2 rounded">
                          {item.response_text.substring(0, 200)}...
                        </p>
                        
                        <div className="grid grid-cols-5 gap-2">
                          {Object.entries(item.quality_scores).map(([key, value]) => (
                            <div key={key} className="text-center">
                              <div className="text-xs text-gray-600 capitalize">{key}</div>
                              <div className={`text-sm font-medium ${getQualityColor(value as number)}`}>
                                {((value as number) * 100).toFixed(0)}%
                              </div>
                              <Progress value={(value as number) * 100} className="h-1" />
                            </div>
                          ))}
                        </div>
                        
                        {Object.values(item.safety_flags).some(flag => flag) && (
                          <div className="flex space-x-2">
                            {Object.entries(item.safety_flags).map(([flag, active]) => 
                              active && (
                                <Badge key={flag} variant="destructive" className="text-xs">
                                  {flag}
                                </Badge>
                              )
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedResponse(item.id)}
                        >
                          Add Feedback
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety">
          <Card>
            <CardHeader>
              <CardTitle>Safety Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualityData
                  .filter(item => Object.values(item.safety_flags).some(flag => flag))
                  .map((item) => (
                  <div key={item.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <Badge variant="outline">{item.phone_number}</Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        
                        <p className="text-sm">{item.response_text.substring(0, 200)}...</p>
                        
                        <div className="flex space-x-2">
                          {Object.entries(item.safety_flags).map(([flag, active]) => 
                            active && (
                              <Badge key={flag} variant="destructive" className="text-xs">
                                {flag.replace('_', ' ')}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                      
                      <Button variant="destructive" size="sm">
                        Escalate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle>Human Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedResponse && (
                <div className="mb-6 p-4 border rounded-lg bg-blue-50">
                  <h3 className="font-semibold mb-2">Add Feedback</h3>
                  <Textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Provide detailed feedback on response quality..."
                    className="mb-2"
                  />
                  <div className="flex space-x-2">
                    <Button 
                      size="sm"
                      onClick={() => submitHumanFeedback(selectedResponse, {
                        feedback: feedbackText,
                        rating: 'positive',
                        timestamp: new Date().toISOString()
                      })}
                    >
                      Positive Feedback
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => submitHumanFeedback(selectedResponse, {
                        feedback: feedbackText,
                        rating: 'negative',
                        timestamp: new Date().toISOString()
                      })}
                    >
                      Negative Feedback
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedResponse("");
                        setFeedbackText("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {qualityData
                  .filter(item => item.human_feedback && Object.keys(item.human_feedback).length > 0)
                  .map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{item.phone_number}</Badge>
                        <Badge className={
                          item.human_feedback.rating === 'positive' ? 'bg-green-500' : 'bg-red-500'
                        }>
                          {item.human_feedback.rating}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="text-sm bg-gray-50 p-2 rounded">
                        {item.response_text.substring(0, 150)}...
                      </p>
                      
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="text-sm font-medium">Human Feedback:</div>
                        <div className="text-sm">{item.human_feedback.feedback}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Content Safety Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {safetyRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {rule.is_active ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-gray-400" />
                          )}
                          <h3 className="font-semibold">{rule.rule_name}</h3>
                          <Badge className={getSeverityColor(rule.severity)}>
                            {rule.severity}
                          </Badge>
                          <Badge variant="outline">{rule.rule_type}</Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          Action: <span className="font-medium">{rule.action}</span>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          Config: {JSON.stringify(rule.rule_config)}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          variant={rule.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleSafetyRule(rule.id, !rule.is_active)}
                        >
                          {rule.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
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