import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Search, 
  Filter, 
  MoreHorizontal,
  Calendar,
  Clock,
  Zap,
  Target,
  Activity,
  TrendingUp,
  Settings,
  Eye,
  Copy,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Code,
  Database,
  Bot
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
}

interface Task {
  id: string;
  agent_id: string;
  name: string;
  trigger_type: string;
  trigger_value: string;
  tool_name: string;
  tool_input_json: any;
  active: boolean;
  created_at: string;
  agents?: Agent;
}

interface TaskFormData {
  agent_id: string;
  name: string;
  trigger_type: string;
  trigger_value: string;
  tool_name: string;
  tool_input_json: string;
  active: boolean;
}

const TRIGGER_TYPES = [
  { 
    value: "keyword", 
    label: "Keyword", 
    description: "Trigger when specific keywords are detected",
    icon: Target,
    examples: ["help", "order", "payment"]
  },
  { 
    value: "regex", 
    label: "Regex Pattern", 
    description: "Advanced pattern matching with regular expressions",
    icon: Code,
    examples: ["/\\b\\d{10}\\b/", "/price.*\\$/"]
  },
  { 
    value: "cron", 
    label: "Cron Schedule", 
    description: "Time-based automatic execution",
    icon: Calendar,
    examples: ["0 9 * * *", "*/15 * * * *"]
  },
  { 
    value: "api", 
    label: "API Webhook", 
    description: "External API endpoint triggers",
    icon: Database,
    examples: ["payment_received", "order_status_changed"]
  },
  { 
    value: "event", 
    label: "System Event", 
    description: "Internal system events and state changes",
    icon: Activity,
    examples: ["user_joined", "conversation_started"]
  }
];

