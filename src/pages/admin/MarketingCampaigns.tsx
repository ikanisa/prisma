import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Play, Pause, BarChart3, Users, Send } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export default function MarketingCampaigns() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    template_text: '',
    interval_min: 360,
    max_sends: 6
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select(`
          *,
          campaign_subscribers(count)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    }
  })

  const { data: subscribers } = useQuery({
    queryKey: ['campaign-subscribers-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_subscribers')
        .select('campaign_id, status')
      
      if (error) throw error
      return data
    }
  })

  const createCampaign = useMutation({
    mutationFn: async (campaign: any) => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert({
          ...campaign,
          owner_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'draft'
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] })
      setIsCreateOpen(false)
      setNewCampaign({
        name: '',
        description: '',
        template_text: '',
        interval_min: 360,
        max_sends: 6
      })
      toast({
        title: "Campaign created",
        description: "Your marketing campaign has been created successfully"
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create campaign: ${error.message}`,
        variant: "destructive"
      })
    }
  })

  const updateCampaignStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .update({ 
          status,
          start_at: status === 'running' ? new Date().toISOString() : undefined
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] })
      toast({
        title: "Campaign updated",
        description: "Campaign status has been updated"
      })
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500'
      case 'scheduled': return 'bg-blue-500'
      case 'running': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'completed': return 'bg-purple-500'
      default: return 'bg-gray-400'
    }
  }

  const getSubscriberStats = (campaignId: string) => {
    const campaignSubs = subscribers?.filter(s => s.campaign_id === campaignId) || []
    return {
      total: campaignSubs.length,
      active: campaignSubs.filter(s => s.status === 'active').length,
      opted_out: campaignSubs.filter(s => s.status === 'opted_out').length,
      completed: campaignSubs.filter(s => s.status === 'completed').length
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createCampaign.mutate(newCampaign)
  }

  if (isLoading) {
    return <div>Loading campaigns...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage WhatsApp marketing drip campaigns
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Marketing Campaign</DialogTitle>
              <DialogDescription>
                Set up a new WhatsApp drip campaign to engage your audience
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  placeholder="Summer Promo 2024"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                  placeholder="Describe your campaign..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template">Message Template</Label>
                <Textarea
                  id="template"
                  value={newCampaign.template_text}
                  onChange={(e) => setNewCampaign({...newCampaign, template_text: e.target.value})}
                  placeholder="Hi {{first_name}}! Check out our latest offers..."
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interval">Interval (minutes)</Label>
                  <Input
                    id="interval"
                    type="number"
                    value={newCampaign.interval_min}
                    onChange={(e) => setNewCampaign({...newCampaign, interval_min: parseInt(e.target.value)})}
                    min="60"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max_sends">Max Messages</Label>
                  <Input
                    id="max_sends"
                    type="number"
                    value={newCampaign.max_sends}
                    onChange={(e) => setNewCampaign({...newCampaign, max_sends: parseInt(e.target.value)})}
                    min="1"
                    max="20"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCampaign.isPending}>
                  {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns?.filter(c => c.status === 'running').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscribers?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscribers?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>
            Manage your WhatsApp marketing campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns?.map((campaign) => {
                const stats = getSubscriberStats(campaign.id)
                return (
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
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {Math.floor(campaign.interval_min / 60)}h {campaign.interval_min % 60}m
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{stats.total} total</div>
                        <div className="text-muted-foreground">
                          {stats.active} active, {stats.opted_out} opted out
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {stats.completed} / {stats.total} completed
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {campaign.status === 'draft' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateCampaignStatus.mutate({ id: campaign.id, status: 'running' })}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        )}
                        {campaign.status === 'running' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateCampaignStatus.mutate({ id: campaign.id, status: 'paused' })}
                          >
                            <Pause className="h-3 w-3 mr-1" />
                            Pause
                          </Button>
                        )}
                        {campaign.status === 'paused' && (
                          <Button 
                            size="sm"
                            onClick={() => updateCampaignStatus.mutate({ id: campaign.id, status: 'running' })}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Resume
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Analytics
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}