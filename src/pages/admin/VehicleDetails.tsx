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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Save, X, Car, Calendar, DollarSign, Gauge, Phone, Globe } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Vehicle {
  id: string;
  title: string;
  description: string;
  action: 'rent' | 'sale';
  daily_rate: number;
  sale_price: number;
  currency: string;
  make: string;
  model: string;
  year: number;
  transmission: string;
  fuel_type: string;
  mileage_km: number;
  imgs: string[];
  status: 'draft' | 'published' | 'archived' | 'pending';
  owner_phone: string;
  source?: string;
  url?: string;
  created_at: string;
  updated_at: string;
}

export default function VehicleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Vehicle>>({});

  useEffect(() => {
    if (id) {
      fetchVehicle(id);
    }
  }, [id]);

  const fetchVehicle = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase
        .from('tbl_vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();

      if (error) throw error;

      setVehicle(data);
      setEditForm(data);
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vehicle details",
        variant: "destructive",
      });
      navigate('/admin/vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!vehicle || !editForm) return;

    try {
      const { error } = await supabase
        .from('vehicle_listings')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicle.id);

      if (error) throw error;

      setVehicle({ ...vehicle, ...editForm });
      setEditing(false);
      
      toast({
        title: "Success",
        description: "Vehicle updated successfully",
      });
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to update vehicle",
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

  const formatPrice = (vehicle: Vehicle) => {
    if (vehicle.action === 'rent') {
      return vehicle.daily_rate ? `${vehicle.daily_rate.toLocaleString()} ${vehicle.currency}/day` : 'N/A';
    } else {
      return vehicle.sale_price ? `${vehicle.sale_price.toLocaleString()} ${vehicle.currency}` : 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Vehicle not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/vehicles')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Vehicles
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{vehicle.title}</h1>
            <p className="text-muted-foreground">{vehicle.year} {vehicle.make} {vehicle.model}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(vehicle.status)}>
            {vehicle.status}
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
              <CardTitle>Vehicle Information</CardTitle>
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
                    <h3 className="font-medium text-lg">{vehicle.title}</h3>
                    <p className="text-muted-foreground">{vehicle.description}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vehicle Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="make">Make</Label>
                    <Input
                      id="make"
                      value={editForm.make || ''}
                      onChange={(e) => setEditForm({...editForm, make: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={editForm.model || ''}
                      onChange={(e) => setEditForm({...editForm, model: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={editForm.year || ''}
                      onChange={(e) => setEditForm({...editForm, year: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mileage">Mileage (km)</Label>
                    <Input
                      id="mileage"
                      type="number"
                      value={editForm.mileage_km || ''}
                      onChange={(e) => setEditForm({...editForm, mileage_km: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="transmission">Transmission</Label>
                    <Select 
                      value={editForm.transmission} 
                      onValueChange={(value) => setEditForm({...editForm, transmission: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual">Manual</SelectItem>
                        <SelectItem value="Automatic">Automatic</SelectItem>
                        <SelectItem value="CVT">CVT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fuel_type">Fuel Type</Label>
                    <Select 
                      value={editForm.fuel_type} 
                      onValueChange={(value) => setEditForm({...editForm, fuel_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Make & Model:</span>
                      <span>{vehicle.make} {vehicle.model}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Year:</span>
                      <span>{vehicle.year}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Mileage:</span>
                      <span>{vehicle.mileage_km?.toLocaleString()} km</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Transmission:</span>
                      <span className="ml-2">{vehicle.transmission}</span>
                    </div>
                    <div>
                      <span className="font-medium">Fuel Type:</span>
                      <span className="ml-2">{vehicle.fuel_type}</span>
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>
                      <Badge variant="outline" className="ml-2">{vehicle.action}</Badge>
                    </div>
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
                      <Label htmlFor="daily_rate">Daily Rate</Label>
                      <Input
                        id="daily_rate"
                        type="number"
                        value={editForm.daily_rate || ''}
                        onChange={(e) => setEditForm({...editForm, daily_rate: parseInt(e.target.value)})}
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="sale_price">Sale Price</Label>
                      <Input
                        id="sale_price"
                        type="number"
                        value={editForm.sale_price || ''}
                        onChange={(e) => setEditForm({...editForm, sale_price: parseInt(e.target.value)})}
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
                      <p className="font-medium">{formatPrice(vehicle)}</p>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.action === 'rent' ? 'Daily rate' : 'Sale price'}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Contact:</span>
                    </div>
                    <p className="text-sm">{vehicle.owner_phone}</p>
                  </div>

                  {vehicle.url && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Original Listing:</span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={vehicle.url} target="_blank" rel="noopener noreferrer">
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
                <span className="font-medium">Source:</span>
                <span className="ml-2">{vehicle.source || 'Manual'}</span>
              </div>
              <div>
                <span className="font-medium">Created:</span>
                <span className="ml-2">{new Date(vehicle.created_at).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="font-medium">Updated:</span>
                <span className="ml-2">{new Date(vehicle.updated_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Images Section */}
      {vehicle.imgs && vehicle.imgs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {vehicle.imgs.map((img, index) => (
                <div key={index} className="aspect-square">
                  <img
                    src={img}
                    alt={`${vehicle.title} - Image ${index + 1}`}
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