const TOOL_TEMPLATES = [
  {
    name: "generate-payment",
    description: "Generate payment QR codes and USSD",
    defaultInput: {
      amount: 1000,
      description: "Service payment",
      currency: "UGX"
    }
  },
  {
    name: "send-notification",
    description: "Send WhatsApp notifications",
    defaultInput: {
      message: "Hello {{name}}, your order is ready!",
      template: "order_ready"
    }
  },
  {
    name: "update-inventory",
    description: "Update product inventory levels",
    defaultInput: {
      product_id: "{{product_id}}",
      quantity_change: -1
    }
  },
  {
    name: "assign-driver",
    description: "Assign delivery driver to order",
    defaultInput: {
      order_id: "{{order_id}}",
      preferred_location: "{{customer_location}}"
    }
  }
];

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterTrigger, setFilterTrigger] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [formData, setFormData] = useState<TaskFormData>({
    agent_id: "",
    name: "",
    trigger_type: "keyword",
    trigger_value: "",
    tool_name: "",
    tool_input_json: "{}",
    active: true
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;
  const { toast } = useToast();

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalTasks: 0,
    activeTasks: 0,
    totalExecutions: 0,
    successRate: 0,
    topTriggers: [] as { type: string; count: number }[]
  });

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    try {
      const [tasksResult, agentsResult, executionStats] = await Promise.all([
        supabase
          .from("agent_tasks")
          .select(`
            *,
            agents!inner (
              id,
              name
            )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("agents")
          .select("id, name")
          .order("name"),
        supabase
          .from("agent_execution_log")
          .select("success_status, function_name")
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (agentsResult.error) throw agentsResult.error;

      const tasksData = tasksResult.data || [];
      const agentsData = agentsResult.data || [];
      const execData = executionStats.data || [];

      setTasks(tasksData);
      setAgents(agentsData);

      // Calculate analytics
      const activeTasks = tasksData.filter(t => t.active).length;
      const totalExecutions = execData.length;
      const successfulExecutions = execData.filter(e => e.success_status).length;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

      // Count trigger types
      const triggerCounts = tasksData.reduce((acc, task) => {
        acc[task.trigger_type] = (acc[task.trigger_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topTriggers = Object.entries(triggerCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      setAnalytics({
        totalTasks: tasksData.length,
        activeTasks,
        totalExecutions,
        successRate: Math.round(successRate),
        topTriggers
      });

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let toolInputJson;
      try {
        toolInputJson = JSON.parse(formData.tool_input_json);
      } catch {
        throw new Error("Invalid JSON in tool input");
      }

      const taskData = {
        ...formData,
        tool_input_json: toolInputJson
      };

      if (editingTask) {
        const { error } = await supabase
          .from("agent_tasks")
          .update(taskData)
          .eq("id", editingTask.id);
        if (error) throw error;
        toast({ title: "Success", description: "Task updated successfully" });
      } else {
        const { error } = await supabase
          .from("agent_tasks")
          .insert([taskData]);
        if (error) throw error;
        toast({ title: "Success", description: "Task created successfully" });
      }
      
      setDialogOpen(false);
      setEditingTask(null);
      setFormData({
        agent_id: "",
        name: "",
        trigger_type: "keyword",
        trigger_value: "",
        tool_name: "",
        tool_input_json: "{}",
        active: true
      });
      fetchData();
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save task",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    try {
      const { error } = await supabase
        .from("agent_tasks")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Task deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (task: Task) => {
    try {
      const { error } = await supabase
        .from("agent_tasks")
        .update({ active: !task.active })
        .eq("id", task.id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Task status updated" });
      fetchData();
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    }
  };

  const openDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        agent_id: task.agent_id,
        name: task.name || "",
        trigger_type: task.trigger_type || "keyword",
        trigger_value: task.trigger_value || "",
        tool_name: task.tool_name || "",
        tool_input_json: JSON.stringify(task.tool_input_json || {}, null, 2),
        active: task.active
      });
    } else {
      setEditingTask(null);
      setFormData({
        agent_id: "",
        name: "",
        trigger_type: "keyword",
        trigger_value: "",
        tool_name: "",
        tool_input_json: "{}",
        active: true
      });
    }
    setSelectedTemplate("");
    setDialogOpen(true);
  };

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tool_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.agents?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAgent = !filterAgent || task.agent_id === filterAgent;
    const matchesTrigger = !filterTrigger || task.trigger_type === filterTrigger;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && task.active) ||
      (filterStatus === 'inactive' && !task.active);

    return matchesSearch && matchesAgent && matchesTrigger && matchesStatus;
  });

  const handleTemplateSelect = (templateName: string) => {
    const template = TOOL_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      setFormData({
        ...formData,
        tool_name: template.name,
        tool_input_json: JSON.stringify(template.defaultInput, null, 2)
      });
    }
  };

  const duplicateTask = async (task: Task) => {
    try {
      const newTask = {
        agent_id: task.agent_id,
        name: `${task.name} (Copy)`,
        trigger_type: task.trigger_type,
        trigger_value: task.trigger_value,
        tool_name: task.tool_name,
        tool_input_json: task.tool_input_json,
        active: false
      };

      const { error } = await supabase
        .from("agent_tasks")
        .insert([newTask]);
      
      if (error) throw error;
      toast({ title: "Success", description: "Task duplicated successfully" });
      fetchData();
    } catch (error) {
      console.error("Error duplicating task:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate task",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded"></div>
          ))}
        </div>
        <div className="h-96 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Analytics */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
            <p className="text-muted-foreground">
              Configure agent automation, triggers, and tool integrations
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    {editingTask ? "Edit Task" : "Create New Task"}
                  </DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="trigger">Trigger Config</TabsTrigger>
                    <TabsTrigger value="tool">Tool Setup</TabsTrigger>
                  </TabsList>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="agent">Agent</Label>
                          <Select 
                            value={formData.agent_id} 
                            onValueChange={(value) => setFormData({ ...formData, agent_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {agents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  <div className="flex items-center gap-2">
                                    <Bot className="w-4 h-4" />
                                    {agent.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="name">Task Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Process Payment Requests"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.active}
                          onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                        />
                        <Label>Activate task immediately</Label>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="trigger" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Trigger Type</Label>
                        <div className="grid grid-cols-1 gap-3">
                          {TRIGGER_TYPES.map((type) => {
                            const IconComponent = type.icon;
                            return (
                              <div
                                key={type.value}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                  formData.trigger_type === type.value
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-muted-foreground/50'
                                }`}
                                onClick={() => setFormData({ ...formData, trigger_type: type.value })}
                              >
                                <div className="flex items-start gap-3">
                                  <IconComponent className="w-5 h-5 mt-0.5 text-primary" />
                                  <div className="flex-1">
                                    <div className="font-medium">{type.label}</div>
                                    <div className="text-sm text-muted-foreground">{type.description}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Examples: {type.examples.join(', ')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Trigger Value</Label>
                        <Input
                          value={formData.trigger_value}
                          onChange={(e) => setFormData({ ...formData, trigger_value: e.target.value })}
                          placeholder={
                            formData.trigger_type === 'keyword' ? 'help, payment, order' :
                            formData.trigger_type === 'cron' ? '0 9 * * *' :
                            formData.trigger_type === 'regex' ? '/\\b\\d{10}\\b/' :
                            'Enter trigger value'
                          }
                        />
                        {formData.trigger_type === 'cron' && (
                          <div className="text-xs text-muted-foreground">
                            Use cron format: minute hour day month weekday
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="tool" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tool Template (Optional)</Label>
                        <Select 
                          value={selectedTemplate} 
                          onValueChange={(value) => {
                            setSelectedTemplate(value);
                            handleTemplateSelect(value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a template or enter custom tool" />
                          </SelectTrigger>
                          <SelectContent>
                            {TOOL_TEMPLATES.map((template) => (
                              <SelectItem key={template.name} value={template.name}>
                                <div>
                                  <div className="font-medium">{template.name}</div>
                                  <div className="text-xs text-muted-foreground">{template.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Tool Name</Label>
                        <Input
                          value={formData.tool_name}
                          onChange={(e) => setFormData({ ...formData, tool_name: e.target.value })}
                          placeholder="e.g., generate-payment, send-notification"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Tool Input Configuration (JSON)</Label>
                        <Textarea
                          value={formData.tool_input_json}
                          onChange={(e) => setFormData({ ...formData, tool_input_json: e.target.value })}
                          rows={8}
                          placeholder='{"amount": 1000, "currency": "UGX", "description": "Payment for service"}'
                          className="font-mono text-sm"
                        />
                        <div className="text-xs text-muted-foreground">
                          Use variables like {"{{user_id}}"}, {"{{amount}}"} for dynamic values
                        </div>
                      </div>
                    </TabsContent>
                    
                    <Separator />
                    
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingTask ? "Update Task" : "Create Task"}
                      </Button>
                    </div>
                  </form>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.activeTasks} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.successRate}%</div>
              <Progress value={analytics.successRate} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Executions</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalExecutions}</div>
              <p className="text-xs text-muted-foreground">
                Total runs
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Trigger</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.topTriggers[0]?.type || 'None'}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.topTriggers[0]?.count || 0} tasks
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Agent</Label>
              <Select value={filterAgent} onValueChange={setFilterAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All agents</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={filterTrigger} onValueChange={setFilterTrigger}>
                <SelectTrigger>
                  <SelectValue placeholder="All triggers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All triggers</SelectItem>
                  {TRIGGER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setFilterAgent("");
                  setFilterTrigger("");
                  setFilterStatus("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Tasks ({filteredTasks.length})
          </h2>
        </div>
        
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-6">
                {tasks.length === 0 
                  ? "Create your first task to start automating agent workflows"
                  : "Try adjusting your filters or search terms"
                }
              </p>
              <Button onClick={() => openDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTasks.map((task) => {
              const triggerType = TRIGGER_TYPES.find(t => t.value === task.trigger_type);
              const TriggerIcon = triggerType?.icon || Target;
              
              return (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {task.agents?.name}
                            </span>
                          </div>
                          <Badge variant={task.active ? "default" : "secondary"}>
                            {task.active ? (
                              <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                            )}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{task.name}</CardTitle>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(task)}
                          title={`${task.active ? "Pause" : "Activate"} task`}
                        >
                          {task.active ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateTask(task)}
                          title="Duplicate task"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(task)}
                          title="Edit task"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(task.id)}
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <TriggerIcon className="w-4 h-4" />
                          Trigger Configuration
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div><strong>Type:</strong> {triggerType?.label || task.trigger_type}</div>
                          <div><strong>Value:</strong> <code className="bg-muted px-1 rounded">{task.trigger_value}</code></div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Settings className="w-4 h-4" />
                          Tool Configuration
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div><strong>Tool:</strong> <code className="bg-muted px-1 rounded">{task.tool_name}</code></div>
                          <div><strong>Parameters:</strong> {Object.keys(task.tool_input_json || {}).length} configured</div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Created {new Date(task.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        Last execution data not available
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}