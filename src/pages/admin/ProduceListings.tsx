import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Eye, 
  MapPin, 
  Calendar,
  TrendingUp,
  Pause,
  Play,
  Trash,
  Search,
  Filter
} from "lucide-react";

interface ProduceListing {
  id: string;
  farmer_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  price: number;
  photo_url: string;
  grade: string;
  status: string;
  views: number;
  matched_order_id: string;
  created_at: string;
  expires_at: string;
  farmers: {
    name: string;
    whatsapp: string;
    district: string;
  };
}

export default function ProduceListings() {
  const [listings, setListings] = useState<ProduceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchListings();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('listings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produce_listings'
        },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('produce_listings')
        .select(`
          *,
          farmers (name, whatsapp, district)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch listings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateListingStatus = async (listingId: string, newStatus: string) => {
    setProcessingId(listingId);
    
    try {
      const { error } = await supabase
        .from('produce_listings')
        .update({ status: newStatus })
        .eq('id', listingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Listing ${newStatus === 'paused' ? 'paused' : 'activated'}`,
      });

      fetchListings();
    } catch (error) {
      console.error('Error updating listing:', error);
      toast({
        title: "Error",
        description: "Failed to update listing",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const expireOldListings = async () => {
    try {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { error } = await supabase
        .from('produce_listings')
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('created_at', fourteenDaysAgo.toISOString());

      if (error) throw error;

      toast({
        title: "Success",
        description: "Old listings expired successfully",
      });

      fetchListings();
    } catch (error) {
      console.error('Error expiring listings:', error);
      toast({
        title: "Error",
        description: "Failed to expire old listings",
        variant: "destructive",
      });
    }
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.farmers.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.farmers.district?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || listing.status === selectedStatus;
    const matchesDistrict = !selectedDistrict || listing.farmers.district === selectedDistrict;
    
    return matchesSearch && matchesStatus && matchesDistrict;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case 'sold':
        return <Badge className="bg-blue-100 text-blue-800">Sold</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getGradeBadge = (grade: string) => {
    const colors = {
      'Grade A': 'bg-green-100 text-green-800',
      'Grade B+': 'bg-blue-100 text-blue-800',
      'Grade B': 'bg-yellow-100 text-yellow-800'
    };
    return <Badge className={colors[grade as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>{grade}</Badge>;
  };

  const getDaysRemaining = (expiresAt: string) => {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getUniqueDistricts = () => {
    return Array.from(new Set(listings.map(l => l.farmers.district).filter(Boolean)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading listings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Live Listings</h1>
        <p className="text-muted-foreground">
          Manage and monitor active produce listings
        </p>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product, farmer, or district..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-40">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="sold">Sold</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="w-40">
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">All Districts</option>
                {getUniqueDistricts().map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={expireOldListings} variant="outline">
              <Trash className="w-4 h-4 mr-2" />
              Expire Old (&gt;14 days)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Total Listings</span>
            </div>
            <div className="text-2xl font-bold">{listings.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Active</span>
            </div>
            <div className="text-2xl font-bold">
              {listings.filter(l => l.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Pause className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Paused</span>
            </div>
            <div className="text-2xl font-bold">
              {listings.filter(l => l.status === 'paused').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Total Views</span>
            </div>
            <div className="text-2xl font-bold">
              {listings.reduce((sum, l) => sum + (l.views || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">Districts</span>
            </div>
            <div className="text-2xl font-bold">{getUniqueDistricts().length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredListings.map((listing) => (
          <Card key={listing.id} className="overflow-hidden">
            <div className="relative">
              {listing.photo_url ? (
                <img 
                  src={listing.photo_url} 
                  alt={listing.product_name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <Package className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                {getStatusBadge(listing.status)}
              </div>
              <div className="absolute top-2 left-2">
                {getGradeBadge(listing.grade || 'Grade B')}
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="mb-3">
                <h3 className="font-semibold text-lg">{listing.product_name}</h3>
                <div className="text-sm text-muted-foreground">
                  {listing.quantity} {listing.unit} • {listing.price} RWF/{listing.unit}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-3 h-3" />
                  {listing.farmers.district} • {listing.farmers.name}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Eye className="w-3 h-3" />
                  {listing.views || 0} views
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-3 h-3" />
                  {getDaysRemaining(listing.expires_at)} days remaining
                </div>
              </div>

              <div className="flex gap-2">
                {listing.status === 'active' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateListingStatus(listing.id, 'paused')}
                    disabled={processingId === listing.id}
                    className="flex-1"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                ) : listing.status === 'paused' ? (
                  <Button
                    size="sm"
                    onClick={() => updateListingStatus(listing.id, 'active')}
                    disabled={processingId === listing.id}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Activate
                  </Button>
                ) : null}
                
                <Button size="sm" variant="outline" className="flex-1">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredListings.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No listings found</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedStatus || selectedDistrict
              ? "No listings match your current filters"
              : "No produce listings available"
            }
          </p>
        </div>
      )}
    </div>
  );
}