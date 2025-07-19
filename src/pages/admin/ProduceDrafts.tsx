import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  User, 
  MapPin, 
  Calendar,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  X
} from "lucide-react";

interface ProduceDraft {
  id: string;
  farmer_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  price: number;
  photo_url: string;
  status: string;
  created_at: string;
  farmers: {
    name: string;
    whatsapp: string;
    district: string;
  };
}

export default function ProduceDrafts() {
  const [drafts, setDrafts] = useState<ProduceDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDrafts();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('draft-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produce_drafts'
        },
        () => {
          fetchDrafts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDrafts = async () => {
    try {
      const { data, error } = await supabase
        .from('produce_drafts')
        .select(`
          *,
          farmers (name, whatsapp, district)
        `)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch draft listings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const forcePublish = async (draft: ProduceDraft) => {
    setProcessingId(draft.id);
    
    try {
      const { error } = await supabase.functions.invoke('listing-publish', {
        body: {
          draft_id: draft.id,
          farmer_whatsapp: draft.farmers.whatsapp
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Draft published successfully",
      });

      fetchDrafts();
    } catch (error) {
      console.error('Error publishing draft:', error);
      toast({
        title: "Error",
        description: "Failed to publish draft",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const deleteDraft = async (draftId: string) => {
    setProcessingId(draftId);
    
    try {
      const { error } = await supabase
        .from('produce_drafts')
        .delete()
        .eq('id', draftId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Draft deleted successfully",
      });

      fetchDrafts();
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Error",
        description: "Failed to delete draft",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getUrgencyBadge = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours > 24) {
      return <Badge variant="destructive">Urgent</Badge>;
    } else if (diffInHours > 4) {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">New</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading drafts...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Draft Queue</h1>
        <p className="text-muted-foreground">
          Review and manage incoming produce listings needing attention
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Total Drafts</span>
            </div>
            <div className="text-2xl font-bold">{drafts.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Needs Photo</span>
            </div>
            <div className="text-2xl font-bold">
              {drafts.filter(d => !d.photo_url).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Needs Price</span>
            </div>
            <div className="text-2xl font-bold">
              {drafts.filter(d => !d.price).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Ready to Publish</span>
            </div>
            <div className="text-2xl font-bold">
              {drafts.filter(d => d.photo_url && d.price).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drafts List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Drafts ({drafts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No pending drafts</h3>
              <p>All farmer submissions have been processed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div key={draft.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {draft.photo_url ? (
                        <img 
                          src={draft.photo_url} 
                          alt={draft.product_name}
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{draft.product_name}</h3>
                          {getUrgencyBadge(draft.created_at)}
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2">
                          {draft.quantity} {draft.unit} • {draft.price ? `${draft.price} RWF/${draft.unit}` : 'No price set'}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {draft.farmers.name || 'Unknown Farmer'}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {draft.farmers.district}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {getTimeAgo(draft.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteDraft(draft.id)}
                        disabled={processingId === draft.id}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => forcePublish(draft)}
                        disabled={processingId === draft.id}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {processingId === draft.id ? 'Publishing...' : 'Force Publish'}
                      </Button>
                    </div>
                  </div>

                  {/* Missing Info Alerts */}
                  <div className="mt-3 flex gap-2">
                    {!draft.photo_url && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Photo Missing
                      </Badge>
                    )}
                    {!draft.price && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Price Missing
                      </Badge>
                    )}
                    {draft.photo_url && draft.price && (
                      <Badge className="bg-green-100 text-green-800">
                        Ready to Publish
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}