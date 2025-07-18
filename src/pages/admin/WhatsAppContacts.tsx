import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Column, Table, AutoSizer } from 'react-virtualized';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Search, Download, Upload, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';

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

  const fetchPage = useCallback(async (pageIndex: number, searchTerm: string = '') => {
    setLoading(true);
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .order('last_interaction', { ascending: false })
      .range(from, to);

    if (searchTerm) {
      query = query.or(`phone_number.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
    }

    const { data: contacts, error, count } = await query;

    if (!error && contacts) {
      setData(prev => (pageIndex === 0 ? contacts : [...prev, ...contacts]));
      setTotalCount(count || 0);
    } else {
      toast.error('Failed to load contacts');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setData([]);
    setPage(0);
    fetchPage(0, search);
  }, [search, fetchPage]);

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

  const rowGetter = ({ index }: { index: number }) => data[index];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">WhatsApp Contacts</h1>
          <Badge variant="secondary">{totalCount} total</Badge>
        </div>
        <Button onClick={exportContacts} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="list" className="h-full flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="list">Contact List</TabsTrigger>
          <TabsTrigger value="import">Bulk Import</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="flex-1 overflow-hidden">
          <Card className="h-[700px] flex flex-col">
            <CardContent className="p-4 flex flex-col gap-4 h-full">
              <div className="flex gap-2">
                <Input 
                  placeholder="Search by phone or name..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSearch} variant="secondary">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button onClick={() => fetchPage(0, search)} variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 relative">
                {loading && page === 0 && <Skeleton className="absolute inset-0" />}
                <AutoSizer>
                  {({ height, width }) => (
                    <Table
                      width={width}
                      height={height}
                      headerHeight={40}
                      rowHeight={48}
                      rowCount={data.length}
                      rowGetter={rowGetter}
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
                        width={60} 
                        cellRenderer={({ rowIndex }) => rowIndex + 1} 
                      />
                      <Column 
                        label="Phone" 
                        dataKey="phone_number" 
                        width={180} 
                      />
                      <Column 
                        label="Name" 
                        dataKey="name" 
                        width={180}
                        cellRenderer={({ cellData }) => cellData || '—'}
                      />
                      <Column 
                        label="Type" 
                        dataKey="contact_type" 
                        width={120}
                        cellRenderer={({ cellData }) => 
                          <Badge variant="outline">{cellData || 'prospect'}</Badge>
                        }
                      />
                      <Column 
                        label="Status" 
                        dataKey="conversion_status" 
                        width={120}
                        cellRenderer={({ cellData }) => 
                          <Badge variant={cellData === 'customer' ? 'default' : 'secondary'}>
                            {cellData || 'prospect'}
                          </Badge>
                        }
                      />
                      <Column 
                        label="Last Interaction" 
                        dataKey="last_interaction" 
                        width={180}
                        cellRenderer={({ cellData }) => 
                          cellData ? formatDistanceToNow(new Date(cellData), { addSuffix: true }) : '—'
                        }
                      />
                      <Column 
                        label="Conversations" 
                        dataKey="total_conversations" 
                        width={120}
                        cellRenderer={({ cellData }) => cellData || 0}
                      />
                      <Column 
                        label="Location" 
                        dataKey="location" 
                        width={150}
                        cellRenderer={({ cellData }) => cellData || '—'}
                      />
                    </Table>
                  )}
                </AutoSizer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Bulk Import Contacts</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file with columns: phone_number, name, contact_type, conversion_status, location, preferred_channel
                </p>
              </div>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
                  <p className="text-sm text-muted-foreground mt-2">
                    Select a CSV file to import contacts
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">CSV Format Example:</h4>
                <pre className="text-sm text-muted-foreground">
{`phone_number,name,contact_type,conversion_status,location,preferred_channel
+1234567890,John Doe,lead,prospect,New York,whatsapp
+0987654321,Jane Smith,customer,customer,California,whatsapp`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}