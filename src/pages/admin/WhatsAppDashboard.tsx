import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, Users, Activity, Eye, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { ConversationView } from '@/components/ConversationView';
import { MemoryView } from '@/components/MemoryView';
import { Settings as SettingsComponent } from '@/components/Settings';
import { WebhookTestPanel } from '@/components/admin/WebhookTestPanel';
import { MessageProcessingTest } from '@/components/admin/MessageProcessingTest';

interface Conversation {
  id: string;
  contact_id: string;
  channel: string;
  started_at: string;
  status: string;
  message_count: number;
  conversation_duration_minutes: number | null;
}

interface MessageLog {
  id: string;
  platform: string;
  sender_id: string;
  contact_name: string | null;
  message_content: string;
  timestamp: string;
  processed: boolean;
}

interface Contact {
  id: string;
  phone_number: string;
  name: string | null;
  contact_type: string;
  total_conversations: number;
  last_interaction: string | null;
  conversion_status: string;
}

export default function WhatsAppDashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeConversations: 0,
    totalMessages: 0,
    totalContacts: 0
  });

  useEffect(() => {
    fetchData();
    
    // Subscribe to real-time updates
    const conversationsSubscription = supabase
      .channel('dashboard-conversations')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conversations' },
        () => fetchData()
      )
      .subscribe();

    const messagesSubscription = supabase
      .channel('dashboard-messages')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'message_logs' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      conversationsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchConversations(),
        fetchMessageLogs(),
        fetchContacts(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    
    // Transform conversations to match expected interface
    const transformedConversations = (data || []).map(conv => ({
      id: conv.id,
      contact_id: conv.user_id || conv.id,
      contact_phone: conv.user_id || '',
      started_at: conv.created_at,
      status: 'active',
      message_count: 0,
      conversation_duration_minutes: 0,
      channel: conv.channel,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      user_id: conv.user_id
    }));
    
    setConversations(transformedConversations);
  };

  const fetchMessageLogs = async () => {
    const { data, error } = await supabase
      .from('message_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;
    setMessageLogs(data || []);
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('last_interaction', { ascending: false })
      .limit(30);

    if (error) throw error;
    setContacts(data || []);
  };

  const fetchStats = async () => {
    const [
      { count: totalConversations },
      { count: activeConversations },
      { count: totalMessages },
      { count: totalContacts }
    ] = await Promise.all([
      supabase.from('conversations').select('*', { count: 'exact', head: true }),
      supabase.from('conversations').select('*', { count: 'exact', head: true }),
      supabase.from('message_logs').select('*', { count: 'exact', head: true }),
      supabase.from('contacts').select('*', { count: 'exact', head: true })
    ]);

    setStats({
      totalConversations: totalConversations || 0,
      activeConversations: activeConversations || 0,
      totalMessages: totalMessages || 0,
      totalContacts: totalContacts || 0
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeConversations} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalConversations > 0 
                ? Math.round((stats.activeConversations / stats.totalConversations) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="webhook" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="webhook">Webhook Test</TabsTrigger>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <TabsContent value="webhook">
          <div className="space-y-6">
            <MessageProcessingTest />
            <WebhookTestPanel />
          </div>
        </TabsContent>
        
          <TabsContent value="conversations">
            <ConversationsTab conversations={conversations} onViewConversation={setSelectedConversation} />
          </TabsContent>
        
        <TabsContent value="messages">
          <MessagesTab messageLogs={messageLogs} />
        </TabsContent>
        
        <TabsContent value="contacts">
          <ContactsTab contacts={contacts} />
        </TabsContent>
        
        <TabsContent value="memory">
          <MemoryView />
        </TabsContent>
        
        <TabsContent value="settings">
          <SettingsComponent />
        </TabsContent>
      </Tabs>
      
      {/* Conversation Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-4xl mx-4">
            <ConversationView 
              phoneNumber={selectedConversation} 
              onClose={() => setSelectedConversation(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ConversationsTab({ conversations, onViewConversation }: { 
  conversations: Conversation[];
  onViewConversation: (contactId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Conversations</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <ConversationItem 
                key={conversation.id} 
                conversation={conversation}
                onView={onViewConversation}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ConversationItem({ conversation, onView }: { 
  conversation: Conversation;
  onView: (contactId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b pb-4">
      <div className="space-y-1 flex-1">
        <p className="text-sm font-medium truncate max-w-[200px]">
          {conversation.contact_id}
        </p>
        <p className="text-xs text-muted-foreground">
          Started: {new Date(conversation.started_at).toLocaleString()}
        </p>
        {conversation.conversation_duration_minutes && (
          <p className="text-xs text-muted-foreground">
            Duration: {conversation.conversation_duration_minutes}m
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={conversation.channel === 'whatsapp' ? 'default' : 'secondary'}>
          {conversation.channel}
        </Badge>
        <Badge variant={conversation.status === 'active' ? 'default' : 'outline'}>
          {conversation.status}
        </Badge>
        <span className="text-sm text-muted-foreground min-w-0">
          {conversation.message_count} msgs
        </span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onView(conversation.contact_id)}
        >
          View
        </Button>
      </div>
    </div>
  );
}

function MessagesTab({ messageLogs }: { messageLogs: MessageLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Messages</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {messageLogs.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function MessageItem({ message }: { message: MessageLog }) {
  return (
    <div className="border-b pb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={message.platform === 'whatsapp' ? 'default' : 'secondary'}>
            {message.platform}
          </Badge>
          <span className="text-sm font-medium">
            {message.contact_name || message.sender_id}
          </span>
          <Badge variant={message.processed ? 'default' : 'destructive'}>
            {message.processed ? 'processed' : 'pending'}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleString()}
        </span>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {message.message_content}
      </p>
    </div>
  );
}

function ContactsTab({ contacts }: { contacts: Contact[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Directory</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {contacts.map((contact) => (
              <ContactItem key={contact.id} contact={contact} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ContactItem({ contact }: { contact: Contact }) {
  return (
    <div className="flex items-center justify-between border-b pb-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {contact.name || contact.phone_number}
        </p>
        <p className="text-xs text-muted-foreground">
          {contact.phone_number}
        </p>
        {contact.last_interaction && (
          <p className="text-xs text-muted-foreground">
            Last: {new Date(contact.last_interaction).toLocaleString()}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={
          contact.contact_type === 'customer' ? 'default' :
          contact.contact_type === 'lead' ? 'secondary' : 'outline'
        }>
          {contact.contact_type}
        </Badge>
        <Badge variant={
          contact.conversion_status === 'customer' ? 'default' :
          contact.conversion_status === 'lead' ? 'secondary' : 'outline'
        }>
          {contact.conversion_status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {contact.total_conversations} chats
        </span>
      </div>
    </div>
  );
}