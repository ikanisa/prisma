import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, TrendingUp, Star, Phone } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Passenger {
  id: string;
  full_name: string;
  whatsapp_number: string;
  preferred_lang: string;
  total_rides: number;
  avg_rating_given: number;
  created_at: string;
}

interface PassengerDetails extends Passenger {
  ride_history: Array<{
    id: string;
    created_at: string;
    fare_amount: number;
    status: string;
    driver_name: string;
  }>;
  ratings_given: Array<{
    id: string;
    stars: number;
    feedback: string;
    created_at: string;
    driver_name: string;
  }>;
  promos: Array<{
    id: string;
    promo_code: string;
    redeemed: boolean;
    expires_at: string;
  }>;
}

export default function Passengers() {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPassenger, setSelectedPassenger] = useState<PassengerDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { toast } = useToast();

  const [stats, setStats] = useState({
    totalPassengers: 0,
    activeThisMonth: 0,
    avgRatingGiven: 0,
    totalRides: 0
  });

  useEffect(() => {
    fetchPassengers();
    fetchStats();

    // Realtime subscription for live updates
    const channel = supabase
      .channel('passenger-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'passengers'
        },
        () => {
          // Refetch data when passengers table changes
          fetchPassengers();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPassengers = async () => {
    try {
      const { data, error } = await supabase
        .from('passengers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPassengers(data || []);
    } catch (error) {
      console.error('Error fetching passengers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch passengers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Total passengers
      const { count: totalPassengers } = await supabase
        .from('passengers')
        .select('*', { count: 'exact', head: true });

      // Active this month
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: activeThisMonth } = await supabase
        .from('passengers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo);

      // Average rating given
      const { data: avgData } = await supabase
        .from('passengers')
        .select('avg_rating_given')
        .not('avg_rating_given', 'is', null);

      const avgRatingGiven = avgData?.length ? 
        avgData.reduce((sum, p) => sum + p.avg_rating_given, 0) / avgData.length : 0;

      // Total rides
      const { data: ridesData } = await supabase
        .from('passengers')
        .select('total_rides');

      const totalRides = ridesData?.reduce((sum, p) => sum + (p.total_rides || 0), 0) || 0;

      setStats({
        totalPassengers: totalPassengers || 0,
        activeThisMonth: activeThisMonth || 0,
        avgRatingGiven: Math.round(avgRatingGiven * 10) / 10,
        totalRides
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPassengerDetails = async (passengerId: string) => {
    setDetailsLoading(true);
    try {
      // Get passenger basic info
      const { data: passenger, error: passengerError } = await supabase
        .from('passengers')
        .select('*')
        .eq('id', passengerId)
        .single();

      if (passengerError) throw passengerError;

      // Get ride history
      const { data: rideHistory, error: ridesError } = await supabase
        .from('trips')
        .select(`
          id,
          created_at,
          fare_amount,
          status,
          drivers(full_name)
        `)
        .eq('passenger_id', passengerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ridesError) throw ridesError;

      // Get ratings given
      const { data: ratingsGiven, error: ratingsError } = await supabase
        .from('trip_ratings')
        .select(`
          id,
          stars,
          feedback,
          created_at,
          drivers(full_name)
        `)
        .eq('passenger_id', passengerId)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;

      // Get promos
      const { data: promos, error: promosError } = await supabase
        .from('passenger_promos')
        .select('*')
        .eq('passenger_id', passengerId)
        .order('created_at', { ascending: false });

      if (promosError) throw promosError;

      setSelectedPassenger({
        ...passenger,
        ride_history: rideHistory?.map(ride => ({
          id: ride.id,
          created_at: ride.created_at,
          fare_amount: ride.fare_amount || 0,
          status: ride.status,
          driver_name: ride.drivers?.full_name || 'Unknown'
        })) || [],
        ratings_given: ratingsGiven?.map(rating => ({
          id: rating.id,
          stars: rating.stars,
          feedback: rating.feedback || '',
          created_at: rating.created_at,
          driver_name: rating.drivers?.full_name || 'Unknown'
        })) || [],
        promos: promos || []
      });
    } catch (error) {
      console.error('Error fetching passenger details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch passenger details",
        variant: "destructive",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredPassengers = passengers.filter(passenger =>
    passenger.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    passenger.whatsapp_number?.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading passengers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Passengers</h1>
          <p className="text-muted-foreground">Manage passenger accounts and ride history</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Passengers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPassengers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeThisMonth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating Given</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRatingGiven}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRides}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Passenger List</CardTitle>
          <CardDescription>Search and manage passenger accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Total Rides</TableHead>
                <TableHead>Avg Rating</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPassengers.map((passenger) => (
                <TableRow key={passenger.id}>
                  <TableCell className="font-medium">
                    {passenger.full_name || 'Unknown'}
                  </TableCell>
                  <TableCell>{passenger.whatsapp_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {passenger.preferred_lang?.toUpperCase() || 'EN'}
                    </Badge>
                  </TableCell>
                  <TableCell>{passenger.total_rides}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      {passenger.avg_rating_given?.toFixed(1) || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(passenger.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => fetchPassengerDetails(passenger.id)}
                        >
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Passenger Details</DialogTitle>
                          <DialogDescription>
                            Complete passenger information and activity
                          </DialogDescription>
                        </DialogHeader>
                        
                        {detailsLoading ? (
                          <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        ) : selectedPassenger && (
                          <Tabs defaultValue="profile" className="w-full">
                            <TabsList>
                              <TabsTrigger value="profile">Profile</TabsTrigger>
                              <TabsTrigger value="rides">Ride History</TabsTrigger>
                              <TabsTrigger value="ratings">Ratings Given</TabsTrigger>
                              <TabsTrigger value="promos">Promos</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="profile" className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Name</label>
                                  <p className="text-sm text-muted-foreground">
                                    {selectedPassenger.full_name || 'Not provided'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">WhatsApp</label>
                                  <p className="text-sm text-muted-foreground">
                                    {selectedPassenger.whatsapp_number}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Language</label>
                                  <p className="text-sm text-muted-foreground">
                                    {selectedPassenger.preferred_lang?.toUpperCase() || 'EN'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Total Rides</label>
                                  <p className="text-sm text-muted-foreground">
                                    {selectedPassenger.total_rides}
                                  </p>
                                </div>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="rides">
                              <div className="space-y-4">
                                {selectedPassenger.ride_history.length === 0 ? (
                                  <p className="text-muted-foreground">No rides found</p>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Driver</TableHead>
                                        <TableHead>Fare</TableHead>
                                        <TableHead>Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedPassenger.ride_history.map((ride) => (
                                        <TableRow key={ride.id}>
                                          <TableCell>
                                            {new Date(ride.created_at).toLocaleDateString()}
                                          </TableCell>
                                          <TableCell>{ride.driver_name}</TableCell>
                                          <TableCell>{ride.fare_amount} RWF</TableCell>
                                          <TableCell>
                                            <Badge variant="outline">{ride.status}</Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="ratings">
                              <div className="space-y-4">
                                {selectedPassenger.ratings_given.length === 0 ? (
                                  <p className="text-muted-foreground">No ratings given</p>
                                ) : (
                                  selectedPassenger.ratings_given.map((rating) => (
                                    <Card key={rating.id}>
                                      <CardContent className="pt-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center">
                                            <Star className="h-4 w-4 text-yellow-400 mr-1" />
                                            <span className="font-medium">{rating.stars} stars</span>
                                          </div>
                                          <span className="text-sm text-muted-foreground">
                                            {new Date(rating.created_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-1">
                                          Driver: {rating.driver_name}
                                        </p>
                                        {rating.feedback && (
                                          <p className="text-sm">{rating.feedback}</p>
                                        )}
                                      </CardContent>
                                    </Card>
                                  ))
                                )}
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="promos">
                              <div className="space-y-4">
                                {selectedPassenger.promos.length === 0 ? (
                                  <p className="text-muted-foreground">No promos available</p>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Expires</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedPassenger.promos.map((promo) => (
                                        <TableRow key={promo.id}>
                                          <TableCell className="font-mono">
                                            {promo.promo_code}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={promo.redeemed ? "default" : "secondary"}>
                                              {promo.redeemed ? "Redeemed" : "Active"}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            {new Date(promo.expires_at).toLocaleDateString()}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                        )}
                      </DialogContent>
                    </Dialog>
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