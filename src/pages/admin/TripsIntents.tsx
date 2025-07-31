import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, User, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DynamicUserJourneyManager } from "@/components/admin/DynamicUserJourneyManager";

export default function TripsIntents() {
  const [trips, setTrips] = useState<any[]>([]);
  const [intents, setIntents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tripsResult, intentsResult] = await Promise.all([
        supabase.from('driver_trips_spatial').select('*').limit(50),
        supabase.from('passenger_intents_spatial').select('*').limit(50)
      ]);

      setTrips(tripsResult.data || []);
      setIntents(intentsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Trips & Intents</h1>
        <Button>Create New Trip</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Car className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Active Trips</p>
                <p className="text-2xl font-bold">{trips.filter(t => t.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Pending Intents</p>
                <p className="text-2xl font-bold">{intents.filter(i => i.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold">
                  {trips.filter(t => t.status === 'completed' && 
                    new Date(t.created_at).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Total Distance</p>
                <p className="text-2xl font-bold">1,247 km</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trips" className="w-full">
        <TabsList>
          <TabsTrigger value="trips">Driver Trips</TabsTrigger>
          <TabsTrigger value="intents">Passenger Intents</TabsTrigger>
          <TabsTrigger value="journeys">User Journeys</TabsTrigger>
        </TabsList>

        <TabsContent value="trips">
          <Card>
            <CardHeader>
              <CardTitle>Driver Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trips.map((trip) => (
                  <div key={trip.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(trip.status)}>
                            {trip.status}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {new Date(trip.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>{trip.start_location} → {trip.end_location}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Seats: {trip.available_seats}</span>
                          <span>Price: {trip.price_per_seat} RWF</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intents">
          <Card>
            <CardHeader>
              <CardTitle>Passenger Intents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {intents.map((intent) => (
                  <div key={intent.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(intent.status)}>
                            {intent.status}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {new Date(intent.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>{intent.pickup_location} → {intent.destination}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Phone: {intent.passenger_phone}</span>
                          <span>Max Price: {intent.max_price} RWF</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Match Trip
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journeys">
          <DynamicUserJourneyManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}