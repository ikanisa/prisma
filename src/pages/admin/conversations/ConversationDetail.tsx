import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MessageCircle, User, Bot, Clock, Phone } from "lucide-react";
import { toast } from "sonner";

interface Conversation {
  id: string;
  contact_id: string;
  contact_phone: string;
  status: string;
  channel: string;
  started_at: string;
  ended_at: string;
  message_count: number;
  conversation_duration_minutes: number;
  handoff_requested: boolean;
  handoff_reason: string;
  model_used: string;
  metadata: any;
}

interface Message {
  id: string;
  sender: string;
  message_text: string;
  created_at: string;
  channel: string;
  model_used: string;
  confidence_score: number;
}

interface ConversationAnalytics {
  id: string;
  total_messages: number;
  user_messages: number;
  agent_messages: number;
  avg_response_time_ms: number;
  satisfaction_rating: number;
  flow_completed: boolean;
  conversion_event: string;
}

export default function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [analytics, setAnalytics] = useState<ConversationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchConversationData();
    }
  }, [id]);

  const fetchConversationData = async () => {
    try {
      setLoading(true);
      
      // Fetch conversation
      const { data: conversationData, error: conversationError } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();

      if (conversationError) throw conversationError;
        // Transform conversation to match expected interface
        const transformedConversation = {
          ...conversationData,
          contact_id: conversationData.user_id || conversationData.id,
          contact_phone: conversationData.user_id || '',
          status: 'active',
          started_at: conversationData.created_at,
          ended_at: null,
          message_count: 0,
          conversation_duration_minutes: 0,
          handoff_requested: false,
          handoff_reason: null,
          model_used: null,
          metadata: null
        };
        setConversation(transformedConversation);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("phone_number", conversationData.user_id || conversationData.id)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Fetch analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("conversation_analytics")
        .select("*")
        .eq("phone_number", conversationData.user_id || conversationData.id)
        .single();

      if (analyticsError && analyticsError.code !== 'PGRST116') {
        throw analyticsError;
      }
      setAnalytics(analyticsData);

    } catch (error) {
      console.error("Error fetching conversation data:", error);
      toast.error("Failed to load conversation data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Conversation Not Found</h2>
          <Button onClick={() => navigate("/admin/messaging-campaigns")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Conversations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/admin/messaging-campaigns")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Conversation Details</h1>
            <p className="text-muted-foreground flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>{conversation.contact_phone}</span>
            </p>
          </div>
        </div>
        <Badge variant={
          conversation.status === 'active' ? 'default' : 
          conversation.status === 'resolved' ? 'secondary' : 'destructive'
        }>
          {conversation.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Channel</label>
                <p className="text-sm text-muted-foreground">{conversation.channel}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Started</label>
                <p className="text-sm text-muted-foreground">
                  {new Date(conversation.started_at).toLocaleString()}
                </p>
              </div>
              {conversation.ended_at && (
                <div>
                  <label className="text-sm font-medium">Ended</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(conversation.ended_at).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Duration</label>
                <p className="text-sm text-muted-foreground">
                  {conversation.conversation_duration_minutes || 0} minutes
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Messages</label>
                <p className="text-sm text-muted-foreground">{conversation.message_count}</p>
              </div>
              {conversation.model_used && (
                <div>
                  <label className="text-sm font-medium">Model</label>
                  <p className="text-sm text-muted-foreground">{conversation.model_used}</p>
                </div>
              )}
              {conversation.handoff_requested && (
                <div>
                  <label className="text-sm font-medium">Handoff Reason</label>
                  <p className="text-sm text-muted-foreground">{conversation.handoff_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analytics */}
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">User Messages</label>
                  <p className="text-sm text-muted-foreground">{analytics.user_messages}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Agent Messages</label>
                  <p className="text-sm text-muted-foreground">{analytics.agent_messages}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Avg Response Time</label>
                  <p className="text-sm text-muted-foreground">
                    {Math.round(analytics.avg_response_time_ms / 1000)}s
                  </p>
                </div>
                {analytics.satisfaction_rating && (
                  <div>
                    <label className="text-sm font-medium">Satisfaction</label>
                    <p className="text-sm text-muted-foreground">
                      {analytics.satisfaction_rating}/5 ⭐
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Flow Completed</label>
                  <Badge variant={analytics.flow_completed ? "default" : "secondary"}>
                    {analytics.flow_completed ? "Yes" : "No"}
                  </Badge>
                </div>
                {analytics.conversion_event && (
                  <div>
                    <label className="text-sm font-medium">Conversion</label>
                    <p className="text-sm text-muted-foreground">{analytics.conversion_event}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Messages */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>Messages ({messages.length})</span>
              </CardTitle>
              <CardDescription>
                Conversation timeline with messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map((message, index) => (
                  <div key={message.id}>
                    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <div className="flex items-center space-x-2 mb-1">
                          {message.sender === 'user' ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                          <span className="text-xs font-medium">
                            {message.sender === 'user' ? 'User' : 'Agent'}
                          </span>
                          {message.confidence_score && (
                            <Badge variant="outline" className="text-xs">
                              {Math.round(message.confidence_score * 100)}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{message.message_text}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock className="h-3 w-3 opacity-50" />
                          <span className="text-xs opacity-70">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </span>
                          {message.model_used && (
                            <span className="text-xs opacity-50">
                              {message.model_used}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {index < messages.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
                
                {messages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}