import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { useSecureQuery } from '@/hooks/useSecureQuery';
import { Calendar, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  max_participants: number;
  current_participants: number;
  status: 'draft' | 'published' | 'cancelled';
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  target_audience: string;
  status: 'active' | 'paused' | 'completed';
  sent_count: number;
  delivered_count: number;
  created_at: string;
}

export default function ContentDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: events } = useSecureQuery<Event>({
    table: 'events',
    queryKey: ['events'],
    requireAdmin: true
  });

  const { data: campaigns } = useSecureQuery<Campaign>({
    table: 'marketing_campaigns',
    queryKey: ['campaigns'],
    requireAdmin: true
  });

  const eventColumns: ColumnDef<Event>[] = [
    {
      accessorKey: 'title',
      header: 'Event Title',
    },
    {
      accessorKey: 'event_date',
      header: 'Date',
      cell: ({ row }) => new Date(row.getValue('event_date')).toLocaleDateString(),
    },
    {
      accessorKey: 'location',
      header: 'Location',
    },
    {
      accessorKey: 'current_participants',
      header: 'Participants',
      cell: ({ row }) => {
        const current = row.getValue('current_participants') as number;
        const max = row.original.max_participants;
        return `${current}/${max}`;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={
            status === 'published' ? 'default' : 
            status === 'draft' ? 'secondary' : 'destructive'
          }>
            {status}
          </Badge>
        );
      },
    },
  ];

  const campaignColumns: ColumnDef<Campaign>[] = [
    {
      accessorKey: 'name',
      header: 'Campaign Name',
    },
    {
      accessorKey: 'target_audience',
      header: 'Target Audience',
    },
    {
      accessorKey: 'sent_count',
      header: 'Sent',
    },
    {
      accessorKey: 'delivered_count',
      header: 'Delivered',
      cell: ({ row }) => {
        const delivered = row.getValue('delivered_count') as number;
        const sent = row.original.sent_count;
        const rate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
        return `${delivered} (${rate}%)`;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={
            status === 'active' ? 'default' : 
            status === 'paused' ? 'secondary' : 'outline'
          }>
            {status}
          </Badge>
        );
      },
    },
  ];

  const stats = [
    {
      title: "Total Events",
      value: events?.data?.length?.toString() || "0",
      icon: Calendar,
      change: "+3",
      changeType: "positive" as const
    },
    {
      title: "Active Campaigns",
      value: campaigns?.data?.filter(c => c.status === 'active').length?.toString() || "0",
      icon: MessageSquare,
      change: "+2",
      changeType: "positive" as const
    },
    {
      title: "Event Participants",
      value: events?.data?.reduce((sum, event) => sum + event.current_participants, 0)?.toString() || "0",
      icon: Users,
      change: "+45",
      changeType: "positive" as const
    },
    {
      title: "Campaign Reach",
      value: campaigns?.data?.reduce((sum, campaign) => sum + campaign.delivered_count, 0)?.toString() || "0",
      icon: TrendingUp,
      change: "+1.2k",
      changeType: "positive" as const
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Content & Events</h1>
          <p className="text-muted-foreground">Manage events, campaigns, and content</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            New Event
          </Button>
          <Button>
            <MessageSquare className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="campaigns">Marketing Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <DataTable
            title="Events"
            columns={eventColumns}
            data={events?.data || []}
            searchPlaceholder="Search events..."
          />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <DataTable
            title="Marketing Campaigns"
            columns={campaignColumns}
            data={campaigns?.data || []}
            searchPlaceholder="Search campaigns..."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}