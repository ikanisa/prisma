import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Eye, Users, Clock, DollarSign } from "lucide-react";

interface TabItem {
  id: number;
  qty: number;
  unit_price: number;
  status: string;
  products: {
    name: string;
    category: string;
  };
}

interface Tab {
  id: string;
  table_code: string;
  status: string;
  subtotal: number;
  tip: number;
  total: number;
  created_at: string;
  tab_items: TabItem[];
}

export default function BarTables() {
  const { barId } = useParams<{ barId: string }>();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (barId) {
      fetchTabs();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('bar-tabs-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bar_tabs',
            filter: `bar_id=eq.${barId}`
          },
          () => {
            fetchTabs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [barId]);

  const fetchTabs = async () => {
    if (!barId) return;

    try {
      const { data, error } = await supabase
        .from('bar_tabs')
        .select(`
          *,
          tab_items (
            id,
            qty,
            unit_price,
            status,
            products (name, category)
          )
        `)
        .eq('bar_id', barId)
        .neq('status', 'closed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTabs(data || []);
    } catch (error) {
      console.error('Error fetching tabs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch table data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markItemPrepared = async (itemId: number) => {
    try {
      const { error } = await supabase
        .from('tab_items')
        .update({ status: 'served', served_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) throw error;
      
      fetchTabs();
      toast({
        title: "Success",
        description: "Item marked as served",
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      });
    }
  };

  const getTableStatus = (tab: Tab) => {
    if (tab.status === 'pending_payment') return 'payment';
    if (tab.tab_items.some(item => item.status === 'preparing')) return 'active';
    return 'idle';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-green-500';
      case 'active': return 'bg-yellow-500';
      case 'payment': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'idle': return 'Idle';
      case 'active': return 'Open Tab';
      case 'payment': return 'Payment Pending';
      default: return 'Unknown';
    }
  };

  // Group tabs by table (generate table grid)
  const tables = Array.from({ length: 40 }, (_, i) => {
    const tableNumber = i + 1;
    const tableCode = `TABLE-${tableNumber}`;
    const tab = tabs.find(t => t.table_code === tableCode);
    
    return {
      number: tableNumber,
      code: tableCode,
      tab,
      status: tab ? getTableStatus(tab) : 'idle'
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading tables...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bar Tables Live View</h1>
        <p className="text-muted-foreground">Real-time table status and order management</p>
      </div>

      <div className="grid grid-cols-8 gap-4">
        {tables.map((table) => (
          <Sheet key={table.number}>
            <SheetTrigger asChild>
              <Card className={`cursor-pointer transition-all hover:shadow-lg ${
                table.status !== 'idle' ? 'ring-2 ring-primary' : ''
              }`}>
                <CardContent className="p-4 text-center">
                  <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${getStatusColor(table.status)}`} />
                  <div className="font-semibold">Table {table.number}</div>
                  <Badge variant="outline" className="text-xs">
                    {getStatusText(table.status)}
                  </Badge>
                  {table.tab && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {table.tab.total} RWF
                    </div>
                  )}
                </CardContent>
              </Card>
            </SheetTrigger>

            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Table {table.number} Details</SheetTitle>
              </SheetHeader>

              {table.tab ? (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Total
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{table.tab.total} RWF</div>
                        <div className="text-sm text-muted-foreground">
                          Subtotal: {table.tab.subtotal} RWF
                          {table.tab.tip > 0 && ` + Tip: ${table.tab.tip} RWF`}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Duration
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {Math.round((Date.now() - new Date(table.tab.created_at).getTime()) / (1000 * 60))}m
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Started at {new Date(table.tab.created_at).toLocaleTimeString()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Order Items ({table.tab.tab_items.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {table.tab.tab_items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{item.products.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.qty}x {item.unit_price} RWF = {item.qty * item.unit_price} RWF
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={item.status === 'served' ? 'default' : 'secondary'}>
                                {item.status}
                              </Badge>
                              {item.status === 'preparing' && (
                                <Button
                                  size="sm"
                                  onClick={() => markItemPrepared(item.id)}
                                >
                                  Mark Served
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="mt-6 text-center">
                  <div className="text-muted-foreground">No active tab</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    This table is currently idle
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        ))}
      </div>
    </div>
  );
}