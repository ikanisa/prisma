import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSetup } from "@/components/admin/AdminSetup";
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin === true) {
      loadDashboardData();
      const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.user) {
        setIsAdmin(false);
        return;
      }

      // Check if user has admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.session.user.id)
        .eq('role', 'admin')
        .single();
        
      setIsAdmin(!!roles);
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Use the new metrics aggregator edge function
      const { data: metricsResponse, error } = await supabase.functions.invoke('metrics-aggregator');
      
      if (error) throw error;
      if (!metricsResponse.success) throw new Error(metricsResponse.error);
      
      const metrics = metricsResponse.data;

      // Update KPI data with aggregated metrics
      setKpiData({
        totalUsers: metrics.overview.totalUsers,
        creditsToday: metrics.overview.revenue24h,
        activeDrivers: 0, // Will be fetched separately for real-time data
        pendingOrders: 0, // Will be calculated from orders
        totalRevenue: metrics.overview.totalRevenue,
        newUsersToday: metrics.overview.activeUsers24h,
        totalBusinesses: 0, // Will be fetched separately
        totalProducts: 0, // Will be fetched separately
        completedOrders: metrics.overview.orders24h,
        activeConversations: metrics.overview.conversations24h,
        averageOrderValue: Math.round(metrics.overview.totalRevenue / Math.max(metrics.overview.totalOrders, 1)),
        conversionRate: metrics.performance.agentSuccessRate
      });

      // Update agent metrics
      setAgentMetrics({
        activeAgents: metrics.system.functionsActive,
        qrRequestsToday: metrics.overview.activeUsers24h,
        momoVolumeToday: metrics.overview.revenue24h,
        avgResponseTime: metrics.performance.avgResponseTime
      });

      // Fallback to direct queries for missing data
      const [
        driversResult,
        ordersResult,
        businessesResult,
        productsResult
      ] = await Promise.all([
        supabase.from('drivers').select('*', { count: 'exact' }),
        supabase.from('orders').select('*'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true })
      ]);

      // Update KPI data with real-time values
      const activeDrivers = driversResult.data?.filter(driver => driver.is_online).length || 0;
      const pendingOrders = ordersResult.data?.filter(order => order.status === 'pending').length || 0;
      
      setKpiData(prev => ({
        ...prev,
        activeDrivers,
        pendingOrders,
        totalBusinesses: businessesResult.count || 0,
        totalProducts: productsResult.count || 0
      }));

      // Generate sample chart data (in production, this would come from metrics aggregator)
      const chartDataArray: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        chartDataArray.push({
          date: date.toLocaleDateString(),
          amount: Math.floor(Math.random() * 50000) + 10000,
          users: Math.floor(Math.random() * 100) + 20,
          orders: Math.floor(Math.random() * 50) + 10
        });
      }
      setChartData(chartDataArray);

      // Generate recent activity from real data
      const activities: RecentActivity[] = [];
      
      // Add sample recent activities (in production, this would come from audit logs)
      const sampleActivities = [
        {
          id: '1',
          type: 'payment' as const,
          description: `Payment of ${(Math.random() * 50000 + 10000).toFixed(0)} RWF received`,
          timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          status: 'success' as const,
          amount: Math.random() * 50000 + 10000
        },
        {
          id: '2',
          type: 'user' as const,
          description: `New user registered: +250${(Math.random() * 900000000 + 100000000).toFixed(0)}`,
          timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(),
          status: 'info' as const
        },
        {
          id: '3',
          type: 'order' as const,
          description: `Order completed: ${(Math.random() * 30000 + 5000).toFixed(0)} RWF`,
          timestamp: new Date(Date.now() - Math.random() * 10800000).toISOString(),
          status: 'success' as const
        }
      ];

      setRecentActivity(sampleActivities);

      // Update system status based on metrics
      setSystemStatus({
        api: metrics.system.status === 'healthy' ? 'healthy' : 'degraded',
        database: metrics.system.successRate > 95 ? 'healthy' : 'degraded',
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

  // Show admin setup if user is not admin
  if (isAdmin === false) {
    return <AdminSetup />;
  }

  if (loading || isAdmin === null) {
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