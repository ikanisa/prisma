import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  ReactFlow, 
  addEdge, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  Node,
  Edge,
  Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Megaphone, 
  Plus, 
  Play, 
  Pause, 
  BarChart3, 
  Users, 
  MessageSquare,
  Calendar,
  Target,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  trigger_event: string;
  trigger_conditions: any;
  is_active: boolean;
  created_at: string;
}

interface DripSequence {
  id: string;
  campaign_id: string;
  name: string;
  description?: string;
  trigger_event: string;
  is_active: boolean;
}

interface DripStep {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_hours: number;
  message_template: string;
  conditions: any;
  template_variables: any;
  is_active: boolean;
}

const CampaignsPage = () => {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    trigger_event: 'manual',
    trigger_conditions: {}
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // React Flow state for drip builder
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drip_sequences')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Campaign[];
    }
  });

  // Fetch drip steps for selected campaign
  const { data: dripSteps } = useQuery({
    queryKey: ['drip-steps', selectedCampaign],
    queryFn: async () => {
      if (!selectedCampaign) return [];
      
      const { data, error } = await supabase
        .from('drip_steps')
        .select('*')
        .eq('sequence_id', selectedCampaign)
        .order('step_order', { ascending: true });
      
      if (error) throw error;
      return data as DripStep[];
    },
    enabled: !!selectedCampaign
  });

  // Create campaign mutation
  const createCampaign = useMutation({
    mutationFn: async (campaign: typeof newCampaign) => {
      const { data, error } = await supabase
        .from('drip_sequences')
        .insert({
          name: campaign.name,
          description: campaign.description,
          trigger_event: campaign.trigger_event,
          trigger_conditions: campaign.trigger_conditions,
          is_active: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Campaign Created",
        description: "New marketing campaign has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      setNewCampaign({ name: '', description: '', trigger_event: 'manual', trigger_conditions: {} });
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create campaign.",
        variant: "destructive",
      });
    }
  });

  // Toggle campaign status
  const toggleCampaign = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('drip_sequences')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Campaign Updated",
        description: "Campaign status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
    }
  });

  // Create drip step
  const createDripStep = useMutation({
    mutationFn: async (step: Partial<DripStep>) => {
      const { data, error } = await supabase
        .from('drip_steps')
        .insert({
          sequence_id: selectedCampaign,
          step_order: (dripSteps?.length || 0) + 1,
          delay_hours: step.delay_hours || 24,
          message_template: step.message_template || '',
          conditions: step.conditions || {},
          template_variables: step.template_variables || {},
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-steps', selectedCampaign] });
      toast({
        title: "Step Added",
        description: "New drip step has been added to the campaign.",
      });
    }
  });

  // Convert drip steps to React Flow nodes
  React.useEffect(() => {
    if (dripSteps) {
      const flowNodes: Node[] = dripSteps.map((step, index) => ({
        id: step.id,
        type: 'default',
        position: { x: 250 * index, y: 100 },
        data: {
          label: (
            <div className="p-2 text-center">
              <div className="font-semibold text-sm">Step {step.step_order}</div>
              <div className="text-xs text-muted-foreground">+{step.delay_hours}h</div>
              <div className="text-xs mt-1 max-w-32 truncate">
                {step.message_template.slice(0, 30)}...
              </div>
            </div>
          )
        }
      }));

      const flowEdges: Edge[] = dripSteps.slice(0, -1).map((step, index) => ({
        id: `e${step.id}-${dripSteps[index + 1].id}`,
        source: step.id,
        target: dripSteps[index + 1].id,
        type: 'smoothstep'
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [dripSteps, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const selectedCampaignData = campaigns?.find(c => c.id === selectedCampaign);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Marketing Campaigns</h1>
          <p className="text-muted-foreground">Create and manage automated marketing drip campaigns</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Welcome Series"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your campaign..."
                />
              </div>
              <div>
                <Label htmlFor="trigger">Trigger Event</Label>
                <Select
                  value={newCampaign.trigger_event}
                  onValueChange={(value) => setNewCampaign(prev => ({ ...prev, trigger_event: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="signup">User Signup</SelectItem>
                    <SelectItem value="first_order">First Order</SelectItem>
                    <SelectItem value="abandoned_cart">Abandoned Cart</SelectItem>
                    <SelectItem value="inactive_user">Inactive User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => createCampaign.mutate(newCampaign)}
                disabled={createCampaign.isPending || !newCampaign.name}
                className="w-full"
              >
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaigns List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Campaigns ({campaigns?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaignsLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))
              ) : campaigns?.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCampaign === campaign.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedCampaign(campaign.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{campaign.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {campaign.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={campaign.is_active ? "default" : "secondary"} className="text-xs">
                          {campaign.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {campaign.trigger_event}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCampaign.mutate({ id: campaign.id, isActive: campaign.is_active });
                      }}
                    >
                      {campaign.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Builder */}
        <Card className="lg:col-span-2">
          {selectedCampaignData ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    {selectedCampaignData.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newStep = {
                          delay_hours: 24,
                          message_template: 'New message template...',
                          conditions: {},
                          template_variables: {}
                        };
                        createDripStep.mutate(newStep);
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Step
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="flow">
                  <TabsList className="mb-4">
                    <TabsTrigger value="flow">Visual Flow</TabsTrigger>
                    <TabsTrigger value="steps">Step Details</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="flow" className="h-96">
                    <div className="w-full h-full border rounded-lg">
                      <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        fitView
                        style={{ backgroundColor: "#f8f9fa" }}
                      >
                        <MiniMap />
                        <Controls />
                        <Background />
                      </ReactFlow>
                    </div>
                  </TabsContent>

                  <TabsContent value="steps">
                    <div className="space-y-4">
                      {dripSteps?.map((step) => (
                        <Card key={step.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Step {step.step_order}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  Delay: {step.delay_hours} hours
                                </span>
                              </div>
                              <Badge variant={step.is_active ? "default" : "secondary"}>
                                {step.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs font-medium">Message Template</Label>
                                <Textarea
                                  value={step.message_template}
                                  readOnly
                                  className="mt-1 text-sm"
                                  rows={3}
                                />
                              </div>
                              {Object.keys(step.template_variables || {}).length > 0 && (
                                <div>
                                  <Label className="text-xs font-medium">Template Variables</Label>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {Object.keys(step.template_variables || {}).map((variable) => (
                                      <Badge key={variable} variant="secondary" className="text-xs">
                                        {variable}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="analytics">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Enrolled</span>
                          </div>
                          <p className="text-2xl font-bold mt-2">0</p>
                          <p className="text-xs text-muted-foreground">Total enrollments</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Messages Sent</span>
                          </div>
                          <p className="text-2xl font-bold mt-2">0</p>
                          <p className="text-xs text-muted-foreground">This month</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Conversion</span>
                          </div>
                          <p className="text-2xl font-bold mt-2">0%</p>
                          <p className="text-xs text-muted-foreground">Campaign effectiveness</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-96">
              <div className="text-center">
                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Campaign</h3>
                <p className="text-muted-foreground">
                  Choose a campaign from the list to view and edit its drip sequence.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CampaignsPage;