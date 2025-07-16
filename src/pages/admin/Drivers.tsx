import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, RefreshCw, MapPin, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Driver {
  id: string;
  driver_kind: 'moto' | 'cab' | 'truck';
  vehicle_plate: string;
  momo_code: string;
  is_online: boolean;
  subscription_status: string;
  created_at: string;
  user_id: string;
}

interface DriverWallet {
  balance: number;
}

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [walletBalances, setWalletBalances] = useState<{[key: string]: number}>({});
  const { toast } = useToast();

  const itemsPerPage = 50;

  useEffect(() => {
    loadDrivers();
  }, [currentPage, searchTerm]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('drivers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (searchTerm) {
        query = query.or(`vehicle_plate.ilike.%${searchTerm}%,momo_code.ilike.%${searchTerm}%`);
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

  const getDriverTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'moto': return 'bg-green-100 text-green-800';
      case 'cab': return 'bg-blue-100 text-blue-800';
      case 'truck': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Drivers Management</h1>
        <div className="flex gap-2">
          <Button onClick={loadDrivers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Driver
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Drivers</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drivers.filter(d => d.is_online).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Badge className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drivers.filter(d => d.subscription_status === 'active').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drivers ({totalCount.toLocaleString()})</CardTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by vehicle plate or MoMo code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading drivers...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>MoMo Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Wallet Balance</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.vehicle_plate || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getDriverTypeBadgeColor(driver.driver_kind)}>
                          {driver.driver_kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{driver.momo_code}</TableCell>
                      <TableCell>
                        <Badge variant={driver.is_online ? 'default' : 'secondary'}>
                          {driver.is_online ? 'Online' : 'Offline'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {(walletBalances[driver.id] || 0).toLocaleString()} RWF
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={driver.subscription_status === 'active' ? 'default' : 'secondary'}>
                          {driver.subscription_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(driver.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} drivers
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}