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
import { Separator } from "@/components/ui/separator";
import { 
  Search, RefreshCw, ShoppingCart, Clock, CheckCircle, Truck, 
  Package, AlertTriangle, DollarSign, TrendingUp, Calendar,
  Eye, Copy, Download, Filter, BarChart3, PieChart, Users,
  MapPin, CreditCard, Plus, Edit, X, ArrowUpDown, ChevronDown,
  CheckCircle2, XCircle, Package2, Car, Store, User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  user_id: string;
  business_id: string | null;
  farmer_id: string | null;
  driver_id: string | null;
  payment_id: string | null;
  items: any;
  delivery: boolean;
  delivery_fee: number;
  total_price: number;
  status: 'pending' | 'paid' | 'preparing' | 'delivering' | 'fulfilled' | 'cancelled';
  created_at: string;
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  preparingOrders: number;
  deliveringOrders: number;
  fulfilledOrders: number;
  cancelledOrders: number;
  todayOrders: number;
  monthlyRevenue: number;
  avgOrderValue: number;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    deliveringOrders: 0,
    fulfilledOrders: 0,
    cancelledOrders: 0,
    todayOrders: 0,
    monthlyRevenue: 0,
    avgOrderValue: 0
  });
  const { toast } = useToast();

  const itemsPerPage = 50;

  useEffect(() => {
    loadOrders();
  }, [currentPage, searchTerm, statusFilter, dateRange, deliveryFilter, sortBy, sortOrder]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      // Apply filters
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter as any);
      }

      if (deliveryFilter !== "all") {
        query = query.eq('delivery', deliveryFilter === "delivery");
      }

      if (searchTerm) {
        query = query.or(`id.ilike.%${searchTerm}%,payment_id.ilike.%${searchTerm}%,user_id.ilike.%${searchTerm}%`);
      }

      // Date range filtering
      if (dateRange !== "all") {
        const now = new Date();
        let startDate;
        switch (dateRange) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }
        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      // Apply sorting
      if (sortBy === "date") {
        query = query.order('created_at', { ascending: sortOrder === "asc" });
      } else if (sortBy === "amount") {
        query = query.order('total_price', { ascending: sortOrder === "asc" });
      } else if (sortBy === "status") {
        query = query.order('status', { ascending: sortOrder === "asc" });
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setOrders(data || []);
      setTotalCount(count || 0);
      await calculateStats(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders. Please check your connection and try again.",
        variant: "destructive"
      });
      // Set empty state on error
      setOrders([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async (ordersData: Order[]) => {
    const totalOrders = ordersData.length;
    const totalRevenue = ordersData.reduce((sum, o) => sum + o.total_price, 0);
    const pendingOrders = ordersData.filter(o => o.status === 'pending').length;
    const preparingOrders = ordersData.filter(o => o.status === 'preparing').length;
    const deliveringOrders = ordersData.filter(o => o.status === 'delivering').length;
    const fulfilledOrders = ordersData.filter(o => o.status === 'fulfilled').length;
    const cancelledOrders = ordersData.filter(o => o.status === 'cancelled').length;
    
    // Calculate today's orders
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayOrders = ordersData.filter(o => new Date(o.created_at) >= todayStart).length;

    // Calculate monthly revenue
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRevenue = ordersData
      .filter(o => new Date(o.created_at) >= monthStart)
      .reduce((sum, o) => sum + o.total_price, 0);

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    setStats({
      totalOrders,
      totalRevenue,
      pendingOrders,
      preparingOrders,
      deliveringOrders,
      fulfilledOrders,
      cancelledOrders,
      todayOrders,
      monthlyRevenue,
      avgOrderValue
    });
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus as any })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });

      loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return { variant: "secondary" as const, text: "Pending", icon: Clock };
      case 'paid': return { variant: "default" as const, text: "Paid", icon: CheckCircle2 };
      case 'preparing': return { variant: "secondary" as const, text: "Preparing", icon: Package };
      case 'delivering': return { variant: "default" as const, text: "Delivering", icon: Truck };
      case 'fulfilled': return { variant: "default" as const, text: "Fulfilled", icon: CheckCircle };
      case 'cancelled': return { variant: "destructive" as const, text: "Cancelled", icon: XCircle };
      default: return { variant: "secondary" as const, text: status, icon: Clock };
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const exportOrders = () => {
    const csvContent = [
      ['Order ID', 'Total Price', 'Status', 'Delivery', 'Created Date', 'User ID', 'Payment ID'],
      ...orders.map(o => [
        o.id,
        o.total_price.toString(),
        o.status,
        o.delivery ? 'Yes' : 'No',
        new Date(o.created_at).toISOString(),
        o.user_id,
        o.payment_id || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      'pending': 'paid',
      'paid': 'preparing',
      'preparing': 'delivering',
      'delivering': 'fulfilled'
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header with Analytics Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground">Monitor and manage all customer orders</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportOrders} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadOrders} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} RWF</div>
            <p className="text-xs text-muted-foreground">
              Monthly: {stats.monthlyRevenue.toLocaleString()} RWF
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avgOrderValue).toLocaleString()} RWF</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayOrders} orders today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingOrders + stats.preparingOrders + stats.deliveringOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <PieChart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOrders > 0 ? Math.round((stats.fulfilledOrders / stats.totalOrders) * 100) : 0}%
            </div>
            <Progress 
              value={stats.totalOrders > 0 ? (stats.fulfilledOrders / stats.totalOrders) * 100 : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Status Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Order Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold">{orders.filter(o => o.status === 'paid').length}</div>
              <div className="text-sm text-muted-foreground">Paid</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Package className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold">{stats.preparingOrders}</div>
              <div className="text-sm text-muted-foreground">Preparing</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Truck className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold">{stats.deliveringOrders}</div>
              <div className="text-sm text-muted-foreground">Delivering</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold">{stats.fulfilledOrders}</div>
              <div className="text-sm text-muted-foreground">Fulfilled</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <XCircle className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold">{stats.cancelledOrders}</div>
              <div className="text-sm text-muted-foreground">Cancelled</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters & Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                Table
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cards")}
              >
                Cards
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="delivering">Delivering</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="amount-desc">Highest Amount</SelectItem>
                  <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                  <SelectItem value="status-asc">Status A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setDateRange("all");
                setDeliveryFilter("all");
                setSortBy("date");
                setSortOrder("desc");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Orders ({totalCount.toLocaleString()})</CardTitle>
            <div className="text-sm text-muted-foreground">
              Total Value: {stats.totalRevenue.toLocaleString()} RWF
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
            </div>
          ) : viewMode === "table" ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Details</TableHead>
                    <TableHead>Customer & Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const statusBadge = getStatusBadge(order.status);
                    const StatusIcon = statusBadge.icon;
                    const nextStatus = getNextStatus(order.status);
                    
                    return (
                      <TableRow key={order.id} className="group hover:bg-muted/50">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-mono text-sm font-medium">
                              {order.id.slice(0, 8)}...
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(order.id)}
                                className="h-6 w-6 p-0 ml-2 opacity-0 group-hover:opacity-100"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            {order.payment_id && (
                              <div className="text-xs text-muted-foreground">
                                Payment: {order.payment_id.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{order.user_id.slice(0, 8)}...</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {order.items ? `${Object.keys(order.items).length} items` : 'No items'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-lg">
                              {order.total_price.toLocaleString()} RWF
                            </div>
                            {order.delivery && order.delivery_fee > 0 && (
                              <div className="text-xs text-muted-foreground">
                                +{order.delivery_fee.toLocaleString()} delivery
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {order.delivery ? (
                              <>
                                <Truck className="h-4 w-4 text-blue-600" />
                                <Badge variant="default" className="text-xs">Delivery</Badge>
                              </>
                            ) : (
                              <>
                                <Store className="h-4 w-4 text-green-600" />
                                <Badge variant="secondary" className="text-xs">Pickup</Badge>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadge.variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="h-3 w-3" />
                            {statusBadge.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{new Date(order.created_at).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {nextStatus && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, nextStatus)}
                                className="text-green-600 hover:text-green-700"
                              >
                                {nextStatus === 'paid' && <CheckCircle2 className="h-4 w-4" />}
                                {nextStatus === 'preparing' && <Package className="h-4 w-4" />}
                                {nextStatus === 'delivering' && <Truck className="h-4 w-4" />}
                                {nextStatus === 'fulfilled' && <CheckCircle className="h-4 w-4" />}
                              </Button>
                            )}
                            {order.status !== 'cancelled' && order.status !== 'fulfilled' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedOrder(order)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>Order Details</DialogTitle>
                                </DialogHeader>
                                {selectedOrder && (
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Order ID</label>
                                        <div className="font-mono text-sm mt-1">{selectedOrder.id}</div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                                        <div className="font-bold text-lg mt-1">{selectedOrder.total_price.toLocaleString()} RWF</div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                                        <div className="mt-1">
                                          <Badge variant={getStatusBadge(selectedOrder.status).variant}>
                                            {getStatusBadge(selectedOrder.status).text}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Created</label>
                                        <div className="text-sm mt-1">{new Date(selectedOrder.created_at).toLocaleString()}</div>
                                      </div>
                                    </div>
                                    
                                    <Separator />
                                    
                                    <div className="space-y-4">
                                      <h4 className="font-medium">Customer Information</h4>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
                                          <div className="font-mono text-sm mt-1">{selectedOrder.user_id}</div>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                                          <div className="font-mono text-sm mt-1">{selectedOrder.payment_id || 'N/A'}</div>
                                        </div>
                                      </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-4">
                                      <h4 className="font-medium">Order Items</h4>
                                      {selectedOrder.items ? (
                                        <div className="bg-muted/50 p-4 rounded-lg">
                                          <pre className="text-sm whitespace-pre-wrap">
                                            {JSON.stringify(selectedOrder.items, null, 2)}
                                          </pre>
                                        </div>
                                      ) : (
                                        <p className="text-muted-foreground">No items data available</p>
                                      )}
                                    </div>

                                    <Separator />

                                    <div className="space-y-4">
                                      <h4 className="font-medium">Delivery Information</h4>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-sm font-medium text-muted-foreground">Delivery Type</label>
                                          <div className="mt-1">
                                            <Badge variant={selectedOrder.delivery ? "default" : "secondary"}>
                                              {selectedOrder.delivery ? "Delivery" : "Pickup"}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-muted-foreground">Delivery Fee</label>
                                          <div className="text-sm mt-1">{selectedOrder.delivery_fee.toLocaleString()} RWF</div>
                                        </div>
                                      </div>
                                    </div>

                                    {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'fulfilled' && (
                                      <>
                                        <Separator />
                                        <div className="flex gap-2">
                                          {getNextStatus(selectedOrder.status) && (
                                            <Button
                                              onClick={() => updateOrderStatus(selectedOrder.id, getNextStatus(selectedOrder.status)!)}
                                              className="flex-1"
                                            >
                                              {getNextStatus(selectedOrder.status) === 'paid' && <>Mark as Paid</>}
                                              {getNextStatus(selectedOrder.status) === 'preparing' && <>Start Preparing</>}
                                              {getNextStatus(selectedOrder.status) === 'delivering' && <>Start Delivery</>}
                                              {getNextStatus(selectedOrder.status) === 'fulfilled' && <>Mark Fulfilled</>}
                                            </Button>
                                          )}
                                          <Button
                                            variant="destructive"
                                            onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                                            className="flex-1"
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Cancel Order
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((order) => {
                const statusBadge = getStatusBadge(order.status);
                const StatusIcon = statusBadge.icon;
                const nextStatus = getNextStatus(order.status);
                
                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-sm text-muted-foreground">
                          {order.id.slice(0, 8)}...
                        </div>
                        <Badge variant={statusBadge.variant} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusBadge.text}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{order.total_price.toLocaleString()} RWF</div>
                        {order.delivery && order.delivery_fee > 0 && (
                          <div className="text-sm text-muted-foreground">
                            +{order.delivery_fee.toLocaleString()} delivery
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground mt-1">
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{order.user_id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {order.delivery ? (
                            <>
                              <Truck className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">Delivery</span>
                            </>
                          ) : (
                            <>
                              <Store className="h-4 w-4 text-green-600" />
                              <span className="text-sm">Pickup</span>
                            </>
                          )}
                        </div>
                        {order.items && (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{Object.keys(order.items).length} items</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {nextStatus && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, nextStatus)}
                            className="flex-1"
                          >
                            {nextStatus === 'paid' && <>Mark Paid</>}
                            {nextStatus === 'preparing' && <>Prepare</>}
                            {nextStatus === 'delivering' && <>Deliver</>}
                            {nextStatus === 'fulfilled' && <>Fulfill</>}
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                              className={nextStatus ? 'flex-none' : 'flex-1'}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Order Details</DialogTitle>
                            </DialogHeader>
                            {selectedOrder && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Order ID</label>
                                    <div className="font-mono text-sm mt-1">{selectedOrder.id}</div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                                    <div className="font-bold text-lg mt-1">{selectedOrder.total_price.toLocaleString()} RWF</div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <div className="mt-1">
                                      <Badge variant={getStatusBadge(selectedOrder.status).variant}>
                                        {getStatusBadge(selectedOrder.status).text}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                                    <div className="text-sm mt-1">{new Date(selectedOrder.created_at).toLocaleString()}</div>
                                  </div>
                                </div>
                                
                                <Separator />
                                
                                <div className="space-y-4">
                                  <h4 className="font-medium">Customer Information</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
                                      <div className="font-mono text-sm mt-1">{selectedOrder.user_id}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                                      <div className="font-mono text-sm mt-1">{selectedOrder.payment_id || 'N/A'}</div>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                  <h4 className="font-medium">Order Items</h4>
                                  {selectedOrder.items ? (
                                    <div className="bg-muted/50 p-4 rounded-lg">
                                      <pre className="text-sm whitespace-pre-wrap">
                                        {JSON.stringify(selectedOrder.items, null, 2)}
                                      </pre>
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">No items data available</p>
                                  )}
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                  <h4 className="font-medium">Delivery Information</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Delivery Type</label>
                                      <div className="mt-1">
                                        <Badge variant={selectedOrder.delivery ? "default" : "secondary"}>
                                          {selectedOrder.delivery ? "Delivery" : "Pickup"}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Delivery Fee</label>
                                      <div className="text-sm mt-1">{selectedOrder.delivery_fee.toLocaleString()} RWF</div>
                                    </div>
                                  </div>
                                </div>

                                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'fulfilled' && (
                                  <>
                                    <Separator />
                                    <div className="flex gap-2">
                                      {getNextStatus(selectedOrder.status) && (
                                        <Button
                                          onClick={() => updateOrderStatus(selectedOrder.id, getNextStatus(selectedOrder.status)!)}
                                          className="flex-1"
                                        >
                                          {getNextStatus(selectedOrder.status) === 'paid' && <>Mark as Paid</>}
                                          {getNextStatus(selectedOrder.status) === 'preparing' && <>Start Preparing</>}
                                          {getNextStatus(selectedOrder.status) === 'delivering' && <>Start Delivery</>}
                                          {getNextStatus(selectedOrder.status) === 'fulfilled' && <>Mark Fulfilled</>}
                                        </Button>
                                      )}
                                      <Button
                                        variant="destructive"
                                        onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                                        className="flex-1"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Cancel Order
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && orders.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} orders
              </div>
              <div className="flex gap-2">
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
                    const page = i + 1;
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
                  {totalPages > 5 && <span className="text-muted-foreground">...</span>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}