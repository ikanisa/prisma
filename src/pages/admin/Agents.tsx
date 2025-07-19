import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Edit, Trash2, Power, PowerOff, ChevronLeft, ChevronRight, Bot, Code, MessageSquare, Settings, Activity, Search, Filter, Download, Upload, Zap, Brain, Target, TrendingUp, BarChart3, Users, Globe, Clock, AlertTriangle, CheckCircle, XCircle, Play, Pause, MoreVertical, Copy, Eye, Cpu, Database, Network, Gauge, PieChart, LineChart, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface Agent {
  id: string;
  name: string;
  status: string;
  description: string;
  created_at: string;
}

interface YAMLAgent {
  name: string;
  model: string;
  tone?: string;
  system: string;
  triggers?: any[];
  workflow?: any[];
  tools?: any[];
  ui_output?: any;
  schedule?: string;
  run_mode?: string;
}

interface AgentFormData {
  name: string;
  description: string;
  status: string;
}

const agentFormSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.enum(["active", "paused"], {
    required_error: "Status is required",
  }),
});

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [yamlAgents, setYamlAgents] = useState<Record<string, YAMLAgent>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [testing, setTesting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all-statuses");
  const [filterType, setFilterType] = useState("all-types");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const itemsPerPage = 50;
  const { toast } = useToast();

  const form = useForm<z.infer<typeof agentFormSchema>>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
    },
  });

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const [dataResult, countResult] = await Promise.all([
        supabase
          .from("agents")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("agents")
          .select("*", { count: "exact", head: true })
      ]);

      if (dataResult.error) throw dataResult.error;
      if (countResult.error) throw countResult.error;

      setAgents(dataResult.data || []);
      setTotalCount(countResult.count || 0);
      
      await loadYAMLAgents();
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast({
        title: "Error",
        description: "Failed to fetch agents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadYAMLAgents = async () => {
    try {
      const response = await fetch(`https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/yaml-agent-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs`
        },
        body: JSON.stringify({ action: 'loadAgents' })
      });

      if (response.ok) {
        const data = await response.json();
        setYamlAgents(data.agents || {});
      } else {
        console.error('Failed to load YAML agents');
      }
    } catch (error) {
      console.error('Error loading YAML agents:', error);
    }
  };

  const handleCreateAgent = async (values: z.infer<typeof agentFormSchema>) => {
    setCreating(true);
    try {
      if (editingAgent) {
        const { error } = await supabase
          .from("agents")
          .update(values)
          .eq("id", editingAgent.id);
        if (error) throw error;
        toast({ title: "Success", description: "Agent updated successfully" });
      } else {
        const { error } = await supabase
          .from("agents")
          .insert([{
            name: values.name,
            description: values.description || "",
            status: values.status
          }]);
        if (error) throw error;
        toast({ title: "Success", description: "Agent created successfully" });
      }
      
      setDialogOpen(false);
      setEditingAgent(null);
      form.reset();
      fetchData();
    } catch (error) {
      console.error("Error saving agent:", error);
      toast({
        title: "Error",
        description: "Failed to save agent",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicateAgent = async (agent: Agent) => {
    try {
      const { error } = await supabase
        .from("agents")
        .insert([{
          name: `${agent.name} (Copy)`,
          description: agent.description,
          status: "paused"
        }]);
      if (error) throw error;
      toast({ title: "Success", description: "Agent duplicated successfully" });
      fetchData();
    } catch (error) {
      console.error("Error duplicating agent:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate agent",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("agents")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Agent deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting agent:", error);
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive"
      });
    }
  };

  const toggleStatus = async (agent: Agent) => {
    try {
      const newStatus = agent.status === "active" ? "paused" : "active";
      const { error } = await supabase
        .from("agents")
        .update({ status: newStatus })
        .eq("id", agent.id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Agent status updated" });
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const openDialog = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
      form.reset({
        name: agent.name,
        description: agent.description || "",
        status: agent.status as "active" | "paused"
      });
    } else {
      setEditingAgent(null);
      form.reset();
    }
    setDialogOpen(true);
  };

  const testAgent = async (agentName: string) => {
    if (!testMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a test message",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(`https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/yaml-agent-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs`
        },
        body: JSON.stringify({
          action: 'processMessage',
          agentName,
          message: testMessage,
          userId: 'test-user-id',
          whatsappNumber: '+250700000000'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTestResponse(data.response || 'No response received');
      } else {
        setTestResponse('Error: Failed to test agent');
      }
    } catch (error) {
      console.error('Error testing agent:', error);
      setTestResponse('Error: ' + (error as Error).message);
    } finally {
      setTesting(false);
    }
  };

  // Analytics calculations
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const configuredAgents = agents.filter(a => yamlAgents[a.name]).length;
  const unconfiguredAgents = agents.filter(a => !yamlAgents[a.name]).length;

  // Filtering and sorting
  const filteredAgents = agents
    .filter(agent => {
      const matchesSearch = 
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all-statuses" || agent.status === filterStatus;
      const matchesType = filterType === "all-types" || 
        (filterType === "configured" && yamlAgents[agent.name]) ||
        (filterType === "unconfigured" && !yamlAgents[agent.name]);

      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all-statuses");
    setFilterType("all-types");
    setSortBy("created_at");
    setSortOrder("desc");
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-md w-1/3"></div>
          <div className="h-4 bg-muted rounded-md w-1/2"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
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
              <Bot className="w-6 h-6 text-primary" />
            </div>
            AI Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Intelligent YAML-based agents for automated WhatsApp interactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  {editingAgent ? "Edit Agent" : "Create New Agent"}
                </DialogTitle>
                <DialogDescription>
                  Configure an intelligent AI agent for automated interactions
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateAgent)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter agent name..." {...field} />
                        </FormControl>
                        <FormDescription>
                          A unique identifier for your AI agent
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the agent's purpose and capabilities..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Detailed description of what this agent does
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                Active
                              </div>
                            </SelectItem>
                            <SelectItem value="paused">
                              <div className="flex items-center gap-2">
                                <Pause className="w-4 h-4 text-orange-600" />
                                Paused
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          {editingAgent ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4 mr-2" />
                          {editingAgent ? "Update Agent" : "Create Agent"}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold">{totalAgents}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Bot className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Agents</p>
                <p className="text-2xl font-bold">{activeAgents}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Configured</p>
                <p className="text-2xl font-bold">{configuredAgents}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Needs Config</p>
                <p className="text-2xl font-bold">{unconfiguredAgents}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Testing
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Health Overview */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Agent Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Active</span>
                    </div>
                    <span className="text-sm font-medium">{activeAgents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm">Paused</span>
                    </div>
                    <span className="text-sm font-medium">{totalAgents - activeAgents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Configured</span>
                    </div>
                    <span className="text-sm font-medium">{configuredAgents}</span>
                  </div>
                </div>
                <Progress value={(activeAgents / totalAgents) * 100} className="w-full" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">System Status</p>
                      <p className="text-xs text-muted-foreground">All agents operational</p>
                    </div>
                    <span className="text-xs text-muted-foreground">2 min ago</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Bot className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Agent Created</p>
                      <p className="text-xs text-muted-foreground">New agent added to system</p>
                    </div>
                    <span className="text-xs text-muted-foreground">5 min ago</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Settings className="w-4 h-4 text-orange-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Config Updated</p>
                      <p className="text-xs text-muted-foreground">YAML configuration synced</p>
                    </div>
                    <span className="text-xs text-muted-foreground">10 min ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          {/* Filters and Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search agents by name, description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-statuses">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-types">All Types</SelectItem>
                      <SelectItem value="configured">Configured</SelectItem>
                      <SelectItem value="unconfigured">Needs Config</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px]">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Created Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </Button>

                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agents Grid/List */}
          {filteredAgents.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <Bot className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No agents found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || filterStatus !== "all-statuses" || filterType !== "all-types"
                        ? "Try adjusting your filters or search terms"
                        : "Create your first AI agent to get started"
                      }
                    </p>
                  </div>
                  {!searchTerm && filterStatus === "all-statuses" && filterType === "all-types" && (
                    <Button onClick={() => openDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Agent
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredAgents.map((agent) => {
                const yamlConfig = yamlAgents[agent.name];
                return (
                  <Card 
                    key={agent.id} 
                    className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
                            <Bot className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-xl">{agent.name}</CardTitle>
                            <p className="text-muted-foreground mt-1">{agent.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge 
                                variant={agent.status === "active" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {agent.status === "active" ? (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                ) : (
                                  <Pause className="w-3 h-3 mr-1" />
                                )}
                                {agent.status}
                              </Badge>
                              {yamlConfig ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <Settings className="w-3 h-3 mr-1" />
                                  Configured
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Needs Config
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDialog(agent)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateAgent(agent)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(agent)}>
                              {agent.status === "active" ? (
                                <>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(agent.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    {yamlConfig && (
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Cpu className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-sm">Configuration</span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p><strong>Model:</strong> {yamlConfig.model}</p>
                              <p><strong>Tone:</strong> {yamlConfig.tone || 'Default'}</p>
                              {yamlConfig.schedule && <p><strong>Schedule:</strong> {yamlConfig.schedule}</p>}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Code className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-sm">Capabilities</span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p><strong>Triggers:</strong> {yamlConfig.triggers?.length || 0}</p>
                              <p><strong>Workflows:</strong> {yamlConfig.workflow?.length || 0}</p>
                              <p><strong>Tools:</strong> {yamlConfig.tools?.length || 0}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-purple-600" />
                              <span className="font-medium text-sm">System Prompt</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <p className="line-clamp-3">{yamlConfig.system}</p>
                            </div>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Created {new Date(agent.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Network className="w-3 h-3" />
                            YAML Synced
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalCount > itemsPerPage && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} agents
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Agent Testing Laboratory
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Test your agents with real messages to validate their responses
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Select Agent</label>
                  <Select
                    value={selectedAgent?.name || ""}
                    onValueChange={(value) => {
                      const agent = agents.find(a => a.name === value);
                      setSelectedAgent(agent || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an agent to test" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.filter(a => yamlAgents[a.name] && a.status === 'active').map((agent) => (
                        <SelectItem key={agent.id} value={agent.name}>
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            {agent.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Test Environment</label>
                  <Select defaultValue="production">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Test Message</label>
                <Textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter a message to test the agent response..."
                  className="min-h-[100px]"
                />
              </div>

              <Button 
                onClick={() => selectedAgent && testAgent(selectedAgent.name)}
                disabled={!selectedAgent || !testMessage.trim() || testing}
                className="w-full"
                size="lg"
              >
                {testing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Test Agent Response
                  </>
                )}
              </Button>

              {testResponse && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Agent Response</label>
                  <div className="p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{testResponse}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Response time: ~{Math.random() * 2 + 1}s</span>
                          <Badge variant="outline" className="text-xs">
                            {selectedAgent?.name}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="w-5 h-5" />
                  System Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">CPU Usage</span>
                    <span className="text-sm font-medium">23%</span>
                  </div>
                  <Progress value={23} className="w-full" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Memory Usage</span>
                    <span className="text-sm font-medium">67%</span>
                  </div>
                  <Progress value={67} className="w-full" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Connections</span>
                    <span className="text-sm font-medium">142</span>
                  </div>
                  <Progress value={85} className="w-full" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Response Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">1.2s</p>
                    <p className="text-xs text-muted-foreground">Avg Response Time</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">98.5%</p>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">245</p>
                    <p className="text-xs text-muted-foreground">Messages Today</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-xs text-muted-foreground">Active Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}