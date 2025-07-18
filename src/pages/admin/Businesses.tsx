import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Search, RefreshCw, CheckCircle, XCircle, Plus, Grid3X3, List, 
  MoreHorizontal, MessageCircle, Eye, MapPin, Store, Building, Pill
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddBusinessDialog } from "@/components/admin/AddBusinessDialog";
import { BulkImportDialog } from "@/components/admin/BulkImportDialog";

interface Business {
  id: string;
  name: string;
  momo_code: string;
  category: 'bar' | 'pharmacy' | 'shop';
  subscription_status: string;
  created_at: string;
  owner_user_id: string;
  owner_phone?: string;
  location_gps?: any;
}

interface CategoryStats {
  bars: number;
  pharmacies: number;
  shops: number;
}

export default function Businesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({ bars: 0, pharmacies: 0, shops: 0 });
  const { toast } = useToast();
  const navigate = useNavigate();

  const itemsPerPage = 12;

  useEffect(() => {
    loadBusinesses();
    loadCategoryStats();
  }, [currentPage, searchTerm, categoryFilter]);

  const loadCategoryStats = async () => {
    try {
      const { data: stats } = await supabase
        .from('businesses')
        .select('category')
        .not('category', 'is', null);

      if (stats) {
        const counts = stats.reduce((acc, business) => {
          if (business.category === 'bar') acc.bars++;
          else if (business.category === 'pharmacy') acc.pharmacies++;
          else if (business.category === 'shop') acc.shops++;
          return acc;
        }, { bars: 0, pharmacies: 0, shops: 0 });
        
        setCategoryStats(counts);
      }
    } catch (error) {
      console.error('Error loading category stats:', error);
    }
  };

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('businesses')
        .select(`
          *,
          users!businesses_owner_user_id_fkey(phone)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,momo_code.ilike.%${searchTerm}%`);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter as 'bar' | 'pharmacy' | 'shop');
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const businessesWithPhone = (data || []).map(business => ({
        ...business,
        owner_phone: business.users?.phone
      }));

      setBusinesses(businessesWithPhone);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading businesses:', error);
      toast({
        title: "Error",
        description: "Failed to load businesses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBusinessStatus = async (businessId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ subscription_status: newStatus })
        .eq('id', businessId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Business ${newStatus === 'active' ? 'approved' : 'deactivated'} successfully`,
      });

      loadBusinesses();
      loadCategoryStats();
    } catch (error) {
      console.error('Error updating business status:', error);
      toast({
        title: "Error",
        description: "Failed to update business status",
        variant: "destructive"
      });
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'bar': return 'bg-orange-100 text-orange-800';
      case 'pharmacy': return 'bg-green-100 text-green-800';
      case 'shop': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bar': return <Store className="h-4 w-4" />;
      case 'pharmacy': return <Pill className="h-4 w-4" />;
      case 'shop': return <Building className="h-4 w-4" />;
      default: return <Store className="h-4 w-4" />;
    }
  };

  const openWhatsApp = (phone: string) => {
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=Hello%20from%20easyMO%20Admin`, '_blank');
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Businesses Directory</h1>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                More
                <MoreHorizontal className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={loadBusinesses}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </DropdownMenuItem>
              <BulkImportDialog onImportComplete={() => { loadBusinesses(); loadCategoryStats(); }} />
            </DropdownMenuContent>
          </DropdownMenu>
          <AddBusinessDialog onBusinessAdded={() => { loadBusinesses(); loadCategoryStats(); }} />
        </div>
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`cursor-pointer transition-colors ${categoryFilter === 'bar' ? 'ring-2 ring-orange-500' : ''}`} 
              onClick={() => setCategoryFilter(categoryFilter === 'bar' ? 'all' : 'bar')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Store className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{categoryStats.bars}</p>
                <p className="text-sm text-muted-foreground">Bars</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer transition-colors ${categoryFilter === 'pharmacy' ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === 'pharmacy' ? 'all' : 'pharmacy')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Pill className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{categoryStats.pharmacies}</p>
                <p className="text-sm text-muted-foreground">Pharmacies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer transition-colors ${categoryFilter === 'shop' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === 'shop' ? 'all' : 'shop')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{categoryStats.shops}</p>
                <p className="text-sm text-muted-foreground">Shops</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and View Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Businesses ({totalCount.toLocaleString()})
              {categoryFilter !== 'all' && (
                <Badge variant="outline" className="ml-2">
                  {categoryFilter}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or MoMo code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            {categoryFilter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setCategoryFilter('all')}>
                Clear filter
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading businesses...</div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {businesses.map((business) => (
                    <Card key={business.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(business.category)}
                            <h3 className="font-semibold truncate">{business.name}</h3>
                          </div>
                          <Badge className={getCategoryBadgeColor(business.category)}>
                            {business.category}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground mb-3">
                          <p>MoMo: {business.momo_code}</p>
                          <p>Status: {business.subscription_status}</p>
                          <p>Created: {new Date(business.created_at).toLocaleDateString()}</p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/businesses/${business.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {business.owner_phone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openWhatsApp(business.owner_phone)}
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateBusinessStatus(
                              business.id, 
                              business.subscription_status === 'active' ? 'trial' : 'active'
                            )}
                          >
                            {business.subscription_status === 'active' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>MoMo Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businesses.map((business) => (
                      <TableRow key={business.id}>
                        <TableCell className="font-medium">{business.name}</TableCell>
                        <TableCell>
                          <Badge className={getCategoryBadgeColor(business.category)}>
                            {business.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{business.momo_code}</TableCell>
                        <TableCell>
                          <Badge variant={business.subscription_status === 'active' ? 'default' : 'secondary'}>
                            {business.subscription_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(business.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/businesses/${business.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {business.owner_phone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openWhatsApp(business.owner_phone)}
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateBusinessStatus(
                                business.id, 
                                business.subscription_status === 'active' ? 'trial' : 'active'
                              )}
                            >
                              {business.subscription_status === 'active' ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} businesses
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}