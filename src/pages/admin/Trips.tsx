import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { RefreshCw, Car, User, MapPin, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TripRow {
  id: string;
  type: "driver_trip" | "passenger_intent";
  user_phone: string;
  from_text: string;
  to_text: string;
  price_rwf: number | null;
  seats: number | null;
  status: "open" | "matched" | "cancelled" | "completed";
  created_at: string;
  updated_at: string;
}

export default function Trips() {
  const [data, setData] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TripRow | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel("trips-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_trips" },
        () => loadData()
      )
      .on(
        "postgres_changes", 
        { event: "*", schema: "public", table: "passenger_intents" },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: trips, error } = await supabase
        .from("trips_and_intents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setData(trips as TripRow[]);
    } catch (error: any) {
      toast({
        title: "Error loading trips",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function forceMatch(tripId: string) {
    try {
      const { error } = await supabase.rpc("fn_admin_force_match", {
        p_trip_id: tripId
      });
      
      if (error) throw error;
      
      toast({
        title: "Trip matched",
        description: "Trip status updated to matched"
      });
      
      setSelected(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error updating trip",
        description: error.message,
        variant: "destructive"
      });
    }
  }

  async function cancelTrip(tripId: string, type: string) {
    try {
      const table = type === "driver_trip" ? "driver_trips" : "passenger_intents";
      const { error } = await supabase
        .from(table)
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", tripId);
      
      if (error) throw error;
      
      toast({
        title: "Trip cancelled",
        description: "Trip status updated to cancelled"
      });
      
      setSelected(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error cancelling trip", 
        description: error.message,
        variant: "destructive"
      });
    }
  }

  const columns = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }: any) => (
        <Badge variant={row.original.type === "driver_trip" ? "default" : "secondary"}>
          {row.original.type === "driver_trip" ? (
            <><Car className="w-3 h-3 mr-1" /> Driver</>
          ) : (
            <><User className="w-3 h-3 mr-1" /> Passenger</>
          )}
        </Badge>
      )
    },
    {
      accessorKey: "user_phone",
      header: "Phone",
      cell: ({ getValue }: any) => (
        <code className="text-xs bg-muted px-1 py-0.5 rounded">
          {getValue()?.toString().slice(-8) || "N/A"}
        </code>
      )
    },
    {
      accessorKey: "from_text", 
      header: "Route",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="truncate max-w-[100px]">{row.original.from_text}</span>
          <span className="text-muted-foreground">→</span>
          <span className="truncate max-w-[100px]">{row.original.to_text}</span>
        </div>
      )
    },
    {
      accessorKey: "price_rwf",
      header: "Price",
      cell: ({ getValue }: any) => {
        const price = getValue();
        return price ? (
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium">{Number(price).toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">RWF</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      }
    },
    {
      accessorKey: "seats",
      header: "Seats",
      cell: ({ getValue }: any) => getValue() || "—"
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status;
        const variants: Record<string, any> = {
          open: "default",
          matched: "secondary", 
          cancelled: "destructive",
          completed: "outline"
        };
        return <Badge variant={variants[status] || "default"}>{status}</Badge>;
      }
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ getValue }: any) => (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {new Date(getValue()).toLocaleDateString()}
        </div>
      )
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => setSelected(row.original)}
        >
          View
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trips & Intents</h1>
          <p className="text-muted-foreground">
            Driver trips and passenger requests from WhatsApp
          </p>
        </div>
        <Button onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.filter(d => d.type === "driver_trip").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passenger Requests</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.filter(d => d.type === "passenger_intent").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Badge variant="default" className="h-4 w-4 rounded-full p-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.filter(d => d.status === "open").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched</CardTitle>
            <Badge variant="secondary" className="h-4 w-4 rounded-full p-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.filter(d => d.status === "matched").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            searchKey="user_phone"
            searchPlaceholder="Search by phone number..."
          />
        </CardContent>
      </Card>

      <Drawer open={!!selected} onOpenChange={() => setSelected(null)}>
        <DrawerContent className="max-w-lg mx-auto">
          <DrawerHeader>
            <DrawerTitle>
              {selected?.type === "driver_trip" ? "Driver Trip" : "Passenger Intent"}
            </DrawerTitle>
          </DrawerHeader>
          
          {selected && (
            <div className="p-6 space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                  <code className="text-sm">{selected.user_phone}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Route:</span>
                  <span className="text-sm">{selected.from_text} → {selected.to_text}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Seats:</span>
                  <span className="text-sm">{selected.seats || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Price:</span>
                  <span className="text-sm">
                    {selected.price_rwf ? `${selected.price_rwf.toLocaleString()} RWF` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  <Badge>{selected.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Created:</span>
                  <span className="text-sm">{new Date(selected.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                {selected.status === "open" && (
                  <Button 
                    onClick={() => forceMatch(selected.id)}
                    className="flex-1"
                  >
                    Force Match
                  </Button>
                )}
                {selected.status !== "cancelled" && (
                  <Button 
                    variant="destructive" 
                    onClick={() => cancelTrip(selected.id, selected.type)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}