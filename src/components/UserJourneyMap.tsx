import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Phone, MessageCircle, Users, TrendingUp, AlertCircle, Map as MapIcon, Brain, Target, Activity, Zap } from 'lucide-react';

interface UserJourney {
  phone_number: string;
  user_type: string;
  conversation_count: number;
  last_interaction: string;
  flow_status: string;
  satisfaction_rating?: number;
  success_probability?: number;
  risk_factors?: string[];
  next_best_actions?: string[];
}

interface ConversationFlow {
  flow_name: string;
  current_step: string;
  status: string;
  phone_number: string;
  started_at: string;
  completed_at?: string;
}

interface DynamicPattern {
  id: string;
  pattern_name: string;
  user_types: string[];
  flow_steps: string[];
  success_criteria: Record<string, any>;
  optimization_suggestions: string[];
  confidence_score: number;
  is_active: boolean;
}

interface RealTimeInsights {
  completion_rate: number;
  abandonment_points: string[];
  optimization_opportunities: string[];
  active_journeys_count: number;
  trending_patterns: string[];
}

export const UserJourneyMap = () => {
  const [journeys, setJourneys] = useState<UserJourney[]>([]);
  const [flows, setFlows] = useState<ConversationFlow[]>([]);
  const [patterns, setPatterns] = useState<DynamicPattern[]>([]);
  const [realTimeInsights, setRealTimeInsights] = useState<RealTimeInsights>({
    completion_rate: 0,
    abandonment_points: [],
    optimization_opportunities: [],
    active_journeys_count: 0,
    trending_patterns: []
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeFlows: 0,
    completionRate: 0,
    avgSatisfaction: 0
  });

  useEffect(() => {
    fetchUserJourneys();
    fetchConversationFlows();
    fetchDynamicPatterns();
    fetchRealTimeInsights();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchRealTimeInsights();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchUserJourneys = async () => {
    try {
      // Use existing users table for journey data
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('last_active', { ascending: false })
        .limit(50);

      // Create mock journey data based on users
      const journeyData: UserJourney[] = usersData?.map((user, index) => ({
        phone_number: user.phone || `+250${index}`,
        user_type: ['driver', 'passenger', 'farmer', 'shopper'][index % 4],
        conversation_count: Math.floor(Math.random() * 50) + 1,
        last_interaction: user.last_active || new Date().toISOString(),
        flow_status: ['active', 'completed', 'at_risk'][index % 3],
        satisfaction_rating: Math.floor(Math.random() * 2) + 4, // 4-5 rating
        success_probability: Math.random() * 0.4 + 0.6, // 0.6-1.0
        risk_factors: index % 3 === 0 ? ['low_engagement'] : [],
        next_best_actions: ['upsell_premium', 'increase_usage'][index % 2] ? ['upsell_premium'] : ['increase_usage']
      })) || [];

      setJourneys(journeyData);
      
      // Calculate analytics
      setAnalytics({
        totalUsers: journeyData.length,
        activeFlows: journeyData.filter(j => j.conversation_count > 0).length,
        completionRate: journeyData.length > 0 
          ? (journeyData.filter(j => j.success_probability && j.success_probability >= 0.7).length / journeyData.length) * 100 
          : 0,
        avgSatisfaction: journeyData.length > 0 
          ? journeyData.reduce((acc, j) => acc + (j.satisfaction_rating || 0), 0) / journeyData.length 
          : 0
      });

    } catch (error) {
      console.error('Error fetching user journeys:', error);
    }
  };

  const fetchConversationFlows = async () => {
    try {
      // Use events table to get conversation flow data
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('event_type', 'conversation_state')
        .order('created_at', { ascending: false })
        .limit(20);

      // Transform events to conversation flow format
      const transformedFlows = data?.map(event => {
        const eventData = event.event_data as any;
        return {
          flow_name: eventData?.flow_name || 'Unknown Flow',
          current_step: eventData?.current_step || 'Unknown Step',
          status: eventData?.status || 'active',
          phone_number: eventData?.phone_number || 'Unknown',
          started_at: event.created_at,
          completed_at: eventData?.completed_at
        };
      }) || [];

      setFlows(transformedFlows);
    } catch (error) {
      console.error('Error fetching conversation flows:', error);
      setFlows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDynamicPatterns = async () => {
    try {
      // Mock patterns until database tables are created
      const mockPatterns: DynamicPattern[] = [
        {
          id: '1',
          pattern_name: 'Payment Flow',
          user_types: ['driver', 'passenger'],
          flow_steps: ['initiate', 'verify', 'complete'],
          success_criteria: {},
          optimization_suggestions: ['Reduce verification time'],
          confidence_score: 0.85,
          is_active: true
        }
      ];
      setPatterns(mockPatterns);
    } catch (error) {
      console.error('Error fetching dynamic patterns:', error);
    }
  };

  const fetchRealTimeInsights = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('dynamic-user-journey-tracker', {
        body: { 
          action: 'real_time_insights',
          time_window_minutes: 30 
        }
      });

      if (error) throw error;

      if (data.success) {
        setRealTimeInsights({
          completion_rate: data.real_time_insights.completion_rate || 0,
          abandonment_points: data.real_time_insights.abandonment_points || [],
          optimization_opportunities: data.real_time_insights.optimization_opportunities || [],
          active_journeys_count: data.active_journeys_count || 0,
          trending_patterns: data.real_time_insights.trending_patterns || []
        });
      }
    } catch (error) {
      console.error('Error fetching real-time insights:', error);
    }
  };

  const triggerLearningUpdate = async () => {
    try {
      setProcessing(true);
      
      // Mock recent docs until tables are created
      const recentDocs = [];

      for (const doc of recentDocs || []) {
        await supabase.functions.invoke('dynamic-learning-processor', {
          body: { 
            documentId: doc.id,
            action: 'generate_journey_patterns'
          }
        });
      }

      // Refresh all data
      await Promise.all([
        fetchUserJourneys(),
        fetchDynamicPatterns(),
        fetchRealTimeInsights()
      ]);

    } catch (error) {
      console.error('Error triggering learning update:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'driver': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'passenger': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'farmer': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'shopper': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getFlowStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'at_risk': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'abandoned': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getSuccessProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return 'text-green-600';
    if (probability >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{analytics.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Journeys</p>
                <p className="text-2xl font-bold">{realTimeInsights.active_journeys_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{(realTimeInsights.completion_rate * 100).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Satisfaction</p>
                <p className="text-2xl font-bold">{analytics.avgSatisfaction.toFixed(1)}/5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">AI Patterns</p>
                <p className="text-2xl font-bold">{patterns.filter(p => p.confidence_score > 0.8).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Button 
            onClick={triggerLearningUpdate} 
            disabled={processing}
            variant="outline"
          >
            {processing ? (
              <Zap className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Update Learning
          </Button>
          <Button 
            onClick={() => { 
              fetchUserJourneys(); 
              fetchConversationFlows(); 
              fetchDynamicPatterns();
              fetchRealTimeInsights();
            }}
            variant="outline"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
        <Badge variant="outline" className="text-sm">
          Last updated: {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="journeys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="journeys">Active Journeys</TabsTrigger>
          <TabsTrigger value="patterns">AI Patterns</TabsTrigger>
          <TabsTrigger value="flows">Conversation Flows</TabsTrigger>
          <TabsTrigger value="insights">Real-time Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="journeys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapIcon className="h-5 w-5" />
                Dynamic User Journeys with AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {journeys.slice(0, 10).map((journey) => (
                  <div key={journey.phone_number} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{journey.phone_number}</p>
                          <div className="flex items-center space-x-2">
                            <Badge className={getUserTypeColor(journey.user_type)}>
                              {journey.user_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {journey.conversation_count} conversations
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {journey.success_probability && (
                          <div className="text-center">
                            <p className={`text-sm font-medium ${getSuccessProbabilityColor(journey.success_probability)}`}>
                              {(journey.success_probability * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-muted-foreground">success</p>
                          </div>
                        )}
                        {journey.satisfaction_rating && (
                          <div className="text-center">
                            <p className="text-sm font-medium">{journey.satisfaction_rating}/5</p>
                            <p className="text-xs text-muted-foreground">satisfaction</p>
                          </div>
                        )}
                        <Badge className={getFlowStatusColor(journey.flow_status)}>
                          {journey.flow_status}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* AI Insights Section */}
                    {(journey.risk_factors?.length > 0 || journey.next_best_actions?.length > 0) && (
                      <div className="space-y-2">
                        {journey.risk_factors && journey.risk_factors.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-orange-600 mb-1">Risk Factors:</p>
                            <div className="flex flex-wrap gap-1">
                              {journey.risk_factors.slice(0, 3).map((risk, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs text-orange-600">
                                  {risk}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {journey.next_best_actions && journey.next_best_actions.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-blue-600 mb-1">Next Best Actions:</p>
                            <div className="flex flex-wrap gap-1">
                              {journey.next_best_actions.slice(0, 2).map((action, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs text-blue-600">
                                  {action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Dynamic AI Journey Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patterns.map((pattern) => (
                  <div key={pattern.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{pattern.pattern_name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          {pattern.user_types.map((type, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          {(pattern.confidence_score * 100).toFixed(0)}% confidence
                        </div>
                        <Badge variant={pattern.is_active ? 'default' : 'secondary'}>
                          {pattern.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    
                    {pattern.flow_steps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Flow Steps:</p>
                        <div className="flex items-center space-x-2 overflow-x-auto">
                          {pattern.flow_steps.slice(0, 5).map((step, idx) => (
                            <React.Fragment key={idx}>
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                {step}
                              </Badge>
                              {idx < pattern.flow_steps.length - 1 && idx < 4 && (
                                <span className="text-muted-foreground">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {pattern.optimization_suggestions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-1">Optimization Suggestions:</p>
                        <p className="text-xs text-muted-foreground">
                          {pattern.optimization_suggestions[0]}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flows" className="space-y-4">

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Active Conversation Flows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {flows.map((flow) => (
                  <div key={`${flow.phone_number}-${flow.flow_name}`} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{flow.flow_name}</p>
                        <p className="text-sm text-muted-foreground">{flow.phone_number}</p>
                      </div>
                      <Badge className={getFlowStatusColor(flow.status)}>
                        {flow.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current Step: {flow.current_step}</span>
                        <span>Started: {new Date(flow.started_at).toLocaleDateString()}</span>
                      </div>
                      <Progress value={flow.status === 'completed' ? 100 : 60} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Real-time Journey Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Performance Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Completion Rate</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={realTimeInsights.completion_rate * 100} className="w-20 h-2" />
                          <span className="text-sm font-medium">
                            {(realTimeInsights.completion_rate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Active Journeys</span>
                        <span className="text-sm font-medium">{realTimeInsights.active_journeys_count}</span>
                      </div>
                    </div>
                  </div>

                  {realTimeInsights.trending_patterns.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Trending Patterns</h4>
                      <div className="space-y-2">
                        {realTimeInsights.trending_patterns.slice(0, 3).map((pattern, idx) => (
                          <Badge key={idx} variant="outline" className="mr-2">
                            {pattern}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {realTimeInsights.abandonment_points.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-orange-600">Abandonment Points</h4>
                      <div className="space-y-2">
                        {realTimeInsights.abandonment_points.slice(0, 3).map((point, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm">{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {realTimeInsights.optimization_opportunities.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-green-600">Optimization Opportunities</h4>
                      <div className="space-y-2">
                        {realTimeInsights.optimization_opportunities.slice(0, 3).map((opportunity, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{opportunity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};