import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUnifiedListings } from "@/hooks/useUnifiedListings";
import { Home, Car, Building, DollarSign } from "lucide-react";

export default function ListingsDashboard() {
  const { data: propertyListings, isLoading: loadingProperties } = useUnifiedListings('property');
  const { data: vehicleListings, isLoading: loadingVehicles } = useUnifiedListings('vehicle');
  const { data: serviceListings, isLoading: loadingServices } = useUnifiedListings('service');

  const allListings = [
    ...(propertyListings || []),
    ...(vehicleListings || []),
    ...(serviceListings || [])
  ];

  const statsCards = [
    {
      title: "Property Listings",
      value: propertyListings?.filter(l => l.status === 'active').length || 0,
      icon: Home,
      change: "+8%",
      changeType: "positive" as const
    },
    {
      title: "Vehicle Listings",
      value: vehicleListings?.filter(l => l.status === 'active').length || 0,
      icon: Car,
      change: "+12%",
      changeType: "positive" as const
    },
    {
      title: "Service Listings",
      value: serviceListings?.filter(l => l.status === 'active').length || 0,
      icon: Building,
      change: "+5%",
      changeType: "positive" as const
    },
    {
      title: "Avg. Price (RWF)",
      value: Math.round(allListings.reduce((sum, l) => sum + (l.price || 0), 0) / allListings.length || 0).toLocaleString(),
      icon: DollarSign,
      change: "+3%",
      changeType: "positive" as const
    }
  ];

  const renderSimpleTable = (data: any[], title: string, isLoading: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
          </TableRow>
        ) : data?.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8">No {title.toLowerCase()} found</TableCell>
          </TableRow>
        ) : (
          data?.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm">{item.id.slice(0, 8)}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{item.title || 'N/A'}</div>
                  {item.metadata?.property_type && <div className="text-sm text-muted-foreground">{item.metadata.property_type}</div>}
                  {item.metadata?.make && <div className="text-sm text-muted-foreground">{item.metadata.make} {item.metadata.model}</div>}
                </div>
              </TableCell>
              <TableCell>{item.price ? `${item.price.toLocaleString()} RWF` : 'N/A'}</TableCell>
              <TableCell>
                <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                  {item.status}
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
          <h1 className="text-3xl font-bold">Listings Dashboard</h1>
          <p className="text-muted-foreground">
            Manage property, vehicle, and service listings
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
      <Tabs defaultValue="properties" className="space-y-4">
        <TabsList>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Property Listings</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(propertyListings || [], 'properties', loadingProperties)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Listings</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(vehicleListings || [], 'vehicles', loadingVehicles)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Listings</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(serviceListings || [], 'services', loadingServices)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}