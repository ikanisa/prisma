import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Filter, 
  Eye,
  Package,
  CreditCard,
  Truck,
  Star,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function UnifiedOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('unified-orders-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          carts(
            id,
            buyer_phone,
            total,
            businesses(
              id,
              name,
              category
            )
          ),
          payments(
            id,
            amount,
            status,
            paid_at,
            momo_tx
          ),
          deliveries(
            id,
            driver_id,
            mode,
            status,
            pickup_eta,
            delivered_at,
            drivers(
              full_name,
              momo_number
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by category and search term
      let filteredData = data || [];
      
      if (categoryFilter !== 'all') {
        filteredData = filteredData.filter(order => 
          order.carts?.businesses?.category === categoryFilter
        );
      }

      if (searchTerm) {
        filteredData = filteredData.filter(order =>
          order.carts?.buyer_phone?.includes(searchTerm) ||
          order.carts?.businesses?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.id.includes(searchTerm)
        );
      }

      setOrders(filteredData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [searchTerm, statusFilter, categoryFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'dispatched':
        return <Truck className="w-4 h-4 text-blue-500" />;
      case 'paid':
        return <CreditCard className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'pending': 'outline',
      'paid': 'default',
      'dispatched': 'secondary',
      'completed': 'default',
      'cancelled': 'destructive'
    };
    
    return (
      <Badge variant={variants[status] as any} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'pharmacy': '💊',
      'bar': '🍺',
      'hardware': '🪚',
      'produce': '🍎'
    };
    return icons[category] || '🏪';
  };

  const formatCurrency = (amount: number) => {
    return `${amount?.toLocaleString()} RWF`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Unified Orders</h1>
        <p className="text-muted-foreground">
          Manage orders across all business verticals from one dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {orders.filter(o => ['paid', 'dispatched'].includes(o.status)).length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(orders
                    .filter(o => o.status === 'completed')
                    .reduce((sum, o) => sum + (o.carts?.total || 0), 0)
                  )}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by phone, business, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="pharmacy">💊 Pharmacy</SelectItem>
                <SelectItem value="bar">🍺 Bar</SelectItem>
                <SelectItem value="hardware">🪚 Hardware</SelectItem>
                <SelectItem value="produce">🍎 Produce</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fulfilment</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.id.slice(-8)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCategoryIcon(order.carts?.businesses?.category)}</span>
                      <div>
                        <div className="font-medium">{order.carts?.businesses?.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {order.carts?.businesses?.category}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">
                      {order.carts?.buyer_phone}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(order.carts?.total || 0)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="capitalize">{order.fulfilment_mode?.replace('_', ' ') || 'Not set'}</div>
                      {order.deliveries?.[0] && (
                        <div className="text-muted-foreground">
                          {order.deliveries[0].drivers?.full_name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatTime(order.created_at)}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Order Details</DialogTitle>
                        </DialogHeader>
                        {selectedOrder && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-2">Order Info</h4>
                                <p><strong>ID:</strong> {selectedOrder.id}</p>
                                <p><strong>Status:</strong> {getStatusBadge(selectedOrder.status)}</p>
                                <p><strong>Total:</strong> {formatCurrency(selectedOrder.carts?.total || 0)}</p>
                                <p><strong>Created:</strong> {formatTime(selectedOrder.created_at)}</p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Business</h4>
                                <p><strong>Name:</strong> {selectedOrder.carts?.businesses?.name}</p>
                                <p><strong>Category:</strong> {selectedOrder.carts?.businesses?.category}</p>
                                <p><strong>Buyer:</strong> {selectedOrder.carts?.buyer_phone}</p>
                              </div>
                            </div>
                            
                            {selectedOrder.payments?.[0] && (
                              <div>
                                <h4 className="font-medium mb-2">Payment</h4>
                                <p><strong>Amount:</strong> {formatCurrency(selectedOrder.payments[0].amount)}</p>
                                <p><strong>Status:</strong> {selectedOrder.payments[0].status}</p>
                                {selectedOrder.payments[0].paid_at && (
                                  <p><strong>Paid:</strong> {formatTime(selectedOrder.payments[0].paid_at)}</p>
                                )}
                              </div>
                            )}

                            {selectedOrder.deliveries?.[0] && (
                              <div>
                                <h4 className="font-medium mb-2">Delivery</h4>
                                <p><strong>Driver:</strong> {selectedOrder.deliveries[0].drivers?.full_name}</p>
                                <p><strong>Mode:</strong> {selectedOrder.deliveries[0].mode}</p>
                                <p><strong>Status:</strong> {selectedOrder.deliveries[0].status}</p>
                                {selectedOrder.deliveries[0].delivered_at && (
                                  <p><strong>Delivered:</strong> {formatTime(selectedOrder.deliveries[0].delivered_at)}</p>
                                )}
                              </div>
                            )}

                            {selectedOrder.extras && Object.keys(selectedOrder.extras).length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Additional Details</h4>
                                <pre className="text-sm bg-muted p-2 rounded">
                                  {JSON.stringify(selectedOrder.extras, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {orders.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}