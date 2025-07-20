import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function MessagingCampaigns() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [conversationsResult, messagesResult, campaignsResult] = await Promise.all([
        supabase.from('conversations').select('*').limit(50),
        supabase.from('conversation_messages').select('*').limit(100),
        supabase.from('campaign_messages').select('*').limit(50)
      ]);

      setConversations(conversationsResult.data || []);
      setMessages(messagesResult.data || []);
      setCampaigns(campaignsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'sent': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'delivered': return 'bg-green-600';
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
        <h1 className="text-3xl font-bold">Messaging & Campaigns</h1>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Active Conversations</p>
                <p className="text-2xl font-bold">
                  {conversations.filter(c => c.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Send className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Messages Today</p>
                <p className="text-2xl font-bold">
                  {messages.filter(m => 
                    new Date(m.created_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Campaign Reach</p>
                <p className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'delivered').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Response Rate</p>
                <p className="text-2xl font-bold">87%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="conversations" className="w-full">
        <TabsList>
          <TabsTrigger value="conversations">Live Conversations</TabsTrigger>
          <TabsTrigger value="campaigns">Marketing Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Active Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversations.map((conversation) => (
                  <div key={conversation.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(conversation.status)}>
                            {conversation.status}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {conversation.contact_phone}
                          </span>
                          <span className="text-sm text-gray-500">
                            {conversation.channel}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Messages: {conversation.message_count || 0}
                          {conversation.conversation_duration_minutes && (
                            <span className="ml-4">
                              Duration: {conversation.conversation_duration_minutes}m
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          Started: {new Date(conversation.started_at).toLocaleString()}
                          {conversation.handoff_requested && (
                            <Badge variant="outline" className="ml-2">
                              Handoff Requested
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Chat
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            To: {campaign.phone_number}
                          </span>
                        </div>
                        <div className="text-sm">
                          {campaign.message_content?.substring(0, 100)}
                          {campaign.message_content?.length > 100 && '...'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Scheduled: {new Date(campaign.scheduled_for).toLocaleString()}
                          {campaign.sent_at && (
                            <span className="ml-4">
                              Sent: {new Date(campaign.sent_at).toLocaleString()}
                            </span>
                          )}
                          {campaign.delivered_at && (
                            <span className="ml-4">
                              Delivered: {new Date(campaign.delivered_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Message Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Messages</span>
                    <span className="font-bold">{messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Agent Messages</span>
                    <span className="font-bold">
                      {messages.filter(m => m.sender === 'agent').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>User Messages</span>
                    <span className="font-bold">
                      {messages.filter(m => m.sender === 'user').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Campaigns</span>
                    <span className="font-bold">{campaigns.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivered</span>
                    <span className="font-bold">
                      {campaigns.filter(c => c.status === 'delivered').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed</span>
                    <span className="font-bold">
                      {campaigns.filter(c => c.status === 'failed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response Rate</span>
                    <span className="font-bold">
                      {campaigns.filter(c => c.responded_at).length > 0 
                        ? Math.round((campaigns.filter(c => c.responded_at).length / campaigns.filter(c => c.status === 'delivered').length) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}