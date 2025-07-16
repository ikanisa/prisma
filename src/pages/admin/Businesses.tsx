import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Business {
  id: string;
  name: string;
  momo_code: string;
  category: 'bar' | 'pharmacy' | 'shop';
  subscription_status: string;
  created_at: string;
  owner_user_id: string;
}

export default function Businesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const itemsPerPage = 50;

  useEffect(() => {
    loadBusinesses();
  }, [currentPage, searchTerm]);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('businesses')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,momo_code.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setBusinesses(data || []);
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

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Businesses Management</h1>
        <div className="flex gap-2">
          <Button onClick={loadBusinesses} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Business
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Businesses ({totalCount.toLocaleString()})</CardTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or MoMo code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading businesses...</div>
          ) : (
            <>
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
                        <div className="flex gap-2">
                          {business.subscription_status !== 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateBusinessStatus(business.id, 'active')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          {business.subscription_status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateBusinessStatus(business.id, 'trial')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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