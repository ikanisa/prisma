import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Plus, 
  Download, 
  Upload, 
  UserPlus, 
  Tag, 
  Filter,
  MoreHorizontal,
  MessageCircle,
  Phone,
  Calendar
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface WAContact {
  id: string;
  wa_id: string;
  display_name?: string;
  business_name?: string;
  last_seen: string;
  tags: string[];
  profile_pic_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ContactFilters {
  search: string;
  status: string;
  tags: string[];
}

export default function WAContactsPage() {
  const [filters, setFilters] = useState<ContactFilters>({
    search: "",
    status: "all",
    tags: []
  });
  const [page, setPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState<WAContact | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch contacts with pagination and filters
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['wa-contacts', page, filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('wa-contacts-manager', {
        body: {
          action: 'list',
          payload: {
            page,
            limit: 20,
            search: filters.search || undefined,
            status: filters.status !== 'all' ? filters.status : undefined,
            tags: filters.tags.length > 0 ? filters.tags : undefined
          }
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data;
    }
  });

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (contact: Omit<WAContact, 'id' | 'created_at' | 'updated_at' | 'last_seen'>) => {
      const { data, error } = await supabase.functions.invoke('wa-contacts-manager', {
        body: { action: 'create', payload: contact }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-contacts'] });
      toast.success("Contact created successfully");
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create contact: ${error.message}`);
    }
  });

  // Update contact tags mutation
  const updateTagsMutation = useMutation({
    mutationFn: async ({ contactId, tags }: { contactId: string; tags: string[] }) => {
      const { data, error } = await supabase.functions.invoke('wa-contacts-manager', {
        body: { action: 'sync_tags', payload: { contact_id: contactId, tags } }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-contacts'] });
      toast.success("Tags updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update tags: ${error.message}`);
    }
  });

  // Import contacts mutation
  const importContactsMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const { data, error } = await supabase.functions.invoke('contact-import', {
        body: { action: 'import_csv', payload: { csv_data: csvData } }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['wa-contacts'] });
      toast.success(`Import completed: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped`);
      setIsImportDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    }
  });

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
    setPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({ ...prev, status }));
    setPage(1);
  };

  const handleCreateContact = (formData: FormData) => {
    const wa_id = formData.get('wa_id') as string;
    const display_name = formData.get('display_name') as string;
    const business_name = formData.get('business_name') as string;
    const tags = (formData.get('tags') as string)?.split(',').map(t => t.trim()).filter(Boolean) || [];

    createContactMutation.mutate({
      wa_id,
      display_name,
      business_name,
      tags,
      status: 'active'
    });
  };

  const handleImport = (csvData: string) => {
    importContactsMutation.mutate(csvData);
  };

  const contacts = contactsData?.contacts || [];
  const pagination = contactsData?.pagination;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Contacts</h1>
          <p className="text-muted-foreground">Manage and sync your WhatsApp contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Contacts</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with columns: wa_id, display_name, business_name, tags
                </DialogDescription>
              </DialogHeader>
              <ImportForm onImport={handleImport} isLoading={importContactsMutation.isPending} />
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Create a new WhatsApp contact entry
                </DialogDescription>
              </DialogHeader>
              <CreateContactForm 
                onSubmit={handleCreateContact} 
                isLoading={createContactMutation.isPending} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search contacts..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.status} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Contacts</p>
                <p className="text-2xl font-bold">{pagination?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold">{contacts.filter(c => c.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Business</p>
                <p className="text-2xl font-bold">{contacts.filter(c => c.business_name).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Tagged</p>
                <p className="text-2xl font-bold">{contacts.filter(c => c.tags.length > 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle>Contacts ({pagination?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg border animate-pulse">
                    <div className="h-10 w-10 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No contacts found. Try adjusting your filters or import some contacts.
              </div>
            ) : (
              contacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onUpdateTags={(tags) => updateTagsMutation.mutate({ contactId: contact.id, tags })}
                  onSelect={() => setSelectedContact(contact)}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Contact Card Component
function ContactCard({ 
  contact, 
  onUpdateTags, 
  onSelect 
}: { 
  contact: WAContact;
  onUpdateTags: (tags: string[]) => void;
  onSelect: () => void;
}) {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tempTags, setTempTags] = useState(contact.tags.join(', '));

  const handleSaveTags = () => {
    const tags = tempTags.split(',').map(t => t.trim()).filter(Boolean);
    onUpdateTags(tags);
    setIsEditingTags(false);
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      <Avatar>
        <AvatarImage src={contact.profile_pic_url} />
        <AvatarFallback>
          {contact.display_name?.charAt(0) || contact.wa_id.charAt(0)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{contact.display_name || contact.wa_id}</h3>
          <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
            {contact.status}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{contact.wa_id}</span>
          {contact.business_name && <span>• {contact.business_name}</span>}
          <span>• Last seen {new Date(contact.last_seen).toLocaleDateString()}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditingTags ? (
            <div className="flex items-center gap-2">
              <Input
                value={tempTags}
                onChange={(e) => setTempTags(e.target.value)}
                placeholder="Enter tags separated by commas"
                className="h-8"
              />
              <Button size="sm" onClick={handleSaveTags}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditingTags(false)}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {contact.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingTags(true)}
                className="h-6 px-2"
              >
                <Tag className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onSelect}>
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEditingTags(true)}>
            Edit Tags
          </DropdownMenuItem>
          <DropdownMenuItem>
            Send Message
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Create Contact Form Component
function CreateContactForm({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}) {
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit(new FormData(e.currentTarget));
    }} className="space-y-4">
      <div>
        <Label htmlFor="wa_id">WhatsApp ID (Phone Number)</Label>
        <Input id="wa_id" name="wa_id" placeholder="+250781234567" required />
      </div>
      <div>
        <Label htmlFor="display_name">Display Name</Label>
        <Input id="display_name" name="display_name" placeholder="John Doe" />
      </div>
      <div>
        <Label htmlFor="business_name">Business Name</Label>
        <Input id="business_name" name="business_name" placeholder="Acme Corp" />
      </div>
      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input id="tags" name="tags" placeholder="vip, customer, frequent" />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Creating..." : "Create Contact"}
      </Button>
    </form>
  );
}

// Import Form Component
function ImportForm({ 
  onImport, 
  isLoading 
}: { 
  onImport: (csvData: string) => void;
  isLoading: boolean;
}) {
  const [csvData, setCsvData] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCsvData(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="csv_file">Upload CSV File</Label>
        <Input 
          id="csv_file" 
          type="file" 
          accept=".csv" 
          onChange={handleFileUpload}
        />
      </div>
      <div>
        <Label htmlFor="csv_data">Or Paste CSV Data</Label>
        <Textarea
          id="csv_data"
          value={csvData}
          onChange={(e) => setCsvData(e.target.value)}
          placeholder="wa_id,display_name,business_name,tags
+250781234567,John Doe,Acme Corp,vip;customer"
          rows={6}
        />
      </div>
      <Button 
        onClick={() => onImport(csvData)} 
        disabled={!csvData.trim() || isLoading}
      >
        {isLoading ? "Importing..." : "Import Contacts"}
      </Button>
    </div>
  );
}