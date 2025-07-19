import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  RefreshCw, 
  Download, 
  Filter, 
  Users as UsersIcon, 
  UserPlus, 
  TrendingUp, 
  Phone, 
  Banknote, 
  Gift,
  Calendar,
  MapPin,
  Star,
  Grid3X3,
  List,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface User {
  id: string;
  phone: string;
  momo_code: string | null;
  credits: number;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
}

interface UserStats {
  totalUsers: number;
  newUsersToday: number;
  totalCredits: number;
  totalReferrals: number;
  avgCreditsPerUser: number;
  lowCreditUsers: number;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [creditFilter, setCreditFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [stats, setStats] = useState<UserStats | null>(null);
  const { toast } = useToast();

  const itemsPerPage = 50;

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [currentPage, searchTerm, creditFilter, dateFilter]);

  const loadStats = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('users')
        .select('credits, created_at, referred_by');

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newUsersToday = usersData?.filter(u => 
        new Date(u.created_at) >= today
      ).length || 0;

      const totalCredits = usersData?.reduce((sum, u) => sum + u.credits, 0) || 0;
      const totalReferrals = usersData?.filter(u => u.referred_by).length || 0;
      const lowCreditUsers = usersData?.filter(u => u.credits < 10).length || 0;

      setStats({
        totalUsers: usersData?.length || 0,
        newUsersToday,
        totalCredits,
        totalReferrals,
        avgCreditsPerUser: usersData?.length ? Math.round(totalCredits / usersData.length) : 0,
        lowCreditUsers
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      // Apply filters
      if (searchTerm) {
        query = query.or(`phone.ilike.%${searchTerm}%,referral_code.ilike.%${searchTerm}%,momo_code.ilike.%${searchTerm}%`);
      }

      if (creditFilter !== "all") {
        if (creditFilter === "low") {
          query = query.lt('credits', 10);
        } else if (creditFilter === "medium") {
          query = query.gte('credits', 10).lte('credits', 50);
        } else if (creditFilter === "high") {
          query = query.gt('credits', 50);
        }
      }

      if (dateFilter !== "all") {
        const now = new Date();
        if (dateFilter === "today") {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          query = query.gte('created_at', today.toISOString());
        } else if (dateFilter === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          query = query.gte('created_at', weekAgo.toISOString());
        } else if (dateFilter === "month") {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          query = query.gte('created_at', monthAgo.toISOString());
        }
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Phone', 'MoMo Code', 'Credits', 'Referral Code', 'Referred By', 'Joined'];
    const csvContent = [
      headers.join(','),
      ...users.map(user => [
        user.phone,
        user.momo_code || '',
        user.credits,
        user.referral_code,
        user.referred_by || '',
        new Date(user.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCreditBadgeVariant = (credits: number) => {
    if (credits >= 50) return "default";
    if (credits >= 10) return "secondary";
    return "destructive";
  };

  const getUserInitials = (phone: string) => {
    return phone.slice(-2).toUpperCase();
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor your user base
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={loadUsers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <AddUserDialog onUserAdded={loadUsers} />
        </div>
      </div>

      {/* Analytics Dashboard */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.newUsersToday} today
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Today</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.newUsersToday}</div>
              <p className="text-xs text-muted-foreground">
                New registrations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCredits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {stats.avgCreditsPerUser} per user
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Referrals</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReferrals}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.totalReferrals / stats.totalUsers) * 100).toFixed(1)}% of users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Credits</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.lowCreditUsers}</div>
              <p className="text-xs text-muted-foreground">
                Users with &lt;10 credits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12%</div>
              <p className="text-xs text-muted-foreground">
                vs last month
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Users ({totalCount.toLocaleString()})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone, MoMo, or referral code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <Select value={creditFilter} onValueChange={setCreditFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Credits" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Credits</SelectItem>
                <SelectItem value="low">Low (&lt;10)</SelectItem>
                <SelectItem value="medium">Medium (10-50)</SelectItem>
                <SelectItem value="high">High (&gt;50)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>Loading users...</span>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="detailed">Detailed View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                {viewMode === "table" ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Referral</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getUserInitials(user.phone)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.phone}</div>
                              <div className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{user.phone}</span>
                            </div>
                            {user.momo_code && (
                              <div className="flex items-center gap-2 mt-1">
                                <Banknote className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{user.momo_code}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getCreditBadgeVariant(user.credits)}>
                              {user.credits} credits
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                {user.referral_code}
                              </div>
                              {user.referred_by && (
                                <div className="text-xs text-muted-foreground">
                                  Referred by: {user.referred_by}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{new Date(user.created_at).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(user.created_at).toLocaleTimeString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {users.map((user) => (
                      <Card key={user.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getUserInitials(user.phone)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.phone}</div>
                                <div className="text-xs text-muted-foreground">
                                  ID: {user.id.slice(0, 8)}
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Credits</span>
                            <Badge variant={getCreditBadgeVariant(user.credits)}>
                              {user.credits}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Referral Code</span>
                              <code className="bg-muted px-2 py-1 rounded text-xs">
                                {user.referral_code}
                              </code>
                            </div>
                            
                            {user.referred_by && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Referred By</span>
                                <span className="text-xs">{user.referred_by}</span>
                              </div>
                            )}

                            {user.momo_code && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">MoMo Code</span>
                                <span className="text-xs">{user.momo_code}</span>
                              </div>
                            )}
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Joined</span>
                            <span>{new Date(user.created_at).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="detailed" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone</TableHead>
                      <TableHead>MoMo Code</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Referral Code</TableHead>
                      <TableHead>Referred By</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.phone}</TableCell>
                        <TableCell>{user.momo_code || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getCreditBadgeVariant(user.credits)}>
                            {user.credits}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{user.referral_code}</TableCell>
                        <TableCell>{user.referred_by || '-'}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-sm">N/A</span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount.toLocaleString()} users
            </p>
            <div className="flex items-center gap-2">
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
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
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
        </CardContent>
      </Card>
    </div>
  );
}