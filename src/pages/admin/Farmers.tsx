import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, RefreshCw, Tractor, MoreHorizontal, Eye, Edit2, Trash2, Plus,
  Users, MapPin, Phone, Calendar, BarChart3, TrendingUp, TrendingDown,
  Package, DollarSign, Activity, Star, Download, Filter, Grid3X3, List,
  Copy, ExternalLink, MessageSquare, Mail, Award, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AddFarmerDialog } from '@/components/admin/AddFarmerDialog';

interface Farmer {
  id: string;
  name: string;
  phone?: string;
  location?: string;
  status: string;
  listings_count: number;
  created_at: string;
}

interface FarmerAnalytics {
  totalFarmers: number;
  activeFarmers: number;
  newThisMonth: number;
  avgListings: number;
  topLocation: string;
  totalListings: number;
}

export default function Farmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [analytics, setAnalytics] = useState<FarmerAnalytics>({
    totalFarmers: 0,
    activeFarmers: 0,
    newThisMonth: 0,
    avgListings: 0,
    topLocation: "",
    totalListings: 0
  });
  const { toast } = useToast();

  const itemsPerPage = 20;

  const fetchFarmers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('farmers')
        .select('*', { count: 'exact' })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      // Apply filters
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }

      if (locationFilter !== "all") {
        query = query.ilike('location', `%${locationFilter}%`);
      }

      // Apply sorting
      switch (sortBy) {
        case "newest":
          query = query.order('created_at', { ascending: false });
          break;
        case "oldest":
          query = query.order('created_at', { ascending: true });
          break;
        case "name":
          query = query.order('name', { ascending: true });
          break;
        case "listings-high":
          query = query.order('listings_count', { ascending: false });
          break;
        case "listings-low":
          query = query.order('listings_count', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error, count } = await query;
      
      if (!error && data) {
        setFarmers(data);
        setTotalCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching farmers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch farmers",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [searchTerm, currentPage, statusFilter, locationFilter, sortBy, toast]);

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('farmer_id, price, stock')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);

  useEffect(() => { 
    fetchFarmers(); 
    fetchProducts();
  }, [fetchFarmers, fetchProducts]);

  useEffect(() => {
    calculateAnalytics();
  }, [farmers, products]);

  const calculateAnalytics = () => {
    const totalFarmers = farmers.length;
    const activeFarmers = farmers.filter(f => f.status === 'active').length;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const newThisMonth = farmers.filter(f => new Date(f.created_at) > oneMonthAgo).length;
    const avgListings = totalFarmers > 0 ? farmers.reduce((sum, f) => sum + f.listings_count, 0) / totalFarmers : 0;
    
    // Calculate top location
    const locationCounts: Record<string, number> = {};
    farmers.forEach(f => {
      if (f.location) {
        locationCounts[f.location] = (locationCounts[f.location] || 0) + 1;
      }
    });
    const topLocation = Object.keys(locationCounts).reduce((a, b) => 
      locationCounts[a] > locationCounts[b] ? a : b, "Unknown"
    );

    const totalListings = farmers.reduce((sum, f) => sum + f.listings_count, 0);

    setAnalytics({
      totalFarmers,
      activeFarmers,
      newThisMonth,
      avgListings,
      topLocation,
      totalListings
    });
  };

  const handleStatusUpdate = async (farmerId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('farmers')
        .update({ status: newStatus })
        .eq('id', farmerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Farmer status updated successfully",
      });

      fetchFarmers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (farmerId: string) => {
    if (!confirm('Are you sure you want to delete this farmer?')) return;

    try {
      const { error } = await supabase
        .from('farmers')
        .delete()
        .eq('id', farmerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Farmer deleted successfully",
      });

      fetchFarmers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmer) return;

    try {
      const { error } = await supabase
        .from('farmers')
        .update({
          name: selectedFarmer.name,
          phone: selectedFarmer.phone,
          location: selectedFarmer.location,
          status: selectedFarmer.status
        })
        .eq('id', selectedFarmer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Farmer updated successfully",
      });

      setEditDialogOpen(false);
      setSelectedFarmer(null);
      fetchFarmers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", color: string }> = {
      active: { variant: "default", color: "text-green-600" },
      inactive: { variant: "secondary", color: "text-gray-600" },
      pending: { variant: "outline", color: "text-yellow-600" }
    };
    const config = variants[status] || { variant: "outline", color: "text-gray-600" };
    return <Badge variant={config.variant}>{status}</Badge>;
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Farmer ID copied to clipboard",
    });
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Location', 'Status', 'Listings Count', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...farmers.map(farmer => [
        `"${farmer.name}"`,
        `"${farmer.phone || ''}"`,
        `"${farmer.location || ''}"`,
        farmer.status,
        farmer.listings_count,
        farmer.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Farmers data exported to CSV",
    });
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const uniqueLocations = [...new Set(farmers.map(f => f.location).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
            <Tractor className="w-8 h-8 text-primary" />
            Farmers Network
          </h1>
          <p className="text-muted-foreground">Manage your agricultural community and partnerships</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchFarmers} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <AddFarmerDialog onFarmerAdded={fetchFarmers} />
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalFarmers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Registered farmers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Farmers</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeFarmers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalFarmers > 0 ? ((analytics.activeFarmers / analytics.totalFarmers) * 100).toFixed(1) : 0}% active rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.newThisMonth}</div>
            <p className="text-xs text-muted-foreground">Recent registrations</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Listings</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgListings.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Per farmer</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Farmer Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-600">Active Farmers</span>
                <span className="text-sm font-bold">{analytics.activeFarmers}</span>
              </div>
              <Progress value={analytics.totalFarmers > 0 ? (analytics.activeFarmers / analytics.totalFarmers) * 100 : 0} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-600">Total Listings</span>
                <span className="text-sm font-bold">{analytics.totalListings}</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-600">Top Location</span>
                <span className="text-sm font-bold">{analytics.topLocation}</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search farmers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort by</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name">Name: A to Z</SelectItem>
                  <SelectItem value="listings-high">Most Listings</SelectItem>
                  <SelectItem value="listings-low">Least Listings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">View</label>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Grid
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {totalCount.toLocaleString()} farmers found
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Farmers Display */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Loading farmers...</span>
              </div>
            </div>
          ) : farmers.length === 0 ? (
            <div className="text-center py-12">
              <Tractor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No farmers found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or add new farmers.</p>
            </div>
          ) : (
            <>
              {viewMode === "table" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Listings</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farmers.map((farmer) => {
                      const farmerProducts = products.filter(p => p.farmer_id === farmer.id);
                      const totalValue = farmerProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
                      
                      return (
                        <TableRow key={farmer.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                                  {farmer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{farmer.name}</div>
                                <div className="text-sm text-muted-foreground">ID: {farmer.id.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {farmer.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-3 w-3" />
                                  {farmer.phone}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                Contact available
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{farmer.location || 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(farmer.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{farmer.listings_count}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{totalValue.toLocaleString()} RWF</div>
                              <div className="text-xs text-muted-foreground">Total inventory value</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {new Date(farmer.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setSelectedFarmer(farmer)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <FarmerDetailsDialog farmer={selectedFarmer} products={farmerProducts} />
                              </Dialog>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedFarmer(farmer);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCopyId(farmer.id)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-6">
                  {farmers.map((farmer) => {
                    const farmerProducts = products.filter(p => p.farmer_id === farmer.id);
                    const totalValue = farmerProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
                    
                    return (
                      <Card key={farmer.id} className="group hover:shadow-lg transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-lg font-semibold">
                                {farmer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(farmer.status)}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background border shadow-md">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedFarmer(farmer);
                                    setEditDialogOpen(true);
                                  }}>
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusUpdate(farmer.id, farmer.status === 'active' ? 'inactive' : 'active')}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    {farmer.status === 'active' ? 'Deactivate' : 'Activate'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDelete(farmer.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <h3 className="font-semibold text-lg truncate" title={farmer.name}>
                              {farmer.name}
                            </h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {farmer.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3" />
                                  {farmer.phone}
                                </div>
                              )}
                              {farmer.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  {farmer.location}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Listings</span>
                              <span className="font-medium">{farmer.listings_count}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Inventory Value</span>
                              <span className="font-medium">{totalValue.toLocaleString()} RWF</span>
                            </div>
                          </div>

                          <Separator className="my-3" />

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Joined {new Date(farmer.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedFarmer(farmer)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                </DialogTrigger>
                                <FarmerDetailsDialog farmer={selectedFarmer} products={farmerProducts} />
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Enhanced Pagination */}
              <div className="border-t px-6 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount.toLocaleString()} farmers
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Edit Farmer
            </DialogTitle>
          </DialogHeader>
          {selectedFarmer && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={selectedFarmer.name}
                  onChange={(e) => setSelectedFarmer({ ...selectedFarmer, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={selectedFarmer.phone || ''}
                  onChange={(e) => setSelectedFarmer({ ...selectedFarmer, phone: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={selectedFarmer.location || ''}
                  onChange={(e) => setSelectedFarmer({ ...selectedFarmer, location: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={selectedFarmer.status}
                  onValueChange={(value) => setSelectedFarmer({ ...selectedFarmer, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Farmer
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Farmer Details Dialog Component
function FarmerDetailsDialog({ farmer, products }: { farmer: Farmer | null; products: any[] }) {
  if (!farmer) return null;

  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Tractor className="h-5 w-5" />
          Farmer Profile
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-2xl font-bold">
                {farmer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-2xl font-bold">{farmer.name}</h3>
              <Badge variant={farmer.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                {farmer.status}
              </Badge>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{farmer.phone || 'No phone provided'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{farmer.location || 'Location not specified'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Joined {new Date(farmer.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Quick Actions</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-3">Performance Metrics</h4>
            <div className="grid gap-3">
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Total Listings:</span>
                <span className="font-bold">{farmer.listings_count}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Inventory Value:</span>
                <span className="font-bold">{totalValue.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Total Stock:</span>
                <span className="font-bold">{totalStock} units</span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-3">Recent Activity</h4>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Listed new products</span>
                  <span className="text-muted-foreground ml-auto">2 days ago</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span>Updated inventory</span>
                  <span className="text-muted-foreground ml-auto">5 days ago</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                  <span>Profile updated</span>
                  <span className="text-muted-foreground ml-auto">1 week ago</span>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}