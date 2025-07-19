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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, RefreshCw, MapPin, Wallet, Truck, Plus, Users, Activity,
  TrendingUp, TrendingDown, DollarSign, Clock, Star, BarChart3,
  Eye, Edit, Copy, Download, Filter, Grid3X3, List, Phone, Mail,
  Navigation, Zap, Car, MessageSquare, ExternalLink, Award,
  Calendar, PieChart, AlertCircle, CheckCircle, XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddDriverDialog } from "@/components/admin/AddDriverDialog";

interface Driver {
  id: string;
  driver_kind: 'moto' | 'cab' | 'truck';
  vehicle_plate: string;
  momo_code: string;
  is_online: boolean;
  subscription_status: string;
  created_at: string;
  user_id: string;
  location_gps?: any;
  logbook_url?: string;
}

interface DriverWallet {
  balance: number;
}

interface DriverAnalytics {
  totalDrivers: number;
  onlineDrivers: number;
  activeSubscriptions: number;
  totalEarnings: number;
  avgRating: number;
  completedTrips: number;
  newThisMonth: number;
}

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [walletBalances, setWalletBalances] = useState<{[key: string]: number}>({});
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [analytics, setAnalytics] = useState<DriverAnalytics>({
    totalDrivers: 0,
    onlineDrivers: 0,
    activeSubscriptions: 0,
    totalEarnings: 0,
    avgRating: 4.5,
    completedTrips: 0,
    newThisMonth: 0
  });
  const { toast } = useToast();

  const itemsPerPage = 20;

  useEffect(() => {
    loadDrivers();
    loadTrips();
  }, [currentPage, searchTerm, statusFilter, typeFilter, subscriptionFilter, sortBy]);

  useEffect(() => {
    calculateAnalytics();
  }, [drivers, walletBalances]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('drivers')
        .select('*', { count: 'exact' })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      // Apply filters
      if (searchTerm) {
        query = query.or(`vehicle_plate.ilike.%${searchTerm}%,momo_code.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        if (statusFilter === "online") {
          query = query.eq('is_online', true);
        } else if (statusFilter === "offline") {
          query = query.eq('is_online', false);
        }
      }

      if (typeFilter !== "all") {
        query = query.eq('driver_kind', typeFilter as Driver['driver_kind']);
      }

      if (subscriptionFilter !== "all") {
        query = query.eq('subscription_status', subscriptionFilter);
      }

      // Apply sorting
      switch (sortBy) {
        case "newest":
          query = query.order('created_at', { ascending: false });
          break;
        case "oldest":
          query = query.order('created_at', { ascending: true });
          break;
        case "plate":
          query = query.order('vehicle_plate', { ascending: true });
          break;
        case "online-first":
          query = query.order('is_online', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setDrivers(data || []);
      setTotalCount(count || 0);

      // Load wallet balances for all drivers
      if (data && data.length > 0) {
        const driverIds = data.map(d => d.id);
        const { data: wallets } = await supabase
          .from('driver_wallet')
          .select('driver_id, balance')
          .in('driver_id', driverIds);

        const balances: {[key: string]: number} = {};
        wallets?.forEach(wallet => {
          balances[wallet.driver_id] = wallet.balance;
        });
        setWalletBalances(balances);
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
      toast({
        title: "Error",
        description: "Failed to load drivers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('driver_id, status')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setTrips(data);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
    }
  };

  const calculateAnalytics = () => {
    const totalDrivers = drivers.length;
    const onlineDrivers = drivers.filter(d => d.is_online).length;
    const activeSubscriptions = drivers.filter(d => d.subscription_status === 'active').length;
    const totalEarnings = Object.values(walletBalances).reduce((sum, balance) => sum + balance, 0);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const newThisMonth = drivers.filter(d => new Date(d.created_at) > oneMonthAgo).length;
    
    const completedTrips = trips.filter(t => t.status === 'completed').length;

    setAnalytics({
      totalDrivers,
      onlineDrivers,
      activeSubscriptions,
      totalEarnings,
      avgRating: 4.5, // Mock data
      completedTrips,
      newThisMonth
    });
  };

  const getDriverTypeBadge = (type: string) => {
    const configs = {
      moto: { variant: "default" as const, icon: Car, color: "text-green-600" },
      cab: { variant: "secondary" as const, icon: Car, color: "text-blue-600" },
      truck: { variant: "outline" as const, icon: Truck, color: "text-purple-600" }
    };
    return configs[type as keyof typeof configs] || { variant: "outline" as const, icon: Car, color: "text-gray-600" };
  };

  const getStatusBadge = (isOnline: boolean) => {
    return isOnline 
      ? { variant: "default" as const, text: "Online", color: "text-green-600" }
      : { variant: "secondary" as const, text: "Offline", color: "text-gray-600" };
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Driver ID copied to clipboard",
    });
  };

  const exportToCSV = () => {
    const headers = ['Vehicle Plate', 'Type', 'MoMo Code', 'Status', 'Wallet Balance', 'Subscription', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...drivers.map(driver => [
        `"${driver.vehicle_plate || ''}"`,
        driver.driver_kind,
        driver.momo_code,
        driver.is_online ? 'Online' : 'Offline',
        walletBalances[driver.id] || 0,
        driver.subscription_status,
        driver.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drivers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Drivers data exported to CSV",
    });
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
            <Truck className="w-8 h-8 text-primary" />
            Driver Fleet Management
          </h1>
          <p className="text-muted-foreground">Monitor and manage your driver network</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadDrivers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <AddDriverDialog onDriverAdded={loadDrivers} />
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalDrivers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active fleet members</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Now</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.onlineDrivers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalDrivers > 0 ? ((analytics.onlineDrivers / analytics.totalDrivers) * 100).toFixed(1) : 0}% availability
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analytics.totalEarnings / 1000000).toFixed(1)}M RWF</div>
            <p className="text-xs text-muted-foreground">Combined wallet balance</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
            <Star className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Driver performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Fleet Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-600">Online</span>
                <span className="text-sm font-bold">{analytics.onlineDrivers}</span>
              </div>
              <Progress value={analytics.totalDrivers > 0 ? (analytics.onlineDrivers / analytics.totalDrivers) * 100 : 0} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-600">Active Subs</span>
                <span className="text-sm font-bold">{analytics.activeSubscriptions}</span>
              </div>
              <Progress value={analytics.totalDrivers > 0 ? (analytics.activeSubscriptions / analytics.totalDrivers) * 100 : 0} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-600">Completed Trips</span>
                <span className="text-sm font-bold">{analytics.completedTrips}</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-600">New This Month</span>
                <span className="text-sm font-bold">{analytics.newThisMonth}</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search drivers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Vehicle Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="moto">Motorcycle</SelectItem>
                  <SelectItem value="cab">Cab</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subscription</label>
              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All subscriptions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscriptions</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort by</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="plate">Vehicle Plate</SelectItem>
                  <SelectItem value="online-first">Online First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">View</label>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Grid
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {totalCount.toLocaleString()} drivers found
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Drivers Display */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Loading drivers...</span>
              </div>
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No drivers found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or add new drivers.</p>
            </div>
          ) : (
            <>
              {viewMode === "table" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => {
                      const statusBadge = getStatusBadge(driver.is_online);
                      const typeBadge = getDriverTypeBadge(driver.driver_kind);
                      const driverTrips = trips.filter(t => t.driver_id === driver.id);
                      const completedTrips = driverTrips.filter(t => t.status === 'completed').length;
                      
                      return (
                        <TableRow key={driver.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                                  {driver.vehicle_plate?.slice(0, 2).toUpperCase() || 'DR'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">Driver #{driver.id.slice(0, 8)}</div>
                                <div className="text-sm text-muted-foreground">ID: {driver.id.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono font-medium">
                              {driver.vehicle_plate || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <typeBadge.icon className="h-4 w-4" />
                              <Badge variant={typeBadge.variant}>
                                {driver.driver_kind}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {driver.is_online ? (
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                              ) : (
                                <div className="h-2 w-2 rounded-full bg-gray-400" />
                              )}
                              <Badge variant={statusBadge.variant}>
                                {statusBadge.text}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {(walletBalances[driver.id] || 0).toLocaleString()} RWF
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">4.5</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {completedTrips} trips
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={driver.subscription_status === 'active' ? 'default' : 'secondary'}>
                              {driver.subscription_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {new Date(driver.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setSelectedDriver(driver)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DriverDetailsDialog driver={selectedDriver} trips={driverTrips} walletBalance={walletBalances[driver.id] || 0} />
                              </Dialog>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCopyId(driver.id)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-6">
                  {drivers.map((driver) => {
                    const statusBadge = getStatusBadge(driver.is_online);
                    const typeBadge = getDriverTypeBadge(driver.driver_kind);
                    const driverTrips = trips.filter(t => t.driver_id === driver.id);
                    const completedTrips = driverTrips.filter(t => t.status === 'completed').length;
                    
                    return (
                      <Card key={driver.id} className="group hover:shadow-lg transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-lg font-semibold">
                                {driver.vehicle_plate?.slice(0, 2).toUpperCase() || 'DR'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2">
                              <Badge variant={statusBadge.variant}>
                                {statusBadge.text}
                              </Badge>
                              {driver.is_online && (
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <h3 className="font-semibold text-lg">
                              {driver.vehicle_plate || 'N/A'}
                            </h3>
                            <div className="flex items-center gap-2">
                              <typeBadge.icon className="h-4 w-4" />
                              <Badge variant={typeBadge.variant}>
                                {driver.driver_kind}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Wallet Balance</span>
                              <span className="font-medium">{(walletBalances[driver.id] || 0).toLocaleString()} RWF</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Completed Trips</span>
                              <span className="font-medium">{completedTrips}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Rating</span>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="font-medium">4.5</span>
                              </div>
                            </div>
                          </div>

                          <Separator className="my-3" />

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Joined {new Date(driver.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedDriver(driver)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                </DialogTrigger>
                                <DriverDetailsDialog driver={selectedDriver} trips={driverTrips} walletBalance={walletBalances[driver.id] || 0} />
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Enhanced Pagination */}
              <div className="border-t px-6 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount.toLocaleString()} drivers
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </Button>
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
                        const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
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
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Driver Details Dialog Component
function DriverDetailsDialog({ driver, trips, walletBalance }: { driver: Driver | null; trips: any[]; walletBalance: number }) {
  if (!driver) return null;

  const statusBadge = driver.is_online 
    ? { variant: "default" as const, text: "Online", color: "text-green-600" }
    : { variant: "secondary" as const, text: "Offline", color: "text-gray-600" };

  const completedTrips = trips.filter(t => t.status === 'completed').length;
  const pendingTrips = trips.filter(t => t.status === 'pending').length;

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Driver Profile
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-2xl font-bold">
                {driver.vehicle_plate?.slice(0, 2).toUpperCase() || 'DR'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-2xl font-bold">{driver.vehicle_plate || 'Unknown Vehicle'}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusBadge.variant}>
                  {statusBadge.text}
                </Badge>
                <Badge variant="outline">
                  {driver.driver_kind}
                </Badge>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{driver.momo_code}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Joined {new Date(driver.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span>Subscription: {driver.subscription_status}</span>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Quick Actions</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact
              </Button>
              <Button variant="outline" size="sm">
                <Navigation className="h-4 w-4 mr-2" />
                Track
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-3">Performance Metrics</h4>
            <div className="grid gap-3">
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Wallet Balance:</span>
                <span className="font-bold">{walletBalance.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Completed Trips:</span>
                <span className="font-bold">{completedTrips}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Pending Trips:</span>
                <span className="font-bold">{pendingTrips}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Rating:</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold">4.5</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-3">Recent Activity</h4>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Completed trip to Kigali</span>
                  <span className="text-muted-foreground ml-auto">2 hours ago</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span>Started new trip</span>
                  <span className="text-muted-foreground ml-auto">4 hours ago</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                  <span>Went online</span>
                  <span className="text-muted-foreground ml-auto">6 hours ago</span>
                </div>
              </div>
            </ScrollArea>
          </div>

          <div className="flex gap-2 pt-4">
            <Button className="flex-1">
              <Edit className="h-4 w-4 mr-2" />
              Edit Driver
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}