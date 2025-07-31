import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Play, Pause, Square, BarChart3, Users, Target, TrendingUp, Settings, Eye, Edit, Trash2, Flag, TestTube, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  traffic_split: number;
  start_date: string;
  end_date?: string;
  variants: ExperimentVariant[];
  metrics: ExperimentMetric[];
  created_at: string;
}

interface ExperimentVariant {
  id: string;
  name: string;
  traffic_percentage: number;
  config: Record<string, any>;
  conversions: number;
  participants: number;
}

interface ExperimentMetric {
  name: string;
  value: number;
  change: number;
  significant: boolean;
}

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  rollout_percentage: number;
  conditions: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("experiments");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Mock data for now - in production, this would come from your experiments table
      setExperiments([
        {
          id: "1",
          name: "Payment Flow Optimization",
          description: "Testing simplified vs detailed payment confirmation flows",
          status: "running",
          traffic_split: 50,
          start_date: "2024-01-15",
          variants: [
            {
              id: "1a",
              name: "Control (Current)",
              traffic_percentage: 50,
              config: { flow: "detailed" },
              conversions: 287,
              participants: 1420
            },
            {
              id: "1b", 
              name: "Simplified Flow",
              traffic_percentage: 50,
              config: { flow: "simplified" },
              conversions: 312,
              participants: 1380
            }
          ],
          metrics: [
            { name: "Conversion Rate", value: 22.6, change: 2.3, significant: true },
            { name: "Time to Complete", value: 45, change: -12, significant: true },
            { name: "Drop-off Rate", value: 15.2, change: -3.1, significant: false }
          ],
          created_at: "2024-01-15T10:00:00Z"
        },
        {
          id: "2",
          name: "Agent Response Tone",
          description: "Testing formal vs casual agent communication styles",
          status: "paused",
          traffic_split: 30,
          start_date: "2024-01-10",
          variants: [
            {
              id: "2a",
              name: "Formal Tone",
              traffic_percentage: 50,
              config: { tone: "formal" },
              conversions: 156,
              participants: 890
            },
            {
              id: "2b",
              name: "Casual Tone", 
              traffic_percentage: 50,
              config: { tone: "casual" },
              conversions: 168,
              participants: 920
            }
          ],
          metrics: [
            { name: "User Satisfaction", value: 4.2, change: 0.3, significant: false },
            { name: "Session Duration", value: 8.5, change: 1.2, significant: true },
            { name: "Task Completion", value: 89.3, change: 2.1, significant: false }
          ],
          created_at: "2024-01-10T10:00:00Z"
        }
      ]);

      setFeatureFlags([
        {
          id: "1",
          name: "Enhanced QR Codes",
          key: "enhanced_qr_codes",
          description: "Show enhanced QR codes with branding",
          enabled: true,
          rollout_percentage: 75,
          conditions: { user_type: "premium" },
          created_at: "2024-01-01T10:00:00Z",
          updated_at: "2024-01-15T10:00:00Z"
        },
        {
          id: "2",
          name: "Voice Messages",
          key: "voice_messages",
          description: "Enable voice message support in WhatsApp",
          enabled: false,
          rollout_percentage: 0,
          conditions: {},
          created_at: "2024-01-05T10:00:00Z",
          updated_at: "2024-01-05T10:00:00Z"
        },
        {
          id: "3",
          name: "Advanced Analytics",
          key: "advanced_analytics",
          description: "Show detailed analytics dashboard",
          enabled: true,
          rollout_percentage: 100,
          conditions: { role: "admin" },
          created_at: "2024-01-03T10:00:00Z", 
          updated_at: "2024-01-12T10:00:00Z"
        }
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch experiments data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateExperimentStatus = async (experimentId: string, status: Experiment['status']) => {
    try {
      // In production, this would update the database
      setExperiments(prev => 
        prev.map(exp => 
          exp.id === experimentId ? { ...exp, status } : exp
        )
      );
      
      toast({
        title: "Success",
        description: `Experiment ${status === 'running' ? 'started' : status === 'paused' ? 'paused' : 'stopped'}`,
      });
    } catch (error) {
      console.error("Error updating experiment:", error);
      toast({
        title: "Error",
        description: "Failed to update experiment status",
        variant: "destructive"
      });
    }
  };

  const toggleFeatureFlag = async (flagId: string, enabled: boolean) => {
    try {
      setFeatureFlags(prev =>
        prev.map(flag =>
          flag.id === flagId ? { ...flag, enabled, updated_at: new Date().toISOString() } : flag
        )
      );
      
      toast({
        title: "Success",
        description: `Feature flag ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error("Error toggling feature flag:", error);
      toast({
        title: "Error",
        description: "Failed to toggle feature flag",
        variant: "destructive"
      });
    }
  };

  const updateRolloutPercentage = async (flagId: string, percentage: number) => {
    try {
      setFeatureFlags(prev =>
        prev.map(flag =>
          flag.id === flagId ? { ...flag, rollout_percentage: percentage, updated_at: new Date().toISOString() } : flag
        )
      );
      
      toast({
        title: "Success",
        description: `Rollout percentage updated to ${percentage}%`,
      });
    } catch (error) {
      console.error("Error updating rollout:", error);
      toast({
        title: "Error",
        description: "Failed to update rollout percentage",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-md w-1/3"></div>
          <div className="h-4 bg-muted rounded-md w-1/2"></div>
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
              <TestTube className="w-6 h-6 text-primary" />
            </div>
            Experiments & Feature Flags
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage A/B tests, feature rollouts, and experimentation analytics
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary/80">
              <Plus className="w-4 h-4 mr-2" />
              Create Experiment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Experiment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Experiment Name</label>
                <Input placeholder="Enter experiment name..." className="mt-2" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input placeholder="Describe what you're testing..." className="mt-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Traffic Split (%)</label>
                  <Input type="number" placeholder="50" className="mt-2" />
                </div>
                <div>
                  <label className="text-sm font-medium">Duration (days)</label>
                  <Input type="number" placeholder="14" className="mt-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button>Create Experiment</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="experiments" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            A/B Tests
          </TabsTrigger>
          <TabsTrigger value="flags" className="flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="experiments" className="space-y-4">
          <div className="grid gap-4">
            {experiments.map((experiment) => (
              <Card key={experiment.id} className="relative">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg">{experiment.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{experiment.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        experiment.status === 'running' ? 'default' :
                        experiment.status === 'paused' ? 'secondary' :
                        experiment.status === 'completed' ? 'outline' : 'destructive'
                      }
                    >
                      {experiment.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {experiment.status === 'draft' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateExperimentStatus(experiment.id, 'running')}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {experiment.status === 'running' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateExperimentStatus(experiment.id, 'paused')}
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      {experiment.status === 'paused' && (
                        <>
                          <Button 
                            size="sm"
                            onClick={() => updateExperimentStatus(experiment.id, 'running')}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => updateExperimentStatus(experiment.id, 'completed')}
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Variants */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Variants</h4>
                      {experiment.variants.map((variant) => (
                        <div key={variant.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{variant.name}</span>
                            <span className="text-sm text-muted-foreground">{variant.traffic_percentage}%</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Participants</span>
                              <div className="font-medium">{variant.participants.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Conversions</span>
                              <div className="font-medium">{variant.conversions.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Conversion Rate</span>
                              <span>{((variant.conversions / variant.participants) * 100).toFixed(1)}%</span>
                            </div>
                            <Progress 
                              value={(variant.conversions / variant.participants) * 100} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Metrics */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Key Metrics</h4>
                      {experiment.metrics.map((metric, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{metric.name}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${metric.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {metric.change > 0 ? '+' : ''}{metric.change}%
                              </span>
                              {metric.significant && (
                                <Badge variant="outline" className="text-xs">
                                  Significant
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-2xl font-bold mt-1">
                            {metric.value}
                            {metric.name.includes('Rate') ? '%' : metric.name.includes('Time') ? 's' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flags" className="space-y-4">
          <div className="grid gap-4">
            {featureFlags.map((flag) => (
              <Card key={flag.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg">{flag.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{flag.description}</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">{flag.key}</code>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={(enabled) => toggleFeatureFlag(flag.id, enabled)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Rollout Percentage</span>
                        <span className="text-sm text-muted-foreground">{flag.rollout_percentage}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={flag.rollout_percentage} className="flex-1 h-2" />
                        <Select 
                          value={flag.rollout_percentage.toString()}
                          onValueChange={(value) => updateRolloutPercentage(flag.id, parseInt(value))}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="25">25%</SelectItem>
                            <SelectItem value="50">50%</SelectItem>
                            <SelectItem value="75">75%</SelectItem>
                            <SelectItem value="100">100%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(flag.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Experiments</CardTitle>
                <TestTube className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{experiments.filter(e => e.status === 'running').length}</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Feature Flags</CardTitle>
                <Flag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{featureFlags.filter(f => f.enabled).length}/{featureFlags.length}</div>
                <p className="text-xs text-muted-foreground">
                  Enabled flags
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Conversion Lift</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+2.7%</div>
                <p className="text-xs text-muted-foreground">
                  Across all experiments
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Participants</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5.2K</div>
                <p className="text-xs text-muted-foreground">
                  Total this month
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Experiment Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Detailed analytics charts would be rendered here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}