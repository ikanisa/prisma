import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Phone, MessageCircle, Users, TrendingUp, AlertCircle } from 'lucide-react';

interface UserJourney {
  phone_number: string;
  user_type: string;
  conversation_count: number;
  last_interaction: string;
  flow_status: string;
  satisfaction_rating?: number;
}

interface ConversationFlow {
  flow_name: string;
  current_step: string;
  status: string;
  phone_number: string;
  started_at: string;
  completed_at?: string;
}

export const UserJourneyMap = () => {
  const [journeys, setJourneys] = useState<UserJourney[]>([]);
  const [flows, setFlows] = useState<ConversationFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeFlows: 0,
    completionRate: 0,
    avgSatisfaction: 0
  });

  useEffect(() => {
    fetchUserJourneys();
    fetchConversationFlows();
  }, []);

  const fetchUserJourneys = async () => {
    try {
      // Get user memory data to build journey insights
      const { data: memoryData } = await supabase
        .from('agent_memory')
        .select('user_id, memory_type, memory_value')
        .in('memory_type', ['user_type', 'conversation_count', 'last_interaction']);

      // Get conversation analytics
      const { data: analyticsData } = await supabase
        .from('conversation_analytics')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(50);

      // Group memory data by user
      const userMemoryMap = new Map();
      memoryData?.forEach(item => {
        if (!userMemoryMap.has(item.user_id)) {
          userMemoryMap.set(item.user_id, {});
        }
        userMemoryMap.get(item.user_id)[item.memory_type] = item.memory_value;
      });

      // Build journey data
      const journeyData: UserJourney[] = Array.from(userMemoryMap.entries()).map(([phone, memory]: [string, any]) => ({
        phone_number: phone,
        user_type: memory.user_type || 'unknown',
        conversation_count: parseInt(memory.conversation_count || '0'),
        last_interaction: memory.last_interaction || new Date().toISOString(),
        flow_status: 'active',
        satisfaction_rating: analyticsData?.find(a => a.phone_number === phone)?.satisfaction_rating
      }));

      setJourneys(journeyData);
      
      // Calculate analytics
      setAnalytics({
        totalUsers: journeyData.length,
        activeFlows: journeyData.filter(j => j.conversation_count > 0).length,
        completionRate: (journeyData.filter(j => j.satisfaction_rating && j.satisfaction_rating >= 4).length / journeyData.length) * 100,
        avgSatisfaction: journeyData.reduce((acc, j) => acc + (j.satisfaction_rating || 0), 0) / journeyData.length
      });

    } catch (error) {
      console.error('Error fetching user journeys:', error);
    }
  };

  const fetchConversationFlows = async () => {
    try {
      const { data } = await supabase
        .from('conversation_flows')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      setFlows(data || []);
    } catch (error) {
      console.error('Error fetching conversation flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'driver': return 'bg-blue-100 text-blue-800';
      case 'passenger': return 'bg-green-100 text-green-800';
      case 'farmer': return 'bg-yellow-100 text-yellow-800';
      case 'shopper': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFlowStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'abandoned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{analytics.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Flows</p>
                <p className="text-2xl font-bold">{analytics.activeFlows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Satisfaction</p>
                <p className="text-2xl font-bold">{analytics.avgSatisfaction.toFixed(1)}/5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Journeys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            User Journeys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {journeys.slice(0, 10).map((journey) => (
              <div key={journey.phone_number} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{journey.phone_number}</p>
                    <div className="flex items-center space-x-2">
                      <Badge className={getUserTypeColor(journey.user_type)}>
                        {journey.user_type}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {journey.conversation_count} conversations
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {journey.satisfaction_rating && (
                    <div className="text-center">
                      <p className="text-sm font-medium">{journey.satisfaction_rating}/5</p>
                      <p className="text-xs text-gray-500">satisfaction</p>
                    </div>
                  )}
                  <Badge className={getFlowStatusColor(journey.flow_status)}>
                    {journey.flow_status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Conversation Flows */}
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
                    <p className="text-sm text-gray-600">{flow.phone_number}</p>
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

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button onClick={() => { fetchUserJourneys(); fetchConversationFlows(); }}>
          Refresh Data
        </Button>
      </div>
    </div>
  );
};