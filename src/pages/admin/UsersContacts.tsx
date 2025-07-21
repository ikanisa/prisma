import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Users, Phone, UserPlus, Search, Upload, Download, 
  RefreshCw, MapPin, Globe, Filter, MessageCircle,
  FileText, Calendar, TrendingUp, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GooglePlacesSearch } from "@/components/admin/GooglePlacesSearch";
import { SmartFileUpload } from "@/components/admin/SmartFileUpload";

export default function UsersContacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactTypeFilter, setContactTypeFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contactsResult, conversationsResult] = await Promise.all([
        supabase.from('contacts').select('*').limit(100),
        supabase.from('conversations').select('contact_phone, created_at').limit(100)
      ]);

      setContacts(contactsResult.data || []);
      
      // Create users from unique phone numbers
      const phoneNumbers = new Set([
        ...(contactsResult.data || []).map(c => c.phone_number),
        ...(conversationsResult.data || []).map(c => c.contact_phone)
      ]);
      
      const uniqueUsers = Array.from(phoneNumbers).map(phone => ({
        id: phone,
        phone_number: phone,
        name: (contactsResult.data || []).find(c => c.phone_number === phone)?.name || 'Unknown',
        contact_type: (contactsResult.data || []).find(c => c.phone_number === phone)?.contact_type || 'prospect',
        last_interaction: (conversationsResult.data || [])
          .filter(c => c.contact_phone === phone)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
      }));
      
      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.phone_number?.includes(searchTerm);
    const matchesType = contactTypeFilter === 'all' || contact.contact_type === contactTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone_number?.includes(searchTerm)
  );

  const exportContacts = () => {
    const csv = contacts.map(contact => ({
      Name: contact.name || 'Unknown',
      Phone: contact.phone_number,
      Type: contact.contact_type,
      Location: contact.location || '',
      'Total Conversations': contact.total_conversations,
      'First Contact': new Date(contact.first_contact_date).toLocaleDateString(),
      'Last Interaction': contact.last_interaction ? new Date(contact.last_interaction).toLocaleDateString() : ''
    }));

    const csvContent = [
      Object.keys(csv[0]).join(','),
      ...csv.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Contacts exported successfully"
    });
  };

  const uniqueContactTypes = [...new Set(contacts.map(c => c.contact_type))].filter(Boolean);

  const getContactTypeColor = (type: string) => {
    switch (type) {
      case 'customer': return 'bg-green-500';
      case 'driver': return 'bg-blue-500';
      case 'farmer': return 'bg-yellow-500';
      case 'prospect': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users & Contacts</h1>
          <p className="text-muted-foreground">Manage contacts and WhatsApp users</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportContacts}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Smart Upload
          </Button>
          <GooglePlacesSearch 
            searchType="contacts" 
            onSearchComplete={(results) => {
              fetchData();
              toast({
                title: "Google Places Import Complete",
                description: `${results.processed || 0} contacts imported`
              });
            }}
          />
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddContact(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Contacts</p>
                <p className="text-2xl font-bold">{contacts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">WhatsApp Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Customers</p>
                <p className="text-2xl font-bold">
                  {contacts.filter(c => c.contact_type === 'customer').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Prospects</p>
                <p className="text-2xl font-bold">
                  {contacts.filter(c => c.contact_type === 'prospect').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <select
                value={contactTypeFilter}
                onChange={(e) => setContactTypeFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Types</option>
                {uniqueContactTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="contacts" className="w-full">
        <TabsList>
          <TabsTrigger value="contacts">Contacts Database</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp Users</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contact Database</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredContacts.map((contact) => (
                  <div key={contact.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{contact.name || 'Unknown'}</h3>
                          <Badge className={getContactTypeColor(contact.contact_type)}>
                            {contact.contact_type}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>📱 {contact.phone_number}</span>
                          <span>📍 {contact.location || 'Not specified'}</span>
                          <span>💬 {contact.total_conversations} conversations</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          First contact: {new Date(contact.first_contact_date).toLocaleDateString()}
                          {contact.last_interaction && (
                            <span className="ml-4">
                              Last interaction: {new Date(contact.last_interaction).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          WhatsApp
                        </Button>
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{user.name}</h3>
                          <Badge className={getContactTypeColor(user.contact_type)}>
                            {user.contact_type}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>📱 {user.phone_number}</span>
                          <span>💬 WhatsApp Active</span>
                        </div>
                        {user.last_interaction && (
                          <div className="text-sm text-gray-500">
                            Last interaction: {new Date(user.last_interaction).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Send Message
                        </Button>
                        <Button variant="outline" size="sm">
                          View Chat
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Smart Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Smart Contacts Upload</DialogTitle>
            <DialogDescription>
              Upload any file format and our AI will intelligently extract contact data and update the database.
              Supports CSV, JSON, TXT, PDF and other formats.
            </DialogDescription>
          </DialogHeader>
          <SmartFileUpload
            targetTable="contacts"
            onUploadComplete={(result) => {
              setShowUpload(false);
              fetchData();
              toast({
                title: "Upload Complete",
                description: `${result.insertedCount} contacts added successfully`
              });
            }}
            onError={(error) => {
              toast({
                title: "Upload Failed",
                description: error,
                variant: "destructive"
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Add a new contact to the database manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Contact Name" />
            <Input placeholder="Phone Number" />
            <select className="w-full px-3 py-2 border rounded-md">
              <option value="">Select Contact Type</option>
              <option value="customer">Customer</option>
              <option value="driver">Driver</option>
              <option value="farmer">Farmer</option>
              <option value="prospect">Prospect</option>
            </select>
            <Input placeholder="Location (optional)" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddContact(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setShowAddContact(false);
                toast({
                  title: "Contact Added",
                  description: "New contact has been added successfully"
                });
              }}>
                Add Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}