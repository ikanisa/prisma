import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin, Car, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Driver {
  id: string;
  full_name: string;
  is_online: boolean;
  phone_number: string;
  current_location?: any;
}

interface Trip {
  id: string;
  status: string;
  pickup_location: any;
  dropoff_location: any;
  driver_id: string;
  created_at: string;
}

export function RealTimeFleetMap() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    onlineDrivers: 0,
    activeTrips: 0,
    availableDrivers: 0
  });

  const fetchFleetData = async () => {
    try {
      // Fetch online drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('id, full_name, is_online, phone_number, current_location')
        .eq('is_online', true);

      if (driversError) throw driversError;

      // Fetch active trips
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('id, status, pickup_location, dropoff_location, driver_id, created_at')
        .in('status', ['pending', 'confirmed', 'in_progress']);

      if (tripsError) throw tripsError;

      setDrivers(driversData || []);
      setActiveTrips(tripsData || []);

      // Calculate stats
      const onlineCount = driversData?.length || 0;
      const activeTripsCount = tripsData?.filter(t => t.status === 'in_progress').length || 0;
      const availableCount = driversData?.filter(d => 
        !tripsData?.some(t => t.driver_id === d.id && t.status === 'in_progress')
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
            <div className="text-2xl font-bold">{drivers.length}</div>
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
            {drivers.map((driver) => {
              const activeTrip = activeTrips.find(t => 
                t.driver_id === driver.id && t.status === 'in_progress'
              );
              
              return (
                <div key={driver.id} className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-1">
                    <p className="font-medium">{driver.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {driver.phone_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={activeTrip ? 'default' : 'secondary'}>
                      {activeTrip ? 'On Trip' : 'Available'}
                    </Badge>
                    <Badge variant="outline">
                      Online
                    </Badge>
                  </div>
                </div>
              );
            })}
            
            {drivers.length === 0 && (
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
            {activeTrips.filter(t => t.status === 'in_progress').map((trip) => {
              const driver = drivers.find(d => d.id === trip.driver_id);
              
              return (
                <div key={trip.id} className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-1">
                    <p className="font-medium">Trip {trip.id.substring(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      Driver: {driver?.full_name || 'Unknown'}
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