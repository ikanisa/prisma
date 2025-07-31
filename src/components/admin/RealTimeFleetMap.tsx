import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin, Car, Users } from 'lucide-react';
import { toast } from 'sonner';

interface DriverSession {
  id: string;
  driver_id: string;
  status: string;
  last_location: any;
  created_at: string;
}

interface DriverTrip {
  id: string;
  status: string;
  origin: any;
  destination: any;
  driver_id: string;
  driver_phone: string;
  from_text: string;
  to_text: string;
  price_rwf: number;
  seats: number;
  created_at: string;
}

export function RealTimeFleetMap() {
  const [driverSessions, setDriverSessions] = useState<DriverSession[]>([]);
  const [activeTrips, setActiveTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    onlineDrivers: 0,
    activeTrips: 0,
    availableDrivers: 0
  });

  const fetchFleetData = async () => {
    try {
      // Fetch online driver sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('driver_sessions')
        .select('*')
        .eq('status', 'online');

      if (sessionsError) throw sessionsError;

      // Fetch active driver trips
      const { data: tripsData, error: tripsError } = await supabase
        .from('driver_trips_spatial')
        .select('*')
        .in('status', ['open', 'assigned']);

      if (tripsError) throw tripsError;

      setDriverSessions(sessionsData || []);
      setActiveTrips(tripsData || []);

      // Calculate stats
      const onlineCount = sessionsData?.length || 0;
      const activeTripsCount = tripsData?.filter(t => t.status === 'assigned').length || 0;
      const availableCount = sessionsData?.filter(s => 
        !tripsData?.some(t => t.driver_id === s.driver_id && t.status === 'assigned')
      ).length || 0;

      setStats({
        onlineDrivers: onlineCount,
        activeTrips: activeTripsCount,
        availableDrivers: availableCount
      });

    } catch (error) {
      console.error('Error fetching fleet data:', error);
      toast.error('Failed to load fleet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleetData();

    // Set up real-time subscriptions
    const driversSubscription = supabase
      .channel('fleet-drivers')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'drivers' },
        () => fetchFleetData()
      )
      .subscribe();

    const tripsSubscription = supabase
      .channel('fleet-trips')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'trips' },
        () => fetchFleetData()
      )
      .subscribe();

    return () => {
      driversSubscription.unsubscribe();
      tripsSubscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fleet Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Drivers</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onlineDrivers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.availableDrivers} available
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTrips}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fleet</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverSessions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Live Fleet Status */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Live Fleet Status</CardTitle>
          <Button onClick={fetchFleetData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {driverSessions.map((session) => {
              const activeTrip = activeTrips.find(t => 
                t.driver_id === session.driver_id && t.status === 'assigned'
              );
              
              return (
                <div key={session.id} className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-1">
                    <p className="font-medium">Driver {session.driver_id.substring(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      Session: {session.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={activeTrip ? 'default' : 'secondary'}>
                      {activeTrip ? 'On Trip' : 'Available'}
                    </Badge>
                    <Badge variant="outline">
                      {session.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
            
            {driverSessions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No drivers online
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Trips */}
      <Card>
        <CardHeader>
          <CardTitle>Active Trips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeTrips.filter(t => t.status === 'assigned').map((trip) => {
              const driverSession = driverSessions.find(d => d.driver_id === trip.driver_id);
              
              return (
                <div key={trip.id} className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-1">
                    <p className="font-medium">Trip {trip.id.substring(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      Driver: {trip.driver_phone || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">
                      {trip.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(trip.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {activeTrips.filter(t => t.status === 'in_progress').length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No active trips
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}