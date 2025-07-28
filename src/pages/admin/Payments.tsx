import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  CreditCard, 
  QrCode, 
  Receipt, 
  ExternalLink, 
  RefreshCw, 
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  user_id: string;
  direction: string;
  amount: number;
  currency: string;
  momo_number: string;
  qr_code_url?: string;
  ref?: string;
  status: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  momo_code?: string;
  ussd_code?: string;
  ussd_link?: string;
}

interface PaymentEvent {
  id: string;
  event_type: string;
  payload: any;
  created_at: string;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, activeTab, statusFilter, searchTerm]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentEvents = async (paymentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_events')
        .select('*')
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPaymentEvents(data || []);
    } catch (error) {
      console.error('Error fetching payment events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment events",
        variant: "destructive"
      });
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    // Filter by direction (tab)
    if (activeTab !== "all") {
      filtered = filtered.filter(payment => payment.direction === activeTab);
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.momo_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPayments(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
    toast({
      title: "Success",
      description: "Payments refreshed"
    });
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const { error } = await supabase.rpc('payments_mark_paid', {
        p_payment_id: paymentId,
        p_confirmation_note: 'Marked as paid by admin'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment marked as paid"
      });

      await fetchPayments();
      
      if (selectedPayment?.id === paymentId) {
        await fetchPaymentEvents(paymentId);
      }
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      toast({
        title: "Error",
        description: "Failed to mark payment as paid",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'inbound' 
      ? <ArrowDownLeft className="w-4 h-4 text-green-600" />
      : <ArrowUpRight className="w-4 h-4 text-blue-600" />;
  };

  const formatAmount = (amount: number, currency: string = 'RWF') => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const openPaymentDetail = async (payment: Payment) => {
    setSelectedPayment(payment);
    await fetchPaymentEvents(payment.id);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="w-8 h-8" />
            Payments
          </h1>
          <p className="text-muted-foreground">Manage QR payments and mobile money transactions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <Input
            placeholder="Search by ref, phone, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Payments</TabsTrigger>
          <TabsTrigger value="inbound">Received</TabsTrigger>
          <TabsTrigger value="outbound">Sent</TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending
            <Badge variant="secondary" className="ml-1">
              {payments.filter(p => p.status === 'pending').length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <div className="grid gap-4">
            {filteredPayments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <QrCode className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No payments found</p>
                </CardContent>
              </Card>
            ) : (
              filteredPayments.map((payment) => (
                <Card key={payment.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getDirectionIcon(payment.direction)}
                          {getStatusIcon(payment.status)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatAmount(payment.amount, payment.currency)}</span>
                            <Badge variant={payment.direction === 'inbound' ? 'default' : 'secondary'}>
                              {payment.direction}
                            </Badge>
                            <Badge variant={
                              payment.status === 'paid' ? 'default' :
                              payment.status === 'pending' ? 'secondary' : 'destructive'
                            }>
                              {payment.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <span>MoMo: {payment.momo_number}</span>
                            {payment.ref && <span className="ml-3">Ref: {payment.ref}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Created: {new Date(payment.created_at).toLocaleString()}
                            {payment.paid_at && (
                              <span className="ml-3">
                                Paid: {new Date(payment.paid_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {payment.qr_code_url && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(payment.qr_code_url, '_blank')}
                          >
                            <QrCode className="w-4 h-4 mr-1" />
                            QR
                          </Button>
                        )}
                        {payment.status === 'pending' && payment.direction === 'inbound' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMarkAsPaid(payment.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openPaymentDetail(payment)}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Payment Details</DialogTitle>
                            </DialogHeader>
                            {selectedPayment && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Payment ID</Label>
                                    <p className="text-sm font-mono">{selectedPayment.id}</p>
                                  </div>
                                  <div>
                                    <Label>Reference</Label>
                                    <p className="text-sm">{selectedPayment.ref || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label>Amount</Label>
                                    <p className="text-sm">{formatAmount(selectedPayment.amount, selectedPayment.currency)}</p>
                                  </div>
                                  <div>
                                    <Label>MoMo Number</Label>
                                    <p className="text-sm">{selectedPayment.momo_number}</p>
                                  </div>
                                  <div>
                                    <Label>Direction</Label>
                                    <Badge variant={selectedPayment.direction === 'inbound' ? 'default' : 'secondary'}>
                                      {selectedPayment.direction}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <Badge variant={
                                      selectedPayment.status === 'paid' ? 'default' :
                                      selectedPayment.status === 'pending' ? 'secondary' : 'destructive'
                                    }>
                                      {selectedPayment.status}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {paymentEvents.length > 0 && (
                                  <div>
                                    <Label>Payment History</Label>
                                    <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                                      {paymentEvents.map((event) => (
                                        <div key={event.id} className="border rounded p-3 text-sm">
                                          <div className="flex justify-between items-start">
                                            <span className="font-medium">{event.event_type}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(event.created_at).toLocaleString()}
                                            </span>
                                          </div>
                                          {event.payload && Object.keys(event.payload).length > 0 && (
                                            <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                                              {JSON.stringify(event.payload, null, 2)}
                                            </pre>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}