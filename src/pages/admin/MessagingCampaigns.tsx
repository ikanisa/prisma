import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Search, Plus, Play, Pause, Settings, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MessagingCampaigns = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock campaign data
  const campaigns = [
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
      name: "Payment Reminder",
      type: "Scheduled",
      status: "Paused",
      recipients: 456,
      sent: 456,
      opened: 234,
      clicked: 45,
      created: "2024-01-10",
      lastSent: "2024-01-28"
    },
    {
      id: "3",
      name: "Product Promotion",
      type: "One-time",
      status: "Completed", 
      recipients: 2300,
      sent: 2300,
      opened: 1456,
      clicked: 378,
      created: "2024-01-05",
      lastSent: "2024-01-27"
    }
  ];

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
          <h1 className="text-3xl font-bold tracking-tight">Messaging Campaigns</h1>
          <p className="text-muted-foreground">
            Manage WhatsApp messaging campaigns and automated workflows
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              67% of total campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4,906</div>
            <p className="text-xs text-muted-foreground">
              +19% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.4%</div>
            <p className="text-xs text-muted-foreground">
              +5.2% from last month
            </p>
          </CardContent>
        </Card>
      </div>

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
          <DataTable columns={columns} data={filteredCampaigns} />
        </CardContent>
      </Card>
    </div>
  );
};

export default MessagingCampaigns;