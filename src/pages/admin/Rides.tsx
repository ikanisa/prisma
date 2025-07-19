import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users, DollarSign, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RideRequest {
  id: string;
  passenger: {
    full_name: string;
    whatsapp_number: string;
  } | null;
  driver?: {
    full_name: string;
    plate_number: string;
  };
  origin_address: string;
  destination_address: string;
  fare_estimate: number;
  status: string;
  created_at: string;
  matched_at?: string;
  trip_id?: string;
  type: 'request';
}

interface Trip {
  id: string;
  passenger: {
    full_name: string;
    whatsapp_number: string;
  } | null;
  driver: {
    full_name: string;
    plate_number: string;
  } | null;
  pickup_location: string;
  dropoff_location: string;
  fare_amount: number;
  status: string;
  passenger_paid: boolean;
  created_at: string;
  completed_at?: string;
  type: 'trip';
}

export default function Rides() {
  const [rides, setRides] = useState<(RideRequest | Trip)[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();

  const [stats, setStats] = useState({
    totalRides: 0,
    pendingRides: 0,
    completedToday: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchRides();
    fetchStats();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('rides-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, () => {
        fetchRides();
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        fetchRides();
        fetchStats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchRides = async () => {
    try {
      // Fetch ride requests
      const { data: rideRequests, error: requestsError } = await supabase
        .from('ride_requests')
        .select(`
          id,
          passengers(full_name, whatsapp_number),
          origin_address,
          destination_address,
          fare_estimate,
          status,
          created_at,
          matched_at
        `)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch active trips
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select(`
          id,
          passengers(full_name, whatsapp_number),
          drivers(full_name, plate_number),
          pickup_location,
          dropoff_location,
          fare_amount,
          status,
          passenger_paid,
          created_at,
          completed_at
        `)
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      // Combine and sort by created_at
      const rideRequestsTyped: RideRequest[] = rideRequests?.map(req => ({
        id: req.id,
        passenger: req.passengers,
        origin_address: req.origin_address || 'Unknown',
        destination_address: req.destination_address || 'Unknown',
        fare_estimate: req.fare_estimate || 0,
        status: req.status,
        created_at: req.created_at,
        matched_at: req.matched_at,
        type: 'request' as const
      })) || [];

      const tripsTyped: Trip[] = trips?.map(trip => ({
        id: trip.id,
        passenger: trip.passengers,
        driver: trip.drivers,
        pickup_location: trip.pickup_location || 'Unknown',
        dropoff_location: trip.dropoff_location || 'Unknown',
        fare_amount: trip.fare_amount || 0,
        status: trip.status,
        passenger_paid: trip.passenger_paid,
        created_at: trip.created_at,
        completed_at: trip.completed_at,
        type: 'trip' as const
      })) || [];

      const allRides = [...rideRequestsTyped, ...tripsTyped]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRides(allRides);
    } catch (error) {
      console.error('Error fetching rides:', error);
      toast({
        title: "Error",
        description: "Failed to fetch rides",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Total ride requests and trips
      const { count: requestsCount } = await supabase
        .from('ride_requests')
        .select('*', { count: 'exact', head: true });

      const { count: tripsCount } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true });

      // Pending rides
      const { count: pendingCount } = await supabase
        .from('ride_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Completed today
      const today = new Date().toISOString().split('T')[0];
      const { count: completedToday } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', today);

      // Total revenue
      const { data: revenueData } = await supabase
        .from('trips')
        .select('fare_amount')
        .eq('passenger_paid', true);

      const totalRevenue = revenueData?.reduce((sum, trip) => sum + (trip.fare_amount || 0), 0) || 0;

      setStats({
        totalRides: (requestsCount || 0) + (tripsCount || 0),
        pendingRides: pendingCount || 0,
        completedToday: completedToday || 0,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRideAction = async (rideId: string, action: string) => {
    try {
      let result;
      
      switch (action) {
        case 'cancel':
          result = await supabase
            .from('ride_requests')
            .update({ status: 'cancelled' })
            .eq('id', rideId);
          break;
        case 'reassign':
          // Call assign-driver function
          result = await supabase.functions.invoke('assign-driver', {
            body: { ride_request_id: rideId }
          });
          break;
        case 'force_pay':
          result = await supabase
            .from('trips')
            .update({ passenger_paid: true })
            .eq('id', rideId);
          break;
        default:
          throw new Error('Unknown action');
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Ride ${action} completed successfully`,
      });
      
      fetchRides();
      fetchStats();
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} ride`,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, type: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      matched: "bg-blue-100 text-blue-800",
      'driver-assigned': "bg-purple-100 text-purple-800",
      'en-route': "bg-orange-100 text-orange-800",
      'picked-up': "bg-indigo-100 text-indigo-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
        {status.replace('-', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getTimeSinceCreated = (created_at: string) => {
    const now = new Date();
    const created = new Date(created_at);
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const filteredRides = rides.filter(ride => {
    if (filterStatus === 'all') return true;
    return ride.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading rides...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rides Monitor</h1>
          <p className="text-muted-foreground">Real-time ride requests and trip monitoring</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRides}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rides</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingRides}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} RWF</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'pending', 'matched', 'en-route', 'completed', 'cancelled'].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(status)}
          >
            {status === 'all' ? 'All' : status.replace('-', ' ').toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Rides Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Rides</CardTitle>
          <CardDescription>Monitor ride requests and ongoing trips</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Passenger</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Fare</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRides.map((ride) => (
                <TableRow key={ride.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {ride.passenger?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ride.passenger?.whatsapp_number}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {'driver' in ride && ride.driver ? (
                      <div>
                        <div className="font-medium">{ride.driver.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {ride.driver.plate_number}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline">No Driver</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="text-sm">
                        <strong>From:</strong> {'origin_address' in ride ? ride.origin_address : ride.pickup_location}
                      </div>
                      <div className="text-sm">
                        <strong>To:</strong> {'destination_address' in ride ? ride.destination_address : ride.dropoff_location}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {'fare_estimate' in ride ? (
                      <span>{ride.fare_estimate} RWF</span>
                    ) : (
                      <div>
                        <span>{ride.fare_amount} RWF</span>
                        {ride.passenger_paid && (
                          <div className="text-xs text-green-600">Paid ✓</div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(ride.status, ride.type)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {getTimeSinceCreated(ride.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {ride.status === 'pending' && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => handleRideAction(ride.id, 'reassign')}
                            >
                              Reassign Driver
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRideAction(ride.id, 'cancel')}
                              className="text-red-600"
                            >
                              Cancel Ride
                            </DropdownMenuItem>
                          </>
                        )}
                        {'passenger_paid' in ride && !ride.passenger_paid && ride.id && (
                          <DropdownMenuItem 
                            onClick={() => handleRideAction(ride.id, 'force_pay')}
                          >
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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