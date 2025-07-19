import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, MessageSquare, Users, Clock, AlertCircle, CheckCircle, Home, Car } from "lucide-react";

interface DashboardMetrics {
  conversations: {
    active: number;
    ended: number;
    total_24h: number;
  };
  queue: {
    queued: number;
    processing: number;
    failed: number;
    total: number;
  };
  quality: {
    average_score: number;
    total_evaluations: number;
    low_quality_count: number;
  };
  handoffs: {
    pending: number;
    resolved_24h: number;
    total: number;
  };
  contacts: {
    total: number;
    opted_out: number;
    active: number;
  };
  listings: {
    properties: {
      total: number;
      published: number;
      draft: number;
    };
    vehicles: {
      total: number;
      published: number;
      draft: number;
    };
  };
}

export default function SystemMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadMetrics() {
    try {
      const { data, error } = await supabase.functions.invoke('system-metrics', {
        body: { action: 'dashboard' }
      });

      if (error) throw error;
      setMetrics(data);
    } catch (error) {
      console.error('Error loading metrics:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load system metrics"
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!metrics) {
    return <div>No metrics available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Metrics</h1>
        <Badge variant="secondary">
          Live • Updated {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {/* Conversations */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversations (24h)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{metrics.conversations.active}</p>
                </div>
                <Activity className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{metrics.conversations.ended}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total 24h</p>
                  <p className="text-2xl font-bold">{metrics.conversations.total_24h}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message Queue */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Message Queue
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Queued</p>
                  <p className="text-2xl font-bold">{metrics.queue.queued}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold">{metrics.queue.processing}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold">{metrics.queue.failed}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{metrics.queue.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contacts & Human Handoffs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contacts
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold">{metrics.contacts.active}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Opted Out</p>
                    <p className="text-2xl font-bold">{metrics.contacts.opted_out}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Human Handoffs</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{metrics.handoffs.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Resolved 24h</p>
                    <p className="text-2xl font-bold">{metrics.handoffs.resolved_24h}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Listings</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Published:</span>
                  <Badge variant="secondary">{metrics.listings.properties.published}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Drafts:</span>
                  <Badge variant="outline">{metrics.listings.properties.draft}</Badge>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{metrics.listings.properties.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Published:</span>
                  <Badge variant="secondary">{metrics.listings.vehicles.published}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Drafts:</span>
                  <Badge variant="outline">{metrics.listings.vehicles.draft}</Badge>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{metrics.listings.vehicles.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quality Score */}
      <Card>
        <CardHeader>
          <CardTitle>AI Response Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {(metrics.quality.average_score * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{metrics.quality.total_evaluations}</p>
              <p className="text-sm text-muted-foreground">Total Evaluations</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{metrics.quality.low_quality_count}</p>
              <p className="text-sm text-muted-foreground">Low Quality</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}