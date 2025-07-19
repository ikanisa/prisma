import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Store, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  MapPin,
  Clock,
  Users
} from "lucide-react";

interface HardwareMetrics {
  activeVendors: number;
  totalProducts: number;
  todaysOrders: number;
  avgBasket: number;
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  location_gps: any;
  created_at: string;
  productCount: number;
  monthlyGrowth: number;
  lastActive: string;
}

export default function HardwareDashboard() {
  const [metrics, setMetrics] = useState<HardwareMetrics>({
    activeVendors: 0,
    totalProducts: 0,
    todaysOrders: 0,
    avgBasket: 0
  });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch hardware vendors
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('businesses')
        .select('*')
        .eq('category', 'hardware')
        .eq('status', 'active');

      if (vendorsError) throw vendorsError;

      // Mock products data for now (until products table is fully set up)
      const productsData: any[] = [];

      // productsError check removed for now

      // Count products per vendor
      const productCounts = productsData?.reduce((acc: any, product: any) => {
        acc[product.vendor_id] = (acc[product.vendor_id] || 0) + 1;
        return acc;
      }, {});

      // Transform vendors data
      const transformedVendors = vendorsData?.map((vendor: any) => ({
        id: vendor.id,
        name: vendor.name,
        category: vendor.category,
        location_gps: vendor.location_gps,
        created_at: vendor.created_at,
        productCount: productCounts?.[vendor.id] || 0,
        monthlyGrowth: Math.random() * 20 - 5, // Mock data
        lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      })) || [];

      // Calculate metrics
      const totalProducts = productsData?.length || 0;
      
      setMetrics({
        activeVendors: vendorsData?.length || 0,
        totalProducts,
        todaysOrders: Math.floor(Math.random() * 50), // Mock data
        avgBasket: Math.floor(Math.random() * 50000 + 15000) // Mock data
      });

      setVendors(transformedVendors);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGrowthBadge = (growth: number) => {
    if (growth > 10) return <Badge className="bg-green-100 text-green-800">+{growth.toFixed(1)}%</Badge>;
    if (growth > 0) return <Badge className="bg-blue-100 text-blue-800">+{growth.toFixed(1)}%</Badge>;
    if (growth > -5) return <Badge variant="outline">{growth.toFixed(1)}%</Badge>;
    return <Badge variant="destructive">{growth.toFixed(1)}%</Badge>;
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Hardware Vendors Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor hardware stores, products, and sales performance
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Active Vendors</span>
            </div>
            <div className="text-2xl font-bold">{metrics.activeVendors}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Live SKUs</span>
            </div>
            <div className="text-2xl font-bold">{metrics.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Today's Orders</span>
            </div>
            <div className="text-2xl font-bold">{metrics.todaysOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">Avg Basket</span>
            </div>
            <div className="text-2xl font-bold">{metrics.avgBasket.toLocaleString()} RWF</div>
          </CardContent>
        </Card>
      </div>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hardware Vendors ({vendors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Store className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No hardware vendors</h3>
              <p>Start by onboarding your first hardware store</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vendors.map((vendor) => (
                <div key={vendor.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <Store className="w-6 h-6 text-muted-foreground" />
                      </div>
                      
                      <div>
                        <h3 className="font-medium">{vendor.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {vendor.productCount} SKUs
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Hardware Store
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeAgo(vendor.lastActive)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {getGrowthBadge(vendor.monthlyGrowth)}
                      
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}