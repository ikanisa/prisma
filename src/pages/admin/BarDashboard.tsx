import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Clock, 
  Star,
  Utensils,
  Receipt
} from "lucide-react";

interface DashboardStats {
  todaySales: number;
  avgTicket: number;
  tipsPercent: number;
  activePatrons: number;
  totalOrders: number;
  avgRating: number;
  happyHourActive: boolean;
}

export default function BarDashboard() {
  const { barId } = useParams<{ barId: string }>();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    avgTicket: 0,
    tipsPercent: 0,
    activePatrons: 0,
    totalOrders: 0,
    avgRating: 0,
    happyHourActive: false
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (barId) {
      fetchDashboardStats();
    }
  }, [barId]);

  const fetchDashboardStats = async () => {
    if (!barId) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's sales data
      const { data: todayTabs, error: tabsError } = await supabase
        .from('bar_tabs')
        .select('total, tip, status, created_at')
        .eq('bar_id', barId)
        .gte('created_at', today.toISOString())
        .eq('status', 'closed');

      if (tabsError) throw tabsError;

      // Get active tabs count
      const { data: activeTabs, error: activeError } = await supabase
        .from('bar_tabs')
        .select('id')
        .eq('bar_id', barId)
        .in('status', ['open', 'pending_payment']);

      if (activeError) throw activeError;

      // Get business info for happy hour
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('extras')
        .eq('id', barId)
        .single();

      if (businessError) throw businessError;

      // Get recent feedback for ratings - simplified approach
      const { data: feedback } = await supabase
        .from('bar_feedback')
        .select('rating')
        .not('rating', 'is', null);

      // Calculate stats
      const totalSales = todayTabs?.reduce((sum, tab) => sum + (tab.total || 0), 0) || 0;
      const totalTips = todayTabs?.reduce((sum, tab) => sum + (tab.tip || 0), 0) || 0;
      const avgTicket = todayTabs?.length ? totalSales / todayTabs.length : 0;
      const tipsPercent = totalSales > 0 ? (totalTips / totalSales) * 100 : 0;
      const avgRating = feedback && feedback.length > 0
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
        : 0;

      setStats({
        todaySales: totalSales,
        avgTicket: Math.round(avgTicket),
        tipsPercent: Math.round(tipsPercent * 10) / 10,
        activePatrons: activeTabs?.length || 0,
        totalOrders: todayTabs?.length || 0,
        avgRating: Math.round(avgRating * 10) / 10,
        happyHourActive: business?.extras?.happy_hour?.active || false
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleHappyHour = async () => {
    if (!barId) return;

    try {
      const newStatus = !stats.happyHourActive;
      
      // Get current business data
      const { data: business } = await supabase
        .from('businesses')
        .select('extras')
        .eq('id', barId)
        .single();

      const currentExtras = business?.extras || {};
      const happyHour = currentExtras.happy_hour || { discount: 20 };

      const { error } = await supabase
        .from('businesses')
        .update({
          extras: {
            ...currentExtras,
            happy_hour: {
              ...happyHour,
              active: newStatus,
              last_toggled: new Date().toISOString()
            }
          }
        })
        .eq('id', barId);

      if (error) throw error;

      setStats(prev => ({ ...prev, happyHourActive: newStatus }));
      
      toast({
        title: "Success",
        description: `Happy Hour ${newStatus ? 'activated' : 'deactivated'}`,
      });

    } catch (error) {
      console.error('Error toggling happy hour:', error);
      toast({
        title: "Error",
        description: "Failed to toggle happy hour",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bar Revenue Dashboard</h1>
        <p className="text-muted-foreground">Today's performance overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Today Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySales.toLocaleString()} RWF</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Avg Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTicket.toLocaleString()} RWF</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Tips %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tipsPercent}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Patrons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePatrons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Happy Hour Control */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Happy Hour Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Happy Hour Status</div>
              <div className="text-sm text-muted-foreground">
                {stats.happyHourActive 
                  ? "Currently active - 2-for-1 deals and discounts" 
                  : "Currently inactive - regular pricing"
                }
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={stats.happyHourActive ? "default" : "secondary"}>
                {stats.happyHourActive ? "ACTIVE" : "INACTIVE"}
              </Badge>
              <Switch
                checked={stats.happyHourActive}
                onCheckedChange={toggleHappyHour}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={() => window.location.href = `/admin/bars/${barId}/tables`}>
              View Tables
            </Button>
            <Button onClick={() => window.location.href = `/admin/bars/${barId}/kitchen`}>
              Kitchen Display
            </Button>
            <Button onClick={() => window.location.href = `/admin/bars/${barId}/patrons`}>
              Patron CRM
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}