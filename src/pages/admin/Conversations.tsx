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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  Activity,
  BarChart3,
  TrendingUp,
  Users,
  Zap,
  MapPin,
  Mail,
  Globe,
  Smartphone,
  Star,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Settings,
  Eye,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

  // Calculate stats
  const stats = {
    total: totalCount,
    active: rows.filter(r => r.status === 'active').length,
    ended: rows.filter(r => r.status === 'ended').length,
    archived: rows.filter(r => r.status === 'archived').length,
    whatsapp: rows.filter(r => r.channel === 'whatsapp').length,
    avgDuration: rows.length > 0 ? Math.round(rows.reduce((acc, r) => acc + (r.conversation_duration_minutes || 0), 0) / rows.length) : 0,
    avgMessages: rows.length > 0 ? Math.round(rows.reduce((acc, r) => acc + r.message_count, 0) / rows.length) : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Conversations</h1>
              <p className="text-sm text-muted-foreground">Analyze and manage customer conversations across all channels</p>
            </div>
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

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                  <p className="text-xs text-green-600">+{stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Archive className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ended</p>
                  <p className="text-2xl font-bold text-foreground">{stats.ended}</p>
                  <p className="text-xs text-orange-600">+{stats.total > 0 ? ((stats.ended / stats.total) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Smartphone className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
                  <p className="text-2xl font-bold text-foreground">{stats.whatsapp}</p>
                  <p className="text-xs text-purple-600">+{stats.total > 0 ? ((stats.whatsapp / stats.total) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-indigo-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-indigo-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold text-foreground">{stats.avgDuration}m</p>
                  <p className="text-xs text-indigo-600">per conversation</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-teal-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Messages</p>
                  <p className="text-2xl font-bold text-foreground">{stats.avgMessages}</p>
                  <p className="text-xs text-teal-600">per conversation</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-rose-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-rose-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Engagement</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(0) : 0}%</p>
                  <p className="text-xs text-rose-600">activity rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filters
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {rows.length} of {totalCount} conversations
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search by contact ID or phone number..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={() => setShowFilters(!showFilters)} 
                variant={showFilters ? "default" : "outline"}
                className="shrink-0"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {(statusFilter !== 'all' || channelFilter !== 'all' || dateFilter !== 'all') && (
                  <Badge className="ml-2 h-2 w-2 p-0 bg-white rounded-full" />
                )}
              </Button>
              {(search || statusFilter !== 'all' || channelFilter !== 'all' || dateFilter !== 'all') && (
                <Button onClick={clearFilters} variant="ghost" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
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
      <div className="flex gap-6 h-[700px]">
        {/* Conversations List */}
        <Card className={cn("overflow-hidden transition-all duration-300", selected ? "w-2/3" : "w-full")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation List
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>{rows.length} of {totalCount}</span>
                </div>
                {rows.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={exportConversations}>
                        <Download className="h-4 w-4 mr-2" />
                        Export All
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive Selected
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-full relative">
            {loading && page === 0 && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="text-sm font-medium">Loading conversations...</span>
                </div>
              </div>
            )}
            {!loading && rows.length === 0 ? (
              <EmptyState />
            ) : (
              <AutoSizer>
                {({ height, width }) => (
                  <Table
                    width={width}
                    height={height - 120} // Account for header
                    headerHeight={44}
                    rowHeight={72}
                    rowCount={rows.length}
                    rowGetter={rowGetter}
                    onRowClick={({ rowData }) => handleConversationSelect(rowData)}
                    rowClassName={({ index }) => {
                      const conversation = rows[index];
                      return cn(
                        "cursor-pointer transition-all duration-200",
                        "hover:bg-muted/50 hover:shadow-sm",
                        selected?.id === conversation?.id && "bg-primary/5 border-l-2 border-l-primary shadow-sm"
                      );
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
                      label="Contact & Channel" 
                      dataKey="contact_id" 
                      width={240}
                      cellRenderer={({ cellData, rowData }) => (
                        <div className="flex items-center gap-3 py-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            rowData.status === 'active' ? 'bg-green-100 text-green-700' :
                            rowData.status === 'ended' ? 'bg-gray-100 text-gray-700' :
                            'bg-orange-100 text-orange-700'
                          )}>
                            {rowData.channel === 'whatsapp' ? (
                              <Smartphone className="h-5 w-5" />
                            ) : rowData.channel === 'telegram' ? (
                              <MessageCircle className="h-5 w-5" />
                            ) : (
                              <Phone className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate text-sm">{cellData}</p>
                              <Badge 
                                variant={rowData.channel === 'whatsapp' ? 'default' : 'secondary'} 
                                className="text-xs shrink-0"
                              >
                                {rowData.channel}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {rowData.message_count} msgs
                              </span>
                              <span className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                {rowData.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    />
                    <Column 
                      label="Timeline & Duration" 
                      dataKey="started_at" 
                      width={180}
                      cellRenderer={({ cellData, rowData }) => (
                        <div className="py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {formatDistanceToNow(new Date(cellData), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(cellData), 'MMM dd, HH:mm')}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {rowData.conversation_duration_minutes ? `${rowData.conversation_duration_minutes}m` : 'Ongoing'}
                            </span>
                          </div>
                        </div>
                      )}
                    />
                    <Column 
                      label="AI & Performance" 
                      dataKey="model_used" 
                      width={160}
                      cellRenderer={({ cellData, rowData }) => (
                        <div className="py-2">
                          {cellData ? (
                            <div className="flex items-center gap-2 mb-2">
                              <Bot className="h-4 w-4 text-blue-600" />
                              <Badge variant="outline" className="text-xs">
                                {cellData.split('-')[0] || cellData}
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <Badge variant="secondary" className="text-xs">Manual</Badge>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {Math.round((rowData.message_count || 0) / Math.max(1, rowData.conversation_duration_minutes || 1))} msg/min
                            </span>
                          </div>
                        </div>
                      )}
                    />
                    
                    <Column 
                      label="Actions" 
                      dataKey="id" 
                      width={80}
                      cellRenderer={({ rowData }) => (
                        <div className="flex items-center justify-center py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleConversationSelect(rowData)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Export Messages
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open in WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
          <Card className="w-1/3 flex flex-col shadow-lg">
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-blue-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Conversation Details</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selected.contact_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
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
                        Open in WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Conversation Settings
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelected(null)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-hidden space-y-6">
              {/* Contact Information */}
              {selectedContact && (
                <div className="bg-gradient-to-r from-muted/30 to-muted/60 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">
                        {selectedContact.name || 'Unknown Contact'}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {selectedContact.phone_number}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        Contact ID: {selectedContact.id.slice(0, 8)}...
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase">Type</span>
                      <div>
                        <Badge variant="outline">
                          {selectedContact.contact_type || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase">Status</span>
                      <div>
                        <Badge 
                          variant={selectedContact.conversion_status === 'customer' ? 'default' : 'secondary'}
                        >
                          {selectedContact.conversion_status || 'Prospect'}
                        </Badge>
                      </div>
                    </div>
                    {selectedContact.location && (
                      <div className="col-span-2 space-y-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Location</span>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{selectedContact.location}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Conversation Metadata */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Conversation Analytics</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-3">
                    <div className="text-center">
                      <MessageSquare className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                      <div className="text-lg font-bold">{selected.message_count}</div>
                      <div className="text-xs text-muted-foreground">Messages</div>
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-center">
                      <Clock className="h-6 w-6 mx-auto text-green-600 mb-1" />
                      <div className="text-lg font-bold">
                        {selected.conversation_duration_minutes || 0}m
                      </div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-center">
                      <TrendingUp className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                      <div className="text-lg font-bold">
                        {Math.round((selected.message_count || 0) / Math.max(1, selected.conversation_duration_minutes || 1))}
                      </div>
                      <div className="text-xs text-muted-foreground">Msg/Min</div>
                    </div>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Channel</span>
                    </div>
                    <Badge variant={selected.channel === 'whatsapp' ? 'default' : 'secondary'}>
                      {selected.channel}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Status</span>
                    </div>
                    <Badge 
                      variant={
                        selected.status === 'active' ? 'default' : 
                        selected.status === 'ended' ? 'secondary' : 'outline'
                      }
                    >
                      {selected.status}
                    </Badge>
                  </div>
                  
                  {selected.model_used && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">AI Model</span>
                      </div>
                      <Badge variant="outline">
                        {selected.model_used.split('-')[0] || selected.model_used}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Timeline</span>
                    </div>
                    
                    <div className="ml-6 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Started:</span>
                        <span className="font-medium">
                          {format(new Date(selected.started_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">
                          {formatDistanceToNow(new Date(selected.started_at))}
                        </span>
                      </div>
                      {selected.ended_at && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Ended:</span>
                          <span className="font-medium">
                            {format(new Date(selected.ended_at), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
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