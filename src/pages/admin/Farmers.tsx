import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Search, RefreshCw, Plus, Upload, Download, Filter, 
  Tractor, MapPin, Phone, Wheat, Users, TrendingUp,
  Calendar, AlertCircle, CheckCircle, Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddFarmerDialog } from "@/components/admin/AddFarmerDialog";
import { SmartFileUpload } from "@/components/admin/SmartFileUpload";

interface Farmer {
  id: string;
  name: string;
  whatsapp: string;
  district: string;
  crops: string[];
  status: string;
  created_at: string;
  listings_count: number;
}

export default function Farmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFarmers();
  }, [searchTerm, districtFilter, statusFilter]);

  const loadFarmers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('farmers')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,district.ilike.%${searchTerm}%`);
      }

      if (districtFilter !== 'all') {
        query = query.eq('district', districtFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setFarmers(data || []);
    } catch (error) {
      console.error('Error loading farmers:', error);
      toast({
        title: "Error",
        description: "Failed to load farmers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFarmerStatus = async (farmerId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('farmers')
        .update({ status: newStatus })
        .eq('id', farmerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Farmer ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      });

      loadFarmers();
    } catch (error) {
      console.error('Error updating farmer status:', error);
      toast({
        title: "Error",
        description: "Failed to update farmer status",
        variant: "destructive"
      });
    }
  };

  const exportFarmers = () => {
    const csv = farmers.map(farmer => ({
      Name: farmer.name,
      WhatsApp: farmer.whatsapp,
      District: farmer.district,
      Crops: farmer.crops?.join(', ') || '',
      Status: farmer.status,
      'Listings Count': farmer.listings_count || 0,
      'Created': new Date(farmer.created_at).toLocaleDateString()
    }));

    const csvContent = [
      Object.keys(csv[0]).join(','),
      ...csv.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Farmers data exported to CSV successfully"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCropsBadge = (crops: string[]) => {
    if (!crops || crops.length === 0) return <Badge variant="outline">No crops listed</Badge>;
    
    return (
      <div className="flex flex-wrap gap-1">
        {crops.slice(0, 3).map((crop, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {crop}
          </Badge>
        ))}
        {crops.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{crops.length - 3} more
          </Badge>
        )}
      </div>
    );
  };

  const uniqueDistricts = [...new Set(farmers.map(f => f.district))].filter(Boolean);
  const stats = {
    total: farmers.length,
    active: farmers.filter(f => f.status === 'active').length,
    inactive: farmers.filter(f => f.status === 'inactive').length,
    pending: farmers.filter(f => f.status === 'pending').length,
    totalListings: farmers.reduce((sum, f) => sum + (f.listings_count || 0), 0)
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Farmers Management</h1>
          <p className="text-muted-foreground">Manage farmer profiles and agricultural data</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportFarmers}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Smart Upload
          </Button>
          <Button variant="outline" size="sm" onClick={loadFarmers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <AddFarmerDialog onFarmerAdded={loadFarmers} />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Farmers</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <Tractor className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Listings</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalListings}</p>
              </div>
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Districts</p>
                <p className="text-2xl font-bold text-purple-600">{uniqueDistricts.length}</p>
              </div>
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search farmers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Districts</option>
                {uniqueDistricts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Farmers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {farmers.map((farmer) => (
          <Card key={farmer.id} className="border hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{farmer.name}</CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    {farmer.district}
                  </p>
                </div>
                <Badge className={getStatusColor(farmer.status)}>
                  {farmer.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{farmer.whatsapp}</span>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2 flex items-center">
                  <Wheat className="h-4 w-4 mr-1" />
                  Crops
                </p>
                {getCropsBadge(farmer.crops)}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Listings: {farmer.listings_count || 0}
                </span>
                <span className="text-muted-foreground">
                  Joined: {new Date(farmer.created_at).toLocaleDateString()}
                </span>
              </div>

              <Separator />

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(`https://wa.me/${farmer.whatsapp?.replace(/[^\d]/g, '')}`, '_blank')}
                >
                  <Phone className="h-3 w-3 mr-1" />
                  WhatsApp
                </Button>
                <Button
                  variant={farmer.status === 'active' ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() => updateFarmerStatus(farmer.id, farmer.status === 'active' ? 'inactive' : 'active')}
                >
                  {farmer.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {farmers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Tractor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No farmers found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || districtFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search criteria'
                : 'Get started by adding your first farmer'}
            </p>
            <AddFarmerDialog onFarmerAdded={loadFarmers} />
          </CardContent>
        </Card>
      )}

      {/* Smart Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Smart Farmers Upload</DialogTitle>
            <DialogDescription>
              Upload any file format and our AI will intelligently extract farmer data and update the database.
              Supports CSV, JSON, TXT, PDF and other formats.
            </DialogDescription>
          </DialogHeader>
          <SmartFileUpload
            targetTable="farmers"
            onUploadComplete={(result) => {
              setShowUpload(false);
              loadFarmers();
              toast({
                title: "Upload Complete",
                description: `${result.insertedCount} farmers added successfully`
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
    </div>
  );
}