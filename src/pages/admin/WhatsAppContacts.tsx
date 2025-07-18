import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Column, Table, AutoSizer } from 'react-virtualized';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  Search, Download, Upload, RefreshCw, Users, Filter, 
  MoreHorizontal, Phone, MessageSquare, MapPin, 
  Calendar, TrendingUp, Eye, Archive, UserCheck,
  Globe, Smartphone, FileText, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 100;

type Contact = {
  id: string;
  phone_number: string;
  name: string | null;
  first_contact_date: string | null;
  last_interaction: string | null;
  preferred_channel: string | null;
  conversion_status: string | null;
  contact_type: string | null;
  location: string | null;
  total_conversations: number | null;
};

export default function WhatsAppContacts() {
  const [data, setData] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('last_interaction');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchPage = useCallback(async (pageIndex: number, searchTerm: string = '') => {
    setLoading(true);
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (searchTerm) {
      query = query.or(`phone_number.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
    }

    if (filterStatus !== 'all') {
      query = query.eq('conversion_status', filterStatus);
    }

    if (filterType !== 'all') {
      query = query.eq('contact_type', filterType);
    }

    const { data: contacts, error, count } = await query;

    if (!error && contacts) {
      setData(prev => (pageIndex === 0 ? contacts : [...prev, ...contacts]));
      setTotalCount(count || 0);
    } else {
      toast.error('Failed to load contacts');
    }
    setLoading(false);
  }, [sortBy, sortOrder, filterStatus, filterType]);

  useEffect(() => {
    setData([]);
    setPage(0);
    fetchPage(0, search);
  }, [search, fetchPage, filterStatus, filterType, sortBy, sortOrder]);

  const handleSearch = () => {
    setData([]);
    setPage(0);
    fetchPage(0, search);
  };

  const handleBulkImport = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split(/\n|\r/).filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim());
      
      const contacts = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const contact: any = {};
        
        headers.forEach((header, index) => {
          if (values[index]) {
            contact[header] = values[index];
          }
        });
        
        return contact;
      });

      const { error } = await supabase
        .from('contacts')
        .insert(contacts);

      if (error) throw error;
      
      toast.success(`Imported ${contacts.length} contacts`);
      handleSearch();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import contacts');
    }
  };

  const exportContacts = async () => {
    try {
      const { data: allContacts, error } = await supabase
        .from('contacts')
        .select('*');

      if (error) throw error;

      const csv = [
        'phone_number,name,contact_type,conversion_status,location,preferred_channel',
        ...allContacts.map(contact => 
          `${contact.phone_number},${contact.name || ''},${contact.contact_type || ''},${contact.conversion_status || ''},${contact.location || ''},${contact.preferred_channel || ''}`
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Contacts exported successfully');
    } catch (error) {
      toast.error('Failed to export contacts');
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'customer': return 'default';
      case 'lead': return 'secondary';
      case 'qualified': return 'outline';
      default: return 'secondary';
    }
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'customer': return 'default';
      case 'lead': return 'outline';
      case 'prospect': return 'secondary';
      default: return 'secondary';
    }
  };

  const rowGetter = ({ index }: { index: number }) => data[index];

  const stats = {
    totalContacts: totalCount,
    customers: data.filter(c => c.conversion_status === 'customer').length,
    leads: data.filter(c => c.conversion_status === 'lead').length,
    prospects: data.filter(c => c.conversion_status === 'prospect').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">WhatsApp Contacts</h1>
              <p className="text-sm text-muted-foreground">Manage and analyze your WhatsApp contact database</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportContacts} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => fetchPage(0, search)} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Globe className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalContacts.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold text-foreground">{stats.customers}</p>
                  <p className="text-xs text-green-600">+{((stats.customers / stats.totalContacts) * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leads</p>
                  <p className="text-2xl font-bold text-foreground">{stats.leads}</p>
                  <p className="text-xs text-blue-600">+{((stats.leads / stats.totalContacts) * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prospects</p>
                  <p className="text-2xl font-bold text-foreground">{stats.prospects}</p>
                  <p className="text-xs text-orange-600">+{((stats.prospects / stats.totalContacts) * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className={cn("transition-all duration-300", selectedContact ? "w-2/3 mr-6" : "w-full")}>
          <Tabs defaultValue="list" className="h-full flex flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Contact List
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Bulk Import
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="flex-1 overflow-hidden">
              <Card className="h-[700px] flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-4">
                    {/* Search and Filters */}
                    <div className="flex flex-wrap gap-3">
                      <div className="flex-1 min-w-[300px]">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Search by phone, name, or location..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                        const [field, order] = value.split('-');
                        setSortBy(field);
                        setSortOrder(order as 'asc' | 'desc');
                      }}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last_interaction-desc">Latest Interaction</SelectItem>
                          <SelectItem value="last_interaction-asc">Oldest Interaction</SelectItem>
                          <SelectItem value="created_at-desc">Newest First</SelectItem>
                          <SelectItem value="created_at-asc">Oldest First</SelectItem>
                          <SelectItem value="name-asc">Name A-Z</SelectItem>
                          <SelectItem value="name-desc">Name Z-A</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button onClick={handleSearch} variant="secondary" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Apply
                      </Button>
                    </div>

                    {/* Results Summary */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Showing {data.length} of {totalCount} contacts
                        {(filterStatus !== 'all' || filterType !== 'all' || search) && ' (filtered)'}
                      </span>
                      {(filterStatus !== 'all' || filterType !== 'all' || search) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearch('');
                            setFilterStatus('all');
                            setFilterType('all');
                          }}
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 flex flex-col gap-4 h-full overflow-hidden">
                  <div className="flex-1 relative">
                    {loading && page === 0 && (
                      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="text-sm font-medium">Loading contacts...</span>
                        </div>
                      </div>
                    )}
                    
                    {data.length === 0 && !loading ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
                        <p className="text-muted-foreground mb-4">
                          {search || filterStatus !== 'all' || filterType !== 'all' 
                            ? 'Try adjusting your filters or search terms.'
                            : 'Start by importing contacts or add them manually.'
                          }
                        </p>
                        {!search && filterStatus === 'all' && filterType === 'all' && (
                          <Button variant="outline">
                            <Upload className="h-4 w-4 mr-2" />
                            Import Contacts
                          </Button>
                        )}
                      </div>
                    ) : (
                      <AutoSizer>
                        {({ height, width }) => (
                          <Table
                            width={width}
                            height={height}
                            headerHeight={44}
                            rowHeight={64}
                            rowCount={data.length}
                            rowGetter={rowGetter}
                            onRowClick={({ rowData }) => setSelectedContact(rowData)}
                            rowClassName={({ index }) => cn(
                              "cursor-pointer transition-colors",
                              "hover:bg-muted/50",
                              selectedContact?.id === data[index]?.id && "bg-primary/5 border-l-2 border-l-primary"
                            )}
                            onRowsRendered={({ stopIndex }) => {
                              if (stopIndex >= data.length - 1 && !loading && data.length < totalCount) {
                                const nextPage = page + 1;
                                setPage(nextPage);
                                fetchPage(nextPage, search);
                              }
                            }}
                          >
                            <Column 
                              label="#" 
                              dataKey="id" 
                              width={50} 
                              cellRenderer={({ rowIndex }) => (
                                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                  {rowIndex + 1}
                                </div>
                              )}
                            />
                            
                            <Column 
                              label="Contact" 
                              dataKey="phone_number" 
                              width={220}
                              cellRenderer={({ rowData }) => (
                                <div className="flex items-center gap-3 h-full py-2">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Phone className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {rowData.name || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {rowData.phone_number}
                                    </p>
                                  </div>
                                </div>
                              )}
                            />
                            
                            <Column 
                              label="Type & Status" 
                              dataKey="contact_type" 
                              width={140}
                              cellRenderer={({ rowData }) => (
                                <div className="flex flex-col gap-1 h-full justify-center">
                                  <Badge variant={getTypeColor(rowData.contact_type)} className="text-xs">
                                    {rowData.contact_type || 'prospect'}
                                  </Badge>
                                  <Badge variant={getStatusColor(rowData.conversion_status)} className="text-xs">
                                    {rowData.conversion_status || 'prospect'}
                                  </Badge>
                                </div>
                              )}
                            />
                            
                            <Column 
                              label="Activity" 
                              dataKey="total_conversations" 
                              width={120}
                              cellRenderer={({ rowData }) => (
                                <div className="flex items-center gap-2 h-full">
                                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {rowData.total_conversations || 0}
                                  </span>
                                </div>
                              )}
                            />
                            
                            <Column 
                              label="Last Interaction" 
                              dataKey="last_interaction" 
                              width={150}
                              cellRenderer={({ rowData }) => (
                                <div className="flex items-center gap-2 h-full">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <div className="text-xs">
                                    {rowData.last_interaction ? (
                                      <>
                                        <div className="text-foreground">
                                          {formatDistanceToNow(new Date(rowData.last_interaction), { addSuffix: true })}
                                        </div>
                                        <div className="text-muted-foreground">
                                          {format(new Date(rowData.last_interaction), 'MMM d, yyyy')}
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">Never</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            />
                            
                            <Column 
                              label="Location" 
                              dataKey="location" 
                              width={140}
                              cellRenderer={({ rowData }) => (
                                <div className="flex items-center gap-2 h-full">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm truncate">
                                    {rowData.location || '—'}
                                  </span>
                                </div>
                              )}
                            />
                            
                            <Column 
                              label="Actions" 
                              dataKey="id" 
                              width={80}
                              cellRenderer={({ rowData }) => (
                                <div className="flex items-center justify-center h-full">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => setSelectedContact(rowData)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        View Conversations
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Settings className="h-4 w-4 mr-2" />
                                        Edit Contact
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-orange-600">
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="import">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Bulk Import Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file to bulk import contacts. Ensure your file includes the required columns for best results.
                    </p>
                  </div>
                  
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 hover:border-muted-foreground/50 transition-colors">
                    <div className="text-center">
                      <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Drop your CSV file here</h3>
                      <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                      <Input 
                        type="file" 
                        accept=".csv" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await handleBulkImport(file);
                          }
                        }}
                        className="max-w-sm mx-auto"
                      />
                      <p className="text-xs text-muted-foreground mt-3">
                        Maximum file size: 10MB • Supported format: CSV
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Required Columns
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">phone_number</span>
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>name</span>
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>contact_type</span>
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>conversion_status</span>
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>location</span>
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>preferred_channel</span>
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Sample CSV Format</h4>
                      <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-xs text-muted-foreground font-mono">
{`phone_number,name,contact_type,conversion_status,location,preferred_channel
+1234567890,John Doe,lead,prospect,New York,whatsapp
+0987654321,Jane Smith,customer,customer,California,whatsapp
+5551234567,Bob Johnson,prospect,prospect,Texas,whatsapp`}
                        </pre>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• Phone numbers should include country code</p>
                        <p>• contact_type: prospect, lead, customer</p>
                        <p>• conversion_status: prospect, lead, qualified, customer</p>
                        <p>• preferred_channel: whatsapp, sms, email</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Contact Detail Panel */}
        {selectedContact && (
          <div className="w-1/3 space-y-4">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{selectedContact.name || 'Unknown Contact'}</h3>
                      <p className="text-sm text-muted-foreground">{selectedContact.phone_number}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedContact(null)}
                    className="shrink-0"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getTypeColor(selectedContact.contact_type)}>
                    {selectedContact.contact_type || 'prospect'}
                  </Badge>
                  <Badge variant={getStatusColor(selectedContact.conversion_status)}>
                    {selectedContact.conversion_status || 'prospect'}
                  </Badge>
                  <Badge variant="outline">
                    {selectedContact.preferred_channel || 'whatsapp'}
                  </Badge>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Phone Number</p>
                          <p className="text-sm text-muted-foreground">{selectedContact.phone_number}</p>
                        </div>
                      </div>

                      {selectedContact.location && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Location</p>
                            <p className="text-sm text-muted-foreground">{selectedContact.location}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Total Conversations</p>
                          <p className="text-sm text-muted-foreground">{selectedContact.total_conversations || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Timeline</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">First Contact</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedContact.first_contact_date ? 
                              format(new Date(selectedContact.first_contact_date), 'MMM d, yyyy') : 
                              '—'
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Last Interaction</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedContact.last_interaction ? 
                              formatDistanceToNow(new Date(selectedContact.last_interaction), { addSuffix: true }) : 
                              'Never'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Quick Actions</h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="w-full">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        History
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}