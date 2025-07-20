import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MapPin, 
  Phone, 
  Star, 
  Home, 
  Car, 
  Download, 
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

type LocationCategory = 'bar' | 'pharmacy' | 'hardware' | 'farmer';

export default function DataSyncPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Fetch canonical locations by category
  const getLocations = (category: LocationCategory) => useQuery({
    queryKey: ["canonical_locations", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canonical_locations")
        .select("*")
        .eq("category", category)
        .order("imported_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch property listings
  const properties = useQuery({
    queryKey: ["property_listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_listings")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch vehicle listings
  const vehicles = useQuery({
    queryKey: ["vehicle_listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_listings")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Google Places sync mutation
  const syncGooglePlaces = useMutation({
    mutationFn: async (category: LocationCategory) => {
      let pageToken: string | null = null;
      let totalInserted = 0;

      do {
        const { data, error } = await supabase.functions.invoke("google-places-sync", {
          body: { category, pagetoken: pageToken }
        });
        
        if (error) throw error;
        
        totalInserted += data.inserted;
        pageToken = data.next_page_token;
        
        // Add small delay between requests to respect API limits
        if (pageToken) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } while (pageToken);

      return totalInserted;
    },
    onSuccess: (totalInserted, category) => {
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${totalInserted} ${category} locations from Google Places`
      });
      queryClient.invalidateQueries({ queryKey: ["canonical_locations", category] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync from Google Places",
        variant: "destructive"
      });
    }
  });

  // Property scrape mutation
  const scrapeProperties = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("property-scrape-trigger", {
        body: { source: "airbnb", location: "Kigali, Rwanda" }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Scraping Started",
        description: "Property scraping job has been initiated. Results will be processed via webhook."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scraping Failed",
        description: error.message || "Failed to start property scraping",
        variant: "destructive"
      });
    }
  });

  // File upload mutation
  const uploadDrivers = useMutation({
    mutationFn: async (file: File) => {
      // Upload file to Supabase Storage
      const fileName = `drivers_${Date.now()}.csv`;
      const { error: uploadError } = await supabase.storage
        .from('data-imports')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Trigger import function
      const { data, error } = await supabase.functions.invoke("import-drivers", {
        body: { file_path: fileName }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.imported} drivers`
      });
      setUploadFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import drivers",
        variant: "destructive"
      });
    }
  });

  const CategorySyncCard = ({ 
    category, 
    title, 
    icon: Icon 
  }: { 
    category: LocationCategory; 
    title: string; 
    icon: React.ComponentType<any>;
  }) => {
    const locations = getLocations(category);
    const isLoading = syncGooglePlaces.isPending && syncGooglePlaces.variables === category;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
          <Badge variant="secondary">
            {locations.data?.length || 0} locations
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold">
              {locations.data?.length || 0}
            </div>
            <Button
              onClick={() => syncGooglePlaces.mutate(category)}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Sync from Google
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Sync</h2>
        <p className="text-muted-foreground">
          Import and sync data from external sources
        </p>
      </div>

      <Tabs defaultValue="locations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <CategorySyncCard category="bar" title="Bars" icon={MapPin} />
            <CategorySyncCard category="pharmacy" title="Pharmacies" icon={MapPin} />
            <CategorySyncCard category="hardware" title="Hardware Stores" icon={MapPin} />
            <CategorySyncCard category="farmer" title="Farmers/Markets" icon={MapPin} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Imported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Combine all location categories and show recent ones */}
                  {['bar', 'pharmacy', 'hardware', 'farmer'].map(category => {
                    const locations = getLocations(category as LocationCategory);
                    return locations.data?.slice(0, 5).map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">{location.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{location.category}</Badge>
                        </TableCell>
                        <TableCell>{location.phone || '-'}</TableCell>
                        <TableCell>{location.address}</TableCell>
                        <TableCell>
                          {location.google_rating ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-current" />
                              {location.google_rating}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{new Date(location.imported_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Property Listings
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Scraped from Airbnb, Booking.com, and Facebook
                </p>
              </div>
              <Button
                onClick={() => scrapeProperties.mutate()}
                disabled={scrapeProperties.isPending}
              >
                {scrapeProperties.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Scrape Properties
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-4">
                {properties.data?.length || 0} Properties
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Price (USD)</TableHead>
                    <TableHead>Bedrooms</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.data?.slice(0, 10).map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">{property.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{property.source}</Badge>
                      </TableCell>
                      <TableCell>${property.price_usd}</TableCell>
                      <TableCell>{property.bedrooms}</TableCell>
                      <TableCell>{property.address}</TableCell>
                      <TableCell>{new Date(property.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Listings ({vehicles.data?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Vehicle scraping functionality to be implemented
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Driver CSV Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  CSV should contain columns: phone, name, email, vehicle_type, license_number, status
                </p>
              </div>
              
              <Button
                onClick={() => uploadFile && uploadDrivers.mutate(uploadFile)}
                disabled={!uploadFile || uploadDrivers.isPending}
                className="w-full"
              >
                {uploadDrivers.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Drivers
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}