import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Phone, Send, Bot, User, Filter, Search, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  contact_id: string;
  channel: string;
  status: string;
  started_at: string;
  ended_at?: string;
  handoff_requested: boolean;
  handoff_reason?: string;
  assigned_agent_id?: string;
  message_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'agent';
  text: string;
  media_url?: string;
  created_at: string;
  model_used?: string;
  confidence?: number;
}

interface Contact {
  id: string;
  wa_id: string;
  display_name?: string;
  business_name?: string;
  last_seen: string;
  tags: string[];
}

const UnifiedConversationsPage = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'handoff' | 'ended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiAssistMessage, setAiAssistMessage] = useState('');
  const [isAiAssistLoading, setIsAiAssistLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations with real-time updates
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', filter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select(`
          *
        `)
        .order('started_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      if (filter === 'handoff') {
        query = query.eq('handoff_requested', true);
      }

      if (searchQuery) {
        query = query.or(
          `contact_id.ilike.%${searchQuery}%,handoff_reason.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 5000 // Refresh every 5 seconds for real-time feel
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation-messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('phone_number', selectedConversation) // Using phone_number as conversation identifier
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data?.map(msg => ({
        ...msg,
        conversation_id: selectedConversation,
        text: msg.message_text || '',
        sender: msg.sender as 'user' | 'agent'
      })) as Message[];
    },
    enabled: !!selectedConversation,
    refetchInterval: 2000 // Refresh messages more frequently
  });

  // Send AI-assisted response
  const sendAiResponse = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: string; message: string }) => {
      const conversation = conversations?.find(c => c.id === conversationId);
      if (!conversation) throw new Error('Conversation not found');

      // Call MCP orchestrator for AI assistance
      const { data, error } = await supabase.functions.invoke('mcp-orchestrator', {
        body: {
          task: 'support_assistance',
          prompt: message,
          context: {
            conversation_id: conversationId,
            contact_id: conversation.contact_id,
            handoff_reason: conversation.handoff_reason,
            previous_messages: messages?.slice(-5) // Last 5 messages for context
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "AI Response Generated",
        description: "The AI has generated a response suggestion.",
      });
      setAiAssistMessage(data?.reply || '');
    },
    onError: (error) => {
      toast({
        title: "AI Assist Error",
        description: "Failed to generate AI response suggestion.",
        variant: "destructive",
      });
    }
  });

  // Send manual response
  const sendResponse = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: string; message: string }) => {
      const conversation = conversations?.find(c => c.id === conversationId);
      if (!conversation) throw new Error('Conversation not found');

      // Log the manual response
      const { error: messageError } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender: 'agent',
          text: message,
          created_at: new Date().toISOString()
        });

      if (messageError) throw messageError;

      // Send via WhatsApp if configured
      const { data, error } = await supabase.functions.invoke('whatsapp-unified-handler', {
        body: {
          action: 'send_message',
          to: conversation.contact_id,
          message: message,
          conversation_id: conversationId
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Response Sent",
        description: "Your response has been sent successfully.",
      });
      setAiAssistMessage('');
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedConversation] });
    },
    onError: (error) => {
      toast({
        title: "Send Error",
        description: "Failed to send response.",
        variant: "destructive",
      });
    }
  });

  // Handle conversation handoff
  const handleHandoff = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          handoff_requested: false,
          assigned_agent_id: null, // Current user would be set here in real implementation
          status: 'active'
        })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Handoff Accepted",
        description: "You have taken over this conversation.",
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedConversationData = conversations?.find(c => c.id === selectedConversation);

  const getStatusBadge = (conversation: any) => {
    if (conversation.handoff_requested) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Handoff</Badge>;
    }
    switch (conversation.status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'ended':
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge variant="outline">{conversation.status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Unified Conversations</h1>
          <p className="text-muted-foreground">Cross-channel conversation management with AI assistance</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="handoff" className="text-destructive">Handoff</TabsTrigger>
              <TabsTrigger value="ended">Ended</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Conversations List */}
        <Card className="w-1/3 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversations ({conversations?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
                  <div className="space-y-2 p-4">
                    {conversationsLoading ? (
                      <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : conversations?.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedConversation === conversation.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedConversation(conversation.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {conversation.contact_id.slice(-2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {conversation.contact_id}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {conversation.channel} conversation
                              </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {conversation.channel}
                            </Badge>
                            {getStatusBadge(conversation)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(conversation.started_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conversation.message_count} msgs
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="flex-1 flex flex-col">
          {selectedConversationData ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {selectedConversationData.contact_id.slice(-2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">
                        {selectedConversationData.contact_id}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversationData.channel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedConversationData)}
                    {selectedConversationData.handoff_requested && (
                      <Button
                        size="sm"
                        onClick={() => handleHandoff.mutate(selectedConversationData.id)}
                        disabled={handleHandoff.isPending}
                      >
                        Accept Handoff
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messagesLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : messages?.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender === 'user'
                              ? 'bg-muted text-foreground'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.sender === 'user' ? (
                              <User className="h-3 w-3" />
                            ) : (
                              <Bot className="h-3 w-3" />
                            )}
                            <span className="text-xs opacity-70">
                              {message.sender === 'user' ? 'Customer' : 'AI Agent'}
                            </span>
                            <span className="text-xs opacity-70">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm">{message.text}</p>
                          {message.model_used && (
                            <p className="text-xs opacity-70 mt-1">
                              Model: {message.model_used}
                              {message.confidence && ` (${Math.round(message.confidence * 100)}%)`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <Separator />

                {/* AI Assistant & Response Input */}
                <div className="p-4 space-y-3">
                  {/* AI Assist Button */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendAiResponse.mutate({ 
                        conversationId: selectedConversation!, 
                        message: messages?.slice(-1)[0]?.text || '' 
                      })}
                      disabled={isAiAssistLoading || sendAiResponse.isPending}
                      className="gap-2"
                    >
                      <Bot className="h-4 w-4" />
                      AI Assist
                    </Button>
                    <Badge variant="secondary" className="ml-auto">
                      GPT-4o powered assistance
                    </Badge>
                  </div>

                  {/* Response Input */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your response... (AI suggestion will appear here)"
                      value={aiAssistMessage}
                      onChange={(e) => setAiAssistMessage(e.target.value)}
                      className="flex-1 min-h-[60px] resize-none"
                    />
                    <Button
                      onClick={() => sendResponse.mutate({ 
                        conversationId: selectedConversation!, 
                        message: aiAssistMessage 
                      })}
                      disabled={!aiAssistMessage.trim() || sendResponse.isPending}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the list to view messages and provide support.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default UnifiedConversationsPage;