import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CreditCard, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  QrCode,
  Search,
  Download,
  Eye,
  Copy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  user_id?: string;
  direction: 'inbound' | 'outbound';
  amount?: number;
  momo_number?: string;
  qr_url?: string;
  ref?: string;
  ussd_code?: string;
  purpose?: string;
  created_at: string;
  updated_at: string;
}

interface PaymentStats {
  total_payments: number;
  total_amount: number;
  total_qr_generated: number;
  inbound_amount: number;
  outbound_amount: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    total_payments: 0,
    total_amount: 0,
    total_qr_generated: 0,
    inbound_amount: 0,
    outbound_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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
        user_id: payment.user_id || undefined,
        direction: (payment.direction === 'inbound' || payment.direction === 'outbound') ? payment.direction : 'inbound' as 'inbound' | 'outbound',
        amount: payment.amount || undefined,
        momo_number: payment.momo_number || undefined,
        qr_url: payment.qr_url || undefined,
        ref: payment.ref || undefined,
        ussd_code: payment.ussd_code || undefined,
        purpose: payment.purpose || undefined,
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
      total_qr_generated: payments.filter(p => p.qr_url).length,
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
    });

    return stats;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payment.momo_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payment.ussd_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDirection = directionFilter === 'all' || payment.direction === directionFilter;
    
    return matchesSearch && matchesDirection;
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
          <h1 className="text-3xl font-bold">USSD QR Payments</h1>
          <p className="text-muted-foreground">Generate and manage USSD payment QR codes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => window.open('/admin/qr-scanner', '_blank')}>
            <QrCode className="mr-2 h-4 w-4" />
            QR Scanner
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
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{stats.total_payments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <QrCode className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">QR Codes Generated</p>
                <p className="text-2xl font-bold">{stats.total_qr_generated}</p>
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
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>USSD Payment Records</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference, USSD code, or number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
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
                <TableHead>USSD Code</TableHead>
                <TableHead>Purpose</TableHead>
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
                    {payment.amount ? `${payment.amount.toLocaleString()} RWF` : '-'}
                  </TableCell>
                  <TableCell>{payment.momo_number || '-'}</TableCell>
                  <TableCell>
                    {payment.ussd_code ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {payment.ussd_code}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(payment.ussd_code!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {payment.purpose || 'general'}
                    </span>
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}