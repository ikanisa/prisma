import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Truck, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KPIData {
  totalUsers: number;
  creditsToday: number;
  activeDrivers: number;
  pendingOrders: number;
}

interface ChartData {
  date: string;
  amount: number;
}

export default function Dashboard() {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalUsers: 0,
    creditsToday: 0,
    activeDrivers: 0,
    pendingOrders: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load KPI data
      const [usersResult, paymentsResult, driversResult, ordersResult] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('amount').gte('created_at', new Date().toISOString().split('T')[0]),
        supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('is_online', true),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      // Calculate credits today
      const creditsToday = paymentsResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      setKpiData({
        totalUsers: usersResult.count || 0,
        creditsToday,
        activeDrivers: driversResult.count || 0,
        pendingOrders: ordersResult.count || 0
      });

      // Load chart data (last 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: chartPayments } = await supabase
        .from('payments')
        .select('created_at, amount')
        .gte('created_at', fourteenDaysAgo.toISOString());

      // Group by date
      const groupedData: { [key: string]: number } = {};
      chartPayments?.forEach(payment => {
        const date = new Date(payment.created_at).toLocaleDateString();
        groupedData[date] = (groupedData[date] || 0) + payment.amount;
      });

      const chartArray = Object.entries(groupedData).map(([date, amount]) => ({
        date,
        amount
      }));

      setChartData(chartArray);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalUsers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Generated Today</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.creditsToday.toLocaleString()} RWF</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.activeDrivers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.pendingOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payments (Last 14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {chartData.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{item.date}</span>
                  <span className="font-medium">{item.amount.toLocaleString()} RWF</span>
                </div>
              ))}
              {chartData.length === 0 && (
                <p className="text-sm text-muted-foreground">No payment data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drivers Live Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Map integration coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}