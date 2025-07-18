import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Column, Table, AutoSizer } from 'react-virtualized';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  MessageSquare, 
  RefreshCw, 
  Search, 
  X, 
  Filter,
  Archive,
  Download,
  Phone,
  Clock,
  User,
  Bot,
  ExternalLink,
  MoreVertical,
  ChevronRight,
  Calendar,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const PAGE_SIZE = 100;

type Conversation = {
  id: string;
  contact_id: string;
  channel: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  message_count: number;
  conversation_duration_minutes: number | null;
  model_used: string | null;
};

type ConversationMessage = {
  id: string;
  sender: string;
  message_text: string;
  created_at: string;
  model_used: string | null;
  confidence_score: number | null;
};

type Contact = {
  id: string;
  phone_number: string;
  name: string | null;
  contact_type: string | null;
  conversion_status: string | null;
  location: string | null;
};

export default function Conversations() {
  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadConversations = useCallback(async (pageIndex: number, searchTerm: string = '') => {
    setLoading(true);
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    
    let query = supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(from, to);

    // Apply filters
    if (searchTerm) {
      query = query.or(`contact_id.ilike.%${searchTerm}%`);
    }
    
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    
    if (channelFilter !== 'all') {
      query = query.eq('channel', channelFilter);
    }
    
    if (dateFilter !== 'all') {
      const now = new Date();
      let dateThreshold;
      
      switch (dateFilter) {
        case 'today':
          dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      
      if (dateThreshold) {
        query = query.gte('started_at', dateThreshold.toISOString());
      }
    }

    const { data, error, count } = await query;
    
    if (!error && data) {
      setRows(prev => (pageIndex === 0 ? data : [...prev, ...data]));
      setTotalCount(count || 0);
    } else {
      toast.error('Failed to load conversations');
    }
    setLoading(false);
  }, [statusFilter, channelFilter, dateFilter]);

  useEffect(() => {
    setRows([]);
    setPage(0);
    loadConversations(0, search);
  }, [search, loadConversations]);

  const loadContactDetails = async (contactId: string) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', contactId)
      .single();
    
    if (!error && data) {
      setSelectedContact(data);
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelected(conversation);
    loadContactDetails(conversation.contact_id);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setChannelFilter('all');
    setDateFilter('all');
    setSearch('');
  };

  const exportConversations = async () => {
    toast.info('Preparing export...');
    // Implementation for export functionality
  };

  const rowGetter = ({ index }: { index: number }) => rows[index];

  // Empty state component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No conversations found</h3>
      <p className="text-muted-foreground mb-4">
        {search || statusFilter !== 'all' || channelFilter !== 'all' || dateFilter !== 'all' 
          ? 'Try adjusting your filters or search terms'
          : 'Conversations will appear here as they come in'
        }
      </p>
      {(search || statusFilter !== 'all' || channelFilter !== 'all' || dateFilter !== 'all') && (
        <Button onClick={clearFilters} variant="outline">
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6" />
            <h1 className="text-2xl font-semibold">Conversations</h1>
            <Badge variant="secondary" className="text-xs">
              {totalCount.toLocaleString()} total
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage and review all customer conversations across channels
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={exportConversations} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => loadConversations(0, search)} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search conversations by contact..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={() => setShowFilters(!showFilters)} 
                variant="outline"
                className="shrink-0"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {(statusFilter !== 'all' || channelFilter !== 'all' || dateFilter !== 'all') && (
                  <Badge className="ml-2 h-2 w-2 p-0 bg-primary" />
                )}
              </Button>
            </div>
            
            {showFilters && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                        <SelectItem value="ended">Ended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Channel</label>
                    <Select value={channelFilter} onValueChange={setChannelFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All channels</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 days</SelectItem>
                        <SelectItem value="month">Last 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button onClick={clearFilters} variant="outline" className="w-full">
                      Clear all
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
        {/* Conversations List */}
        <Card className={`overflow-hidden ${selected ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conversation List</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>{rows.length} of {totalCount}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-full">
            {loading && page === 0 && <Skeleton className="absolute inset-0" />}
            {!loading && rows.length === 0 ? (
              <EmptyState />
            ) : (
              <AutoSizer>
                {({ height, width }) => (
                  <Table
                    width={width}
                    height={height - 120} // Account for header
                    headerHeight={40}
                    rowHeight={64}
                    rowCount={rows.length}
                    rowGetter={rowGetter}
                    onRowClick={({ rowData }) => handleConversationSelect(rowData)}
                    rowClassName={({ index }) => {
                      const conversation = rows[index];
                      return `cursor-pointer hover:bg-muted/50 transition-colors ${
                        selected?.id === conversation?.id ? 'bg-muted' : ''
                      }`;
                    }}
                    onRowsRendered={({ stopIndex }) => {
                      if (stopIndex >= rows.length - 1 && !loading && rows.length < totalCount) {
                        const nextPage = page + 1;
                        setPage(nextPage);
                        loadConversations(nextPage, search);
                      }
                    }}
                  >
                    <Column 
                      label="Contact" 
                      dataKey="contact_id" 
                      width={200}
                      cellRenderer={({ cellData, rowData }) => (
                        <div className="flex items-center gap-3 py-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{cellData}</p>
                            <p className="text-xs text-muted-foreground">
                              {rowData.message_count} messages
                            </p>
                          </div>
                        </div>
                      )}
                    />
                    <Column 
                      label="Channel" 
                      dataKey="channel" 
                      width={100}
                      cellRenderer={({ cellData }) => (
                        <Badge variant={cellData === 'whatsapp' ? 'default' : 'secondary'}>
                          {cellData}
                        </Badge>
                      )}
                    />
                    <Column 
                      label="Status" 
                      dataKey="status" 
                      width={100}
                      cellRenderer={({ cellData }) => (
                        <Badge 
                          variant={
                            cellData === 'active' ? 'default' : 
                            cellData === 'ended' ? 'secondary' : 'outline'
                          }
                        >
                          {cellData}
                        </Badge>
                      )}
                    />
                    <Column 
                      label="Duration" 
                      dataKey="conversation_duration_minutes" 
                      width={100}
                      cellRenderer={({ cellData }) => (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {cellData ? `${cellData}m` : '—'}
                          </span>
                        </div>
                      )}
                    />
                    <Column 
                      label="Started" 
                      dataKey="started_at" 
                      width={140}
                      cellRenderer={({ cellData }) => (
                        <div className="text-sm">
                          <div>{formatDistanceToNow(new Date(cellData), { addSuffix: true })}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(cellData), 'MMM dd, HH:mm')}
                          </div>
                        </div>
                      )}
                    />
                    <Column 
                      label="AI Model" 
                      dataKey="model_used" 
                      width={120}
                      cellRenderer={({ cellData }) => (
                        cellData ? (
                          <div className="flex items-center gap-1">
                            <Bot className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm truncate">{cellData}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )
                      )}
                    />
                    <Column 
                      label="" 
                      dataKey="id" 
                      width={50}
                      cellRenderer={() => (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    />
                  </Table>
                )}
              </AutoSizer>
            )}
          </CardContent>
        </Card>

        {/* Conversation Detail Panel */}
        {selected && (
          <Card className="lg:col-span-5 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <CardTitle className="text-lg">Conversation Details</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive conversation
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Export messages
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View in WhatsApp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelected(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-hidden space-y-4">
              {/* Contact Information */}
              {selectedContact && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {selectedContact.name || selectedContact.phone_number}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {selectedContact.phone_number}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline" className="ml-2">
                        {selectedContact.contact_type || 'Unknown'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge 
                        variant={selectedContact.conversion_status === 'customer' ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {selectedContact.conversion_status || 'Prospect'}
                      </Badge>
                    </div>
                    {selectedContact.location && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="ml-2">{selectedContact.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Conversation Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Channel:</span>
                      <Badge variant={selected.channel === 'whatsapp' ? 'default' : 'secondary'} className="ml-2">
                        {selected.channel}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge 
                        variant={selected.status === 'active' ? 'default' : 'outline'}
                        className="ml-2"
                      >
                        {selected.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Started:</span>
                      <div className="mt-1 text-sm">
                        {format(new Date(selected.started_at), 'PPp')}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Messages:</span>
                      <span className="ml-2 font-medium">{selected.message_count}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="ml-2 font-medium">
                        {selected.conversation_duration_minutes ? `${selected.conversation_duration_minutes}m` : '—'}
                      </span>
                    </div>
                  </div>
                  
                  {selected.model_used && (
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">AI Model:</span>
                        <span className="ml-2 font-medium">{selected.model_used}</span>
                      </div>
                    </div>
                  )}
                  
                  {selected.ended_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Ended:</span>
                        <div className="mt-1 text-sm">
                          {format(new Date(selected.ended_at), 'PPp')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Messages Thread */}
              <div className="flex-1 overflow-hidden">
                <ConversationThread conversationId={selected.id} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Enhanced thread component with better message formatting
function ConversationThread({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('conversation_messages')
          .select('*')
          .eq('phone_number', conversationId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) {
          console.error('Error fetching messages:', error);
          toast.error('Failed to load messages');
        } else {
          setMessages(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
        toast.error('Failed to load messages');
      }
      setLoading(false);
    };

    fetchMessages();
  }, [conversationId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Messages</h4>
          <Skeleton className="h-4 w-16" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const EmptyMessages = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
      <h4 className="font-medium mb-1">No messages yet</h4>
      <p className="text-sm text-muted-foreground">Messages will appear here as the conversation progresses</p>
    </div>
  );

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Messages
          {messages.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {messages.length}
            </Badge>
          )}
        </h4>
        {messages.length >= 100 && (
          <Badge variant="outline" className="text-xs">Latest 100</Badge>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px]">
        {messages.length === 0 ? (
          <EmptyMessages />
        ) : (
          messages.map((message, index) => {
            const isAgent = message.sender === 'agent';
            const isFirstInGroup = index === 0 || messages[index - 1].sender !== message.sender;
            const isLastInGroup = index === messages.length - 1 || messages[index + 1].sender !== message.sender;
            
            return (
              <div 
                key={message.id} 
                className={`flex ${isAgent ? 'justify-start' : 'justify-end'} ${isFirstInGroup ? 'mt-4' : 'mt-1'}`}
              >
                <div className={`max-w-[80%] ${isAgent ? 'mr-12' : 'ml-12'}`}>
                  {isFirstInGroup && (
                    <div className={`flex items-center gap-2 mb-1 ${isAgent ? 'justify-start' : 'justify-end'}`}>
                      <div className="flex items-center gap-1">
                        {isAgent ? (
                          <Bot className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium capitalize text-muted-foreground">
                          {message.sender}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), 'HH:mm')}
                      </span>
                    </div>
                  )}
                  
                  <div 
                    className={`p-3 rounded-lg text-sm ${
                      isAgent 
                        ? 'bg-muted text-foreground' 
                        : 'bg-primary text-primary-foreground'
                    } ${
                      isFirstInGroup && isLastInGroup ? 'rounded-lg' :
                      isFirstInGroup ? (isAgent ? 'rounded-tl-sm' : 'rounded-tr-sm') :
                      isLastInGroup ? (isAgent ? 'rounded-bl-sm' : 'rounded-br-sm') :
                      isAgent ? 'rounded-l-sm' : 'rounded-r-sm'
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap">{message.message_text}</p>
                    
                    {isLastInGroup && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
                        <div className="flex items-center gap-2 text-xs opacity-70">
                          {message.model_used && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs h-5 ${isAgent ? 'bg-background/50' : 'bg-primary-foreground/20'}`}
                            >
                              {message.model_used}
                            </Badge>
                          )}
                          {message.confidence_score && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs h-5 ${isAgent ? 'border-current/20' : 'border-primary-foreground/30'}`}
                            >
                              {Math.round(message.confidence_score * 100)}%
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs opacity-60">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}