import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignStats } from "@/components/admin/messaging/CampaignStats";
import { TemplateManager } from "@/components/admin/messaging/TemplateManager";
import { QuickActions } from "@/components/admin/messaging/QuickActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Search, Plus, Play, Pause, Settings, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  recipients: number;
  sent: number;
  opened: number;
  clicked: number;
  created: string;
  lastSent: string;
}

const MessagingCampaigns = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      // Fetch campaign data from Supabase
      const { data, error } = await supabase
        .from('campaign_messages')
        .select(`
          *,
          campaign_id
        `)
        .order('scheduled_for', { ascending: false });

      if (error) throw error;

      // Process and aggregate campaign data
      const campaignMap = new Map();
      
      data?.forEach(message => {
        const campaignId = message.campaign_id || 'default';
        if (!campaignMap.has(campaignId)) {
          campaignMap.set(campaignId, {
            id: campaignId,
            name: `Campaign ${campaignId.slice(0, 8)}`,
            type: "Automated",
            status: "Active",
            recipients: 0,
            sent: 0,
            opened: 0,
            clicked: 0,
            created: message.scheduled_for?.split('T')[0] || new Date().toISOString().split('T')[0],
            lastSent: message.sent_at?.split('T')[0] || ''
          });
        }
        
        const campaign = campaignMap.get(campaignId);
        campaign.recipients++;
        if (message.status === 'sent' || message.status === 'delivered') campaign.sent++;
        if (message.delivered_at) campaign.opened++;
        if (message.responded_at) campaign.clicked++;
      });

      setCampaigns(Array.from(campaignMap.values()));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to fetch campaign data');
      
      // Fallback mock data
      setCampaigns([
        {
          id: "1",
          name: "Welcome New Users",
          type: "Automated",
          status: "Active",
          recipients: 1250,
          sent: 1150,
          opened: 892,
          clicked: 234,
          created: "2024-01-15",
          lastSent: "2024-01-29"
        },
        {
          id: "2", 
          name: "Payment Reminders",
          type: "Scheduled",
          status: "Active",
          recipients: 456,
          sent: 456,
          opened: 234,
          clicked: 45,
          created: "2024-01-10",
          lastSent: "2024-01-28"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      accessorKey: "name",
      header: "Campaign Name",
    },
    {
      accessorKey: "type", 
      header: "Type",
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue("type")}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.getValue("status") as string;
        const variant = status === "Active" ? "default" : 
                      status === "Paused" ? "secondary" : 
                      "outline";
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: "recipients",
      header: "Recipients",
    },
    {
      accessorKey: "sent",
      header: "Sent",
    },
    {
      accessorKey: "opened", 
      header: "Opened",
    },
    {
      accessorKey: "clicked",
      header: "Clicked",
    },
    {
      accessorKey: "lastSent",
      header: "Last Sent",
    },
  ];

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messaging & Campaigns</h1>
          <p className="text-muted-foreground">
            Manage WhatsApp templates, campaigns and automated user journeys
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Overview */}
      <CampaignStats />

      {/* Main Content Tabs */}
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <TemplateManager />
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          <QuickActions />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          {/* Filters and Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="automated">Automated</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="one-time">One-time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Management</CardTitle>
              <CardDescription>
                View and manage all your messaging campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <DataTable columns={columns} data={filteredCampaigns} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MessagingCampaigns;