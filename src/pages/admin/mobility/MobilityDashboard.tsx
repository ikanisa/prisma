import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminQuery } from "@/hooks/useSecureQuery";
import { Car, Users, Route, MapPin } from "lucide-react";

export default function MobilityDashboard() {
  const { data: trips, isLoading: loadingTrips } = useAdminQuery({
    table: 'driver_trips_spatial',
    queryKey: ['admin', 'trips']
  });

  const { data: drivers, isLoading: loadingDrivers } = useAdminQuery({
    table: 'drivers',
    queryKey: ['admin', 'drivers']
  });

  const { data: bookings, isLoading: loadingBookings } = useAdminQuery({
    table: 'bookings_spatial',
    queryKey: ['admin', 'bookings']
  });

  const { data: intents, isLoading: loadingIntents } = useAdminQuery({
    table: 'passenger_intents_spatial',
    queryKey: ['admin', 'passenger_intents']
  });

  const statsCards = [
    {
      title: "Active Drivers",
      value: drivers?.data?.filter((d: any) => d.is_online).length || 0,
      icon: Car,
      change: "+3%",
      changeType: "positive" as const
    },
    {
      title: "Today's Trips",
      value: trips?.data?.filter((t: any) => 
        new Date(t.created_at).toDateString() === new Date().toDateString()
      ).length || 0,
      icon: Route,
      change: "+12%",
      changeType: "positive" as const
    },
    {
      title: "Active Bookings",
      value: bookings?.data?.filter((b: any) => b.status === 'pending').length || 0,
      icon: Users,
      change: "+8%",
      changeType: "positive" as const
    },
    {
      title: "Passenger Intents",
      value: intents?.data?.filter((i: any) => i.status === 'pending').length || 0,
      icon: MapPin,
      change: "+15%",
      changeType: "positive" as const
    }
  ];

  const renderSimpleTable = (data: any[], title: string, isLoading: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
          </TableRow>
        ) : data?.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8">No {title.toLowerCase()} found</TableCell>
          </TableRow>
        ) : (
          data?.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm">{item.id.slice(0, 8)}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{item.phone_number || item.pickup_location || item.driver_id?.slice(0, 8) || 'N/A'}</div>
                  {item.destination_location && <div className="text-sm text-muted-foreground">→ {item.destination_location}</div>}
                  {item.vehicle_model && <div className="text-sm text-muted-foreground">{item.vehicle_model}</div>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={item.status === 'active' || item.status === 'pending' || item.is_online ? 'default' : 'secondary'}>
                  {item.status || (item.is_online ? 'Online' : 'Offline')}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{new Date(item.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mobility Dashboard</h1>
          <p className="text-muted-foreground">
            Manage drivers, trips, and passenger bookings
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}>
                  {stat.change}
                </span>
                {" "}from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Tables */}
      <Tabs defaultValue="trips" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trips">Active Trips</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="intents">Passenger Intents</TabsTrigger>
        </TabsList>

        <TabsContent value="trips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Driver Trips</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(trips?.data || [], 'trips', loadingTrips)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Driver Management</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(drivers?.data || [], 'drivers', loadingDrivers)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trip Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(bookings?.data || [], 'bookings', loadingBookings)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Passenger Intents</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(intents?.data || [], 'intents', loadingIntents)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}