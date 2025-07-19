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
  Search, RefreshCw, DollarSign, CheckCircle, XCircle, Clock, 
  TrendingUp, TrendingDown, AlertTriangle, Download, Filter,
  Eye, Copy, ExternalLink, BarChart3, PieChart, Calendar,
  CreditCard, Smartphone, QrCode, Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  momo_code: string;
  ussd_code: string;
  qr_code_url: string | null;
  ussd_link: string | null;
  created_at: string;
}

interface PaymentStats {
  totalAmount: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  todayRevenue: number;
  monthlyRevenue: number;
  conversionRate: number;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [amountRange, setAmountRange] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [stats, setStats] = useState<PaymentStats>({
    totalAmount: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    conversionRate: 0
  });
  const { toast } = useToast();

  const itemsPerPage = 50;

  useEffect(() => {
    loadPayments();
  }, [currentPage, searchTerm, statusFilter, dateRange, amountRange]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('payments')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter as any);
      }

      if (searchTerm) {
        query = query.or(`momo_code.ilike.%${searchTerm}%,ussd_code.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`);
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

      // Amount range filtering
      if (amountRange !== "all") {
        switch (amountRange) {
          case "small":
            query = query.lt('amount', 10000);
            break;
          case "medium":
            query = query.gte('amount', 10000).lt('amount', 50000);
            break;
          case "large":
            query = query.gte('amount', 50000);
            break;
        }
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setPayments(data || []);
      setTotalCount(count || 0);
      await calculateStats(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async (paymentsData: Payment[]) => {
    const totalAmount = paymentsData.reduce((sum, p) => sum + p.amount, 0);
    const successfulPayments = paymentsData.filter(p => p.status === 'paid').length;
    const pendingPayments = paymentsData.filter(p => p.status === 'pending').length;
    const failedPayments = paymentsData.filter(p => p.status === 'failed').length;
    
    // Calculate today's revenue
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayRevenue = paymentsData
      .filter(p => p.status === 'paid' && new Date(p.created_at) >= todayStart)
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate monthly revenue
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRevenue = paymentsData
      .filter(p => p.status === 'paid' && new Date(p.created_at) >= monthStart)
      .reduce((sum, p) => sum + p.amount, 0);

    const conversionRate = paymentsData.length > 0 ? (successfulPayments / paymentsData.length) * 100 : 0;

    setStats({
      totalAmount,
      successfulPayments,
      pendingPayments,
      failedPayments,
      todayRevenue,
      monthlyRevenue,
      conversionRate
    });
  };

  const manualReconcile = async (paymentId: string, newStatus: 'paid' | 'failed') => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment ${newStatus === 'paid' ? 'confirmed' : 'marked as failed'}`,
      });

      loadPayments();
    } catch (error) {
      console.error('Error reconciling payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return { variant: "secondary" as const, text: "Pending", icon: Clock };
      case 'paid': return { variant: "default" as const, text: "Paid", icon: CheckCircle };
      case 'failed': return { variant: "destructive" as const, text: "Failed", icon: XCircle };
      default: return { variant: "secondary" as const, text: status, icon: Clock };
    }
  };

  const getTotalRevenue = () => {
    return payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const exportPayments = () => {
    const csvContent = [
      ['Payment ID', 'Amount', 'Status', 'MoMo Code', 'USSD Code', 'Created Date'],
      ...payments.map(p => [
        p.id,
        p.amount.toString(),
        p.status,
        p.momo_code,
        p.ussd_code,
        new Date(p.created_at).toISOString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header with Analytics Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments Management</h1>
          <p className="text-muted-foreground">Monitor and manage all payment transactions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPayments} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadPayments} variant="outline" size="sm">
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
            <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString()} RWF</div>
            <p className="text-xs text-muted-foreground">
              +{stats.todayRevenue.toLocaleString()} RWF today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <PieChart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
            <Progress value={stats.conversionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedPayments}</div>
            <p className="text-xs text-muted-foreground">
              Need investigation
            </p>
          </CardContent>
        </Card>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
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
                <SelectItem value="failed">Failed</SelectItem>
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

            <Select value={amountRange} onValueChange={setAmountRange}>
              <SelectTrigger>
                <SelectValue placeholder="All Amounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Amounts</SelectItem>
                <SelectItem value="small">Under 10K RWF</SelectItem>
                <SelectItem value="medium">10K - 50K RWF</SelectItem>
                <SelectItem value="large">Above 50K RWF</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setDateRange("all");
                setAmountRange("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payments ({totalCount.toLocaleString()})</CardTitle>
            <div className="text-sm text-muted-foreground">
              Total Value: {getTotalRevenue().toLocaleString()} RWF
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-muted-foreground">Loading payments...</p>
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No payments found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
            </div>
          ) : viewMode === "table" ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const statusBadge = getStatusBadge(payment.status);
                    const StatusIcon = statusBadge.icon;
                    return (
                      <TableRow key={payment.id} className="group hover:bg-muted/50">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-mono text-sm font-medium">
                              {payment.id.slice(0, 8)}...
                            </div>
                            <div className="text-xs text-muted-foreground">
                              User: {payment.user_id.slice(0, 8)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-lg">
                            {payment.amount.toLocaleString()} RWF
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{payment.momo_code}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(payment.momo_code)}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <QrCode className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{payment.ussd_code}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(payment.ussd_code)}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
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
                            <div>{new Date(payment.created_at).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(payment.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {payment.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => manualReconcile(payment.id, 'paid')}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => manualReconcile(payment.id, 'failed')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedPayment(payment)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Payment Details</DialogTitle>
                                </DialogHeader>
                                {selectedPayment && (
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                                        <div className="font-mono text-sm mt-1">{selectedPayment.id}</div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Amount</label>
                                        <div className="font-bold text-lg mt-1">{selectedPayment.amount.toLocaleString()} RWF</div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                                        <div className="mt-1">
                                          <Badge variant={getStatusBadge(selectedPayment.status).variant}>
                                            {getStatusBadge(selectedPayment.status).text}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Created</label>
                                        <div className="text-sm mt-1">{new Date(selectedPayment.created_at).toLocaleString()}</div>
                                      </div>
                                    </div>
                                    
                                    <Separator />
                                    
                                    <div className="space-y-4">
                                      <h4 className="font-medium">Payment Methods</h4>
                                      <div className="grid grid-cols-2 gap-4">
                                        <Card className="p-4">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Smartphone className="h-4 w-4" />
                                            <span className="font-medium">Mobile Money</span>
                                          </div>
                                          <div className="font-mono text-sm">{selectedPayment.momo_code}</div>
                                        </Card>
                                        <Card className="p-4">
                                          <div className="flex items-center gap-2 mb-2">
                                            <QrCode className="h-4 w-4" />
                                            <span className="font-medium">USSD Code</span>
                                          </div>
                                          <div className="font-mono text-sm">{selectedPayment.ussd_code}</div>
                                        </Card>
                                      </div>
                                      
                                      {selectedPayment.qr_code_url && (
                                        <div>
                                          <label className="text-sm font-medium text-muted-foreground">QR Code</label>
                                          <div className="mt-2">
                                            <Button variant="outline" size="sm" asChild>
                                              <a href={selectedPayment.qr_code_url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                View QR Code
                                              </a>
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {selectedPayment.ussd_link && (
                                        <div>
                                          <label className="text-sm font-medium text-muted-foreground">USSD Link</label>
                                          <div className="mt-2">
                                            <Button variant="outline" size="sm" asChild>
                                              <a href={selectedPayment.ussd_link} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                Open USSD
                                              </a>
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {selectedPayment.status === 'pending' && (
                                      <>
                                        <Separator />
                                        <div className="flex gap-2">
                                          <Button
                                            onClick={() => manualReconcile(selectedPayment.id, 'paid')}
                                            className="flex-1"
                                          >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Mark as Paid
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            onClick={() => manualReconcile(selectedPayment.id, 'failed')}
                                            className="flex-1"
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Mark as Failed
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
              {payments.map((payment) => {
                const statusBadge = getStatusBadge(payment.status);
                const StatusIcon = statusBadge.icon;
                return (
                  <Card key={payment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-sm text-muted-foreground">
                          {payment.id.slice(0, 8)}...
                        </div>
                        <Badge variant={statusBadge.variant} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusBadge.text}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{payment.amount.toLocaleString()} RWF</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{payment.momo_code}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(payment.momo_code)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <QrCode className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{payment.ussd_code}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(payment.ussd_code)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {payment.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => manualReconcile(payment.id, 'paid')}
                              className="flex-1 text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirm
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => manualReconcile(payment.id, 'failed')}
                              className="flex-1 text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPayment(payment)}
                              className={payment.status === 'pending' ? 'flex-none' : 'flex-1'}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Payment Details</DialogTitle>
                            </DialogHeader>
                            {selectedPayment && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                                    <div className="font-mono text-sm mt-1">{selectedPayment.id}</div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                                    <div className="font-bold text-lg mt-1">{selectedPayment.amount.toLocaleString()} RWF</div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <div className="mt-1">
                                      <Badge variant={getStatusBadge(selectedPayment.status).variant}>
                                        {getStatusBadge(selectedPayment.status).text}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                                    <div className="text-sm mt-1">{new Date(selectedPayment.created_at).toLocaleString()}</div>
                                  </div>
                                </div>
                                
                                <Separator />
                                
                                <div className="space-y-4">
                                  <h4 className="font-medium">Payment Methods</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <Card className="p-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Smartphone className="h-4 w-4" />
                                        <span className="font-medium">Mobile Money</span>
                                      </div>
                                      <div className="font-mono text-sm">{selectedPayment.momo_code}</div>
                                    </Card>
                                    <Card className="p-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <QrCode className="h-4 w-4" />
                                        <span className="font-medium">USSD Code</span>
                                      </div>
                                      <div className="font-mono text-sm">{selectedPayment.ussd_code}</div>
                                    </Card>
                                  </div>
                                  
                                  {selectedPayment.qr_code_url && (
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">QR Code</label>
                                      <div className="mt-2">
                                        <Button variant="outline" size="sm" asChild>
                                          <a href={selectedPayment.qr_code_url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            View QR Code
                                          </a>
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {selectedPayment.ussd_link && (
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">USSD Link</label>
                                      <div className="mt-2">
                                        <Button variant="outline" size="sm" asChild>
                                          <a href={selectedPayment.ussd_link} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Open USSD
                                          </a>
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {selectedPayment.status === 'pending' && (
                                  <>
                                    <Separator />
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => manualReconcile(selectedPayment.id, 'paid')}
                                        className="flex-1"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Mark as Paid
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => manualReconcile(selectedPayment.id, 'failed')}
                                        className="flex-1"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Mark as Failed
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
          {!loading && payments.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} payments
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