import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  MessageSquare, 
  Plus, 
  Archive, 
  Star,
  Pin,
  MoreHorizontal,
  Check,
  CheckCheck,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  contact_id: string;
  contact_phone: string;
  contact_name?: string;
  contact_avatar?: string;
  channel: string;
  status: string;
  message_count: number;
  last_message: string;
  last_message_time: string;
  last_message_sender: string;
  unread_count: number;
  is_pinned: boolean;
  is_muted: boolean;
  is_archived: boolean;
  conversation_duration_minutes?: number;
}

interface ChatListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
  className?: string;
}

export function ChatList({ 
  onSelectConversation, 
  selectedConversationId, 
  className 
}: ChatListProps) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all');

  useEffect(() => {
    fetchConversations();
    
    // Subscribe to conversation updates
    const subscription = supabase
      .channel('chat-list')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => fetchConversations()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_messages' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // This would be a more complex query in practice, joining multiple tables
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const formattedConversations: Conversation[] = (conversationsData || []).map(conv => ({
        id: conv.id,
        contact_id: conv.contact_id,
        contact_phone: conv.contact_phone || '',
        contact_name: conv.contact_id, // Would join with contacts table
        contact_avatar: '',
        channel: conv.channel,
        status: conv.status,
        message_count: conv.message_count || 0,
        last_message: 'Loading...', // Would fetch from last message
        last_message_time: conv.created_at,
        last_message_sender: 'user',
        unread_count: 0, // Would calculate from messages
        is_pinned: false, // Would come from user preferences
        is_muted: false, // Would come from user preferences
        is_archived: conv.status === 'closed',
        conversation_duration_minutes: conv.conversation_duration_minutes
      }));

      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        conv.contact_name?.toLowerCase().includes(query) ||
        conv.contact_phone.includes(query) ||
        conv.last_message.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }

    // Status filter
    switch (filter) {
      case 'unread':
        return conv.unread_count > 0;
      case 'pinned':
        return conv.is_pinned;
      case 'archived':
        return conv.is_archived;
      default:
        return !conv.is_archived;
    }
  });

  const handleTogglePin = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    // In practice, this would update user preferences table
    setConversations(prev => prev.map(c => 
      c.id === conversationId 
        ? { ...c, is_pinned: !c.is_pinned }
        : c
    ));

    toast({
      title: conversation.is_pinned ? "Unpinned" : "Pinned",
      description: `Conversation ${conversation.is_pinned ? 'unpinned' : 'pinned'}`
    });
  };

  const handleToggleMute = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    setConversations(prev => prev.map(c => 
      c.id === conversationId 
        ? { ...c, is_muted: !c.is_muted }
        : c
    ));

    toast({
      title: conversation.is_muted ? "Unmuted" : "Muted",
      description: `Conversation ${conversation.is_muted ? 'unmuted' : 'muted'}`
    });
  };

  const handleArchive = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    setConversations(prev => prev.map(c => 
      c.id === conversationId 
        ? { ...c, is_archived: !c.is_archived }
        : c
    ));

    toast({
      title: conversation.is_archived ? "Unarchived" : "Archived",
      description: `Conversation ${conversation.is_archived ? 'unarchived' : 'archived'}`
    });
  };

  const getLastMessageIcon = (sender: string, unreadCount: number) => {
    if (unreadCount > 0) return null;
    
    if (sender === 'user') {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
    return null;
  };

  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    const now = new Date();
    const diffInHours = (now.getTime() - time.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return time.toLocaleDateString([], { weekday: 'short' });
    } else {
      return time.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-pulse">Loading chats...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chats
          </CardTitle>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'pinned', label: 'Pinned' },
            { key: 'archived', label: 'Archived' }
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={filter === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(key as any)}
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-0">
            {filteredConversations.map((conversation, index) => (
              <div key={conversation.id}>
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors relative group",
                    selectedConversationId === conversation.id && "bg-muted"
                  )}
                  onClick={() => onSelectConversation(conversation)}
                >
                  {/* Pin indicator */}
                  {conversation.is_pinned && (
                    <Pin className="absolute top-2 right-2 h-3 w-3 text-muted-foreground" />
                  )}

                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conversation.contact_avatar} />
                      <AvatarFallback>
                        {conversation.contact_name?.[0] || 
                         conversation.contact_phone?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Online indicator - would come from presence */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate">
                        {conversation.contact_name || conversation.contact_phone}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {conversation.is_muted && (
                          <VolumeX className="h-3 w-3" />
                        )}
                        {getLastMessageIcon(conversation.last_message_sender, conversation.unread_count)}
                        <span>{formatTime(conversation.last_message_time)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        {conversation.unread_count > 0 && (
                          <Badge variant="default" className="h-5 min-w-5 text-xs px-1.5">
                            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                          </Badge>
                        )}
                        
                        <Badge variant="outline" className="text-xs">
                          {conversation.channel}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Actions (visible on hover) */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(conversation.id);
                      }}
                    >
                      <Pin className={cn(
                        "h-3 w-3",
                        conversation.is_pinned && "fill-current"
                      )} />
                    </Button>
                  </div>
                </div>
                
                {index < filteredConversations.length - 1 && (
                  <Separator className="ml-16" />
                )}
              </div>
            ))}
            
            {filteredConversations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {searchQuery 
                    ? 'No conversations found' 
                    : filter === 'archived'
                    ? 'No archived conversations'
                    : filter === 'unread'
                    ? 'No unread conversations'
                    : filter === 'pinned'
                    ? 'No pinned conversations'
                    : 'No conversations yet'
                  }
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}