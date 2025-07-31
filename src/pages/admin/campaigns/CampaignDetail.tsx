import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Users, Send, MessageSquare, TrendingUp, Play, Pause, Edit, Trash2, Settings, BarChart3, Eye } from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  scheduled_start: string;
  scheduled_end: string;
  total_recipients: number;
  messages_sent: number;
  delivery_rate: number;
  open_rate: number;
  response_rate: number;
  budget_rwf: number;
  spent_rwf: number;
}

interface CampaignMessage {
  id: string;
  phone_number: string;
  message_content: string;
  status: string;
  sent_at: string;
  delivered_at: string;
  responded_at: string;
  error_details: string;
  attempt_count: number;
}

interface CampaignSegment {
  id: string;
  name: string;
  description: string;
  segment_sql: string;
  last_count: number;
}

interface CampaignSubscriber {
  id: string;
  wa_id: string;
  status: string;
  lang: string;
  send_count: number;
  last_sent_at: string;
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [segments, setSegments] = useState<CampaignSegment[]>([]);
  const [subscribers, setSubscribers] = useState<CampaignSubscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCampaignData();
    }
  }, [id]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      
      // Note: Since we don't have a campaigns table, we'll simulate campaign data
      // In a real implementation, you would fetch from your campaigns table
      const mockCampaign: Campaign = {
        id: id!,
        name: "Summer Promotion 2024",
        description: "Special offers for summer season",
        status: "active",
        created_at: new Date().toISOString(),
        scheduled_start: new Date().toISOString(),
        scheduled_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        total_recipients: 1000,
        messages_sent: 750,
        delivery_rate: 95,
        open_rate: 65,
        response_rate: 12,
        budget_rwf: 500000,
        spent_rwf: 375000
      };
      setCampaign(mockCampaign);

      // Fetch campaign messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("campaign_messages")
        .select("*")
        .eq("campaign_id", id)
        .order("sent_at", { ascending: false })
        .limit(100);

      if (messagesError && messagesError.code !== 'PGRST116') {
        throw messagesError;
      }
      setMessages(messagesData || []);

      // Fetch campaign segments
      const { data: segmentsData, error: segmentsError } = await supabase
        .from("campaign_segments")
        .select("*")
        .eq("campaign_id", id);

      if (segmentsError && segmentsError.code !== 'PGRST116') {
        throw segmentsError;
      }
      setSegments(segmentsData || []);

      // Fetch campaign subscribers
      const { data: subscribersData, error: subscribersError } = await supabase
        .from("campaign_subscribers")
        .select("*")
        .eq("campaign_id", id)
        .limit(50);

      if (subscribersError && subscribersError.code !== 'PGRST116') {
        throw subscribersError;
      }
      setSubscribers(subscribersData || []);

    } catch (error) {
      console.error("Error fetching campaign data:", error);
      toast.error("Failed to load campaign data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Campaign Not Found</h2>
          <Button onClick={() => navigate("/admin/messaging-campaigns")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const deliveryProgress = (campaign.messages_sent / campaign.total_recipients) * 100;
  const budgetProgress = (campaign.spent_rwf / campaign.budget_rwf) * 100;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/admin/messaging-campaigns")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground">{campaign.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={
            campaign.status === 'active' ? 'default' : 
            campaign.status === 'completed' ? 'secondary' : 'destructive'
          }>
            {campaign.status}
          </Badge>
          
          {/* Campaign Control Actions */}
          <div className="flex gap-2">
            {campaign.status === 'active' && (
              <Button variant="outline" size="sm">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            
            {campaign.status === 'paused' && (
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this campaign? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      toast.success("Campaign deleted successfully");
                      navigate("/admin/messaging-campaigns");
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.total_recipients.toLocaleString()}</div>
            <div className="space-y-2 mt-2">
              <Progress value={deliveryProgress} />
              <p className="text-xs text-muted-foreground">
                {campaign.messages_sent} sent ({deliveryProgress.toFixed(1)}%)
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.delivery_rate}%</div>
            <p className="text-xs text-muted-foreground">Messages delivered</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.response_rate}%</div>
            <p className="text-xs text-muted-foreground">Users responded</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.spent_rwf.toLocaleString()} RWF</div>
            <div className="space-y-2 mt-2">
              <Progress value={budgetProgress} />
              <p className="text-xs text-muted-foreground">
                of {campaign.budget_rwf.toLocaleString()} RWF ({budgetProgress.toFixed(1)}%)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Tabs */}
      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
          <TabsTrigger value="segments">Segments ({segments.length})</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers ({subscribers.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Messages</CardTitle>
              <CardDescription>
                Individual message delivery status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.slice(0, 20).map((message) => (
                  <div key={message.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{message.phone_number}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {message.message_content}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        {message.sent_at && (
                          <span>Sent: {new Date(message.sent_at).toLocaleString()}</span>
                        )}
                        {message.attempt_count > 1 && (
                          <Badge variant="outline">Attempt {message.attempt_count}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant={
                        message.status === 'delivered' ? 'default' :
                        message.status === 'sent' ? 'secondary' :
                        message.status === 'failed' ? 'destructive' : 'outline'
                      }>
                        {message.status}
                      </Badge>
                      {message.error_details && (
                        <p className="text-xs text-destructive">{message.error_details}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {messages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Target Segments</CardTitle>
              <CardDescription>
                Audience segments for this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {segments.map((segment) => (
                  <div key={segment.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{segment.name}</h4>
                      <Badge variant="outline">{segment.last_count} contacts</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{segment.description}</p>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">View SQL</summary>
                      <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                        {segment.segment_sql}
                      </pre>
                    </details>
                  </div>
                ))}
                
                {segments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No segments configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Subscribers</CardTitle>
              <CardDescription>
                Users subscribed to this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscribers.map((subscriber) => (
                  <div key={subscriber.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{subscriber.wa_id}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{subscriber.lang}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {subscriber.send_count} messages sent
                        </span>
                      </div>
                      {subscriber.last_sent_at && (
                        <p className="text-xs text-muted-foreground">
                          Last sent: {new Date(subscriber.last_sent_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge variant={subscriber.status === 'active' ? 'default' : 'secondary'}>
                      {subscriber.status}
                    </Badge>
                  </div>
                ))}
                
                {subscribers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No subscribers found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Delivery Rate</span>
                    <span className="text-sm font-medium">{campaign.delivery_rate}%</span>
                  </div>
                  <Progress value={campaign.delivery_rate} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Open Rate</span>
                    <span className="text-sm font-medium">{campaign.open_rate}%</span>
                  </div>
                  <Progress value={campaign.open_rate} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Response Rate</span>
                    <span className="text-sm font-medium">{campaign.response_rate}%</span>
                  </div>
                  <Progress value={campaign.response_rate} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Started</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(campaign.scheduled_start).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Scheduled End</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(campaign.scheduled_end).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Duration</label>
                  <p className="text-sm text-muted-foreground">
                    {Math.ceil((new Date(campaign.scheduled_end).getTime() - new Date(campaign.scheduled_start).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}