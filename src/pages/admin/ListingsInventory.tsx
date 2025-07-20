import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, Filter, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UnifiedListing {
  id: string;
  listing_type: 'product' | 'produce' | 'property' | 'vehicle' | 'hardware';
  title: string;
  description?: string;
  price?: number;
  vendor_id?: string;
  metadata: any;
  location_gps?: any;
  images: any;
  tags: any;
  status: string;
  visibility: string;
  featured: boolean;
  stock_quantity: number;
  unit_of_measure?: string;
  category?: string;
  subcategory?: string;
  created_at: string;
  updated_at: string;
  businesses?: {
    name: string;
  };
}

export default function ListingsInventory() {
  const [listings, setListings] = useState<UnifiedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedListing, setSelectedListing] = useState<UnifiedListing | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    sold: 0,
    revenue: 0
  });
  
  const { toast } = useToast();
  const location = useLocation();

  // Get active tab from URL or default to 'all'
  const activeTab = new URLSearchParams(location.search).get('type') || 'all';

  useEffect(() => {
    loadListings();
    loadStats();
  }, [selectedType, selectedStatus]);

  const loadListings = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('unified_listings')
        .select(`
          *,
          businesses:vendor_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by type if specified
      if (selectedType !== 'all') {
        query = query.eq('listing_type', selectedType);
      }

      // Filter by status if specified  
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      // Only show non-deleted listings
      query = query.is('deleted_at', null);

      const { data, error } = await query;

      if (error) throw error;

      setListings(data || []);
    } catch (error) {
      console.error('Error loading listings:', error);
      toast({
        title: "Error",
        description: "Failed to load listings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('unified_listings')
        .select('status, price')
        .is('deleted_at', null);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        active: data?.filter(l => l.status === 'active').length || 0,
        sold: data?.filter(l => l.status === 'sold').length || 0,
        revenue: data?.filter(l => l.status === 'sold').reduce((sum, l) => sum + (l.price || 0), 0) || 0
      };

      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      product: "📦",
      produce: "🥕", 
      property: "🏠",
      vehicle: "🚗",
      hardware: "🔧"
    };
    return icons[type as keyof typeof icons] || "📦";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800", 
      sold: "bg-blue-100 text-blue-800",
      archived: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatPrice = (price?: number) => {
    if (!price) return "Free";
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0
    }).format(price);
  };

  const columns: ColumnDef<UnifiedListing>[] = [
    {
      accessorKey: "listing_type",
      header: "Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTypeIcon(row.original.listing_type)}</span>
          <Badge variant="outline" className="capitalize">
            {row.original.listing_type}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <div className="font-medium truncate">{row.original.title}</div>
          <div className="text-sm text-muted-foreground truncate">
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => (
        <div className="font-medium">
          {formatPrice(row.original.price)}
        </div>
      ),
    },
    {
      accessorKey: "stock_quantity",
      header: "Stock",
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant={row.original.stock_quantity > 0 ? "default" : "secondary"}>
            {row.original.stock_quantity} {row.original.unit_of_measure || 'units'}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }) => (
        <div className="text-sm">
          {(row.original as any).businesses?.name || "N/A"}
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <div className="text-sm">
          {new Date(row.original.created_at).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedListing(row.original);
            setShowDetails(true);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToCSV = () => {
    const csvData = filteredListings.map(listing => ({
      Type: listing.listing_type,
      Title: listing.title,
      Price: listing.price || 0,
      Stock: listing.stock_quantity,
      Status: listing.status,
      Created: new Date(listing.created_at).toLocaleDateString()
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `listings-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading listings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Listings & Inventory</h1>
          <p className="text-muted-foreground">
            Manage all marketplace listings in one place
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Listing
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <span className="text-2xl">📦</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sold}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <span className="text-2xl">💵</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.revenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="product">Products</SelectItem>
                  <SelectItem value="produce">Produce</SelectItem>
                  <SelectItem value="property">Properties</SelectItem>
                  <SelectItem value="vehicle">Vehicles</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs by Category */}
      <Tabs value={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({listings.length})</TabsTrigger>
          <TabsTrigger value="product">
            📦 Products ({listings.filter(l => l.listing_type === 'product').length})
          </TabsTrigger>
          <TabsTrigger value="produce">
            🥕 Produce ({listings.filter(l => l.listing_type === 'produce').length})
          </TabsTrigger>
          <TabsTrigger value="property">
            🏠 Properties ({listings.filter(l => l.listing_type === 'property').length})
          </TabsTrigger>
          <TabsTrigger value="vehicle">
            🚗 Vehicles ({listings.filter(l => l.listing_type === 'vehicle').length})
          </TabsTrigger>
          <TabsTrigger value="hardware">
            🔧 Hardware ({listings.filter(l => l.listing_type === 'hardware').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'all' ? 'All Listings' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Listings`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredListings}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {getTypeIcon(selectedListing?.listing_type || '')} {selectedListing?.title}
            </DialogTitle>
            <DialogDescription>
              Listing details and management options
            </DialogDescription>
          </DialogHeader>
          
          {selectedListing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Basic Information</h3>
                  <div className="mt-2 space-y-2">
                    <div><strong>Type:</strong> {selectedListing.listing_type}</div>
                    <div><strong>Status:</strong> <Badge className={getStatusColor(selectedListing.status)}>{selectedListing.status}</Badge></div>
                    <div><strong>Price:</strong> {formatPrice(selectedListing.price)}</div>
                    <div><strong>Stock:</strong> {selectedListing.stock_quantity} {selectedListing.unit_of_measure}</div>
                  </div>
                </div>
                
                {selectedListing.description && (
                  <div>
                    <h3 className="font-semibold">Description</h3>
                    <p className="mt-2 text-sm">{selectedListing.description}</p>
                  </div>
                )}
                
                {selectedListing.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold">Tags</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedListing.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Metadata</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    {Object.entries(selectedListing.metadata || {}).map(([key, value]) => (
                      <div key={key}>
                        <strong>{key}:</strong> {String(value)}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold">Timestamps</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <div><strong>Created:</strong> {new Date(selectedListing.created_at).toLocaleString()}</div>
                    <div><strong>Updated:</strong> {new Date(selectedListing.updated_at).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}