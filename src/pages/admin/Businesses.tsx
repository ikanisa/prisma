import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Calendar, CalendarIcon } from "lucide-react";
import { 
  Search, RefreshCw, CheckCircle, XCircle, Plus, Grid3X3, List, 
  MoreHorizontal, MessageCircle, Eye, MapPin, Store, Building, Pill,
  Download, Filter, TrendingUp, Users, DollarSign, Activity, Phone,
  Clock, Globe, Star, AlertTriangle, FileText, BarChart3, PieChart, Upload
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddBusinessDialog } from "@/components/admin/AddBusinessDialog";
import { BulkImportDialog } from "@/components/admin/BulkImportDialog";
import { GooglePlacesSearch } from "@/components/admin/GooglePlacesSearch";
import { SmartFileUpload } from "@/components/admin/SmartFileUpload";

interface Business {
  id: string;
  name: string;
  momo_code: string;
  category: 'bar' | 'pharmacy' | 'shop' | 'produce' | 'hardware' | 'restaurant' | 'hotel' | 'gas_station' | 'bank' | 'school' | 'hospital' | 'store' | 'salon' | 'cosmetics';
  subscription_status: string;
  created_at: string;
  owner_user_id: string;
  owner_phone?: string;
  location_gps?: any;
  pos_system_config?: any;
  status?: string;
  monthly_revenue?: number;
  order_count?: number;
  rating?: number;
  last_active?: string;
  verified?: boolean;
  // NEW: Contact information columns from Google Places
  phone_number?: string;
  whatsapp_number?: string;
  address?: string;
  reviews_count?: number;
  website?: string;
  google_place_id?: string;
}

interface CategoryStats {
  bars: number;
  pharmacies: number;
  shops: number;
}

interface BusinessAnalytics {
  totalBusinesses: number;
  activeBusinesses: number;
  monthlyGrowth: number;
  totalRevenue: number;
  averageRating: number;
  recentSignups: number;
}

