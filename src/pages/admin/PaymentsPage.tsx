import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CreditCard, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  Download,
  QrCode,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  user_id: string;
  direction: 'inbound' | 'outbound';
  amount?: number;
  currency: string;
  momo_number?: string;
  qr_url?: string;
  ref?: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface PaymentStats {
  total_payments: number;
  total_amount: number;
  pending_count: number;
  paid_count: number;
  inbound_amount: number;
  outbound_amount: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    total_payments: 0,
    total_amount: 0,
    pending_count: 0,
    paid_count: 0,
    inbound_amount: 0,
    outbound_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Transform the data to match our interface
      const transformedPayments = (paymentsData || []).map((payment: any) => ({
        id: payment.id,
        user_id: payment.user_id || '',
        direction: (payment.direction === 'inbound' || payment.direction === 'outbound') ? payment.direction : 'inbound' as 'inbound' | 'outbound',
        amount: payment.amount || undefined,
        currency: payment.currency || 'RWF',
        momo_number: payment.momo_number || undefined,
        qr_url: (payment as any).qr_url || undefined,
        ref: payment.ref || undefined,
        status: (['pending', 'paid', 'failed', 'cancelled'].includes(payment.status) ? payment.status : 'pending') as 'pending' | 'paid' | 'failed' | 'cancelled',
        metadata: (payment as any).metadata || {},
        created_at: payment.created_at,
        updated_at: payment.updated_at || payment.created_at,
      })) as Payment[];

      setPayments(transformedPayments);

      // Calculate stats
      const stats = calculateStats(transformedPayments);
      setStats(stats);

    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payments data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (payments: Payment[]): PaymentStats => {
    const stats = {
      total_payments: payments.length,
      total_amount: 0,
      pending_count: 0,
      paid_count: 0,
      inbound_amount: 0,
      outbound_amount: 0,
    };

    payments.forEach(payment => {
      if (payment.amount) {
        stats.total_amount += payment.amount;
        if (payment.direction === 'inbound') {
          stats.inbound_amount += payment.amount;
        } else {
          stats.outbound_amount += payment.amount;
        }
      }

      if (payment.status === 'pending') {
        stats.pending_count++;
      } else if (payment.status === 'paid') {
        stats.paid_count++;
      }
    });

    return stats;
  };

  const handleMarkPaid = async (paymentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('payments-mark-paid', {
        body: {
          payment_id: paymentId,
          confirmation_note: 'Manually marked as paid by admin'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payment Updated",
          description: "Payment has been marked as paid",
        });
        fetchPayments(); // Refresh the list
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'paid': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payment.momo_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesDirection = directionFilter === 'all' || payment.direction === directionFilter;
    
    return matchesSearch && matchesStatus && matchesDirection;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Manage QR payments and transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <QrCode className="mr-2 h-4 w-4" />
            Generate QR
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">{stats.total_payments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ArrowUpCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Inbound</p>
                <p className="text-2xl font-bold">{stats.inbound_amount.toLocaleString()} RWF</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ArrowDownCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Outbound</p>
                <p className="text-2xl font-bold">{stats.outbound_amount.toLocaleString()} RWF</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Payments</TabsTrigger>
          <TabsTrigger value="inbound">Inbound</TabsTrigger>
          <TabsTrigger value="outbound">Outbound</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Payment Transactions</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by reference or number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                    value={directionFilter}
                    onChange={(e) => setDirectionFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Directions</option>
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>MoMo Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.ref}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {payment.direction === 'inbound' ? (
                            <ArrowUpCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="capitalize">{payment.direction}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.amount ? `${payment.amount.toLocaleString()} ${payment.currency}` : '-'}
                      </TableCell>
                      <TableCell>{payment.momo_number || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(payment.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(payment.status)}
                            <span className="capitalize">{payment.status}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {payment.qr_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(payment.qr_url, '_blank')}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payment.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkPaid(payment.id)}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tab content would be similar but filtered */}
        <TabsContent value="inbound">
          <Card>
            <CardHeader>
              <CardTitle>Inbound Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Showing inbound payments only...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outbound">
          <Card>
            <CardHeader>
              <CardTitle>Outbound Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Showing outbound payments only...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Showing pending payments only...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
