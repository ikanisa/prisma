import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Column, Table, AutoSizer } from 'react-virtualized';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, RefreshCw, Search, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

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

export default function Conversations() {
  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');

  const loadConversations = useCallback(async (pageIndex: number, searchTerm: string = '') => {
    setLoading(true);
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    
    let query = supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(from, to);

    if (searchTerm) {
      query = query.or(`contact_id.ilike.%${searchTerm}%,channel.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;
    
    if (!error && data) {
      setRows(prev => (pageIndex === 0 ? data : [...prev, ...data]));
      setTotalCount(count || 0);
    } else {
      toast.error('Failed to load conversations');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setRows([]);
    setPage(0);
    loadConversations(0, search);
  }, [search, loadConversations]);

  const handleSearch = () => {
    setRows([]);
    setPage(0);
    loadConversations(0, search);
  };

  const rowGetter = ({ index }: { index: number }) => rows[index];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Conversations</h1>
          <Badge variant="secondary">{totalCount} total</Badge>
        </div>
        <Button onClick={() => handleSearch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-4 h-[700px]">
        {/* Conversations List */}
        <Card className={`flex-1 overflow-hidden ${selected ? 'lg:w-2/3' : 'w-full'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Conversations</CardTitle>
              <div className="flex gap-2">
                <Input 
                  placeholder="Search conversations..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="w-64"
                />
                <Button onClick={handleSearch} variant="secondary" size="sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-full">
            {loading && page === 0 && <Skeleton className="absolute inset-0" />}
            <AutoSizer>
              {({ height, width }) => (
                <Table
                  width={width}
                  height={height - 100} // Account for header
                  headerHeight={40}
                  rowHeight={48}
                  rowCount={rows.length}
                  rowGetter={rowGetter}
                  onRowClick={({ rowData }) => setSelected(rowData)}
                  rowClassName={({ index }) => {
                    const conversation = rows[index];
                    return `cursor-pointer hover:bg-muted/50 ${
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
                    label="#" 
                    width={60} 
                    cellRenderer={({ rowIndex }) => rowIndex + 1} 
                  />
                  <Column 
                    label="Contact" 
                    dataKey="contact_id" 
                    width={200}
                    cellRenderer={({ cellData }) => (
                      <span className="truncate">{cellData}</span>
                    )}
                  />
                  <Column 
                    label="Channel" 
                    dataKey="channel" 
                    width={120}
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
                      <Badge variant={cellData === 'active' ? 'default' : 'outline'}>
                        {cellData}
                      </Badge>
                    )}
                  />
                  <Column 
                    label="Messages" 
                    dataKey="message_count" 
                    width={90}
                  />
                  <Column 
                    label="Duration" 
                    dataKey="conversation_duration_minutes" 
                    width={100}
                    cellRenderer={({ cellData }) => 
                      cellData ? `${cellData}m` : '—'
                    }
                  />
                  <Column 
                    label="Started" 
                    dataKey="started_at" 
                    width={180}
                    cellRenderer={({ cellData }) => 
                      formatDistanceToNow(new Date(cellData), { addSuffix: true })
                    }
                  />
                  <Column 
                    label="Model" 
                    dataKey="model_used" 
                    width={120}
                    cellRenderer={({ cellData }) => cellData || '—'}
                  />
                </Table>
              )}
            </AutoSizer>
          </CardContent>
        </Card>

        {/* Conversation Detail Drawer */}
        {selected && (
          <Card className="w-[400px] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conversation Details</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelected(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Contact:</span>
                    <p className="font-medium truncate">{selected.contact_id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Channel:</span>
                    <p className="font-medium">{selected.channel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={selected.status === 'active' ? 'default' : 'outline'}>
                      {selected.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Messages:</span>
                    <p className="font-medium">{selected.message_count}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p className="font-medium">
                      {selected.conversation_duration_minutes ? `${selected.conversation_duration_minutes}m` : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Model:</span>
                    <p className="font-medium">{selected.model_used || '—'}</p>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">Started:</span>
                  <p className="font-medium">
                    {new Date(selected.started_at).toLocaleString()}
                  </p>
                </div>
                {selected.ended_at && (
                  <div>
                    <span className="text-muted-foreground text-sm">Ended:</span>
                    <p className="font-medium">
                      {new Date(selected.ended_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4">
                <ConversationThread conversationId={selected.id} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Thread component fetches messages lazily
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
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Messages ({messages.length})</h4>
        {messages.length >= 100 && (
          <Badge variant="outline">Showing latest 100</Badge>
        )}
      </div>
      
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No messages found
        </p>
      ) : (
        messages.map(message => (
          <div 
            key={message.id} 
            className={`p-3 rounded-lg text-sm ${
              message.sender === 'agent' 
                ? 'bg-muted ml-4' 
                : 'bg-primary/10 mr-4'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium capitalize">{message.sender}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="break-words">{message.message_text}</p>
            {message.model_used && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {message.model_used}
                </Badge>
                {message.confidence_score && (
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(message.confidence_score * 100)}% confidence
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}