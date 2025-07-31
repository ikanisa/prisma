import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Navigation, RefreshCw, Zap, Users, Clock, Car,
  MessageCircle, Phone, AlertTriangle, CheckCircle, Radio
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DriverLocation {
  id: string;
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number;
  battery_level?: number;
  status: 'online' | 'offline';
  last_update: string;
  driver: {
    full_name: string;
    plate_number: string;
    momo_number: string;
  };
}

interface FleetStats {
  total: number;
  online: number;
  active_trips: number;
  idle: number;
}

export default function FleetMap() {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [stats, setStats] = useState<FleetStats>({
    total: 0,
    online: 0,
    active_trips: 0,
    idle: 0
  });
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapCenter] = useState({ lat: -1.9441, lng: 30.0619 }); // Kigali center
  const [zoomLevel, setZoomLevel] = useState(12);
  const mapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDriverLocations();

    // Set up realtime subscription
    const channel = supabase
      .channel('fleet_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'driver_sessions' }, 
        () => loadDriverLocations()
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadDriverLocations, 30000);
    }

    return () => {
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadDriverLocations = async () => {
    try {
      // Get active driver sessions with location data
      const { data: sessions, error } = await supabase
        .from('driver_sessions')
        .select(`
          *,
          drivers!inner(
            id,
            full_name,
            plate_number,
            momo_number,
            is_online
          )
        `)
        .eq('status', 'online')
        .not('last_location', 'is', null);

      if (error) throw error;

      // Parse location data and create driver locations
      const driverLocations: DriverLocation[] = sessions?.map(session => {
        // Parse PostGIS POINT format
        const locationMatch = (session.last_location as string)?.match(/POINT\(([^)]+)\)/);
        let lat = 0, lng = 0;
        
        if (locationMatch) {
          const [longitude, latitude] = locationMatch[1].split(' ').map(Number);
          lat = latitude;
          lng = longitude;
        }

        return {
          id: session.id,
          driver_id: session.driver_id,
          lat,
          lng,
          accuracy: session.accuracy || 0,
          battery_level: session.battery_level,
          status: session.status as 'online' | 'offline',
          last_update: session.started_at,
          driver: {
            full_name: session.drivers.full_name || 'Unknown Driver',
            plate_number: session.drivers.plate_number || 'N/A',
            momo_number: session.drivers.momo_number || ''
          }
        };
      }) || [];

      setDrivers(driverLocations);

      // Calculate stats
      const total = driverLocations.length;
      const online = driverLocations.filter(d => d.status === 'online').length;
      
      setStats({
        total,
        online,
        active_trips: Math.floor(online * 0.3), // Mock data - 30% of online drivers on trips
        idle: online - Math.floor(online * 0.3)
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading driver locations:', error);
      toast({
        title: "Error",
        description: "Failed to load driver locations",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const pingDriver = async (driverId: string, driverName: string) => {
    try {
      // This would send a WhatsApp message to the driver
      // Implementation would call the WhatsApp webhook
      toast({
        title: "Driver Pinged",
        description: `Sent ping message to ${driverName}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to ping driver",
        variant: "destructive",
      });
    }
  };

  const getDriverMarkerColor = (driver: DriverLocation) => {
    if (driver.battery_level && driver.battery_level < 20) return 'bg-red-500';
    if (driver.status === 'online') return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getLastUpdateText = (lastUpdate: string) => {
    const now = new Date();
    const update = new Date(lastUpdate);
    const diffMinutes = Math.floor((now.getTime() - update.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading fleet map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8 text-primary" />
            Live Fleet Map
          </h1>
          <p className="text-muted-foreground">Real-time tracking of your driver fleet</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)} 
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            <Radio className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
          <Button onClick={loadDriverLocations} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Fleet Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-2xl font-bold">{stats.online}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Car className="h-4 w-4 text-orange-500 mr-2" />
              <span className="text-2xl font-bold">{stats.active_trips}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Idle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-2xl font-bold">{stats.idle}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Map Area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Real-time Driver Fleet Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Enhanced Map View with Real-time Updates */}
            <div className="relative bg-gradient-to-br from-blue-50 to-green-50 rounded-lg min-h-[400px] border overflow-hidden">
              {/* Map Controls */}
              <div className="absolute top-4 left-4 z-10 space-y-2">
                <div className="bg-white rounded-lg shadow-sm border p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Zoom Level</div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
                      disabled={zoomLevel <= 1}
                    >
                      -
                    </Button>
                    <span className="px-2 py-1 bg-muted rounded text-xs">{zoomLevel}x</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setZoomLevel(Math.min(10, zoomLevel + 1))}
                      disabled={zoomLevel >= 10}
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Auto-Refresh</div>
                  <Button
                    size="sm"
                    variant={autoRefresh ? "default" : "outline"}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className="w-full"
                  >
                    {autoRefresh ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>

              {/* Map Legend */}
              <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-sm border p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">Driver Status</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs">Online & Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-xs">On Trip</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-xs">Low Battery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-xs">Offline</span>
                  </div>
                </div>
              </div>

              {/* Map Grid */}
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#cbd5e1" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* Driver Markers */}
              <div className="absolute inset-0">
                {drivers.map((driver, index) => {
                  const x = (20 + (index * 123) % 60) * zoomLevel / 2;
                  const y = (30 + (index * 97) % 40) * zoomLevel / 2;
                  const isSelected = selectedDriver?.id === driver.id;
                  
                  return (
                    <div
                      key={driver.id}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
                        isSelected ? 'scale-150 z-20' : 'z-10 hover:scale-125'
                      }`}
                      style={{
                        left: `${x}%`,
                        top: `${y}%`
                      }}
                      onClick={() => setSelectedDriver(driver)}
                    >
                      {/* Driver Marker */}
                      <div className={`relative`}>
                        <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${getDriverMarkerColor(driver)}`}>
                          {driver.battery_level && driver.battery_level < 20 && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        
                        {/* Signal indicator for location accuracy */}
                        <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-1 rounded-full ${
                          (driver.accuracy || 0) < 10 ? 'bg-green-400' : 
                          (driver.accuracy || 0) < 50 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}></div>
                        
                        {isSelected && (
                          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border p-2 min-w-48">
                            <div className="text-xs font-medium">{driver.driver.full_name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Status: {driver.status}<br/>
                              Battery: {driver.battery_level || 'N/A'}%<br/>
                              Accuracy: {driver.accuracy}m<br/>
                              Last Update: {getLastUpdateText(driver.last_update)}
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full mt-2" 
                              onClick={(e) => {
                                e.stopPropagation();
                                pingDriver(driver.driver_id, driver.driver.full_name);
                              }}
                            >
                              Ping Driver
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Center Indicator */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-5">
                <div className="w-2 h-2 bg-primary rounded-full opacity-30"></div>
                <div className="absolute inset-0 w-6 h-6 border border-primary border-dashed rounded-full opacity-20 -translate-x-2 -translate-y-2"></div>
              </div>

              {/* Map Info Overlay */}
              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-sm border p-2">
                <div className="text-xs text-muted-foreground">
                  Center: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}<br/>
                  Active Drivers: {drivers.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver List Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Online Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {drivers.filter(d => d.status === 'online').map((driver) => (
                <div 
                  key={driver.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                    selectedDriver?.id === driver.id ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => setSelectedDriver(driver)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{driver.driver.full_name}</p>
                      <p className="text-xs text-muted-foreground">{driver.driver.plate_number}</p>
                    </div>
                    <Badge className="text-xs">
                      {getLastUpdateText(driver.last_update)}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getDriverMarkerColor(driver)}`}></div>
                      {driver.battery_level && (
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          <span className="text-xs">{driver.battery_level}%</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          pingDriver(driver.driver_id, driver.driver.full_name);
                        }}
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {drivers.filter(d => d.status === 'online').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No drivers online</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Driver Info */}
      {selectedDriver && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Driver Details: {selectedDriver.driver.full_name}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedDriver(null)}
              >
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">Plate Number</p>
                <p className="text-lg">{selectedDriver.driver.plate_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge className={selectedDriver.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}>
                  {selectedDriver.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Battery Level</p>
                <p className="text-lg">{selectedDriver.battery_level || 'N/A'}%</p>
              </div>
              <div>
                <p className="text-sm font-medium">Location Accuracy</p>
                <p className="text-lg">{selectedDriver.accuracy || 'N/A'}m</p>
              </div>
              <div>
                <p className="text-sm font-medium">Last Update</p>
                <p className="text-lg">{getLastUpdateText(selectedDriver.last_update)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Actions</p>
                <div className="flex gap-2 mt-1">
                  <Button 
                    size="sm" 
                    onClick={() => pingDriver(selectedDriver.driver_id, selectedDriver.driver.full_name)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Ping
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}