import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Search, MapPin, Globe, Phone, Star, Clock, 
  Building, Store, Pill, Download, RefreshCw, CheckCircle, ArrowRight 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface GooglePlacesSearchProps {
  onSearchComplete: (results: any) => void;
  searchType: 'businesses' | 'contacts';
}

export function GooglePlacesSearch({ onSearchComplete, searchType }: GooglePlacesSearchProps) {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [location, setLocation] = useState("Kigali, Rwanda");
  const [businessType, setBusinessType] = useState("pharmacy");
  const [radius, setRadius] = useState("100000"); // Default to 100km for comprehensive coverage
  const [results, setResults] = useState<any[]>([]);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchStats, setSearchStats] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSearch = async () => {
    try {
      setSearching(true);
      setSearchComplete(false);
      setResults([]);
      setSearchProgress(0);
      setSearchStats(null);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setSearchProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

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

      clearInterval(progressInterval);
      setSearchProgress(100);

      if (error) throw error;

      if (data.success) {
        const stats = {
          total: data.data.places?.length || 0,
          successful: data.data.successful || 0,
          failed: data.data.failed || 0,
          pages: data.data.totalPages || 1
        };
        
        setResults(data.data.places || []);
        setSearchStats(stats);
        setSearchComplete(true);
        
        toast({
          title: "Search Complete!", 
          description: `Found ${stats.total} ${businessType} locations. ${stats.successful} imported successfully to database.`
        });
        
        onSearchComplete(data.data);
      } else {
        throw new Error(data.error || 'Search failed');
      }

    } catch (error) {
      console.error('Google Places search error:', error);
      setSearchProgress(0);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search Google Places",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const viewAllResults = () => {
    navigate('/admin/businesses');
    setOpen(false);
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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Google Places Search</span>
          </DialogTitle>
          <DialogDescription>
            Search for {searchType} using Google Places API and import them into your database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Progress */}
          {searching && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">Searching Google Places...</span>
                    <span className="text-sm text-blue-600">{searchProgress}%</span>
                  </div>
                  <Progress value={searchProgress} className="h-2" />
                  <p className="text-xs text-blue-600">
                    Fetching comprehensive data for {businessType} in {location}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search Summary */}
          {searchComplete && searchStats && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-green-800">Search Complete!</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-green-600">Total Found</p>
                        <p className="text-2xl font-bold text-green-800">{searchStats.total}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-green-600">Successfully Imported</p>
                        <p className="text-2xl font-bold text-green-800">{searchStats.successful}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-green-600">Pages Processed</p>
                        <p className="text-2xl font-bold text-green-800">{searchStats.pages}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-green-600">Search Area</p>
                        <p className="text-lg font-semibold text-green-800">{parseInt(radius) / 1000}km</p>
                      </div>
                    </div>
                  </div>
                  <Button onClick={viewAllResults} className="ml-4">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    View All Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Search Parameters</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Select value={location} onValueChange={setLocation} disabled={searching}>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Type</label>
                  <Select value={businessType} onValueChange={setBusinessType} disabled={searching}>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Radius</label>
                  <Select value={radius} onValueChange={setRadius} disabled={searching}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5000">5 km</SelectItem>
                      <SelectItem value="10000">10 km</SelectItem>
                      <SelectItem value="25000">25 km</SelectItem>
                      <SelectItem value="50000">50 km</SelectItem>
                      <SelectItem value="100000">100 km (Extended)</SelectItem>
                      <SelectItem value="150000">150 km (Regional)</SelectItem>
                      <SelectItem value="200000">200 km (Country-wide)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleSearch} 
                  disabled={searching}
                  className="flex-1 min-w-[200px]"
                  size="lg"
                >
                  {searching ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Start Comprehensive Search
                    </>
                  )}
                </Button>
                
                {searchComplete && (
                  <Button 
                    variant="outline" 
                    onClick={viewAllResults}
                    size="lg"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    View All Results
                  </Button>
                )}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border">
                <div className="flex items-start space-x-3">
                  <Building className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800 mb-2">Enhanced Search Features</p>
                    <p className="text-sm text-blue-700">
                      Comprehensive search for ALL {businessType} locations in {location} within {parseInt(radius) / 1000}km radius. 
                      Includes reviews, ratings, photos, opening hours, and complete business metadata.
                    </p>
                  </div>
                </div>
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