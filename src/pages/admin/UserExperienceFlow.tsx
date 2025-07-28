import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserJourneyMap } from '@/components/UserJourneyMap';
import { supabase } from '@/integrations/supabase/client';
import { Phone, MessageSquare, Brain, Settings, Users, TrendingUp } from 'lucide-react';

interface AgentPerformance {
  agent_code: string;
  total_messages: number;
  avg_response_time: number;
  satisfaction_rate: number;
  error_rate: number;
}

interface ConversationAnalytics {
  phone_number: string;
  total_messages: number;
  user_messages: number;
  agent_messages: number;
  avg_response_time_ms: number;
  satisfaction_rating?: number;
  flow_completed: boolean;
  last_message_at: string;
}

export default function UserExperienceFlow() {
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [conversationAnalytics, setConversationAnalytics] = useState<ConversationAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch conversation analytics
      const { data: analytics } = await supabase
        .from('conversation_analytics')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(50);

      setConversationAnalytics(analytics || []);

      // Fetch agent execution logs for performance metrics
      const { data: executionLogs } = await supabase
        .from('agent_execution_log')
        .select('*')
        .eq('success_status', true)
        .order('timestamp', { ascending: false })
        .limit(100);

      // Calculate agent performance metrics
      const performanceMap = new Map<string, any>();
      executionLogs?.forEach(log => {
        const agent = log.function_name || 'unknown';
        if (!performanceMap.has(agent)) {
          performanceMap.set(agent, {
            agent_code: agent,
            total_messages: 0,
            total_response_time: 0,
            error_count: 0
          });
        }
        
        const perf = performanceMap.get(agent);
        perf.total_messages++;
        perf.total_response_time += log.execution_time_ms || 0;
      });

      const performance = Array.from(performanceMap.values()).map(perf => ({
        ...perf,
        avg_response_time: perf.total_response_time / perf.total_messages,
        satisfaction_rate: 85, // Mock data - would be calculated from actual ratings
        error_rate: 2.5 // Mock data - would be calculated from error logs
      }));

      setAgentPerformance(performance);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const testAIAgent = async () => {
    try {
      const testMessage = {
        from: "250788767816",
        text: "Hello, I need a ride to Kigali",
        message_id: crypto.randomUUID(),
        contact_name: "Test User",
        timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase.functions.invoke('unified-ai-orchestrator', {
        body: testMessage
      });

      if (error) {
        console.error('AI Agent test failed:', error);
        alert('AI Agent test failed: ' + error.message);
      } else {
        console.log('AI Agent test successful:', data);
        alert('AI Agent test successful! Check logs for details.');
      }
    } catch (error) {
      console.error('Error testing AI agent:', error);
      alert('Error testing AI agent: ' + error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Experience & AI Agents</h1>
          <p className="text-muted-foreground">
            Monitor user journeys, conversation flows, and AI agent performance
          </p>
        </div>
        <Button onClick={testAIAgent} className="bg-green-600 hover:bg-green-700">
          <Brain className="mr-2 h-4 w-4" />
          Test AI Agent
        </Button>
      </div>

      <Tabs defaultValue="journeys" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="journeys">User Journeys</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>

        <TabsContent value="journeys" className="space-y-4">
          <UserJourneyMap />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{conversationAnalytics.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active user sessions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(conversationAnalytics.reduce((acc, conv) => acc + conv.avg_response_time_ms, 0) / conversationAnalytics.length / 1000)}s
                </div>
                <p className="text-xs text-muted-foreground">
                  Average AI response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flow Completion</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((conversationAnalytics.filter(c => c.flow_completed).length / conversationAnalytics.length) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Completed conversation flows
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Conversation Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversationAnalytics.slice(0, 10).map((analytics) => (
                  <div key={analytics.phone_number} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Phone className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="font-medium">{analytics.phone_number}</p>
                        <p className="text-sm text-gray-600">
                          {analytics.total_messages} messages • {Math.round(analytics.avg_response_time_ms / 1000)}s avg response
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {analytics.satisfaction_rating && (
                        <Badge variant="outline">
                          {analytics.satisfaction_rating}/5 ⭐
                        </Badge>
                      )}
                      <Badge variant={analytics.flow_completed ? "default" : "secondary"}>
                        {analytics.flow_completed ? "Completed" : "In Progress"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Agent Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentPerformance.map((agent) => (
                  <div key={agent.agent_code} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{agent.agent_code}</h3>
                      <Badge variant="outline">{agent.total_messages} messages</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Avg Response Time</p>
                        <p className="font-medium">{Math.round(agent.avg_response_time)}ms</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Satisfaction Rate</p>
                        <p className="font-medium">{agent.satisfaction_rate}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Error Rate</p>
                        <p className="font-medium">{agent.error_rate}%</p>
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
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversationAnalytics.map((conv) => (
                  <div key={conv.phone_number} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span className="font-medium">{conv.phone_number}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(conv.last_message_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Messages</p>
                        <p className="font-medium">{conv.total_messages}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">User Messages</p>
                        <p className="font-medium">{conv.user_messages}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Agent Messages</p>
                        <p className="font-medium">{conv.agent_messages}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Response Time</p>
                        <p className="font-medium">{Math.round(conv.avg_response_time_ms / 1000)}s</p>
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