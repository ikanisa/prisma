import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, TrendingUp, Users, MessageSquare, Target, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TemplateStats {
  name: string;
  totalSends: number;
  uniqueUsers: number;
  clickRate: number;
  conversionRate: number;
  engagement: number;
}

interface AnalyticsData {
  templateStats: TemplateStats[];
  topTemplates: Array<{
    name: string;
    engagement: number;
    clickRate: number;
    conversionRate: number;
  }>;
  engagementPatterns: {
    bestHours: Array<{ hour: number; engagement: number }>;
    bestDays: Array<{ day: string; engagement: number }>;
  };
  totalSends: number;
  uniqueUsers: number;
  avgResponseTime: number | null;
}

export default function TemplateAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('template-analytics-tracker', {
        body: { events: [] } // Empty events array to just get insights
      });

      if (error) throw error;

      if (data?.insights) {
        setAnalytics(data.insights);
      } else {
        // Mock data for development
        setAnalytics({
          templateStats: [
            {
              name: 'tpl_welcome_quick_v1',
              totalSends: 156,
              uniqueUsers: 134,
              clickRate: 0.72,
              conversionRate: 0.45,
              engagement: 0.85
            },
            {
              name: 'tpl_payments_quick_v1',
              totalSends: 89,
              uniqueUsers: 78,
              clickRate: 0.68,
              conversionRate: 0.52,
              engagement: 0.78
            },
            {
              name: 'tpl_driver_status_v1',
              totalSends: 67,
              uniqueUsers: 45,
              clickRate: 0.81,
              conversionRate: 0.63,
              engagement: 0.92
            }
          ],
          topTemplates: [
            { name: 'tpl_driver_status_v1', engagement: 0.92, clickRate: 0.81, conversionRate: 0.63 },
            { name: 'tpl_welcome_quick_v1', engagement: 0.85, clickRate: 0.72, conversionRate: 0.45 },
            { name: 'tpl_payments_quick_v1', engagement: 0.78, clickRate: 0.68, conversionRate: 0.52 }
          ],
          engagementPatterns: {
            bestHours: [
              { hour: 9, engagement: 45 },
              { hour: 14, engagement: 38 },
              { hour: 19, engagement: 42 }
            ],
            bestDays: [
              { day: 'Mon', engagement: 67 },
              { day: 'Wed', engagement: 52 },
              { day: 'Fri', engagement: 48 }
            ]
          },
          totalSends: 312,
          uniqueUsers: 257,
          avgResponseTime: 24.5
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch template analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEngagementColor = (rate: number) => {
    if (rate >= 0.8) return "text-green-600";
    if (rate >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getEngagementBadge = (rate: number) => {
    if (rate >= 0.8) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (rate >= 0.6) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No analytics data available</p>
            <Button onClick={fetchAnalytics} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Analytics</h1>
          <p className="text-muted-foreground">Performance insights for WhatsApp templates</p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sends</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSends}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">Reached</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.avgResponseTime ? `${analytics.avgResponseTime.toFixed(1)}s` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">User response</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Engagement</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.topTemplates && analytics.topTemplates.length > 0 
                ? Math.round(analytics.topTemplates[0].engagement * 100) + '%'
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.topTemplates && analytics.topTemplates.length > 0 
                ? analytics.topTemplates[0].name.replace('tpl_', '').replace('_v1', '')
                : 'No data'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Template Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Template Performance</CardTitle>
          <CardDescription>Click rates and conversions by template</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.templateStats && analytics.templateStats.length > 0 ? (
            <div className="space-y-4">
              {analytics.templateStats.map((template, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{template.name.replace('tpl_', '').replace('_v1', '')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {template.totalSends} sends • {template.uniqueUsers} unique users
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className={`text-lg font-bold ${getEngagementColor(template.clickRate)}`}>
                      {Math.round(template.clickRate * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Click Rate</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${getEngagementColor(template.conversionRate)}`}>
                      {Math.round(template.conversionRate * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Conversion</div>
                  </div>
                  <div className="text-center">
                    {getEngagementBadge(template.engagement)}
                  </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No template performance data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Patterns */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Best Hours for Engagement</CardTitle>
            <CardDescription>User engagement by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.engagementPatterns?.bestHours && analytics.engagementPatterns.bestHours.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.engagementPatterns.bestHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="engagement" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No engagement data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best Days for Engagement</CardTitle>
            <CardDescription>User engagement by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.engagementPatterns?.bestDays && analytics.engagementPatterns.bestDays.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.engagementPatterns.bestDays}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="engagement" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No engagement data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Templates</CardTitle>
          <CardDescription>Templates ranked by overall engagement score</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topTemplates && analytics.topTemplates.length > 0 ? (
            <div className="space-y-3">
              {analytics.topTemplates.map((template, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="font-medium">{template.name.replace('tpl_', '').replace('_v1', '')}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-muted-foreground">
                    {Math.round(template.engagement * 100)}% engagement
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(template.clickRate * 100)}% clicks
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(template.conversionRate * 100)}% conversions
                  </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No template performance data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}