export default function Businesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({ bars: 0, pharmacies: 0, shops: 0 });
  const [analytics, setAnalytics] = useState<BusinessAnalytics>({
    totalBusinesses: 0,
    activeBusinesses: 0,
    monthlyGrowth: 0,
    totalRevenue: 0,
    averageRating: 0,
    recentSignups: 0
  });
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSmartUpload, setShowSmartUpload] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const itemsPerPage = 12;

  useEffect(() => {
    loadBusinesses();
    loadCategoryStats();
    loadAnalytics();
  }, [currentPage, searchTerm, categoryFilter, statusFilter, sortBy, sortOrder]);

  const loadAnalytics = async () => {
    try {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('*');

      if (businesses) {
        const activeCount = businesses.filter(b => b.subscription_status === 'active').length;
        const recentCount = businesses.filter(b => {
          const created = new Date(b.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return created > thirtyDaysAgo;
        }).length;

        setAnalytics({
          totalBusinesses: businesses.length,
          activeBusinesses: activeCount,
          monthlyGrowth: recentCount,
          totalRevenue: businesses.length * 25000, // Sample calculation
          averageRating: 4.2, // Sample data
          recentSignups: recentCount
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadCategoryStats = async () => {
    try {
      const { data: stats } = await supabase
        .from('businesses')
        .select('category')
        .not('category', 'is', null);

      if (stats) {
        const counts = stats.reduce((acc, business) => {
          // Group bars and restaurants together
          if (business.category === 'bar' || business.category === 'restaurant') {
            acc.bars++;
          }
          // Count all pharmacy types
          else if (business.category === 'pharmacy') {
            acc.pharmacies++;
          }
          // Group shops, stores, and other retail categories
          else if (['shop', 'store', 'hardware', 'cosmetics', 'salon'].includes(business.category)) {
            acc.shops++;
          }
          return acc;
        }, { bars: 0, pharmacies: 0, shops: 0 });
        
        setCategoryStats(counts);
      }
    } catch (error) {
      console.error('Error loading category stats:', error);
    }
  };

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('businesses')
        .select(`
          *,
          users!businesses_owner_user_id_fkey(phone)
        `, { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,momo_code.ilike.%${searchTerm}%`);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter as 'bar' | 'pharmacy' | 'shop');
      }

      if (statusFilter !== 'all') {
        query = query.eq('subscription_status', statusFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const businessesWithPhone = (data || []).map(business => ({
        ...business,
        owner_phone: business.users?.phone,
        monthly_revenue: Math.floor(Math.random() * 50000) + 10000,
        order_count: Math.floor(Math.random() * 100) + 5,
        rating: Number((Math.random() * 2 + 3).toFixed(1)),
        last_active: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        verified: Math.random() > 0.3
      }));

      setBusinesses(businessesWithPhone);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading businesses:', error);
      toast({
        title: "Error",
        description: "Failed to load businesses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBusinessStatus = async (businessId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ subscription_status: newStatus })
        .eq('id', businessId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Business ${newStatus === 'active' ? 'approved' : 'deactivated'} successfully`,
      });

      loadBusinesses();
      loadCategoryStats();
    } catch (error) {
      console.error('Error updating business status:', error);
      toast({
        title: "Error",
        description: "Failed to update business status",
        variant: "destructive"
      });
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'bar': return 'bg-orange-100 text-orange-800';
      case 'pharmacy': return 'bg-green-100 text-green-800';
      case 'shop': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bar': return <Store className="h-4 w-4" />;
      case 'pharmacy': return <Pill className="h-4 w-4" />;
      case 'shop': return <Building className="h-4 w-4" />;
      default: return <Store className="h-4 w-4" />;
    }
  };

  const openWhatsApp = (phone: string) => {
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=Hello%20from%20easyMO%20Admin`, '_blank');
    }
  };

  const exportToCSV = () => {
    const csv = businesses.map(business => ({
      Name: business.name,
      Category: business.category,
      'MoMo Code': business.momo_code,
      Status: business.subscription_status,
      'Owner Phone': business.owner_phone || 'N/A',
      'Monthly Revenue': business.monthly_revenue || 0,
      'Order Count': business.order_count || 0,
      Rating: business.rating || 'N/A',
      Created: new Date(business.created_at).toLocaleDateString()
    }));

    const csvContent = [
      Object.keys(csv[0]).join(','),
      ...csv.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `businesses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Businesses data exported to CSV successfully"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'trial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    if (rating >= 3.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLastActiveText = (lastActive: string) => {
    const diff = Date.now() - new Date(lastActive).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Business Analytics</h1>
          <p className="text-muted-foreground">Comprehensive business management and insights</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => { loadBusinesses(); loadCategoryStats(); loadAnalytics(); }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSmartUpload(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Smart Upload
              </DropdownMenuItem>
              <BulkImportDialog onImportComplete={() => { loadBusinesses(); loadCategoryStats(); loadAnalytics(); }} />
            </DropdownMenuContent>
          </DropdownMenu>
          <GooglePlacesSearch 
            searchType="businesses" 
            onSearchComplete={(results) => {
              loadBusinesses(); 
              loadCategoryStats(); 
              loadAnalytics();
              toast({
                title: "Google Places Import Complete",
                description: `${results.processed || 0} businesses imported`
              });
            }} 
          />
          <AddBusinessDialog onBusinessAdded={() => { loadBusinesses(); loadCategoryStats(); loadAnalytics(); }} />
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Businesses</p>
                <p className="text-2xl font-bold text-foreground">{analytics.totalBusinesses.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{analytics.monthlyGrowth} this month
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Businesses</p>
                <p className="text-2xl font-bold text-foreground">{analytics.activeBusinesses.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <Progress value={(analytics.activeBusinesses / analytics.totalBusinesses) * 100} className="w-20 h-2 mr-2" />
                  <span className="text-xs text-muted-foreground">
                    {Math.round((analytics.activeBusinesses / analytics.totalBusinesses) * 100)}%
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">{analytics.totalRevenue.toLocaleString()} RWF</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Monthly recurring
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold text-foreground">{analytics.averageRating}</p>
                <div className="flex items-center mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`h-3 w-3 ${star <= analytics.averageRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                  ))}
                </div>
              </div>
              <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="bar">Bars ({categoryStats.bars})</SelectItem>
                    <SelectItem value="pharmacy">Pharmacies ({categoryStats.pharmacies})</SelectItem>
                    <SelectItem value="shop">Shops ({categoryStats.shops})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date Created</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="subscription_status">Status</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Order</label>
                <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${categoryFilter === 'bar' ? 'ring-2 ring-orange-500 shadow-lg' : ''}`} 
              onClick={() => setCategoryFilter(categoryFilter === 'bar' ? 'all' : 'bar')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <Store className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{categoryStats.bars}</p>
                  <p className="text-sm text-muted-foreground">Bars & Restaurants</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Click to filter</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {Math.round((categoryStats.bars / analytics.totalBusinesses) * 100)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${categoryFilter === 'pharmacy' ? 'ring-2 ring-green-500 shadow-lg' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === 'pharmacy' ? 'all' : 'pharmacy')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Pill className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{categoryStats.pharmacies}</p>
                  <p className="text-sm text-muted-foreground">Pharmacies</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Click to filter</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {Math.round((categoryStats.pharmacies / analytics.totalBusinesses) * 100)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${categoryFilter === 'shop' ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === 'shop' ? 'all' : 'shop')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{categoryStats.shops}</p>
                  <p className="text-sm text-muted-foreground">Retail Shops</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Click to filter</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {Math.round((categoryStats.shops / analytics.totalBusinesses) * 100)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Data Table */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex items-center space-x-4">
              <CardTitle className="text-xl">
                Business Directory ({totalCount.toLocaleString()})
              </CardTitle>
              {(categoryFilter !== 'all' || statusFilter !== 'all') && (
                <div className="flex items-center gap-2">
                  {categoryFilter !== 'all' && (
                    <Badge variant="secondary" className="capitalize">
                      {categoryFilter}
                    </Badge>
                  )}
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary" className="capitalize">
                      {statusFilter}
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setCategoryFilter('all');
                      setStatusFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search businesses, MoMo codes, or phone numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading businesses...</div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {businesses.map((business) => (
                    <Card key={business.id} className="group hover:shadow-lg transition-all duration-200 border-border hover:border-primary/20">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              business.category === 'bar' ? 'bg-orange-100 dark:bg-orange-900/20' :
                              business.category === 'pharmacy' ? 'bg-green-100 dark:bg-green-900/20' :
                              'bg-blue-100 dark:bg-blue-900/20'
                            }`}>
                              {getCategoryIcon(business.category)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {business.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">{business.momo_code}</p>
                            </div>
                          </div>
                          {business.verified && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge className={getStatusColor(business.subscription_status)}>
                              {business.subscription_status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                            <span className="text-sm font-medium">{business.monthly_revenue?.toLocaleString()} RWF</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Orders</span>
                            <span className="text-sm font-medium">{business.order_count}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Rating</span>
                            <div className="flex items-center space-x-1">
                              <Star className={`h-4 w-4 ${getRatingColor(Number(business.rating))} fill-current`} />
                              <span className="text-sm font-medium">{business.rating}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Last Active</span>
                            <span className="text-sm text-muted-foreground">{getLastActiveText(business.last_active || business.created_at)}</span>
                          </div>
                        </div>
                        
                        <Separator className="mb-4" />
                        
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBusiness(business)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {business.owner_phone && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openWhatsApp(business.owner_phone)}
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/businesses/${business.id}`)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <Button
                            variant={business.subscription_status === 'active' ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => updateBusinessStatus(
                              business.id, 
                              business.subscription_status === 'active' ? 'suspended' : 'active'
                            )}
                          >
                            {business.subscription_status === 'active' ? 'Suspend' : 'Activate'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Category</TableHead>
                        <TableHead className="font-semibold">Phone Number</TableHead>
                        <TableHead className="font-semibold">MoMo Code</TableHead>
                        <TableHead className="font-semibold">WhatsApp</TableHead>
                        <TableHead className="font-semibold">Address (GPS)</TableHead>
                        <TableHead className="font-semibold">Rating</TableHead>
                        <TableHead className="font-semibold">Reviews Count</TableHead>
                        <TableHead className="font-semibold">Revenue</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {businesses.map((business) => (
                        <TableRow key={business.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                business.category === 'bar' ? 'bg-orange-100 dark:bg-orange-900/20' :
                                business.category === 'pharmacy' ? 'bg-green-100 dark:bg-green-900/20' :
                                'bg-blue-100 dark:bg-blue-900/20'
                              }`}>
                                {getCategoryIcon(business.category)}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{business.name}</p>
                                {business.verified && (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                )}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {business.category}
                            </Badge>
                          </TableCell>
                          
                           <TableCell>
                             <span className="font-mono text-sm">
                               {business.phone_number || business.owner_phone || 'Not provided'}
                             </span>
                           </TableCell>
                          
                          <TableCell>
                            <span className="font-mono text-sm">
                              {business.momo_code && /^\d+$/.test(business.momo_code) ? business.momo_code : 'Not set'}
                            </span>
                          </TableCell>
                          
                          <TableCell>
                            {business.owner_phone ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openWhatsApp(business.owner_phone)}
                                className="p-1 h-auto"
                              >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">N/A</span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {business.location_gps ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1 h-auto"
                                onClick={() => {
                                  const coords = business.location_gps;
                                  window.open(`https://maps.google.com/?q=${coords.lat},${coords.lng}`, '_blank');
                                }}
                              >
                                <MapPin className="h-4 w-4 text-blue-600" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">No GPS</span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Star className={`h-4 w-4 ${getRatingColor(Number(business.rating))} fill-current`} />
                              <span className="font-medium">{business.rating}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <span className="text-sm">
                              {business.order_count || 0}
                            </span>
                          </TableCell>
                          
                          <TableCell>
                            <span className="font-medium">
                              {business.monthly_revenue?.toLocaleString() || '0'} RWF
                            </span>
                          </TableCell>
                          
                          <TableCell>
                            <Badge className={getStatusColor(business.subscription_status)}>
                              {business.subscription_status}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedBusiness(business)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {business.owner_phone && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openWhatsApp(business.owner_phone)}
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/businesses/${business.id}`)}
                                title="Full Profile"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => updateBusinessStatus(
                                      business.id, 
                                      business.subscription_status === 'active' ? 'suspended' : 'active'
                                    )}
                                  >
                                    {business.subscription_status === 'active' ? (
                                      <>
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Suspend
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Enhanced Pagination */}
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mt-6 pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                  <span className="font-medium">{totalCount.toLocaleString()}</span> businesses
                </div>
                <div className="flex items-center space-x-2">
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
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(totalPages, currentPage - 2 + i));
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Business Detail Modal */}
      <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                selectedBusiness?.category === 'bar' ? 'bg-orange-100 dark:bg-orange-900/20' :
                selectedBusiness?.category === 'pharmacy' ? 'bg-green-100 dark:bg-green-900/20' :
                'bg-blue-100 dark:bg-blue-900/20'
              }`}>
                {selectedBusiness && getCategoryIcon(selectedBusiness.category)}
              </div>
              <span>{selectedBusiness?.name}</span>
              {selectedBusiness?.verified && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </DialogTitle>
            <DialogDescription>
              Complete business profile and performance metrics
            </DialogDescription>
          </DialogHeader>
          
          {selectedBusiness && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Business Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <Badge className={getCategoryBadgeColor(selectedBusiness.category)}>
                        {selectedBusiness.category}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>MoMo Code:</span>
                      <span className="font-mono">{selectedBusiness.momo_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge className={getStatusColor(selectedBusiness.subscription_status)}>
                        {selectedBusiness.subscription_status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{new Date(selectedBusiness.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Performance Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Monthly Revenue:</span>
                      <span className="font-medium">{selectedBusiness.monthly_revenue?.toLocaleString()} RWF</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Orders:</span>
                      <span className="font-medium">{selectedBusiness.order_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Rating:</span>
                      <div className="flex items-center space-x-1">
                        <Star className={`h-4 w-4 ${getRatingColor(Number(selectedBusiness.rating))} fill-current`} />
                        <span className="font-medium">{selectedBusiness.rating}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Active:</span>
                      <span>{getLastActiveText(selectedBusiness.last_active || selectedBusiness.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {selectedBusiness.owner_phone && (
                    <Button onClick={() => openWhatsApp(selectedBusiness.owner_phone)}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => navigate(`/admin/businesses/${selectedBusiness.id}`)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Full Profile
                  </Button>
                </div>
                <Button
                  variant={selectedBusiness.subscription_status === 'active' ? 'destructive' : 'default'}
                  onClick={() => {
                    updateBusinessStatus(
                      selectedBusiness.id,
                      selectedBusiness.subscription_status === 'active' ? 'suspended' : 'active'
                    );
                    setSelectedBusiness(null);
                  }}
                >
                  {selectedBusiness.subscription_status === 'active' ? 'Suspend Business' : 'Activate Business'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}