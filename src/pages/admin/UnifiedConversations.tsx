import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Filter, 
  MessageSquare,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Phone,
  Calendar,
  Building
} from "lucide-react";

export default function UnifiedConversations() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('unified-conversations-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conversations' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConversations = async () => {
    try {
      let query = supabase
        .from('conversations')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Enhance conversations with derived data
      const enhancedConversations = await Promise.all((data || []).map(async (conv) => {
        // Get latest message
        // Mock latest message for demo
        const latestMessage = {
          message_text: 'Sample message content',
          created_at: new Date().toISOString(),
          sender: 'user'
        };

        // Determine conversation stage based on message count and status
        let stage = 'discovery';
        if (conv.message_count > 10) stage = 'engagement';
        if (conv.message_count > 20) stage = 'conversion';
        if (conv.status === 'completed') stage = 'completed';

        // Mock sentiment analysis (in production, this would be AI-powered)
        const sentiments = ['positive', 'neutral', 'negative'];
        const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];

        // Get associated business from recent orders
        const { data: recentOrder } = await supabase
          .from('orders')
          .select(`
            carts(
              businesses(name, category)
            )
          `)
          .eq('cart_id', conv.id) // This would need proper relation
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...conv,
          latest_message: latestMessage,
          stage,
          sentiment,
          business: recentOrder?.carts?.businesses,
          contacts: {
            name: `User ${conv.contact_id.slice(-4)}`,
            phone_number: conv.contact_id,
            contact_type: 'customer',
            conversion_status: 'active'
          }
        };
      }));

      // Apply filters
      let filteredData = enhancedConversations;
      
      if (stageFilter !== 'all') {
        filteredData = filteredData.filter(conv => conv.stage === stageFilter);
      }

      if (sentimentFilter !== 'all') {
        filteredData = filteredData.filter(conv => conv.sentiment === sentimentFilter);
      }

      if (searchTerm) {
        filteredData = filteredData.filter(conv =>
          conv.contacts?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.contacts?.phone_number?.includes(searchTerm) ||
          conv.latest_message?.message_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.business?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setConversations(filteredData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationMessages = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('phone_number', contactId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch conversation messages",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [searchTerm, stageFilter, sentimentFilter]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    const variants = {
      'positive': 'default',
      'neutral': 'outline', 
      'negative': 'destructive'
    };
    
    return (
      <Badge variant={variants[sentiment] as any} className="flex items-center gap-1">
        {getSentimentIcon(sentiment)}
        {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
      </Badge>
    );
  };

  const getStageColor = (stage: string) => {
    const colors = {
      'discovery': 'text-blue-600',
      'engagement': 'text-purple-600',
      'conversion': 'text-orange-600',
      'completed': 'text-green-600'
    };
    return colors[stage] || 'text-gray-600';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'pharmacy': '💊',
      'bar': '🍺',
      'hardware': '🪚',
      'produce': '🍎'
    };
    return icons[category] || '🏪';
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Unified Conversations</h1>
        <p className="text-muted-foreground">
          Monitor WhatsApp conversations across all business verticals
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Conversations</p>
                <p className="text-2xl font-bold">{conversations.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Today</p>
                <p className="text-2xl font-bold text-blue-600">
                  {conversations.filter(c => {
                    const today = new Date().toDateString();
                    return new Date(c.latest_message?.created_at || '').toDateString() === today;
                  }).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Positive Sentiment</p>
                <p className="text-2xl font-bold text-green-600">
                  {conversations.filter(c => c.sentiment === 'positive').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversions</p>
                <p className="text-2xl font-bold text-purple-600">
                  {conversations.filter(c => c.stage === 'completed').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by buyer, business, or message content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="discovery">Discovery</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
                <SelectItem value="conversion">Conversion</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations ({conversations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Last Message</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.map((conversation) => (
                <TableRow key={conversation.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {conversation.contacts?.name || 'Anonymous'}
                        </div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {conversation.contacts?.phone_number || conversation.contact_id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {conversation.business ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryIcon(conversation.business.category)}</span>
                        <div>
                          <div className="font-medium text-sm">{conversation.business.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {conversation.business.category}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">No business</span>
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm line-clamp-2">
                        {conversation.latest_message?.message_text || 'No messages'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conversation.latest_message?.sender === 'user' ? 'Customer' : 'Bot'}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {getSentimentBadge(conversation.sentiment)}
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className={getStageColor(conversation.stage)}>
                      {conversation.stage.charAt(0).toUpperCase() + conversation.stage.slice(1)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-center">
                      <div className="font-medium">{conversation.message_count || 0}</div>
                      <div className="text-xs text-muted-foreground">messages</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm">
                          {conversation.latest_message ? 
                            formatRelativeTime(conversation.latest_message.created_at) : 
                            'No activity'
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {conversation.latest_message ? 
                            formatTime(conversation.latest_message.created_at).split(',')[0] : 
                            ''
                          }
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedConversation(conversation);
                            fetchConversationMessages(conversation.contact_id);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Conversation Details</DialogTitle>
                        </DialogHeader>
                        {selectedConversation && (
                          <div className="grid grid-cols-3 gap-6">
                            {/* Conversation Info */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Contact Info</h4>
                                <p><strong>Name:</strong> {selectedConversation.contacts?.name || 'Anonymous'}</p>
                                <p><strong>Phone:</strong> {selectedConversation.contacts?.phone_number}</p>
                                <p><strong>Type:</strong> {selectedConversation.contacts?.contact_type}</p>
                                <p><strong>Status:</strong> {selectedConversation.contacts?.conversion_status}</p>
                              </div>
                              
                              <div>
                                <h4 className="font-medium mb-2">Conversation</h4>
                                <p><strong>Stage:</strong> {selectedConversation.stage}</p>
                                <p><strong>Sentiment:</strong> {getSentimentBadge(selectedConversation.sentiment)}</p>
                                <p><strong>Messages:</strong> {selectedConversation.message_count}</p>
                                <p><strong>Duration:</strong> {selectedConversation.conversation_duration_minutes}m</p>
                              </div>

                              {selectedConversation.business && (
                                <div>
                                  <h4 className="font-medium mb-2">Business</h4>
                                  <p><strong>Name:</strong> {selectedConversation.business.name}</p>
                                  <p><strong>Category:</strong> {selectedConversation.business.category}</p>
                                </div>
                              )}
                            </div>

                            {/* Messages */}
                            <div className="col-span-2">
                              <h4 className="font-medium mb-2">Message History</h4>
                              <ScrollArea className="h-96 border rounded p-4">
                                <div className="space-y-3">
                                  {messages.map((message, index) => (
                                    <div 
                                      key={index}
                                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                      <div 
                                        className={`max-w-xs p-3 rounded-lg ${
                                          message.sender === 'user' 
                                            ? 'bg-primary text-primary-foreground' 
                                            : 'bg-muted'
                                        }`}
                                      >
                                        <p className="text-sm">{message.message_text}</p>
                                        <p className="text-xs opacity-70 mt-1">
                                          {new Date(message.created_at).toLocaleTimeString()}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                              
                              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                <p className="text-sm text-yellow-800">
                                  <strong>Coaching Note:</strong> Consider following up on product recommendations 
                                  and addressing any price concerns mentioned in the conversation.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {conversations.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No conversations found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}