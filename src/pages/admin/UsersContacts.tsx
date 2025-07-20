import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Phone, UserPlus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function UsersContacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

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

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone_number?.includes(searchTerm)
  );

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone_number?.includes(searchTerm)
  );

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Users & Contacts</h1>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
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

      <div className="flex items-center space-x-2 mb-4">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search by name or phone number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

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
                      <Button variant="outline" size="sm">
                        View Profile
                      </Button>
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
                      <Button variant="outline" size="sm">
                        Send Message
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}