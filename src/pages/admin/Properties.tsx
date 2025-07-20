import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Eye, Edit, Trash2, Home, MapPin, Bed, Bath, DollarSign, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface Property {
  id: string;
  title: string;
  description: string;
  action: 'rent' | 'sale';
  price_month: number;
  price_total: number;
  currency: string;
  district: string;
  sector: string;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  imgs: string[];
  status: 'draft' | 'published' | 'archived' | 'pending';
  owner_phone: string;
  created_at: string;
  updated_at: string;
}

interface PropertyStats {
  total: number;
  published: number;
  pending: number;
  drafts: number;
  archived: number;
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<PropertyStats>({ total: 0, published: 0, pending: 0, drafts: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [newProperty, setNewProperty] = useState<Partial<Property>>({
    action: 'rent',
    status: 'draft',
    currency: 'RWF',
    furnished: false
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProperties();
    fetchStats();
  }, [searchQuery, statusFilter, actionFilter]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('tbl_properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,district.ilike.%${searchQuery}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as Property['status']);
      }

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action', actionFilter as Property['action']);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch properties",
          variant: "destructive",
        });
        return;
      }

      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: "Failed to fetch properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('tbl_properties')
        .select('status');

      if (error) return;

      const statsData = data?.reduce((acc, property) => {
        acc.total++;
        acc[property.status]++;
        return acc;
      }, { total: 0, published: 0, pending: 0, drafts: 0, archived: 0 } as PropertyStats);

      setStats(statsData || { total: 0, published: 0, pending: 0, drafts: 0, archived: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateProperty = async () => {
    try {
      if (!newProperty.title || !newProperty.owner_phone) {
        toast({
          title: "Error",
          description: "Title and Owner Phone are required",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('tbl_properties')
        .insert([newProperty as any]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create property",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Property created successfully",
      });

      setShowCreateDialog(false);
      setNewProperty({
        action: 'rent',
        status: 'draft',
        currency: 'RWF',
        furnished: false
      });
      fetchProperties();
      fetchStats();
    } catch (error) {
      console.error('Error creating property:', error);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('tbl_properties')
        .update({ status: status as Property['status'], updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update property status",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Property status updated",
      });

      fetchProperties();
      fetchStats();
    } catch (error) {
      console.error('Error updating property:', error);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;

    try {
      const { error } = await supabase
        .from('tbl_properties')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete property",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Property deleted successfully",
      });

      fetchProperties();
      fetchStats();
    } catch (error) {
      console.error('Error deleting property:', error);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'published': return 'default';
      case 'pending': return 'secondary';
      case 'draft': return 'outline';
      case 'archived': return 'destructive';
      default: return 'outline';
    }
  };

  const formatPrice = (property: Property) => {
    if (property.action === 'rent') {
      return property.price_month ? `${property.price_month.toLocaleString()} RWF/month` : 'N/A';
    } else {
      return property.price_total ? `${property.price_total.toLocaleString()} RWF` : 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Properties</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.drafts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.archived}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card key={property.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{property.title}</CardTitle>
                  <Badge variant={getStatusBadgeVariant(property.status)}>
                    {property.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Home className="h-4 w-4" />
                  <Badge variant="outline">{property.action}</Badge>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  {property.district}, {property.sector}
                </div>

                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    {property.bedrooms || 0} bed
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {property.bathrooms || 0} bath
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4" />
                  {formatPrice(property)}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(property.created_at).toLocaleDateString()}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(property);
                      setShowViewDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {property.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(property.id, 'published')}
                        className="text-green-600"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(property.id, 'archived')}
                        className="text-red-600"
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProperty(property.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Property Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newProperty.title || ''}
                  onChange={(e) => setNewProperty({...newProperty, title: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="action">Type *</Label>
                <Select 
                  value={newProperty.action} 
                  onValueChange={(value) => setNewProperty({...newProperty, action: value as 'rent' | 'sale'})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={newProperty.district || ''}
                  onChange={(e) => setNewProperty({...newProperty, district: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="sector">Sector</Label>
                <Input
                  id="sector"
                  value={newProperty.sector || ''}
                  onChange={(e) => setNewProperty({...newProperty, sector: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={newProperty.bedrooms || ''}
                  onChange={(e) => setNewProperty({...newProperty, bedrooms: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  value={newProperty.bathrooms || ''}
                  onChange={(e) => setNewProperty({...newProperty, bathrooms: parseInt(e.target.value)})}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="furnished"
                  checked={newProperty.furnished}
                  onCheckedChange={(checked) => setNewProperty({...newProperty, furnished: checked as boolean})}
                />
                <Label htmlFor="furnished">Furnished</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="price">
                {newProperty.action === 'rent' ? 'Monthly Price (RWF)' : 'Total Price (RWF)'}
              </Label>
              <Input
                id="price"
                type="number"
                value={newProperty.action === 'rent' ? newProperty.price_month || '' : newProperty.price_total || ''}
                onChange={(e) => setNewProperty({
                  ...newProperty, 
                  [newProperty.action === 'rent' ? 'price_month' : 'price_total']: parseInt(e.target.value)
                })}
              />
            </div>

            <div>
              <Label htmlFor="owner_phone">Owner Phone *</Label>
              <Input
                id="owner_phone"
                value={newProperty.owner_phone || ''}
                onChange={(e) => setNewProperty({...newProperty, owner_phone: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProperty.description || ''}
                onChange={(e) => setNewProperty({...newProperty, description: e.target.value})}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateProperty}>Create Property</Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Property Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Property Details</DialogTitle>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <p className="font-medium">{selectedProperty.title}</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <Badge>{selectedProperty.action}</Badge>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground">{selectedProperty.description || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Location</Label>
                  <p>{selectedProperty.district}, {selectedProperty.sector}</p>
                </div>
                <div>
                  <Label>Price</Label>
                  <p className="font-medium">{formatPrice(selectedProperty)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Bedrooms</Label>
                  <p>{selectedProperty.bedrooms || 0}</p>
                </div>
                <div>
                  <Label>Bathrooms</Label>
                  <p>{selectedProperty.bathrooms || 0}</p>
                </div>
                <div>
                  <Label>Furnished</Label>
                  <p>{selectedProperty.furnished ? 'Yes' : 'No'}</p>
                </div>
              </div>

              <div>
                <Label>Owner Phone</Label>
                <p>{selectedProperty.owner_phone}</p>
              </div>

              <div>
                <Label>Status</Label>
                <Badge variant={getStatusBadgeVariant(selectedProperty.status)}>
                  {selectedProperty.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}