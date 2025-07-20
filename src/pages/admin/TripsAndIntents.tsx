/* ---------------------------------------------------------------------------
   Trips & Intents admin screen                                page.tsx
   ---------------------------------------------------------------------------
   • Lists the last 90 days of trips (drivers) + trip intents (passengers)
     in one unified table.
   • Realtime >= Supabase channel; uses Row‑Level Security safe RPC.
   • Detail‑drawer allows editing status or forcing match.
   • ✨ shadcn/ui + lucide‑react icons ✨
----------------------------------------------------------------------------- */
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Eye, MapPin, Users, DollarSign } from "lucide-react";

type TripRow = {
  id: string;
  type: "driver_trip" | "passenger_intent";
  user_phone: string;
  from_text: string;
  to_text: string;
  price_rwf: number | null;
  seats: number | null;
  status: "open" | "matched" | "cancelled" | "completed" | "active";
  created_at: string;
  updated_at: string;
};

export default function TripsAndIntents() {
  const [data, setData] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TripRow | null>(null);
  const { toast } = useToast();

  /* ---------------- fetch on mount + subscribe realtime -------------- */
  useEffect(() => {
    (async () => {
      await loadData();
      
      // Subscribe to realtime changes
      const channel = supabase
        .channel("realtime:trips")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "driver_trips_spatial" },
          () => loadData()
        )
        .on(
          "postgres_changes", 
          { event: "*", schema: "public", table: "passenger_intents_spatial" },
          () => loadData()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trips_and_intents_spatial")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      
      if (error) throw error;
      setData(data as TripRow[]);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load trips and intents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- Table columns ------------------------------------ */
  const columns: ColumnDef<TripRow>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={row.original.type === "driver_trip" ? "secondary" : "outline"}>
          {row.original.type === "driver_trip" ? "Driver" : "Passenger"}
        </Badge>
      )
    },
    { 
      accessorKey: "user_phone", 
      header: "User",
      cell: ({ getValue }) => (
        <div className="font-mono text-sm">{getValue() as string}</div>
      )
    },
    { 
      accessorKey: "from_text", 
      header: "From",
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-green-600" />
          <span className="text-sm">{getValue() as string}</span>
        </div>
      )
    },
    { 
      accessorKey: "to_text",   
      header: "To",
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-red-600" />
          <span className="text-sm">{getValue() as string}</span>
        </div>
      )
    },
    {
      accessorKey: "price_rwf",
      header: "Price (RWF)",
      cell: ({ getValue }) => {
        const value = getValue() as number | null;
        return value ? (
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-green-600" />
            <span className="font-medium">{value.toLocaleString()}</span>
          </div>
        ) : "—";
      }
    },
    { 
      accessorKey: "seats", 
      header: "Seats",
      cell: ({ getValue }) => {
        const value = getValue() as number | null;
        return value ? (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-blue-600" />
            <span>{value}</span>
          </div>
        ) : "—";
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        const colorMap: Record<string, any> = { 
          open: "secondary", 
          active: "secondary",
          matched: "default", 
          cancelled: "destructive", 
          completed: "default" 
        };
        return <Badge variant={colorMap[s] || "secondary"}>{s}</Badge>;
      }
    },
    { 
      accessorKey: "created_at", 
      header: "Created",
      cell: ({ getValue }) => (
        <div className="text-sm text-muted-foreground">
          {new Date(getValue() as string).toLocaleString()}
        </div>
      )
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => setSelected(row.original)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )
    }
  ];

  /* ---------- helpers inside component ---------- */
  async function forceMatch(id: string) {
    try {
      const { error } = await supabase.rpc("fn_admin_force_match", { p_trip_id: id });
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Trip status updated to matched",
      });
      
      setSelected(null);
      loadData();
    } catch (error: any) {
      console.error("Force match error:", error);
      toast({
        title: "Error",
        description: "Failed to update trip status",
        variant: "destructive"
      });
    }
  }

  async function cancelSelected(id: string, type: string) {
    try {
      const table = type === "driver_trip" ? "driver_trips_spatial" : "passenger_intents_spatial";
      const { error } = await supabase
        .from(table)
        .update({ status: "cancelled" })
        .eq("id", id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Trip cancelled successfully",
      });
      
      setSelected(null);
      loadData();
    } catch (error: any) {
      console.error("Cancel error:", error);
      toast({
        title: "Error",
        description: "Failed to cancel trip",
        variant: "destructive"
      });
    }
  }

  const stats = {
    total: data.length,
    drivers: data.filter(d => d.type === "driver_trip").length,
    passengers: data.filter(d => d.type === "passenger_intent").length,
    open: data.filter(d => d.status === "open" || d.status === "active").length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trips & Intents</h1>
          <p className="text-muted-foreground">Monitor and manage ride sharing requests</p>
        </div>
        <Button onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Driver Trips</CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.drivers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passenger Requests</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.passengers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open/Active</CardTitle>
            <RefreshCw className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            All trip postings and ride requests in chronological order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>

      {/* Details Drawer */}
      <Drawer open={!!selected} onOpenChange={() => setSelected(null)}>
        <DrawerContent className="max-w-lg mx-auto">
          {selected && (
            <>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  {selected.type === "driver_trip" ? "🚗" : "🚌"}
                  {selected.type === "driver_trip" ? "Driver Trip" : "Passenger Request"}
                </DrawerTitle>
              </DrawerHeader>
              
              <div className="px-6 pb-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">User:</span>
                    <span className="font-mono text-sm">{selected.user_phone}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Route:</span>
                    <span className="text-sm">{selected.from_text} → {selected.to_text}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Seats:</span>
                    <span>{selected.seats ?? "—"}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Price:</span>
                    <span>{selected.price_rwf?.toLocaleString() ?? "—"} RWF</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge>{selected.status}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Created:</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(selected.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  {(selected.status === "open" || selected.status === "active") && (
                    <Button onClick={() => forceMatch(selected.id)} className="flex-1">
                      Force Match
                    </Button>
                  )}
                  {selected.status !== "cancelled" && (
                    <Button 
                      variant="destructive" 
                      onClick={() => cancelSelected(selected.id, selected.type)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}