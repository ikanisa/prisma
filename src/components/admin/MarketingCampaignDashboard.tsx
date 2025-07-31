import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Play, Pause, BarChart3, Users, Target, Clock } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  description: string;
  template_name: string;
  status: string;
  csat_threshold: number;
  priority: string;
  target_count: number;
  sent_count: number;
  click_rate: number;
  conversion_rate: number;
  created_at: string;
  scheduled_for: string;
}

interface CSATMetrics {
  averageScore: number;
  totalScores: number;
  distribution: { score: number; count: number }[];
}

interface FrequencyStats {
  totalUsers: number;
  optedOut: number;
  nearLimits: number;
}

export function MarketingCampaignDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [csatMetrics, setCSATMetrics] = useState<CSATMetrics | null>(null);
  const [frequencyStats, setFrequencyStats] = useState<FrequencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCampaigns(),
        loadCSATMetrics(),
        loadFrequencyStats()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      // Mock data for development until marketing tables are created
      const mockCampaigns: Campaign[] = [
        {
          id: '1',
          name: 'Welcome Series',
          description: 'Onboarding campaign for new users',
          template_name: 'tpl_welcome_quick_v1',
          status: 'active',
          target_count: 1000,
          sent_count: 756,
          click_rate: 34.2,
          conversion_rate: 12.8,
          csat_threshold: 7.0,
          priority: 'medium',
          created_at: new Date().toISOString(),
          scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          name: 'Payment Reminder',
          description: 'Remind users about pending payments',
          template_name: 'tpl_payment_reminder_v1',
          status: 'paused',
          target_count: 500,
          sent_count: 234,
          click_rate: 45.1,
          conversion_rate: 67.3,
          csat_threshold: 8.0,
          priority: 'high',
          created_at: new Date().toISOString(),
          scheduled_for: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setCampaigns(mockCampaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadCSATMetrics = async () => {
    try {
      // Mock CSAT data for development
      const mockDistribution = [
        { score: 1, count: 5 },
        { score: 2, count: 12 },
        { score: 3, count: 23 },
        { score: 4, count: 45 },
        { score: 5, count: 67 }
      ];

      setCSATMetrics({
        averageScore: 4.2,
        totalScores: 152,
        distribution: mockDistribution
      });
    } catch (error) {
      console.error('Error loading CSAT metrics:', error);
    }
  };

  const loadFrequencyStats = async () => {
    try {
      // Mock frequency stats for development
      setFrequencyStats({
        totalUsers: 1250,
        optedOut: 45,
        nearLimits: 23
      });
    } catch (error) {
      console.error('Error loading frequency stats:', error);
    }
  };

  const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    // Update campaign status in mock data
    setCampaigns(prev => prev.map(campaign => 
      campaign.id === campaignId 
        ? { ...campaign, status: newStatus }
        : campaign
    ));

    toast.success(`Campaign ${newStatus === 'active' ? 'activated' : 'paused'}`);
  };

  const triggerMarketingStrategy = async (phone: string, campaignType: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('marketing-template-strategy', {
        body: {
          phone,
          campaignType,
          triggerEvent: 'manual_test'
        }
      });

      if (error) {
        toast.error('Failed to trigger marketing strategy');
        return;
      }

      if (data.shouldSend) {
        toast.success(`Marketing message scheduled for ${phone}`);
      } else {
        toast.info(`Marketing blocked: ${data.reason}`);
      }
    } catch (error) {
      console.error('Error triggering marketing strategy:', error);
      toast.error('Failed to trigger marketing strategy');
    }
  };

  const runMarketingScheduler = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('marketing-scheduler');

      if (error) {
        toast.error('Failed to run marketing scheduler');
        return;
      }

      toast.success(`Scheduler processed ${data.processed} messages: ${data.results.sent} sent, ${data.results.skipped} skipped`);
      loadDashboardData();
    } catch (error) {
      console.error('Error running scheduler:', error);
      toast.error('Failed to run marketing scheduler');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Campaign Dashboard</h1>
          <p className="text-muted-foreground">
            Manage campaigns with CSAT gating and frequency controls
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runMarketingScheduler} variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            Run Scheduler
          </Button>
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {campaigns.length} total campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CSAT</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {csatMetrics?.averageScore || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              from {csatMetrics?.totalScores || 0} scores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users in System</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {frequencyStats?.totalUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {frequencyStats?.optedOut || 0} opted out
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Near Limits</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {frequencyStats?.nearLimits || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              users near frequency limits
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="csat">CSAT Analysis</TabsTrigger>
          <TabsTrigger value="frequency">Frequency Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Campaigns</CardTitle>
              <CardDescription>
                Manage your marketing campaigns with CSAT gating and timing controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{campaign.name}</h3>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                        <Badge variant="outline">
                          CSAT ≥ {campaign.csat_threshold}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{campaign.description}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Template: {campaign.template_name}</span>
                        <span>Priority: {campaign.priority}</span>
                        <span>Sent: {campaign.sent_count}/{campaign.target_count}</span>
                        <span>Click Rate: {campaign.click_rate.toFixed(1)}%</span>
                        <span>Conversion: {campaign.conversion_rate.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                      >
                        {campaign.status === 'active' ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CSAT Score Distribution</CardTitle>
              <CardDescription>
                Customer satisfaction scores affecting marketing eligibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              {csatMetrics && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{csatMetrics.averageScore}</div>
                    <p className="text-sm text-muted-foreground">Average CSAT Score</p>
                  </div>
                  <div className="space-y-2">
                    {csatMetrics.distribution.map((item) => (
                      <div key={item.score} className="flex items-center gap-4">
                        <div className="w-8 text-center">{item.score}★</div>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${(item.count / csatMetrics.totalScores) * 100}%`
                            }}
                          />
                        </div>
                        <div className="w-12 text-right text-sm text-muted-foreground">
                          {item.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frequency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequency Control Stats</CardTitle>
              <CardDescription>
                Monitor user frequency limits and opt-out status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {frequencyStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{frequencyStats.totalUsers}</div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{frequencyStats.optedOut}</div>
                    <p className="text-sm text-muted-foreground">Opted Out</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{frequencyStats.nearLimits}</div>
                    <p className="text-sm text-muted-foreground">Near Limits</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}