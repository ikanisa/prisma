import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, MapPin, Globe, Phone, Star, Clock, 
  Building, Store, Pill, Download, RefreshCw 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GooglePlacesSearchProps {
  onSearchComplete: (results: any) => void;
  searchType: 'businesses' | 'contacts';
}

export function GooglePlacesSearch({ onSearchComplete, searchType }: GooglePlacesSearchProps) {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [location, setLocation] = useState("Kigali, Rwanda");
  const [businessType, setBusinessType] = useState("pharmacy");
  const [radius, setRadius] = useState("50000");
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handleSearch = async () => {
    try {
      setSearching(true);
      setResults([]);

      const { data, error } = await supabase.functions.invoke('google-places-sync', {
        body: {
          action: searchType === 'businesses' ? 'syncBusinesses' : 'syncProperties',
          payload: {
            location,
            type: businessType,
            radius: parseInt(radius)
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        setResults(data.data.places || []);
        toast({
          title: "Search Complete", 
          description: `Found ${data.data.places?.length || 0} places across ${data.data.totalPages || 1} pages. ${data.data.successful} imported successfully to database.`
        });
        
        onSearchComplete(data.data);
      } else {
        throw new Error(data.error || 'Search failed');
      }

    } catch (error) {
      console.error('Google Places search error:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search Google Places",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'restaurant':
      case 'bar':
      case 'cafe':
        return <Store className="h-4 w-4" />;
      case 'pharmacy':
      case 'hospital':
        return <Pill className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  const businessTypes = [
    { value: 'restaurant', label: 'Restaurants & Bars' },
    { value: 'pharmacy', label: 'Pharmacies' },
    { value: 'store', label: 'Shops & Stores' },
    { value: 'hotel', label: 'Hotels & Lodging' },
    { value: 'gas_station', label: 'Gas Stations' },
    { value: 'bank', label: 'Banks & ATMs' },
    { value: 'school', label: 'Schools' },
    { value: 'hospital', label: 'Healthcare' }
  ];

  const rwandanLocations = [
    "Kigali, Rwanda",
    "Nyarugenge District, Kigali",
    "Gasabo District, Kigali", 
    "Kicukiro District, Kigali",
    "Butare, Rwanda",
    "Musanze, Rwanda",
    "Rubavu, Rwanda",
    "Muhanga, Rwanda"
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Search className="h-4 w-4 mr-2" />
          Google Places Search
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Google Places Search</DialogTitle>
          <DialogDescription>
            Search for {searchType} using Google Places API and import them into your database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rwandanLocations.map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Business Type</label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center">
                            {getTypeIcon(type.value)}
                            <span className="ml-2">{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Search Radius</label>
                  <Select value={radius} onValueChange={setRadius}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5000">5 km</SelectItem>
                      <SelectItem value="10000">10 km</SelectItem>
                      <SelectItem value="25000">25 km</SelectItem>
                      <SelectItem value="50000">50 km (Comprehensive)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={handleSearch} 
                    disabled={searching}
                    className="w-full"
                  >
                    {searching ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search Google Places
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-md">
                <p className="text-sm text-green-700">
                  <strong>Enhanced Search:</strong> This will perform comprehensive searches for ALL {businessType} in {location} 
                  within a {parseInt(radius) / 1000}km radius. Multiple search strategies are used to ensure complete coverage, 
                  including reviews, ratings, and all available business data. No API limits - fetches ALL available results!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Search Results ({results.length})
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {results.map((place: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(place.types?.[0] || 'business')}
                            <h3 className="font-semibold">{place.name}</h3>
                            {place.rating && (
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span className="text-sm ml-1">{place.rating}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {place.formatted_address}
                            </div>
                            {place.formatted_phone_number && (
                              <div className="flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {place.formatted_phone_number}
                              </div>
                            )}
                          </div>

                          {place.website && (
                            <div className="flex items-center text-sm text-blue-600">
                              <Globe className="h-3 w-3 mr-1" />
                              <a href={place.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                Website
                              </a>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1">
                            {place.types?.slice(0, 3).map((type: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {type.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="ml-4">
                          <Badge 
                            variant={place.business_status === 'OPERATIONAL' ? 'default' : 'destructive'}
                          >
                            {place.business_status || 'Unknown'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced API Usage Info */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Enhanced Google Places API Features:</p>
                <ul className="space-y-1">
                  <li>• <strong>Multiple Search Strategies:</strong> Uses 5+ different search queries for comprehensive coverage</li>
                  <li>• <strong>Complete Data Extraction:</strong> Includes reviews, ratings, photos, opening hours, and all metadata</li>
                  <li>• <strong>No Artificial Limits:</strong> Fetches ALL available results across all pages</li>
                  <li>• <strong>Smart Deduplication:</strong> Automatically removes duplicate places</li>
                  <li>• <strong>Real-time Database Import:</strong> All results automatically saved to Supabase businesses table</li>
                  <li>• <strong>Admin Panel Integration:</strong> Results immediately visible in admin dashboard</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}