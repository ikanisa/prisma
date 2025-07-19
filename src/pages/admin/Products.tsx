import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, Plus, RefreshCw, Package, AlertTriangle, TrendingUp, TrendingDown,
  DollarSign, Users, Eye, Edit, Trash2, Download, Filter, Grid3X3, List,
  Copy, MapPin, Calendar, BarChart3, PieChart, Activity, ShoppingCart,
  Warehouse, Star, Image as ImageIcon, ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_qty: number;
  unit: string;
  image_url: string | null;
  business_id: string;
  category: string;
  description: string;
  created_at: string;
}

interface Farmer {
  id: string;
  name: string;
  whatsapp: string;
  district: string;
}

interface ProductAnalytics {
  totalValue: number;
  avgPrice: number;
  topCategory: string;
  recentOrders: number;
  stockTurnover: number;
  lowStockItems: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedFarmer, setSelectedFarmer] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [analytics, setAnalytics] = useState<ProductAnalytics>({
    totalValue: 0,
    avgPrice: 0,
    topCategory: "",
    recentOrders: 0,
    stockTurnover: 0,
    lowStockItems: 0
  });
  const { toast } = useToast();

  const itemsPerPage = 20;

  useEffect(() => {
    loadProducts();
    loadFarmers();
  }, [currentPage, searchTerm, selectedFarmer, selectedStatus, priceRange, sortBy]);

  useEffect(() => {
    calculateAnalytics();
  }, [products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      // Apply filters
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,unit.ilike.%${searchTerm}%`);
      }

      if (selectedFarmer !== "all") {
        query = query.eq('business_id', selectedFarmer);
      }

      if (selectedStatus !== "all") {
        if (selectedStatus === "in-stock") {
          query = query.gt('stock_qty', 0);
        } else if (selectedStatus === "out-of-stock") {
          query = query.eq('stock_qty', 0);
        } else if (selectedStatus === "low-stock") {
          query = query.gt('stock_qty', 0).lt('stock_qty', 10);
        }
      }

      if (priceRange !== "all") {
        const [min, max] = priceRange.split('-').map(Number);
        if (max) {
          query = query.gte('price', min).lte('price', max);
        } else {
          query = query.gte('price', min);
        }
      }

      // Apply sorting
      switch (sortBy) {
        case "newest":
          query = query.order('created_at', { ascending: false });
          break;
        case "oldest":
          query = query.order('created_at', { ascending: true });
          break;
        case "price-high":
          query = query.order('price', { ascending: false });
          break;
        case "price-low":
          query = query.order('price', { ascending: true });
          break;
        case "stock-high":
          query = query.order('stock_qty', { ascending: false });
          break;
        case "stock-low":
          query = query.order('stock_qty', { ascending: true });
          break;
        case "name":
          query = query.order('name', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFarmers = async () => {
    try {
      const { data, error } = await supabase
        .from('farmers')
        .select('id, name, whatsapp, district')
        .order('name');

      if (error) throw error;
      setFarmers(data || []);
    } catch (error) {
      console.error('Error loading farmers:', error);
    }
  };

  const calculateAnalytics = () => {
    if (products.length === 0) return;

    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock_qty), 0);
    const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
    const lowStockItems = products.filter(p => p.stock_qty > 0 && p.stock_qty < 10).length;

    setAnalytics({
      totalValue,
      avgPrice,
      topCategory: "Vegetables", // Mock data
      recentOrders: 142, // Mock data
      stockTurnover: 78.5, // Mock data
      lowStockItems
    });
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) return { variant: "destructive" as const, text: "Out of Stock", color: "text-red-600" };
    if (stock < 10) return { variant: "secondary" as const, text: "Low Stock", color: "text-yellow-600" };
    return { variant: "default" as const, text: "In Stock", color: "text-green-600" };
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Product ID copied to clipboard",
    });
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Price', 'Stock', 'Unit', 'Farmer ID', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...products.map(product => [
        `"${product.name}"`,
        product.price,
        product.stock_qty,
        `"${product.unit}"`,
        product.business_id,
        product.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Products data exported to CSV",
    });
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const inStockCount = products.filter(p => p.stock_qty > 0).length;
  const outOfStockCount = products.filter(p => p.stock_qty === 0).length;
  const lowStockCount = products.filter(p => p.stock_qty > 0 && p.stock_qty < 10).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Products Inventory
          </h1>
          <p className="text-muted-foreground">Manage your product catalog and inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadProducts} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active listings</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analytics.totalValue / 1000000).toFixed(1)}M RWF</div>
            <p className="text-xs text-muted-foreground">Inventory worth</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Price</CardTitle>
            <BarChart3 className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgPrice.toLocaleString()} RWF</div>
            <p className="text-xs text-muted-foreground">Per product</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Needs restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Stock Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-600">In Stock</span>
                <span className="text-sm font-bold">{inStockCount}</span>
              </div>
              <Progress value={(inStockCount / totalCount) * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-600">Low Stock</span>
                <span className="text-sm font-bold">{lowStockCount}</span>
              </div>
              <Progress value={(lowStockCount / totalCount) * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-600">Out of Stock</span>
                <span className="text-sm font-bold">{outOfStockCount}</span>
              </div>
              <Progress value={(outOfStockCount / totalCount) * 100} className="h-2" />
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
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Farmer</label>
              <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
                <SelectTrigger>
                  <SelectValue placeholder="All farmers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Farmers</SelectItem>
                  {farmers.map((farmer) => (
                    <SelectItem key={farmer.id} value={farmer.id}>
                      {farmer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Price Range</label>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger>
                  <SelectValue placeholder="All prices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="0-1000">0 - 1,000 RWF</SelectItem>
                  <SelectItem value="1000-5000">1,000 - 5,000 RWF</SelectItem>
                  <SelectItem value="5000-10000">5,000 - 10,000 RWF</SelectItem>
                  <SelectItem value="10000">10,000+ RWF</SelectItem>
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
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="stock-high">Stock: High to Low</SelectItem>
                  <SelectItem value="stock-low">Stock: Low to High</SelectItem>
                  <SelectItem value="name">Name: A to Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
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
            <p className="text-sm text-muted-foreground">
              {totalCount.toLocaleString()} products found
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Products Display */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Loading products...</span>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or add new products.</p>
            </div>
          ) : (
            <>
              {viewMode === "table" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                     const stockBadge = getStockBadge(product.stock_qty);
                      const farmer = farmers.find(f => f.id === product.business_id);
                      
                      return (
                        <TableRow key={product.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                {product.image_url ? (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.name}
                                    className="h-10 w-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">ID: {product.id.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {farmer?.name?.split(' ').map(n => n[0]).join('') || 'F'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{farmer?.name || 'Unknown'}</div>
                                <div className="text-xs text-muted-foreground">{farmer?.district}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {product.price.toLocaleString()} RWF
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                               <span className="font-medium">{product.stock_qty}</span>
                               <div className={`h-2 w-2 rounded-full ${stockBadge.color.replace('text-', 'bg-')}`} />
                             </div>
                          </TableCell>
                          <TableCell>{product.unit}</TableCell>
                          <TableCell>
                            <Badge variant={stockBadge.variant} className="text-xs">
                              {stockBadge.text}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(product.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setSelectedProduct(product)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <ProductDetailsDialog product={selectedProduct} farmer={farmer} />
                              </Dialog>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCopyId(product.id)}
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
                  {products.map((product) => {
                    const stockBadge = getStockBadge(product.stock_qty);
                     const farmer = farmers.find(f => f.id === product.business_id);
                    
                    return (
                      <Card key={product.id} className="group hover:shadow-lg transition-all duration-200">
                        <CardContent className="p-0">
                          <div className="aspect-square bg-muted rounded-t-lg relative overflow-hidden">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-16 w-16 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute top-2 right-2">
                              <Badge variant={stockBadge.variant} className="text-xs">
                                {stockBadge.text}
                              </Badge>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold truncate">{product.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {farmer?.name || 'Unknown Farmer'}
                            </p>
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-bold text-lg">{product.price.toLocaleString()} RWF</span>
                               <span className="text-sm text-muted-foreground">
                                 {product.stock_qty} {product.unit}
                               </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1"
                                    onClick={() => setSelectedProduct(product)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                </DialogTrigger>
                                <ProductDetailsDialog product={selectedProduct} farmer={farmer} />
                              </Dialog>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
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
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount.toLocaleString()} products
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
    </div>
  );
}

// Product Details Dialog Component
function ProductDetailsDialog({ product, farmer }: { product: Product | null; farmer?: Farmer }) {
  if (!product) return null;

  const stockBadge = product.stock_qty === 0 
    ? { variant: "destructive" as const, text: "Out of Stock" }
    : product.stock_qty < 10 
    ? { variant: "secondary" as const, text: "Low Stock" }
    : { variant: "default" as const, text: "In Stock" };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Product Details
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold">{product.name}</h3>
            <Badge variant={stockBadge.variant} className="mt-2">
              {stockBadge.text}
            </Badge>
          </div>
          
          <Separator />
          
          <div className="grid gap-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-bold text-lg">{product.price.toLocaleString()} RWF</span>
            </div>
             <div className="flex justify-between">
               <span className="text-muted-foreground">Stock:</span>
               <span className="font-medium">{product.stock_qty} {product.unit}</span>
             </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit:</span>
              <span>{product.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Added:</span>
              <span>{new Date(product.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <Separator />

          {farmer && (
            <div>
              <h4 className="font-semibold mb-2">Farmer Information</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {farmer.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{farmer.name}</span>
                </div>
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                   <MapPin className="h-4 w-4" />
                   {farmer.district}
                 </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button className="flex-1">
              <Edit className="h-4 w-4 mr-2" />
              Edit Product
            </Button>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}