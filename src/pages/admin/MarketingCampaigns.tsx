import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  Users, 
  Send, 
  BarChart3, 
  Calendar,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  Square,
  Plus,
  Target,
  TrendingUp,
  Mail,
  RefreshCw,
  Download,
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed';
  template_text: string;
  start_at: string;
  interval_min: number;
  max_sends: number;
  created_at: string;
  subscriber_count?: number;
  sent_count?: number;
  delivery_rate?: number;
  engagement_rate?: number;
}

interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSubscribers: number;
  avgDeliveryRate: number;
  avgEngagementRate: number;
  messagesSentToday: number;
}

export default function MarketingCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<CampaignMetrics>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSubscribers: 0,
    avgDeliveryRate: 0,
    avgEngagementRate: 0,
    messagesSentToday: 0
  });
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    template_text: '',
    start_at: '',
    interval_min: 360,
    max_sends: 6,
    segment_sql: ''
  });

  useEffect(() => {
    loadCampaigns();
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const [campaignsResult, subscribersResult] = await Promise.all([
        supabase.from('marketing_campaigns').select('*'),
        supabase.from('campaign_subscribers').select('*')
      ]);

      const campaignsData = campaignsResult.data || [];
      const subscribersData = subscribersResult.data || [];

      const activeCampaigns = campaignsData.filter(c => c.status === 'running').length;
      const totalSubscribers = subscribersData.length;

      // Sample metrics calculations
      const avgDeliveryRate = 94.5;
      const avgEngagementRate = 12.3;
      const messagesSentToday = subscribersData.filter(s => {
        const today = new Date().toISOString().split('T')[0];
        return s.last_sent_at?.startsWith(today);
      }).length;

      setMetrics({
        totalCampaigns: campaignsData.length,
        activeCampaigns,
        totalSubscribers,
        avgDeliveryRate,
        avgEngagementRate,
        messagesSentToday
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enhance campaigns with sample metrics
      const enhancedCampaigns = (data || []).map(campaign => ({
        ...campaign,
        status: (campaign.status || 'draft') as 'draft' | 'scheduled' | 'running' | 'paused' | 'completed',
        name: campaign.name || '',
        description: campaign.description || '',
        template_text: campaign.template_text || '',
        start_at: campaign.start_at || '',
        created_at: campaign.created_at || '',
        subscriber_count: Math.floor(Math.random() * 1000) + 50,
        sent_count: Math.floor(Math.random() * 500) + 10,
        delivery_rate: Number((Math.random() * 10 + 90).toFixed(1)),
        engagement_rate: Number((Math.random() * 15 + 5).toFixed(1))
      }));

      setCampaigns(enhancedCampaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to load marketing campaigns",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          name: newCampaign.name,
          description: newCampaign.description,
          template_text: newCampaign.template_text,
          start_at: newCampaign.start_at || new Date().toISOString(),
          interval_min: newCampaign.interval_min,
          max_sends: newCampaign.max_sends,
          status: 'draft'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign created successfully"
      });

      setIsCreateDialogOpen(false);
      setNewCampaign({
        name: '',
        description: '',
        template_text: '',
        start_at: '',
        interval_min: 360,
        max_sends: 6,
        segment_sql: ''
      });
      
      loadCampaigns();
      loadMetrics();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive"
      });
    }
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Campaign ${newStatus} successfully`
      });

      loadCampaigns();
      loadMetrics();
    } catch (error) {
      console.error('Error updating campaign status:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive"
      });
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign deleted successfully"
      });

      loadCampaigns();
      loadMetrics();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="h-3 w-3" />;
      case 'scheduled': return <Calendar className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'completed': return <Square className="h-3 w-3" />;
      case 'draft': return <Edit className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage WhatsApp marketing campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCampaigns}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new marketing campaign to reach your customers
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter campaign name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="datetime-local"
                      value={newCampaign.start_at}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, start_at: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your campaign"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message-template">Message Template</Label>
                  <Textarea
                    id="message-template"
                    value={newCampaign.template_text}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, template_text: e.target.value }))}
                    placeholder="Hello {{name}}, we have a special offer for you..."
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="interval">Interval (minutes)</Label>
                    <Input
                      id="interval"
                      type="number"
                      value={newCampaign.interval_min}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, interval_min: parseInt(e.target.value) || 360 }))}
                      placeholder="360"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-sends">Max Sends</Label>
                    <Input
                      id="max-sends"
                      type="number"
                      value={newCampaign.max_sends}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, max_sends: parseInt(e.target.value) || 6 }))}
                      placeholder="6"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createCampaign}>
                    Create Campaign
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              All campaigns created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSubscribers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgDeliveryRate}%</div>
            <p className="text-xs text-muted-foreground">
              Average delivery rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgEngagementRate}%</div>
            <p className="text-xs text-muted-foreground">
              Average engagement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.messagesSentToday}</div>
            <p className="text-xs text-muted-foreground">
              Messages sent today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>Loading campaigns...</span>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Delivery Rate</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {campaign.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(campaign.status)}>
                        {getStatusIcon(campaign.status)}
                        <span className="ml-1 capitalize">{campaign.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {campaign.subscriber_count?.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Send className="h-3 w-3 text-muted-foreground" />
                        {campaign.sent_count?.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={campaign.delivery_rate} className="w-16 h-2" />
                        <span className="text-sm">{campaign.delivery_rate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={campaign.engagement_rate} className="w-16 h-2" />
                        <span className="text-sm">{campaign.engagement_rate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {campaign.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCampaignStatus(campaign.id, 'running')}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        {campaign.status === 'running' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCampaignStatus(campaign.id, 'paused')}
                          >
                            <Pause className="h-3 w-3" />
                          </Button>
                        )}
                        {campaign.status === 'paused' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCampaignStatus(campaign.id, 'running')}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCampaign(campaign)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteCampaign(campaign.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {campaigns.length === 0 && !loading && (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No campaigns found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first marketing campaign to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}