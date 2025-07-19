import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, MessageCircle, CreditCard, MapPin, Settings, 
  Package, ShoppingCart, Receipt, CheckCircle, XCircle, Copy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Business {
  id: string;
  name: string;
  momo_code: string;
  category: 'bar' | 'pharmacy' | 'shop' | 'produce' | 'hardware';
  subscription_status: string;
  created_at: string;
  owner_user_id: string;
  owner_phone?: string;
  location_gps?: any;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_qty: number;
  unit: string;
  business_id: string;
  category: string;
  description: string;
  image_url: string;
  created_at: string;
}

interface Order {
  id: string;
  status: string;
  total_price: number;
  delivery: boolean;
  created_at: string;
  items: any;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  ussd_code: string;
  ussd_link?: string;
}

export default function BusinessDetail() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [generatingPayment, setGeneratingPayment] = useState(false);

  useEffect(() => {
    if (businessId) {
      loadBusinessData();
    }
  }, [businessId]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);

      // Load business details
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select(`
          *,
          owner:users(phone)
        `)
        .eq('id', businessId)
        .single();

      if (businessError) throw businessError;

      setBusiness({
        ...businessData,
        owner_phone: businessData.owner?.phone
      });

      // Load products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      setProducts(productsData || []);

      // Load orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10);

      setOrders(ordersData || []);

      // Load payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('momo_code', businessData.momo_code)
        .order('created_at', { ascending: false })
        .limit(10);

      setPayments(paymentsData || []);

    } catch (error) {
      console.error('Error loading business data:', error);
      toast({
        title: "Error",
        description: "Failed to load business details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePayment = async () => {
    if (!business || !paymentAmount) return;

    try {
      setGeneratingPayment(true);

      const { data, error } = await supabase.functions.invoke('generate-payment', {
        body: {
          user_id: business.owner_user_id,
          amount: parseInt(paymentAmount)
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment generated successfully",
      });

      setPaymentDialogOpen(false);
      setPaymentAmount("");
      loadBusinessData(); // Refresh payments

    } catch (error) {
      console.error('Error generating payment:', error);
      toast({
        title: "Error",
        description: "Failed to generate payment",
        variant: "destructive"
      });
    } finally {
      setGeneratingPayment(false);
    }
  };

  const generateSubscriptionInvoice = async () => {
    if (!business) return;

    try {
      const { data, error } = await supabase.functions.invoke('generate-payment', {
        body: {
          user_id: business.owner_user_id,
          amount: 10000 // Standard subscription fee
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription invoice generated",
      });

      loadBusinessData(); // Refresh payments

    } catch (error) {
      console.error('Error generating subscription invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate subscription invoice",
        variant: "destructive"
      });
    }
  };

  const updateBusinessStatus = async (newStatus: string) => {
    if (!business) return;

    try {
      const { error } = await supabase
        .from('businesses')
        .update({ subscription_status: newStatus })
        .eq('id', business.id);

      if (error) throw error;

      setBusiness({ ...business, subscription_status: newStatus });

      toast({
        title: "Success",
        description: `Business ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      });

    } catch (error) {
      console.error('Error updating business status:', error);
      toast({
        title: "Error",
        description: "Failed to update business status",
        variant: "destructive"
      });
    }
  };

  const openWhatsApp = () => {
    if (business?.owner_phone) {
      const cleanPhone = business.owner_phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=Hello%20from%20easyMO%20Admin`, '_blank');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  if (loading) {
    return <div className="p-6">Loading business details...</div>;
  }

  if (!business) {
    return <div className="p-6">Business not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/admin/businesses')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Businesses
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{business.name}</h1>
            <p className="text-muted-foreground">
              {business.category} • {business.momo_code}
            </p>
          </div>
        </div>
        <Badge variant={business.subscription_status === 'active' ? 'default' : 'secondary'}>
          {business.subscription_status}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p>{business.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="capitalize">{business.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">MoMo Code</Label>
                  <p className="font-mono">{business.momo_code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={business.subscription_status === 'active' ? 'default' : 'secondary'}>
                    {business.subscription_status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Owner Phone</Label>
                  <p>{business.owner_phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p>{new Date(business.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                {business.owner_phone && (
                  <Button onClick={openWhatsApp}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp Owner
                  </Button>
                )}
                <Button variant="outline" onClick={() => setPaymentDialogOpen(true)}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Generate Payment
                </Button>
                <Button
                  variant={business.subscription_status === 'active' ? 'destructive' : 'default'}
                  onClick={() => updateBusinessStatus(business.subscription_status === 'active' ? 'trial' : 'active')}
                >
                  {business.subscription_status === 'active' ? (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Products ({products.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No products listed by this business.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.price} RWF</TableCell>
                        <TableCell>{product.stock_qty}</TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders ({orders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No orders found for this business.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.id.substring(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.status}</Badge>
                        </TableCell>
                        <TableCell>{order.total_price} RWF</TableCell>
                        <TableCell>{order.delivery ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History ({payments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No payments found for this business.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>USSD Code</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">{payment.id.substring(0, 8)}...</TableCell>
                        <TableCell>{payment.amount} RWF</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{payment.ussd_code}</TableCell>
                        <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(payment.ussd_code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <div className="text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Map integration coming soon</p>
                  <p className="text-sm text-muted-foreground">
                    Location data: {business.location_gps ? 'Available' : 'Not available'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Current Status</Label>
                  <Badge variant={business.subscription_status === 'active' ? 'default' : 'secondary'}>
                    {business.subscription_status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Plan</Label>
                  <p>{business.category} - 10,000 RWF / month</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={generateSubscriptionInvoice}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Generate Subscription Invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateBusinessStatus('active')}
                  disabled={business.subscription_status === 'active'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate Subscription
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateBusinessStatus('trial')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Set Trial
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Generation Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Business Payment</DialogTitle>
            <DialogDescription>
              Create a payment request for this business owner.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (RWF)</Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                min="100"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={generatePayment} disabled={generatingPayment || !paymentAmount}>
                {generatingPayment ? "Generating..." : "Generate Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}