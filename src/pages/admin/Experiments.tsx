import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Play, Pause, StopCircle, TrendingUp, Users, Target } from "lucide-react";

interface Experiment {
  id: string;
  name: string;
  description: string;
  status: string;
  traffic_split: number;
  control_variant: any;
  test_variant: any;
  success_metric: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface ExperimentAssignment {
  id: string;
  experiment_id: string;
  phone_number: string;
  variant: string;
  assigned_at: string;
}

export default function Experiments() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [assignments, setAssignments] = useState<ExperimentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [newExperiment, setNewExperiment] = useState({
    name: '',
    description: '',
    traffic_split: 0.5,
    control_variant: '{}',
    test_variant: '{}',
    success_metric: 'conversion_rate'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchExperiments();
    fetchAssignments();
  }, []);

  const fetchExperiments = async () => {
    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExperiments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch experiments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('experiment_assignments')
        .select('*')
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
    }
  };

  const createExperiment = async () => {
    try {
      let controlVariant, testVariant;
      
      try {
        controlVariant = JSON.parse(newExperiment.control_variant);
        testVariant = JSON.parse(newExperiment.test_variant);
      } catch (parseError) {
        toast({
          title: "Error",
          description: "Invalid JSON in variant configuration",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('experiments')
        .insert({
          name: newExperiment.name,
          description: newExperiment.description,
          traffic_split: newExperiment.traffic_split,
          control_variant: controlVariant,
          test_variant: testVariant,
          success_metric: newExperiment.success_metric,
          status: 'draft'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Experiment created successfully",
      });

      setShowCreateDialog(false);
      setNewExperiment({
        name: '',
        description: '',
        traffic_split: 0.5,
        control_variant: '{}',
        test_variant: '{}',
        success_metric: 'conversion_rate'
      });
      fetchExperiments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create experiment",
        variant: "destructive",
      });
    }
  };

  const updateExperimentStatus = async (experimentId: string, status: string) => {
    try {
      const updates: any = { status };
      
      if (status === 'active') {
        updates.start_date = new Date().toISOString();
      } else if (status === 'completed') {
        updates.end_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('experiments')
        .update(updates)
        .eq('id', experimentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Experiment ${status}`,
      });

      fetchExperiments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update experiment status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const getExperimentStats = (experimentId: string) => {
    const experimentAssignments = assignments.filter(a => a.experiment_id === experimentId);
    const controlCount = experimentAssignments.filter(a => a.variant === 'control').length;
    const testCount = experimentAssignments.filter(a => a.variant === 'test').length;
    
    return {
      total: experimentAssignments.length,
      control: controlCount,
      test: testCount
    };
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeExperiments = experiments.filter(e => e.status === 'active');
  const chartData = activeExperiments.map(exp => {
    const stats = getExperimentStats(exp.id);
    return {
      name: exp.name,
      control: stats.control,
      test: stats.test
    };
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">A/B Experiments</h1>
          <p className="text-muted-foreground">
            Design and run experiments to optimize user experience
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Experiment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Experiment</DialogTitle>
              <DialogDescription>
                Set up a new A/B test to optimize your messaging strategy
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Experiment Name</Label>
                <Input
                  id="name"
                  value={newExperiment.name}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Welcome Message Optimization"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newExperiment.description}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what you're testing..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="traffic-split">Traffic Split (Test Variant %)</Label>
                <Input
                  id="traffic-split"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={newExperiment.traffic_split}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, traffic_split: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="success-metric">Success Metric</Label>
                <Select value={newExperiment.success_metric} onValueChange={(value) => setNewExperiment(prev => ({ ...prev, success_metric: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conversion_rate">Conversion Rate</SelectItem>
                    <SelectItem value="response_rate">Response Rate</SelectItem>
                    <SelectItem value="engagement_time">Engagement Time</SelectItem>
                    <SelectItem value="completion_rate">Completion Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="control-variant">Control Variant (JSON)</Label>
                <Textarea
                  id="control-variant"
                  value={newExperiment.control_variant}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, control_variant: e.target.value }))}
                  placeholder='{"message": "Original welcome message"}'
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="test-variant">Test Variant (JSON)</Label>
                <Textarea
                  id="test-variant"
                  value={newExperiment.test_variant}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, test_variant: e.target.value }))}
                  placeholder='{"message": "New optimized welcome message"}'
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createExperiment}>Create Experiment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active Experiments</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Experiments</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{experiments.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeExperiments.length} currently active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignments.length}</div>
                <p className="text-xs text-muted-foreground">
                  Across all experiments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {experiments.length ? Math.round((experiments.filter(e => e.status === 'completed').length / experiments.length) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Completed experiments
                </p>
              </CardContent>
            </Card>
          </div>

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Experiment Participation</CardTitle>
                <CardDescription>User distribution across test variants</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="control" stackId="a" fill="hsl(var(--muted))" name="Control" />
                    <Bar dataKey="test" stackId="a" fill="hsl(var(--primary))" name="Test" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <div className="grid gap-6">
            {experiments.map((experiment) => {
              const stats = getExperimentStats(experiment.id);
              return (
                <Card key={experiment.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {experiment.name}
                          <Badge variant={getStatusBadgeVariant(experiment.status)}>
                            {experiment.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{experiment.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {experiment.status === 'draft' && (
                          <Button size="sm" onClick={() => updateExperimentStatus(experiment.id, 'active')}>
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}
                        {experiment.status === 'active' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateExperimentStatus(experiment.id, 'paused')}>
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateExperimentStatus(experiment.id, 'completed')}>
                              <StopCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          </>
                        )}
                        {experiment.status === 'paused' && (
                          <Button size="sm" onClick={() => updateExperimentStatus(experiment.id, 'active')}>
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <div className="text-sm font-medium mb-1">Total Participants</div>
                        <div className="text-2xl font-bold">{stats.total}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">Control Group</div>
                        <div className="text-2xl font-bold">{stats.control}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">Test Group</div>
                        <div className="text-2xl font-bold">{stats.test}</div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Traffic Split</span>
                        <span>{Math.round(experiment.traffic_split * 100)}% test variant</span>
                      </div>
                      <Progress value={experiment.traffic_split * 100} />
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <strong>Success Metric:</strong> {experiment.success_metric}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Experiment Results</CardTitle>
              <CardDescription>Completed experiments and their outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Experiment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Success Metric</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiments.filter(e => e.status === 'completed').map((experiment) => {
                    const stats = getExperimentStats(experiment.id);
                    const duration = experiment.start_date && experiment.end_date 
                      ? Math.round((new Date(experiment.end_date).getTime() - new Date(experiment.start_date).getTime()) / (1000 * 60 * 60 * 24))
                      : null;
                    
                    return (
                      <TableRow key={experiment.id}>
                        <TableCell className="font-medium">{experiment.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Completed</Badge>
                        </TableCell>
                        <TableCell>{stats.total}</TableCell>
                        <TableCell>{experiment.success_metric}</TableCell>
                        <TableCell>{duration ? `${duration} days` : 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {experiments.filter(e => e.status === 'completed').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No completed experiments yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}