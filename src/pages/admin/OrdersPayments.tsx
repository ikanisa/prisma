import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Search, Download, Eye, CreditCard, Package } from "lucide-react";
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

interface UnifiedOrder {
  id: string;
  order_type: string;
  customer_phone: string;
  customer_id?: string;
  vendor_id?: string;
  items: any;
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  payment_reference?: string;
  delivery_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

interface Payment {
  id: string;
  user_id?: string;
  amount: number;
  currency?: string;
  status: string;
  payment_method?: string;
  reference?: string;
  description?: string;
  metadata?: any;
  created_at: string;
  processed_at?: string;
  phone_number?: string;
  momo_code?: string;
  momo_tx?: string;
}

export default function OrdersPayments() {
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    pendingPayments: 0
  });
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadStats();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load orders from the old orders table temporarily
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Load payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Transform orders to match UnifiedOrder interface
      const transformedOrders = (ordersData || []).map(order => ({
        id: order.id,
        order_type: 'general',
        customer_phone: order.user_id || 'unknown',
        customer_id: order.user_id,
        vendor_id: order.business_id,
        items: order.items || [],
        subtotal: order.total_price || 0,
        tax_amount: 0,
        delivery_fee: order.delivery_fee || 0,
        total_amount: order.total_price || 0,
        currency: 'RWF',
        status: 'pending', // Default status as it doesn't exist in old schema
        payment_status: 'pending', // Default status
        payment_method: 'momo', // Default method
        payment_reference: order.payment_id,
        delivery_method: order.delivery ? 'delivery' : 'pickup',
        notes: '', // Default empty string
        created_at: order.created_at,
        updated_at: order.created_at,
        completed_at: null // Default null
      }));

      setOrders(transformedOrders);
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load orders and payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Orders stats
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_price');

      if (ordersError) throw ordersError;

      // Payments stats
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('status, amount');

      if (paymentsError) throw paymentsError;

      const stats = {
        totalOrders: ordersData?.length || 0,
        completedOrders: 0, // Can't filter by status since it doesn't exist
        totalRevenue: ordersData?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0,
        pendingPayments: paymentsData?.filter(p => p.status === 'pending').length || 0
      };

      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getOrderStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      delivering: "bg-indigo-100 text-indigo-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      refunded: "bg-gray-100 text-gray-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800", 
      failed: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount: number, currency = 'RWF') => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const orderColumns: ColumnDef<UnifiedOrder>[] = [
    {
      accessorKey: "order_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.order_type}
        </Badge>
      ),
    },
    {
      accessorKey: "customer_phone",
      header: "Customer",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.customer_phone}
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Total",
      cell: ({ row }) => (
        <div className="font-medium">
          {formatCurrency(row.original.total_amount, row.original.currency)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Order Status",
      cell: ({ row }) => (
        <Badge className={getOrderStatusColor(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "payment_status",
      header: "Payment",
      cell: ({ row }) => (
        <Badge className={getPaymentStatusColor(row.original.payment_status)}>
          {row.original.payment_status}
        </Badge>
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
            setSelectedOrder(row.original);
            setShowOrderDetails(true);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const paymentColumns: ColumnDef<Payment>[] = [
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.reference}
        </div>
      ),
    },
    {
      accessorKey: "phone_number",
      header: "Phone",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.phone_number || "N/A"}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <div className="font-medium">
          {formatCurrency(row.original.amount, row.original.currency)}
        </div>
      ),
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.payment_method}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={getPaymentStatusColor(row.original.status)}>
          {row.original.status}
        </Badge>
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
            setSelectedPayment(row.original);
            setShowPaymentDetails(true);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const filteredOrders = orders.filter(order =>
    order.customer_phone.includes(searchQuery) ||
    order.payment_reference?.includes(searchQuery) ||
    order.order_type.includes(searchQuery)
  );

  const filteredPayments = payments.filter(payment =>
    payment.reference.includes(searchQuery) ||
    payment.phone_number?.includes(searchQuery) ||
    payment.payment_method.includes(searchQuery)
  );

  if (loading) {
    return <div className="p-6">Loading orders and payments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Orders & Payments</h1>
          <p className="text-muted-foreground">
            Manage all orders and payment transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders, payments, or phone numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">
            📦 Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            💳 Payments ({payments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={orderColumns}
                data={filteredOrders}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={paymentColumns}
                data={filteredPayments}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Complete order information and status
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Order Information</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <div><strong>ID:</strong> {selectedOrder.id}</div>
                    <div><strong>Type:</strong> {selectedOrder.order_type}</div>
                    <div><strong>Customer:</strong> {selectedOrder.customer_phone}</div>
                    <div><strong>Status:</strong> <Badge className={getOrderStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge></div>
                    <div><strong>Payment Status:</strong> <Badge className={getPaymentStatusColor(selectedOrder.payment_status)}>{selectedOrder.payment_status}</Badge></div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold">Pricing</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <div><strong>Subtotal:</strong> {formatCurrency(selectedOrder.subtotal)}</div>
                    <div><strong>Tax:</strong> {formatCurrency(selectedOrder.tax_amount)}</div>
                    <div><strong>Delivery:</strong> {formatCurrency(selectedOrder.delivery_fee)}</div>
                    <div className="pt-2 border-t"><strong>Total:</strong> {formatCurrency(selectedOrder.total_amount)}</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Payment Details</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <div><strong>Method:</strong> {selectedOrder.payment_method || "N/A"}</div>
                    <div><strong>Reference:</strong> {selectedOrder.payment_reference || "N/A"}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold">Order Items</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <div key={index} className="p-2 border rounded">
                        <div><strong>{item.title || item.name}</strong></div>
                        <div>Qty: {item.quantity} × {formatCurrency(item.unit_price)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold">Timestamps</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <div><strong>Created:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</div>
                    <div><strong>Updated:</strong> {new Date(selectedOrder.updated_at).toLocaleString()}</div>
                    {selectedOrder.completed_at && (
                      <div><strong>Completed:</strong> {new Date(selectedOrder.completed_at).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDetails} onOpenChange={setShowPaymentDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Payment transaction information
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Payment Information</h3>
                <div className="mt-2 space-y-2 text-sm">
                  <div><strong>Reference:</strong> {selectedPayment.reference}</div>
                  <div><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</div>
                  <div><strong>Method:</strong> {selectedPayment.payment_method}</div>
                  <div><strong>Status:</strong> <Badge className={getPaymentStatusColor(selectedPayment.status)}>{selectedPayment.status}</Badge></div>
                  <div><strong>Phone:</strong> {selectedPayment.phone_number || "N/A"}</div>
                </div>
              </div>
              
              {selectedPayment.description && (
                <div>
                  <h3 className="font-semibold">Description</h3>
                  <p className="mt-2 text-sm">{selectedPayment.description}</p>
                </div>
              )}
              
              <div>
                <h3 className="font-semibold">Timestamps</h3>
                <div className="mt-2 space-y-2 text-sm">
                  <div><strong>Created:</strong> {new Date(selectedPayment.created_at).toLocaleString()}</div>
                  {selectedPayment.processed_at && (
                    <div><strong>Processed:</strong> {new Date(selectedPayment.processed_at).toLocaleString()}</div>
                  )}
                </div>
              </div>
              
              {selectedPayment.metadata && (
                <div>
                  <h3 className="font-semibold">Metadata</h3>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
                    {JSON.stringify(selectedPayment.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}