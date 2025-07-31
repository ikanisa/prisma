import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Search, 
  Star,
  Calendar,
  DollarSign,
  Phone
} from "lucide-react";

interface PatronData {
  id: string;
  whatsapp: string;
  first_seen: string;
  preferred_lang: string;
  visits: number;
  lifetime_value: number;
  favorite_drink: string;
  last_visit: string;
  avg_rating: number;
  total_spent: number;
}

export default function BarPatrons() {
  const { barId } = useParams<{ barId: string }>();
  const [patrons, setPatrons] = useState<PatronData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (barId) {
      fetchPatrons();
    }
  }, [barId]);

  const fetchPatrons = async () => {
    if (!barId) return;

    try {
      // Get all patrons who have visited this bar
      const { data: patronsData, error } = await supabase
        .from('bar_patrons')
        .select(`
          *,
          bar_tabs!inner (
            id,
            bar_id,
            total,
            created_at,
            closed_at,
            tab_items (
              id,
              products (name)
            ),
            bar_feedback (rating)
          )
        `)
        .eq('bar_tabs.bar_id', barId);

      if (error) throw error;

      // Process patron data to calculate aggregated stats
      const processedPatrons = patronsData?.reduce((acc: any[], patron: any) => {
        const existingPatron = acc.find(p => p.id === patron.id);
        
        const tabs = patron.bar_tabs || [];
        const visits = tabs.length;
        const totalSpent = tabs.reduce((sum: number, tab: any) => sum + (tab.total || 0), 0);
        
        // Calculate favorite drink (most ordered)
        const drinkCounts: Record<string, number> = {};
        tabs.forEach((tab: any) => {
          tab.tab_items?.forEach((item: any) => {
            const drinkName = item.products?.name;
            if (drinkName) {
              drinkCounts[drinkName] = (drinkCounts[drinkName] || 0) + 1;
            }
          });
        });
        
        const favoriteDrink = Object.entries(drinkCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
        
        // Calculate average rating
        const ratings = tabs.flatMap((tab: any) => tab.bar_feedback?.map((f: any) => f.rating) || []);
        const avgRating = ratings.length > 0 ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length : 0;
        
        // Get last visit
        const lastVisit = tabs.length > 0 ? Math.max(...tabs.map((tab: any) => new Date(tab.created_at).getTime())) : 0;

        if (existingPatron) {
          // Update existing patron data
          existingPatron.visits += visits;
          existingPatron.total_spent += totalSpent;
          existingPatron.last_visit = Math.max(existingPatron.last_visit, lastVisit);
        } else {
          // Add new patron
          acc.push({
            id: patron.id,
            whatsapp: patron.whatsapp,
            first_seen: patron.first_seen,
            preferred_lang: patron.preferred_lang,
            visits,
            lifetime_value: totalSpent,
            favorite_drink: favoriteDrink,
            last_visit: lastVisit > 0 ? new Date(lastVisit).toISOString() : patron.first_seen,
            avg_rating: avgRating,
            total_spent: totalSpent
          });
        }
        
        return acc;
      }, []);

      // Sort by lifetime value (highest first)
      processedPatrons?.sort((a, b) => b.lifetime_value - a.lifetime_value);
      
      setPatrons(processedPatrons || []);

    } catch (error) {
      console.error('Error fetching patrons:', error);
      toast({
        title: "Error",
        description: "Failed to fetch patron data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPatrons = patrons.filter(patron =>
    patron.whatsapp.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patron.favorite_drink.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPhone = (phone: string) => {
    // Format phone number for display
    return phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const getPatronInitials = (phone: string) => {
    return phone.slice(-2).toUpperCase();
  };

  const getDaysSinceLastVisit = (lastVisit: string) => {
    const days = Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading patrons...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="w-8 h-8" />
              Patrons CRM
            </h1>
            <p className="text-muted-foreground">
              {patrons.length} total patrons
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by phone number or favorite drink..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patrons Grid */}
      <div className="grid gap-4">
        {filteredPatrons.map((patron) => (
          <Card key={patron.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback>{getPatronInitials(patron.whatsapp)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{formatPhone(patron.whatsapp)}</span>
                      <Badge variant="outline">{patron.preferred_lang.toUpperCase()}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Favorite: {patron.favorite_drink}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <Users className="w-3 h-3" />
                      Visits
                    </div>
                    <div className="text-lg font-semibold">{patron.visits}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <DollarSign className="w-3 h-3" />
                      LTV
                    </div>
                    <div className="text-lg font-semibold">
                      {patron.lifetime_value.toLocaleString()} RWF
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <Star className="w-3 h-3" />
                      Rating
                    </div>
                    <div className="text-lg font-semibold">
                      {patron.avg_rating > 0 ? patron.avg_rating.toFixed(1) : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <Calendar className="w-3 h-3" />
                      Last Visit
                    </div>
                    <div className="text-lg font-semibold">
                      {getDaysSinceLastVisit(patron.last_visit)}d ago
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredPatrons.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No patrons found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search criteria" : "No patrons have visited this bar yet"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}