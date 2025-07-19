import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

interface KitchenItem {
  id: number;
  qty: number;
  unit_price: number;
  status: string;
  created_at: string;
  products: {
    name: string;
    category: string;
  };
  bar_tabs: {
    table_code: string;
    created_at: string;
  };
}

interface GroupedItems {
  urgent: KitchenItem[];
  warning: KitchenItem[];
  normal: KitchenItem[];
}

export default function BarKitchenDisplay() {
  const { barId } = useParams<{ barId: string }>();
  const [items, setItems] = useState<GroupedItems>({ urgent: [], warning: [], normal: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (barId) {
      fetchKitchenItems();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('kitchen-items-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tab_items'
          },
          () => {
            fetchKitchenItems();
          }
        )
        .subscribe();

      // Refresh every 30 seconds
      const interval = setInterval(fetchKitchenItems, 30000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [barId]);

  const fetchKitchenItems = async () => {
    if (!barId) return;

    try {
      const { data, error } = await supabase
        .from('tab_items')
        .select(`
          *,
          products (name, category),
          bar_tabs!inner (table_code, created_at, bar_id)
        `)
        .eq('status', 'preparing')
        .eq('bar_tabs.bar_id', barId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group items by time buckets
      const now = new Date();
      const grouped: GroupedItems = {
        urgent: [],
        warning: [],
        normal: []
      };

      data?.forEach(item => {
        const itemTime = new Date(item.bar_tabs.created_at);
        const minutesAgo = (now.getTime() - itemTime.getTime()) / (1000 * 60);
        
        const itemWithCreatedAt = {
          ...item,
          created_at: item.bar_tabs.created_at
        };
        
        if (minutesAgo > 15) {
          grouped.urgent.push(itemWithCreatedAt);
        } else if (minutesAgo > 5) {
          grouped.warning.push(itemWithCreatedAt);
        } else {
          grouped.normal.push(itemWithCreatedAt);
        }
      });

      setItems(grouped);
      setLastUpdated(now.toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching kitchen items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch kitchen items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markItemServed = async (itemId: number) => {
    try {
      const { error } = await supabase
        .from('tab_items')
        .update({ 
          status: 'served',
          served_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;
      
      fetchKitchenItems();
      toast({
        title: "Success",
        description: "Item marked as served",
      });
    } catch (error) {
      console.error('Error marking item served:', error);
      toast({
        title: "Error",
        description: "Failed to mark item as served",
        variant: "destructive",
      });
    }
  };

  const getMinutesAgo = (created_at: string) => {
    const now = new Date();
    const itemTime = new Date(created_at);
    return Math.round((now.getTime() - itemTime.getTime()) / (1000 * 60));
  };

  const renderItemGroup = (title: string, items: KitchenItem[], variant: "destructive" | "secondary" | "default", icon: React.ReactNode) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No items in this category
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{item.products.name}</span>
                    <Badge variant="outline">{item.products.category}</Badge>
                    <Badge variant={variant}>
                      {getMinutesAgo(item.created_at)}m ago
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Table {item.bar_tabs.table_code} • Qty: {item.qty}
                  </div>
                </div>
                <Button
                  onClick={() => markItemServed(item.id)}
                  className="ml-4"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Served
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading kitchen display...</div>
      </div>
    );
  }

  const totalItems = items.urgent.length + items.warning.length + items.normal.length;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Kitchen Display System</h1>
          <p className="text-muted-foreground">
            {totalItems} items pending • Last updated: {lastUpdated}
          </p>
        </div>
        <Button onClick={fetchKitchenItems} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {renderItemGroup(
        "URGENT - Over 15 minutes",
        items.urgent,
        "destructive",
        <AlertTriangle className="w-5 h-5 text-red-500" />
      )}

      {renderItemGroup(
        "WARNING - 5-15 minutes",
        items.warning,
        "secondary",
        <Clock className="w-5 h-5 text-yellow-500" />
      )}

      {renderItemGroup(
        "NORMAL - Under 5 minutes",
        items.normal,
        "default",
        <CheckCircle className="w-5 h-5 text-green-500" />
      )}

      {totalItems === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">All Caught Up!</h2>
          <p className="text-muted-foreground">No items waiting to be prepared</p>
        </div>
      )}
    </div>
  );
}