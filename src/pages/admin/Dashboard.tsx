import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  CreditCard, 
  Truck, 
  ShoppingCart, 
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Activity,
  Clock,
  MapPin,
  Phone,
  Calendar,
  BarChart3,
  PieChart,
  Globe,
  Smartphone,
  MessageSquare,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Download,
  Eye,
  Bell,
  Settings,
  Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TestSuite } from "@/components/admin/TestSuite";

interface KPIData {
  totalUsers: number;
  creditsToday: number;
  activeDrivers: number;
  pendingOrders: number;
  totalRevenue: number;
  newUsersToday: number;
  totalBusinesses: number;
  totalProducts: number;
  completedOrders: number;
  activeConversations: number;
  averageOrderValue: number;
  conversionRate: number;
}

interface ChartData {
  date: string;
  amount: number;
  users: number;
  orders: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'order' | 'payment' | 'driver' | 'business';
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  amount?: number;
}

interface SystemStatus {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  whatsapp: 'healthy' | 'degraded' | 'down';
  payments: 'healthy' | 'degraded' | 'down';
}

export default function Dashboard() {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalUsers: 0,
    creditsToday: 0,
    activeDrivers: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    newUsersToday: 0,
    totalBusinesses: 0,
    totalProducts: 0,
    completedOrders: 0,
    activeConversations: 0,
    averageOrderValue: 0,
    conversionRate: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    api: 'healthy',
    database: 'healthy',
    whatsapp: 'healthy',
    payments: 'healthy'
  });
  const [agentMetrics, setAgentMetrics] = useState({
    activeAgents: 0,
    qrRequestsToday: 0,
    momoVolumeToday: 0,
    avgResponseTime: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load comprehensive dashboard data
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [
        usersResult,
        paymentsResult,
        driversResult,
        ordersResult,
        businessesResult,
        productsResult,
        conversationsResult
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact' }),
        supabase.from('payments').select('*'),
        supabase.from('drivers').select('*', { count: 'exact' }),
        supabase.from('orders').select('*'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'active')
      ]);

      // Calculate metrics
      const totalUsers = usersResult.count || 0;
      const newUsersToday = usersResult.data?.filter(user => 
        new Date(user.created_at) >= todayStart
      ).length || 0;

      const creditsToday = paymentsResult.data?.filter(payment => 
        new Date(payment.created_at) >= todayStart
      ).reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      const totalRevenue = paymentsResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      const activeDrivers = driversResult.data?.filter(driver => driver.is_online).length || 0;
      const pendingOrders = ordersResult.data?.filter(order => order.status === 'pending').length || 0;
      const completedOrders = ordersResult.data?.filter(order => order.status === 'fulfilled').length || 0;
      
      const totalOrderValue = ordersResult.data?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
      const averageOrderValue = ordersResult.data?.length ? Math.round(totalOrderValue / ordersResult.data.length) : 0;

      const conversionRate = totalUsers > 0 ? ((ordersResult.data?.length || 0) / totalUsers * 100) : 0;

      setKpiData({
        totalUsers,
        creditsToday,
        activeDrivers,
        pendingOrders,
        totalRevenue,
        newUsersToday,
        totalBusinesses: businessesResult.count || 0,
        totalProducts: productsResult.count || 0,
        completedOrders,
        activeConversations: conversationsResult.count || 0,
        averageOrderValue,
        conversionRate: Math.round(conversionRate * 100) / 100
      });

      // Generate chart data for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const chartDataArray: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString();
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const dayPayments = paymentsResult.data?.filter(payment => {
          const paymentDate = new Date(payment.created_at);
          return paymentDate >= dayStart && paymentDate < dayEnd;
        }) || [];

        const dayUsers = usersResult.data?.filter(user => {
          const userDate = new Date(user.created_at);
          return userDate >= dayStart && userDate < dayEnd;
        }) || [];

        const dayOrders = ordersResult.data?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= dayStart && orderDate < dayEnd;
        }) || [];

        chartDataArray.push({
          date: dateStr,
          amount: dayPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
          users: dayUsers.length,
          orders: dayOrders.length
        });
      }

      setChartData(chartDataArray);

      // Generate recent activity
      const activities: RecentActivity[] = [];
      
      // Add recent payments
      paymentsResult.data?.slice(0, 3).forEach(payment => {
        activities.push({
          id: payment.id,
          type: 'payment',
          description: `Payment of ${payment.amount.toLocaleString()} RWF received`,
          timestamp: payment.created_at,
          status: payment.status === 'paid' ? 'success' : 'warning',
          amount: payment.amount
        });
      });

      // Add recent users
      usersResult.data?.slice(0, 2).forEach(user => {
        activities.push({
          id: user.id,
          type: 'user',
          description: `New user registered: ${user.phone}`,
          timestamp: user.created_at,
          status: 'info'
        });
      });

      // Add recent orders
      ordersResult.data?.slice(0, 2).forEach(order => {
        activities.push({
          id: order.id,
          type: 'order',
          description: `Order ${order.status}: ${order.total_price?.toLocaleString()} RWF`,
          timestamp: order.created_at,
          status: order.status === 'fulfilled' ? 'success' : order.status === 'pending' ? 'warning' : 'error'
        });
      });

      // Sort by timestamp and take the most recent
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 8));

      // Simulate system status (in real app, this would come from health checks)
      setSystemStatus({
        api: 'healthy',
        database: 'healthy',
        whatsapp: Math.random() > 0.1 ? 'healthy' : 'degraded',
        payments: 'healthy'
      });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'down': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users className="h-4 w-4" />;
      case 'payment': return <CreditCard className="h-4 w-4" />;
      case 'order': return <ShoppingCart className="h-4 w-4" />;
      case 'driver': return <Truck className="h-4 w-4" />;
      case 'business': return <Globe className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your easyMO admin dashboard</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span>Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your easyMO admin dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className={getStatusColor(systemStatus.api)}>
                {getStatusIcon(systemStatus.api)}
              </div>
              <div>
                <div className="font-medium">API</div>
                <div className={`text-sm ${getStatusColor(systemStatus.api)}`}>
                  {systemStatus.api}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={getStatusColor(systemStatus.database)}>
                {getStatusIcon(systemStatus.database)}
              </div>
              <div>
                <div className="font-medium">Database</div>
                <div className={`text-sm ${getStatusColor(systemStatus.database)}`}>
                  {systemStatus.database}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={getStatusColor(systemStatus.whatsapp)}>
                {getStatusIcon(systemStatus.whatsapp)}
              </div>
              <div>
                <div className="font-medium">WhatsApp</div>
                <div className={`text-sm ${getStatusColor(systemStatus.whatsapp)}`}>
                  {systemStatus.whatsapp}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={getStatusColor(systemStatus.payments)}>
                {getStatusIcon(systemStatus.payments)}
              </div>
              <div>
                <div className="font-medium">Payments</div>
                <div className={`text-sm ${getStatusColor(systemStatus.payments)}`}>
                  {systemStatus.payments}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalUsers.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <span className="text-green-600">+{kpiData.newUsersToday}</span>
              <span>today</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.creditsToday.toLocaleString()} RWF</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">+12.5%</span>
              <span>vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.activeDrivers}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>Online now</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.pendingOrders}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 text-orange-600" />
              <span>Requires attention</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalRevenue.toLocaleString()} RWF</div>
            <p className="text-xs text-muted-foreground">
              All-time revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Businesses</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalBusinesses}</div>
            <p className="text-xs text-muted-foreground">
              Registered businesses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Available products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.activeConversations}</div>
            <p className="text-xs text-muted-foreground">
              Active conversations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue Trend (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.date}</span>
                    <span className="font-medium">{item.amount.toLocaleString()} RWF</span>
                  </div>
                  <Progress 
                    value={(item.amount / Math.max(...chartData.map(d => d.amount))) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
              {chartData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No revenue data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Key Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Conversion Rate</span>
                <span className="font-medium">{kpiData.conversionRate}%</span>
              </div>
              <Progress value={kpiData.conversionRate} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Avg Order Value</span>
                <span className="font-medium">{kpiData.averageOrderValue.toLocaleString()} RWF</span>
              </div>
              <Progress value={Math.min((kpiData.averageOrderValue / 50000) * 100, 100)} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completed Orders</span>
                <span className="font-medium">{kpiData.completedOrders}</span>
              </div>
              <Progress 
                value={kpiData.completedOrders + kpiData.pendingOrders > 0 
                  ? (kpiData.completedOrders / (kpiData.completedOrders + kpiData.pendingOrders)) * 100 
                  : 0} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${getActivityColor(activity.status)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {activity.amount && (
                    <Badge variant="outline">
                      {activity.amount.toLocaleString()} RWF
                    </Badge>
                  )}
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Add New User
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Truck className="h-4 w-4 mr-2" />
              Register Driver
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Globe className="h-4 w-4 mr-2" />
              Add Business
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Broadcast Message
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Bell className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Suite */}
      <TestSuite />
    </div>
  );
}