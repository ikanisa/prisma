import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Save, X, Home, MapPin, Bed, Bath, DollarSign, Calendar, Phone, Globe } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  source?: string;
  url?: string;
  created_at: string;
  updated_at: string;
}

export default function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Property>>({});

  useEffect(() => {
    if (id) {
      fetchProperty(id);
    }
  }, [id]);

  const fetchProperty = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from('tbl_properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      setProperty(data);
      setEditForm(data);
    } catch (error) {
      console.error('Error fetching property:', error);
      toast({
        title: "Error",
        description: "Failed to fetch property details",
        variant: "destructive",
      });
      navigate('/admin/properties');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!property || !editForm) return;

    try {
      const { error } = await supabase
        .from('property_listings')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', property.id);

      if (error) throw error;

      setProperty({ ...property, ...editForm });
      setEditing(false);
      
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (property: Property) => {
    if (property.action === 'rent') {
      return property.price_month ? `${property.price_month.toLocaleString()} ${property.currency}/month` : 'N/A';
    } else {
      return property.price_total ? `${property.price_total.toLocaleString()} ${property.currency}` : 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Property not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/properties')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{property.title}</h1>
            <p className="text-muted-foreground">{property.district}, {property.sector}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(property.status)}>
            {property.status}
          </Badge>
          {editing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={() => setEditing(true)} size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={editForm.status} 
                        onValueChange={(value) => setEditForm({...editForm, status: value as any})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      rows={4}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-lg">{property.title}</h3>
                    <p className="text-muted-foreground">{property.description}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="district">District</Label>
                      <Input
                        id="district"
                        value={editForm.district || ''}
                        onChange={(e) => setEditForm({...editForm, district: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sector">Sector</Label>
                      <Input
                        id="sector"
                        value={editForm.sector || ''}
                        onChange={(e) => setEditForm({...editForm, sector: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        value={editForm.bedrooms || ''}
                        onChange={(e) => setEditForm({...editForm, bedrooms: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        value={editForm.bathrooms || ''}
                        onChange={(e) => setEditForm({...editForm, bathrooms: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Checkbox
                        id="furnished"
                        checked={editForm.furnished || false}
                        onCheckedChange={(checked) => setEditForm({...editForm, furnished: checked as boolean})}
                      />
                      <Label htmlFor="furnished">Furnished</Label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <span>{property.district}, {property.sector}</span>
                  </div>
                  
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Bed className="h-4 w-4 text-muted-foreground" />
                      <span>{property.bedrooms || 0} Bedrooms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bath className="h-4 w-4 text-muted-foreground" />
                      <span>{property.bathrooms || 0} Bathrooms</span>
                    </div>
                    {property.furnished && (
                      <Badge variant="outline">Furnished</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="action">Listing Type</Label>
                    <Select 
                      value={editForm.action} 
                      onValueChange={(value) => setEditForm({...editForm, action: value as any})}
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
                  {editForm.action === 'rent' ? (
                    <div>
                      <Label htmlFor="price_month">Monthly Rent</Label>
                      <Input
                        id="price_month"
                        type="number"
                        value={editForm.price_month || ''}
                        onChange={(e) => setEditForm({...editForm, price_month: parseInt(e.target.value)})}
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="price_total">Sale Price</Label>
                      <Input
                        id="price_total"
                        type="number"
                        value={editForm.price_total || ''}
                        onChange={(e) => setEditForm({...editForm, price_total: parseInt(e.target.value)})}
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="owner_phone">Owner Phone</Label>
                    <Input
                      id="owner_phone"
                      value={editForm.owner_phone || ''}
                      onChange={(e) => setEditForm({...editForm, owner_phone: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">{formatPrice(property)}</p>
                      <p className="text-sm text-muted-foreground">
                        {property.action === 'rent' ? 'Monthly rent' : 'Sale price'}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Contact:</span>
                    </div>
                    <p className="text-sm">{property.owner_phone}</p>
                  </div>

                  {property.url && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Original Listing:</span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={property.url} target="_blank" rel="noopener noreferrer">
                            View Source
                          </a>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Listing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Type:</span>
                <Badge variant="outline" className="ml-2">{property.action}</Badge>
              </div>
              <div>
                <span className="font-medium">Source:</span>
                <span className="ml-2">{property.source || 'Manual'}</span>
              </div>
              <div>
                <span className="font-medium">Created:</span>
                <span className="ml-2">{new Date(property.created_at).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="font-medium">Updated:</span>
                <span className="ml-2">{new Date(property.updated_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Images Section */}
      {property.imgs && property.imgs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {property.imgs.map((img, index) => (
                <div key={index} className="aspect-square">
                  <img
                    src={img}
                    alt={`${property.title} - Image ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}