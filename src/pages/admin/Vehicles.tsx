import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Eye, Edit, Trash2, Car, Calendar, DollarSign, Gauge } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  created_at: string;
  updated_at: string;
}

interface VehicleStats {
  total: number;
  published: number;
  pending: number;
  drafts: number;
  archived: number;
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<VehicleStats>({ total: 0, published: 0, pending: 0, drafts: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    action: 'rent',
    status: 'draft',
    currency: 'RWF',
    transmission: 'Manual',
    fuel_type: 'Petrol'
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchVehicles();
    fetchStats();
  }, [searchQuery, statusFilter, actionFilter]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('tbl_vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,make.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as Vehicle['status']);
      }

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action', actionFilter as Vehicle['action']);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch vehicles",
          variant: "destructive",
        });
        return;
      }

      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('tbl_vehicles')
        .select('status');

      if (error) return;

      const statsData = data?.reduce((acc, vehicle) => {
        acc.total++;
        acc[vehicle.status]++;
        return acc;
      }, { total: 0, published: 0, pending: 0, drafts: 0, archived: 0 } as VehicleStats);

      setStats(statsData || { total: 0, published: 0, pending: 0, drafts: 0, archived: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateVehicle = async () => {
    try {
      if (!newVehicle.title || !newVehicle.owner_phone) {
        toast({
          title: "Error",
          description: "Title and Owner Phone are required",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('tbl_vehicles')
        .insert([newVehicle as any]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create vehicle",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Vehicle created successfully",
      });

      setShowCreateDialog(false);
      setNewVehicle({
        action: 'rent',
        status: 'draft',
        currency: 'RWF',
        transmission: 'Manual',
        fuel_type: 'Petrol'
      });
      fetchVehicles();
      fetchStats();
    } catch (error) {
      console.error('Error creating vehicle:', error);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('tbl_vehicles')
        .update({ status: status as Vehicle['status'], updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update vehicle status",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Vehicle status updated",
      });

      fetchVehicles();
      fetchStats();
    } catch (error) {
      console.error('Error updating vehicle:', error);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const { error } = await supabase
        .from('tbl_vehicles')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete vehicle",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Vehicle deleted successfully",
      });

      fetchVehicles();
      fetchStats();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
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

  const formatPrice = (vehicle: Vehicle) => {
    if (vehicle.action === 'rent') {
      return vehicle.daily_rate ? `${vehicle.daily_rate.toLocaleString()} RWF/day` : 'N/A';
    } else {
      return vehicle.sale_price ? `${vehicle.sale_price.toLocaleString()} RWF` : 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Vehicles</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
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
                placeholder="Search vehicles..."
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

      {/* Vehicles Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{vehicle.title}</CardTitle>
                  <Badge variant={getStatusBadgeVariant(vehicle.status)}>
                    {vehicle.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <Badge variant="outline">{vehicle.action}</Badge>
                </div>
                
                <div className="text-sm">
                  <strong>{vehicle.year} {vehicle.make} {vehicle.model}</strong>
                </div>

                <div className="flex gap-4 text-sm">
                  <div>{vehicle.transmission}</div>
                  <div>{vehicle.fuel_type}</div>
                </div>

                {vehicle.mileage_km && (
                  <div className="flex items-center gap-1 text-sm">
                    <Gauge className="h-4 w-4" />
                    {vehicle.mileage_km.toLocaleString()} km
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4" />
                  {formatPrice(vehicle)}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(vehicle.created_at).toLocaleDateString()}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setShowViewDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {vehicle.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(vehicle.id, 'published')}
                        className="text-green-600"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(vehicle.id, 'archived')}
                        className="text-red-600"
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Vehicle Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newVehicle.title || ''}
                  onChange={(e) => setNewVehicle({...newVehicle, title: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="action">Type *</Label>
                <Select 
                  value={newVehicle.action} 
                  onValueChange={(value) => setNewVehicle({...newVehicle, action: value as 'rent' | 'sale'})}
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={newVehicle.make || ''}
                  onChange={(e) => setNewVehicle({...newVehicle, make: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={newVehicle.model || ''}
                  onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={newVehicle.year || ''}
                  onChange={(e) => setNewVehicle({...newVehicle, year: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transmission">Transmission</Label>
                <Select 
                  value={newVehicle.transmission} 
                  onValueChange={(value) => setNewVehicle({...newVehicle, transmission: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="Automatic">Automatic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fuel_type">Fuel Type</Label>
                <Select 
                  value={newVehicle.fuel_type} 
                  onValueChange={(value) => setNewVehicle({...newVehicle, fuel_type: value})}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mileage">Mileage (km)</Label>
                <Input
                  id="mileage"
                  type="number"
                  value={newVehicle.mileage_km || ''}
                  onChange={(e) => setNewVehicle({...newVehicle, mileage_km: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="price">
                  {newVehicle.action === 'rent' ? 'Daily Rate (RWF)' : 'Sale Price (RWF)'}
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={newVehicle.action === 'rent' ? newVehicle.daily_rate || '' : newVehicle.sale_price || ''}
                  onChange={(e) => setNewVehicle({
                    ...newVehicle, 
                    [newVehicle.action === 'rent' ? 'daily_rate' : 'sale_price']: parseInt(e.target.value)
                  })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="owner_phone">Owner Phone *</Label>
              <Input
                id="owner_phone"
                value={newVehicle.owner_phone || ''}
                onChange={(e) => setNewVehicle({...newVehicle, owner_phone: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newVehicle.description || ''}
                onChange={(e) => setNewVehicle({...newVehicle, description: e.target.value})}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateVehicle}>Create Vehicle</Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Vehicle Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vehicle Details</DialogTitle>
          </DialogHeader>
          {selectedVehicle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <p className="font-medium">{selectedVehicle.title}</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <Badge>{selectedVehicle.action}</Badge>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground">{selectedVehicle.description || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Make</Label>
                  <p>{selectedVehicle.make || 'N/A'}</p>
                </div>
                <div>
                  <Label>Model</Label>
                  <p>{selectedVehicle.model || 'N/A'}</p>
                </div>
                <div>
                  <Label>Year</Label>
                  <p>{selectedVehicle.year || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transmission</Label>
                  <p>{selectedVehicle.transmission || 'N/A'}</p>
                </div>
                <div>
                  <Label>Fuel Type</Label>
                  <p>{selectedVehicle.fuel_type || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mileage</Label>
                  <p>{selectedVehicle.mileage_km ? `${selectedVehicle.mileage_km.toLocaleString()} km` : 'N/A'}</p>
                </div>
                <div>
                  <Label>Price</Label>
                  <p className="font-medium">{formatPrice(selectedVehicle)}</p>
                </div>
              </div>

              <div>
                <Label>Owner Phone</Label>
                <p>{selectedVehicle.owner_phone}</p>
              </div>

              <div>
                <Label>Status</Label>
                <Badge variant={getStatusBadgeVariant(selectedVehicle.status)}>
                  {selectedVehicle.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}