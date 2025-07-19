import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Store, 
  Calendar,
  CheckCircle,
  Clock,
  X,
  Tag
} from "lucide-react";

interface ProductDraft {
  id: string;
  vendor_id: string;
  name: string;
  price: number;
  stock_quantity: number;
  unit: string;
  category: string;
  sku: string;
  image_url: string;
  import_batch_id: string;
  status: string;
  created_at: string;
  businesses: {
    name: string;
    category: string;
  };
}

export default function ProductDrafts() {
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDrafts();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('product-draft-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products_draft'
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
        .from('products_draft')
        .select(`
          *,
          businesses (name, category)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch draft products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const publishDraft = async (draft: ProductDraft) => {
    setProcessingId(draft.id);
    
    try {
      // Move draft to products table
      const { error: insertError } = await supabase
        .from('products')
        .insert({
          name: draft.name,
          price: draft.price,
          stock_quantity: draft.stock_quantity,
          unit: draft.unit,
          category: draft.category,
          vendor_id: draft.vendor_id,
          sku: draft.sku,
          image_url: draft.image_url,
          status: 'active'
        });

      if (insertError) throw insertError;

      // Delete from drafts
      const { error: deleteError } = await supabase
        .from('products_draft')
        .delete()
        .eq('id', draft.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Success",
        description: "Product published successfully",
      });

      fetchDrafts();
    } catch (error) {
      console.error('Error publishing draft:', error);
      toast({
        title: "Error",
        description: "Failed to publish product",
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
        .from('products_draft')
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

  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      plumbing: '🚿',
      electrical: '⚡',
      tools: '🔧',
      paint: '🎨',
      fasteners: '🔩',
      hardware: '🔨',
      building: '🏗️',
      safety: '🦺',
      other: '📦'
    };
    return emojiMap[category] || '📦';
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
        <h1 className="text-3xl font-bold">Product Import Queue</h1>
        <p className="text-muted-foreground">
          Review and approve hardware product imports from vendors
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Pending Imports</span>
            </div>
            <div className="text-2xl font-bold">{drafts.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Missing Price</span>
            </div>
            <div className="text-2xl font-bold">
              {drafts.filter(d => !d.price || d.price === 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Needs Category</span>
            </div>
            <div className="text-2xl font-bold">
              {drafts.filter(d => !d.category || d.category === 'other').length}
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
              {drafts.filter(d => d.price > 0 && d.category && d.category !== 'other').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drafts List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Product Imports ({drafts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No pending imports</h3>
              <p>All vendor product imports have been processed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div key={draft.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {draft.image_url ? (
                        <img 
                          src={draft.image_url} 
                          alt={draft.name}
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{draft.name}</h3>
                          <span className="text-lg">{getCategoryEmoji(draft.category)}</span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2">
                          {draft.stock_quantity} {draft.unit} • {draft.price ? `${draft.price} RWF/${draft.unit}` : 'No price set'}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            {draft.businesses?.name || 'Unknown Vendor'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {draft.category}
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
                        onClick={() => publishDraft(draft)}
                        disabled={processingId === draft.id}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {processingId === draft.id ? 'Publishing...' : 'Publish'}
                      </Button>
                    </div>
                  </div>

                  {/* Validation Alerts */}
                  <div className="mt-3 flex gap-2">
                    {(!draft.price || draft.price === 0) && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Price Missing
                      </Badge>
                    )}
                    {(!draft.category || draft.category === 'other') && (
                      <Badge variant="outline" className="text-purple-600 border-purple-600">
                        Category Needed
                      </Badge>
                    )}
                    {draft.price > 0 && draft.category && draft.category !== 'other' && (
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